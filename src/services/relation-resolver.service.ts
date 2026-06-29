import { BadRequestException, Injectable } from '@nestjs/common';
import type { FormModelDefinition } from '../form-model.registry';
import type { PopulateOptions, Query, Schema, SchemaType } from 'mongoose';

const MAX_POPULATE_DEPTH = 3;

function isSchemaLike(value: unknown): value is Schema {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as {
    eachPath?: unknown;
    path?: unknown;
  };

  return (
    typeof candidate.eachPath === 'function' &&
    typeof candidate.path === 'function'
  );
}

function getRefModelName(schemaType: SchemaType): string | undefined {
  const st = schemaType as unknown as {
    options?: Record<string, unknown>;
    caster?: {
      options?: Record<string, unknown>;
    };
  };

  const directRef = st.options?.ref;
  if (typeof directRef === 'string' && directRef) {
    return directRef;
  }

  const arrayRef = st.caster?.options?.ref;
  if (typeof arrayRef === 'string' && arrayRef) {
    return arrayRef;
  }

  const typeOption = st.options?.type;
  if (Array.isArray(typeOption) && typeOption.length > 0) {
    const first = typeOption[0] as { ref?: unknown };
    if (typeof first?.ref === 'string' && first.ref) {
      return first.ref;
    }
  }

  return undefined;
}

function buildPopulateOption(
  schema: Schema,
  path: string,
  getSchemaByModelName: (modelName: string) => Schema | null,
  visitedModels = new Set<string>(),
  depth = 1,
): PopulateOptions {
  const schemaType = schema.path(path);
  if (!schemaType) {
    return { path };
  }

  if (depth >= MAX_POPULATE_DEPTH) {
    return { path };
  }

  const refModelName = getRefModelName(schemaType as SchemaType);
  if (!refModelName || visitedModels.has(refModelName)) {
    return { path };
  }

  const refSchema = getSchemaByModelName(refModelName) as unknown;
  if (!isSchemaLike(refSchema)) {
    return { path };
  }

  const nextVisited = new Set(visitedModels);
  nextVisited.add(refModelName);

  const nestedPaths = [...getSchemaRefPaths(refSchema)].sort();
  if (nestedPaths.length === 0) {
    return { path };
  }

  return {
    path,
    populate: nestedPaths.map((nestedPath) =>
      buildPopulateOption(
        refSchema,
        nestedPath,
        getSchemaByModelName,
        nextVisited,
        depth + 1,
      ),
    ),
  };
}

function normalizeInclude(input: unknown): string[] {
  if (input === undefined || input === null) return [];
  if (typeof input !== 'string') {
    throw new BadRequestException('include must be a string');
  }

  const trimmed = input.trim();
  if (trimmed === '') return [];

  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (
        !Array.isArray(parsed) ||
        !parsed.every((x) => typeof x === 'string')
      ) {
        throw new Error('include JSON must be a string[]');
      }
      return [...new Set(parsed.map((s) => s.trim()).filter(Boolean))];
    } catch {
      throw new BadRequestException('Invalid include JSON');
    }
  }

  return [
    ...new Set(
      trimmed
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  ];
}

function getSchemaRefPaths(schema: Schema): Set<string> {
  const result = new Set<string>();

  schema.eachPath((pathName: string, schemaType: SchemaType) => {
    const st = schemaType as unknown as {
      options?: Record<string, unknown>;
      caster?: unknown;
    };

    const directRef = st.options?.ref;
    if (typeof directRef === 'string' && directRef) {
      result.add(pathName);
      return;
    }

    const caster = st.caster as
      | undefined
      | {
          options?: Record<string, unknown>;
        };
    const casterRef = caster?.options?.ref;
    if (typeof casterRef === 'string' && casterRef) {
      result.add(pathName);
      return;
    }

    const typeOption = st.options?.type;
    if (Array.isArray(typeOption) && typeOption.length > 0) {
      const first = typeOption[0] as unknown as { ref?: unknown };
      const arrayRef = first.ref;
      if (typeof arrayRef === 'string' && arrayRef) {
        result.add(pathName);
      }
    }
  });

  return result;
}

@Injectable()
export class RelationResolverService {
  private resolveSchemaFromModel(
    model: unknown,
    modelName: string,
  ): Schema | null {
    const modelWithDb = model as {
      db?: {
        model?: (name: string) => { schema?: unknown };
      };
    };

    if (typeof modelWithDb?.db?.model !== 'function') {
      return null;
    }

    try {
      const refModel = modelWithDb.db.model(modelName);
      const refSchema = refModel?.schema;
      return isSchemaLike(refSchema) ? refSchema : null;
    } catch {
      return null;
    }
  }

  resolveIncludePaths(
    model: {
      schema: Schema;
    },
    include: unknown,
  ): string[] {
    const requested = normalizeInclude(include);
    const allowed = [...getSchemaRefPaths(model.schema)].sort();

    if (requested.length === 0) {
      return allowed;
    }

    this.validateIncludesOrThrow(model, requested);
    return requested;
  }

  resolveIncludes(
    definition: FormModelDefinition,
    include: unknown,
  ): PopulateOptions[] {
    const requested = normalizeInclude(include);
    const allowed = requested.length === 0 ? definition.relations : requested;
    const allowedSet = new Set(definition.relations);
    const definitionSchema = definition.model.schema as unknown;

    if (!isSchemaLike(definitionSchema)) {
      return allowed
        .filter((path) => allowedSet.has(path))
        .map((path) => ({ path }));
    }

    return allowed
      .filter((path) => allowedSet.has(path))
      .map((path) =>
        buildPopulateOption(definitionSchema, path, (modelName) =>
          this.resolveSchemaFromModel(definition.model, modelName),
        ),
      );
  }

  parseInclude(include: unknown): string[] {
    return normalizeInclude(include);
  }

  validateIncludesOrThrow(
    model: {
      schema: Schema;
    },
    includes: string[],
  ): void {
    if (includes.length === 0) return;
    const allowed = getSchemaRefPaths(model.schema);
    const invalid = includes.filter((p) => !allowed.has(p));
    if (invalid.length > 0) {
      throw new BadRequestException({
        message: 'Invalid include relation(s)',
        invalid,
        allowed: [...allowed].sort(),
      });
    }
  }

  applyPopulate<T>(
    query: Query<T, unknown>,
    model: {
      schema: Schema;
    },
    include: unknown,
  ): Query<T, unknown> {
    const includes = this.resolveIncludePaths(model, include);
    for (const path of includes) {
      query.populate(
        buildPopulateOption(model.schema, path, (modelName) =>
          this.resolveSchemaFromModel(model, modelName),
        ),
      );
    }
    return query;
  }
}

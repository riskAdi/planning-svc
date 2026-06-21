import { BadRequestException, Injectable } from '@nestjs/common';
import type { FormModelDefinition } from '../form-model.registry';
import type { PopulateOptions, Query, Schema, SchemaType } from 'mongoose';

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
    const allowed =
      requested.length === 0 ? definition.relations : requested;
    const allowedSet = new Set(definition.relations);

    return allowed
      .filter((path) => allowedSet.has(path))
      .map((path) => ({ path }));
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
      query.populate(path);
    }
    return query;
  }
}

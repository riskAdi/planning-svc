import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Types, type Model, type SchemaType } from 'mongoose';

import { FormModelRegistryService } from './form-model-registry.service';
import { QueryBuilderService } from './query-builder.service';
import { RelationResolverService } from './relation-resolver.service';

type Payload = Record<string, unknown>;

type RelationInfo = {
  path: string;
  refModelName: string;
  isArray: boolean;
};

type PaginatedResult = {
  data: unknown[];
  meta: {
    formName: string;
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    include: string[];
  };
};

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;

function transformIds(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => transformIds(item));
  }

  if (value instanceof Types.ObjectId) {
    return value.toHexString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (!isPlainObject(value)) {
    return value;
  }

  const source = value;
  const target: Record<string, unknown> = {};

  for (const [key, item] of Object.entries(source)) {
    const nextKey = key === '_id' ? 'id' : key;
    target[nextKey] = transformIds(item);
  }

  return target;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function isObjectArray(value: unknown): value is Record<string, unknown>[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((item) => isPlainObject(item))
  );
}

function toCreatePayload(input: Record<string, unknown>): Record<string, unknown> {
  const result = { ...input };
  delete result.id;
  delete result._id;
  return result;
}

function getEntityId(input: Record<string, unknown>): string | Types.ObjectId | undefined {
  const rawId = input.id ?? input._id;
  if (typeof rawId === 'string' && rawId.trim() !== '') {
    return rawId;
  }

  if (rawId instanceof Types.ObjectId) {
    return rawId;
  }

  return undefined;
}

function getRelationInfo(model: Model<any>): RelationInfo[] {
  const relations: RelationInfo[] = [];

  model.schema.eachPath((pathName: string, schemaType: SchemaType) => {
    const st = schemaType as unknown as {
      options?: Record<string, unknown>;
      caster?: { options?: Record<string, unknown> };
    };

    const directRef = st.options?.ref;
    if (typeof directRef === 'string' && directRef) {
      relations.push({
        path: pathName,
        refModelName: directRef,
        isArray: false,
      });
      return;
    }

    const arrayRef = st.caster?.options?.ref;
    if (typeof arrayRef === 'string' && arrayRef) {
      relations.push({
        path: pathName,
        refModelName: arrayRef,
        isArray: true,
      });
    }
  });

  return relations;
}

function toSchemaMatchedFilter(
  model: Model<any>,
  rawFilter: Record<string, unknown>,
): Record<string, unknown> {
  const allowedPaths = new Set<string>();

  const schemaPaths = model.schema.paths as Record<string, unknown> | undefined;
  if (schemaPaths && typeof schemaPaths === 'object') {
    Object.keys(schemaPaths).forEach((path) => allowedPaths.add(path));
  }

  if (
    allowedPaths.size === 0 &&
    typeof model.schema.eachPath === 'function'
  ) {
    model.schema.eachPath((pathName: string) => {
      allowedPaths.add(pathName);
    });
  }

  if (allowedPaths.size === 0) {
    return rawFilter;
  }

  const matchedFilter: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(rawFilter)) {
    const resolvedKey = key === 'id' ? '_id' : key;
    if (!allowedPaths.has(resolvedKey)) {
      continue;
    }

    matchedFilter[resolvedKey] = value;
  }

  return matchedFilter;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function toOrRegexFilter(
  matchedFilter: Record<string, unknown>,
): Record<string, unknown> {
  const entries = Object.entries(matchedFilter);
  if (entries.length === 0) {
    return {};
  }

  const orClauses = entries.map(([key, value]) => {
    if (typeof value === 'string') {
      const wildcardPattern = value
        .split('*')
        .map((segment) => escapeRegex(segment))
        .join('.*');

      return {
        [key]: {
          $regex: wildcardPattern,
          $options: 'i',
        },
      };
    }

    return { [key]: value };
  });

  return { $or: orClauses };
}

@Injectable()
export class FormQueryService {
  constructor(
    private readonly registry: FormModelRegistryService,
    private readonly queryBuilder: QueryBuilderService,
    private readonly relations: RelationResolverService,
  ) {}

  async find(
    formName: string,
    search: unknown,
    include: unknown,
    page = DEFAULT_PAGE,
    limit = DEFAULT_LIMIT,
  ): Promise<PaginatedResult> {
    const model = this.registry.resolveModel(formName);
    const parsedFilter = this.queryBuilder.parseSearch(search);
    const matchedFilter = toSchemaMatchedFilter(model, parsedFilter);
    const filter = toOrRegexFilter(matchedFilter);
    const includes = this.relations.resolveIncludePaths(model, include);
    const skip = (page - 1) * limit;

    const query = model.find(filter);
    this.relations.applyPopulate(query, model, include);
    query.skip(skip).limit(limit);

    const [data, total] = await Promise.all([
      query.lean().exec(),
      model.countDocuments(filter).exec(),
    ]);

    return {
      data: transformIds(data) as unknown[],
      meta: {
        formName,
        page,
        limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
        include: includes,
      },
    };
  }

  async create(formName: string, payload: Payload) {
    const model = this.registry.resolveModel(formName);
    const normalizedPayload: Payload = { ...payload };

    await this.resolveSubforms(model, normalizedPayload, false);

    const created = await model.create(normalizedPayload);
    return transformIds(created.toObject());
  }

  async update(formName: string, payload: Payload) {
    const model = this.registry.resolveModel(formName);
    const parentId = getEntityId(payload);

    if (!parentId) {
      throw new BadRequestException('id is required for update');
    }

    const normalizedPayload: Payload = toCreatePayload(payload);
    await this.resolveSubforms(model, normalizedPayload, true);

    const updated = await model
      .findByIdAndUpdate(parentId, normalizedPayload, { new: true })
      .lean()
      .exec();

    if (!updated) {
      throw new NotFoundException(
        `No record found for formName "${formName}" and id "${String(parentId)}".`,
      );
    }

    return transformIds(updated);
  }

  private async resolveSubforms(
    model: Model<any>,
    payload: Payload,
    allowUpdate: boolean,
  ) {
    const relations = getRelationInfo(model);

    for (const relation of relations) {
      const value = payload[relation.path];
      if (!isPlainObject(value) && !isObjectArray(value)) {
        continue;
      }

      const relationModel = this.registry.resolveModel(relation.refModelName);
      const sourceItems = Array.isArray(value) ? value : [value];
      const created = await Promise.all(
        sourceItems.map(async (item) => {
          const relationId = getEntityId(item);
          const relationPayload = toCreatePayload(item);

          await this.resolveSubforms(relationModel, relationPayload, allowUpdate);

          if (allowUpdate && relationId) {
            const updated = await relationModel
              .findByIdAndUpdate(relationId, relationPayload, { new: true })
              .exec();

            if (updated) {
              return updated;
            }
          }

          return relationModel.create(relationPayload);
        }),
      );
      const relationValue = relation.isArray
        ? created.map((doc) => doc._id)
        : created[0]?._id;

      payload[relation.path] = relationValue;
    }
  }
}

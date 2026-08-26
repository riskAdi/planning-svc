import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { isDeepStrictEqual } from 'node:util';
import { Types, type Model, type Schema, type SchemaType } from 'mongoose';

import type { FormModelDefinition } from '../form-model.registry';
import { excludeAuditFieldsFromResponse } from '../utils/response-sanitizer.util';

import { FormModelRegistryService } from './form-model-registry.service';
import {
  QueryBuilderService,
  type SearchCondition,
  type SearchConditionMap,
  type SearchOperator,
  type SearchQuery,
} from './query-builder.service';
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

type SortOrder = 'ascend' | 'descend';

type SorterQuery = {
  field: string;
  order: SortOrder;
};

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const REFERENCE_SEARCH_FIELDS = [
  'firstName',
  'lastName',
  'title',
  'label',
  'name',
  'city',
] as const;
const PAYLOAD_SYSTEM_FIELDS = new Set([
  'id',
  '_id',
  'subform',
  'parent_id',
  'audit',
]);
const READ_ALWAYS_ALLOWED_FIELDS = new Set([
  'id',
  '_id',
  '__v',
  'createdAt',
  'updatedAt',
]);
const AUDIT_IGNORED_FIELDS = new Set([
  'id',
  '_id',
  '__v',
  'createdAt',
  'updatedAt',
  'subform',
  'parent_id',
  'audit',
]);

type PermissionAction = 'read' | 'write' | 'edit' | 'delete';
type AccessRule = NonNullable<FormModelDefinition['permissions']>['form'];
type PermissionMap = NonNullable<FormModelDefinition['permissions']>;

type SchemaWithPermissions = Schema & {
  formPermissions?: PermissionMap;
};

type CreatableDocument = {
  _id?: string | Types.ObjectId;
  toObject: () => Record<string, unknown>;
};

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

  const prototype = Object.getPrototypeOf(value) as object | null;
  return prototype === Object.prototype || prototype === null;
}

function getModelSchema(model: Model<any>): Schema {
  const schema = model.schema as Schema;
  return schema;
}

function getObjectIdLike(value: unknown): string | Types.ObjectId | null {
  if (value instanceof Types.ObjectId) {
    return value;
  }

  if (typeof value === 'string' && value.trim() !== '') {
    return value;
  }

  if (!value || typeof value !== 'object') {
    return null;
  }

  const rawId =
    (Reflect.get(value, '_id') as unknown) ??
    (Reflect.get(value, 'id') as unknown);

  if (rawId instanceof Types.ObjectId) {
    return rawId;
  }

  if (typeof rawId === 'string' && rawId.trim() !== '') {
    return rawId;
  }

  return null;
}

function isObjectArray(value: unknown): value is Record<string, unknown>[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((item) => isPlainObject(item))
  );
}

function toCreatePayload(
  input: Record<string, unknown>,
): Record<string, unknown> {
  const result = { ...input };
  delete result.id;
  delete result._id;
  delete result.audit;
  return result;
}

function getEntityId(
  input: Record<string, unknown>,
): string | Types.ObjectId | undefined {
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
  const schema = getModelSchema(model);

  if (typeof schema.eachPath !== 'function') {
    return relations;
  }

  schema.eachPath((pathName: string, schemaType: SchemaType) => {
    const st = schemaType as unknown as {
      options?: Record<string, unknown>;
      caster?: { options?: Record<string, unknown> };
      instance?: string;
    };

    const directRef = st.options?.ref;
    if (typeof directRef === 'string' && directRef) {
      relations.push({
        path: pathName,
        refModelName: directRef,
        isArray: st.instance === 'Array',
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
  const schema = getModelSchema(model);

  const schemaPaths = schema.paths as Record<string, unknown> | undefined;
  if (schemaPaths && typeof schemaPaths === 'object') {
    Object.keys(schemaPaths).forEach((path) => allowedPaths.add(path));
  }

  if (allowedPaths.size === 0 && typeof schema.eachPath === 'function') {
    schema.eachPath((pathName: string) => {
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

function toTimestamp(value: unknown): number {
  if (value instanceof Date) {
    return value.getTime();
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value).getTime();
    return Number.isNaN(parsed) ? Number.NEGATIVE_INFINITY : parsed;
  }

  return Number.NEGATIVE_INFINITY;
}

function toValidDate(value: unknown): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return null;
}

function sortAuditByChangedAtDesc(entries: unknown[]): unknown[] {
  return [...entries].sort((left, right) => {
    const leftChangedAt =
      isPlainObject(left) && 'changedAt' in left ? left.changedAt : undefined;
    const rightChangedAt =
      isPlainObject(right) && 'changedAt' in right
        ? right.changedAt
        : undefined;

    return toTimestamp(rightChangedAt) - toTimestamp(leftChangedAt);
  });
}

function toIdString(value: unknown): string | null {
  if (value instanceof Types.ObjectId) {
    return value.toHexString();
  }

  if (typeof value === 'string' && value.trim() !== '') {
    return value;
  }

  if (isPlainObject(value)) {
    const nestedId = value.id ?? value._id;
    if (nestedId instanceof Types.ObjectId) {
      return nestedId.toHexString();
    }
    if (typeof nestedId === 'string' && nestedId.trim() !== '') {
      return nestedId;
    }
  }

  return null;
}

function isHexObjectId(value: string): boolean {
  return /^[a-fA-F0-9]{24}$/.test(value);
}

type SearchFieldKind = 'string' | 'number' | 'date' | 'array' | 'unknown';

function getSchemaFieldKind(
  model: Model<any>,
  pathName: string,
): SearchFieldKind {
  const schema = getModelSchema(model) as Schema & {
    path?: (name: string) => { instance?: string } | undefined;
    paths?: Record<string, { instance?: string }>;
  };

  const instance =
    schema.paths?.[pathName]?.instance ?? schema.path?.(pathName)?.instance;
  const normalizedInstance = instance?.toLowerCase();

  if (!normalizedInstance) {
    return 'unknown';
  }

  if (normalizedInstance === 'array') {
    return 'array';
  }

  if (normalizedInstance === 'date') {
    return 'date';
  }

  if (
    normalizedInstance === 'number' ||
    normalizedInstance === 'decimal128' ||
    normalizedInstance === 'int32' ||
    normalizedInstance === 'double'
  ) {
    return 'number';
  }

  if (normalizedInstance === 'string') {
    return 'string';
  }

  return 'unknown';
}

function isObjectIdSchemaField(model: Model<any>, pathName: string): boolean {
  const schema = getModelSchema(model) as Schema & {
    path?: (name: string) => { instance?: string } | undefined;
    paths?: Record<string, { instance?: string }>;
  };

  const instance =
    schema.paths?.[pathName]?.instance ?? schema.path?.(pathName)?.instance;

  return instance?.toLowerCase() === 'objectid';
}

function toStrictObjectId(
  value: unknown,
  fieldName: string,
  operator: SearchOperator,
): Types.ObjectId {
  if (value instanceof Types.ObjectId) {
    return value;
  }

  if (typeof value === 'string' && isHexObjectId(value)) {
    return new Types.ObjectId(value);
  }

  throw new BadRequestException(
    `search.${fieldName}.value must be a valid ObjectId for operator "${operator}"`,
  );
}

function toStrictObjectIdArray(
  values: unknown[],
  fieldName: string,
  operator: SearchOperator,
): Types.ObjectId[] {
  return values.map((value) => toStrictObjectId(value, fieldName, operator));
}

function assertOperatorAllowedForKind(
  fieldName: string,
  operator: SearchOperator,
  kind: SearchFieldKind,
): void {
  const operatorMap: Record<
    Exclude<SearchFieldKind, 'unknown'>,
    SearchOperator[]
  > = {
    string: [
      'equals',
      'notEquals',
      'contains',
      'notContains',
      'startsWith',
      'endsWith',
      'isEmpty',
      'isNotEmpty',
    ],
    number: [
      'equals',
      'notEquals',
      'gt',
      'gte',
      'lt',
      'lte',
      'between',
      'in',
      'notIn',
    ],
    date: [
      'equals',
      'before',
      'after',
      'beforeOrEqual',
      'afterOrEqual',
      'between',
    ],
    array: ['equals', 'notEquals', 'in', 'notIn', 'isEmpty', 'isNotEmpty'],
  };

  if (kind === 'unknown') {
    return;
  }

  const allowedOperators = operatorMap[kind];
  if (!allowedOperators.includes(operator)) {
    throw new BadRequestException(
      `search.${fieldName}.operator "${operator}" is not supported for ${kind} fields`,
    );
  }
}

function toValidNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function buildRegexFilter(
  value: string,
  mode: 'contains' | 'startsWith' | 'endsWith',
) {
  const escaped = escapeRegex(value);
  if (mode === 'startsWith') {
    return { $regex: `^${escaped}`, $options: 'i' };
  }

  if (mode === 'endsWith') {
    return { $regex: `${escaped}$`, $options: 'i' };
  }

  return { $regex: escaped, $options: 'i' };
}

function normalizeRole(role: string | undefined): string | undefined {
  const value = role?.trim().toLowerCase();
  return value ? value : undefined;
}

function toAllowedRoles(
  access: AccessRule,
  action: PermissionAction,
): string[] | undefined {
  if (!access) {
    return undefined;
  }

  if (Array.isArray(access)) {
    return access.map((item) => item.toLowerCase());
  }

  const roles = access[action];
  if (!roles) {
    return undefined;
  }

  return roles.map((item) => item.toLowerCase());
}

function isRoleAllowed(
  role: string | undefined,
  allowedRoles: string[] | undefined,
): boolean {
  if (!allowedRoles) {
    return true;
  }

  if (!role) {
    return false;
  }

  return allowedRoles.includes(role);
}

function getModelPermissions(model: Model<any>): PermissionMap | undefined {
  const schema = getModelSchema(model) as SchemaWithPermissions;

  return schema.formPermissions;
}

function resolveSortableField(model: Model<any>, field: string): string | null {
  const normalizedField = field.trim() === 'id' ? '_id' : field.trim();
  if (!normalizedField) {
    return null;
  }

  const schema = getModelSchema(model);
  const allowedPaths = new Set<string>();

  const schemaPaths = schema.paths as Record<string, unknown> | undefined;
  if (schemaPaths && typeof schemaPaths === 'object') {
    Object.keys(schemaPaths).forEach((pathName) => allowedPaths.add(pathName));
  }

  if (allowedPaths.size === 0 && typeof schema.eachPath === 'function') {
    schema.eachPath((pathName: string) => {
      allowedPaths.add(pathName);
    });
  }

  if (allowedPaths.size === 0) {
    return normalizedField;
  }

  return allowedPaths.has(normalizedField) ? normalizedField : null;
}

function toMongoSortOrder(order: SortOrder): 1 | -1 {
  return order === 'ascend' ? 1 : -1;
}

type AuditChange = {
  path: string;
  from?: unknown;
  to?: unknown;
  relationName?: string;
};

function isObjectIdLikeAuditValue(value: unknown): boolean {
  if (value instanceof Types.ObjectId) {
    return true;
  }

  if (typeof value === 'string') {
    return /^[a-fA-F0-9]{24}$/.test(value);
  }

  if (Array.isArray(value)) {
    return value.some((item) => isObjectIdLikeAuditValue(item));
  }

  if (!isPlainObject(value)) {
    return false;
  }

  const nestedId = value.id ?? value._id;
  if (nestedId !== undefined) {
    return isObjectIdLikeAuditValue(nestedId);
  }

  return Object.values(value).some((item) => isObjectIdLikeAuditValue(item));
}

function toHexObjectIdString(value: unknown): string | null {
  if (value instanceof Types.ObjectId) {
    return value.toHexString();
  }

  if (typeof value === 'string' && /^[a-fA-F0-9]{24}$/.test(value)) {
    return value;
  }

  if (!isPlainObject(value)) {
    return null;
  }

  const keys = Object.keys(value);
  const hasExpandedFields = keys.some((key) => key !== 'id' && key !== '_id');
  if (hasExpandedFields) {
    return null;
  }

  const nested = value.id ?? value._id;

  if (nested instanceof Types.ObjectId) {
    return nested.toHexString();
  }

  if (typeof nested === 'string' && /^[a-fA-F0-9]{24}$/.test(nested)) {
    return nested;
  }

  return null;
}

function enrichAuditChangesWithRelationName(
  model: Model<any>,
  changes: AuditChange[],
): AuditChange[] {
  if (changes.length === 0) {
    return changes;
  }

  const relationNameByPath = new Map(
    getRelationInfo(model).map((relation) => [
      relation.path,
      relation.refModelName,
    ]),
  );

  return changes.map((change) => {
    if (
      !isObjectIdLikeAuditValue(change.from) &&
      !isObjectIdLikeAuditValue(change.to)
    ) {
      return change;
    }

    const relationName = relationNameByPath.get(change.path) ?? change.path;

    return {
      ...change,
      relationName,
    };
  });
}

function normalizeAuditValue(value: unknown): unknown {
  if (value instanceof Types.ObjectId) {
    return value.toHexString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeAuditValue(item));
  }

  if (!isPlainObject(value)) {
    return value;
  }

  const normalized: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    normalized[key] = normalizeAuditValue(item);
  }

  return normalized;
}

function isDiffableObject(value: unknown): value is Record<string, unknown> {
  return isPlainObject(value) && !(value instanceof Date);
}

function diffChangedFields(
  previous: Record<string, unknown> | undefined,
  next: Record<string, unknown>,
  basePath = '',
): AuditChange[] {
  const changes: AuditChange[] = [];

  for (const [key, nextValue] of Object.entries(next)) {
    if (AUDIT_IGNORED_FIELDS.has(key)) {
      continue;
    }

    const path = basePath ? `${basePath}.${key}` : key;
    const previousValue = previous?.[key];

    if (isDiffableObject(previousValue) && isDiffableObject(nextValue)) {
      changes.push(...diffChangedFields(previousValue, nextValue, path));
      continue;
    }

    const normalizedPrevious = normalizeAuditValue(previousValue);
    const normalizedNext = normalizeAuditValue(nextValue);

    if (isDeepStrictEqual(normalizedPrevious, normalizedNext)) {
      continue;
    }

    changes.push({
      path,
      from: normalizedPrevious,
      to: normalizedNext,
    });
  }

  return changes;
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
    userRole?: string,
    sorter?: SorterQuery,
  ): Promise<PaginatedResult> {
    const model = this.registry.resolveModel(formName);
    const role = normalizeRole(userRole);
    const permissions = getModelPermissions(model);
    this.assertFormPermission(formName, permissions, 'read', role);

    const parsedSearch = this.queryBuilder.parseSearch(search);
    const filter = await this.buildSearchFilter(model, parsedSearch);
    const includes = this.relations.resolveIncludePaths(model, include);
    const skip = (page - 1) * limit;

    const query = model.find(filter);
    this.relations.applyPopulate(query, model, include);

    if (sorter) {
      const sortField = resolveSortableField(model, sorter.field);
      if (!sortField) {
        throw new BadRequestException(
          `sorter.field "${sorter.field}" is not a valid field for form "${formName}".`,
        );
      }

      this.assertReadableSortField(formName, sortField, permissions, role);
      query.sort({ [sortField]: toMongoSortOrder(sorter.order) });
    }

    query.skip(skip).limit(limit);

    const [data, total] = await Promise.all([
      query.lean().exec(),
      model.countDocuments(filter).exec(),
    ]);

    const transformedData = transformIds(data) as unknown[];
    const filteredData = transformedData.map((item) =>
      this.filterReadableFields(item, permissions, role),
    );
    const sanitizedData = excludeAuditFieldsFromResponse(
      filteredData,
    ) as unknown[];

    return {
      data: sanitizedData,
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

  private async buildSearchFilter(
    model: Model<any>,
    search: SearchQuery,
  ): Promise<Record<string, unknown>> {
    const { rootConditions, quickConditions } =
      this.normalizeSearchConditions(search);
    const matchedSearch = toSchemaMatchedFilter(
      model,
      rootConditions,
    ) as SearchConditionMap;
    const matchedQuickSearch = toSchemaMatchedFilter(
      model,
      quickConditions,
    ) as SearchConditionMap;

    const rootFilter = await this.buildConditionsFilter(model, matchedSearch);

    if (Object.keys(matchedQuickSearch).length === 0) {
      return rootFilter;
    }

    const quickFilter = await this.buildConditionsFilter(
      model,
      matchedQuickSearch,
    );
    const quickOrClauses = Object.entries(quickFilter).map(
      ([field, condition]) => ({
        [field]: condition,
      }),
    );

    if (quickOrClauses.length === 0) {
      return rootFilter;
    }

    if (Object.keys(rootFilter).length === 0) {
      return {
        $or: quickOrClauses,
      };
    }

    return {
      $and: [{ $or: quickOrClauses }, rootFilter],
    };
  }

  private normalizeSearchConditions(search: SearchQuery): {
    rootConditions: SearchConditionMap;
    quickConditions: SearchConditionMap;
  } {
    const searchRecord = search as Record<string, unknown>;
    const hasNewShape =
      isPlainObject(searchRecord.filters) || isPlainObject(searchRecord.quick);

    if (hasNewShape) {
      return {
        rootConditions: isPlainObject(searchRecord.filters)
          ? (searchRecord.filters as SearchConditionMap)
          : {},
        quickConditions: isPlainObject(searchRecord.quick)
          ? (searchRecord.quick as SearchConditionMap)
          : {},
      };
    }

    return {
      rootConditions: search as unknown as SearchConditionMap,
      quickConditions: {},
    };
  }

  private isSearchCondition(value: unknown): value is SearchCondition {
    if (!isPlainObject(value)) {
      return false;
    }

    return typeof value.operator === 'string' && 'value' in value;
  }

  private async buildConditionsFilter(
    model: Model<any>,
    conditions: SearchConditionMap,
  ): Promise<Record<string, unknown>> {
    const nextFilter: Record<string, unknown> = {};

    const relationsByPath = new Map(
      getRelationInfo(model).map((relation) => [relation.path, relation]),
    );

    for (const [fieldName, rawCondition] of Object.entries(conditions)) {
      if (!this.isSearchCondition(rawCondition)) {
        continue;
      }

      const condition = rawCondition;
      const operator = condition.operator;
      const kind = getSchemaFieldKind(model, fieldName);
      const isRelationField = relationsByPath.has(fieldName);
      const isObjectIdField = isObjectIdSchemaField(model, fieldName);
      const shouldNormalizeObjectIdValues = isRelationField || isObjectIdField;
      assertOperatorAllowedForKind(fieldName, operator, kind);

      if (operator === 'isEmpty') {
        if (kind === 'array') {
          nextFilter[fieldName] = { $size: 0 };
          continue;
        }

        nextFilter[fieldName] = { $in: [null, ''] };
        continue;
      }

      if (operator === 'isNotEmpty') {
        if (kind === 'array') {
          nextFilter[fieldName] = { $exists: true, $ne: [] };
          continue;
        }

        nextFilter[fieldName] = { $nin: [null, ''] };
        continue;
      }

      if (operator === 'contains') {
        if (
          typeof condition.value !== 'string' ||
          condition.value.trim() === ''
        ) {
          throw new BadRequestException(
            `search.${fieldName}.value must be a non-empty string for operator "contains"`,
          );
        }

        const containsValue = condition.value.trim();
        const relation = relationsByPath.get(fieldName);
        if (relation) {
          if (isHexObjectId(containsValue)) {
            nextFilter[fieldName] = new Types.ObjectId(containsValue);
            continue;
          }

          const relationIds = await this.findRelationIdsByText(
            relation.refModelName,
            containsValue,
          );

          nextFilter[fieldName] = {
            $in: relationIds,
          };
          continue;
        }

        nextFilter[fieldName] = {
          ...buildRegexFilter(containsValue, 'contains'),
        };
        continue;
      }

      if (operator === 'notContains') {
        if (typeof condition.value !== 'string') {
          throw new BadRequestException(
            `search.${fieldName}.value must be a string for operator "notContains"`,
          );
        }

        nextFilter[fieldName] = {
          $not: buildRegexFilter(condition.value, 'contains'),
        };
        continue;
      }

      if (operator === 'startsWith') {
        if (typeof condition.value !== 'string') {
          throw new BadRequestException(
            `search.${fieldName}.value must be a string for operator "startsWith"`,
          );
        }

        nextFilter[fieldName] = buildRegexFilter(condition.value, 'startsWith');
        continue;
      }

      if (operator === 'endsWith') {
        if (typeof condition.value !== 'string') {
          throw new BadRequestException(
            `search.${fieldName}.value must be a string for operator "endsWith"`,
          );
        }

        nextFilter[fieldName] = buildRegexFilter(condition.value, 'endsWith');
        continue;
      }

      if (
        operator === 'gt' ||
        operator === 'gte' ||
        operator === 'lt' ||
        operator === 'lte'
      ) {
        const scalarValue =
          kind === 'date'
            ? toValidDate(condition.value)
            : toValidNumber(condition.value);
        if (scalarValue === null) {
          throw new BadRequestException(
            `search.${fieldName}.value is invalid for operator "${operator}"`,
          );
        }

        const mongoOperator =
          operator === 'gt'
            ? '$gt'
            : operator === 'gte'
              ? '$gte'
              : operator === 'lt'
                ? '$lt'
                : '$lte';

        nextFilter[fieldName] = {
          [mongoOperator]: scalarValue,
        };
        continue;
      }

      if (
        operator === 'before' ||
        operator === 'after' ||
        operator === 'beforeOrEqual' ||
        operator === 'afterOrEqual'
      ) {
        const dateValue = toValidDate(condition.value);
        if (!dateValue) {
          throw new BadRequestException(
            `search.${fieldName}.value must be a valid date for operator "${operator}"`,
          );
        }

        const mongoOperator =
          operator === 'before'
            ? '$lt'
            : operator === 'after'
              ? '$gt'
              : operator === 'beforeOrEqual'
                ? '$lte'
                : '$gte';

        nextFilter[fieldName] = {
          [mongoOperator]: dateValue,
        };
        continue;
      }

      if (operator === 'between') {
        if (!Array.isArray(condition.value) || condition.value.length !== 2) {
          throw new BadRequestException(
            `search.${fieldName}.value must be an array of two values for operator "between"`,
          );
        }

        const betweenValues = condition.value as unknown[];
        const rawStart = betweenValues[0];
        const rawEnd = betweenValues[1];
        const start =
          kind === 'date' ? toValidDate(rawStart) : toValidNumber(rawStart);
        const end =
          kind === 'date' ? toValidDate(rawEnd) : toValidNumber(rawEnd);
        if (start === null || end === null) {
          throw new BadRequestException(
            `search.${fieldName}.value contains invalid values for operator "between"`,
          );
        }

        nextFilter[fieldName] = {
          $gte: start,
          $lte: end,
        };
        continue;
      }

      if (operator === 'in') {
        if (!Array.isArray(condition.value)) {
          throw new BadRequestException(
            `search.${fieldName}.value must be an array for operator "in"`,
          );
        }

        if (shouldNormalizeObjectIdValues) {
          nextFilter[fieldName] = {
            $in: toStrictObjectIdArray(condition.value, fieldName, operator),
          };
          continue;
        }

        nextFilter[fieldName] = {
          $in: condition.value,
        };
        continue;
      }

      if (operator === 'notIn') {
        if (!Array.isArray(condition.value)) {
          throw new BadRequestException(
            `search.${fieldName}.value must be an array for operator "notIn"`,
          );
        }

        if (shouldNormalizeObjectIdValues) {
          nextFilter[fieldName] = {
            $nin: toStrictObjectIdArray(condition.value, fieldName, operator),
          };
          continue;
        }

        nextFilter[fieldName] = {
          $nin: condition.value,
        };
        continue;
      }

      if (operator === 'notEquals') {
        if (shouldNormalizeObjectIdValues) {
          nextFilter[fieldName] = {
            $ne: toStrictObjectId(condition.value, fieldName, operator),
          };
          continue;
        }

        nextFilter[fieldName] = {
          $ne: condition.value,
        };
        continue;
      }

      if (operator === 'equals') {
        if (shouldNormalizeObjectIdValues) {
          nextFilter[fieldName] = toStrictObjectId(
            condition.value,
            fieldName,
            operator,
          );
          continue;
        }

        nextFilter[fieldName] = condition.value;
        continue;
      }

      nextFilter[fieldName] = condition.value;
    }

    return nextFilter;
  }

  private async findRelationIdsByText(
    relationModelName: string,
    text: string,
  ): Promise<Array<string | Types.ObjectId>> {
    try {
      const relationModel = this.registry.resolveModel(relationModelName);
      const relationSchema = getModelSchema(relationModel);
      const schemaPaths = relationSchema.paths as
        | Record<string, unknown>
        | undefined;

      const searchableFields = REFERENCE_SEARCH_FIELDS.filter(
        (fieldName) => !!schemaPaths?.[fieldName],
      );

      if (searchableFields.length === 0) {
        return [];
      }

      const matchedRecords = (await relationModel
        .find({
          $or: searchableFields.map((fieldName) => ({
            [fieldName]: {
              $regex: escapeRegex(text),
              $options: 'i',
            },
          })),
        })
        .select('_id')
        .limit(500)
        .lean()
        .exec()) as unknown[];

      return matchedRecords
        .map((record) => getObjectIdLike(record))
        .filter(
          (id): id is string | Types.ObjectId =>
            id instanceof Types.ObjectId ||
            (typeof id === 'string' && id.trim() !== ''),
        );
    } catch {
      return [];
    }
  }

  async findById(
    formName: string,
    id: string,
    include: unknown,
    userRole?: string,
  ) {
    const model = this.registry.resolveModel(formName);
    const role = normalizeRole(userRole);
    const permissions = getModelPermissions(model);
    this.assertFormPermission(formName, permissions, 'read', role);

    const query = model.findById(id);
    this.relations.applyPopulate(query, model, include);

    const data = (await query.lean().exec()) as unknown;

    if (!data) {
      throw new NotFoundException(
        `No record found for formName "${formName}" and id "${id}".`,
      );
    }

    const filteredData = this.filterReadableFields(
      transformIds(data),
      permissions,
      role,
    );

    return excludeAuditFieldsFromResponse(filteredData);
  }

  async findAuditById(formName: string, id: string, userRole?: string) {
    const model = this.registry.resolveModel(formName);
    const role = normalizeRole(userRole);
    const permissions = getModelPermissions(model);
    this.assertFormPermission(formName, permissions, 'read', role);

    const parentOnlyFilter: Record<string, unknown> = {
      _id: id,
      $or: [{ parent_id: { $exists: false } }, { parent_id: null }],
    };

    const data = (await model
      .findOne(parentOnlyFilter)
      .select('audit')
      .lean()
      .exec()) as Record<string, unknown> | null;

    if (!data) {
      throw new NotFoundException(
        `No parent record found for formName "${formName}" and id "${id}".`,
      );
    }

    const transformed = transformIds(data) as Record<string, unknown>;
    const sortedAudit = sortAuditByChangedAtDesc(
      Array.isArray(transformed.audit) ? transformed.audit : [],
    );

    return {
      id: typeof transformed.id === 'string' ? transformed.id : id,
      audit: sortedAudit,
    };
  }

  private async resolveAuditRelationValue(
    value: unknown,
    relationName: string,
    relationCache: Map<string, Promise<Record<string, unknown> | null>>,
  ): Promise<unknown> {
    if (Array.isArray(value)) {
      return Promise.all(
        value.map((item) =>
          this.resolveAuditRelationValue(item, relationName, relationCache),
        ),
      );
    }

    const objectId = toHexObjectIdString(value);
    if (!objectId) {
      return value;
    }

    const cacheKey = `${relationName}:${objectId}`;
    const cached = relationCache.get(cacheKey);
    if (cached) {
      const cachedValue = await cached;
      return cachedValue ?? value;
    }

    const fetchPromise = this.fetchRelatedRecordByRelationName(
      relationName,
      objectId,
    );
    relationCache.set(cacheKey, fetchPromise);

    const resolved = await fetchPromise;
    return resolved ?? value;
  }

  private async fetchRelatedRecordByRelationName(
    relationName: string,
    id: string,
  ): Promise<Record<string, unknown> | null> {
    try {
      const relationModel = this.registry.resolveModel(relationName);
      const related: unknown = await relationModel
        .findById(id)
        .select('name label title text firstName lastName')
        .lean()
        .exec();

      if (!related) {
        return null;
      }

      const transformed = transformIds(related);
      if (!isPlainObject(transformed)) {
        return null;
      }

      return transformed;
    } catch {
      return null;
    }
  }

  private enrichAuditRelationsInBackground(
    model: Model<any>,
    parentId: string | Types.ObjectId,
    changedAt: Date,
    actorRole: string | undefined,
    changedFields: AuditChange[],
  ) {
    const shouldResolveRelations = changedFields.some(
      (change) =>
        typeof change.relationName === 'string' && change.relationName !== '',
    );

    if (!shouldResolveRelations) {
      return;
    }

    void this.persistResolvedAuditRelations(
      model,
      parentId,
      changedAt,
      actorRole,
      changedFields,
    ).catch(() => undefined);
  }

  private async persistResolvedAuditRelations(
    model: Model<any>,
    parentId: string | Types.ObjectId,
    changedAt: Date,
    actorRole: string | undefined,
    changedFields: AuditChange[],
  ): Promise<void> {
    const relationCache = new Map<
      string,
      Promise<Record<string, unknown> | null>
    >();

    const resolvedChangedFields: AuditChange[] = await Promise.all(
      changedFields.map(async (change): Promise<AuditChange> => {
        if (
          typeof change.relationName !== 'string' ||
          change.relationName.trim() === ''
        ) {
          return change;
        }

        const from = await this.resolveAuditRelationValue(
          change.from,
          change.relationName,
          relationCache,
        );
        const to = await this.resolveAuditRelationValue(
          change.to,
          change.relationName,
          relationCache,
        );

        return {
          ...change,
          from,
          to,
        };
      }),
    );

    if (isDeepStrictEqual(resolvedChangedFields, changedFields)) {
      return;
    }

    const entryFilter: Record<string, unknown> = {
      'entry.changedAt': changedAt,
    };

    if (typeof actorRole === 'string' && actorRole.trim() !== '') {
      entryFilter['entry.actorRole'] = actorRole;
    } else {
      entryFilter['entry.actorRole'] = { $exists: false };
    }

    await model
      .findByIdAndUpdate(
        parentId,
        {
          $set: {
            'audit.$[entry].changedFields': resolvedChangedFields,
          },
        },
        {
          arrayFilters: [entryFilter],
          strict: false,
        },
      )
      .exec();
  }

  async create(formName: string, payload: Payload, userRole?: string) {
    const parentId = getEntityId(payload);
    if (parentId) {
      return this.update(formName, payload, userRole);
    }

    const model = this.registry.resolveModel(formName);
    const role = normalizeRole(userRole);
    const permissions = getModelPermissions(model);
    this.assertFormPermission(formName, permissions, 'write', role);

    const normalizedPayload: Payload = { ...payload };
    this.assertWritablePayload(
      formName,
      normalizedPayload,
      permissions,
      'write',
      role,
    );

    await this.resolveSubforms(model, normalizedPayload, false, role);

    const created = (await model.create(
      normalizedPayload,
    )) as CreatableDocument;
    const createdObj = created.toObject();
    const createdId = getObjectIdLike(created._id ?? createdObj._id);

    // Try to populate all relations in the response
    try {
      if (!createdId) {
        throw new Error('Unable to resolve created document id');
      }

      const query = model.findById(createdId);
      this.relations.applyPopulate(query, model, undefined);
      const populated = (await query.lean().exec()) as unknown;
      return this.filterReadableFields(
        transformIds(populated || createdObj),
        permissions,
        role,
      );
    } catch {
      // Fallback if populate fails (e.g., in tests with mocked models)
      return this.filterReadableFields(
        transformIds(createdObj),
        permissions,
        role,
      );
    }
  }

  async update(formName: string, payload: Payload, userRole?: string) {
    const parentId = getEntityId(payload);
    const role = normalizeRole(userRole);

    if (!parentId) {
      throw new BadRequestException('id is required for update');
    }

    const subform = payload.subform;
    if (typeof subform === 'string' && subform.trim() !== '') {
      this.registry.resolveModel(formName);
      return this.createSubformForParent(subform, payload, parentId, role);
    }

    const model = this.registry.resolveModel(formName);
    const permissions = getModelPermissions(model);
    this.assertFormPermission(formName, permissions, 'edit', role);

    const normalizedPayload: Payload = toCreatePayload(payload);
    this.assertWritablePayload(
      formName,
      normalizedPayload,
      permissions,
      'edit',
      role,
    );
    await this.resolveSubforms(model, normalizedPayload, true, role);

    const existing = (await model.findById(parentId).lean().exec()) as Record<
      string,
      unknown
    > | null;
    if (!existing) {
      throw new NotFoundException(
        `No record found for formName "${formName}" and id "${String(parentId)}".`,
      );
    }

    this.mergeArrayRelationsWithExisting(model, existing, normalizedPayload);

    const changedFields = enrichAuditChangesWithRelationName(
      model,
      diffChangedFields(existing, normalizedPayload),
    );
    const hasAuditKey = Reflect.has(existing, 'audit');

    const setPayload: Record<string, unknown> = {
      ...normalizedPayload,
    };

    if (!hasAuditKey && changedFields.length === 0) {
      setPayload.audit = [];
    }

    const updatePayload: Record<string, unknown> = {
      $set: setPayload,
    };

    const changedAt = new Date();

    if (changedFields.length > 0) {
      updatePayload.$push = {
        audit: {
          changedAt,
          actorRole: role,
          changedFields,
        },
      };
    }

    const updated = (await model
      .findByIdAndUpdate(parentId, updatePayload, {
        returnDocument: 'after',
        strict: false,
      })
      .lean()
      .exec()) as unknown;

    if (!updated) {
      throw new NotFoundException(
        `No record found for formName "${formName}" and id "${String(parentId)}".`,
      );
    }

    if (changedFields.length > 0) {
      this.enrichAuditRelationsInBackground(
        model,
        parentId,
        changedAt,
        role,
        changedFields,
      );
    }

    // Try to populate all relations in the response
    try {
      const query = model.findById(parentId);
      this.relations.applyPopulate(query, model, undefined);
      const populated = (await query.lean().exec()) as unknown;
      return this.filterReadableFields(
        transformIds(populated || updated),
        permissions,
        role,
      );
    } catch {
      // Fallback if populate fails (e.g., in tests with mocked models)
      return this.filterReadableFields(
        transformIds(updated),
        permissions,
        role,
      );
    }
  }

  private async createSubformForParent(
    subformName: string,
    payload: Payload,
    parentId: string | Types.ObjectId,
    role: string | undefined,
  ) {
    const subformModel = this.registry.resolveModel(subformName);
    const subformPermissions = getModelPermissions(subformModel);
    this.assertFormPermission(subformName, subformPermissions, 'write', role);

    const subformPayload = toCreatePayload(payload);
    delete subformPayload.subform;
    subformPayload.parent_id =
      typeof parentId === 'string' ? parentId : parentId.toHexString();

    this.assertWritablePayload(
      subformName,
      subformPayload,
      subformPermissions,
      'write',
      role,
    );

    await this.resolveSubforms(subformModel, subformPayload, true, role);

    const created = (await subformModel.create(
      subformPayload,
    )) as CreatableDocument;
    const createdObj = created.toObject();
    const createdId = getObjectIdLike(created._id ?? createdObj._id);

    // Try to populate all relations in the response
    try {
      if (!createdId) {
        throw new Error('Unable to resolve created subform id');
      }

      const query = subformModel.findById(createdId);
      this.relations.applyPopulate(query, subformModel, undefined);
      const populated = (await query.lean().exec()) as unknown;
      return this.filterReadableFields(
        transformIds(populated || createdObj),
        subformPermissions,
        role,
      );
    } catch {
      // Fallback if populate fails (e.g., in tests with mocked models)
      return this.filterReadableFields(
        transformIds(createdObj),
        subformPermissions,
        role,
      );
    }
  }

  private async resolveSubforms(
    model: Model<any>,
    payload: Payload,
    allowUpdate: boolean,
    role: string | undefined,
  ) {
    const relations = getRelationInfo(model);

    for (const relation of relations) {
      let value = payload[relation.path];

      // Handle stringified values
      if (typeof value === 'string') {
        try {
          value = JSON.parse(value);
        } catch {
          // Not JSON, skip
          continue;
        }
      }

      if (!isPlainObject(value) && !isObjectArray(value)) {
        continue;
      }

      const relationModel = this.registry.resolveModel(relation.refModelName);
      const relationPermissions = getModelPermissions(relationModel);
      const sourceItems = Array.isArray(value) ? value : [value];
      const createdIds = await Promise.all(
        sourceItems.map(
          async (item): Promise<string | Types.ObjectId | null> => {
            const relationId = getEntityId(item);
            const relationPayload = toCreatePayload(item);
            const action: PermissionAction =
              allowUpdate && relationId ? 'edit' : 'write';

            this.assertFormPermission(
              relation.refModelName,
              relationPermissions,
              action,
              role,
            );
            this.assertWritablePayload(
              relation.refModelName,
              relationPayload,
              relationPermissions,
              action,
              role,
            );

            await this.resolveSubforms(
              relationModel,
              relationPayload,
              allowUpdate,
              role,
            );

            if (allowUpdate && relationId) {
              const updated = (await relationModel
                .findByIdAndUpdate(relationId, relationPayload, {
                  returnDocument: 'after',
                })
                .exec()) as unknown;

              const updatedId = getObjectIdLike(updated);
              if (updatedId) {
                return updatedId;
              }
            }

            const created = (await relationModel.create(
              relationPayload,
            )) as CreatableDocument;

            return (
              getObjectIdLike(created._id) ??
              getObjectIdLike(created.toObject())
            );
          },
        ),
      );

      const validCreatedIds = createdIds.filter(
        (id): id is string | Types.ObjectId => id !== null,
      );

      const relationValue = relation.isArray
        ? validCreatedIds
        : validCreatedIds[0];

      payload[relation.path] = relationValue;
    }
  }

  private mergeArrayRelationsWithExisting(
    model: Model<any>,
    existing: Record<string, unknown>,
    payload: Payload,
  ) {
    const relations = getRelationInfo(model).filter(
      (relation) => relation.isArray,
    );

    for (const relation of relations) {
      const nextValue = payload[relation.path];
      if (!Array.isArray(nextValue) || nextValue.length === 0) {
        continue;
      }

      const previousValue = existing[relation.path];
      const previousArray: unknown[] = Array.isArray(previousValue)
        ? previousValue
        : [];
      const nextArray: unknown[] = nextValue;

      const merged: unknown[] = [];
      const seen = new Set<string>();

      for (const item of [...previousArray, ...nextArray]) {
        const id = toIdString(item);
        if (!id || seen.has(id)) {
          continue;
        }
        seen.add(id);
        merged.push(id);
      }

      payload[relation.path] = merged;
    }
  }

  private assertFormPermission(
    formName: string,
    permissions: PermissionMap | undefined,
    action: PermissionAction,
    role: string | undefined,
  ) {
    const allowedRoles = toAllowedRoles(permissions?.form, action);

    if (!isRoleAllowed(role, allowedRoles)) {
      throw new ForbiddenException(
        `Role "${role ?? 'unknown'}" is not authorized to ${action} form "${formName}".`,
      );
    }
  }

  private assertWritablePayload(
    formName: string,
    payload: Payload,
    permissions: PermissionMap | undefined,
    action: Extract<PermissionAction, 'write' | 'edit'>,
    role: string | undefined,
  ) {
    if (!permissions?.fields) {
      return;
    }

    const deniedFields: string[] = [];

    for (const fieldName of Object.keys(payload)) {
      if (PAYLOAD_SYSTEM_FIELDS.has(fieldName)) {
        continue;
      }

      const fieldAccess = permissions.fields[fieldName];
      if (!fieldAccess) {
        continue;
      }

      const allowedRoles = toAllowedRoles(fieldAccess, action);
      if (isRoleAllowed(role, allowedRoles)) {
        continue;
      }

      deniedFields.push(fieldName);
    }

    if (deniedFields.length > 0) {
      throw new ForbiddenException(
        `Role "${role ?? 'unknown'}" is not authorized to ${action} fields on form "${formName}": ${deniedFields.join(', ')}.`,
      );
    }
  }

  private filterReadableFields(
    value: unknown,
    permissions: PermissionMap | undefined,
    role: string | undefined,
  ): unknown {
    if (Array.isArray(value)) {
      return value.map((item) =>
        this.filterReadableFields(item, permissions, role),
      );
    }

    if (!isPlainObject(value) || !permissions?.fields) {
      return value;
    }

    const filtered: Record<string, unknown> = {};

    for (const [fieldName, fieldValue] of Object.entries(value)) {
      if (READ_ALWAYS_ALLOWED_FIELDS.has(fieldName)) {
        filtered[fieldName] = fieldValue;
        continue;
      }

      const fieldAccess = permissions.fields[fieldName];
      if (!fieldAccess) {
        filtered[fieldName] = fieldValue;
        continue;
      }

      const allowedRoles = toAllowedRoles(fieldAccess, 'read');
      if (!isRoleAllowed(role, allowedRoles)) {
        continue;
      }

      filtered[fieldName] = fieldValue;
    }

    return filtered;
  }

  private assertReadableSortField(
    formName: string,
    fieldName: string,
    permissions: PermissionMap | undefined,
    role: string | undefined,
  ) {
    if (READ_ALWAYS_ALLOWED_FIELDS.has(fieldName)) {
      return;
    }

    const fieldAccess = permissions?.fields?.[fieldName];
    if (!fieldAccess) {
      return;
    }

    const allowedRoles = toAllowedRoles(fieldAccess, 'read');
    if (isRoleAllowed(role, allowedRoles)) {
      return;
    }

    throw new ForbiddenException(
      `Role "${role ?? 'unknown'}" is not authorized to sort by field "${fieldName}" on form "${formName}".`,
    );
  }
}

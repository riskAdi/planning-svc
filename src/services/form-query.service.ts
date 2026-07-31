import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { isDeepStrictEqual } from 'node:util';
import { Types, type Model, type Schema, type SchemaType } from 'mongoose';

import type { FormModelDefinition } from '../form-model.registry';

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

function getSchemaPathInstance(
  model: Model<any>,
  pathName: string,
): string | undefined {
  const schema = getModelSchema(model) as Schema & {
    path?: (name: string) => { instance?: string } | undefined;
    paths?: Record<string, { instance?: string }>;
  };

  const fromPaths = schema.paths?.[pathName]?.instance;
  if (typeof fromPaths === 'string' && fromPaths.trim() !== '') {
    return fromPaths;
  }

  if (typeof schema.path === 'function') {
    const fromPathFn = schema.path(pathName)?.instance;
    if (typeof fromPathFn === 'string' && fromPathFn.trim() !== '') {
      return fromPathFn;
    }
  }

  return undefined;
}

function toOrRegexFilter(
  model: Model<any>,
  matchedFilter: Record<string, unknown>,
): Record<string, unknown> {
  const entries = Object.entries(matchedFilter);
  if (entries.length === 0) {
    return {};
  }

  const andClauses: Record<string, unknown> = {};
  const orClauses: Record<string, unknown>[] = [];

  for (const [key, value] of entries) {
    const schemaInstance = getSchemaPathInstance(model, key)?.toLowerCase();
    const isStringPath = !schemaInstance || schemaInstance === 'string';

    if (typeof value === 'string' && isStringPath) {
      const wildcardPattern = value
        .split('*')
        .map((segment) => escapeRegex(segment))
        .join('.*');

      orClauses.push({
        [key]: {
          $regex: wildcardPattern,
          $options: 'i',
        },
      });
      continue;
    }

    andClauses[key] = value;
  }

  if (orClauses.length === 0) {
    return andClauses;
  }

  if (Object.keys(andClauses).length === 0) {
    return { $or: orClauses };
  }

  return {
    ...andClauses,
    $or: orClauses,
  };
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

type AuditChange = {
  path: string;
  from?: unknown;
  to?: unknown;
};

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
  ): Promise<PaginatedResult> {
    const model = this.registry.resolveModel(formName);
    const role = normalizeRole(userRole);
    const permissions = getModelPermissions(model);
    this.assertFormPermission(formName, permissions, 'read', role);

    const parsedFilter = this.queryBuilder.parseSearch(search);
    const matchedFilter = toSchemaMatchedFilter(model, parsedFilter);
    const filter = toOrRegexFilter(model, matchedFilter);
    const includes = this.relations.resolveIncludePaths(model, include);
    const skip = (page - 1) * limit;

    const query = model.find(filter);
    this.relations.applyPopulate(query, model, include);
    query.skip(skip).limit(limit);

    const [data, total] = await Promise.all([
      query.lean().exec(),
      model.countDocuments(filter).exec(),
    ]);

    const transformedData = transformIds(data) as unknown[];
    const filteredData = transformedData.map((item) =>
      this.filterReadableFields(item, permissions, role),
    );

    return {
      data: filteredData,
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

    return this.filterReadableFields(transformIds(data), permissions, role);
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

    const changedFields = diffChangedFields(existing, normalizedPayload);
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

    if (changedFields.length > 0) {
      updatePayload.$push = {
        audit: {
          changedAt: new Date(),
          actorRole: role,
          changedFields,
        },
      };
    }

    const updated = (await model
      .findByIdAndUpdate(parentId, updatePayload, {
        returnDocument: 'after',
      })
      .lean()
      .exec()) as unknown;

    if (!updated) {
      throw new NotFoundException(
        `No record found for formName "${formName}" and id "${String(parentId)}".`,
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
}

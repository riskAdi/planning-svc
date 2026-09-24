import { Model, Schema } from 'mongoose';

const DEFAULT_SOURCE_FIELDS = ['name', 'title', 'label', 'text'] as const;
const SLUG_POLICY_APPLIED = Symbol('slugPolicyApplied');

type SlugPolicyOptions = {
  sourceFields?: string[];
};

type QueryLike = {
  getFilter?: () => Record<string, unknown>;
  getOptions?: () => Record<string, unknown>;
  getUpdate?: () => unknown;
  setUpdate?: (update: unknown) => void;
  model: Model<any>;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value) as object | null;
  return prototype === Object.prototype || prototype === null;
}

function toSlug(value: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  return slug || 'item';
}

function getNestedObject(
  source: Record<string, unknown>,
  field: string,
): Record<string, unknown> | null {
  const value = source[field];
  return isPlainObject(value) ? value : null;
}

function getFirstStringValue(
  source: Record<string, unknown>,
  fields: readonly string[],
): string | null {
  for (const field of fields) {
    const value = source[field];
    if (typeof value === 'string' && value.trim() !== '') {
      return value;
    }
  }

  return null;
}

function resolveBaseValue(
  update: unknown,
  filter: unknown,
  sourceFields: readonly string[],
): string {
  if (isPlainObject(update)) {
    const updateBase = getFirstStringValue(update, sourceFields);
    if (updateBase) {
      return updateBase;
    }

    const setPayload = getNestedObject(update, '$set');
    if (setPayload) {
      const setBase = getFirstStringValue(setPayload, sourceFields);
      if (setBase) {
        return setBase;
      }
    }
  }

  if (isPlainObject(filter)) {
    const filterBase = getFirstStringValue(filter, sourceFields);
    if (filterBase) {
      return filterBase;
    }
  }

  return 'item';
}

async function buildUniqueSlug(
  model: Model<any>,
  baseValue: string,
): Promise<string> {
  const baseSlug = toSlug(baseValue);
  let candidate = baseSlug;
  let suffix = 1;

  while (await model.exists({ slug: candidate })) {
    suffix += 1;
    candidate = `${baseSlug}_${suffix}`;
  }

  return candidate;
}

function stripSlugFromUpdatePayload(update: unknown): void {
  if (Array.isArray(update)) {
    for (const stage of update) {
      if (!isPlainObject(stage)) {
        continue;
      }

      const setStage = getNestedObject(stage, '$set');
      if (setStage) {
        delete setStage.slug;
      }

      const unsetStage = getNestedObject(stage, '$unset');
      if (unsetStage) {
        delete unsetStage.slug;
      }
    }

    return;
  }

  if (!isPlainObject(update)) {
    return;
  }

  delete update.slug;

  const setPayload = getNestedObject(update, '$set');
  if (setPayload) {
    delete setPayload.slug;
  }

  const setOnInsertPayload = getNestedObject(update, '$setOnInsert');
  if (setOnInsertPayload) {
    delete setOnInsertPayload.slug;
  }

  const unsetPayload = getNestedObject(update, '$unset');
  if (unsetPayload) {
    delete unsetPayload.slug;
  }
}

async function enforceSlugOnUpdateQuery(
  query: QueryLike,
  sourceFields: readonly string[],
): Promise<void> {
  const update = query.getUpdate?.();
  stripSlugFromUpdatePayload(update);

  const options = query.getOptions?.() ?? {};
  if (!options.upsert || !isPlainObject(update)) {
    if (update !== undefined) {
      query.setUpdate?.(update);
    }
    return;
  }

  const baseValue = resolveBaseValue(update, query.getFilter?.(), sourceFields);
  const uniqueSlug = await buildUniqueSlug(query.model, baseValue);

  const setOnInsert =
    getNestedObject(update, '$setOnInsert') ?? ({} as Record<string, unknown>);
  setOnInsert.slug = uniqueSlug;
  update.$setOnInsert = setOnInsert;

  query.setUpdate?.(update);
}

export function applyAutoSlugPolicy(
  schema: Schema,
  options?: SlugPolicyOptions,
): void {
  if (!schema.path('slug')) {
    return;
  }

  const schemaWithFlags = schema as Schema & {
    [SLUG_POLICY_APPLIED]?: boolean;
  };

  if (schemaWithFlags[SLUG_POLICY_APPLIED]) {
    return;
  }

  schemaWithFlags[SLUG_POLICY_APPLIED] = true;

  const sourceFields =
    options?.sourceFields && options.sourceFields.length > 0
      ? options.sourceFields
      : [...DEFAULT_SOURCE_FIELDS];

  schema.pre('validate', async function () {
    const document = this as unknown as {
      isNew?: boolean;
      set: (path: string, value: unknown) => void;
      toObject?: () => Record<string, unknown>;
      constructor: Function;
    };

    if (!document.isNew) {
      return;
    }

    const source = document.toObject?.() ?? ({} as Record<string, unknown>);
    const baseValue = resolveBaseValue(source, undefined, sourceFields);
    const model = document.constructor as unknown as Model<any>;
    const uniqueSlug = await buildUniqueSlug(model, baseValue);

    document.set('slug', uniqueSlug);
  });

  schema.pre('findOneAndUpdate', async function () {
    await enforceSlugOnUpdateQuery(this as unknown as QueryLike, sourceFields);
  });

  schema.pre('updateOne', async function () {
    await enforceSlugOnUpdateQuery(this as unknown as QueryLike, sourceFields);
  });

  schema.pre('updateMany', function () {
    const query = this as unknown as QueryLike;
    const update = query.getUpdate?.();
    stripSlugFromUpdatePayload(update);
    if (update !== undefined) {
      query.setUpdate?.(update);
    }
  });
}

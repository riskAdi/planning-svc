const AUDIT_FIELDS_TO_EXCLUDE = new Set([
  'audit',
  '__v',
  'createdAt',
  'updatedAt',
]);

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object';
}

function toObjectIfDocument(value: unknown): unknown {
  if (!isObject(value)) {
    return value;
  }

  const toObject = Reflect.get(value, 'toObject');
  if (typeof toObject !== 'function') {
    return value;
  }

  try {
    return (toObject as () => Record<string, unknown>)();
  } catch {
    return value;
  }
}

export function excludeAuditFieldsFromResponse(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => excludeAuditFieldsFromResponse(item));
  }

  if (!isObject(value)) {
    return value;
  }

  const normalized = toObjectIfDocument(value);

  if (!isObject(normalized)) {
    return normalized;
  }

  const sanitized: Record<string, unknown> = {};

  for (const [key, fieldValue] of Object.entries(normalized)) {
    if (AUDIT_FIELDS_TO_EXCLUDE.has(key)) {
      continue;
    }

    sanitized[key] = excludeAuditFieldsFromResponse(fieldValue);
  }

  return sanitized;
}

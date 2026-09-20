const STRICT_MODE_FALSE_VALUES = new Set(['0', 'false', 'off', 'no']);

export function isMongooseStrictModeEnabled(
  value = process.env.MONGOOSE_STRICT_MODE,
): boolean {
  if (typeof value !== 'string') {
    return true;
  }

  return !STRICT_MODE_FALSE_VALUES.has(value.trim().toLowerCase());
}

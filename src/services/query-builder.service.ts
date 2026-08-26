import { BadRequestException, Injectable } from '@nestjs/common';
import type { FormModelDefinition } from '../form-model.registry';

type Primitive = string | number | boolean | null;
type MongoFilter = Record<string, unknown>;
export type SearchOperator =
  | 'equals'
  | 'notEquals'
  | 'contains'
  | 'notContains'
  | 'startsWith'
  | 'endsWith'
  | 'isEmpty'
  | 'isNotEmpty'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'before'
  | 'after'
  | 'beforeOrEqual'
  | 'afterOrEqual'
  | 'between'
  | 'in'
  | 'notIn';

export type SearchCondition = {
  operator: SearchOperator;
  value: unknown;
};

export type SearchConditionMap = Record<string, SearchCondition>;

export type SearchQuery = {
  filters: SearchConditionMap;
  quick: SearchConditionMap;
};

const SUPPORTED_SEARCH_OPERATORS: SearchOperator[] = [
  'equals',
  'notEquals',
  'contains',
  'notContains',
  'startsWith',
  'endsWith',
  'isEmpty',
  'isNotEmpty',
  'gt',
  'gte',
  'lt',
  'lte',
  'before',
  'after',
  'beforeOrEqual',
  'afterOrEqual',
  'between',
  'in',
  'notIn',
];

function normalizeSearchOperator(rawOperator: string): SearchOperator | null {
  const trimmed = rawOperator.trim();
  if (SUPPORTED_SEARCH_OPERATORS.includes(trimmed as SearchOperator)) {
    return trimmed as SearchOperator;
  }

  const lowercaseOperator = trimmed.toLowerCase();
  if (lowercaseOperator === 'eq') {
    return 'equals';
  }

  const normalized = SUPPORTED_SEARCH_OPERATORS.find(
    (item) => item.toLowerCase() === lowercaseOperator,
  );

  return normalized ?? null;
}

function coercePrimitive(raw: string): Primitive {
  const trimmed = raw.trim();
  if (trimmed === '') return '';
  if (trimmed === 'null') return null;
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  const asNumber = Number(trimmed);
  if (!Number.isNaN(asNumber) && `${asNumber}` === trimmed) return asNumber;
  return trimmed;
}

@Injectable()
export class QueryBuilderService {
  buildFilter(
    definition: FormModelDefinition,
    query: Record<string, string | string[] | undefined>,
  ): MongoFilter {
    const filter: MongoFilter = {};

    for (const [key, rawValue] of Object.entries(query)) {
      if (key === 'search' || key === 'include') {
        continue;
      }

      if (rawValue === undefined) {
        continue;
      }

      if (Array.isArray(rawValue)) {
        filter[key] = { $in: rawValue.map((value) => coercePrimitive(value)) };
      } else {
        filter[key] = coercePrimitive(rawValue);
      }
    }

    const rawSearch = query.search;
    const search = Array.isArray(rawSearch) ? rawSearch[0] : rawSearch;

    if (search && typeof search === 'string' && search.trim() !== '') {
      const parsedSearch = this.parseSearch(search);
      Object.assign(filter, parsedSearch.filters);
    }

    return filter;
  }

  parseSearch(search: unknown): SearchQuery {
    if (search === undefined || search === null) {
      return { filters: {}, quick: {} };
    }
    if (typeof search !== 'string') {
      throw new BadRequestException('search must be a string');
    }

    const trimmed = search.trim();
    if (trimmed === '') {
      return { filters: {}, quick: {} };
    }

    if (!trimmed.startsWith('{')) {
      throw new BadRequestException(
        'search must be a valid JSON object string',
      );
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed) as unknown;
    } catch {
      throw new BadRequestException('Invalid search JSON');
    }

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new BadRequestException('search JSON must be an object');
    }

    const parsedObject = parsed as Record<string, unknown>;
    const quickRaw = parsedObject.quick;

    if (
      quickRaw !== undefined &&
      (!quickRaw || typeof quickRaw !== 'object' || Array.isArray(quickRaw))
    ) {
      throw new BadRequestException('search.quick must be an object');
    }

    const result: SearchQuery = {
      filters: this.parseConditionsMap(parsedObject, 'search', ['quick']),
      quick:
        quickRaw === undefined
          ? {}
          : this.parseConditionsMap(
              quickRaw as Record<string, unknown>,
              'search.quick',
            ),
    };

    return result;
  }

  private parseConditionsMap(
    source: Record<string, unknown>,
    pathPrefix: string,
    ignoredFields: string[] = [],
  ): SearchConditionMap {
    const ignoredFieldSet = new Set(ignoredFields);
    const result: SearchConditionMap = {};

    for (const [fieldName, rawCondition] of Object.entries(source)) {
      if (ignoredFieldSet.has(fieldName)) {
        continue;
      }

      if (
        !rawCondition ||
        typeof rawCondition !== 'object' ||
        Array.isArray(rawCondition)
      ) {
        throw new BadRequestException(
          `${pathPrefix}.${fieldName} must be an object with operator and value`,
        );
      }

      const condition = rawCondition as Record<string, unknown>;
      const operatorRaw = condition.operator;
      const value = condition.value;

      if (typeof operatorRaw !== 'string' || operatorRaw.trim() === '') {
        throw new BadRequestException(
          `${pathPrefix}.${fieldName}.operator must be a non-empty string`,
        );
      }

      const operator = normalizeSearchOperator(operatorRaw);
      if (!operator) {
        throw new BadRequestException(
          `${pathPrefix}.${fieldName}.operator "${operatorRaw}" is not supported`,
        );
      }

      result[fieldName] = {
        operator,
        value,
      };
    }

    return result;
  }
}

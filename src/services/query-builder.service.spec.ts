import { QueryBuilderService } from './query-builder.service';

describe('QueryBuilderService', () => {
  const svc = new QueryBuilderService();

  it('returns empty filter for empty search', () => {
    expect(svc.parseSearch(undefined)).toEqual({ filters: {}, quick: {} });
    expect(svc.parseSearch('')).toEqual({ filters: {}, quick: {} });
    expect(svc.parseSearch('   ')).toEqual({ filters: {}, quick: {} });
  });

  it('parses operator-based search object', () => {
    expect(
      svc.parseSearch(
        '{"status":{"operator":"equals","value":"active"},"count":{"operator":"gte","value":2}}',
      ),
    ).toEqual({
      filters: {
        status: {
          operator: 'equals',
          value: 'active',
        },
        count: {
          operator: 'gte',
          value: 2,
        },
      },
      quick: {},
    });
  });

  it('parses quick search object separately from root filters', () => {
    expect(
      svc.parseSearch(
        '{"quick":{"customer":{"operator":"contains","value":"test"},"discountCode":{"operator":"contains","value":"test"}},"status":{"operator":"in","value":["6a63cde5571a529c214a48b1"]}}',
      ),
    ).toEqual({
      filters: {
        status: {
          operator: 'in',
          value: ['6a63cde5571a529c214a48b1'],
        },
      },
      quick: {
        customer: {
          operator: 'contains',
          value: 'test',
        },
        discountCode: {
          operator: 'contains',
          value: 'test',
        },
      },
    });
  });

  it('rejects legacy kv search syntax', () => {
    expect(() => svc.parseSearch('status:active,count:2')).toThrow(
      'search must be a valid JSON object string',
    );
  });
});

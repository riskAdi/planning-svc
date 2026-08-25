import { QueryBuilderService } from './query-builder.service';

describe('QueryBuilderService', () => {
  const svc = new QueryBuilderService();

  it('returns empty filter for empty search', () => {
    expect(svc.parseSearch(undefined)).toEqual({});
    expect(svc.parseSearch('')).toEqual({});
    expect(svc.parseSearch('   ')).toEqual({});
  });

  it('parses operator-based search object', () => {
    expect(
      svc.parseSearch(
        '{"status":{"operator":"equals","value":"active"},"count":{"operator":"gte","value":2}}',
      ),
    ).toEqual({
      status: {
        operator: 'equals',
        value: 'active',
      },
      count: {
        operator: 'gte',
        value: 2,
      },
    });
  });

  it('rejects legacy kv search syntax', () => {
    expect(() => svc.parseSearch('status:active,count:2')).toThrow(
      'search must be a valid JSON object string',
    );
  });
});

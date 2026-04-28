import { QueryBuilderService } from './query-builder.service';

describe('QueryBuilderService', () => {
  const svc = new QueryBuilderService();

  it('returns empty filter for empty search', () => {
    expect(svc.parseSearch(undefined)).toEqual({});
    expect(svc.parseSearch('')).toEqual({});
    expect(svc.parseSearch('   ')).toEqual({});
  });

  it('parses JSON object search', () => {
    expect(svc.parseSearch('{"status":"active","count":2}')).toEqual({
      status: 'active',
      count: 2,
    });
  });

  it('parses kv search', () => {
    expect(
      svc.parseSearch('status:active,count:2,flag:true,none:null'),
    ).toEqual({
      status: 'active',
      count: 2,
      flag: true,
      none: null,
    });
  });
});

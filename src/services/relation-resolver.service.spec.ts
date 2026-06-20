import mongoose from 'mongoose';

import { RelationResolverService } from './relation-resolver.service';

/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access */
describe('RelationResolverService', () => {
  const svc = new RelationResolverService();

  const schema = new mongoose.Schema({
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customers' },
    items: [{ type: mongoose.Schema.Types.ObjectId, ref: 'OrderProducts' }],
    name: String,
  });

  const model = { schema } as any;

  it('parses include as comma-separated list', () => {
    expect(svc.parseInclude('customer,items')).toEqual(['customer', 'items']);
    expect(svc.parseInclude(' customer , items ,customer ')).toEqual([
      'customer',
      'items',
    ]);
  });

  it('parses include as JSON array', () => {
    expect(svc.parseInclude('["customer","items"]')).toEqual([
      'customer',
      'items',
    ]);
  });

  it('validates includes against schema refs', () => {
    expect(() =>
      svc.validateIncludesOrThrow(model, ['customer']),
    ).not.toThrow();
    expect(() => svc.validateIncludesOrThrow(model, ['items'])).not.toThrow();
    expect(() => svc.validateIncludesOrThrow(model, ['name'])).toThrow();
    expect(() => svc.validateIncludesOrThrow(model, ['missing'])).toThrow();
  });

  it('applies populate calls for valid includes', () => {
    const query = { populate: jest.fn() } as any;
    svc.applyPopulate(query, model, 'customer,items');
    expect(query.populate).toHaveBeenCalledWith('customer');
    expect(query.populate).toHaveBeenCalledWith('items');
  });
});

import { FormQueryService } from './form-query.service';
import { Types } from 'mongoose';

describe('FormQueryService', () => {
  it('transforms _id to string id while preserving Date values', async () => {
    const objectId = new Types.ObjectId('6a36e9d7865d1c0de3ec2ee7');
    const nestedObjectId = new Types.ObjectId('6a36e9d7865d1c0de3ec2ee5');
    const createdAt = new Date('2026-06-20T19:28:23.753Z');

    const exec = jest.fn().mockResolvedValue([
      {
        _id: objectId,
        firstName: 'First Name',
        createdAt,
        patient: {
          _id: nestedObjectId,
          admission_date: new Date('2021-09-27T19:00:00.000Z'),
        },
      },
    ]);
    const lean = jest.fn().mockReturnValue({ exec });
    const limit = jest.fn().mockReturnValue({ lean });
    const skip = jest.fn().mockReturnValue({ limit });
    const query = {
      skip,
      limit,
      lean,
      populate: jest.fn(),
    };

    const model = {
      find: jest.fn().mockReturnValue(query),
      countDocuments: jest
        .fn()
        .mockReturnValue({ exec: jest.fn().mockResolvedValue(1) }),
      schema: { eachPath: jest.fn() },
    };

    const service = new FormQueryService(
      { resolveModel: jest.fn().mockReturnValue(model) } as never,
      { parseSearch: jest.fn().mockReturnValue({}) } as never,
      {
        resolveIncludePaths: jest.fn().mockReturnValue([]),
        applyPopulate: jest.fn(),
      } as never,
    );

    const result = await service.find('nurse', undefined, undefined);

    expect(result.data).toEqual([
      {
        id: '6a36e9d7865d1c0de3ec2ee7',
        firstName: 'First Name',
        patient: {
          id: '6a36e9d7865d1c0de3ec2ee5',
          admission_date: '2021-09-27T19:00:00.000Z',
        },
      },
    ]);
  });

  it('returns paginated results with metadata', async () => {
    const exec = jest.fn().mockResolvedValue([{ _id: 'n1' }]);
    const lean = jest.fn().mockReturnValue({ exec });
    const limit = jest.fn().mockReturnValue({ lean });
    const skip = jest.fn().mockReturnValue({ limit });
    const query = {
      skip,
      limit,
      lean,
      populate: jest.fn(),
    };

    const countExec = jest.fn().mockResolvedValue(11);
    const nurseModel = {
      find: jest.fn().mockReturnValue(query),
      countDocuments: jest.fn().mockReturnValue({ exec: countExec }),
      schema: { eachPath: jest.fn() },
    };

    const registry = {
      resolveModel: jest.fn().mockReturnValue(nurseModel),
    };

    const queryBuilder = {
      parseSearch: jest.fn().mockReturnValue({
        gender: {
          operator: 'contains',
          value: 'male',
        },
      }),
    };

    const relations = {
      resolveIncludePaths: jest.fn().mockReturnValue(['patient', 'hospitals']),
      applyPopulate: jest.fn(),
    };

    const service = new FormQueryService(
      registry as never,
      queryBuilder as never,
      relations as never,
    );

    const result = await service.find(
      'nurse',
      '{"gender":"male"}',
      'patient,hospitals',
      2,
      5,
    );

    expect(skip).toHaveBeenCalledWith(5);
    expect(limit).toHaveBeenCalledWith(5);
    expect(nurseModel.countDocuments).toHaveBeenCalledWith({
      gender: {
        $regex: 'male',
        $options: 'i',
      },
    });
    expect(result).toEqual({
      data: [{ id: 'n1' }],
      meta: {
        formName: 'nurse',
        page: 2,
        limit: 5,
        total: 11,
        totalPages: 3,
        include: ['patient', 'hospitals'],
      },
    });
  });

  it('applies sorter when field is valid and role can read it', async () => {
    const exec = jest.fn().mockResolvedValue([{ _id: 'p1', name: 'Alpha' }]);
    const lean = jest.fn().mockReturnValue({ exec });
    const limit = jest.fn().mockReturnValue({ lean });
    const skip = jest.fn().mockReturnValue({ limit });
    const sort = jest.fn().mockReturnValue({ skip, limit, lean });
    const query = {
      sort,
      skip,
      limit,
      lean,
      populate: jest.fn(),
    };

    const productsModel = {
      find: jest.fn().mockReturnValue(query),
      countDocuments: jest
        .fn()
        .mockReturnValue({ exec: jest.fn().mockResolvedValue(1) }),
      schema: {
        paths: {
          _id: {},
          name: {},
        },
        eachPath: jest.fn(),
        formPermissions: {
          form: { read: ['nurse'] },
          fields: {
            name: { read: ['nurse'] },
          },
        },
      },
    };

    const service = new FormQueryService(
      { resolveModel: jest.fn().mockReturnValue(productsModel) } as never,
      { parseSearch: jest.fn().mockReturnValue({}) } as never,
      {
        resolveIncludePaths: jest.fn().mockReturnValue([]),
        applyPopulate: jest.fn(),
      } as never,
    );

    const result = await service.find(
      'products',
      undefined,
      undefined,
      1,
      20,
      'nurse',
      { field: 'name', order: 'ascend' },
    );

    expect(sort).toHaveBeenCalledWith({ name: 1 });
    expect(result.data).toEqual([{ id: 'p1', name: 'Alpha' }]);
  });

  it('throws bad request when sorter field is not in schema', async () => {
    const exec = jest.fn().mockResolvedValue([]);
    const lean = jest.fn().mockReturnValue({ exec });
    const limit = jest.fn().mockReturnValue({ lean });
    const skip = jest.fn().mockReturnValue({ limit });
    const sort = jest.fn().mockReturnValue({ skip, limit, lean });
    const query = {
      sort,
      skip,
      limit,
      lean,
      populate: jest.fn(),
    };

    const productsModel = {
      find: jest.fn().mockReturnValue(query),
      countDocuments: jest
        .fn()
        .mockReturnValue({ exec: jest.fn().mockResolvedValue(0) }),
      schema: {
        paths: {
          _id: {},
          name: {},
        },
        eachPath: jest.fn(),
        formPermissions: {
          form: { read: ['nurse'] },
        },
      },
    };

    const service = new FormQueryService(
      { resolveModel: jest.fn().mockReturnValue(productsModel) } as never,
      { parseSearch: jest.fn().mockReturnValue({}) } as never,
      {
        resolveIncludePaths: jest.fn().mockReturnValue([]),
        applyPopulate: jest.fn(),
      } as never,
    );

    await expect(
      service.find('products', undefined, undefined, 1, 20, 'nurse', {
        field: 'unknownField',
        order: 'ascend',
      }),
    ).rejects.toThrow('sorter.field "unknownField" is not a valid field');

    expect(sort).not.toHaveBeenCalled();
  });

  it('throws forbidden when role cannot sort by restricted field', async () => {
    const exec = jest.fn().mockResolvedValue([]);
    const lean = jest.fn().mockReturnValue({ exec });
    const limit = jest.fn().mockReturnValue({ lean });
    const skip = jest.fn().mockReturnValue({ limit });
    const sort = jest.fn().mockReturnValue({ skip, limit, lean });
    const query = {
      sort,
      skip,
      limit,
      lean,
      populate: jest.fn(),
    };

    const productsModel = {
      find: jest.fn().mockReturnValue(query),
      countDocuments: jest
        .fn()
        .mockReturnValue({ exec: jest.fn().mockResolvedValue(0) }),
      schema: {
        paths: {
          _id: {},
          costPrice: {},
        },
        eachPath: jest.fn(),
        formPermissions: {
          form: { read: ['nurse', 'patient'] },
          fields: {
            costPrice: { read: ['nurse'] },
          },
        },
      },
    };

    const service = new FormQueryService(
      { resolveModel: jest.fn().mockReturnValue(productsModel) } as never,
      { parseSearch: jest.fn().mockReturnValue({}) } as never,
      {
        resolveIncludePaths: jest.fn().mockReturnValue([]),
        applyPopulate: jest.fn(),
      } as never,
    );

    await expect(
      service.find('products', undefined, undefined, 1, 20, 'patient', {
        field: 'costPrice',
        order: 'ascend',
      }),
    ).rejects.toThrow('is not authorized to sort by field "costPrice"');

    expect(sort).not.toHaveBeenCalled();
  });

  it('defaults to all relations when include is omitted', async () => {
    const exec = jest.fn().mockResolvedValue([{ _id: 'd1' }]);
    const lean = jest.fn().mockReturnValue({ exec });
    const limit = jest.fn().mockReturnValue({ lean });
    const skip = jest.fn().mockReturnValue({ limit });
    const query = {
      skip,
      limit,
      lean,
      populate: jest.fn(),
    };

    const doctorsModel = {
      find: jest.fn().mockReturnValue(query),
      countDocuments: jest
        .fn()
        .mockReturnValue({ exec: jest.fn().mockResolvedValue(1) }),
      schema: { eachPath: jest.fn() },
    };

    const registry = {
      resolveModel: jest.fn().mockReturnValue(doctorsModel),
    };

    const relations = {
      resolveIncludePaths: jest.fn().mockReturnValue(['hospital', 'nurse']),
      applyPopulate: jest.fn(),
    };

    const service = new FormQueryService(
      registry as never,
      { parseSearch: jest.fn().mockReturnValue({}) } as never,
      relations as never,
    );

    const result = await service.find('doctors', undefined, undefined);

    expect(relations.resolveIncludePaths).toHaveBeenCalledWith(
      doctorsModel,
      undefined,
    );
    expect(result.data).toEqual([{ id: 'd1' }]);
    expect(result.meta.include).toEqual(['hospital', 'nurse']);
  });

  it('uses only schema-defined keys with contains operator', async () => {
    const exec = jest.fn().mockResolvedValue([]);
    const lean = jest.fn().mockReturnValue({ exec });
    const limit = jest.fn().mockReturnValue({ lean });
    const skip = jest.fn().mockReturnValue({ limit });
    const query = {
      skip,
      limit,
      lean,
      populate: jest.fn(),
    };

    const doctorsModel = {
      find: jest.fn().mockReturnValue(query),
      countDocuments: jest
        .fn()
        .mockReturnValue({ exec: jest.fn().mockResolvedValue(0) }),
      schema: {
        paths: {
          _id: {},
          first_name: {},
          last_name: {},
          phone_number: {},
        },
        eachPath: jest.fn(),
      },
    };

    const service = new FormQueryService(
      { resolveModel: jest.fn().mockReturnValue(doctorsModel) } as never,
      {
        parseSearch: jest.fn().mockReturnValue({
          first_name: {
            operator: 'contains',
            value: 'sdf',
          },
          last_name: {
            operator: 'contains',
            value: 'sdf',
          },
          phone_number: {
            operator: 'contains',
            value: 'sdf',
          },
          invalid_key: {
            operator: 'contains',
            value: 'ignore-me',
          },
        }),
      } as never,
      {
        resolveIncludePaths: jest.fn().mockReturnValue([]),
        applyPopulate: jest.fn(),
      } as never,
    );

    await service.find(
      'doctors',
      '{"first_name":"sdf","last_name":"sdf","phone_number":"sdf"}',
      undefined,
    );

    expect(doctorsModel.find).toHaveBeenCalledWith({
      first_name: {
        $regex: 'sdf',
        $options: 'i',
      },
      last_name: {
        $regex: 'sdf',
        $options: 'i',
      },
      phone_number: {
        $regex: 'sdf',
        $options: 'i',
      },
    });
    expect(doctorsModel.countDocuments).toHaveBeenCalledWith({
      first_name: {
        $regex: 'sdf',
        $options: 'i',
      },
      last_name: {
        $regex: 'sdf',
        $options: 'i',
      },
      phone_number: {
        $regex: 'sdf',
        $options: 'i',
      },
    });
  });

  it('treats special characters as literal in contains search', async () => {
    const exec = jest.fn().mockResolvedValue([]);
    const lean = jest.fn().mockReturnValue({ exec });
    const limit = jest.fn().mockReturnValue({ lean });
    const skip = jest.fn().mockReturnValue({ limit });
    const query = {
      skip,
      limit,
      lean,
      populate: jest.fn(),
    };

    const doctorsModel = {
      find: jest.fn().mockReturnValue(query),
      countDocuments: jest
        .fn()
        .mockReturnValue({ exec: jest.fn().mockResolvedValue(0) }),
      schema: {
        paths: {
          first_name: {},
        },
        eachPath: jest.fn(),
      },
    };

    const service = new FormQueryService(
      { resolveModel: jest.fn().mockReturnValue(doctorsModel) } as never,
      {
        parseSearch: jest.fn().mockReturnValue({
          first_name: {
            operator: 'contains',
            value: 'El*in',
          },
        }),
      } as never,
      {
        resolveIncludePaths: jest.fn().mockReturnValue([]),
        applyPopulate: jest.fn(),
      } as never,
    );

    await service.find('doctors', '{"first_name":"El*in"}', undefined);

    expect(doctorsModel.find).toHaveBeenCalledWith({
      first_name: {
        $regex: 'El\\*in',
        $options: 'i',
      },
    });
  });

  it('applies date array search as between filter for date fields', async () => {
    const exec = jest.fn().mockResolvedValue([]);
    const lean = jest.fn().mockReturnValue({ exec });
    const limit = jest.fn().mockReturnValue({ lean });
    const skip = jest.fn().mockReturnValue({ limit });
    const query = {
      skip,
      limit,
      lean,
      populate: jest.fn(),
    };

    const ordersModel = {
      find: jest.fn().mockReturnValue(query),
      countDocuments: jest
        .fn()
        .mockReturnValue({ exec: jest.fn().mockResolvedValue(0) }),
      schema: {
        paths: {
          createdAt: { instance: 'Date' },
        },
        eachPath: jest.fn(),
      },
    };

    const start = '2026-07-01 00:00';
    const end = '2026-07-31 00:00';

    const service = new FormQueryService(
      { resolveModel: jest.fn().mockReturnValue(ordersModel) } as never,
      {
        parseSearch: jest.fn().mockReturnValue({
          createdAt: {
            operator: 'between',
            value: [start, end],
          },
        }),
      } as never,
      {
        resolveIncludePaths: jest.fn().mockReturnValue([]),
        applyPopulate: jest.fn(),
      } as never,
    );

    await service.find(
      'orders',
      `{"createdAt":["${start}","${end}"]}`,
      undefined,
    );

    expect(ordersModel.find).toHaveBeenCalledWith({
      createdAt: {
        $gte: new Date(start),
        $lte: new Date(end),
      },
    });
    expect(ordersModel.countDocuments).toHaveBeenCalledWith({
      createdAt: {
        $gte: new Date(start),
        $lte: new Date(end),
      },
    });
  });

  it('rejects between operator for string fields', async () => {
    const exec = jest.fn().mockResolvedValue([]);
    const lean = jest.fn().mockReturnValue({ exec });
    const limit = jest.fn().mockReturnValue({ lean });
    const skip = jest.fn().mockReturnValue({ limit });
    const query = {
      skip,
      limit,
      lean,
      populate: jest.fn(),
    };

    const ordersModel = {
      find: jest.fn().mockReturnValue(query),
      countDocuments: jest
        .fn()
        .mockReturnValue({ exec: jest.fn().mockResolvedValue(0) }),
      schema: {
        paths: {
          deliveryWindow: { instance: 'String' },
        },
        eachPath: jest.fn(),
      },
    };

    const start = '2026-07-01 00:00';
    const end = '2026-07-31 00:00';

    const service = new FormQueryService(
      { resolveModel: jest.fn().mockReturnValue(ordersModel) } as never,
      {
        parseSearch: jest.fn().mockReturnValue({
          deliveryWindow: {
            operator: 'between',
            value: [start, end],
          },
        }),
      } as never,
      {
        resolveIncludePaths: jest.fn().mockReturnValue([]),
        applyPopulate: jest.fn(),
      } as never,
    );

    await expect(
      service.find(
        'orders',
        `{"deliveryWindow":["${start}","${end}"]}`,
        undefined,
      ),
    ).rejects.toThrow(
      'search.deliveryWindow.operator "between" is not supported for string fields',
    );
  });

  it('applies operator-based filters as direct mongo clauses', async () => {
    const exec = jest.fn().mockResolvedValue([]);
    const lean = jest.fn().mockReturnValue({ exec });
    const limit = jest.fn().mockReturnValue({ lean });
    const skip = jest.fn().mockReturnValue({ limit });
    const query = {
      skip,
      limit,
      lean,
      populate: jest.fn(),
    };

    const ordersModel = {
      find: jest.fn().mockReturnValue(query),
      countDocuments: jest
        .fn()
        .mockReturnValue({ exec: jest.fn().mockResolvedValue(0) }),
      schema: {
        paths: {
          orderId: {},
          customerName: {},
        },
        eachPath: jest.fn(),
      },
    };

    const service = new FormQueryService(
      { resolveModel: jest.fn().mockReturnValue(ordersModel) } as never,
      {
        parseSearch: jest.fn().mockReturnValue({
          orderId: {
            operator: 'in',
            value: ['ORD-1001', 'ORD-1002'],
          },
          customerName: {
            operator: 'contains',
            value: 'john',
          },
          invalid_key: {
            operator: 'equals',
            value: true,
          },
        }),
      } as never,
      {
        resolveIncludePaths: jest.fn().mockReturnValue([]),
        applyPopulate: jest.fn(),
      } as never,
    );

    await service.find('orders', undefined, undefined);

    expect(ordersModel.find).toHaveBeenCalledWith({
      orderId: { $in: ['ORD-1001', 'ORD-1002'] },
      customerName: {
        $regex: 'john',
        $options: 'i',
      },
    });
    expect(ordersModel.countDocuments).toHaveBeenCalledWith({
      orderId: { $in: ['ORD-1001', 'ORD-1002'] },
      customerName: {
        $regex: 'john',
        $options: 'i',
      },
    });
  });

  it('returns audit for a specific parent record id', async () => {
    const exec = jest.fn().mockResolvedValue({
      _id: new Types.ObjectId('6a36e9d7865d1c0de3ec2ee7'),
      audit: [
        { changedAt: new Date('2026-08-08T00:00:00.000Z') },
        { changedAt: new Date('2026-08-09T00:00:00.000Z') },
      ],
    });
    const lean = jest.fn().mockReturnValue({ exec });
    const select = jest.fn().mockReturnValue({ lean });

    const ordersModel = {
      findOne: jest.fn().mockReturnValue({ select, lean }),
      schema: {
        eachPath: jest.fn(),
      },
    };

    const service = new FormQueryService(
      { resolveModel: jest.fn().mockReturnValue(ordersModel) } as never,
      { parseSearch: jest.fn() } as never,
      {
        resolveIncludePaths: jest.fn().mockReturnValue([]),
        applyPopulate: jest.fn(),
      } as never,
    );

    const result = await service.findAuditById('orders', 'order-1');

    expect(ordersModel.findOne).toHaveBeenCalledWith({
      _id: 'order-1',
      $or: [{ parent_id: { $exists: false } }, { parent_id: null }],
    });
    expect(select).toHaveBeenCalledWith('audit');
    expect(result).toEqual({
      id: '6a36e9d7865d1c0de3ec2ee7',
      audit: [
        { changedAt: '2026-08-09T00:00:00.000Z' },
        { changedAt: '2026-08-08T00:00:00.000Z' },
      ],
    });
  });

  it('returns stored changedFields values without resolving relations', async () => {
    const fromStatusId = '6a63cde5571a529c214a48ad';
    const toStatusId = '6a63cde5571a529c214a48af';

    const auditExec = jest.fn().mockResolvedValue({
      _id: new Types.ObjectId('6a63b2aae93bdf502531c928'),
      audit: [
        {
          changedAt: new Date('2026-08-08T11:31:02.952Z'),
          actorRole: 'system-afterSave',
          changedFields: [
            {
              path: 'status',
              from: fromStatusId,
              to: toStatusId,
              relationName: 'OrderStatus',
              _id: new Types.ObjectId('6a77137697ae50a36c6b7748'),
            },
          ],
          _id: new Types.ObjectId('6a77137697ae50a36c6b7747'),
        },
      ],
    });
    const auditLean = jest.fn().mockReturnValue({ exec: auditExec });
    const auditSelect = jest.fn().mockReturnValue({ lean: auditLean });

    const ordersModel = {
      findOne: jest
        .fn()
        .mockReturnValue({ select: auditSelect, lean: auditLean }),
      schema: {
        eachPath: jest.fn(),
      },
    };

    const registry = {
      resolveModel: jest.fn((modelName: string) => {
        if (modelName === 'orders') {
          return ordersModel;
        }

        throw new Error(`Unexpected model lookup for ${modelName}`);
      }),
    };

    const service = new FormQueryService(
      registry as never,
      { parseSearch: jest.fn() } as never,
      {
        resolveIncludePaths: jest.fn().mockReturnValue([]),
        applyPopulate: jest.fn(),
      } as never,
    );

    const result = await service.findAuditById(
      'orders',
      '6a63b2aae93bdf502531c928',
    );

    expect(registry.resolveModel).toHaveBeenCalledWith('orders');
    expect(registry.resolveModel).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      id: '6a63b2aae93bdf502531c928',
      audit: [
        {
          changedAt: '2026-08-08T11:31:02.952Z',
          actorRole: 'system-afterSave',
          changedFields: [
            {
              path: 'status',
              from: fromStatusId,
              to: toStatusId,
              relationName: 'OrderStatus',
              id: '6a77137697ae50a36c6b7748',
            },
          ],
          id: '6a77137697ae50a36c6b7747',
        },
      ],
    });
  });

  it('keeps ObjectId schema fields as exact match for string search values', async () => {
    const exec = jest.fn().mockResolvedValue([]);
    const lean = jest.fn().mockReturnValue({ exec });
    const limit = jest.fn().mockReturnValue({ lean });
    const skip = jest.fn().mockReturnValue({ limit });
    const query = {
      skip,
      limit,
      lean,
      populate: jest.fn(),
    };

    const orderStatusHistoryModel = {
      find: jest.fn().mockReturnValue(query),
      countDocuments: jest
        .fn()
        .mockReturnValue({ exec: jest.fn().mockResolvedValue(0) }),
      schema: {
        paths: {
          order: { instance: 'ObjectId' },
        },
        eachPath: jest.fn(),
      },
    };

    const service = new FormQueryService(
      {
        resolveModel: jest.fn().mockReturnValue(orderStatusHistoryModel),
      } as never,
      {
        parseSearch: jest.fn().mockReturnValue({
          order: {
            operator: 'equals',
            value: '6a63b2aae93bdf502531c928',
          },
        }),
      } as never,
      {
        resolveIncludePaths: jest.fn().mockReturnValue([]),
        applyPopulate: jest.fn(),
      } as never,
    );

    await service.find(
      'orderStatusHistory',
      '{"order":"6a63b2aae93bdf502531c928"}',
      undefined,
    );

    const expectedOrderId = '6a63b2aae93bdf502531c928';
    const findCalls = orderStatusHistoryModel.find.mock.calls as unknown[][];
    const countCalls = orderStatusHistoryModel.countDocuments.mock
      .calls as unknown[][];

    const findFilter = (findCalls[0]?.[0] ?? {}) as Record<string, unknown>;
    const countFilter = (countCalls[0]?.[0] ?? {}) as Record<string, unknown>;

    expect(findFilter.order).toBeInstanceOf(Types.ObjectId);
    expect(countFilter.order).toBeInstanceOf(Types.ObjectId);
    expect((findFilter.order as Types.ObjectId).toHexString()).toBe(
      expectedOrderId,
    );
    expect((countFilter.order as Types.ObjectId).toHexString()).toBe(
      expectedOrderId,
    );
  });

  it('resolves relation ObjectId search text to matching related ids', async () => {
    const exec = jest.fn().mockResolvedValue([]);
    const lean = jest.fn().mockReturnValue({ exec });
    const limit = jest.fn().mockReturnValue({ lean });
    const skip = jest.fn().mockReturnValue({ limit });
    const query = {
      skip,
      limit,
      lean,
      populate: jest.fn(),
    };

    const ordersModel = {
      find: jest.fn().mockReturnValue(query),
      countDocuments: jest
        .fn()
        .mockReturnValue({ exec: jest.fn().mockResolvedValue(0) }),
      schema: {
        paths: {
          customer: { instance: 'ObjectId' },
        },
        eachPath: (
          callback: (pathName: string, schemaType: unknown) => void,
        ) => {
          callback('customer', {
            options: { ref: 'Customers' },
          });
        },
      },
    };

    const customersFindExec = jest.fn().mockResolvedValue([{ _id: 'c1' }]);
    const customersFindLean = jest
      .fn()
      .mockReturnValue({ exec: customersFindExec });
    const customersFindLimit = jest
      .fn()
      .mockReturnValue({ lean: customersFindLean });
    const customersFindSelect = jest
      .fn()
      .mockReturnValue({ limit: customersFindLimit });
    const customersModel = {
      schema: {
        paths: {
          firstName: { instance: 'String' },
          lastName: { instance: 'String' },
        },
      },
      find: jest.fn().mockReturnValue({ select: customersFindSelect }),
    };

    const registry = {
      resolveModel: jest.fn((modelName: string) => {
        if (modelName === 'orders') return ordersModel;
        if (modelName === 'Customers') return customersModel;
        throw new Error(`Unexpected model lookup for ${modelName}`);
      }),
    };

    const service = new FormQueryService(
      registry as never,
      {
        parseSearch: jest.fn().mockReturnValue({
          customer: {
            operator: 'contains',
            value: 'dd',
          },
        }),
      } as never,
      {
        resolveIncludePaths: jest.fn().mockReturnValue([]),
        applyPopulate: jest.fn(),
      } as never,
    );

    await service.find('orders', '{"customer":"dd"}', undefined);

    expect(customersModel.find).toHaveBeenCalledWith({
      $or: [
        {
          firstName: {
            $regex: 'dd',
            $options: 'i',
          },
        },
        {
          lastName: {
            $regex: 'dd',
            $options: 'i',
          },
        },
      ],
    });
    expect(ordersModel.find).toHaveBeenCalledWith({
      customer: { $in: ['c1'] },
    });
    expect(ordersModel.countDocuments).toHaveBeenCalledWith({
      customer: { $in: ['c1'] },
    });
  });

  it('combines relation contains and string contains as AND clauses', async () => {
    const exec = jest.fn().mockResolvedValue([]);
    const lean = jest.fn().mockReturnValue({ exec });
    const limit = jest.fn().mockReturnValue({ lean });
    const skip = jest.fn().mockReturnValue({ limit });
    const query = {
      skip,
      limit,
      lean,
      populate: jest.fn(),
    };

    const ordersModel = {
      find: jest.fn().mockReturnValue(query),
      countDocuments: jest
        .fn()
        .mockReturnValue({ exec: jest.fn().mockResolvedValue(0) }),
      schema: {
        paths: {
          customer: { instance: 'ObjectId' },
          discountCode: { instance: 'String' },
        },
        eachPath: (
          callback: (pathName: string, schemaType: unknown) => void,
        ) => {
          callback('customer', {
            options: { ref: 'Customers' },
          });
        },
      },
    };

    const customersFindExec = jest.fn().mockResolvedValue([]);
    const customersFindLean = jest
      .fn()
      .mockReturnValue({ exec: customersFindExec });
    const customersFindLimit = jest
      .fn()
      .mockReturnValue({ lean: customersFindLean });
    const customersFindSelect = jest
      .fn()
      .mockReturnValue({ limit: customersFindLimit });
    const customersModel = {
      schema: {
        paths: {
          firstName: { instance: 'String' },
          lastName: { instance: 'String' },
        },
      },
      find: jest.fn().mockReturnValue({ select: customersFindSelect }),
    };

    const registry = {
      resolveModel: jest.fn((modelName: string) => {
        if (modelName === 'orders') return ordersModel;
        if (modelName === 'Customers') return customersModel;
        throw new Error(`Unexpected model lookup for ${modelName}`);
      }),
    };

    const service = new FormQueryService(
      registry as never,
      {
        parseSearch: jest.fn().mockReturnValue({
          customer: {
            operator: 'contains',
            value: '231',
          },
          discountCode: {
            operator: 'contains',
            value: '231',
          },
        }),
      } as never,
      {
        resolveIncludePaths: jest.fn().mockReturnValue([]),
        applyPopulate: jest.fn(),
      } as never,
    );

    await service.find(
      'orders',
      '{"customer":"231","discountCode":"231"}',
      undefined,
    );

    expect(ordersModel.find).toHaveBeenCalledWith({
      customer: { $in: [] },
      discountCode: {
        $regex: '231',
        $options: 'i',
      },
    });
    expect(ordersModel.countDocuments).toHaveBeenCalledWith({
      customer: { $in: [] },
      discountCode: {
        $regex: '231',
        $options: 'i',
      },
    });
  });

  it('maps relation in operator with multiple status ids into $in filter', async () => {
    const exec = jest.fn().mockResolvedValue([]);
    const lean = jest.fn().mockReturnValue({ exec });
    const limit = jest.fn().mockReturnValue({ lean });
    const skip = jest.fn().mockReturnValue({ limit });
    const query = {
      skip,
      limit,
      lean,
      populate: jest.fn(),
    };

    const ordersModel = {
      find: jest.fn().mockReturnValue(query),
      countDocuments: jest
        .fn()
        .mockReturnValue({ exec: jest.fn().mockResolvedValue(0) }),
      schema: {
        paths: {
          status: { instance: 'ObjectId' },
        },
        eachPath: (
          callback: (pathName: string, schemaType: unknown) => void,
        ) => {
          callback('status', {
            options: { ref: 'OrderStatus' },
          });
        },
      },
    };

    const registry = {
      resolveModel: jest.fn((modelName: string) => {
        if (modelName === 'orders') return ordersModel;
        throw new Error(`Unexpected model lookup for ${modelName}`);
      }),
    };

    const statusIdOne = '6a63cde5571a529c214a48ad';
    const statusIdTwo = '6a63cde5571a529c214a48b3';

    const service = new FormQueryService(
      registry as never,
      {
        parseSearch: jest.fn().mockReturnValue({
          status: {
            operator: 'in',
            value: [statusIdOne, statusIdTwo],
          },
        }),
      } as never,
      {
        resolveIncludePaths: jest.fn().mockReturnValue([]),
        applyPopulate: jest.fn(),
      } as never,
    );

    await service.find(
      'orders',
      `{"status":{"operator":"in","value":["${statusIdOne}","${statusIdTwo}"]}}`,
      undefined,
    );

    const findCalls = ordersModel.find.mock.calls as unknown[][];
    const findFilter = (findCalls[0]?.[0] ?? {}) as Record<string, unknown>;
    const statusFilter = findFilter.status as { $in?: unknown[] };
    const inValues = Array.isArray(statusFilter.$in) ? statusFilter.$in : [];

    const hasStatusOneObjectId = inValues.some(
      (value) =>
        value instanceof Types.ObjectId && value.toHexString() === statusIdOne,
    );
    const hasStatusTwoObjectId = inValues.some(
      (value) =>
        value instanceof Types.ObjectId && value.toHexString() === statusIdTwo,
    );

    expect(hasStatusOneObjectId).toBe(true);
    expect(hasStatusTwoObjectId).toBe(true);
  });

  it('keeps valid ObjectId relation search as direct match', async () => {
    const exec = jest.fn().mockResolvedValue([]);
    const lean = jest.fn().mockReturnValue({ exec });
    const limit = jest.fn().mockReturnValue({ lean });
    const skip = jest.fn().mockReturnValue({ limit });
    const query = {
      skip,
      limit,
      lean,
      populate: jest.fn(),
    };

    const ordersModel = {
      find: jest.fn().mockReturnValue(query),
      countDocuments: jest
        .fn()
        .mockReturnValue({ exec: jest.fn().mockResolvedValue(0) }),
      schema: {
        paths: {
          customer: { instance: 'ObjectId' },
        },
        eachPath: (
          callback: (pathName: string, schemaType: unknown) => void,
        ) => {
          callback('customer', {
            options: { ref: 'Customers' },
          });
        },
      },
    };

    const customersModel = {
      schema: {
        paths: {
          firstName: { instance: 'String' },
        },
      },
      find: jest.fn(),
    };

    const registry = {
      resolveModel: jest.fn((modelName: string) => {
        if (modelName === 'orders') return ordersModel;
        if (modelName === 'Customers') return customersModel;
        throw new Error(`Unexpected model lookup for ${modelName}`);
      }),
    };

    const service = new FormQueryService(
      registry as never,
      {
        parseSearch: jest.fn().mockReturnValue({
          customer: {
            operator: 'contains',
            value: '6a63b2aae93bdf502531c928',
          },
        }),
      } as never,
      {
        resolveIncludePaths: jest.fn().mockReturnValue([]),
        applyPopulate: jest.fn(),
      } as never,
    );

    await service.find(
      'orders',
      '{"customer":"6a63b2aae93bdf502531c928"}',
      undefined,
    );

    expect(customersModel.find).not.toHaveBeenCalled();
    const findCalls = ordersModel.find.mock.calls as unknown[][];
    const findFilter = (findCalls[0]?.[0] ?? {}) as Record<string, unknown>;
    expect(findFilter.customer).toBeInstanceOf(Types.ObjectId);
    expect((findFilter.customer as Types.ObjectId).toHexString()).toBe(
      '6a63b2aae93bdf502531c928',
    );
  });

  it('treats valid ObjectId search with AND when combined with text search', async () => {
    const exec = jest.fn().mockResolvedValue([]);
    const lean = jest.fn().mockReturnValue({ exec });
    const limit = jest.fn().mockReturnValue({ lean });
    const skip = jest.fn().mockReturnValue({ limit });
    const query = {
      skip,
      limit,
      lean,
      populate: jest.fn(),
    };

    const ordersModel = {
      find: jest.fn().mockReturnValue(query),
      countDocuments: jest
        .fn()
        .mockReturnValue({ exec: jest.fn().mockResolvedValue(0) }),
      schema: {
        paths: {
          customer: { instance: 'ObjectId' },
          discountCode: { instance: 'String' },
        },
        eachPath: (
          callback: (pathName: string, schemaType: unknown) => void,
        ) => {
          callback('customer', {
            options: { ref: 'Customers' },
          });
        },
      },
    };

    const customersModel = {
      schema: {
        paths: {
          firstName: { instance: 'String' },
        },
      },
      find: jest.fn(),
    };

    const registry = {
      resolveModel: jest.fn((modelName: string) => {
        if (modelName === 'orders') return ordersModel;
        if (modelName === 'Customers') return customersModel;
        throw new Error(`Unexpected model lookup for ${modelName}`);
      }),
    };

    const customerId = '6a63b2aae93bdf502531c928';
    const service = new FormQueryService(
      registry as never,
      {
        parseSearch: jest.fn().mockReturnValue({
          customer: {
            operator: 'contains',
            value: customerId,
          },
          discountCode: {
            operator: 'contains',
            value: '231',
          },
        }),
      } as never,
      {
        resolveIncludePaths: jest.fn().mockReturnValue([]),
        applyPopulate: jest.fn(),
      } as never,
    );

    await service.find(
      'orders',
      `{"customer":"${customerId}","discountCode":"231"}`,
      undefined,
    );

    expect(customersModel.find).not.toHaveBeenCalled();
    const findCalls = ordersModel.find.mock.calls as unknown[][];
    const countCalls = ordersModel.countDocuments.mock.calls as unknown[][];
    const findFilter = (findCalls[0]?.[0] ?? {}) as Record<string, unknown>;
    const countFilter = (countCalls[0]?.[0] ?? {}) as Record<string, unknown>;

    expect(findFilter.customer).toBeInstanceOf(Types.ObjectId);
    expect(countFilter.customer).toBeInstanceOf(Types.ObjectId);
    expect((findFilter.customer as Types.ObjectId).toHexString()).toBe(
      customerId,
    );
    expect((countFilter.customer as Types.ObjectId).toHexString()).toBe(
      customerId,
    );
    expect(findFilter.discountCode).toEqual({
      $regex: '231',
      $options: 'i',
    });
    expect(countFilter.discountCode).toEqual({
      $regex: '231',
      $options: 'i',
    });
  });

  it('combines quick fields with OR and root fields with AND', async () => {
    const exec = jest.fn().mockResolvedValue([]);
    const lean = jest.fn().mockReturnValue({ exec });
    const limit = jest.fn().mockReturnValue({ lean });
    const skip = jest.fn().mockReturnValue({ limit });
    const query = {
      skip,
      limit,
      lean,
      populate: jest.fn(),
    };

    const ordersModel = {
      find: jest.fn().mockReturnValue(query),
      countDocuments: jest
        .fn()
        .mockReturnValue({ exec: jest.fn().mockResolvedValue(0) }),
      schema: {
        paths: {
          customer: { instance: 'ObjectId' },
          discountCode: { instance: 'String' },
          status: { instance: 'ObjectId' },
        },
        eachPath: (
          callback: (pathName: string, schemaType: unknown) => void,
        ) => {
          callback('customer', {
            options: { ref: 'Customers' },
          });
        },
      },
    };

    const customersModel = {
      schema: {
        paths: {
          firstName: { instance: 'String' },
        },
      },
      find: jest.fn(),
    };

    const registry = {
      resolveModel: jest.fn((modelName: string) => {
        if (modelName === 'orders') return ordersModel;
        if (modelName === 'Customers') return customersModel;
        throw new Error(`Unexpected model lookup for ${modelName}`);
      }),
    };

    const statusId = '6a63cde5571a529c214a48b1';
    const service = new FormQueryService(
      registry as never,
      {
        parseSearch: jest.fn().mockReturnValue({
          filters: {
            status: {
              operator: 'in',
              value: [statusId],
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
        }),
      } as never,
      {
        resolveIncludePaths: jest.fn().mockReturnValue([]),
        applyPopulate: jest.fn(),
      } as never,
    );

    await service.find(
      'orders',
      `{"quick":{"customer":{"operator":"contains","value":"test"},"discountCode":{"operator":"contains","value":"test"}},"status":{"operator":"in","value":["${statusId}"]}}`,
      undefined,
    );

    expect(customersModel.find).toHaveBeenCalled();

    const findCalls = ordersModel.find.mock.calls as unknown[][];
    const findFilter = (findCalls[0]?.[0] ?? {}) as Record<string, unknown>;
    const andFilter = findFilter.$and as unknown[];

    expect(Array.isArray(andFilter)).toBe(true);
    expect(andFilter).toHaveLength(2);

    const quickGroup = andFilter[0] as { $or?: unknown[] };
    const rootGroup = andFilter[1] as Record<string, unknown>;

    expect(Array.isArray(quickGroup.$or)).toBe(true);
    expect(quickGroup.$or).toEqual([
      {
        customer: {
          $in: [],
        },
      },
      {
        discountCode: {
          $regex: 'test',
          $options: 'i',
        },
      },
    ]);

    const statusFilter = rootGroup.status as { $in?: unknown[] };
    const inValues = Array.isArray(statusFilter.$in) ? statusFilter.$in : [];

    expect(inValues.some((value) => value instanceof Types.ObjectId)).toBe(
      true,
    );
    expect((inValues[0] as Types.ObjectId).toHexString()).toBe(statusId);
  });

  it('creates nested subforms from schema relation fields and saves parent with references', async () => {
    const createPatient = jest.fn().mockResolvedValue({ _id: 'p1' });
    const createHospital = jest.fn().mockResolvedValue({ _id: 'h1' });
    const createNurse = jest.fn().mockResolvedValue({
      toObject: () => ({ _id: 'n1', firstName: 'First Name' }),
    });

    const nurseModel = {
      schema: {
        eachPath: (
          callback: (pathName: string, schemaType: unknown) => void,
        ) => {
          callback('patient', {
            options: { ref: 'Patients' },
          });
          callback('hospitals', {
            options: { ref: 'Hospitals' },
          });
        },
      },
      find: jest.fn(),
      create: createNurse,
    };

    const patientsModel = {
      schema: {
        eachPath: jest.fn(),
      },
      create: createPatient,
    };

    const hospitalsModel = {
      schema: {
        eachPath: jest.fn(),
      },
      create: createHospital,
    };

    const registry = {
      resolveModel: jest.fn((formName: string) => {
        if (formName === 'nurse') return nurseModel;
        if (formName === 'Patients') return patientsModel;
        if (formName === 'Hospitals') return hospitalsModel;
        throw new Error(`Unexpected model lookup for ${formName}`);
      }),
    };

    const service = new FormQueryService(
      registry as never,
      {} as never,
      {} as never,
    );

    const response = await service.create('nurse', {
      firstName: 'First Name',
      patient: {
        id: 2,
        patient_name: 'Everett Chesworth',
      },
      hospitals: {
        name: 'General Hospital',
      },
    });

    expect(createPatient).toHaveBeenCalledWith({
      patient_name: 'Everett Chesworth',
    });
    expect(createHospital).toHaveBeenCalledWith({ name: 'General Hospital' });
    expect(createNurse).toHaveBeenCalledWith({
      firstName: 'First Name',
      hospitals: 'h1',
      patient: 'p1',
    });
    expect(response).toEqual({ id: 'n1', firstName: 'First Name' });
  });

  it('creates recursive subforms for nested relation objects', async () => {
    const createPatient = jest.fn().mockResolvedValue({ _id: 'p1' });
    const createHospital = jest.fn().mockResolvedValue({ _id: 'h1' });
    const createNurse = jest.fn().mockResolvedValue({ _id: 'n1' });
    const createDoctor = jest.fn().mockResolvedValue({
      toObject: () => ({ _id: 'd1', first_name: 'Doc' }),
    });

    const doctorsModel = {
      schema: {
        eachPath: (
          callback: (pathName: string, schemaType: unknown) => void,
        ) => {
          callback('hospital', {
            options: { ref: 'Hospitals' },
          });
          callback('nurse', {
            options: { ref: 'Nurse' },
          });
        },
      },
      create: createDoctor,
    };

    const nurseModel = {
      schema: {
        eachPath: (
          callback: (pathName: string, schemaType: unknown) => void,
        ) => {
          callback('patient', {
            options: { ref: 'Patients' },
          });
        },
      },
      create: createNurse,
    };

    const patientsModel = {
      schema: {
        eachPath: jest.fn(),
      },
      create: createPatient,
    };

    const hospitalsModel = {
      schema: {
        eachPath: jest.fn(),
      },
      create: createHospital,
    };

    const registry = {
      resolveModel: jest.fn((formName: string) => {
        if (formName === 'doctors') return doctorsModel;
        if (formName === 'Hospitals') return hospitalsModel;
        if (formName === 'Nurse') return nurseModel;
        if (formName === 'Patients') return patientsModel;
        throw new Error(`Unexpected model lookup for ${formName}`);
      }),
    };

    const service = new FormQueryService(
      registry as never,
      {} as never,
      {} as never,
    );

    const response = await service.create('doctors', {
      first_name: 'Doc',
      hospital: {
        name: 'Donnelly and Sons',
      },
      nurse: {
        firstName: 'Elvin',
        patient: {
          patient_name: 'Eddy Muneely',
        },
      },
    });

    expect(createPatient).toHaveBeenCalledWith({
      patient_name: 'Eddy Muneely',
    });
    expect(createNurse).toHaveBeenCalledWith({
      firstName: 'Elvin',
      patient: 'p1',
    });
    expect(createHospital).toHaveBeenCalledWith({ name: 'Donnelly and Sons' });
    expect(createDoctor).toHaveBeenCalledWith({
      first_name: 'Doc',
      hospital: 'h1',
      nurse: 'n1',
    });
    expect(response).toEqual({ id: 'd1', first_name: 'Doc' });
  });

  it('updates parent and subforms when ids exist, creates subforms when ids are missing', async () => {
    const updatePatient = jest.fn().mockResolvedValue({ _id: 'p-updated' });
    const createHospital = jest.fn().mockResolvedValue({ _id: 'h-created' });
    const updateNurse = jest.fn().mockResolvedValue({ _id: 'n-updated' });

    const nurseModel = {
      schema: {
        eachPath: (
          callback: (pathName: string, schemaType: unknown) => void,
        ) => {
          callback('patient', {
            options: { ref: 'Patients' },
          });
          callback('hospitals', {
            options: { ref: 'Hospitals' },
          });
        },
      },
      findById: jest.fn().mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({ _id: 'nurse-id-1' }),
        }),
      }),
      findByIdAndUpdate: jest.fn().mockReturnValue({
        lean: jest.fn().mockReturnValue({ exec: updateNurse }),
      }),
    };

    const patientsModel = {
      schema: {
        eachPath: jest.fn(),
      },
      findByIdAndUpdate: jest.fn().mockReturnValue({ exec: updatePatient }),
      create: jest.fn(),
    };

    const hospitalsModel = {
      schema: {
        eachPath: jest.fn(),
      },
      findByIdAndUpdate: jest
        .fn()
        .mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
      create: createHospital,
    };

    const registry = {
      resolveModel: jest.fn((formName: string) => {
        if (formName === 'nurse') return nurseModel;
        if (formName === 'Patients') return patientsModel;
        if (formName === 'Hospitals') return hospitalsModel;
        throw new Error(`Unexpected model lookup for ${formName}`);
      }),
    };

    const service = new FormQueryService(
      registry as never,
      {} as never,
      {} as never,
    );

    const response = await service.update('nurse', {
      id: 'nurse-id-1',
      firstName: 'Elvin',
      patient: {
        id: 'patient-id-1',
        patient_name: 'Updated Patient',
      },
      hospitals: {
        name: 'New Hospital',
      },
    });

    expect(patientsModel.findByIdAndUpdate).toHaveBeenCalledWith(
      'patient-id-1',
      { patient_name: 'Updated Patient' },
      { returnDocument: 'after' },
    );
    expect(createHospital).toHaveBeenCalledWith({ name: 'New Hospital' });
    expect(nurseModel.findByIdAndUpdate).toHaveBeenCalledWith(
      'nurse-id-1',
      expect.objectContaining({
        $set: {
          firstName: 'Elvin',
          patient: 'p-updated',
          hospitals: 'h-created',
        },
      }),
      { returnDocument: 'after', strict: false },
    );
    expect(response).toEqual({ id: 'n-updated' });
  });

  it('adds relationName for ObjectId changes in audit changedFields', async () => {
    const previousOrderId = new Types.ObjectId('66b0f0ef94e0e78f5f6b1001');
    const nextOrderId = new Types.ObjectId('66b0f0ef94e0e78f5f6b1002');

    const orderStatusHistoryModel = {
      schema: {
        eachPath: (
          callback: (pathName: string, schemaType: unknown) => void,
        ) => {
          callback('order', {
            options: { ref: 'Orders' },
          });
          callback('statusLabel', {
            options: {},
          });
        },
      },
      findById: jest.fn().mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({
            _id: 'h1',
            order: previousOrderId,
            statusLabel: 'pending',
          }),
        }),
      }),
      findByIdAndUpdate: jest.fn().mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({
            _id: 'h1',
            order: nextOrderId,
            statusLabel: 'approved',
          }),
        }),
      }),
    };

    const service = new FormQueryService(
      {
        resolveModel: jest.fn().mockReturnValue(orderStatusHistoryModel),
      } as never,
      {} as never,
      {} as never,
    );

    await service.update('orderStatusHistory', {
      id: 'h1',
      order: nextOrderId,
      statusLabel: 'approved',
    });

    const updateCallArgs = orderStatusHistoryModel.findByIdAndUpdate.mock
      .calls[0] as [string, Record<string, unknown>, Record<string, unknown>];

    expect(updateCallArgs[0]).toBe('h1');
    expect(updateCallArgs[2]).toEqual({
      returnDocument: 'after',
      strict: false,
    });

    const updatePayload = updateCallArgs[1];
    const pushPayload = updatePayload.$push as
      | {
          audit?: {
            changedFields?: unknown[];
          };
        }
      | undefined;
    const changedFields = pushPayload?.audit?.changedFields;

    expect(changedFields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: 'order',
          relationName: 'Orders',
          from: previousOrderId.toHexString(),
          to: nextOrderId.toHexString(),
        }),
        expect.objectContaining({
          path: 'statusLabel',
          from: 'pending',
          to: 'approved',
        }),
      ]),
    );
  });

  it('adds relationName for ObjectId array relation changes in audit changedFields', async () => {
    const previousProductId = new Types.ObjectId('66b0f0ef94e0e78f5f6b1101');
    const nextProductId = new Types.ObjectId('66b0f0ef94e0e78f5f6b1102');

    const ordersModel = {
      schema: {
        eachPath: (
          callback: (pathName: string, schemaType: unknown) => void,
        ) => {
          callback('orderProducts', {
            caster: { options: { ref: 'OrderProducts' } },
          });
        },
      },
      findById: jest.fn().mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({
            _id: 'o1',
            orderProducts: [previousProductId],
          }),
        }),
      }),
      findByIdAndUpdate: jest.fn().mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({
            _id: 'o1',
            orderProducts: [previousProductId, nextProductId],
          }),
        }),
      }),
    };

    const service = new FormQueryService(
      {
        resolveModel: jest.fn().mockReturnValue(ordersModel),
      } as never,
      {} as never,
      {} as never,
    );

    await service.update('orders', {
      id: 'o1',
      orderProducts: [nextProductId],
    });

    const updateCallArgs = ordersModel.findByIdAndUpdate.mock.calls[0] as [
      string,
      Record<string, unknown>,
      Record<string, unknown>,
    ];
    const updatePayload = updateCallArgs[1];
    const pushPayload = updatePayload.$push as
      | {
          audit?: {
            changedFields?: unknown[];
          };
        }
      | undefined;
    const changedFields = pushPayload?.audit?.changedFields;

    expect(changedFields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: 'orderProducts',
          relationName: 'OrderProducts',
        }),
      ]),
    );
  });

  it('captures nested subform field updates in audit changedFields', async () => {
    const discountBenefitsId = new Types.ObjectId('66b0f0ef94e0e78f5f6b1201');

    const discountModel = {
      schema: {
        eachPath: (
          callback: (pathName: string, schemaType: unknown) => void,
        ) => {
          callback('discountBenefits', {
            options: { ref: 'DiscountBenefits' },
          });
        },
      },
      findById: jest.fn().mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({
            _id: 'd1',
            title: 'Discount on cart',
            discountBenefits: discountBenefitsId,
          }),
        }),
      }),
      findByIdAndUpdate: jest.fn().mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({
            _id: 'd1',
            title: 'Discount on cart',
            discountBenefits: discountBenefitsId,
          }),
        }),
      }),
    };

    const discountBenefitsModel = {
      schema: {
        eachPath: jest.fn(),
      },
      findById: jest.fn().mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({
            _id: discountBenefitsId,
            amount: 5,
            toggleAmount: ['1'],
            gifts: ['1'],
          }),
        }),
      }),
      findByIdAndUpdate: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: discountBenefitsId,
          amount: 7,
          toggleAmount: ['1'],
          gifts: ['1'],
        }),
      }),
      create: jest.fn(),
    };

    const service = new FormQueryService(
      {
        resolveModel: jest.fn((formName: string) => {
          if (formName === 'discount') {
            return discountModel;
          }

          if (formName === 'DiscountBenefits') {
            return discountBenefitsModel;
          }

          throw new Error(`Unexpected model lookup for ${formName}`);
        }),
      } as never,
      {} as never,
      {} as never,
    );

    await service.update('discount', {
      id: 'd1',
      title: 'Discount on cart',
      discountBenefits: {
        id: discountBenefitsId.toHexString(),
        amount: 7,
        toggleAmount: ['1'],
        gifts: ['1'],
      },
    });

    const updateCallArgs = discountModel.findByIdAndUpdate.mock.calls[0] as [
      string,
      Record<string, unknown>,
      Record<string, unknown>,
    ];
    const updatePayload = updateCallArgs[1];
    const pushPayload = updatePayload.$push as
      | {
          audit?: {
            changedFields?: unknown[];
          };
        }
      | undefined;
    const changedFields = pushPayload?.audit?.changedFields;

    expect(changedFields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: 'discountBenefits.amount',
          from: 5,
          to: 7,
        }),
      ]),
    );
  });

  it('creates subform record with parent_id when payload contains subform key', async () => {
    const createEducation = jest.fn().mockResolvedValue({
      toObject: () => ({ _id: 'e1', title: 'Matric', parent_id: 'c1' }),
    });

    const customersModel = {
      schema: {
        eachPath: jest.fn(),
      },
    };

    const educationModel = {
      schema: {
        eachPath: jest.fn(),
      },
      create: createEducation,
    };

    const registry = {
      resolveModel: jest.fn((formName: string) => {
        if (formName === 'customers') return customersModel;
        if (formName === 'education') return educationModel;
        throw new Error(`Unexpected model lookup for ${formName}`);
      }),
    };

    const service = new FormQueryService(
      registry as never,
      {} as never,
      {} as never,
    );

    const response = await service.update('customers', {
      title: 'Matric',
      university: 'Govt School No 2',
      year: '2003',
      country: 'pak',
      subform: 'education',
      id: 'c1',
      multi: true,
    });

    expect(createEducation).toHaveBeenCalledWith({
      title: 'Matric',
      university: 'Govt School No 2',
      year: '2003',
      country: 'pak',
      multi: true,
      parent_id: 'c1',
    });
    expect(response).toEqual({ id: 'e1', title: 'Matric', parent_id: 'c1' });
  });

  it('creates customer with education as array relation and stores only IDs', async () => {
    const createEducation = jest
      .fn()
      .mockResolvedValue({ _id: 'edu-id-1', title: 'Matric' });
    const createCustomer = jest.fn().mockResolvedValue({
      toObject: () => ({
        _id: 'cust-id-1',
        first_name: 'John',
        education: ['edu-id-1'],
      }),
    });

    const customersModel = {
      schema: {
        eachPath: (
          callback: (pathName: string, schemaType: unknown) => void,
        ) => {
          callback('education', {
            caster: { options: { ref: 'Education' } },
          });
        },
      },
      create: createCustomer,
    };

    const educationModel = {
      schema: { eachPath: jest.fn() },
      create: createEducation,
    };

    const registry = {
      resolveModel: jest.fn((formName: string) => {
        if (formName === 'customers') return customersModel;
        if (formName === 'Education') return educationModel;
        throw new Error(`Unexpected model lookup for ${formName}`);
      }),
    };

    const service = new FormQueryService(
      registry as never,
      {} as never,
      {} as never,
    );

    const response = await service.create('customers', {
      first_name: 'John',
      education: {
        title: 'Matric',
        university: 'Oxford',
        year: '2020',
        country: 'UK',
      },
    });

    expect(createEducation).toHaveBeenCalledWith({
      title: 'Matric',
      university: 'Oxford',
      year: '2020',
      country: 'UK',
    });
    expect(createCustomer).toHaveBeenCalledWith({
      first_name: 'John',
      education: ['edu-id-1'],
    });
    expect(response).toEqual({
      id: 'cust-id-1',
      first_name: 'John',
      education: ['edu-id-1'],
    });
  });

  it('create with parent id updates parent and creates nested subform when nested id is missing', async () => {
    const createEducation = jest
      .fn()
      .mockResolvedValue({ _id: 'edu-created-1' });

    const customersModel = {
      schema: {
        eachPath: (
          callback: (pathName: string, schemaType: unknown) => void,
        ) => {
          callback('education', {
            caster: { options: { ref: 'Education' } },
          });
        },
      },
      findByIdAndUpdate: jest.fn().mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({ _id: 'c1' }),
        }),
      }),
      findById: jest.fn().mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest
            .fn()
            .mockResolvedValueOnce({ _id: 'c1', education: ['edu-old-1'] })
            .mockResolvedValueOnce({
              _id: 'c1',
              education: [
                { _id: 'edu-old-1', title: 'Old' },
                { _id: 'edu-created-1', title: 'Matric' },
              ],
            }),
        }),
      }),
    };

    const educationModel = {
      schema: { eachPath: jest.fn() },
      findByIdAndUpdate: jest
        .fn()
        .mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
      create: createEducation,
    };

    const registry = {
      resolveModel: jest.fn((formName: string) => {
        if (formName === 'customers') return customersModel;
        if (formName === 'Education') return educationModel;
        throw new Error(`Unexpected model lookup for ${formName}`);
      }),
    };

    const relations = {
      applyPopulate: jest.fn(),
      resolveIncludePaths: jest.fn().mockReturnValue([]),
    };

    const service = new FormQueryService(
      registry as never,
      {} as never,
      relations as never,
    );

    const response = await service.create('customers', {
      id: 'c1',
      education: {
        title: 'Matric',
        university: 'SU',
        year: '2020',
        country: 'PK',
      },
      multi: true,
    });

    expect(createEducation).toHaveBeenCalledWith({
      title: 'Matric',
      university: 'SU',
      year: '2020',
      country: 'PK',
    });
    expect(customersModel.findByIdAndUpdate).toHaveBeenCalledWith(
      'c1',
      expect.objectContaining({
        $set: {
          education: ['edu-old-1', 'edu-created-1'],
          multi: true,
        },
      }),
      { returnDocument: 'after', strict: false },
    );
    expect(response).toEqual({
      id: 'c1',
      education: [
        { id: 'edu-old-1', title: 'Old' },
        { id: 'edu-created-1', title: 'Matric' },
      ],
    });
  });

  it('create with parent id updates nested subform when nested id is provided for multi relation', async () => {
    const findByIdExec = jest
      .fn()
      .mockResolvedValueOnce({ _id: 'c1', education: ['edu-existing-1'] })
      .mockResolvedValueOnce({
        _id: 'c1',
        education: [{ _id: 'edu-existing-1', title: 'Matric Updated' }],
      });

    const customersModel = {
      schema: {
        eachPath: (
          callback: (pathName: string, schemaType: unknown) => void,
        ) => {
          callback('education', {
            caster: { options: { ref: 'Education' } },
          });
        },
      },
      findById: jest.fn().mockReturnValue({
        lean: jest.fn().mockReturnValue({ exec: findByIdExec }),
      }),
      findByIdAndUpdate: jest.fn().mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({ _id: 'c1' }),
        }),
      }),
    };

    const educationModel = {
      schema: { eachPath: jest.fn() },
      findByIdAndUpdate: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({ _id: 'edu-existing-1' }),
      }),
      create: jest.fn(),
    };

    const registry = {
      resolveModel: jest.fn((formName: string) => {
        if (formName === 'customers') return customersModel;
        if (formName === 'Education') return educationModel;
        throw new Error(`Unexpected model lookup for ${formName}`);
      }),
    };

    const relations = {
      applyPopulate: jest.fn(),
      resolveIncludePaths: jest.fn().mockReturnValue([]),
    };

    const service = new FormQueryService(
      registry as never,
      {} as never,
      relations as never,
    );

    const response = await service.create('customers', {
      id: 'c1',
      education: {
        id: 'edu-existing-1',
        title: 'Matric Updated',
        university: 'SU',
        year: '2021',
        country: 'PK',
      },
      multi: true,
    });

    expect(educationModel.findByIdAndUpdate).toHaveBeenCalledWith(
      'edu-existing-1',
      {
        title: 'Matric Updated',
        university: 'SU',
        year: '2021',
        country: 'PK',
      },
      { returnDocument: 'after' },
    );
    expect(educationModel.create).not.toHaveBeenCalled();
    expect(customersModel.findByIdAndUpdate).toHaveBeenCalledWith(
      'c1',
      expect.objectContaining({
        $set: {
          education: ['edu-existing-1'],
          multi: true,
        },
      }),
      { returnDocument: 'after', strict: false },
    );
    expect(response).toEqual({
      id: 'c1',
      education: [{ id: 'edu-existing-1', title: 'Matric Updated' }],
    });
  });

  it('filters response fields by read permissions for the provided role', async () => {
    const exec = jest.fn().mockResolvedValue([
      {
        _id: 'n1',
        firstName: 'Ava',
        phoneNumber: '+1 555 123',
      },
    ]);
    const lean = jest.fn().mockReturnValue({ exec });
    const limit = jest.fn().mockReturnValue({ lean });
    const skip = jest.fn().mockReturnValue({ limit });

    const nurseModel = {
      find: jest.fn().mockReturnValue({ skip, limit, lean }),
      countDocuments: jest
        .fn()
        .mockReturnValue({ exec: jest.fn().mockResolvedValue(1) }),
      schema: {
        formPermissions: {
          form: { read: ['nurse', 'patient'] },
          fields: {
            firstName: { read: ['nurse', 'patient'] },
            phoneNumber: { read: ['patient'] },
          },
        },
      },
    };

    const service = new FormQueryService(
      { resolveModel: jest.fn().mockReturnValue(nurseModel) } as never,
      { parseSearch: jest.fn().mockReturnValue({}) } as never,
      {
        resolveIncludePaths: jest.fn().mockReturnValue([]),
        applyPopulate: jest.fn(),
      } as never,
    );

    const result = await service.find(
      'nurse',
      undefined,
      undefined,
      1,
      20,
      'nurse',
    );

    expect(result.data).toEqual([
      {
        id: 'n1',
        firstName: 'Ava',
      },
    ]);
  });

  it('throws forbidden when payload includes fields role cannot write', async () => {
    const nurseModel = {
      schema: {
        eachPath: jest.fn(),
        formPermissions: {
          form: { write: ['nurse', 'patient'] },
          fields: {
            firstName: { write: ['nurse', 'patient'] },
            lastName: { write: ['nurse'] },
          },
        },
      },
      create: jest.fn(),
    };

    const service = new FormQueryService(
      { resolveModel: jest.fn().mockReturnValue(nurseModel) } as never,
      {} as never,
      {} as never,
    );

    await expect(
      service.create(
        'nurse',
        {
          firstName: 'Ava',
          lastName: 'Smith',
        },
        'patient',
      ),
    ).rejects.toThrow('is not authorized to write fields');

    expect(nurseModel.create).not.toHaveBeenCalled();
  });

  it('allows create payload fields missing from field permissions map', async () => {
    const nurseModel = {
      schema: {
        eachPath: jest.fn(),
        formPermissions: {
          form: { write: ['nurse'] },
          fields: {
            firstName: { write: ['nurse'] },
          },
        },
      },
      create: jest.fn().mockResolvedValue({
        _id: 'n1',
        toObject: () => ({
          _id: 'n1',
          firstName: 'Ava',
          gender: 'female',
        }),
      }),
    };

    const service = new FormQueryService(
      { resolveModel: jest.fn().mockReturnValue(nurseModel) } as never,
      {} as never,
      {} as never,
    );

    await expect(
      service.create(
        'nurse',
        {
          firstName: 'Ava',
          gender: 'female',
        },
        'nurse',
      ),
    ).resolves.toEqual({
      id: 'n1',
      firstName: 'Ava',
      gender: 'female',
    });

    expect(nurseModel.create).toHaveBeenCalledWith({
      firstName: 'Ava',
      gender: 'female',
    });
  });

  it('allows update payload fields missing from edit permissions map', async () => {
    const nurseModel = {
      schema: {
        eachPath: jest.fn(),
        formPermissions: {
          form: { edit: ['nurse'] },
          fields: {
            firstName: { edit: ['nurse'] },
          },
        },
      },
      findById: jest.fn().mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({ _id: 'n1' }),
        }),
      }),
      findByIdAndUpdate: jest.fn().mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({
            _id: 'n1',
            firstName: 'Ava',
            gender: 'female',
          }),
        }),
      }),
    };

    const service = new FormQueryService(
      { resolveModel: jest.fn().mockReturnValue(nurseModel) } as never,
      {} as never,
      {} as never,
    );

    await expect(
      service.update(
        'nurse',
        {
          id: 'n1',
          firstName: 'Ava',
          gender: 'female',
        },
        'nurse',
      ),
    ).resolves.toEqual({
      id: 'n1',
      firstName: 'Ava',
      gender: 'female',
    });

    expect(nurseModel.findByIdAndUpdate).toHaveBeenCalled();
  });

  it('throws forbidden when role is not allowed to read form', async () => {
    const nurseModel = {
      find: jest.fn(),
      countDocuments: jest
        .fn()
        .mockReturnValue({ exec: jest.fn().mockResolvedValue(0) }),
      schema: {
        formPermissions: {
          form: { read: ['nurse'] },
        },
      },
    };

    const service = new FormQueryService(
      { resolveModel: jest.fn().mockReturnValue(nurseModel) } as never,
      { parseSearch: jest.fn().mockReturnValue({}) } as never,
      {
        resolveIncludePaths: jest.fn().mockReturnValue([]),
        applyPopulate: jest.fn(),
      } as never,
    );

    await expect(
      service.find('nurse', undefined, undefined, 1, 20, 'patient'),
    ).rejects.toThrow('is not authorized to read form');

    expect(nurseModel.find).not.toHaveBeenCalled();
  });

  it('throws forbidden when role is not allowed to write form', async () => {
    const nurseModel = {
      schema: {
        eachPath: jest.fn(),
        formPermissions: {
          form: { write: ['nurse'] },
          fields: {
            firstName: { write: ['nurse'] },
          },
        },
      },
      create: jest.fn(),
    };

    const service = new FormQueryService(
      { resolveModel: jest.fn().mockReturnValue(nurseModel) } as never,
      {} as never,
      {} as never,
    );

    await expect(
      service.create('nurse', { firstName: 'Ava' }, 'patient'),
    ).rejects.toThrow('is not authorized to write form');

    expect(nurseModel.create).not.toHaveBeenCalled();
  });

  it('throws forbidden when role is not allowed to edit form', async () => {
    const nurseModel = {
      schema: {
        eachPath: jest.fn(),
        formPermissions: {
          form: { edit: ['nurse'] },
          fields: {
            firstName: { edit: ['nurse'] },
          },
        },
      },
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
    };

    const service = new FormQueryService(
      { resolveModel: jest.fn().mockReturnValue(nurseModel) } as never,
      {} as never,
      {} as never,
    );

    await expect(
      service.update('nurse', { id: 'n1', firstName: 'Ava' }, 'patient'),
    ).rejects.toThrow('is not authorized to edit form');

    expect(nurseModel.findById).not.toHaveBeenCalled();
    expect(nurseModel.findByIdAndUpdate).not.toHaveBeenCalled();
  });
});

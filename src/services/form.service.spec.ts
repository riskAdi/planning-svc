import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import {
  FORM_MODEL_REGISTRY,
  FormModelDefinition,
  FormModelRegistry,
} from '../form-model.registry';
import { FormService } from './form.service';
import { QueryBuilderService } from './query-builder.service';
import { RelationResolverService } from './relation-resolver.service';

describe('FormService', () => {
  let service: FormService;
  let registry: FormModelRegistry;
  let find: jest.Mock;
  let findById: jest.Mock;
  let populate: jest.Mock;
  let exec: jest.Mock;

  beforeEach(async () => {
    exec = jest.fn().mockResolvedValue([{ _id: '1' }]);
    populate = jest.fn().mockReturnThis();
    find = jest.fn().mockReturnValue({ populate, exec });
    findById = jest.fn().mockReturnValue({ populate, exec });

    const ordersDefinition: FormModelDefinition = {
      modelName: 'Orders',
      formNames: ['orders'],
      model: {
        find,
        findById,
      } as never,
      searchableFields: ['status', 'discountCode'],
      relations: ['customer', 'orderProducts', 'orderStatus'],
    };

    registry = {
      orders: ordersDefinition,
      orderproducts: {
        modelName: 'OrderProducts',
        formNames: ['orderProducts'],
        model: {
          find,
          findById,
        } as never,
        searchableFields: [],
        relations: ['products'],
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FormService,
        QueryBuilderService,
        RelationResolverService,
        {
          provide: FORM_MODEL_REGISTRY,
          useValue: registry,
        },
      ],
    }).compile();

    service = module.get<FormService>(FormService);
  });

  it('builds a search filter and populates only supported includes', async () => {
    const response = await service.findMany('orders', {
      search: 'pending',
      include: 'customer,unknown,orderProducts',
      status: 'active',
    });

    expect(find).toHaveBeenCalledWith({
      $or: [
        {
          status: {
            $regex: 'pending',
            $options: 'i',
          },
        },
        {
          discountCode: {
            $regex: 'pending',
            $options: 'i',
          },
        },
      ],
      status: 'active',
    });
    expect(populate).toHaveBeenNthCalledWith(1, { path: 'customer' });
    expect(populate).toHaveBeenNthCalledWith(2, { path: 'orderProducts' });
    expect(response.meta).toEqual({
      formName: 'orders',
      modelName: 'Orders',
      include: ['customer', 'orderProducts'],
    });
    expect(response.data).toEqual([{ _id: '1' }]);
  });

  it('supports alias-based formName resolution for single-record lookups', async () => {
    exec.mockResolvedValueOnce({ _id: 'order-product-1' });

    const response = await service.findOne('orderproducts', 'order-product-1', {
      include: 'products',
    });

    expect(findById).toHaveBeenCalledWith('order-product-1');
    expect(populate).toHaveBeenCalledWith({ path: 'products' });
    expect(response.meta.modelName).toBe('OrderProducts');
  });

  it('throws when formName is not registered', async () => {
    await expect(service.findMany('missing-form', {})).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('throws when a record cannot be found', async () => {
    exec.mockResolvedValueOnce(null);

    await expect(
      service.findOne('orders', 'missing-id', { include: 'customer' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

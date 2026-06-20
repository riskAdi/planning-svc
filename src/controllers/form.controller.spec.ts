import { Test, TestingModule } from '@nestjs/testing';

import { FormController } from './form.controller';
import { FormService } from '../services/form.service';

describe('FormController', () => {
  let controller: FormController;
  const formService = {
    findMany: jest.fn(),
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FormController],
      providers: [
        {
          provide: FormService,
          useValue: formService,
        },
      ],
    }).compile();

    controller = module.get<FormController>(FormController);
  });

  it('delegates list requests with formName and query', async () => {
    const expectedResponse = { data: [], meta: { formName: 'customers' } };
    formService.findMany.mockResolvedValue(expectedResponse);

    await expect(
      controller.findMany('customers', {
        search: 'john',
        include: 'orders',
      }),
    ).resolves.toEqual(expectedResponse);

    expect(formService.findMany).toHaveBeenCalledWith('customers', {
      search: 'john',
      include: 'orders',
    });
  });

  it('delegates record lookup requests with id and include query', async () => {
    const expectedResponse = {
      data: { _id: 'abc123' },
      meta: { formName: 'orders', include: ['customer'] },
    };
    formService.findOne.mockResolvedValue(expectedResponse);

    await expect(
      controller.findOne('orders', 'abc123', {
        include: 'customer',
      }),
    ).resolves.toEqual(expectedResponse);

    expect(formService.findOne).toHaveBeenCalledWith('orders', 'abc123', {
      include: 'customer',
    });
  });
});

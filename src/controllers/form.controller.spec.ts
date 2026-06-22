import { Test, TestingModule } from '@nestjs/testing';

import { FormController } from './form.controller';
import { FormQueryService } from '../services/form-query.service';

describe('FormController', () => {
  let controller: FormController;
  const formQueryService = {
    find: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FormController],
      providers: [
        {
          provide: FormQueryService,
          useValue: formQueryService,
        },
      ],
    }).compile();

    controller = module.get<FormController>(FormController);
  });

  it('delegates list requests with formName and query', async () => {
    const expectedResponse = {
      data: [{ id: '1' }],
      meta: {
        formName: 'customers',
        page: 2,
        limit: 5,
        total: 9,
        totalPages: 2,
        include: ['orders'],
      },
    };
    formQueryService.find.mockResolvedValue(expectedResponse);

    await expect(
      controller.getFormData(
        'customers',
        'john',
        'orders',
        '{"page":2,"limit":5}',
      ),
    ).resolves.toEqual(expectedResponse);

    expect(formQueryService.find).toHaveBeenCalledWith(
      'customers',
      'john',
      'orders',
      2,
      5,
    );
  });

  it('delegates create requests with object payload', async () => {
    const payload = { firstName: 'Alice' };
    const expectedResponse = { _id: 'abc123', ...payload };
    formQueryService.create.mockResolvedValue(expectedResponse);

    await expect(
      controller.createFormData('nurse', payload),
    ).resolves.toEqual(expectedResponse);

    expect(formQueryService.create).toHaveBeenCalledWith('nurse', payload);
  });

  it('parses text payload as JSON before create', async () => {
    const payloadText = '{"name":"City Hospital"}';
    const expectedResponse = { _id: 'h1', name: 'City Hospital' };
    formQueryService.create.mockResolvedValue(expectedResponse);

    await expect(controller.createFormData('hospitals', payloadText)).resolves.toEqual(
      expectedResponse,
    );

    expect(formQueryService.create).toHaveBeenCalledWith('hospitals', {
      name: 'City Hospital',
    });
  });

  it('delegates update requests with parsed payload', async () => {
    const payloadText = '{"id":"n1","firstName":"Elvin"}';
    const expectedResponse = { id: 'n1', firstName: 'Elvin' };
    formQueryService.update.mockResolvedValue(expectedResponse);

    await expect(controller.updateFormData('nurse', payloadText)).resolves.toEqual(
      expectedResponse,
    );

    expect(formQueryService.update).toHaveBeenCalledWith('nurse', {
      id: 'n1',
      firstName: 'Elvin',
    });
  });
});

import { FormQueryService } from './form-query.service';

describe('FormQueryService', () => {
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
      parseSearch: jest.fn().mockReturnValue({ gender: 'male' }),
    };

    const relations = {
      parseInclude: jest.fn().mockReturnValue(['patient', 'hospitals']),
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
    expect(nurseModel.countDocuments).toHaveBeenCalledWith({ gender: 'male' });
    expect(result).toEqual({
      data: [{ _id: 'n1' }],
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

  it('creates nested subforms from schema relation fields and saves parent with references', async () => {
    const createPatient = jest.fn().mockResolvedValue({ _id: 'p1' });
    const createHospital = jest.fn().mockResolvedValue({ _id: 'h1' });
    const createNurse = jest.fn().mockResolvedValue({
      toObject: () => ({ _id: 'n1', firstName: 'First Name' }),
    });

    const nurseModel = {
      schema: {
        eachPath: (callback: (pathName: string, schemaType: unknown) => void) => {
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
      create: createPatient,
    };

    const hospitalsModel = {
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
      id: 'temp_123',
    });

    expect(createPatient).toHaveBeenCalledWith({ patient_name: 'Everett Chesworth' });
    expect(createHospital).toHaveBeenCalledWith({ name: 'General Hospital' });
    expect(createNurse).toHaveBeenCalledWith({
      firstName: 'First Name',
      hospitals: 'h1',
      patient: 'p1',
      id: 'temp_123',
    });
    expect(response).toEqual({ _id: 'n1', firstName: 'First Name' });
  });
});

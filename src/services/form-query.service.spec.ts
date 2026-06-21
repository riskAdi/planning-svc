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
      countDocuments: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(1) }),
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
    expect(result.meta.include).toEqual(['hospital', 'nurse']);
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

  it('creates recursive subforms for nested relation objects', async () => {
    const createPatient = jest.fn().mockResolvedValue({ _id: 'p1' });
    const createHospital = jest.fn().mockResolvedValue({ _id: 'h1' });
    const createNurse = jest.fn().mockResolvedValue({ _id: 'n1' });
    const createDoctor = jest.fn().mockResolvedValue({
      toObject: () => ({ _id: 'd1', first_name: 'Doc' }),
    });

    const doctorsModel = {
      schema: {
        eachPath: (callback: (pathName: string, schemaType: unknown) => void) => {
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
        eachPath: (callback: (pathName: string, schemaType: unknown) => void) => {
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

    expect(createPatient).toHaveBeenCalledWith({ patient_name: 'Eddy Muneely' });
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
    expect(response).toEqual({ _id: 'd1', first_name: 'Doc' });
  });
});

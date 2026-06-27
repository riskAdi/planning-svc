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
      countDocuments: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(1) }),
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
        createdAt: '2026-06-20T19:28:23.753Z',
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
    expect(nurseModel.countDocuments).toHaveBeenCalledWith({
      $or: [
        {
          gender: {
            $regex: 'male',
            $options: 'i',
          },
        },
      ],
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
    expect(result.data).toEqual([{ id: 'd1' }]);
    expect(result.meta.include).toEqual(['hospital', 'nurse']);
  });

  it('uses only schema-defined keys and applies OR wildcard regex search', async () => {
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
      countDocuments: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(0) }),
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
          first_name: 'sdf',
          last_name: 'sdf',
          phone_number: 'sdf',
          invalid_key: 'ignore-me',
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
      $or: [
        {
          first_name: {
            $regex: 'sdf',
            $options: 'i',
          },
        },
        {
          last_name: {
            $regex: 'sdf',
            $options: 'i',
          },
        },
        {
          phone_number: {
            $regex: 'sdf',
            $options: 'i',
          },
        },
      ],
    });
    expect(doctorsModel.countDocuments).toHaveBeenCalledWith({
      $or: [
        {
          first_name: {
            $regex: 'sdf',
            $options: 'i',
          },
        },
        {
          last_name: {
            $regex: 'sdf',
            $options: 'i',
          },
        },
        {
          phone_number: {
            $regex: 'sdf',
            $options: 'i',
          },
        },
      ],
    });
  });

  it('supports asterisk wildcard in search values', async () => {
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
      countDocuments: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(0) }),
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
          first_name: 'El*in',
        }),
      } as never,
      {
        resolveIncludePaths: jest.fn().mockReturnValue([]),
        applyPopulate: jest.fn(),
      } as never,
    );

    await service.find('doctors', '{"first_name":"El*in"}', undefined);

    expect(doctorsModel.find).toHaveBeenCalledWith({
      $or: [
        {
          first_name: {
            $regex: 'El.*in',
            $options: 'i',
          },
        },
      ],
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

    expect(createPatient).toHaveBeenCalledWith({ patient_name: 'Everett Chesworth' });
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
    expect(response).toEqual({ id: 'd1', first_name: 'Doc' });
  });

  it('updates parent and subforms when ids exist, creates subforms when ids are missing', async () => {
    const updatePatient = jest.fn().mockResolvedValue({ _id: 'p-updated' });
    const createHospital = jest.fn().mockResolvedValue({ _id: 'h-created' });
    const updateNurse = jest.fn().mockResolvedValue({ _id: 'n-updated' });

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
      findByIdAndUpdate: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
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
      { new: true },
    );
    expect(createHospital).toHaveBeenCalledWith({ name: 'New Hospital' });
    expect(nurseModel.findByIdAndUpdate).toHaveBeenCalledWith(
      'nurse-id-1',
      {
        firstName: 'Elvin',
        patient: 'p-updated',
        hospitals: 'h-created',
      },
      { new: true },
    );
    expect(response).toEqual({ id: 'n-updated' });
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
        eachPath: (callback: (pathName: string, schemaType: unknown) => void) => {
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
    const createEducation = jest.fn().mockResolvedValue({ _id: 'edu-created-1' });

    const customersModel = {
      schema: {
        eachPath: (callback: (pathName: string, schemaType: unknown) => void) => {
          callback('education', {
            caster: { options: { ref: 'Education' } },
          });
        },
      },
      findById: jest.fn().mockReturnValue({
        lean: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue({ _id: 'c1', education: ['edu-old-1'] }) }),
      }),
      findByIdAndUpdate: jest.fn().mockReturnValue({
        lean: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue({ _id: 'c1' }) }),
      }),
      findById: jest.fn().mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({
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
      findByIdAndUpdate: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
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
      {
        education: ['edu-old-1', 'edu-created-1'],
        multi: true,
      },
      { new: true },
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
        eachPath: (callback: (pathName: string, schemaType: unknown) => void) => {
          callback('education', {
            caster: { options: { ref: 'Education' } },
          });
        },
      },
      findById: jest.fn().mockReturnValue({
        lean: jest.fn().mockReturnValue({ exec: findByIdExec }),
      }),
      findByIdAndUpdate: jest.fn().mockReturnValue({
        lean: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue({ _id: 'c1' }) }),
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
      { new: true },
    );
    expect(educationModel.create).not.toHaveBeenCalled();
    expect(customersModel.findByIdAndUpdate).toHaveBeenCalledWith(
      'c1',
      {
        education: ['edu-existing-1'],
        multi: true,
      },
      { new: true },
    );
    expect(response).toEqual({
      id: 'c1',
      education: [
        { id: 'edu-existing-1', title: 'Matric Updated' },
      ],
    });
  });
});

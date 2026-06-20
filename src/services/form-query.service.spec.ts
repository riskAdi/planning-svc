import { FormQueryService } from './form-query.service';

describe('FormQueryService', () => {
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

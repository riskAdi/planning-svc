import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type PatientsDocument = HydratedDocument<Patients>;

@Schema({ timestamps: true })
export class Patients {
  @Prop({ required: false })
  patient_name: string;

  @Prop({ required: false })
  patient_age: number;

  @Prop({ required: false })
  insurance_provider: string;

  @Prop({ required: false })
  admission_date: Date;

  @Prop({ required: false })
  search: string;
}

export const PatientsSchema = SchemaFactory.createForClass(Patients);

import type { FormPermissions } from './permissions.types';

export const PatientsPermissions: FormPermissions = {
  form: {
    read: ['nurse', 'patient'],
    write: ['nurse'],
    edit: ['nurse'],
    delete: ['nurse'],
  },
  fields: {
    patient_name: ['nurse', 'patient'],
    patient_age: {
      read: ['nurse', 'patient'],
      write: ['nurse'],
      edit: ['nurse'],
      delete: ['nurse'],
    },
  },
};

(
  PatientsSchema as unknown as { formPermissions?: FormPermissions }
).formPermissions = PatientsPermissions;

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import mongoose from 'mongoose';

import { Patients } from './patients.schema';
import { Hospitals } from './hospitals.schema';

export type NurseDocument = HydratedDocument<Nurse>;

export type RolePermissions = {
  read?: string[];
  write?: string[];
  edit?: string[];
  delete?: string[];
};

export type FormPermissions = {
  form: RolePermissions;
  fields: Record<string, RolePermissions>;
};

export const NursePermissions: FormPermissions = {
  form: {
    read: ['nurse', 'patient'],
    write: ['nurse'],
    edit: ['nurse'],
    delete: ['nurse'],
  },
  fields: {
    firstName: {
      read: ['nurse', 'patient'],
      write: ['nurse', 'patient'],
      edit: ['nurse', 'patient'],
      delete: ['nurse', 'patient'],
    },
    lastName: {
      read: ['patient'],
      write: ['nurse'],
      edit: ['nurse'],
      delete: ['nurse'],
    },
    phoneNumber: {
      read: ['nurse'],
      write: ['nurse'],
      edit: ['nurse'],
      delete: ['nurse'],
    },
  },
};

@Schema({ timestamps: true })
export class Nurse {
  @Prop({ required: false })
  firstName: string;

  @Prop({ required: false })
  lastName: string;

  @Prop({ required: false })
  phoneNumber: string;

  @Prop({ required: false, type: [String] })
  bestTimeToReachYou: string[];

  @Prop({ required: false, type: [String] })
  preferredContactMethod: string[];

  @Prop({ required: false })
  gender: string;

  @Prop({
    required: false,
    type: mongoose.Schema.Types.ObjectId,
    ref: Patients.name,
  })
  patient: mongoose.Types.ObjectId | Patients;

  @Prop({
    required: false,
    type: mongoose.Schema.Types.ObjectId,
    ref: Hospitals.name,
  })
  hospitals: mongoose.Types.ObjectId | Hospitals;

  @Prop({ required: false })
  patientsFilter: string;

  @Prop({ required: false })
  dropW: string;

  @Prop({ required: false, type: mongoose.Schema.Types.Mixed })
  btn: any;

  @Prop({ required: false })
  admission_date: Date;

  @Prop({ required: false })
  search: string;
}

export const NurseSchema = SchemaFactory.createForClass(Nurse);

(NurseSchema as typeof NurseSchema & { formPermissions?: FormPermissions }).formPermissions =
  NursePermissions;

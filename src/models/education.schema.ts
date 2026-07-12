import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type EducationDocument = HydratedDocument<Education>;

@Schema({ timestamps: true })
export class Education {
  @Prop({ required: false })
  title: string;

  @Prop({ required: false })
  university: string;

  @Prop({ required: false })
  year: string;

  @Prop({ required: false })
  country: string;
}

export const EducationSchema = SchemaFactory.createForClass(Education);

import type { FormPermissions } from './permissions.types';

export const EducationPermissions: FormPermissions = {
  form: {
    read: ['nurse', 'patient'],
    write: ['nurse', 'patient'],
    edit: ['nurse', 'patient'],
    delete: ['nurse', 'patient'],
  },
  fields: {
    title: ['nurse', 'patient'],
    university: ['nurse', 'patient'],
    year: ['nurse', 'patient'],
    country: ['nurse', 'patient'],
  },
};

(
  EducationSchema as unknown as { formPermissions?: FormPermissions }
).formPermissions = EducationPermissions;

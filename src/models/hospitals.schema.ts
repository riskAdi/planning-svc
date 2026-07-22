import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type HospitalsDocument = HydratedDocument<Hospitals>;

@Schema({ timestamps: true })
export class Hospitals {
  @Prop({ required: false })
  name: string;

  @Prop({ required: false })
  location: string;

  @Prop({ required: false })
  phone_number: string;
}

export const HospitalsSchema = SchemaFactory.createForClass(Hospitals);

import type { FormPermissions } from './permissions.types';

export const HospitalsPermissions: FormPermissions = {
  form: {
    read: ['nurse', 'patient'],
    write: ["nurse","patient"],
    edit: ["nurse","patient"],
    delete: ["nurse","patient"],
  },
  fields: {
    name: ["nurse","patient"],
    location: ["nurse","patient"],
    phone_number: ["nurse","patient"],
  },
};

(HospitalsSchema as unknown as { formPermissions?: FormPermissions }).formPermissions = HospitalsPermissions;

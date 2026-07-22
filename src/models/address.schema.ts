import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type AddressDocument = HydratedDocument<Address>;

@Schema({ timestamps: true })
export class Address {
  @Prop({ required: false })
  name: string;

  @Prop({ required: false })
  location: string;

  @Prop({ required: false })
  phone_number: string;

  @Prop({ required: false })
  country: string;
}

export const AddressSchema = SchemaFactory.createForClass(Address);

import type { FormPermissions } from './permissions.types';

export const AddressPermissions: FormPermissions = {
  form: {
    read: ['nurse', 'patient'],
    write: ['nurse'],
    edit: ['nurse'],
    delete: ['nurse'],
  },
  fields: {
    name: ['nurse', 'patient'],
    location: ['nurse', 'patient'],
    phone_number: ['nurse', 'patient'],
    country: ['nurse', 'patient'],
  },
};

(
  AddressSchema as unknown as { formPermissions?: FormPermissions }
).formPermissions = AddressPermissions;

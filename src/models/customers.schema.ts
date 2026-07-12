import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import { Address } from './address.schema';
import { Education } from './education.schema';

export type CustomersDocument = HydratedDocument<Customers>;

@Schema({ timestamps: true })
export class Customers {
  @Prop({ required: false })
  first_name: string;

  @Prop({ required: false })
  last_name: string;

  @Prop({ required: false })
  phone_number: string;

  @Prop({ required: false })
  email: string;

  @Prop({ required: false })
  location: string;

  @Prop({ required: false })
  gender: string;

  @Prop({ required: false })
  search: string;

  @Prop({ required: false })
  orderType: string;

  @Prop({ required: false })
  duration: string;

  @Prop({ required: false })
  status: string;

  @Prop({ required: false })
  orderDate: string;

  @Prop({ required: false })
  dateRange: Date;

  @Prop({ required: false })
  pickupStatus: string;

  @Prop({
    required: false,
    type: mongoose.Schema.Types.ObjectId,
    ref: Address.name,
  })
  address: mongoose.Types.ObjectId | Address;

  @Prop({
    required: false,
    type: [mongoose.Schema.Types.ObjectId],
    ref: Education.name,
  })
  education: Array<mongoose.Types.ObjectId | Education>;
}

export const CustomersSchema = SchemaFactory.createForClass(Customers);

import type { FormPermissions } from './permissions.types';

export const CustomersPermissions: FormPermissions = {
  fields: {
    first_name: ['nurse', 'patient'],
    last_name: {
      read: ['nurse', 'patient'],
      write: ['nurse'],
      edit: ['nurse'],
      delete: ['nurse'],
    },
    phone_number: ['nurse', 'patient'],
  },
};

(
  CustomersSchema as unknown as { formPermissions?: FormPermissions }
).formPermissions = CustomersPermissions;

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';

export type CustomersDocument = HydratedDocument<Customers>;

@Schema({ timestamps: true })
export class Customers {
  @Prop({ required: false })
  firstName: string;

  @Prop({ required: false })
  lastName: string;

  @Prop({ required: false })
  phoneNumber: string;

  @Prop({ required: false })
  email: string;

  @Prop({ required: false })
  address: string;

  @Prop({ required: false })
  city: string;

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
}

export const CustomersSchema = SchemaFactory.createForClass(Customers);

import type { FormPermissions } from './permissions.types';

export const CustomersPermissions: FormPermissions = {
  fields: {
    firstName: ['nurse', 'patient'],
    lastName: {
      read: ['nurse', 'patient'],
      write: ['nurse'],
      edit: ['nurse'],
      delete: ['nurse'],
    },
    phoneNumber: ['nurse', 'patient'],
  },
};

(
  CustomersSchema as unknown as { formPermissions?: FormPermissions }
).formPermissions = CustomersPermissions;

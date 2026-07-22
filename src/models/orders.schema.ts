import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import mongoose from 'mongoose';

import { Customers } from './customers.schema';
import { OrderProducts } from './orderProducts.schema';
import { OrderStatus } from './orderStatus.schema';

export type OrdersDocument = HydratedDocument<Orders>;

@Schema({ timestamps: true })
export class Orders {
  @Prop({
    required: false,
    type: mongoose.Schema.Types.ObjectId,
    ref: Customers.name,
  })
  customer: mongoose.Types.ObjectId | Customers;

  @Prop({ required: false })
  discountCode: string;

  @Prop({ required: false })
  shipping: number;

  @Prop({
    required: false,
    type: mongoose.Schema.Types.ObjectId,
    ref: OrderStatus.name,
  })
  orderStatus: mongoose.Types.ObjectId | OrderStatus;

  @Prop({
    required: false,
    type: [mongoose.Schema.Types.ObjectId],
    ref: OrderProducts.name,
  })
  orderProducts: Array<mongoose.Types.ObjectId | OrderProducts>;

  @Prop({ required: false })
  status: string;

  @Prop({ required: false, type: mongoose.Schema.Types.Mixed })
  viewHistory: any;
}

export const OrdersSchema = SchemaFactory.createForClass(Orders);

import type { FormPermissions } from './permissions.types';

export const OrdersPermissions: FormPermissions = {
  form: {
    read: ['nurse', 'patient'],
    write: ['nurse'],
    edit: ['nurse'],
    delete: ['nurse'],
  },
};

(
  OrdersSchema as unknown as { formPermissions?: FormPermissions }
).formPermissions = OrdersPermissions;

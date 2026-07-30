import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import mongoose from 'mongoose';

import { Orders } from './orders.schema';
import { OrderStatus } from './orderStatus.schema';

export type OrderStatusHistoryDocument = HydratedDocument<OrderStatusHistory>;

@Schema({
  timestamps: { createdAt: true, updatedAt: false },
  strict: false,
})
export class OrderStatusHistory {
  @Prop({
    required: true,
    type: mongoose.Schema.Types.ObjectId,
    ref: Orders.name,
  })
  order: mongoose.Types.ObjectId | Orders;

  @Prop({
    required: true,
    type: mongoose.Schema.Types.ObjectId,
    ref: OrderStatus.name,
  })
  status: mongoose.Types.ObjectId | OrderStatus;

  @Prop({ required: false, type: mongoose.Schema.Types.ObjectId })
  user: mongoose.Types.ObjectId;

  createdAt: Date;
}

export const OrderStatusHistorySchema =
  SchemaFactory.createForClass(OrderStatusHistory);

import type { FormPermissions } from './permissions.types';

export const OrderStatusHistoryPermissions: FormPermissions = {
  form: {
    read: ['nurse', 'patient'],
    write: ['nurse'],
    edit: ['nurse'],
    delete: ['nurse'],
  },
};

(
  OrderStatusHistorySchema as unknown as { formPermissions?: FormPermissions }
).formPermissions = OrderStatusHistoryPermissions;

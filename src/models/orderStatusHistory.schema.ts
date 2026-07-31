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

function toObjectIdLike(
  value: unknown,
): mongoose.Types.ObjectId | string | null {
  if (value instanceof mongoose.Types.ObjectId) {
    return value;
  }

  if (typeof value === 'string' && value.trim() !== '') {
    return value;
  }

  if (!value || typeof value !== 'object') {
    return null;
  }

  const nestedId =
    (value as { _id?: unknown })._id ?? (value as { id?: unknown }).id;

  if (nestedId instanceof mongoose.Types.ObjectId) {
    return nestedId;
  }

  if (typeof nestedId === 'string' && nestedId.trim() !== '') {
    return nestedId;
  }

  return null;
}

OrderStatusHistorySchema.post('save', async function afterSave(doc) {
  const orderId = toObjectIdLike(doc.order);
  const statusId = toObjectIdLike(doc.status);

  if (!orderId || !statusId) {
    return;
  }

  await doc.model(Orders.name).findByIdAndUpdate(orderId, {
    status: statusId,
  });
});

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

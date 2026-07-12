import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import mongoose from 'mongoose';

export type OrderStatusDocument = HydratedDocument<OrderStatus>;

@Schema({ timestamps: true })
export class OrderStatus {
  @Prop({ required: false })
  status: string;

  @Prop({ required: false, type: mongoose.Schema.Types.Mixed })
  message: any;
}

export const OrderStatusSchema = SchemaFactory.createForClass(OrderStatus);

import type { FormPermissions } from './permissions.types';

export const OrderStatusPermissions: FormPermissions = {
  form: {
    read: ['nurse', 'patient'],
    write: ['nurse'],
    edit: ['nurse'],
    delete: ['nurse'],
  },
};

(
  OrderStatusSchema as unknown as { formPermissions?: FormPermissions }
).formPermissions = OrderStatusPermissions;

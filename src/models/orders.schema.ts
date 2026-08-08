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
  status: mongoose.Types.ObjectId | OrderStatus;

  @Prop({
    required: false,
    type: [mongoose.Schema.Types.ObjectId],
    ref: OrderProducts.name,
  })
  orderProducts: Array<mongoose.Types.ObjectId | OrderProducts>;

  @Prop({ required: false, type: mongoose.Schema.Types.Mixed })
  viewHistory: any;

  @Prop({
    required: false,
    type: [
      {
        changedAt: { type: Date },
        actorRole: { type: String },
        changedFields: [
          {
            path: { type: String },
            from: { type: mongoose.Schema.Types.Mixed },
            to: { type: mongoose.Schema.Types.Mixed },
            relationName: { type: String },
          },
        ],
      },
    ],
    default: [],
  })
  audit: Array<{
    changedAt?: Date;
    actorRole?: string;
    changedFields?: Array<{
      path?: string;
      from?: unknown;
      to?: unknown;
      relationName?: string;
    }>;
  }>;
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
  OrdersSchema as unknown as {
    formPermissions?: FormPermissions;
    excludeAttributes?: string[];
  }
).formPermissions = OrdersPermissions;

(
  OrdersSchema as unknown as {
    formPermissions?: FormPermissions;
    excludeAttributes?: string[];
  }
).excludeAttributes = ['orderProducts', 'audit']; // when fetched as subform

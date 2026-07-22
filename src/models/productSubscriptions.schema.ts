import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ProductSubscriptionsDocument =
  HydratedDocument<ProductSubscriptions>;

@Schema({ timestamps: true })
export class ProductSubscriptions {
  @Prop({ required: false })
  weight: string;

  @Prop({ required: false })
  package_weight: number;

  @Prop({ required: false })
  length: number;

  @Prop({ required: false })
  width: number;

  @Prop({ required: false })
  height: number;

  @Prop({ required: false })
  isDangerousGoods: string;

  @Prop({ required: false })
  warrantyType: string;

  @Prop({ required: false })
  warrantyPeriod: string;

  @Prop({ required: false })
  warrantyPolicy: string;
}

export const ProductSubscriptionsSchema =
  SchemaFactory.createForClass(ProductSubscriptions);

import type { FormPermissions } from './permissions.types';

export const ProductSubscriptionsPermissions: FormPermissions = {
  form: {
    read: ['nurse', 'patient'],
    write: ['nurse', 'patient'],
    edit: ['nurse', 'patient'],
    delete: ['nurse', 'patient'],
  },
  fields: {
    package_weight: ['nurse', 'patient'],
    length: ['nurse', 'patient'],
    width: ['nurse', 'patient'],
    height: ['nurse', 'patient'],
  },
};

(
  ProductSubscriptionsSchema as unknown as { formPermissions?: FormPermissions }
).formPermissions = ProductSubscriptionsPermissions;

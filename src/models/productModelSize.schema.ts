import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import mongoose from 'mongoose';

export type ProductModelSizeDocument = HydratedDocument<ProductModelSize>;

@Schema({ timestamps: true })
export class ProductModelSize {
  @Prop({ required: false, type: [mongoose.Schema.Types.Mixed] })
  setSamePrice: any[];

  @Prop({ required: false })
  price: number;

  @Prop({ required: false, type: [mongoose.Schema.Types.Mixed] })
  toggleSpecialPrice: any[];

  @Prop({ required: false })
  specialPrice: number;

  @Prop({ required: false })
  stock: number;

  @Prop({
    required: false,
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ModelSize',
  })
  size: mongoose.Types.ObjectId;
}

export const ProductModelSizeSchema =
  SchemaFactory.createForClass(ProductModelSize);

import type { FormPermissions } from './permissions.types';

export const ProductModelSizePermissions: FormPermissions = {
  fields: {
    price: ['nurse', 'patient'],
    specialPrice: ['nurse', 'patient'],
    stock: ['nurse', 'patient'],
  },
};

(
  ProductModelSizeSchema as unknown as { formPermissions?: FormPermissions }
).formPermissions = ProductModelSizePermissions;

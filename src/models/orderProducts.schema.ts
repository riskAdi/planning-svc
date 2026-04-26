import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import mongoose from 'mongoose';

import { Products } from './products.schema';

export type OrderProductsDocument = HydratedDocument<OrderProducts>;

@Schema({ timestamps: true })
export class OrderProducts {
  @Prop({
    required: false,
    type: mongoose.Schema.Types.ObjectId,
    ref: Products.name,
  })
  products: mongoose.Types.ObjectId | Products;
}

export const OrderProductsSchema = SchemaFactory.createForClass(OrderProducts);

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import mongoose from 'mongoose';

import { Products } from './products.schema';
import { ColorsClass } from './colorsClass.schema';
import { ModelSize } from './modelSize.schema';

export type OrderProductsDocument = HydratedDocument<OrderProducts>;

@Schema({ timestamps: true })
export class OrderProducts {
  @Prop({ required: true })
  quantity: number;

  @Prop({
    required: true,
    type: mongoose.Schema.Types.ObjectId,
    ref: Products.name,
  })
  product: mongoose.Types.ObjectId | Products;

  @Prop({
    required: true,
    type: mongoose.Schema.Types.ObjectId,
    ref: ModelSize.name,
  })
  size: mongoose.Types.ObjectId | ModelSize;

  @Prop({
    required: true,
    type: mongoose.Schema.Types.ObjectId,
    ref: ColorsClass.name,
  })
  color: mongoose.Types.ObjectId | ColorsClass;
}

export const OrderProductsSchema = SchemaFactory.createForClass(OrderProducts);

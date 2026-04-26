import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import mongoose from 'mongoose';


export type OrderProductsDocument = HydratedDocument<OrderProducts>;

@Schema({ timestamps: true })
export class OrderProducts {
  @Prop({ required: false, type: mongoose.Schema.Types.Mixed })
  products: any;
}

export const OrderProductsSchema = SchemaFactory.createForClass(OrderProducts);

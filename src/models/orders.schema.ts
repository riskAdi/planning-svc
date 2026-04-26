import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import mongoose from 'mongoose';


export type OrdersDocument = HydratedDocument<Orders>;

@Schema({ timestamps: true })
export class Orders {
  @Prop({ required: false, type: mongoose.Schema.Types.Mixed })
  customer: any;

  @Prop({ required: false })
  discountCode: string;

  @Prop({ required: false })
  shipping: number;

  @Prop({ required: false, type: mongoose.Schema.Types.Mixed })
  orderStatus: any;

  @Prop({ required: false, type: [mongoose.Schema.Types.Mixed] })
  orderProducts: any[];

  @Prop({ required: false })
  status: string;

  @Prop({ required: false, type: mongoose.Schema.Types.Mixed })
  viewHistory: any;
}

export const OrdersSchema = SchemaFactory.createForClass(Orders);

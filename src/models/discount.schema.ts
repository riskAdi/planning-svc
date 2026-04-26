import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import mongoose from 'mongoose';


export type DiscountDocument = HydratedDocument<Discount>;

@Schema({ timestamps: true })
export class Discount {
  @Prop({ required: false })
  title: string;

  @Prop({ required: false })
  scope: string;

  @Prop({ required: false, type: [mongoose.Schema.Types.Mixed] })
  discount_rule: any[];

  @Prop({ required: false, type: [mongoose.Schema.Types.Mixed] })
  product_list: any[];

  @Prop({ required: false, type: mongoose.Schema.Types.Mixed })
  productDiscount: any;

  @Prop({ required: false })
  dateRange: Date;

  @Prop({ required: false, type: [mongoose.Schema.Types.Mixed] })
  status: any[];
}

export const DiscountSchema = SchemaFactory.createForClass(Discount);

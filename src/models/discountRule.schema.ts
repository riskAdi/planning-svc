import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import mongoose from 'mongoose';


export type DiscountRuleDocument = HydratedDocument<DiscountRule>;

@Schema({ timestamps: true })
export class DiscountRule {
  @Prop({ required: false })
  rule: string;

  @Prop({ required: false })
  min_discount_amount: number;

  @Prop({ required: false })
  min_discount_quantity: number;

  @Prop({ required: false, type: [mongoose.Schema.Types.Mixed] })
  toggleDiscount: any[];

  @Prop({ required: false, type: mongoose.Schema.Types.Mixed })
  productDiscount: any;
}

export const DiscountRuleSchema = SchemaFactory.createForClass(DiscountRule);

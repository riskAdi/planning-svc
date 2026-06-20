import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import mongoose from 'mongoose';

export type DiscountBenefitsDocument = HydratedDocument<DiscountBenefits>;

@Schema({ timestamps: true })
export class DiscountBenefits {
  @Prop({ required: false })
  amount: number;

  @Prop({ required: false, type: [mongoose.Schema.Types.Mixed] })
  toggleAmount: any[];

  @Prop({ required: false, type: [mongoose.Schema.Types.Mixed] })
  freeShipping: any[];

  @Prop({ required: false, type: [mongoose.Schema.Types.Mixed] })
  gifts: any[];
}

export const DiscountBenefitsSchema =
  SchemaFactory.createForClass(DiscountBenefits);

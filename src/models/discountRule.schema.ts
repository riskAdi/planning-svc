import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import mongoose from 'mongoose';
import { DiscountBenefits } from './discountBenefits.schema';

export type DiscountRuleDocument = HydratedDocument<DiscountRule>;

@Schema({ timestamps: true })
export class DiscountRule {
  @Prop({
    required: true,
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ScopeLookup',
  })
  scope: mongoose.Types.ObjectId;

  @Prop({
    required: true,
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RuleLookup',
  })
  rule: mongoose.Types.ObjectId;

  @Prop({ required: true })
  ruleValue: string;

  @Prop({
    required: true,
    type: mongoose.Schema.Types.ObjectId,
    ref: DiscountBenefits.name,
  })
  discountBenefits: mongoose.Types.ObjectId | DiscountBenefits;
}

export const DiscountRuleSchema = SchemaFactory.createForClass(DiscountRule);

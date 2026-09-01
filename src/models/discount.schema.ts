import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import mongoose from 'mongoose';

import { DiscountBenefits } from './discountBenefits.schema';
import type { FormPermissions } from './permissions.types';
import { Products } from './products.schema';
import { RuleLookup } from './ruleLookup.schema';

export type DiscountDocument = HydratedDocument<Discount>;

@Schema({ timestamps: true })
export class Discount {
  @Prop({ required: false })
  title: string;

  @Prop({ required: false, enum: ['percentage', 'plain'] })
  discountType: 'percentage' | 'plain';

  @Prop({ required: false, type: Number })
  discountValue: number;

  @Prop({ required: false, type: Number })
  maxDiscountAmount: number;

  @Prop({ required: false, type: Number })
  minCartTotal: number;

  @Prop({ required: false, type: Number })
  minQuantity: number;

  @Prop({
    required: false,
    type: [mongoose.Schema.Types.ObjectId],
    ref: Products.name,
  })
  discountProducts: Array<mongoose.Types.ObjectId | Products>;

  @Prop({
    required: false,
    type: mongoose.Schema.Types.ObjectId,
    ref: DiscountBenefits.name,
  })
  discountBenefits: mongoose.Types.ObjectId | DiscountBenefits;

  @Prop({
    required: false,
    type: mongoose.Schema.Types.ObjectId,
    ref: RuleLookup.name,
  })
  discountOn: mongoose.Types.ObjectId | RuleLookup;

  @Prop({
    required: true,
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ScopeLookup',
  })
  scope: mongoose.Types.ObjectId;

  @Prop({ required: false, type: [Date] })
  dateRange: Date[];

  @Prop({ required: false, type: [mongoose.Schema.Types.Mixed] })
  status: any[];
}

export const DiscountSchema = SchemaFactory.createForClass(Discount);

export const DiscountPermissions: FormPermissions = {
  form: {
    read: ['nurse', 'patient'],
    write: ['nurse'],
    edit: ['nurse'],
    delete: ['nurse'],
  },
  fields: {
    title: ['nurse', 'patient'],
  },
};

(
  DiscountSchema as unknown as { formPermissions?: FormPermissions }
).formPermissions = DiscountPermissions;

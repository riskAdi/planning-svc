import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import mongoose from 'mongoose';
import { BuyXGetXFree } from './buyXGetXFree.schema';

export type DiscountBenefitsDocument = HydratedDocument<DiscountBenefits>;

@Schema({ timestamps: true })
export class DiscountBenefits {
  @Prop({ required: false })
  amount: number;

  @Prop({ required: false })
  discountAmountType: string;

  @Prop({ required: false, type: [mongoose.Schema.Types.Mixed] })
  discountType: any[];

  @Prop({ required: false, type: [mongoose.Schema.Types.Mixed] })
  freeShipping: any[];

  @Prop({ required: false, type: [mongoose.Schema.Types.Mixed] })
  gifts: any[];

  @Prop({
    required: false,
    type: mongoose.Schema.Types.ObjectId,
    ref: BuyXGetXFree.name,
  })
  buyXGetXFree: mongoose.Types.ObjectId | BuyXGetXFree;
}

export const DiscountBenefitsSchema =
  SchemaFactory.createForClass(DiscountBenefits);

import type { FormPermissions } from './permissions.types';

export const DiscountBenefitsPermissions: FormPermissions = {
  form: {
    read: ['nurse', 'patient'],
    write: ['nurse', 'patient'],
    edit: ['nurse', 'patient'],
    delete: ['nurse', 'patient'],
  },
  fields: {
    amount: ['nurse', 'patient'],
    discountAmountType: ['nurse', 'patient'],
    discountType: ['nurse', 'patient'],
    freeShipping: ['nurse', 'patient'],
    gifts: ['nurse', 'patient'],
    buyXGetXFree: ['nurse', 'patient'],
  },
};

(
  DiscountBenefitsSchema as unknown as { formPermissions?: FormPermissions }
).formPermissions = DiscountBenefitsPermissions;

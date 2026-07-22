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
  },
};

(
  DiscountBenefitsSchema as unknown as { formPermissions?: FormPermissions }
).formPermissions = DiscountBenefitsPermissions;

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import mongoose from 'mongoose';

import { DiscountRule } from './discountRule.schema';
import { Products } from './products.schema';

export type DiscountDocument = HydratedDocument<Discount>;

@Schema({ timestamps: true })
export class Discount {
  @Prop({ required: false })
  title: string;

  @Prop({ required: false })
  scope: string;

  @Prop({
    required: false,
    type: [mongoose.Schema.Types.ObjectId],
    ref: DiscountRule.name,
  })
  discount_rule: Array<mongoose.Types.ObjectId | DiscountRule>;

  @Prop({
    required: false,
    type: [mongoose.Schema.Types.ObjectId],
    ref: Products.name,
  })
  product_list: Array<mongoose.Types.ObjectId | Products>;

  @Prop({ required: false, type: mongoose.Schema.Types.Mixed })
  productDiscount: any;

  @Prop({ required: false, type: [Date] })
  dateRange: Date[];

  @Prop({ required: false, type: [mongoose.Schema.Types.Mixed] })
  status: any[];
}

export const DiscountSchema = SchemaFactory.createForClass(Discount);

import type { FormPermissions } from './permissions.types';

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

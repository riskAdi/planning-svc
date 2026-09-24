import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

import { applyAutoSlugPolicy } from '../utils/slug-policy.util';

export type BuyXGetXFreeDocument = HydratedDocument<BuyXGetXFree>;

@Schema({ timestamps: true })
export class BuyXGetXFree {
  @Prop({ required: false })
  name: string;

  @Prop({ required: false, trim: true })
  slug: string;
}

export const BuyXGetXFreeSchema = SchemaFactory.createForClass(BuyXGetXFree);

applyAutoSlugPolicy(BuyXGetXFreeSchema);

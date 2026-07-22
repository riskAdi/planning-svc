import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type WeightClassDocument = HydratedDocument<WeightClass>;

@Schema({ timestamps: true })
export class WeightClass {
  @Prop({ required: false })
  name: string;
}

export const WeightClassSchema = SchemaFactory.createForClass(WeightClass);

import type { FormPermissions } from './permissions.types';

export const WeightClassPermissions: FormPermissions = {
  fields: {
    name: ['nurse', 'patient'],
  },
};

(
  WeightClassSchema as unknown as { formPermissions?: FormPermissions }
).formPermissions = WeightClassPermissions;

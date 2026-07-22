import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type LengthClassDocument = HydratedDocument<LengthClass>;

@Schema({ timestamps: true })
export class LengthClass {
  @Prop({ required: false })
  name: string;

  @Prop({ required: false })
  percentage: number;
}

export const LengthClassSchema = SchemaFactory.createForClass(LengthClass);

import type { FormPermissions } from './permissions.types';

export const LengthClassPermissions: FormPermissions = {
  fields: {
    name: ['nurse', 'patient'],
    percentage: ['nurse', 'patient'],
  },
};

(
  LengthClassSchema as unknown as { formPermissions?: FormPermissions }
).formPermissions = LengthClassPermissions;

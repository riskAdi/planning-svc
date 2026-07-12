import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type AgeRangeDocument = HydratedDocument<AgeRange>;

@Schema({ timestamps: true })
export class AgeRange {
  @Prop({ required: false })
  text: string;
}

export const AgeRangeSchema = SchemaFactory.createForClass(AgeRange);

import type { FormPermissions } from './permissions.types';

export const AgeRangePermissions: FormPermissions = {
  fields: {
    text: ['nurse', 'patient'],
  },
};

(
  AgeRangeSchema as unknown as { formPermissions?: FormPermissions }
).formPermissions = AgeRangePermissions;

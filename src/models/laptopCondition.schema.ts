import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type LaptopConditionDocument = HydratedDocument<LaptopCondition>;

@Schema({ timestamps: true })
export class LaptopCondition {
  @Prop({ required: false })
  name: string;
}

export const LaptopConditionSchema =
  SchemaFactory.createForClass(LaptopCondition);

import type { FormPermissions } from './permissions.types';

export const LaptopConditionPermissions: FormPermissions = {
  fields: {
    name: ['nurse', 'patient'],
  },
};

(
  LaptopConditionSchema as unknown as { formPermissions?: FormPermissions }
).formPermissions = LaptopConditionPermissions;

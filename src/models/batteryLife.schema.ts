import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type BatteryLifeDocument = HydratedDocument<BatteryLife>;

@Schema({ timestamps: true })
export class BatteryLife {
  @Prop({ required: false })
  name: string;
}

export const BatteryLifeSchema = SchemaFactory.createForClass(BatteryLife);

import type { FormPermissions } from './permissions.types';

export const BatteryLifePermissions: FormPermissions = {
  fields: {
    name: ['nurse', 'patient'],
  },
};

(
  BatteryLifeSchema as unknown as { formPermissions?: FormPermissions }
).formPermissions = BatteryLifePermissions;

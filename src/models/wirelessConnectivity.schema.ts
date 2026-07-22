import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type WirelessConnectivityDocument =
  HydratedDocument<WirelessConnectivity>;

@Schema({ timestamps: true })
export class WirelessConnectivity {
  @Prop({ required: false })
  name: string;
}

export const WirelessConnectivitySchema =
  SchemaFactory.createForClass(WirelessConnectivity);

import type { FormPermissions } from './permissions.types';

export const WirelessConnectivityPermissions: FormPermissions = {
  fields: {
    name: ['nurse', 'patient'],
  },
};

(
  WirelessConnectivitySchema as unknown as { formPermissions?: FormPermissions }
).formPermissions = WirelessConnectivityPermissions;

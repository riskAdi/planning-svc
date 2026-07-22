import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CameraFrontDocument = HydratedDocument<CameraFront>;

@Schema({ timestamps: true })
export class CameraFront {
  @Prop({ required: false })
  name: string;
}

export const CameraFrontSchema = SchemaFactory.createForClass(CameraFront);

import type { FormPermissions } from './permissions.types';

export const CameraFrontPermissions: FormPermissions = {
  fields: {
    name: ['nurse', 'patient'],
  },
};

(
  CameraFrontSchema as unknown as { formPermissions?: FormPermissions }
).formPermissions = CameraFrontPermissions;

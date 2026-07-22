import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type HardDiskDocument = HydratedDocument<HardDisk>;

@Schema({ timestamps: true })
export class HardDisk {
  @Prop({ required: false })
  name: string;
}

export const HardDiskSchema = SchemaFactory.createForClass(HardDisk);

import type { FormPermissions } from './permissions.types';

export const HardDiskPermissions: FormPermissions = {
  fields: {
    name: ['nurse', 'patient'],
  },
};

(
  HardDiskSchema as unknown as { formPermissions?: FormPermissions }
).formPermissions = HardDiskPermissions;

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CpuManufacturerDocument = HydratedDocument<CpuManufacturer>;

@Schema({ timestamps: true })
export class CpuManufacturer {
  @Prop({ required: false })
  name: string;
}

export const CpuManufacturerSchema =
  SchemaFactory.createForClass(CpuManufacturer);

import type { FormPermissions } from './permissions.types';

export const CpuManufacturerPermissions: FormPermissions = {
  fields: {
    name: ['nurse', 'patient'],
  },
};

(
  CpuManufacturerSchema as unknown as { formPermissions?: FormPermissions }
).formPermissions = CpuManufacturerPermissions;

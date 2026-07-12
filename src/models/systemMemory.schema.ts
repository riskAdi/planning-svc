import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type SystemMemoryDocument = HydratedDocument<SystemMemory>;

@Schema({ timestamps: true })
export class SystemMemory {
  @Prop({ required: false })
  name: string;
}

export const SystemMemorySchema = SchemaFactory.createForClass(SystemMemory);

import type { FormPermissions } from './permissions.types';

export const SystemMemoryPermissions: FormPermissions = {
  fields: {
    name: ['nurse', 'patient'],
  },
};

(
  SystemMemorySchema as unknown as { formPermissions?: FormPermissions }
).formPermissions = SystemMemoryPermissions;

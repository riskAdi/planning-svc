import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type GraphicMemoryDocument = HydratedDocument<GraphicMemory>;

@Schema({ timestamps: true })
export class GraphicMemory {
  @Prop({ required: false })
  name: string;
}

export const GraphicMemorySchema = SchemaFactory.createForClass(GraphicMemory);

import type { FormPermissions } from './permissions.types';

export const GraphicMemoryPermissions: FormPermissions = {
  fields: {
    name: ['nurse', 'patient'],
  },
};

(
  GraphicMemorySchema as unknown as { formPermissions?: FormPermissions }
).formPermissions = GraphicMemoryPermissions;

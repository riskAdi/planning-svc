import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type SystemMemoryDocument = HydratedDocument<SystemMemory>;

@Schema({ timestamps: true })
export class SystemMemory {
  @Prop({ required: false })
  name: string;
}

export const SystemMemorySchema = SchemaFactory.createForClass(SystemMemory);

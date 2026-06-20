import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type GraphicMemoryDocument = HydratedDocument<GraphicMemory>;

@Schema({ timestamps: true })
export class GraphicMemory {
  @Prop({ required: false })
  name: string;
}

export const GraphicMemorySchema = SchemaFactory.createForClass(GraphicMemory);

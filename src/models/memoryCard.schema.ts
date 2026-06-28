import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type MemoryCardDocument = HydratedDocument<MemoryCard>;

@Schema({ timestamps: true })
export class MemoryCard {
  @Prop({ required: false })
  name: string;
}

export const MemoryCardSchema = SchemaFactory.createForClass(MemoryCard);

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type SizeClassDocument = HydratedDocument<SizeClass>;

@Schema({ timestamps: true })
export class SizeClass {
  @Prop({ required: false })
  name: string;
}

export const SizeClassSchema = SchemaFactory.createForClass(SizeClass);

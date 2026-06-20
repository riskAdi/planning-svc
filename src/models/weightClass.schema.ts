import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type WeightClassDocument = HydratedDocument<WeightClass>;

@Schema({ timestamps: true })
export class WeightClass {
  @Prop({ required: false })
  name: string;
}

export const WeightClassSchema = SchemaFactory.createForClass(WeightClass);

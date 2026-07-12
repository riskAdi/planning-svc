import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type FitTypeDocument = HydratedDocument<FitType>;

@Schema({ timestamps: true })
export class FitType {
  @Prop({ required: false })
  text: string;
}

export const FitTypeSchema = SchemaFactory.createForClass(FitType);

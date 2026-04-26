import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type AgeRangeDocument = HydratedDocument<AgeRange>;

@Schema({ timestamps: true })
export class AgeRange {
  @Prop({ required: false })
  text: string;
}

export const AgeRangeSchema = SchemaFactory.createForClass(AgeRange);

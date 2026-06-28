import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type SeasonDocument = HydratedDocument<Season>;

@Schema({ timestamps: true })
export class Season {
  @Prop({ required: false })
  text: string;
}

export const SeasonSchema = SchemaFactory.createForClass(Season);

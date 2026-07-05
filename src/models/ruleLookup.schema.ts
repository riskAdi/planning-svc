import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type RuleLookupDocument = HydratedDocument<RuleLookup>;

@Schema({ timestamps: true })
export class RuleLookup {
  @Prop({ required: false })
  name: string;

  @Prop({ required: false, trim: true })
  slug: string;
}

export const RuleLookupSchema = SchemaFactory.createForClass(RuleLookup);
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ScopeLookupDocument = HydratedDocument<ScopeLookup>;

@Schema({ timestamps: true })
export class ScopeLookup {
  @Prop({ required: false })
  name: string;

  @Prop({ required: false, trim: true })
  slug: string;
}

export const ScopeLookupSchema = SchemaFactory.createForClass(ScopeLookup);
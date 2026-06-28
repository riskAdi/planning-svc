import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type MensTrendDocument = HydratedDocument<MensTrend>;

@Schema({ timestamps: true })
export class MensTrend {
  @Prop({ required: false })
  name: string;
}

export const MensTrendSchema = SchemaFactory.createForClass(MensTrend);

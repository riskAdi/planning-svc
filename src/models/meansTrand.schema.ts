import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';


export type MeansTrandDocument = HydratedDocument<MeansTrand>;

@Schema({ timestamps: true })
export class MeansTrand {
  @Prop({ required: false })
  name: string;
}

export const MeansTrandSchema = SchemaFactory.createForClass(MeansTrand);

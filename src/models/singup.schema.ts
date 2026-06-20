import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import mongoose from 'mongoose';

export type SingupDocument = HydratedDocument<Singup>;

@Schema({ timestamps: true })
export class Singup {
  @Prop({ required: false })
  firstName: string;

  @Prop({ required: false })
  lastName: string;

  @Prop({ required: false })
  gender: string;

  @Prop({ required: false, type: [mongoose.Schema.Types.Mixed] })
  country: any[];

  @Prop({ required: false })
  sponsorship: string;
}

export const SingupSchema = SchemaFactory.createForClass(Singup);

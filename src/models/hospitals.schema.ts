import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';


export type HospitalsDocument = HydratedDocument<Hospitals>;

@Schema({ timestamps: true })
export class Hospitals {
  @Prop({ required: false })
  name: string;

  @Prop({ required: false })
  location: string;

  @Prop({ required: false })
  phone_number: string;
}

export const HospitalsSchema = SchemaFactory.createForClass(Hospitals);

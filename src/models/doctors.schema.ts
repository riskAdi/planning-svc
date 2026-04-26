import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import mongoose from 'mongoose';

import { Hospitals } from './hospitals.schema';
import { Nurse } from './nurse.schema';

export type DoctorsDocument = HydratedDocument<Doctors>;

@Schema({ timestamps: true })
export class Doctors {
  @Prop({ required: false })
  first_name: string;

  @Prop({ required: false })
  last_name: string;

  @Prop({ required: false })
  phone_number: string;

  @Prop({ required: false })
  email: string;

  @Prop({ required: false })
  location: string;

  @Prop({ required: false })
  gender: string;

  @Prop({ required: false })
  specialty: string;

  @Prop({
    required: false,
    type: mongoose.Schema.Types.ObjectId,
    ref: Hospitals.name,
  })
  hospital: mongoose.Types.ObjectId | Hospitals;

  @Prop({
    required: false,
    type: mongoose.Schema.Types.ObjectId,
    ref: Nurse.name,
  })
  nurse: mongoose.Types.ObjectId | Nurse;

  @Prop({ required: false })
  search: string;
}

export const DoctorsSchema = SchemaFactory.createForClass(Doctors);

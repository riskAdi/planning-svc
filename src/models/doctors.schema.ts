import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import mongoose from 'mongoose';


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

  @Prop({ required: false, type: mongoose.Schema.Types.Mixed })
  hospital: any;

  @Prop({ required: false, type: mongoose.Schema.Types.Mixed })
  nurse: any;

  @Prop({ required: false })
  search: string;
}

export const DoctorsSchema = SchemaFactory.createForClass(Doctors);

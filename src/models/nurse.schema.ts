import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import mongoose from 'mongoose';


export type NurseDocument = HydratedDocument<Nurse>;

@Schema({ timestamps: true })
export class Nurse {
  @Prop({ required: false })
  firstName: string;

  @Prop({ required: false })
  lastName: string;

  @Prop({ required: false })
  phoneNumber: string;

  @Prop({ required: false, type: [String] })
  bestTimeToReachYou: string[];

  @Prop({ required: false, type: [String] })
  preferredContactMethod: string[];

  @Prop({ required: false })
  gender: string;

  @Prop({ required: false, type: mongoose.Schema.Types.Mixed })
  patient: any;

  @Prop({ required: false, type: mongoose.Schema.Types.Mixed })
  hospitals: any;

  @Prop({ required: false })
  patientsFilter: string;

  @Prop({ required: false })
  dropW: string;

  @Prop({ required: false, type: mongoose.Schema.Types.Mixed })
  btn: any;

  @Prop({ required: false })
  admission_date: Date;

  @Prop({ required: false })
  search: string;
}

export const NurseSchema = SchemaFactory.createForClass(Nurse);

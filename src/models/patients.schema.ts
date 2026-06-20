import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type PatientsDocument = HydratedDocument<Patients>;

@Schema({ timestamps: true })
export class Patients {
  @Prop({ required: false })
  patient_name: string;

  @Prop({ required: false })
  patient_age: number;

  @Prop({ required: false })
  insurance_provider: string;

  @Prop({ required: false })
  admission_date: Date;

  @Prop({ required: false })
  search: string;
}

export const PatientsSchema = SchemaFactory.createForClass(Patients);

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';


export type EducationDocument = HydratedDocument<Education>;

@Schema({ timestamps: true })
export class Education {
  @Prop({ required: false })
  title: string;

  @Prop({ required: false })
  university: string;

  @Prop({ required: false })
  year: string;

  @Prop({ required: false })
  country: string;
}

export const EducationSchema = SchemaFactory.createForClass(Education);

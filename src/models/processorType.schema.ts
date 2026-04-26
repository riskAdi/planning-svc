import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';


export type ProcessorTypeDocument = HydratedDocument<ProcessorType>;

@Schema({ timestamps: true })
export class ProcessorType {
  @Prop({ required: false })
  name: string;
}

export const ProcessorTypeSchema = SchemaFactory.createForClass(ProcessorType);

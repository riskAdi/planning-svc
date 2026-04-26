import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';


export type InsuranceProvidersDocument = HydratedDocument<InsuranceProviders>;

@Schema({ timestamps: true })
export class InsuranceProviders {
  @Prop({ required: false })
  name: string;
}

export const InsuranceProvidersSchema = SchemaFactory.createForClass(InsuranceProviders);

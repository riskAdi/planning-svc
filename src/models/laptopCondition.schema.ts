import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';


export type LaptopConditionDocument = HydratedDocument<LaptopCondition>;

@Schema({ timestamps: true })
export class LaptopCondition {
  @Prop({ required: false })
  name: string;
}

export const LaptopConditionSchema = SchemaFactory.createForClass(LaptopCondition);

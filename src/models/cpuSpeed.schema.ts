import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';


export type CpuSpeedDocument = HydratedDocument<CpuSpeed>;

@Schema({ timestamps: true })
export class CpuSpeed {
  @Prop({ required: false })
  name: string;
}

export const CpuSpeedSchema = SchemaFactory.createForClass(CpuSpeed);

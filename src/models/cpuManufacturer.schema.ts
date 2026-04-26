import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';


export type CpuManufacturerDocument = HydratedDocument<CpuManufacturer>;

@Schema({ timestamps: true })
export class CpuManufacturer {
  @Prop({ required: false })
  name: string;
}

export const CpuManufacturerSchema = SchemaFactory.createForClass(CpuManufacturer);

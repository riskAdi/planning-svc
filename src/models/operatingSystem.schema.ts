import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';


export type OperatingSystemDocument = HydratedDocument<OperatingSystem>;

@Schema({ timestamps: true })
export class OperatingSystem {
  @Prop({ required: false })
  name: string;
}

export const OperatingSystemSchema = SchemaFactory.createForClass(OperatingSystem);

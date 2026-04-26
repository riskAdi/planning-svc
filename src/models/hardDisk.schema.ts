import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';


export type HardDiskDocument = HydratedDocument<HardDisk>;

@Schema({ timestamps: true })
export class HardDisk {
  @Prop({ required: false })
  name: string;
}

export const HardDiskSchema = SchemaFactory.createForClass(HardDisk);

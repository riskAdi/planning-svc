import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';


export type WirelessConnectivityDocument = HydratedDocument<WirelessConnectivity>;

@Schema({ timestamps: true })
export class WirelessConnectivity {
  @Prop({ required: false })
  name: string;
}

export const WirelessConnectivitySchema = SchemaFactory.createForClass(WirelessConnectivity);

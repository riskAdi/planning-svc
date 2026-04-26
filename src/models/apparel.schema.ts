import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';


export type ApparelDocument = HydratedDocument<Apparel>;

@Schema({ timestamps: true })
export class Apparel {
  @Prop({ required: false })
  name: string;
}

export const ApparelSchema = SchemaFactory.createForClass(Apparel);

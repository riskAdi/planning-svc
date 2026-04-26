import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';


export type ClothingStyleDocument = HydratedDocument<ClothingStyle>;

@Schema({ timestamps: true })
export class ClothingStyle {
  @Prop({ required: false })
  name: string;
}

export const ClothingStyleSchema = SchemaFactory.createForClass(ClothingStyle);

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';


export type ClothingMaterialDocument = HydratedDocument<ClothingMaterial>;

@Schema({ timestamps: true })
export class ClothingMaterial {
  @Prop({ required: false })
  name: string;
}

export const ClothingMaterialSchema = SchemaFactory.createForClass(ClothingMaterial);

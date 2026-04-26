import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';


export type ModelSizeDocument = HydratedDocument<ModelSize>;

@Schema({ timestamps: true })
export class ModelSize {
  @Prop({ required: false })
  text: string;
}

export const ModelSizeSchema = SchemaFactory.createForClass(ModelSize);

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import mongoose from 'mongoose';

import { ProductModelSize } from './productModelSize.schema';

export type ProductsModelDocument = HydratedDocument<ProductsModel>;

@Schema({ timestamps: true })
export class ProductsModel {
  @Prop({ required: false })
  colors: string;

  @Prop({ required: false, type: mongoose.Schema.Types.Mixed })
  images: any;

  @Prop({
    required: false,
    type: [mongoose.Schema.Types.ObjectId],
    ref: ProductModelSize.name,
  })
  productModelSize: Array<mongoose.Types.ObjectId | ProductModelSize>;
}

export const ProductsModelSchema = SchemaFactory.createForClass(ProductsModel);

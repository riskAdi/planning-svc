import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import mongoose from 'mongoose';

import { ColorsClass } from './colorsClass.schema';
import { ProductModelSize } from './productModelSize.schema';

export type ProductsModelDocument = HydratedDocument<ProductsModel>;

@Schema({ timestamps: true })
export class ProductsModel {
  @Prop({
    required: false,
    type: mongoose.Schema.Types.ObjectId,
    ref: ColorsClass.name,
  })
  colors: mongoose.Types.ObjectId | ColorsClass;

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

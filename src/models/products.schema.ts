import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import mongoose from 'mongoose';

export type ProductsDocument = HydratedDocument<Products>;

type ProductImage = {
  name?: string;
  status?: string;
  uid?: string;
  url?: string;
  [key: string]: unknown;
};

@Schema({ timestamps: true })
export class Products {
  @Prop({ required: false })
  name: string;

  @Prop({ required: false })
  sku: string;

  @Prop({ required: false })
  price: number;

  @Prop({ required: false, type: [mongoose.Schema.Types.Mixed] })
  toggleSpecialPrice: any[];

  @Prop({ required: false })
  specialPrice: number;

  @Prop({ required: false, type: [mongoose.Schema.Types.Mixed] })
  toggleSaleLabel: any[];

  @Prop({ required: false })
  saleLabel: string;

  @Prop({
    required: false,
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SubCategory',
  })
  category: mongoose.Types.ObjectId;

  @Prop({ required: false, type: mongoose.Schema.Types.Mixed })
  mainImage: ProductImage;

  @Prop({ required: false, type: mongoose.Schema.Types.Mixed })
  hoverImage: ProductImage;

  @Prop({ required: false })
  search: string;
}

export const ProductsSchema = SchemaFactory.createForClass(Products);

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import mongoose from 'mongoose';

import { Products } from './products.schema';
import { ColorsClass } from './colorsClass.schema';
import { ModelSize } from './modelSize.schema';

export type OrderProductsDocument = HydratedDocument<OrderProducts>;

@Schema({ timestamps: true })
export class OrderProducts {
  @Prop({ required: true })
  quantity: number;

  @Prop({
    required: true,
    type: mongoose.Schema.Types.ObjectId,
    ref: Products.name,
  })
  product: mongoose.Types.ObjectId | Products;

  @Prop({
    required: true,
    type: mongoose.Schema.Types.ObjectId,
    ref: ModelSize.name,
  })
  size: mongoose.Types.ObjectId | ModelSize;

  @Prop({
    required: true,
    type: mongoose.Schema.Types.ObjectId,
    ref: ColorsClass.name,
  })
  color: mongoose.Types.ObjectId | ColorsClass;

  @Prop({ required: false })
  productName?: string;

  @Prop({ required: false })
  productUnitPrice?: number;
}

export const OrderProductsSchema = SchemaFactory.createForClass(OrderProducts);

function toObjectIdLike(value: unknown): mongoose.Types.ObjectId | null {
  if (value instanceof mongoose.Types.ObjectId) {
    return value;
  }

  if (typeof value === 'string' && mongoose.isValidObjectId(value)) {
    return new mongoose.Types.ObjectId(value);
  }

  if (!value || typeof value !== 'object') {
    return null;
  }

  const nestedId =
    (value as { _id?: unknown })._id ?? (value as { id?: unknown }).id;

  if (nestedId instanceof mongoose.Types.ObjectId) {
    return nestedId;
  }

  if (typeof nestedId === 'string' && mongoose.isValidObjectId(nestedId)) {
    return new mongoose.Types.ObjectId(nestedId);
  }

  return null;
}

OrderProductsSchema.pre(
  'save',
  async function setProductSnapshot(this: OrderProductsDocument) {
    if (!this.isNew) {
      return;
    }

    if (this.productName !== undefined && this.productUnitPrice !== undefined) {
      return;
    }

    const productId = toObjectIdLike(this.product);
    if (!productId) {
      return;
    }

    const productModel = this.model(Products.name);
    const product = (await productModel
      .findById(productId)
      .select('name price')
      .lean()
      .exec()) as { name?: unknown; price?: unknown } | null;

    if (!product) {
      return;
    }

    if (typeof product.name === 'string') {
      this.productName = product.name;
    }

    if (typeof product.price === 'number' && Number.isFinite(product.price)) {
      this.productUnitPrice = product.price;
    }
  },
);

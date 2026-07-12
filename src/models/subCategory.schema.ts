import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';

import { Category } from './category.schema';

export type SubCategoryDocument = HydratedDocument<SubCategory>;

@Schema({ timestamps: true })
export class SubCategory {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, trim: true, lowercase: true })
  slug: string;

  @Prop({ required: false, trim: true })
  description: string;

  @Prop({ required: false, trim: true })
  image: string;

  @Prop({
    required: true,
    type: mongoose.Schema.Types.ObjectId,
    ref: Category.name,
  })
  category: mongoose.Types.ObjectId | Category;

  @Prop({ required: false, default: true })
  isActive: boolean;

  @Prop({ required: false, default: 0 })
  sortOrder: number;
}

export const SubCategorySchema = SchemaFactory.createForClass(SubCategory);

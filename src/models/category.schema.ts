import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';

import { applyAutoSlugPolicy } from '../utils/slug-policy.util';

export type CategoryDocument = HydratedDocument<Category>;

@Schema({ timestamps: true })
export class Category {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, trim: true, lowercase: true })
  slug: string;

  @Prop({ required: false, trim: true })
  description: string;

  @Prop({ required: false, trim: true })
  image: string;

  @Prop({
    required: false,
    default: null,
    type: mongoose.Schema.Types.ObjectId,
    ref: Category.name,
  })
  parentId: mongoose.Types.ObjectId | Category | null;

  @Prop({ required: false, default: true })
  isActive: boolean;

  @Prop({ required: false, default: 0 })
  sortOrder: number;
}

export const CategorySchema = SchemaFactory.createForClass(Category);

applyAutoSlugPolicy(CategorySchema);

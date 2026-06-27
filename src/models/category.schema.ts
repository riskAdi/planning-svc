import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

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

  @Prop({ required: false, default: true })
  isActive: boolean;

  @Prop({ required: false, default: 0 })
  sortOrder: number;
}

export const CategorySchema = SchemaFactory.createForClass(Category);

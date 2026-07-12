import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ClothingMaterialDocument = HydratedDocument<ClothingMaterial>;

@Schema({ timestamps: true })
export class ClothingMaterial {
  @Prop({ required: false })
  name: string;
}

export const ClothingMaterialSchema =
  SchemaFactory.createForClass(ClothingMaterial);

import type { FormPermissions } from './permissions.types';

export const ClothingMaterialPermissions: FormPermissions = {
  fields: {
    name: ['nurse', 'patient'],
  },
};

(
  ClothingMaterialSchema as unknown as { formPermissions?: FormPermissions }
).formPermissions = ClothingMaterialPermissions;

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ColorsClassDocument = HydratedDocument<ColorsClass>;

@Schema({ timestamps: true })
export class ColorsClass {
  @Prop({ required: false })
  name: string;
}

export const ColorsClassSchema = SchemaFactory.createForClass(ColorsClass);

import type { FormPermissions } from './permissions.types';

export const ColorsClassPermissions: FormPermissions = {
  fields: {
    name: ['nurse', 'patient'],
  },
};

(
  ColorsClassSchema as unknown as { formPermissions?: FormPermissions }
).formPermissions = ColorsClassPermissions;

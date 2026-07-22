import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type PantsFlyDocument = HydratedDocument<PantsFly>;

@Schema({ timestamps: true })
export class PantsFly {
  @Prop({ required: false })
  name: string;
}

export const PantsFlySchema = SchemaFactory.createForClass(PantsFly);

import type { FormPermissions } from './permissions.types';

export const PantsFlyPermissions: FormPermissions = {
  fields: {
    name: ['nurse', 'patient'],
  },
};

(
  PantsFlySchema as unknown as { formPermissions?: FormPermissions }
).formPermissions = PantsFlyPermissions;

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ApparelDocument = HydratedDocument<Apparel>;

@Schema({ timestamps: true })
export class Apparel {
  @Prop({ required: false })
  name: string;
}

export const ApparelSchema = SchemaFactory.createForClass(Apparel);

import type { FormPermissions } from './permissions.types';

export const ApparelPermissions: FormPermissions = {
  fields: {
    name: ['nurse', 'patient'],
  },
};

(
  ApparelSchema as unknown as { formPermissions?: FormPermissions }
).formPermissions = ApparelPermissions;

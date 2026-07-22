import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type MensTrendDocument = HydratedDocument<MensTrend>;

@Schema({ timestamps: true })
export class MensTrend {
  @Prop({ required: false })
  name: string;
}

export const MensTrendSchema = SchemaFactory.createForClass(MensTrend);

import type { FormPermissions } from './permissions.types';

export const MensTrendPermissions: FormPermissions = {
  fields: {
    name: ['nurse', 'patient'],
  },
};

(
  MensTrendSchema as unknown as { formPermissions?: FormPermissions }
).formPermissions = MensTrendPermissions;

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type InsuranceProvidersDocument = HydratedDocument<InsuranceProviders>;

@Schema({ timestamps: true })
export class InsuranceProviders {
  @Prop({ required: false })
  name: string;
}

export const InsuranceProvidersSchema =
  SchemaFactory.createForClass(InsuranceProviders);

import type { FormPermissions } from './permissions.types';

export const InsuranceProvidersPermissions: FormPermissions = {
  fields: {
    name: ['nurse', 'patient'],
  },
};

(
  InsuranceProvidersSchema as unknown as { formPermissions?: FormPermissions }
).formPermissions = InsuranceProvidersPermissions;

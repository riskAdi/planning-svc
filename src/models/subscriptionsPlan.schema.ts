import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type SubscriptionsPlanDocument = HydratedDocument<SubscriptionsPlan>;

@Schema({ timestamps: true })
export class SubscriptionsPlan {
  @Prop({ required: false })
  name: string;
}

export const SubscriptionsPlanSchema =
  SchemaFactory.createForClass(SubscriptionsPlan);

import type { FormPermissions } from './permissions.types';

export const SubscriptionsPlanPermissions: FormPermissions = {
  fields: {
    name: ['nurse', 'patient'],
  },
};

(
  SubscriptionsPlanSchema as unknown as { formPermissions?: FormPermissions }
).formPermissions = SubscriptionsPlanPermissions;

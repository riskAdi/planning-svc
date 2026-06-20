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

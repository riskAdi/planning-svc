import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CustomersDocument = HydratedDocument<Customers>;

@Schema({ timestamps: true })
export class Customers {
  @Prop({ required: false })
  first_name: string;

  @Prop({ required: false })
  last_name: string;

  @Prop({ required: false })
  phone_number: string;

  @Prop({ required: false })
  email: string;

  @Prop({ required: false })
  location: string;

  @Prop({ required: false })
  gender: string;

  @Prop({ required: false })
  search: string;

  @Prop({ required: false })
  orderType: string;

  @Prop({ required: false })
  duration: string;

  @Prop({ required: false })
  status: string;

  @Prop({ required: false })
  orderDate: string;

  @Prop({ required: false })
  dateRange: Date;

  @Prop({ required: false })
  pickupStatus: string;
}

export const CustomersSchema = SchemaFactory.createForClass(Customers);

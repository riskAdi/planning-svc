import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';


export type AddressDocument = HydratedDocument<Address>;

@Schema({ timestamps: true })
export class Address {
  @Prop({ required: false })
  name: string;

  @Prop({ required: false })
  location: string;

  @Prop({ required: false })
  phone_number: string;

  @Prop({ required: false })
  country: string;
}

export const AddressSchema = SchemaFactory.createForClass(Address);

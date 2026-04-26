import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';


export type InputOutputPortsDocument = HydratedDocument<InputOutputPorts>;

@Schema({ timestamps: true })
export class InputOutputPorts {
  @Prop({ required: false })
  name: string;
}

export const InputOutputPortsSchema = SchemaFactory.createForClass(InputOutputPorts);

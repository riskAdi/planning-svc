import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type GraphicCardDocument = HydratedDocument<GraphicCard>;

@Schema({ timestamps: true })
export class GraphicCard {
  @Prop({ required: false })
  name: string;
}

export const GraphicCardSchema = SchemaFactory.createForClass(GraphicCard);

import type { FormPermissions } from './permissions.types';

export const GraphicCardPermissions: FormPermissions = {
  fields: {
    name: ['nurse', 'patient'],
  },
};

(
  GraphicCardSchema as unknown as { formPermissions?: FormPermissions }
).formPermissions = GraphicCardPermissions;

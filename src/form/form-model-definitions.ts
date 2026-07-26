import { ModelDefinition } from '@nestjs/mongoose';
import { Schema } from 'mongoose';

import * as Models from '../models';

const auditChangeSchema = new Schema(
  {
    path: { type: String, required: true },
    from: { type: Schema.Types.Mixed, required: false },
    to: { type: Schema.Types.Mixed, required: false },
  },
  { _id: false },
);

const auditEntrySchema = new Schema(
  {
    changedAt: { type: Date, required: true, default: Date.now },
    actorRole: { type: String, required: false },
    changedFields: { type: [auditChangeSchema], default: [] },
  },
  { _id: false },
);

function ensureAuditField(schema: Schema): void {
  if (schema.path('audit')) {
    return;
  }

  schema.add({
    audit: {
      type: [auditEntrySchema],
      default: [],
    },
  });
}

/**
 * Builds Mongoose model definitions from `src/models/*`.
 *
 * Convention:
 * - `<Entity>` is the exported class decorated with `@Schema()`
 * - `<Entity>Schema` is the exported schema created via `SchemaFactory.createForClass(<Entity>)`
 */
export const FORM_MODEL_DEFINITIONS: ModelDefinition[] = Object.entries(Models)
  .filter(
    ([exportName, value]) =>
      exportName.endsWith('Schema') && value instanceof Schema,
  )
  .map(([schemaExportName, schema]) => {
    ensureAuditField(schema as Schema);

    const classExportName = schemaExportName.replace(/Schema$/, '');
    const schemaClass = (Models as Record<string, unknown>)[classExportName];
    if (typeof schemaClass !== 'function') return null;
    return { name: schemaClass.name, schema };
  })
  .filter((x): x is ModelDefinition => x !== null);

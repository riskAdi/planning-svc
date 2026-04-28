import { ModelDefinition } from '@nestjs/mongoose';

import * as Models from '../models';

/**
 * Builds Mongoose model definitions from `src/models/*`.
 *
 * Convention:
 * - `<Entity>` is the exported class decorated with `@Schema()`
 * - `<Entity>Schema` is the exported schema created via `SchemaFactory.createForClass(<Entity>)`
 */
export const FORM_MODEL_DEFINITIONS: ModelDefinition[] = Object.entries(Models)
  .filter(([exportName]) => exportName.endsWith('Schema'))
  .map(([schemaExportName, schema]) => {
    const classExportName = schemaExportName.replace(/Schema$/, '');
    const schemaClass = (Models as Record<string, unknown>)[classExportName];
    if (typeof schemaClass !== 'function') return null;
    return { name: schemaClass.name, schema };
  })
  .filter((x): x is ModelDefinition => x !== null);

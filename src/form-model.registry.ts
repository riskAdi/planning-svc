import mongoose, { Model, Schema } from 'mongoose';

import * as modelExports from './models';

export const FORM_MODEL_REGISTRY = Symbol('FORM_MODEL_REGISTRY');

export type AccessPermissions =
  | string[]
  | {
      read?: string[];
      write?: string[];
      edit?: string[];
      delete?: string[];
    };

export interface FormModelDefinition {
  modelName: string;
  formNames: string[];
  model: Model<any>;
  searchableFields: string[];
  relations: string[];
  permissions?: {
    form?: AccessPermissions;
    fields?: Record<string, AccessPermissions>;
  };
}

export type FormModelRegistry = Record<string, FormModelDefinition>;

const RESERVED_SCHEMA_PATHS = new Set(['_id', '__v', 'createdAt', 'updatedAt']);

function toCamelCase(value: string): string {
  return value.charAt(0).toLowerCase() + value.slice(1);
}

function toKebabCase(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[_\s]+/g, '-')
    .toLowerCase();
}

function toSnakeCase(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[-\s]+/g, '_')
    .toLowerCase();
}

function getSearchableFields(schema: Schema): string[] {
  return Object.entries(schema.paths)
    .filter(([path, schemaType]) => {
      return (
        !RESERVED_SCHEMA_PATHS.has(path) &&
        schemaType.instance === 'String' &&
        !path.includes('.')
      );
    })
    .map(([path]) => path);
}

function getRefFromSchemaType(schemaType: {
  options?: { ref?: string };
  caster?: { options?: { ref?: string } };
}): string | undefined {
  return schemaType.options?.ref ?? schemaType.caster?.options?.ref;
}

function getRelationPaths(schema: Schema): string[] {
  return Object.entries(schema.paths)
    .filter(([path, schemaType]) => {
      return (
        !RESERVED_SCHEMA_PATHS.has(path) &&
        Boolean(getRefFromSchemaType(schemaType))
      );
    })
    .map(([path]) => path);
}

function getPermissions(
  schema: Schema,
): FormModelDefinition['permissions'] | undefined {
  const schemaWithPermissions = schema as Schema & {
    formPermissions?: FormModelDefinition['permissions'];
  };

  return schemaWithPermissions.formPermissions;
}

function buildFormNames(modelName: string): string[] {
  return Array.from(
    new Set([
      modelName,
      modelName.toLowerCase(),
      toCamelCase(modelName),
      toKebabCase(modelName),
      toSnakeCase(modelName),
    ]),
  );
}

export function createFormModelRegistry(): FormModelRegistry {
  const registry: FormModelRegistry = {};

  Object.entries(modelExports)
    .filter(([key, value]) => key.endsWith('Schema') && value instanceof Schema)
    .forEach(([schemaExportName, schema]) => {
      const modelName = schemaExportName.replace(/Schema$/, '');
      const existingModel = mongoose.models[modelName] as
        | Model<any>
        | undefined;
      const model =
        existingModel ??
        (mongoose.model(modelName, schema as Schema) as Model<any>);
      const definition: FormModelDefinition = {
        modelName,
        formNames: buildFormNames(modelName),
        model,
        searchableFields: getSearchableFields(schema as Schema),
        relations: getRelationPaths(schema as Schema),
        permissions: getPermissions(schema as Schema),
      };

      definition.formNames.forEach((formName) => {
        registry[formName.toLowerCase()] = definition;
      });
    });

  return registry;
}

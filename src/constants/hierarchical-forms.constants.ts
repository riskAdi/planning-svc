export type HierarchicalFormConfig = {
  modelName: string;
  idField: string;
  parentField: string;
  childrenField: string;
};

export const HIERARCHICAL_FORM_CONFIGS: readonly HierarchicalFormConfig[] =
  Object.freeze([
    {
      modelName: 'Category',
      idField: 'id',
      parentField: 'parentId',
      childrenField: 'children',
    },
  ]);

const HIERARCHICAL_FORM_CONFIGS_BY_MODEL = new Map(
  HIERARCHICAL_FORM_CONFIGS.map((config) => [config.modelName, config]),
);

export function getHierarchicalFormConfigByModelName(
  modelName: string,
): HierarchicalFormConfig | undefined {
  return HIERARCHICAL_FORM_CONFIGS_BY_MODEL.get(modelName);
}

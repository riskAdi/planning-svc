export type AccessPermissions =
  | string[]
  | {
      read?: string[];
      write?: string[];
      edit?: string[];
      delete?: string[];
    };

export type FormPermissions = {
  form?: AccessPermissions;
  fields?: Record<string, AccessPermissions>;
};

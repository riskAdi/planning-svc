export type MockRoleContext = {
  role: string;
};

const DEFAULT_TEST_ROLE = 'nurse';

export function getMockRoleContext(): MockRoleContext | undefined {
  if (process.env.NODE_ENV !== 'test') {
    return undefined;
  }

  return {
    role: DEFAULT_TEST_ROLE,
  };
}

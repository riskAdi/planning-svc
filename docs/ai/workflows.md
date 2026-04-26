# Workflows

## Making a change

- Keep diffs small and scoped.
- Update or add tests that cover the behavior change.
- Run:
  - `pnpm run lint`
  - `pnpm run test`

## Adding new API endpoints

- Add a controller method in `src/controllers`.
- Put business logic in a service in `src/services`.
- If persistence is needed:
  - define schema in `src/models`
  - export it from `src/models/index.ts`
  - register the model with `MongooseModule.forFeature(...)` in the relevant module

## Common gotchas in this repo

- This repo uses **pnpm**, not npm/yarn.
- Prefer consistent naming for schema files to avoid duplicates.


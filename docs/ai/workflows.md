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

## Adding a new response enricher

- Implement `ResponseEnricher` in `src/services/*-enricher.ts`.
- Scope by form using `supports(context)` (example: `products`, `orders`).
- In `enrich(records, context)`, use batched lookups (`$in`) and in-memory maps.
- Return additive computed fields and keep base payload intact.
- Register enricher provider in `src/form/form.module.ts`.
- Add it to `ResponseEnrichmentService` orchestrator.
- Add focused tests for matching, computed output, and fallback behavior.

## Common gotchas in this repo

- This repo uses **pnpm**, not npm/yarn.
- Prefer consistent naming for schema files to avoid duplicates.


# Claude configuration (project instructions)

This repository is a **NestJS (TypeScript) service** managed with **pnpm** and using **Mongoose**.
Use these instructions when writing code, tests, and documentation in this repo.

## Ground rules

- **Prefer small, reviewable changes**. Keep diffs focused.
- **Do not commit secrets**. Never add real credentials, tokens, private keys, or production connection strings.
- **Match existing style**: TypeScript + ESLint + Prettier. Avoid introducing new patterns unless necessary.
- **Be explicit about breaking changes** and migrations if you introduce them.

## Commands

- **Install**: `pnpm install`
- **Dev**: `pnpm run start:dev`
- **Test**: `pnpm run test`
- **Lint/format**: `pnpm run lint` and `pnpm run format`

## Code organization expectations (NestJS)

- Controllers: `src/controllers/**`
- Services: `src/services/**`
- Models/schemas: `src/models/**` (Mongoose schemas + exported types)
- Main module wiring: `src/app.module.ts` (and feature modules if/when introduced)

When adding a new domain area, prefer a feature module layout (module + controller + service + schemas) rather than expanding `AppModule` indefinitely.

## Testing expectations

- Use Jest (`*.spec.ts`).
- Add/adjust tests when changing behavior.
- Prefer testing controller/service behavior via Nest testing module over direct instantiation when dependencies exist.

## Database / Mongoose

- Keep schema names consistent and export from `src/models/index.ts`.
- Avoid circular imports: prefer injecting models via `@nestjs/mongoose` patterns.
- Validate inputs at the API boundary (DTOs / validation) before persisting.

## How to respond in PR-ready form

When implementing a change, provide:

- A short summary of what changed and why
- How to run tests / verify locally (exact commands)
- Any follow-ups (tech debt, migrations, env vars)


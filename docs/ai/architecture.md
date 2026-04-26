# Architecture

## High-level pattern

This service follows standard **NestJS layered architecture**:

- **Controllers** expose HTTP endpoints and handle request/response shaping.
- **Services** contain business logic and orchestrate persistence.
- **Models/Schemas** define persisted shapes using **Mongoose**.

Keep controllers thin; push logic into services.

## Component map

### Modules

- `src/app.module.ts` composes the application module graph.
- As the app grows, prefer feature modules (e.g. `src/modules/<feature>/*`) to avoid a monolithic `AppModule`.

### Controllers

- Location: `src/controllers`
- Responsibility: routing, DTO/validation boundary, response formatting

### Services

- Location: `src/services`
- Responsibility: domain logic, calling repositories/models, transactional orchestration (as applicable)

### Schemas / Models

- Location: `src/models`
- Responsibility: Mongoose schema definitions and exported types
- Shared exports: `src/models/index.ts`

## Data flow (typical request)

1. Request hits a controller route handler.
2. Controller validates/parses inputs (DTOs/validation when present).
3. Controller calls a service method with normalized inputs.
4. Service reads/writes MongoDB via Mongoose models.
5. Service returns domain result to controller.
6. Controller maps to HTTP response.

## Testing strategy

- **Unit/integration** tests use **Jest** (`*.spec.ts`).
- Prefer Nest’s testing utilities (`@nestjs/testing`) when wiring/injection matters.
- When changing behavior, update/add tests that demonstrate:
  - expected output
  - error cases / validation boundaries

## Operational notes (to standardize as project matures)

Document these once they exist in the repo:

- **Configuration**: required env vars (names only), config module approach, defaults for local dev
- **Database**: how models are registered (`MongooseModule.forFeature`), indexing strategy, migrations strategy (if any)
- **Observability**: logging format, tracing, metrics, error reporting
- **API**: versioning strategy, authn/authz approach, OpenAPI/Swagger approach (if added)


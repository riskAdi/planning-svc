# Conventions (NestJS + Mongoose)

## File placement

- **Controllers**: `src/controllers/*.controller.ts`
- **Services**: `src/services/*.service.ts`
- **Schemas/models**: `src/models/*.schema.ts`
- **Barrel exports**: `src/models/index.ts` for schemas/types used elsewhere

## Naming

- **Controller class**: `XyzController`
- **Service class**: `XyzService`
- **Schema file**: `xyz.schema.ts`
- **Schema constant**: `XyzSchema`
- **Schema name**: `Xyz` (singular, PascalCase)

## NestJS patterns

- Prefer constructor injection over static access.
- Keep controllers thin; put domain logic in services.
- If a controller grows, split into a feature module (e.g. `src/modules/xyz/*`).

## Mongoose patterns

- Use `@Schema()` + `SchemaFactory.createForClass()` style.
- Avoid ambiguous schema filenames (no duplicates like `lengthClass` vs `length_class`).
- Ensure schema exports are consistent and re-exported from `src/models/index.ts`.


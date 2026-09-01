# Response Enrichment Architecture

## Purpose

Response enrichment is the post-fetch layer used to compute dynamic values before sending API responses.

Use this when:
- a value should be computed at read time
- logic depends on multiple collections (for example promotions)
- you do not want to persist derived values in base documents

---

## Where it runs in request flow

For `find` and `findById`:
1. Data is fetched from MongoDB
2. IDs are normalized and read permissions are applied
3. Audit fields are sanitized
4. `ResponseEnrichmentService` runs matching enrichers
5. Final response is returned

This means enrichers work on already-safe response payloads.

---

## Core components

### 1) Enricher contracts

Defined in `src/services/response-enricher.types.ts`:
- `EnrichmentContext`
- `EnrichableRecord`
- `ResponseEnricher` interface

Every enricher must implement:
- `supports(context)` to scope by formName
- `enrich(records, context)` to compute and return enriched records

### 2) Enrichment orchestrator

`src/services/response-enrichment.service.ts`:
- Keeps ordered list of enrichers
- Calls only enrichers that return true from `supports`
- Applies enrichers sequentially so each can build on previous output

### 3) Concrete enrichers

Example: `src/services/product-promotion.enricher.ts`
- active only for `formName = products`
- batches product IDs
- loads promotion links in one query
- appends computed fields (`isPromotionProduct`, `promotionMatchCount`)

---

## How to add a new enricher for a new form

### Step 1: Create enricher class

Create a new file in `src/services`, for example:
- `order-promotion.enricher.ts`

Implement `ResponseEnricher` and scope it with `supports`:
- `return context.formName.toLowerCase() === 'orders'`

### Step 2: Implement `enrich` with batched queries

Rules:
- never query per record (avoid N+1)
- collect IDs from all records
- query related models using `$in`
- build lookup maps and merge results in memory

### Step 3: Make it fail-safe

If enrichment fails:
- catch errors
- return original records unchanged

Do not block base API responses for enrichment-only failures.

### Step 4: Register provider

Add the enricher to `src/form/form.module.ts` providers.

Then include it in `ResponseEnrichmentService` constructor/list.

### Step 5: Verify behavior

Run:
- `pnpm run lint`
- `pnpm run test`

Add focused tests for:
- form matching in `supports`
- correct computed fields
- fallback behavior when dependent data is missing

---

## Design guidelines

- Keep enrichers stateless and deterministic.
- Avoid mutating inputs in place; return new objects.
- Keep compute logic in enrichers, not in controllers.
- Keep base query logic in `FormQueryService`; enrichers are post-processing only.
- Prefer additive fields in response (for backward compatibility).

---

## Current limitation and extension point

Current promotion enricher only marks matching products.

To compute `effectivePrice`, extend it to:
1. Load `DiscountProducts` links for response products
2. Load `Discount` records referenced by links
3. Apply rule logic (`discountType`, `discountValue`, caps/minimums)
4. Return computed fields such as:
   - `effectivePrice`
   - `appliedDiscounts`
   - `bestDiscount`

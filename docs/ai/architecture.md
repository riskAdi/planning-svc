# Architecture

## System Type
This system is a **dynamic form-based data query engine built on NestJS and MongoDB**. It provides a generic API layer that resolves data at runtime based on a `formName`.

It behaves like a metadata-driven backend where schemas, queries, and relations are resolved dynamically instead of being hardcoded per entity.

---

## High-Level Architecture

Request flow:

Client → NestJS Controller → Query Orchestrator → MongoDB → Relation Resolver → Response

---

## API Layer

### Endpoint
GET /form/:formName?search={}&include={}

### Responsibilities
- Accept dynamic `formName`
- Parse query parameters:
  - `search` → filtering conditions
  - `include` → relations to load
- Forward request to service layer

---

## Core Orchestration Layer

### FormQueryService (Main Engine)

This service coordinates the full request lifecycle.

Responsibilities:
- Resolve model from `formName`
- Build query using search parameters
- Execute MongoDB query
- Trigger relation resolution if needed
- Merge and return final response

---

## Model Registry (Schema Resolver)

### Purpose
Maps dynamic form names to MongoDB models.

### Behavior
- Input: `formName`
- Output: Mongoose model instance

### Responsibilities
- Validate that model exists
- Ensure schema is registered
- Prevent access to undefined collections

---

## Query Builder Layer

### QueryBuilderService

Transforms `search` query string into MongoDB filter objects.

Example:

Input:
search=name:john,status:active

Output:
{
  name: "john",
  status: "active"
}

### Responsibilities
- Parse query parameters
- Convert to MongoDB-compatible filters
- Support dynamic fields

---

## Relation Resolver Layer

### RelationResolverService

Handles fetching of relational data based on schema definition and `include` parameter.

### Behavior
- Reads schema-defined relations (ObjectId references)
- Checks `include` query parameter
- Fetches related documents only when requested
- Uses batching to avoid N+1 queries

### Example

include=customer,items

→ Fetch related customer and items collections
→ Merge results into base dataset

---

## Data Layer (MongoDB)

### Characteristics
- Uses Mongoose schemas
- Each `formName` corresponds to a collection
- Relations are stored using ObjectId references
- Schema-driven validation ensures structure consistency

---

## Data Flow (Step-by-Step)

1. Request received:
   GET /form/orders?search=status:paid&include=customer

2. Controller extracts:
   - formName = orders
   - search = status:paid
   - include = customer

3. ModelRegistry resolves:
   → orders model

4. QueryBuilder builds Mongo filter:
   → { status: "paid" }

5. MongoDB fetches base records

6. RelationResolver checks schema:
   → finds "customer" relation

7. Related data is fetched in batch

8. Data is merged and returned

---

## Key Design Principles

### 1. Schema-driven system
All behavior is defined by MongoDB schema metadata.

### 2. Fully dynamic routing
No hardcoded entity endpoints. Everything is resolved via `formName`.

### 3. On-demand relations
Relations are only fetched if explicitly requested via `include`.

### 4. Stateless request processing
Each request is independent and fully resolved at runtime.

### 5. Performance-first design
- Batch relation fetching
- Avoid N+1 queries
- Minimal data hydration

---

## Constraints

- Every `formName` must have a registered model
- Relations must be explicitly defined in schema
- No raw collection access without registry validation
- Only requested relations are populated

---

## Architectural Summary

This system is a **dynamic query engine layer on top of MongoDB**, designed to:
- Handle multiple entity types via a single API
- Resolve schemas at runtime
- Dynamically fetch relational data
- Minimize coupling between API and data models



                 ┌──────────────┐
                 │   Client     │
                 └──────┬───────┘
                        ↓
            ┌──────────────────────┐
            │  FormController      │
            └────────┬─────────────┘
                     ↓
        ┌──────────────────────────┐
        │ FormQueryService         │
        └──────┬─────────┬────────┘
               ↓         ↓
     ┌────────────┐  ┌──────────────┐
     │ Model      │  │ QueryBuilder │
     │ Registry   │  │ Service      │
     └────┬───────┘  └──────┬───────┘
          ↓                 ↓
        MongoDB        Filtered Query
          ↓
   ┌──────────────────────────┐
   │ RelationResolverService  │
   └──────────┬───────────────┘
              ↓
         Hydrated Data
              ↓
          Response
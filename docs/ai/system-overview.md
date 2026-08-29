# System Overview

## Purpose
This NestJS backend is a **dynamic form data API system** where data is fetched based on runtime-provided form names. The system acts as a generic data layer on top of MongoDB models.

---

## Core Concept

The API follows this pattern:

GET /form/{formName}?search={}&include={}

Where:
- `formName` is dynamic and can represent any entity (e.g., nurse, patients, products)
- Each `formName` must have a corresponding MongoDB model schema defined in the system
- `search` uses operator objects per field and supports a `quick` object for OR search

### Search format

Example:

search={
   "quick": {
      "customer": {
         "operator": "contains",
         "value": "test"
      },
      "discountCode": {
         "operator": "contains",
         "value": "test"
      }
   },
   "status": {
      "operator": "in",
      "value": [
         "6a63cde5571a529c214a48b1"
      ]
   }
}

Semantics:
- Fields inside `quick` are combined with OR.
- Root-level fields are combined with AND.
- Final logic is: (`quick.customer` OR `quick.discountCode`) AND `status`.

---

## Data Flow

1. Request comes to the Form Controller:
   - Extract `formName`
   - Extract query params: `search`, `include`

2. Controller resolves the corresponding MongoDB model:
   - Uses `formName` → model registry / schema mapping
   - Ensures model exists before query execution

3. Data fetching:
   - Base documents are fetched using the resolved model
   - `search` parameter is applied dynamically as filter conditions
   - `quick` conditions are grouped with OR and ANDed with root filters

4. Relation handling:
   - If the model schema defines relations (references to other collections):
     - The system automatically resolves and fetches related data
     - Controlled via `include` query parameter
     - Only requested relations are populated

---

## Key Components

### 1. Dynamic Form Controller
- Entry point for all `/form/:formName` requests
- Responsible for:
  - Parsing request parameters
  - Delegating to service layer

---

### 2. Model Registry / Schema Resolver
- Maps `formName` → MongoDB model
- Ensures:
  - Model exists
  - Schema is valid
- Prevents invalid or unknown form access

---

### 3. Query Builder Service
- Translates `search` query into MongoDB filters
- Supports dynamic filtering across fields
- Supports grouped quick-search (`search.quick`) using OR
- Combines quick-search group with root filters using AND

---

### 4. Relation Resolver
- Reads schema-defined relations
- Uses `include` parameter to determine which relations to fetch
- Performs population / joining of related documents

---

## Data Model Characteristics

- Schema-driven (MongoDB via Mongoose)
- Dynamic entity support via `formName`
- Supports relational references between collections
- Flexible query structure via runtime parameters

---

## Design Goals

- Fully dynamic form-based data retrieval
- Schema-driven enforcement (no undefined forms)
- Efficient relational fetching (only when requested via `include`)
- Scalable query handling via modular services

---

## Constraints

- Every `formName` must have a registered MongoDB model
- Relations must be explicitly defined in schema
- No raw/unstructured collection access allowed
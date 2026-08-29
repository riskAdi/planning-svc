# AI / Claude notes

This folder contains **repo-specific guidance** for AI assistants (Claude/Cursor agents) working on this codebase.

- Start with the root [`CLAUDE.md`](../../CLAUDE.md).
- Use the guides here for more detailed conventions as the project grows.

## Contents

- `conventions.md`: Naming, file placement, and NestJS patterns we want to standardize.
- `workflows.md`: How we expect changes to be implemented and verified.
- `system-overview.md`: Runtime flow, query model, and current search semantics.
- `architecture.md`: Component architecture and query orchestration details.

## Search format note

The canonical search format is JSON object based (not `field:value` pairs):

- `search.quick` fields are combined with `OR`
- Root `search` fields are combined with `AND`
- Final logic is `(quick...) AND (root...)`


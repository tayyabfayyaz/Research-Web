# ADR-003: Persistent Task Database

- **Status:** Accepted
- **Date:** 2026-05-08
- **Feature:** 001-ai-web-pdf-generator
- **Context:** The system needs to support "permanent storage" and "history" (FR-010). The initial implementation used an in-memory dictionary for task metadata, which meant all research records were lost whenever the server restarted.

## Decision

We have replaced the in-memory storage with a persistent SQLite database using SQLAlchemy and the `aiosqlite` async driver.

Components:
- **Database**: SQLite (local file `research.db`).
- **ORM**: SQLAlchemy 2.0 (Declarative Mapping).
- **Driver**: `aiosqlite` for non-blocking I/O.
- **Service Layer**: `db_service.py` to encapsulate all database operations.
- **API**: Added `GET /tasks` to list historical research records.

## Consequences

### Positive
- **Durability**: Task metadata and research documents survive server restarts.
- **Auditability**: Provides a permanent record of all research conducted.
- **Scalability**: Sets the foundation for adding a "History" view in the frontend.

### Negative
- **Complexity**: Adds database management and migration concerns (though SQLite keeps this minimal).
- **Disk I/O**: Adds overhead for every status update (mitigated by async driver).

## Alternatives Considered

- **JSON File Storage**: Rejected as it lacks the query capabilities and ACID guarantees of a relational database.
- **PostgreSQL/Redis**: Rejected for the MVP as they require external infrastructure, whereas SQLite is self-contained.

## References

- Feature Spec: [specs/001-ai-web-pdf-generator/spec.md](specs/001-ai-web-pdf-generator/spec.md)
- PHR: 015-implement-persistent-sqlite-database-for-tasks.green.prompt.md

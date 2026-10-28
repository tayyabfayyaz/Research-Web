# ADR-001: Modernized AI Research Stack

- **Status:** Accepted
- **Date:** 2026-05-08
- **Feature:** 001-ai-web-pdf-generator
- **Context:** The original implementation relied on the deprecated `google-generativeai` SDK and the `gemini-1.5-flash` model, which encountered 404 errors due to environment deprecations by May 2026.

## Decision

We have migrated the AI integration layer to the modern `google-genai` SDK and standardized on the `gemini-flash-latest` model alias.

Components:
- **SDK**: `google-genai` (v2.0.0+) using the `client.aio` async interface.
- **Model**: `gemini-flash-latest` (aliased to the latest stable flash model with active quota).
- **Prompting**: Refined System Instructions to strictly enforce JSON schema compliance for Pydantic integration.

## Consequences

### Positive
- **Future-Proof**: Aligns with 2026 Google AI standards.
- **Stability**: Using the `latest` alias ensures the system automatically tracks stable model updates without manual code changes.
- **Type Safety**: Enforced string outputs for narrative sections prevents validation errors in the frontend.

### Negative
- **Dependency Update**: Requires `google-genai` in `requirements.txt`.
- **Breaking Change**: The `google-genai` SDK has a different API structure than the previous library, requiring a full rewrite of the AI service.

## Alternatives Considered

- **Gemini 2.0/2.5 Flash**: Viable but currently limited by zero-quota limits in the user's specific API project.
- **Staying with 1.5-flash**: Rejected as it is no longer reachable via the API gateway.

## References

- Implementation Plan: [specs/001-ai-web-pdf-generator/plan.md](specs/001-ai-web-pdf-generator/plan.md)
- PHR: 009-migrate-to-google-genai-sdk-and-align-schema.refactor.prompt.md

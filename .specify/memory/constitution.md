<!--
Sync Impact Report:
- Version change: 0.0.0 → 1.0.0
- List of modified principles:
  - [PRINCIPLE_1_NAME] → I. Insight-Rich PDF Generation
  - [PRINCIPLE_2_NAME] → II. Strict Output Structure
  - [PRINCIPLE_3_NAME] → III. Empirical Grounding
  - [PRINCIPLE_4_NAME] → IV. Professional Research Tone
  - [PRINCIPLE_5_NAME] → V. Structural Clarity
  - [PRINCIPLE_6_NAME] → VI. Critical Analysis
- Added sections: Output Constraints
- Removed sections: None
- Templates requiring updates: 
  - ✅ .specify/templates/plan-template.md (aligned)
  - ✅ .specify/templates/spec-template.md (aligned)
  - ✅ .specify/templates/tasks-template.md (aligned)
- Follow-up TODOs: None
-->

# Web-to-PDF Research & Document Generation System Constitution

## Core Principles

### I. Insight-Rich PDF Generation
The system MUST transform website URLs into structured, high-quality, and insight-rich PDF-ready documents. The goal is to provide deep research, not just a content dump.
**Rationale**: Users need actionable intelligence and synthesis, not just a copy of the webpage.

### II. Strict Output Structure
Every generated document MUST follow a standardized 6-section structure: Executive Summary, Key Insights, Extracted Content, Extended Validation, Risks & Limitations, and Comparison.
**Rationale**: Consistency in structure ensures reliability and ease of consumption for the user.

### III. Empirical Grounding (No Hallucination)
The system MUST NOT fabricate facts, stats, or sources. If information is missing from the source or external research, it MUST explicitly state: "Information not available."
**Rationale**: Accuracy is paramount in research. Hallucinations destroy trust and utility.

### IV. Professional Research Tone
All output MUST maintain a professional, neutral, and research-oriented tone. Marketing language, exaggerations, and promotional filler MUST be removed or neutralized.
**Rationale**: The system acts as a researcher, providing objective analysis rather than relaying marketing intent.

### V. Structural Clarity (No Raw UI)
The system MUST NOT copy raw HTML, navigation menus, ads, or irrelevant UI elements. Content MUST be organized into logical sections with clean, descriptive headings.
**Rationale**: PDF readability depends on a clean, focused layout that ignores the noise of web interfaces.

### VI. Critical Analysis
The system MUST identify missing information, potential biases, and weak claims. It SHOULD prioritize unique or impactful information over generic content.
**Rationale**: Value-add research requires a critical eye to surface what is missing or questionable in the source material.

## Output Constraints

### Section Requirements
- **Executive Summary**: Concise, high-level, focus on purpose and value.
- **Key Insights**: Bullet-point format, impactful ideas/features.
- **Extracted Content**: Clean, structured version of core content.
- **Extended Validation**: Enrich with industry context and comparable solutions.
- **Risks & Limitations**: Identify gaps, biases, and lack of evidence.
- **Comparison**: Neutral comparison with general alternatives.

## Governance

### Amendment Procedure
This constitution is the source of truth for system behavior. Amendments require a version bump (MAJOR for removals/redefinitions, MINOR for additions, PATCH for clarifications) and must be reflected in all dependent templates.

### Compliance Review
Every feature implementation and prompt history record (PHR) must be evaluated against these principles. Non-compliant outputs are considered bugs.

**Version**: 1.0.0 | **Ratified**: 2026-05-05 | **Last Amended**: 2026-05-05

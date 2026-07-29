# Aurix Tests

End-to-end and integration tests for the Aurix platform.

## Overview

Cross-service test suites that validate the interactions between all Aurix components — backend, frontend, data pipelines, and ML models.

## Structure

- **e2e/** — full platform end-to-end tests
- **integration/** — cross-service integration tests
- **performance/** — load and stress tests (k6)

## Tech Stack

- Playwright (browser E2E)
- REST Assured (API tests)
- k6 (performance)

## Related

- [aurix-backend](https://github.com/aureus-platform/aurix-backend)
- [aurix-frontend](https://github.com/aureus-platform/aurix-frontend)
- [aurix-core-banking](https://github.com/aureus-platform/aurix-core-banking)

# Running Tests

## Prerequisites

- Node.js 20+ (for Playwright E2E tests)
- Java 21+ (for REST Assured API tests)
- Docker & Docker Compose (for integration tests)

## Test Suites

### E2E (Playwright)

```bash
cd e2e
npm install
npx playwright test
```

### Integration (REST Assured)

```bash
cd integration
./mvnw test
```

### Performance (k6)

```bash
cd performance
k6 run scripts/load-test.js
```

## CI

Tests run automatically on every PR via GitHub Actions. See `.github/workflows/test.yml`.

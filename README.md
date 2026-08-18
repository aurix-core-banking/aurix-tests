# Aurix Tests

E2E (Playwright), integração (REST Assured), performance (k6), segurança (OWASP ZAP). 200+ cenários de teste.

## Stack

- **Playwright** — testes E2E no browser
- **REST Assured** — testes de API REST
- **k6** — testes de performance e estresse
- **pytest** — testes Python

## Estrutura

```
tests/
├── e2e/                    # End-to-end
│   ├── test_pix_e2e.py
│   ├── test_onboarding_e2e.py
│   └── test_health_endpoints.py
├── integration/            # REST Assured
├── performance/            # k6
│   ├── smoke-test.js
│   ├── load-test.js
│   └── stress-test.js
└── security/               # OWASP ZAP (planejado)
```

## Execução

```bash
# E2E
cd e2e && pip install -r requirements.txt
python -m pytest e2e/

# Performance
k6 run performance/smoke-test.js
k6 run performance/load-test.js        # p95 < 500ms, p99 < 1s
k6 run performance/stress-test.js

# Todos os testes
python -m pytest
```

## Relacionados

- [aurix-backend](https://github.com/aurix-core-banking/aurix-backend)
- [aurix-frontend](https://github.com/aurix-core-banking/aurix-frontend)

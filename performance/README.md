# Testes de Performance (k6)

Suite de testes de carga e estresse da plataforma Aurix usando [k6](https://k6.io).
Atende à issue #4: PIX, onboarding (PF/PJ), extrato e transferências (TED e agendamento).

## Pré-requisitos

- [k6](https://grafana.com/docs/k6/latest/set-up/install-k6/) instalado.
- Stack Aurix em execução (ver `aurix-infrastructure/docker-compose.yml`).
- Gateway acessível em `http://localhost:8080` (padrão) ou `AURIX_BASE_URL`.

## Estrutura

```
performance/
├── README.md              # este arquivo
├── smoke-test.js          # fumaça: valida o pipeline completo com pouca carga
├── load-test.js           # carga: cenário principal com thresholds da issue
├── stress-test.js         # estresse: ponto de ruptura (sem threshold de latência)
└── scripts/
    ├── common.js          # utilidades: payloads, geradores (CPF/CNPJ/chave), thresholds
    ├── pix.js             # PIX: iniciação, consulta e devolução (estorno)
    ├── onboarding.js      # onboarding: cadastro PF e PJ
    ├── extrato.js         # extrato: consulta com filtros (paginação)
    └── transferencia.js   # transferências: TED (SPI/STR) e agendamento de débito
```

## Execução

```bash
# Teste de fumaça
k6 run performance/smoke-test.js

# Teste de carga (thresholds p95 < 500ms, p99 < 1s)
k6 run performance/load-test.js

# Teste de estresse
k6 run performance/stress-test.js

# Script isolado (apenas PIX, onboarding, extrato ou transferência)
k6 run performance/scripts/pix.js
k6 run performance/scripts/onboarding.js
k6 run performance/scripts/extrato.js
k6 run performance/scripts/transferencia.js

# Apontando para outro ambiente e conta
k6 run -e AURIX_BASE_URL=https://staging.aurix.example.com -e AURIX_CONTA_ID=42 \
  performance/load-test.js
```

## Variáveis de ambiente

| Variável | Padrão | Descrição |
|---|---|---|
| `AURIX_BASE_URL` | `http://localhost:8080` | URL base do gateway |
| `AURIX_CONTA_ID` | `1` | ID da conta usada nos cenários |
| `K6_OUT` | — | Destino de saída (ex.: `influxdb`, `cloud`) |

## Thresholds (issue #4)

Aplicados nos testes de fumaça e carga:

- `http_req_duration` — `p(95) < 500ms` e `p(99) < 1s`
- `http_req_failed` — taxa de falhas `< 1%`

O teste de estresse não usa threshold de latência (objetivo é achar o ponto de
ruptura); apenas alerta quando a taxa de falhas passa de 5%.

## Cenários cobertos

| Fluxo | Endpoints |
|---|---|
| PIX — iniciação | `POST /api/pix/transferencias` |
| PIX — consulta | `GET /api/pix/transferencias/{id}` |
| PIX — devolução | reversão via `PUT /api/pix/transferencias/{id}/cancelar` (estorno) |
| Onboarding PF | `POST /api/onboarding/contas/pf/solicitacoes` + `GET .../{id}` |
| Onboarding PJ | `POST /api/onboarding/contas/pj` + `GET /api/onboarding/contas/pj/{id}` |
| Extrato | `GET /api/transacoes/conta/{contaId}?page=&size=&sort=` |
| TED | `POST /api/cambio/spi-str/str/ted` + consulta de status |
| Agendamento | `POST /api/core/agendamentos-debito` + `GET .../pendentes` |

> Nota: a API ainda não expõe endpoint dedicado de devolução PIX; o cenário usa
> o cancelamento/estorno como representação, e deve ser ajustado quando o
> endpoint de devolução for publicado.

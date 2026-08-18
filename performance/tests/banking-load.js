// Teste de carga bancária: simula fluxos completos de operações bancárias.
//
// Cenário com ramping VUs: 10 → 50 → 100 → 50 → 0 (5 minutos).
// Endpoints testados:
//   - POST /api/contas (criar conta)
//   - GET  /api/contas/{id}
//   - POST /api/transacoes (criar transação)
//   - GET  /api/transacoes/{id}
//   - POST /api/transferencias (transferir)
//
// Execução:
//   k6 run performance/tests/banking-load.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import {
  BASE_URL,
  THRESHOLDS,
  payloadCriarConta,
  payloadTransacao,
  payloadTransferencia,
  idDe,
  jsonOf,
} from '../k6-config.js';

export const options = {
  scenarios: {
    carga_bancaria: {
      executor: 'ramping-vus',
      startVUs: 10,
      stages: [
        { duration: '1m', target: 50 },
        { duration: '2m', target: 100 },
        { duration: '1m', target: 50 },
        { duration: '1m', target: 0 },
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: THRESHOLDS,
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
};

function criarConta() {
  const res = http.post(`${BASE_URL}/api/contas`, payloadCriarConta(), {
    headers: { 'Content-Type': 'application/json' },
  });
  check(res, {
    'Criar conta responde 201': (r) => r.status === 201,
    'Criar conta retorna id': (r) => idDe(r) !== null,
  });
  return idDe(res);
}

function consultarConta(id) {
  if (!id) return;
  const res = http.get(`${BASE_URL}/api/contas/${id}`);
  check(res, {
    'Consultar conta responde 200': (r) => r.status === 200,
  });
}

function criarTransacao() {
  const res = http.post(`${BASE_URL}/api/transacoes`, payloadTransacao(), {
    headers: { 'Content-Type': 'application/json' },
  });
  check(res, {
    'Criar transação responde 201': (r) => r.status === 201,
    'Criar transação retorna id': (r) => idDe(r) !== null,
  });
  return idDe(res);
}

function consultarTransacao(id) {
  if (!id) return;
  const res = http.get(`${BASE_URL}/api/transacoes/${id}`);
  check(res, {
    'Consultar transação responde 200': (r) => r.status === 200,
  });
}

function transferir() {
  const res = http.post(`${BASE_URL}/api/transferencias`, payloadTransferencia(), {
    headers: { 'Content-Type': 'application/json' },
  });
  check(res, {
    'Transferir responde 201': (r) => r.status === 201 || r.status === 200,
    'Transferir retorna id': (r) => idDe(r) !== null,
  });
  return idDe(res);
}

export default function () {
  // Fluxo 1: criar conta e consultar
  const contaId = criarConta();
  consultarConta(contaId);

  sleep(0.5);

  // Fluxo 2: criar transação e consultar
  const transacaoId = criarTransacao();
  consultarTransacao(transacaoId);

  sleep(0.5);

  // Fluxo 3: transferir
  transferir();

  sleep(1);
}

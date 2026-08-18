// Teste de carga de fraude: alta vazão de transações para scoring de fraude.
//
// Cenário com ramping VUs: 50 → 200 → 500 → 0 (3 minutos).
// Teste de throughput pesado (Kafka-driven): gera muitas transações
// para serem processadas pelo svc-fraud via Kafka.
//
// Execução:
//   k6 run performance/tests/fraud-load.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import {
  BASE_URL,
  THRESHOLDS,
  payloadFraudScore,
} from '../k6-config.js';

const FRAUD_BASE = `${BASE_URL}/api/fraud`;

export const options = {
  scenarios: {
    carga_fraude: {
      executor: 'ramping-vus',
      startVUs: 50,
      stages: [
        { duration: '1m', target: 200 },
        { duration: '1m', target: 500 },
        { duration: '1m', target: 0 },
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<1000', 'p(99)<2000'],
    http_req_failed: ['rate<0.02'],
  },
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
};

function enviarParaScoring() {
  const res = http.post(`${FRAUD_BASE}/scoring`, payloadFraudScore(), {
    headers: { 'Content-Type': 'application/json' },
  });
  check(res, {
    'Scoring fraude responde 202': (r) => r.status === 202 || r.status === 200,
  });
}

function consultarScore(transacaoId) {
  if (!transacaoId) return;
  const res = http.get(`${FRAUD_BASE}/score/${transacaoId}`);
  check(res, {
    'Consultar score responde 200 ou 404': (r) => r.status === 200 || r.status === 404,
  });
}

export default function () {
  // Enviar transação para scoring
  enviarParaScoring();

  sleep(0.1);
}

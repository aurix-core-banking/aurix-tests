// Teste de carga de crédito: simula consultas e solicitações de crédito.
//
// Cenário com ramping VUs: 10 → 50 → 100 → 0 (3 minutos).
// Endpoints testados:
//   - POST /api/credito/simular (simular crédito)
//   - POST /api/credito/solicitar (solicitar crédito)
//   - GET  /api/credito/solicitacoes/{id} (consultar solicitação)
//
// Execução:
//   k6 run performance/tests/credit-load.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import {
  BASE_URL,
  THRESHOLDS,
  payloadSimularCredito,
  payloadSolicitarCredito,
  idDe,
} from '../k6-config.js';

const CREDITO_BASE = `${BASE_URL}/api/credito`;

export const options = {
  scenarios: {
    carga_credito: {
      executor: 'ramping-vus',
      startVUs: 10,
      stages: [
        { duration: '1m', target: 50 },
        { duration: '1m', target: 100 },
        { duration: '1m', target: 0 },
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: THRESHOLDS,
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
};

function simularCredito() {
  const res = http.post(`${CREDITO_BASE}/simular`, payloadSimularCredito(), {
    headers: { 'Content-Type': 'application/json' },
  });
  check(res, {
    'Simular crédito responde 200': (r) => r.status === 200,
    'Simular crédito retorna simulação': (r) => {
      try {
        const body = r.json();
        return body.valorParcela > 0 || body taxaJuros > 0;
      } catch (e) {
        return false;
      }
    },
  });
}

function solicitarCredito() {
  const res = http.post(`${CREDITO_BASE}/solicitar`, payloadSolicitarCredito(), {
    headers: { 'Content-Type': 'application/json' },
  });
  check(res, {
    'Solicitar crédito responde 201': (r) => r.status === 201,
    'Solicitar crédito retorna id': (r) => idDe(r) !== null,
  });
  return idDe(res);
}

function consultarSolicitacao(id) {
  if (!id) return;
  const res = http.get(`${CREDITO_BASE}/solicitacoes/${id}`);
  check(res, {
    'Consultar solicitação responde 200': (r) => r.status === 200,
  });
}

export default function () {
  // 70% simulação (leitura), 30% solicitação (escrita)
  if (Math.random() < 0.7) {
    simularCredito();
  } else {
    const id = solicitarCredito();
    sleep(0.5);
    consultarSolicitacao(id);
  }

  sleep(1);
}

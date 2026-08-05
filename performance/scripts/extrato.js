// Testes de performance k6 para o extrato (svc-banking).
//
// Cenário coberto (issue #4):
//   Consulta de extrato com filtros: GET /api/transacoes/conta/{contaId}
//   com paginação (page, size) e ordenação (sort=dataTransacao).
//
// Execução local:
//   k6 run performance/scripts/extrato.js
import http from 'k6/http';
import { check } from 'k6';
import { BASE_URL, THRESHOLDS, contaId } from './common.js';

const TRANSACOES_BASE = `${BASE_URL}/api/transacoes`;

export const options = {
  scenarios: {
    consulta_extrato: {
      executor: 'ramping-vus',
      exec: 'fluxoExtrato',
      startVUs: 1,
      stages: [
        { duration: '30s', target: 30 },
        { duration: '1m', target: 30 },
        { duration: '30s', target: 0 },
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: THRESHOLDS,
};

// Consulta o extrato da conta com filtros de paginação.
export function consultarExtrato() {
  const params = new URLSearchParams({
    page: '0',
    size: '20',
    sort: 'dataTransacao,desc',
  });
  const url = `${TRANSACOES_BASE}/conta/${contaId()}?${params.toString()}`;
  const res = http.get(url);
  check(res, {
    'Extrato responde 200': (r) => r.status === 200,
  });
  return res;
}

export function fluxoExtrato() {
  consultarExtrato();
}

export default function () {
  fluxoExtrato();
}

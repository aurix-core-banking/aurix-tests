// Testes de performance k6 para o onboarding (svc-customer).
//
// Cenários cobertos (issue #4):
//   1. Cadastro PF:   POST /api/onboarding/contas/pf/solicitacoes + consulta
//   2. Cadastro PJ:   POST /api/onboarding/contas/pj + consulta
//
// Execução local:
//   k6 run performance/scripts/onboarding.js
import http from 'k6/http';
import { check } from 'k6';
import {
  BASE_URL,
  HEADERS_JSON,
  THRESHOLDS,
  payloadOnboardingPF,
  payloadOnboardingPJ,
  idDe,
} from './common.js';

const ONBOARDING_BASE = `${BASE_URL}/api/onboarding`;

export const options = {
  scenarios: {
    cadastro_pf: {
      executor: 'ramping-vus',
      exec: 'fluxoOnboardingPF',
      startVUs: 1,
      stages: [
        { duration: '30s', target: 10 },
        { duration: '1m', target: 10 },
        { duration: '30s', target: 0 },
      ],
      gracefulRampDown: '30s',
    },
    cadastro_pj: {
      executor: 'ramping-vus',
      exec: 'fluxoOnboardingPJ',
      startVUs: 1,
      stages: [
        { duration: '30s', target: 10 },
        { duration: '1m', target: 10 },
        { duration: '30s', target: 0 },
      ],
      gracefulRampDown: '30s',
      startTime: '30s',
    },
  },
  thresholds: THRESHOLDS,
};

// Cadastra uma solicitação PF e retorna o id.
export function cadastrarPF() {
  const res = http.post(`${ONBOARDING_BASE}/contas/pf/solicitacoes`, payloadOnboardingPF(), {
    headers: HEADERS_JSON,
  });
  check(res, {
    'Onboarding PF criação responde 200': (r) => r.status === 200,
    'Onboarding PF retorna id': (r) => idDe(r) !== null,
  });
  return idDe(res);
}

export function fluxoOnboardingPF() {
  const id = cadastrarPF();
  if (id === null) {
    return;
  }
  const res = http.get(`${ONBOARDING_BASE}/contas/pf/solicitacoes/${id}`);
  check(res, {
    'Onboarding PF consulta responde 200': (r) => r.status === 200,
  });
}

// Cadastra uma solicitação PJ e retorna o id.
export function cadastrarPJ() {
  const res = http.post(`${ONBOARDING_BASE}/contas/pj`, payloadOnboardingPJ(), {
    headers: HEADERS_JSON,
  });
  check(res, {
    'Onboarding PJ criação responde 200': (r) => r.status === 200,
    'Onboarding PJ retorna id': (r) => idDe(r) !== null,
  });
  return idDe(res);
}

export function fluxoOnboardingPJ() {
  const id = cadastrarPJ();
  if (id === null) {
    return;
  }
  const res = http.get(`${ONBOARDING_BASE}/contas/pj/${id}`);
  check(res, {
    'Onboarding PJ consulta responde 200': (r) => r.status === 200,
  });
}

export default function () {
  fluxoOnboardingPF();
}

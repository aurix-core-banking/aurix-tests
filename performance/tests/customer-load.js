// Teste de carga de onboarding: simula cadastro de clientes PF e PJ.
//
// Cenário com ramping VUs: 10 → 30 → 50 → 10 (3 minutos).
// Endpoints testados:
//   - POST /api/clientes (cadastrar PF)
//   - POST /api/clientes/pj (cadastrar PJ)
//   - POST /api/kyc/iniciar (iniciar KYC)
//   - GET  /api/clientes/{id} (consultar)
//
// Execução:
//   k6 run performance/tests/customer-load.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import {
  BASE_URL,
  THRESHOLDS,
  payloadOnboardingPF,
  payloadOnboardingPJ,
  payloadIniciarKyc,
  gerarCpf,
  gerarCnpj,
  idDe,
} from '../k6-config.js';

export const options = {
  scenarios: {
    carga_onboarding: {
      executor: 'ramping-vus',
      startVUs: 10,
      stages: [
        { duration: '1m', target: 30 },
        { duration: '1m', target: 50 },
        { duration: '1m', target: 10 },
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: THRESHOLDS,
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
};

function cadastrarPF() {
  const res = http.post(`${BASE_URL}/api/clientes`, payloadOnboardingPF(), {
    headers: { 'Content-Type': 'application/json' },
  });
  check(res, {
    'Cadastrar PF responde 201': (r) => r.status === 201,
    'Cadastrar PF retorna id': (r) => idDe(r) !== null,
  });
  return idDe(res);
}

function cadastrarPJ() {
  const res = http.post(`${BASE_URL}/api/clientes/pj`, payloadOnboardingPJ(), {
    headers: { 'Content-Type': 'application/json' },
  });
  check(res, {
    'Cadastrar PJ responde 201': (r) => r.status === 201,
    'Cadastrar PJ retorna id': (r) => idDe(r) !== null,
  });
  return idDe(res);
}

function iniciarKyc(clienteId) {
  if (!clienteId) return;
  const res = http.post(`${BASE_URL}/api/kyc/iniciar`, payloadIniciarKyc(), {
    headers: { 'Content-Type': 'application/json' },
  });
  check(res, {
    'Iniciar KYC responde 200': (r) => r.status === 200,
  });
}

function consultarCliente(id) {
  if (!id) return;
  const res = http.get(`${BASE_URL}/api/clientes/${id}`);
  check(res, {
    'Consultar cliente responde 200': (r) => r.status === 200,
  });
}

export default function () {
  // Alternar entre PF e PJ para simular carga mista
  const usarPJ = __ITER % 2 === 0;

  let clienteId;
  if (usarPJ) {
    clienteId = cadastrarPJ();
  } else {
    clienteId = cadastrarPF();
  }

  sleep(0.5);

  // Iniciar KYC e consultar
  iniciarKyc(clienteId);
  consultarCliente(clienteId);

  sleep(1);
}

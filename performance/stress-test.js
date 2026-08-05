// Teste de estresse (stress): identifica o ponto de ruptura do sistema.
//
// Diferente do load-test, aqui NÃO há threshold de latência: o objetivo é
// observar degradação, erros e o ponto de saturação. A única salvaguarda é a
// taxa de falhas de requisições (< 5%), que indica quando o sistema colapsou.
//
// Execução:
//   k6 run performance/stress-test.js
import { fluxoPix } from './scripts/pix.js';
import { fluxoOnboardingPF } from './scripts/onboarding.js';
import { fluxoExtrato } from './scripts/extrato.js';
import { fluxoTED } from './scripts/transferencia.js';
import { BASE_URL } from './scripts/common.js';

export function pix() {
  return fluxoPix();
}
export function onboardingPF() {
  return fluxoOnboardingPF();
}
export function extrato() {
  return fluxoExtrato();
}
export function ted() {
  return fluxoTED();
}

export const options = {
  scenarios: {
    stress_pix: {
      executor: 'ramping-vus',
      exec: 'pix',
      startVUs: 10,
      stages: [
        { duration: '2m', target: 100 },
        { duration: '5m', target: 200 },
        { duration: '2m', target: 0 },
      ],
      gracefulRampDown: '2m',
    },
    stress_extrato: {
      executor: 'ramping-vus',
      exec: 'extrato',
      startVUs: 10,
      stages: [
        { duration: '2m', target: 150 },
        { duration: '5m', target: 300 },
        { duration: '2m', target: 0 },
      ],
      gracefulRampDown: '2m',
      startTime: '1m',
    },
    stress_onboarding_pf: {
      executor: 'ramping-vus',
      exec: 'onboardingPF',
      startVUs: 5,
      stages: [
        { duration: '2m', target: 50 },
        { duration: '5m', target: 100 },
        { duration: '2m', target: 0 },
      ],
      gracefulRampDown: '2m',
      startTime: '3m',
    },
    stress_ted: {
      executor: 'ramping-vus',
      exec: 'ted',
      startVUs: 5,
      stages: [
        { duration: '2m', target: 60 },
        { duration: '5m', target: 120 },
        { duration: '2m', target: 0 },
      ],
      gracefulRampDown: '2m',
      startTime: '5m',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.05'],
  },
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
};

export default function () {
  console.info(`Estresse contra ${BASE_URL}`);
}

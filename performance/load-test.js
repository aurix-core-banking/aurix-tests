// Teste de carga (load): cenário principal de performance.
//
// Thresholds da issue #4:
//   - http_req_duration: p95 < 500ms, p99 < 1s
//   - http_req_failed: taxa de falhas < 1%
//
// Execução:
//   k6 run performance/load-test.js
import { fluxoPix } from './scripts/pix.js';
import { fluxoOnboardingPF, fluxoOnboardingPJ } from './scripts/onboarding.js';
import { fluxoExtrato } from './scripts/extrato.js';
import { fluxoTED, fluxoAgendamento } from './scripts/transferencia.js';
import { THRESHOLDS } from './scripts/common.js';

export function pix() {
  return fluxoPix();
}
export function onboardingPF() {
  return fluxoOnboardingPF();
}
export function onboardingPJ() {
  return fluxoOnboardingPJ();
}
export function extrato() {
  return fluxoExtrato();
}
export function ted() {
  return fluxoTED();
}
export function agendamento() {
  return fluxoAgendamento();
}

export const options = {
  scenarios: {
    carga_pix: {
      executor: 'ramping-vus',
      exec: 'pix',
      startVUs: 5,
      stages: [
        { duration: '2m', target: 50 },
        { duration: '5m', target: 50 },
        { duration: '2m', target: 0 },
      ],
      gracefulRampDown: '1m',
    },
    carga_extrato: {
      executor: 'ramping-vus',
      exec: 'extrato',
      startVUs: 5,
      stages: [
        { duration: '2m', target: 80 },
        { duration: '5m', target: 80 },
        { duration: '2m', target: 0 },
      ],
      gracefulRampDown: '1m',
      startTime: '1m',
    },
    carga_onboarding_pf: {
      executor: 'ramping-vus',
      exec: 'onboardingPF',
      startVUs: 2,
      stages: [
        { duration: '2m', target: 20 },
        { duration: '5m', target: 20 },
        { duration: '2m', target: 0 },
      ],
      gracefulRampDown: '1m',
      startTime: '2m',
    },
    carga_onboarding_pj: {
      executor: 'ramping-vus',
      exec: 'onboardingPJ',
      startVUs: 2,
      stages: [
        { duration: '2m', target: 20 },
        { duration: '5m', target: 20 },
        { duration: '2m', target: 0 },
      ],
      gracefulRampDown: '1m',
      startTime: '3m',
    },
    carga_ted: {
      executor: 'ramping-vus',
      exec: 'ted',
      startVUs: 2,
      stages: [
        { duration: '2m', target: 30 },
        { duration: '5m', target: 30 },
        { duration: '2m', target: 0 },
      ],
      gracefulRampDown: '1m',
      startTime: '4m',
    },
    carga_agendamento: {
      executor: 'ramping-vus',
      exec: 'agendamento',
      startVUs: 2,
      stages: [
        { duration: '2m', target: 30 },
        { duration: '5m', target: 30 },
        { duration: '2m', target: 0 },
      ],
      gracefulRampDown: '1m',
      startTime: '5m',
    },
  },
  thresholds: THRESHOLDS,
};

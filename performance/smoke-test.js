// Teste de fumaça (smoke): valida o pipeline completo com pouca carga.
//
// Execução:
//   k6 run performance/smoke-test.js
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
    smoke_pix: {
      executor: 'shared-iterations',
      vus: 1,
      iterations: 5,
      maxDuration: '1m',
      exec: 'pix',
    },
    smoke_onboarding_pf: {
      executor: 'shared-iterations',
      vus: 1,
      iterations: 3,
      maxDuration: '1m',
      exec: 'onboardingPF',
      startTime: '2s',
    },
    smoke_onboarding_pj: {
      executor: 'shared-iterations',
      vus: 1,
      iterations: 3,
      maxDuration: '1m',
      exec: 'onboardingPJ',
      startTime: '4s',
    },
    smoke_extrato: {
      executor: 'shared-iterations',
      vus: 1,
      iterations: 5,
      maxDuration: '1m',
      exec: 'extrato',
      startTime: '6s',
    },
    smoke_ted: {
      executor: 'shared-iterations',
      vus: 1,
      iterations: 3,
      maxDuration: '1m',
      exec: 'ted',
      startTime: '8s',
    },
    smoke_agendamento: {
      executor: 'shared-iterations',
      vus: 1,
      iterations: 3,
      maxDuration: '1m',
      exec: 'agendamento',
      startTime: '10s',
    },
  },
  thresholds: THRESHOLDS,
};

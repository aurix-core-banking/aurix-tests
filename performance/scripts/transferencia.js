// Testes de performance k6 para transferências (TED e agendamento).
//
// Cenários cobertos (issue #4):
//   1. TED:          POST /api/cambio/spi-str/str/ted + consulta de status
//   2. Agendamento:  POST /api/core/agendamentos-debito + listagem de pendentes
//
// Execução local:
//   k6 run performance/scripts/transferencia.js
import http from 'k6/http';
import { check } from 'k6';
import {
  BASE_URL,
  HEADERS_JSON,
  THRESHOLDS,
  payloadTED,
  payloadAgendamentoDebito,
  idDe,
} from './common.js';

export const options = {
  scenarios: {
    transferencia_ted: {
      executor: 'ramping-vus',
      exec: 'fluxoTED',
      startVUs: 1,
      stages: [
        { duration: '30s', target: 15 },
        { duration: '1m', target: 15 },
        { duration: '30s', target: 0 },
      ],
      gracefulRampDown: '30s',
    },
    agendamento_debito: {
      executor: 'ramping-vus',
      exec: 'fluxoAgendamento',
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

// Envia uma TED via SPI/STR e retorna o id do registro criado.
export function enviarTED() {
  const res = http.post(`${BASE_URL}/api/cambio/spi-str/str/ted`, payloadTED(), {
    headers: HEADERS_JSON,
  });
  check(res, {
    'TED criação responde 201': (r) => r.status === 201,
    'TED retorna id': (r) => idDe(r) !== null,
  });
  return idDe(res);
}

export function fluxoTED() {
  const id = enviarTED();
  if (id === null) {
    return;
  }
  const res = http.get(`${BASE_URL}/api/cambio/spi-str/str/status/${id}`);
  check(res, {
    'TED consulta de status responde 200': (r) => r.status === 200,
  });
}

// Agenda um débito na conta e retorna o id.
export function agendarDebito() {
  const res = http.post(`${BASE_URL}/api/core/agendamentos-debito`, payloadAgendamentoDebito(), {
    headers: HEADERS_JSON,
  });
  check(res, {
    'Agendamento criação responde 201': (r) => r.status === 201,
    'Agendamento retorna id': (r) => idDe(r) !== null,
  });
  return idDe(res);
}

export function fluxoAgendamento() {
  agendarDebito();
  const res = http.get(`${BASE_URL}/api/core/agendamentos-debito/pendentes`);
  check(res, {
    'Agendamento lista pendentes responde 200': (r) => r.status === 200,
  });
}

export default function () {
  fluxoTED();
}

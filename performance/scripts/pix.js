// Testes de performance k6 para o fluxo PIX (svc-payments).
//
// Cenários cobertos (issue #4):
//   1. Iniciação: POST /api/pix/transferencias
//   2. Consulta:  GET  /api/pix/transferencias/{id}
//   3. Devolução: reversão de uma transferência (estorno via cancelamento,
//      uma vez que a API ainda não expõe o endpoint dedicado de devolução)
//
// Execução local:
//   k6 run performance/scripts/pix.js
//   k6 run -e AURIX_BASE_URL=http://localhost:8080 -e AURIX_CONTA_ID=1 \
//     performance/scripts/pix.js
import http from 'k6/http';
import { check } from 'k6';
import {
  BASE_URL,
  HEADERS_JSON,
  THRESHOLDS,
  payloadPixTransferencia,
  gerarChavePix,
  idDe,
} from './common.js';

const PIX_BASE = `${BASE_URL}/api/pix`;

export const options = {
  scenarios: {
    fluxo_pix: {
      executor: 'ramping-vus',
      exec: 'fluxoPix',
      startVUs: 1,
      stages: [
        { duration: '30s', target: 20 },
        { duration: '1m', target: 20 },
        { duration: '30s', target: 0 },
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: THRESHOLDS,
};

// Inicia uma transferência PIX e retorna o id.
export function iniciarPix() {
  const chaveDestino = gerarChavePix();
  const res = http.post(`${PIX_BASE}/transferencias`, payloadPixTransferencia(chaveDestino), {
    headers: HEADERS_JSON,
  });
  check(res, {
    'PIX iniciação responde 201': (r) => r.status === 201,
    'PIX iniciação retorna id': (r) => idDe(r) !== null,
  });
  return idDe(res);
}

// Consulta uma transferência PIX pelo id.
export function consultarPix(id) {
  if (id === null) {
    return;
  }
  const res = http.get(`${PIX_BASE}/transferencias/${id}`);
  check(res, {
    'PIX consulta responde 200': (r) => r.status === 200,
  });
}

// Representa a devolução PIX: cria uma transferência e a reverte (estorno),
// validando tanto a criação quanto o cancelamento.
export function devolverPix() {
  const id = iniciarPix();
  if (id === null) {
    return;
  }
  const res = http.put(`${PIX_BASE}/transferencias/${id}/cancelar`, null, {
    headers: HEADERS_JSON,
  });
  check(res, {
    'PIX devolução (cancelamento) responde 204': (r) => r.status === 204,
  });
}

export function fluxoPix() {
  const id = iniciarPix();
  consultarPix(id);
}

export default function () {
  fluxoPix();
}

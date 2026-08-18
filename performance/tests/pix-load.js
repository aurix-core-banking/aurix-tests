// Teste de carga PIX: simula alto volume de operações PIX.
//
// Cenário com ramping VUs: 20 → 100 → 200 → 100 → 0 (5 minutos).
// Endpoints testados:
//   - POST /api/pix (criar PIX)
//   - POST /api/pix/{id}/confirmar (confirmar)
//   - GET  /api/pix/{id} (consultar)
//   - POST /api/pix/chaves (criar chave)
//   - GET  /api/pix/chaves (listar chaves)
//
// Execução:
//   k6 run performance/tests/pix-load.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import {
  BASE_URL,
  THRESHOLDS,
  payloadPix,
  payloadConfirmarPix,
  payloadChavePix,
  gerarChavePix,
  idDe,
  jsonOf,
  contaId,
} from '../k6-config.js';

const PIX_BASE = `${BASE_URL}/api/pix`;

export const options = {
  scenarios: {
    carga_pix: {
      executor: 'ramping-vus',
      startVUs: 20,
      stages: [
        { duration: '1m', target: 100 },
        { duration: '2m', target: 200 },
        { duration: '1m', target: 100 },
        { duration: '1m', target: 0 },
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: THRESHOLDS,
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
};

function criarPix() {
  const chave = gerarChavePix();
  const res = http.post(`${PIX_BASE}`, payloadPix(chave), {
    headers: { 'Content-Type': 'application/json' },
  });
  check(res, {
    'Criar PIX responde 201': (r) => r.status === 201,
    'Criar PIX retorna id': (r) => idDe(r) !== null,
  });
  return idDe(res);
}

function confirmarPix(id) {
  if (!id) return;
  const res = http.post(`${PIX_BASE}/${id}/confirmar`, payloadConfirmarPix(id), {
    headers: { 'Content-Type': 'application/json' },
  });
  check(res, {
    'Confirmar PIX responde 200': (r) => r.status === 200,
  });
}

function consultarPix(id) {
  if (!id) return;
  const res = http.get(`${PIX_BASE}/${id}`);
  check(res, {
    'Consultar PIX responde 200': (r) => r.status === 200,
  });
}

function criarChavePix() {
  const res = http.post(`${PIX_BASE}/chaves`, payloadChavePix(), {
    headers: { 'Content-Type': 'application/json' },
  });
  check(res, {
    'Criar chave PIX responde 201': (r) => r.status === 201,
    'Criar chave PIX retorna id': (r) => idDe(r) !== null,
  });
}

function listarChavesPix() {
  const res = http.get(`${PIX_BASE}/chaves`);
  check(res, {
    'Listar chaves PIX responde 200': (r) => r.status === 200,
  });
}

export default function () {
  // Fluxo 1: criar PIX, confirmar e consultar
  const pixId = criarPix();
  confirmarPix(pixId);
  consultarPix(pixId);

  sleep(0.3);

  // Fluxo 2: criar e listar chaves
  criarChavePix();
  listarChavesPix();

  sleep(0.5);
}

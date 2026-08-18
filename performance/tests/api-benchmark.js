// Benchmark de tempo de resposta: mede latência de cada endpoint individualmente.
//
// Cenário: 1 VU, requisições sequenciais.
// Objetivo: baseline de performance por endpoint, sem interferência de concorrência.
// Gera percentis por endpoint.
//
// Execução:
//   k6 run performance/tests/api-benchmark.js
import http from 'k6/http';
import { check, sleep, group } from 'k6';
import {
  BASE_URL,
  payloadCriarConta,
  payloadTransacao,
  payloadPix,
  payloadOnboardingPF,
  payloadOnboardingPJ,
  payloadSimularCredito,
  gerarChavePix,
  idDe,
  contaId,
} from '../k6-config.js';

export const options = {
  scenarios: {
    benchmark: {
      executor: 'shared-iterations',
      vus: 1,
      iterations: 1,
      maxDuration: '5m',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.01'],
  },
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
};

export default function () {
  let id;

  // ── Banking ──────────────────────────────────────────────────────────
  group('Benchmark: POST /api/contas', () => {
    const res = http.post(`${BASE_URL}/api/contas`, payloadCriarConta(), {
      headers: { 'Content-Type': 'application/json' },
      tags: { endpoint: 'criar_conta' },
    });
    check(res, { 'Criar conta 201': (r) => r.status === 201 });
    id = idDe(res);
  });
  sleep(1);

  group('Benchmark: GET /api/contas/{id}', () => {
    const res = http.get(`${BASE_URL}/api/contas/${id || 1}`, {
      tags: { endpoint: 'consultar_conta' },
    });
    check(res, { 'Consultar conta 200': (r) => r.status === 200 });
  });
  sleep(1);

  group('Benchmark: POST /api/transacoes', () => {
    const res = http.post(`${BASE_URL}/api/transacoes`, payloadTransacao(), {
      headers: { 'Content-Type': 'application/json' },
      tags: { endpoint: 'criar_transacao' },
    });
    check(res, { 'Criar transação 201': (r) => r.status === 201 });
  });
  sleep(1);

  group('Benchmark: GET /api/transacoes/{id}', () => {
    const params = new URLSearchParams({
      page: '0',
      size: '10',
      sort: 'dataTransacao,desc',
    });
    const res = http.get(`${BASE_URL}/api/transacoes/conta/${contaId()}?${params.toString()}`, {
      tags: { endpoint: 'consultar_transacao' },
    });
    check(res, { 'Consultar transação 200': (r) => r.status === 200 });
  });
  sleep(1);

  group('Benchmark: POST /api/transferencias', () => {
    const res = http.post(`${BASE_URL}/api/transferencias`, JSON.stringify({
      contaOrigemId: Number(contaId()),
      contaDestinoId: Number(contaId()) + 1,
      valor: 50.00,
      descricao: 'Benchmark',
    }), {
      headers: { 'Content-Type': 'application/json' },
      tags: { endpoint: 'transferir' },
    });
    check(res, { 'Transferir 201': (r) => r.status === 201 || r.status === 200 });
  });
  sleep(1);

  // ── PIX ──────────────────────────────────────────────────────────────
  group('Benchmark: POST /api/pix', () => {
    const chave = gerarChavePix();
    const res = http.post(`${BASE_URL}/api/pix`, payloadPix(chave), {
      headers: { 'Content-Type': 'application/json' },
      tags: { endpoint: 'criar_pix' },
    });
    check(res, { 'Criar PIX 201': (r) => r.status === 201 });
    id = idDe(res);
  });
  sleep(1);

  group('Benchmark: GET /api/pix/{id}', () => {
    const res = http.get(`${BASE_URL}/api/pix/${id || 1}`, {
      tags: { endpoint: 'consultar_pix' },
    });
    check(res, { 'Consultar PIX 200': (r) => r.status === 200 });
  });
  sleep(1);

  group('Benchmark: POST /api/pix/chaves', () => {
    const res = http.post(`${BASE_URL}/api/pix/chaves`, JSON.stringify({
      tipoChave: 'EMAIL',
      chave: `benchmark.${Date.now()}@aurix.test`,
    }), {
      headers: { 'Content-Type': 'application/json' },
      tags: { endpoint: 'criar_chave_pix' },
    });
    check(res, { 'Criar chave PIX 201': (r) => r.status === 201 });
  });
  sleep(1);

  group('Benchmark: GET /api/pix/chaves', () => {
    const res = http.get(`${BASE_URL}/api/pix/chaves`, {
      tags: { endpoint: 'listar_chaves_pix' },
    });
    check(res, { 'Listar chaves PIX 200': (r) => r.status === 200 });
  });
  sleep(1);

  // ── Customer ─────────────────────────────────────────────────────────
  group('Benchmark: POST /api/clientes (PF)', () => {
    const res = http.post(`${BASE_URL}/api/clientes`, payloadOnboardingPF(), {
      headers: { 'Content-Type': 'application/json' },
      tags: { endpoint: 'cadastrar_pf' },
    });
    check(res, { 'Cadastrar PF 201': (r) => r.status === 201 });
  });
  sleep(1);

  group('Benchmark: POST /api/clientes/pj', () => {
    const res = http.post(`${BASE_URL}/api/clientes/pj`, payloadOnboardingPJ(), {
      headers: { 'Content-Type': 'application/json' },
      tags: { endpoint: 'cadastrar_pj' },
    });
    check(res, { 'Cadastrar PJ 201': (r) => r.status === 201 });
  });
  sleep(1);

  // ── Crédito ──────────────────────────────────────────────────────────
  group('Benchmark: POST /api/credito/simular', () => {
    const res = http.post(`${BASE_URL}/api/credito/simular`, payloadSimularCredito(), {
      headers: { 'Content-Type': 'application/json' },
      tags: { endpoint: 'simular_credito' },
    });
    check(res, { 'Simular crédito 200': (r) => r.status === 200 });
  });
  sleep(1);

  // ── Health ───────────────────────────────────────────────────────────
  group('Benchmark: GET /actuator/health', () => {
    const res = http.get(`${BASE_URL}/actuator/health`, {
      tags: { endpoint: 'health_check' },
    });
    check(res, { 'Health check 200': (r) => r.status === 200 });
  });
}

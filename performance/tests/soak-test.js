// Teste de soak: carga constante por 30 minutos para detectar
// memory leaks, connection pool exhaustion e degradação gradual.
//
// Cenário: 50 VUs constantes por 30 minutos.
// Todos os endpoints bancários são exercitados.
//
// Execução:
//   k6 run performance/tests/soak-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import {
  BASE_URL,
  THRESHOLDS_SOAK,
  payloadCriarConta,
  payloadTransacao,
  payloadPix,
  payloadOnboardingPF,
  gerarChavePix,
  idDe,
  contaId,
} from '../k6-config.js';

export const options = {
  scenarios: {
    soak_banking: {
      executor: 'constant-vus',
      vus: 50,
      duration: '30m',
    },
  },
  thresholds: THRESHOLDS_SOAK,
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
};

// Contadores locais para monitorar degradação
let iteracoes = 0;
let erros = 0;

function criarConta() {
  const res = http.post(`${BASE_URL}/api/contas`, payloadCriarConta(), {
    headers: { 'Content-Type': 'application/json' },
  });
  const ok = check(res, {
    'Soak criar conta responde 2xx': (r) => r.status >= 200 && r.status < 300,
  });
  if (!ok) erros++;
  return idDe(res);
}

function consultarConta(id) {
  if (!id) return;
  const res = http.get(`${BASE_URL}/api/contas/${id}`);
  check(res, {
    'Soak consultar conta responde 200': (r) => r.status === 200,
  });
}

function criarTransacao() {
  const res = http.post(`${BASE_URL}/api/transacoes`, payloadTransacao(), {
    headers: { 'Content-Type': 'application/json' },
  });
  const ok = check(res, {
    'Soak criar transação responde 2xx': (r) => r.status >= 200 && r.status < 300,
  });
  if (!ok) erros++;
}

function consultarExtrato() {
  const params = new URLSearchParams({
    page: '0',
    size: '20',
    sort: 'dataTransacao,desc',
  });
  const url = `${BASE_URL}/api/transacoes/conta/${contaId()}?${params.toString()}`;
  const res = http.get(url);
  check(res, {
    'Soak consultar extrato responde 200': (r) => r.status === 200,
  });
}

function criarPix() {
  const chave = gerarChavePix();
  const res = http.post(`${BASE_URL}/api/pix`, payloadPix(chave), {
    headers: { 'Content-Type': 'application/json' },
  });
  const ok = check(res, {
    'Soak criar PIX responde 2xx': (r) => r.status >= 200 && r.status < 300,
  });
  if (!ok) erros++;
}

function cadastrarCliente() {
  const res = http.post(`${BASE_URL}/api/clientes`, payloadOnboardingPF(), {
    headers: { 'Content-Type': 'application/json' },
  });
  check(res, {
    'Soak cadastrar cliente responde 2xx': (r) => r.status >= 200 && r.status < 300,
  });
}

function healthCheck() {
  const res = http.get(`${BASE_URL}/actuator/health`);
  check(res, {
    'Soak health check responde 200': (r) => r.status === 200,
  });
}

export default function () {
  iteracoes++;

  // A cada 100 iterações, logar métricas
  if (iteracoes % 100 === 0) {
    const taxaErro = (erros / iteracoes * 100).toFixed(2);
    console.info(`[SOAK] Iterações: ${iteracoes} | Erros: ${erros} (${taxaErro}%)`);
  }

  // Alternar entre diferentes operações bancárias
  const operacao = __ITER % 6;

  switch (operacao) {
    case 0: {
      const id = criarConta();
      consultarConta(id);
      break;
    }
    case 1:
      criarTransacao();
      break;
    case 2:
      consultarExtrato();
      break;
    case 3:
      criarPix();
      break;
    case 4:
      cadastrarCliente();
      break;
    case 5:
      healthCheck();
      break;
  }

  // Intervalo entre operações (simula ritmo de usuário real)
  sleep(1 + Math.random() * 2);
}

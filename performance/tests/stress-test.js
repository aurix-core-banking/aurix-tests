// Teste de estresse progressivo: encontra o ponto de quebra do sistema.
//
// Progressão: 10 → 100 → 500 → 1000 VUs.
// Monitora a curva de degradação: latência, taxa de erros, throughput.
//
// Diferente do load-test, NÃO há threshold de latência — o objetivo é
// observar quando o sistema colapsa. Threshold: http_req_failed < 5%.
//
// Execução:
//   k6 run performance/tests/stress-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import {
  BASE_URL,
  THRESHOLDS_ESTRESSE,
  payloadCriarConta,
  payloadTransacao,
  payloadPix,
  gerarChavePix,
  idDe,
} from '../k6-config.js';

export const options = {
  scenarios: {
    estresse_progressivo: {
      executor: 'ramping-vus',
      startVUs: 10,
      stages: [
        { duration: '1m', target: 100 },
        { duration: '2m', target: 500 },
        { duration: '2m', target: 1000 },
        { duration: '1m', target: 0 },
      ],
      gracefulRampDown: '2m',
    },
  },
  thresholds: THRESHOLDS_ESTRESSE,
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
};

let contagemErros = 0;
let totalRequisicoes = 0;

function criarConta() {
  totalRequisicoes++;
  const res = http.post(`${BASE_URL}/api/contas`, payloadCriarConta(), {
    headers: { 'Content-Type': 'application/json' },
  });
  if (res.status < 200 || res.status >= 300) {
    contagemErros++;
  }
  check(res, {
    'Estresse criar conta responde 2xx': (r) => r.status >= 200 && r.status < 300,
  });
}

function criarTransacao() {
  totalRequisicoes++;
  const res = http.post(`${BASE_URL}/api/transacoes`, payloadTransacao(), {
    headers: { 'Content-Type': 'application/json' },
  });
  if (res.status < 200 || res.status >= 300) {
    contagemErros++;
  }
  check(res, {
    'Estresse criar transação responde 2xx': (r) => r.status >= 200 && r.status < 300,
  });
}

function criarPix() {
  totalRequisicoes++;
  const chave = gerarChavePix();
  const res = http.post(`${BASE_URL}/api/pix`, payloadPix(chave), {
    headers: { 'Content-Type': 'application/json' },
  });
  if (res.status < 200 || res.status >= 300) {
    contagemErros++;
  }
  check(res, {
    'Estresse criar PIX responde 2xx': (r) => r.status >= 200 && r.status < 300,
  });
}

function healthCheck() {
  totalRequisicoes++;
  const res = http.get(`${BASE_URL}/actuator/health`);
  if (res.status !== 200) {
    contagemErros++;
  }
  check(res, {
    'Estresse health check responde 200': (r) => r.status === 200,
  });
}

export default function () {
  const operacao = __ITER % 4;

  switch (operacao) {
    case 0:
      criarConta();
      break;
    case 1:
      criarTransacao();
      break;
    case 2:
      criarPix();
      break;
    case 3:
      healthCheck();
      break;
  }

  // Sem sleep intencional — maximize a pressão no sistema
  // Apenas yield mínimo para o k6 processar
  sleep(0.01);
}

export function handleSummary(data) {
  const taxaErro = totalRequisicoes > 0
    ? (contagemErros / totalRequisicoes * 100).toFixed(2)
    : '0.00';

  console.info('\n═══════════════════════════════════════════════════════════');
  console.info('  RESUMO DO TESTE DE ESTRESSE');
  console.info('═══════════════════════════════════════════════════════════');
  console.info(`  Total de requisições: ${totalRequisicoes}`);
  console.info(`  Total de erros:       ${contagemErros}`);
  console.info(`  Taxa de erro:         ${taxaErro}%`);
  console.info('═══════════════════════════════════════════════════════════\n');

  return {};
}

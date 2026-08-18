// Configuração global dos testes de performance k6.
//
// Centraliza URL base, headers, thresholds e utilitários reutilizados
// por todos os cenários da suíte de performance.
//
// Sobrescrever variáveis via -e:
//   k6 run -e AURIX_BASE_URL=http://... -e AURIX_AUTH_TOKEN=xxx ...
import http from 'k6/http';

// ── URL base (gateway Traefik/Aurix) ────────────────────────────────────
export const BASE_URL = __ENV.AURIX_BASE_URL || 'http://localhost:8080';

// ── Autenticação ─────────────────────────────────────────────────────────
// Token JWT obtido via Keycloak. Em testes de load, o token pode ser
// obtido via fluxo de login ou injetado via variável de ambiente.
export const AUTH_TOKEN = __ENV.AURIX_AUTH_TOKEN || '';

export function headersComAuth(extra = {}) {
  return {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(AUTH_TOKEN ? { Authorization: `Bearer ${AUTH_TOKEN}` } : {}),
    ...extra,
  };
}

// ── Headers padrão (sem auth) ────────────────────────────────────────────
export const HEADERS_JSON = {
  'Content-Type': 'application/json',
  Accept: 'application/json',
};

// ── Thresholds globais ───────────────────────────────────────────────────
export const THRESHOLDS = {
  http_req_duration: ['p(95)<500', 'p(99)<1000'],
  http_req_failed: ['rate<0.01'],
  http_reqs: ['rate>100'],
};

// Thresholds para testes de estresse (mais permissivos).
export const THRESHOLDS_ESTRESSE = {
  http_req_failed: ['rate<0.05'],
};

// Thresholds para soak test (valida estabilidade).
export const THRESHOLDS_SOAK = {
  http_req_duration: ['p(95)<600', 'p(99)<1200'],
  http_req_failed: ['rate<0.015'],
};

// ── Geração de dados ────────────────────────────────────────────────────
function digitoVerificador(digitos) {
  let resto = 0;
  for (let i = 0; i < digitos.length; i += 1) {
    resto = (resto + digitos[i] * (digitos.length + 1 - i)) % 11;
  }
  const dv = 11 - resto;
  return dv >= 10 ? 0 : dv;
}

export function gerarCpf() {
  const base = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10));
  const dv1 = digitoVerificador(base);
  const dv2 = digitoVerificador(base.concat([dv1]));
  return base.concat([dv1, dv2]).join('');
}

export function gerarCnpj() {
  const base = Array.from({ length: 12 }, () => Math.floor(Math.random() * 10));
  const pesos1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const pesos2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const mod11 = (arr, pesos) => {
    let soma = 0;
    for (let i = 0; i < arr.length; i += 1) {
      soma += arr[i] * pesos[i];
    }
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };
  const dv1 = mod11(base, pesos1);
  const dv2 = mod11(base.concat([dv1]), pesos2);
  return base.concat([dv1, dv2]).join('');
}

export function gerarChavePix() {
  return `k6.${__VU}.${__ITER}.${Date.now()}@aurix.test`;
}

export function gerarValor() {
  return Math.round((10 + Math.random() * 490) * 100) / 100;
}

export function contaId() {
  return __ENV.AURIX_CONTA_ID || 1;
}

// ── Payloads ─────────────────────────────────────────────────────────────
export function payloadCriarConta() {
  return JSON.stringify({
    clienteId: __VU + 1000,
    tipoConta: 'CONTA_CORRENTE',
    agencia: '0001',
    numero: String(Date.now()).slice(-10),
    moeda: 'BRL',
  });
}

export function payloadTransacao() {
  return JSON.stringify({
    contaOrigemId: Number(contaId()),
    tipoTransacao: 'DEBITO',
    valor: gerarValor(),
    descricao: 'Teste de performance transação',
    categoria: 'SAQUE',
  });
}

export function payloadTransferencia() {
  return JSON.stringify({
    contaOrigemId: Number(contaId()),
    contaDestinoId: Number(contaId()) + 1,
    valor: gerarValor(),
    descricao: 'Teste de performance transferência',
  });
}

export function payloadPix(chavePixDestino) {
  return JSON.stringify({
    contaOrigemId: Number(contaId()),
    chavePixDestino,
    nomeDestinatario: 'Destino Teste',
    valor: gerarValor(),
    tipoChave: 'EMAIL',
    descricao: 'Teste de performance PIX',
  });
}

export function payloadConfirmarPix(id) {
  return JSON.stringify({
    pixId: id,
    confirmado: true,
  });
}

export function payloadChavePix() {
  const tipo = ['EMAIL', 'TELEFONE', 'CPF', 'CNPJ', 'ALEATORIA'];
  const tipoEscolhido = tipo[Math.floor(Math.random() * tipo.length)];
  return JSON.stringify({
    tipoChave: tipoEscolhido,
    chave: tipoEscolhido === 'EMAIL' ? gerarChavePix() : gerarCpf(),
  });
}

export function payloadOnboardingPF() {
  return JSON.stringify({
    cpf: gerarCpf(),
    nome: 'Cliente Performance PF',
    email: `cliente.pf.${__VU}.${__ITER}@aurix.test`,
    telefone: '11987654321',
  });
}

export function payloadOnboardingPJ() {
  return JSON.stringify({
    cnpj: gerarCnpj(),
    razaoSocial: `Empresa Performance ${__VU}-${__ITER} Ltda`,
    nomeFantasia: `Empresa K6 ${__VU}`,
    email: `cliente.pj.${__VU}.${__ITER}@aurix.test`,
    telefone: '11987654321',
    endereco: 'Rua de Teste, 100',
  });
}

export function payloadIniciarKyc() {
  return JSON.stringify({
    clienteId: __VU + 1000,
    tipoDocumento: 'RG',
    urlDocumento: 'https://aurix.test/documento/k6.pdf',
  });
}

export function payloadSimularCredito() {
  return JSON.stringify({
    valorSolicitado: gerarValor(),
    prazoMeses: Math.floor(Math.random() * 48) + 1,
    tipoProduto: 'PERSONAL',
  });
}

export function payloadSolicitarCredito() {
  return JSON.stringify({
    clienteId: __VU + 1000,
    valorSolicitado: gerarValor(),
    prazoMeses: Math.floor(Math.random() * 48) + 1,
    tipoProduto: 'PERSONAL',
    rendaMensal: gerarValor() * 3,
  });
}

export function payloadFraudScore() {
  return JSON.stringify({
    transacaoId: `TXN-${__VU}-${__ITER}-${Date.now()}`,
    valor: gerarValor(),
    origem: 'K6_PERFORMANCE',
    ip: '192.168.1.100',
    dispositivo: 'k6-load-tester',
  });
}

// ── Utilitários HTTP ─────────────────────────────────────────────────────
export function jsonOf(res) {
  try {
    return res.json();
  } catch (err) {
    return {};
  }
}

export function idDe(res) {
  const corpo = jsonOf(res);
  return corpo && corpo.id !== undefined ? corpo.id : null;
}

export function getJson(url, params) {
  const res = http.get(url, params);
  return { res, corpo: jsonOf(res) };
}

export function postJson(url, payload, headers) {
  const h = headers || HEADERS_JSON;
  const res = http.post(url, payload, { headers: h });
  return { res, corpo: jsonOf(res) };
}

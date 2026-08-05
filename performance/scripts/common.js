// Utilitários comuns para os testes de performance k6.
import http from 'k6/http';

// URL base (gateway Traefik/Aurix). Sobrescrever via -e AURIX_BASE_URL=http://...
export const BASE_URL = __ENV.AURIX_BASE_URL || 'http://localhost:8080';

export const HEADERS_JSON = {
  'Content-Type': 'application/json',
  Accept: 'application/json',
};

// Thresholds padrão de performance definidos na issue:
//   p95 < 500ms e p99 < 1s, com tolerância a < 1% de falhas.
export const THRESHOLDS = {
  http_req_duration: ['p(95)<500', 'p(99)<1000'],
  http_req_failed: ['rate<0.01'],
};

// Número da conta usada nos cenários (padrão; sobrescrever via AURIX_CONTA_ID).
export function contaId() {
  return __ENV.AURIX_CONTA_ID || 1;
}

function digitoVerificador(digitos) {
  let resto = 0;
  for (let i = 0; i < digitos.length; i += 1) {
    resto = (resto + digitos[i] * (digitos.length + 1 - i)) % 11;
  }
  const dv = 11 - resto;
  return dv >= 10 ? 0 : dv;
}

// Gera um CPF válido (11 dígitos, com dígitos verificadores).
export function gerarCpf() {
  const base = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10));
  const dv1 = digitoVerificador(base);
  const dv2 = digitoVerificador(base.concat([dv1]));
  return base.concat([dv1, dv2]).join('');
}

// Gera um CNPJ válido (14 dígitos, com dígitos verificadores).
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

// Gera uma chave PIX (e-mail) única por VU/iteração.
export function gerarChavePix() {
  return `k6.${__VU}.${__ITER}.${Date.now()}@aurix.test`;
}

// Gera um valor de transação entre 10 e 500 reais.
export function gerarValor() {
  return Math.round((10 + Math.random() * 490) * 100) / 100;
}

// Payload de transferência PIX (espelha o contrato do svc-payments).
export function payloadPixTransferencia(chavePixDestino) {
  return JSON.stringify({
    contaOrigemId: Number(contaId()),
    chavePixDestino,
    nomeDestinatario: 'Destino Teste',
    valor: gerarValor(),
    tipoChave: 'EMAIL',
    descricao: 'Teste de performance PIX',
  });
}

// Payload de cadastro de pessoa física (onboarding).
export function payloadOnboardingPF() {
  return JSON.stringify({
    cpf: gerarCpf(),
    nome: 'Cliente Performance PF',
    email: `cliente.pf.${__VU}.${__ITER}@aurix.test`,
    telefone: '11987654321',
  });
}

// Payload de cadastro de pessoa jurídica (onboarding).
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

// Payload de TED (SPI/STR do svc-cambio).
export function payloadTED() {
  return JSON.stringify({
    numeroControle: `TED${__VU}${__ITER}${Date.now()}`,
    ispbOrigem: '00000000',
    ispbDestino: '00123456',
    contaOrigem: String(Number(contaId())).padStart(10, '0'),
    contaDestino: '9876543210',
    valor: gerarValor(),
    tipoSTR: 'TED',
    observacoes: 'Teste de performance TED',
  });
}

// Payload de agendamento de débito (svc-banking).
export function payloadAgendamentoDebito() {
  const amanha = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const dataDebito = amanha.toISOString().slice(0, 10);
  return JSON.stringify({
    contaId: Number(contaId()),
    valor: gerarValor(),
    dataDebito,
    descricao: 'Teste de performance agendamento',
    recorrente: false,
    periodicidade: 'MENSAL',
  });
}

// Converte a resposta JSON para objeto, sem estourar quando vier corpo vazio.
export function jsonOf(res) {
  try {
    return res.json();
  } catch (err) {
    return {};
  }
}

// Extrai o id de um corpo de resposta, quando presente.
export function idDe(res) {
  const corpo = jsonOf(res);
  return corpo && corpo.id !== undefined ? corpo.id : null;
}

// GET com check de status e retorno do corpo.
export function getJson(url, params) {
  const res = http.get(url, params);
  return { res, corpo: jsonOf(res) };
}

// POST JSON com check de status e retorno do corpo.
export function postJson(url, payload) {
  const res = http.post(url, payload, { headers: HEADERS_JSON });
  return { res, corpo: jsonOf(res) };
}

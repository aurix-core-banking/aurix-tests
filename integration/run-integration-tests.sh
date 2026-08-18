#!/bin/bash
# =============================================================================
# Aurix - Runner de Testes de Integração
# Inicia serviços, executa testes REST Assured e gera relatório
# =============================================================================

set -euo pipefail

# Configurações
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"
SERVICES_DIR="${PROJECT_ROOT}/aurix-backend"
INFRA_DIR="${PROJECT_ROOT}/aurix-infrastructure"
TESTS_DIR="${SCRIPT_DIR}"
REPORT_DIR="${REPORT_DIR:-${TESTS_DIR}/reports}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
REPORT_FILE="${REPORT_DIR}/integration-report-${TIMESTAMP}"

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_step() { echo -e "${BLUE}[STEP]${NC} $1"; }

# Criar diretório de relatórios
mkdir -p "${REPORT_DIR}"

log_info "=========================================="
log_info "Aurix - Runner de Testes de Integração"
log_info "=========================================="
log_info "Data: $(date '+%d/%m/%Y %H:%M:%S')"
log_info ""

# Função de cleanup
cleanup() {
    log_info "Limpando recursos..."
    if [ "${KEEP_SERVICES:-false}" != "true" ]; then
        if [ -f "${INFRA_DIR}/docker-compose.yml" ]; then
            log_info "Parando containers Docker..."
            cd "${INFRA_DIR}" && docker-compose down -v 2>/dev/null || true
        fi
    else
        log_info "Mantendo serviços rodando (KEEP_SERVICES=true)"
    fi
}

trap cleanup EXIT

# Verificar pré-requisitos
log_step "1/6 Verificando pré-requisitos..."

# Verificar Maven
if ! command -v mvn &> /dev/null; then
    if [ -f "${SERVICES_DIR}/mvnw" ]; then
        MVN_CMD="${SERVICES_DIR}/mvnw"
        log_info "Usando Maven Wrapper: ${MVN_CMD}"
    else
        log_error "Maven não encontrado. Instale o Maven ou use o wrapper."
        exit 1
    fi
else
    MVN_CMD="mvn"
fi

# Verificar Docker
if ! command -v docker &> /dev/null; then
    log_error "Docker não encontrado. Instale o Docker para continuar."
    exit 1
fi

log_info "Pré-requisitos verificados!"

# Iniciar infraestrutura
log_step "2/6 Iniciando infraestrutura..."
if [ -f "${INFRA_DIR}/docker-compose.yml" ]; then
    log_info "Iniciando containers Docker..."
    cd "${INFRA_DIR}" && docker-compose up -d postgres redis kafka 2>/dev/null || {
        log_warn "Falha ao iniciar containers. Verifique o Docker."
    }
    log_info "Aguardando serviços ficarem prontos..."
    sleep 10
else
    log_warn "docker-compose.yml não encontrado em ${INFRA_DIR}"
    log_warn "Assumindo que os serviços já estão rodando"
fi

# Verificar se os serviços estão acessíveis
log_step "3/6 Verificando serviços..."
API_BASE_URI="${API_BASE_URI:-http://localhost:8080}"

MAX_RETRIES=30
RETRY_COUNT=0
while ! curl -sf "${API_BASE_URI}/actuator/health" > /dev/null 2>&1; do
    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [ ${RETRY_COUNT} -ge ${MAX_RETRIES} ]; then
        log_error "Serviços não ficaram prontos após ${MAX_RETRIES} tentativas"
        log_error "Verifique os logs dos containers"
        exit 1
    fi
    log_info "Aguardando serviços... (${RETRY_COUNT}/${MAX_RETRIES})"
    sleep 5
done

log_info "Serviços prontos!"

# Compilar testes
log_step "4/6 Compilando testes de integração..."
cd "${TESTS_DIR}/integration"
${MVN_CMD} compile -q 2>&1 || {
    log_error "Falha ao compilar testes"
    exit 1
}
log_info "Testes compilados!"

# Executar testes
log_step "5/6 Executando testes de integração..."

# Configurar variáveis de ambiente para os testes
export API_BASE_URI="${API_BASE_URI}"
export AUTH_TOKEN="${AUTH_TOKEN:-}"

# Executar testes com Maven Surefire
${MVN_CMD} test \
    -Dapi.base.uri="${API_BASE_URI}" \
    -Dauth.token="${AUTH_TOKEN}" \
    -Dtest.groups="integration" \
    2>&1 | tee "${REPORT_FILE}-output.txt"

TEST_EXIT_CODE=${PIPESTATUS[0]}

# Gerar relatório
log_step "6/6 Gerando relatório..."

# Criar relatório consolidado
cat > "${REPORT_FILE}.json" <<EOF
{
  "relatorio": "Aurix - Relatório de Testes de Integração",
  "data": "$(date '+%d/%m/%Y %H:%M:%S')",
  "target": "${API_BASE_URI}",
  "resultado": {
    "exitCode": ${TEST_EXIT_CODE},
    "status": "$([ ${TEST_EXIT_CODE} -eq 0 ] && echo "SUCESSO" || echo "FALHA")"
  },
  "arquivos": {
    "output": "${REPORT_FILE}-output.txt",
    "surefire": "${TESTS_DIR}/integration/target/surefire-reports/"
  }
}
EOF

# Criar relatório de texto
cat > "${REPORT_FILE}.txt" <<EOF
============================================================
  AURIX - RELATÓRIO DE TESTES DE INTEGRAÇÃO
============================================================

Data: $(date '+%d/%m/%Y %H:%M:%S')
Alvo: ${API_BASE_URI}

------------------------------------------------------------
  RESULTADO
------------------------------------------------------------

Status: $([ ${TEST_EXIT_CODE} -eq 0 ] && echo "SUCESSO" || echo "FALHA")
Exit Code: ${TEST_EXIT_CODE}

------------------------------------------------------------
  TESTES EXECUTADOS
------------------------------------------------------------

- ContaIntegrationTest: Criação, consulta, depósito, saque, transferência, saldo insuficiente
- PixIntegrationTest: Criação, confirmação, cancelamento, consulta de chaves PIX
- TedIntegrationTest: Criação, consulta, cancelamento de TEDs
- ClienteIntegrationTest: Cadastro, busca por CPF, atualização
- KycIntegrationTest: Início e aprovação de KYC
- CreditoIntegrationTest: Solicitação e aprovação de crédito

------------------------------------------------------------
  ARQUIVOS GERADOS
------------------------------------------------------------

- ${REPORT_FILE}.json (Relatório JSON)
- ${REPORT_FILE}.txt (Este relatório)
- ${REPORT_FILE}-output.txt (Output do Maven)
- ${TESTS_DIR}/integration/target/surefire-reports/ (Relatórios Surefire)

============================================================
  FIM DO RELATÓRIO
============================================================
EOF

log_info ""
log_info "=========================================="
if [ ${TEST_EXIT_CODE} -eq 0 ]; then
    log_info "  Todos os testes passaram!"
else
    log_warn "  Alguns testes falharam!"
fi
log_info "=========================================="
log_info ""
log_info "Relatório: ${REPORT_FILE}.json"
log_info "Relatório detalhado: ${REPORT_FILE}.txt"
log_info "Relatório Surefire: ${TESTS_DIR}/integration/target/surefire-reports/"
log_info ""

exit ${TEST_EXIT_CODE}

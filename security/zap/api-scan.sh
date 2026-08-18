#!/bin/bash
# =============================================================================
# Aurix - OWASP ZAP API Scan
# Importa OpenAPI/Swagger e executa scan ativo nos endpoints da API
# =============================================================================

set -euo pipefail

# Configurações
TARGET_URL="${TARGET_URL:-http://localhost:8080}"
API_SPEC_URL="${API_SPEC_URL:-http://localhost:8080/v3/api-docs}"
REPORT_DIR="${REPORT_DIR:-./reports}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
REPORT_FILE="${REPORT_DIR}/zap-api-scan-${TIMESTAMP}"
CONFIG_FILE="${CONFIG_FILE:-./zap-config.yml}"
AUTH_TOKEN="${AUTH_TOKEN:-}"

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Criar diretório de relatórios
mkdir -p "${REPORT_DIR}"

log_info "Iniciando OWASP ZAP API Scan"
log_info "Alvo: ${TARGET_URL}"
log_info "Spec URL: ${API_SPEC_URL}"
log_info "Relatório: ${REPORT_FILE}"

# Verificar se o Docker está disponível
if ! command -v docker &> /dev/null; then
    log_error "Docker não encontrado. Instale o Docker para continuar."
    exit 1
fi

# Verificar se a spec OpenAPI está disponível
log_info "Verificando disponibilidade da spec OpenAPI..."
if ! curl -sf "${API_SPEC_URL}" > /dev/null 2>&1; then
    log_warn "Spec OpenAPI não encontrada em ${API_SPEC_URL}"
    log_warn "Tentando alternativas..."

    # Tentar endpoints alternativos
    for ALT_URL in "${TARGET_URL}/v2/api-docs" "${TARGET_URL}/swagger.json" "${TARGET_URL}/api-docs"; do
        if curl -sf "${ALT_URL}" > /dev/null 2>&1; then
            API_SPEC_URL="${ALT_URL}"
            log_info "Spec encontrada em: ${ALT_URL}"
            break
        fi
    done
fi

# Baixar a spec OpenAPI para uso local
log_info "Baixando spec OpenAPI..."
curl -sf "${API_SPEC_URL}" -o "${REPORT_DIR}/openapi-spec.json" || {
    log_error "Falha ao baixar spec OpenAPI de ${API_SPEC_URL}"
    exit 1
}

# Montar headers de autenticação
AUTH_HEADER=""
if [ -n "${AUTH_TOKEN}" ]; then
    AUTH_HEADER="-z 'Authorization:Bearer ${AUTH_TOKEN}'"
fi

# Executar API scan com Docker
log_info "Executando API scan via Docker..."
docker run --rm \
    --name zap-api-scan \
    --network host \
    -v "$(pwd)/${REPORT_DIR}:/zap/wrk/${REPORT_DIR}" \
    -u "$(id -u):$(id -g)" \
    ghcr.io/zaproxy/zaproxy:stable \
    zap-api-scan.py \
    -t "${API_SPEC_URL}" \
    -f openapi \
    -r "zap-api-scan-${TIMESTAMP}.html" \
    -J "zap-api-scan-${TIMESTAMP}.json" \
    -x "zap-api-scan-${TIMESTAMP}.xml" \
    -c "${CONFIG_FILE}" \
    -I \
    -d \
    ${AUTH_HEADER}

EXIT_CODE=$?

# Gerar relatório de resumo
log_info "Gerando relatório de resumo..."
cat > "${REPORT_FILE}-summary.txt" <<EOF
=== OWASP ZAP API Scan - Resumo ===
Data: $(date '+%d/%m/%Y %H:%M:%S')
Alvo: ${TARGET_URL}
Spec URL: ${API_SPEC_URL}
Configuração: ${CONFIG_FILE}
Exit Code: ${EXIT_CODE}

Arquivos gerados:
- ${REPORT_FILE}.html (Relatório HTML)
- ${REPORT_FILE}.json (Relatório JSON)
- ${REPORT_FILE}.xml (Relatório XML)
- ${REPORT_FILE}-summary.txt (Este resumo)
- ${REPORT_DIR}/openapi-spec.json (Spec OpenAPI)
EOF

if [ ${EXIT_CODE} -eq 0 ]; then
    log_info "API scan concluído com sucesso!"
else
    log_warn "API scan finalizado com código ${EXIT_CODE}"
    log_warn "Verifique o relatório para detalhes sobre alertas encontrados"
fi

log_info "Relatórios salvos em: ${REPORT_DIR}/"
exit ${EXIT_CODE}

#!/bin/bash
# =============================================================================
# Aurix - OWASP ZAP Baseline Scan
# Executa scan baseline completo contra a API da plataforma Aurix
# =============================================================================

set -euo pipefail

# Configurações
TARGET_URL="${TARGET_URL:-http://localhost:8080}"
REPORT_DIR="${REPORT_DIR:-./reports}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
REPORT_FILE="${REPORT_DIR}/zap-baseline-${TIMESTAMP}"
CONFIG_FILE="${CONFIG_FILE:-./zap-config.yml}"

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

log_info "Iniciando OWASP ZAP Baseline Scan"
log_info "Alvo: ${TARGET_URL}"
log_info "Relatório: ${REPORT_FILE}"

# Verificar se o Docker está disponível
if ! command -v docker &> /dev/null; then
    log_error "Docker não encontrado. Instale o Docker para continuar."
    exit 1
fi

# Verificar se o container ZAP já existe e removê-lo
docker rm -f zap-baseline 2>/dev/null || true

# Executar baseline scan com Docker
log_info "Executando baseline scan via Docker..."
docker run --rm \
    --name zap-baseline \
    -v "$(pwd)/${REPORT_DIR}:/zap/wrk/${REPORT_DIR}" \
    -u "$(id -u):$(id -g)" \
    ghcr.io/zaproxy/zaproxy:stable \
    zap-baseline.py \
    -t "${TARGET_URL}" \
    -r "zap-baseline-${TIMESTAMP}.html" \
    -J "zap-baseline-${TIMESTAMP}.json" \
    -x "zap-baseline-${TIMESTAMP}.xml" \
    -c "${CONFIG_FILE}" \
    -I \
    -d

EXIT_CODE=$?

# Gerar relatório de resumo
log_info "Gerando relatório de resumo..."
cat > "${REPORT_FILE}-summary.txt" <<EOF
=== OWASP ZAP Baseline Scan - Resumo ===
Data: $(date '+%d/%m/%Y %H:%M:%S')
Alvo: ${TARGET_URL}
Configuração: ${CONFIG_FILE}
Exit Code: ${EXIT_CODE}

Arquivos gerados:
- ${REPORT_FILE}.html (Relatório HTML)
- ${REPORT_FILE}.json (Relatório JSON)
- ${REPORT_FILE}.xml (Relatório XML)
- ${REPORT_FILE}-summary.txt (Este resumo)
EOF

if [ ${EXIT_CODE} -eq 0 ]; then
    log_info "Baseline scan concluído com sucesso!"
else
    log_warn "Baseline scan finalizado com código ${EXIT_CODE}"
    log_warn "Verifique o relatório para detalhes sobre alertas encontrados"
fi

log_info "Relatórios salvos em: ${REPORT_DIR}/"
exit ${EXIT_CODE}

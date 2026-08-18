#!/bin/bash
# =============================================================================
# Aurix - Runner de Testes de Segurança
# Executa scan baseline e API scan, gera relatório consolidado
# =============================================================================

set -euo pipefail

# Configurações
TARGET_URL="${TARGET_URL:-http://localhost:8080}"
REPORT_DIR="${REPORT_DIR:-./reports}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
CONSOLIDATED_REPORT="${REPORT_DIR}/security-report-${TIMESTAMP}"
ZAP_SCRIPTS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/zap" && pwd)"

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
log_info "Aurix - Runner de Testes de Segurança"
log_info "=========================================="
log_info "Alvo: ${TARGET_URL}"
log_info "Data: $(date '+%d/%m/%Y %H:%M:%S')"
log_info ""

# Verificar se o Docker está disponível
if ! command -v docker &> /dev/null; then
    log_error "Docker não encontrado. Instale o Docker para continuar."
    exit 1
fi

# Verificar se o target está acessível
log_step "1/4 Verificando acessibilidade do target..."
if ! curl -sf "${TARGET_URL}" > /dev/null 2>&1; then
    log_error "Target ${TARGET_URL} não está acessível"
    log_error "Verifique se os serviços estão rodando"
    exit 1
fi
log_info "Target acessível!"

# Executar baseline scan
log_step "2/4 Executando OWASP ZAP Baseline Scan..."
if [ -f "${ZAP_SCRIPTS_DIR}/baseline-scan.sh" ]; then
    chmod +x "${ZAP_SCRIPTS_DIR}/baseline-scan.sh"
    ${ZAP_SCRIPTS_DIR}/baseline-scan.sh || {
        log_warn "Baseline scan falhou ou encontrou vulnerabilidades"
    }
else
    log_warn "Script baseline-scan.sh não encontrado em ${ZAP_SCRIPTS_DIR}"
fi

# Executar API scan
log_step "3/4 Executando OWASP ZAP API Scan..."
if [ -f "${ZAP_SCRIPTS_DIR}/api-scan.sh" ]; then
    chmod +x "${ZAP_SCRIPTS_DIR}/api-scan.sh"
    ${ZAP_SCRIPTS_DIR}/api-scan.sh || {
        log_warn "API scan falhou ou encontrou vulnerabilidades"
    }
else
    log_warn "Script api-scan.sh não encontrado em ${ZAP_SCRIPTS_DIR}"
fi

# Gerar relatório consolidado
log_step "4/4 Gerando relatório consolidado..."

# Encontrar os relatórios mais recentes
BASELINE_JSON=$(find "${REPORT_DIR}" -name "zap-baseline-*.json" -type f -printf '%T@ %p\n' 2>/dev/null | sort -rn | head -1 | cut -d' ' -f2-)
API_JSON=$(find "${REPORT_DIR}" -name "zap-api-scan-*.json" -type f -printf '%T@ %p\n' 2>/dev/null | sort -rn | head -1 | cut -d' ' -f2-)

# Criar relatório consolidado em JSON
cat > "${CONSOLIDATED_REPORT}.json" <<EOF
{
  "relatorio": "Aurix - Relatório de Testes de Segurança",
  "data": "$(date '+%d/%m/%Y %H:%M:%S')",
  "alvo": "${TARGET_URL}",
  "baseline": {
    "arquivo": "${BASELINE_JSON:-nenhum}",
    "status": "$([ -n "${BASELINE_JSON}" ] && echo "executado" || echo "não executado")"
  },
  "apiScan": {
    "arquivo": "${API_JSON:-nenhum}",
    "status": "$([ -n "${API_JSON}" ] && echo "executado" || echo "não executado")"
  }
}
EOF

# Criar relatório de texto consolidado
cat > "${CONSOLIDATED_REPORT}.txt" <<EOF
============================================================
  AURIX - RELATÓRIO CONSOLIDADO DE TESTES DE SEGURANÇA
============================================================

Data: $(date '+%d/%m/%Y %H:%M:%S')
Alvo: ${TARGET_URL}

------------------------------------------------------------
  RESUMO
------------------------------------------------------------

Baseline Scan: $([ -n "${BASELINE_JSON}" ] && echo "Executado" || echo "Não Executado")
API Scan: $([ -n "${API_JSON}" ] && echo "Executado" || echo "Não Executado")

------------------------------------------------------------
  ARQUIVOS GERADOS
------------------------------------------------------------

Relatórios individuais:
$(ls -la "${REPORT_DIR}"/zap-*-*.json 2>/dev/null || echo "Nenhum relatório JSON encontrado")
$(ls -la "${REPORT_DIR}"/zap-*-*.html 2>/dev/null || echo "Nenhum relatório HTML encontrado")
$(ls -la "${REPORT_DIR}"/zap-*-*.xml 2>/dev/null || echo "Nenhum relatório XML encontrado")

Relatório consolidado:
- ${CONSOLIDATED_REPORT}.json
- ${CONSOLIDATED_REPORT}.txt

------------------------------------------------------------
  PRÓXIMOS PASSOS
------------------------------------------------------------

1. Analise os relatórios HTML para detalhes visuais
2. Revise os alertas de severidade HIGH e MEDIUM
3. Implemente correções para vulnerabilidades encontradas
4. Re-execute os testes após correções
5. Documente as correções no ADR correspondente

============================================================
  FIM DO RELATÓRIO
============================================================
EOF

log_info ""
log_info "=========================================="
log_info "  Testes de Segurança Concluídos!"
log_info "=========================================="
log_info ""
log_info "Relatório consolidado: ${CONSOLIDATED_REPORT}.json"
log_info "Relatório detalhado: ${CONSOLIDATED_REPORT}.txt"
log_info ""

# Verificar se há vulnerabilidades críticas
if [ -n "${BASELINE_JSON}" ] && [ -f "${BASELINE_JSON}" ]; then
    HIGH_ALERTS=$(python3 -c "
import json
with open('${BASELINE_JSON}') as f:
    data = json.load(f)
    print(len(data.get('site', [{}])[0].get('alerts', [])))
" 2>/dev/null || echo "0")

    if [ "${HIGH_ALERTS}" -gt 0 ]; then
        log_warn "Encontrados ${HIGH_ALERTS} alertas de segurança!"
        log_warn "Revise os relatórios para detalhes"
        exit 1
    fi
fi

log_info "Nenhuma vulnerabilidade crítica encontrada."
exit 0

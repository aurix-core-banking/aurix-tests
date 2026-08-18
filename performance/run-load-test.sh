#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────
# Executa teste rápido de carga: banking + PIX.
#
# Uso:
#   ./performance/run-load-test.sh
#   AURIX_BASE_URL=http://localhost:8080 ./performance/run-load-test.sh
# ──────────────────────────────────────────────────────────────────────────
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RESULTS_DIR="${SCRIPT_DIR}/results"
BASE_URL="${AURIX_BASE_URL:-http://localhost:8080}"

mkdir -p "$RESULTS_DIR"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "═══════════════════════════════════════════════════════════"
echo "  TESTE RÁPIDO DE CARGA — Aurix Core Banking"
echo "  URL: ${BASE_URL}"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Health check primeiro
echo "▶ Verificando health check..."
if ! k6 run -e AURIX_BASE_URL="$BASE_URL" "${SCRIPT_DIR}/tests/health-check.js"; then
  echo "❌ Health check falhou — abortando testes de carga"
  exit 1
fi
echo ""

# Banking load
echo "▶ Executando Banking Load..."
k6 run \
  --summary-export="${RESULTS_DIR}/banking_${TIMESTAMP}_summary.json" \
  -e AURIX_BASE_URL="$BASE_URL" \
  "${SCRIPT_DIR}/tests/banking-load.js"
echo ""

# PIX load
echo "▶ Executando PIX Load..."
k6 run \
  --summary-export="${RESULTS_DIR}/pix_${TIMESTAMP}_summary.json" \
  -e AURIX_BASE_URL="$BASE_URL" \
  "${SCRIPT_DIR}/tests/pix-load.js"
echo ""

echo "═══════════════════════════════════════════════════════════"
echo "  Testes de carga concluídos"
echo "  Resultados: ${RESULTS_DIR}/*_${TIMESTAMP}_summary.json"
echo "═══════════════════════════════════════════════════════════"

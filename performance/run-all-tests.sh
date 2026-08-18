#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────
# Executa todos os testes de performance k6 sequencialmente e gera relatório.
#
# Uso:
#   ./performance/run-all-tests.sh
#   AURIX_BASE_URL=http://prod:8080 ./performance/run-all-tests.sh
# ──────────────────────────────────────────────────────────────────────────
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RESULTS_DIR="${SCRIPT_DIR}/results"
BASE_URL="${AURIX_BASE_URL:-http://localhost:8080}"

mkdir -p "$RESULTS_DIR"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
REPORT_FILE="${RESULTS_DIR}/relatorio_${TIMESTAMP}.txt"

echo "═══════════════════════════════════════════════════════════"
echo "  SUÍTE DE PERFORMANCE — Aurix Core Banking"
echo "  URL: ${BASE_URL}"
echo "  Data: $(date '+%d/%m/%Y %H:%M:%S')"
echo "═══════════════════════════════════════════════════════════"
echo ""

echo "Testes de performance k6" > "$REPORT_FILE"
echo "URL base: ${BASE_URL}" >> "$REPORT_FILE"
echo "Data: $(date '+%d/%m/%Y %H:%M:%S')" >> "$REPORT_FILE"
echo "───────────────────────────────────────────────" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

TESTS=(
  "tests/health-check.js:Health Check:60"
  "tests/banking-load.js:Banking Load:360"
  "tests/pix-load.js:PIX Load:360"
  "tests/customer-load.js:Customer Load:240"
  "tests/credit-load.js:Credit Load:240"
  "tests/fraud-load.js:Fraud Load:240"
  "tests/api-benchmark.js:API Benchmark:360"
  "tests/stress-test.js:Stress Test:420"
  "tests/soak-test.js:Soak Test:1920"
)

TOTAL_START=$(date +%s)
PASSED=0
FAILED=0

for entry in "${TESTS[@]}"; do
  IFS=':' read -r test_file test_name timeout <<< "$entry"
  test_path="${SCRIPT_DIR}/${test_file}"

  if [ ! -f "$test_path" ]; then
    echo "[SKIP] ${test_name} — arquivo não encontrado: ${test_file}"
    echo "[SKIP] ${test_name}" >> "$REPORT_FILE"
    continue
  fi

  echo "───────────────────────────────────────────────"
  echo "▶ Executando: ${test_name}"
  echo "  Arquivo: ${test_file}"
  echo "  Timeout: ${timeout}s"
  echo ""

  JSON_OUTPUT="${RESULTS_DIR}/${test_name// /_}_${TIMESTAMP}.json"

  if k6 run \
    --out json="$JSON_OUTPUT" \
    --summary-export="${RESULTS_DIR}/${test_name// /_}_${TIMESTAMP}_summary.json" \
    -e AURIX_BASE_URL="$BASE_URL" \
    "$test_path" 2>&1 | tee -a "$REPORT_FILE"; then
    echo ""
    echo "✅ ${test_name} — PASSOU"
    echo "[PASS] ${test_name}" >> "$REPORT_FILE"
    PASSED=$((PASSED + 1))
  else
    echo ""
    echo "❌ ${test_name} — FALHOU"
    echo "[FAIL] ${test_name}" >> "$REPORT_FILE"
    FAILED=$((FAILED + 1))
  fi
  echo ""
done

TOTAL_END=$(date +%s)
DURATION=$((TOTAL_END - TOTAL_START))

echo "═══════════════════════════════════════════════════════════"
echo "  RESUMO FINAL"
echo "  Passaram: ${PASSED}"
echo "  Falharam: ${FAILED}"
echo "  Duração total: ${DURATION}s"
echo "═══════════════════════════════════════════════════════════"

echo "" >> "$REPORT_FILE"
echo "═══════════════════════════════════════════════════════════" >> "$REPORT_FILE"
echo "RESUMO FINAL" >> "$REPORT_FILE"
echo "Passaram: ${PASSED}" >> "$REPORT_FILE"
echo "Falharam: ${FAILED}" >> "$REPORT_FILE"
echo "Duração total: ${DURATION}s" >> "$REPORT_FILE"
echo "═══════════════════════════════════════════════════════════" >> "$REPORT_FILE"

echo ""
echo "Relatório salvo em: ${REPORT_FILE}"

# Gerar relatório HTML se houver resultados JSON
if command -v node &> /dev/null; then
  HTML_FILE="${RESULTS_DIR}/relatorio_${TIMESTAMP}.html"
  if node "${SCRIPT_DIR}/results/handle-results.js" "$RESULTS_DIR" "$HTML_FILE" 2>/dev/null; then
    echo "Relatório HTML: ${HTML_FILE}"
  fi
fi

# Upload para InfluxDB (opcional)
if [ "${INFLUXDB_URL:-}" != "" ]; then
  echo ""
  echo "Enviando resultados para InfluxDB: ${INFLUXDB_URL}"
  for json_file in "${RESULTS_DIR}"/*_summary.json; do
    if [ -f "$json_file" ]; then
      echo "  → ${json_file}"
    fi
  done
fi

exit $FAILED

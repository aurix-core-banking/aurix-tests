#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════
# Contract Tests — Aurix Core Banking
# Publica pacts dos consumers, verifica providers via Pact Broker
# ═══════════════════════════════════════════════════════════

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="${SCRIPT_DIR}/../../aurix-backend"
BROKER_URL="${PACT_BROKER_URL:-http://localhost:9292}"
CONSUMER_VERSION="${PACT_CONSUMER_VERSION:-$(git rev-parse --short HEAD 2>/dev/null || echo '1.0.0-SNAPSHOT')}"
TAG="${PACT_TAG:-main}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}[PACT]${NC} $*"; }
warn() { echo -e "${YELLOW}[PACT]${NC} $*"; }
err()  { echo -e "${RED}[PACT]${NC} $*" >&2; }

# ─────────────────────────────────────────────────────────
# 1. Verificar Pact Broker
# ─────────────────────────────────────────────────────────
verificar_broker() {
    log "Verificando Pact Broker em ${BROKER_URL}..."
    if curl -sf "${BROKER_URL}/diagnostics/status" > /dev/null 2>&1; then
        log "Pact Broker disponível."
    else
        err "Pact Broker indisponível em ${BROKER_URL}."
        err "Inicie com: docker-compose -f docker-compose.pact.yml up -d"
        exit 1
    fi
}

# ─────────────────────────────────────────────────────────
# 2. Rodar testes consumer e publicar pacts
# ─────────────────────────────────────────────────────────
publicar_pacts_consumer() {
    log "Rodando testes consumer e publicando pacts..."

    local MODULES=(
        "svc-customer"
        "svc-payments"
        "svc-credit"
        "svc-fraud"
    )

    for module in "${MODULES[@]}"; do
        log "▸ Consumer: ${module}"
        "${BACKEND_DIR}/mvnw" test \
            -pl svc-customer \
            -Dtest="PactConsumerTest" \
            -Dpact.broker.url="${BROKER_URL}" \
            -Dpact.publish.version="${CONSUMER_VERSION}" \
            -Dpact.publish.tag="${TAG}" \
            -f "${BACKEND_DIR}/pom.xml" \
            --no-transfer-progress \
            || warn "Falha nos consumer tests de ${module}"
    done

    log "Pacts publicados no broker para versão ${CONSUMER_VERSION}"
}

# ─────────────────────────────────────────────────────────
# 3. Verificar providers via Pact Broker
# ─────────────────────────────────────────────────────────
verificar_providers() {
    log "Verificando providers via Pact Broker..."

    local PROVIDERS=(
        "svc-banking:8200"
        "svc-payments:8201"
    )

    for entry in "${PROVIDERS[@]}"; do
        local provider="${entry%%:*}"
        local porta="${entry##*:}"

        log "▸ Provider: ${provider} (porta ${ porta})"

        "${BACKEND_DIR}/mvnw" verify \
            -pl "${provider}" \
            -Dpact.provider.name="${provider}" \
            -Dpact.provider.version="${CONSUMER_VERSION}" \
            -Dpact.verifier.publishResults="true" \
            -Dpact.broker.url="${BROKER_URL}" \
            -Dpact.provider.tag="${TAG}" \
            -Dpact.provider.base.url="http://localhost:${porta}" \
            -f "${BACKEND_DIR}/${provider}/pom.xml" \
            --no-transfer-progress \
            || err "Falha na verificação do provider ${provider}"
    done

    log "Verificação de providers concluída."
}

# ─────────────────────────────────────────────────────────
# 4. Exibir resumo do Pact Broker
# ─────────────────────────────────────────────────────────
exibir_resumo() {
    log "═══ Resumo Pact Broker ═══"
    log "Pacts publicados:"
    curl -sf "${BROKER_URL}/pacts/latest" | python3 -m json.tool 2>/dev/null || \
        warn "Não foi possível consultar o broker"
    log "════════════════════════════"
}

# ─────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────
main() {
    local cmd="${1:-all}"

    case "${cmd}" in
        publish)
            verificar_broker
            publicar_pacts_consumer
            ;;
        verify)
            verificar_broker
            verificar_providers
            ;;
        summary|resumo)
            verificar_broker
            exibir_resumo
            ;;
        all)
            verificar_broker
            publicar_pacts_consumer
            verificar_providers
            exibir_resumo
            ;;
        *)
            echo "Uso: $0 {all|publish|verify|summary}"
            exit 1
            ;;
    esac
}

main "$@"

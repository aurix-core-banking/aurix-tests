import os


ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), os.pardir))
INFRASTRUCTURE_DIR = os.path.join(ROOT_DIR, "infrastructure")
DOCKER_COMPOSE_FILE = os.path.join(INFRASTRUCTURE_DIR, "docker-compose.yml")

DEFAULT_TIMEOUT_SECONDS = int(os.getenv("AUREUS_E2E_TIMEOUT", "300"))

SERVICE_HEALTH_ENDPOINTS = {
    # --- 14 serviços consolidados ---
    "svc-banking":     "http://localhost:8200/actuator/health",
    "svc-payments":    "http://localhost:8201/actuator/health",
    "svc-credit":      "http://localhost:8082/actuator/health",
    "svc-customer":    "http://localhost:8083/actuator/health",
    "svc-products":    "http://localhost:8084/actuator/health",
    "svc-contracts":   "http://localhost:8085/actuator/health",
    "svc-finance-mgmt":"http://localhost:8089/actuator/health",
    "svc-intelligence":"http://localhost:8091/actuator/health",
    "svc-platform":    "http://localhost:8092/actuator/health",
    "svc-cambio":      "http://localhost:8093/actuator/health",
    "svc-cards":       "http://localhost:8094/actuator/health",
    "svc-compliance":  "http://localhost:8205/actuator/health",
    "svc-fraud":       "http://localhost:8207/actuator/health",
    "svc-ai":          "http://localhost:8206/actuator/health",
}

GATEWAY_URL = "http://localhost:8080"

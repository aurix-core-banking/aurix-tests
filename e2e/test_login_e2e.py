import os

import pytest
import requests

from .config import GATEWAY_URL

AUTH_BASE = f"{GATEWAY_URL}/auth"
MFA_BASE = f"{GATEWAY_URL}/api/mfa"

# Credenciais reais para o fluxo de sucesso são opcionais: sem elas o teste é pulado.
EMAIL_LOGIN = os.getenv("AURIX_E2E_LOGIN_EMAIL", "admin@aurix.com.br")
SENHA_LOGIN = os.getenv("AURIX_E2E_LOGIN_SENHA", "")


def services_running() -> bool:
    try:
        r = requests.get(f"{GATEWAY_URL}/health", timeout=5)
        return r.status_code == 200
    except requests.ConnectionError:
        return False


def skip_if_services_down() -> None:
    if not services_running():
        pytest.skip("Gateway indisponível - pulando testes E2E de login")


@pytest.fixture(autouse=True)
def _verifica_gateway() -> None:
    skip_if_services_down()


def test_login_sucesso_retorna_token() -> None:
    if not SENHA_LOGIN:
        pytest.skip("Credenciais de login não configuradas (AURIX_E2E_LOGIN_SENHA)")
    r = requests.post(
        f"{AUTH_BASE}/login",
        json={"email": EMAIL_LOGIN, "senha": SENHA_LOGIN},
        timeout=10,
    )
    assert r.status_code == 200, f"Login falhou: {r.text}"
    body = r.json()
    assert body.get("token"), "Resposta de login sem token JWT"


def test_login_sem_email_retorna_400() -> None:
    r = requests.post(
        f"{AUTH_BASE}/login",
        json={"senha": SENHA_LOGIN or "senhaQualquer"},
        timeout=10,
    )
    assert r.status_code == 400, f"Esperava 400, recebeu {r.status_code}: {r.text}"


def test_login_credenciais_invalidas_nao_autenticam() -> None:
    r = requests.post(
        f"{AUTH_BASE}/login",
        json={"email": "inexistente@aurix.test", "senha": "senhaInvalida"},
        timeout=10,
    )
    assert r.status_code >= 400, f"Credenciais inválidas não devem autenticar: {r.text}"


def test_validar_token_invalido_retorna_false() -> None:
    r = requests.post(
        f"{AUTH_BASE}/validate",
        params={"token": "token-invalido"},
        timeout=10,
    )
    assert r.status_code == 200, f"Validação de token falhou: {r.text}"
    assert r.json() is False, "Token inválido deve resultar em validação falsa"


def test_gerar_token_mfa_requer_parametros() -> None:
    r = requests.post(f"{MFA_BASE}/gerar-token", timeout=10)
    assert r.status_code == 400, (
        f"Esperava 400 sem parâmetros, recebeu {r.status_code}: {r.text}"
    )

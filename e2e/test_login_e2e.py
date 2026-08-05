import pytest
import requests

GATEWAY_URL = "http://localhost:8080"
AUTH_BASE = f"{GATEWAY_URL}/api/auth"
MFA_BASE = f"{GATEWAY_URL}/api/mfa"


def services_running() -> bool:
    try:
        r = requests.get(f"{GATEWAY_URL}/health", timeout=5)
        return r.status_code == 200
    except requests.ConnectionError:
        return False


def skip_if_services_down() -> None:
    if not services_running():
        pytest.skip("Gateway not available - skipping login E2E tests")


CPF = "86249731007"
SENHA = "senhaSegura123"


@pytest.fixture(autouse=True)
def _check_gateway():
    skip_if_services_down()


def test_login_sucesso_retorna_token() -> None:
    r = requests.post(
        f"{AUTH_BASE}/login",
        json={"cpf": CPF, "senha": SENHA},
        timeout=10,
    )
    assert r.status_code in (200, 201), f"Login falhou: {r.text}"
    body = r.json()
    assert body.get("token") or body.get("user"), "Resposta de login sem token/user"
    if body.get("token"):
        assert "refreshToken" in body or body.get("refreshToken") is not None, "Login sem refreshToken"


def test_login_credenciais_invalidas_retorna_401() -> None:
    r = requests.post(
        f"{AUTH_BASE}/login",
        json={"cpf": "00000000000", "senha": "senhaErrada"},
        timeout=10,
    )
    assert r.status_code == 401, f"Esperava 401, recebeu {r.status_code}: {r.text}"


def test_login_sem_cpf_retorna_400() -> None:
    r = requests.post(
        f"{AUTH_BASE}/login",
        json={"senha": SENHA},
        timeout=10,
    )
    assert r.status_code == 400, f"Esperava 400, recebeu {r.status_code}: {r.text}"


def test_esqueci_senha_fluxo_completo() -> None:
    r = requests.post(
        f"{AUTH_BASE}/forgot-password",
        json={"cpf": CPF},
        timeout=10,
    )
    assert r.status_code in (200, 201), f"forgot-password falhou: {r.text}"

    r = requests.post(
        f"{AUTH_BASE}/reset-password",
        json={"cpf": CPF, "codigo": "CODIGO_TESTE", "novaSenha": "novaSenha123"},
        timeout=10,
    )
    assert r.status_code in (200, 201), f"reset-password falhou: {r.text}"


def test_gerar_token_mfa_retorna_201() -> None:
    r = requests.post(
        f"{MFA_BASE}/gerar-token",
        json={"cpf": CPF},
        timeout=10,
    )
    assert r.status_code in (200, 201), f"gerar-token falhou: {r.text}"

import uuid
from datetime import datetime, timedelta, timezone

import pytest
import requests

GATEWAY_URL = "http://localhost:8080"
PIX_API_BASE = f"{GATEWAY_URL}/api/pix"

def services_running() -> bool:
    try:
        r = requests.get(f"{GATEWAY_URL}/health", timeout=5)
        return r.status_code == 200
    except requests.ConnectionError:
        return False


def skip_if_services_down() -> None:
    if not services_running():
        pytest.skip("Gateway not available – skipping PIX E2E tests")


@pytest.fixture
def gateway_url() -> str:
    return GATEWAY_URL


@pytest.fixture
def conta_id() -> int:
    return 1


@pytest.fixture
def pix_key_payload(conta_id: int) -> dict:
    random_key = uuid.uuid4().hex[:20]
    return {
        "chavePix": random_key,
        "contaId": conta_id,
        "tipoChave": "EMAIL",
        "nomeTitular": "Jackson Wendel",
    }


@pytest.fixture
def transfer_payload(conta_id: int) -> dict:
    return {
        "contaOrigemId": conta_id,
        "chavePixDestino": "destino@aurix.com",
        "nomeDestinatario": "Destino Teste",
        "valor": 150.00,
        "tipoChave": "EMAIL",
        "descricao": "Teste E2E PIX",
    }


@pytest.fixture
def created_pix_key(pix_key_payload: dict) -> dict:
    skip_if_services_down()
    r = requests.post(f"{PIX_API_BASE}/chaves", json=pix_key_payload, timeout=10)
    assert r.status_code == 201, f"Failed to create PIX key: {r.text}"
    key = r.json()
    yield key
    try:
        requests.put(f"{PIX_API_BASE}/chaves/{key['id']}/inativar", timeout=10)
    except requests.RequestException:
        pass


@pytest.fixture
def created_transfer(created_pix_key: dict, transfer_payload: dict, conta_id: int) -> dict:
    transfer_payload["chavePixDestino"] = created_pix_key["chavePix"]
    r = requests.post(f"{PIX_API_BASE}/transferencias", json=transfer_payload, timeout=10)
    assert r.status_code == 201, f"Failed to create transfer: {r.text}"
    return r.json()


class TestPixHealth:
    def test_gateway_health(self, gateway_url: str) -> None:
        r = requests.get(f"{gateway_url}/health", timeout=10)
        assert r.status_code == 200
        data = r.json()
        assert data["status"] == "UP"

    def test_pix_service_health(self) -> None:
        skip_if_services_down()
        r = requests.get(f"{PIX_API_BASE}/health", timeout=10)
        assert r.status_code == 200
        data = r.json()
        assert data["service"] == "svc-payments"
        assert data["status"] == "UP"


class TestPixChaves:
    def test_criar_chave_pix(self, pix_key_payload: dict) -> None:
        skip_if_services_down()
        r = requests.post(f"{PIX_API_BASE}/chaves", json=pix_key_payload, timeout=10)
        assert r.status_code == 201
        body = r.json()
        assert body["id"] is not None
        assert body["chavePix"] == pix_key_payload["chavePix"]
        assert body["status"] == "ATIVA"

        chave_id = body["id"]
        requests.put(f"{PIX_API_BASE}/chaves/{chave_id}/inativar", timeout=10)

    def test_listar_chaves_por_conta(self, created_pix_key: dict, conta_id: int) -> None:
        r = requests.get(f"{PIX_API_BASE}/chaves/conta/{conta_id}", timeout=10)
        assert r.status_code == 200
        chaves = r.json()
        assert isinstance(chaves, list)
        assert any(c["id"] == created_pix_key["id"] for c in chaves)

    def test_inativar_e_reativar_chave(self, created_pix_key: dict) -> None:
        chave_id = created_pix_key["id"]

        r = requests.put(f"{PIX_API_BASE}/chaves/{chave_id}/inativar", timeout=10)
        assert r.status_code == 204

        r = requests.get(f"{PIX_API_BASE}/chaves/{chave_id}", timeout=10)
        assert r.status_code == 200
        assert r.json()["status"] == "INATIVA"

        r = requests.put(f"{PIX_API_BASE}/chaves/{chave_id}/ativar", timeout=10)
        assert r.status_code == 204

        r = requests.get(f"{PIX_API_BASE}/chaves/{chave_id}", timeout=10)
        assert r.status_code == 200
        assert r.json()["status"] == "ATIVA"


class TestPixTransferencias:
    def test_criar_transferencia(self, created_pix_key: dict, transfer_payload: dict) -> None:
        transfer_payload["chavePixDestino"] = created_pix_key["chavePix"]
        r = requests.post(f"{PIX_API_BASE}/transferencias", json=transfer_payload, timeout=10)
        assert r.status_code == 201
        body = r.json()
        assert body["id"] is not None
        assert body["codigoPix"] is not None
        assert body["status"] == "PENDENTE"
        assert float(body["valor"]) == transfer_payload["valor"]

    def test_consultar_transferencia_por_id(self, created_transfer: dict) -> None:
        transfer_id = created_transfer["id"]
        r = requests.get(f"{PIX_API_BASE}/transferencias/{transfer_id}", timeout=10)
        assert r.status_code == 200
        body = r.json()
        assert body["id"] == transfer_id
        assert body["status"] == "PENDENTE"

    def test_processar_transferencia(self, created_transfer: dict) -> None:
        transfer_id = created_transfer["id"]
        r = requests.put(f"{PIX_API_BASE}/transferencias/{transfer_id}/processar", timeout=10)
        assert r.status_code == 204

        r = requests.get(f"{PIX_API_BASE}/transferencias/{transfer_id}", timeout=10)
        assert r.status_code == 200
        assert r.json()["status"] == "PROCESSADA"

    def test_cancelar_transferencia(self, created_transfer: dict) -> None:
        transfer_id = created_transfer["id"]
        r = requests.put(f"{PIX_API_BASE}/transferencias/{transfer_id}/cancelar", timeout=10)
        assert r.status_code == 204

        r = requests.get(f"{PIX_API_BASE}/transferencias/{transfer_id}", timeout=10)
        assert r.status_code == 200
        assert r.json()["status"] == "CANCELADA"

    def test_listar_transferencias_por_periodo(self, created_transfer: dict) -> None:
        inicio = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()
        fim = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
        r = requests.get(
            f"{PIX_API_BASE}/transferencias/periodo",
            params={"inicio": inicio, "fim": fim},
            timeout=10,
        )
        assert r.status_code == 200
        transferencias = r.json()
        assert isinstance(transferencias, list)
        assert any(t["id"] == created_transfer["id"] for t in transferencias)

    def test_listar_transferencias_por_conta_e_periodo(
        self, created_transfer: dict, conta_id: int
    ) -> None:
        inicio = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()
        fim = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
        r = requests.get(
            f"{PIX_API_BASE}/transferencias/conta/{conta_id}/periodo",
            params={"inicio": inicio, "fim": fim},
            timeout=10,
        )
        assert r.status_code == 200
        transferencias = r.json()
        assert isinstance(transferencias, list)
        assert any(t["id"] == created_transfer["id"] for t in transferencias)

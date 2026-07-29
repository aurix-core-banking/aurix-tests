import pytest
import requests

GATEWAY_URL = "http://localhost:8080"
ONBOARDING_BASE = f"{GATEWAY_URL}/api/onboarding"

def services_running() -> bool:
    try:
        r = requests.get(f"{GATEWAY_URL}/health", timeout=5)
        return r.status_code == 200
    except requests.ConnectionError:
        return False

def skip_if_services_down() -> None:
    if not services_running():
        pytest.skip("Gateway not available - skipping onboarding E2E tests")

CPF = "86249731007"
CNPJ = "22345678000190"
EMAIL = "contato@empresa.com"
NOME = "Empresa Teste Ltda"

@pytest.fixture
def pf_payload() -> dict:
    return {
        "cpf": CPF,
        "nome": "Maria Silva",
        "email": "maria@test.com",
        "telefone": "11987654321",
    }

@pytest.fixture
def pj_payload() -> dict:
    return {
        "cnpj": CNPJ,
        "razaoSocial": NOME,
        "nomeFantasia": "Teste Ltda",
        "email": EMAIL,
        "telefone": "11987654321",
        "endereco": "Rua Teste, 123",
    }

@pytest.fixture
def created_pf_solicitacao(pf_payload: dict) -> dict:
    skip_if_services_down()
    r = requests.post(f"{ONBOARDING_BASE}/contas/pf/solicitacoes", json=pf_payload, timeout=10)
    assert r.status_code == 200, f"PF solicitation creation failed: {r.text}"
    body = r.json()
    assert body["id"] is not None
    yield body
    # Teardown: no-op (test data cleanup is out of scope)

@pytest.fixture
def created_pj_solicitacao(pj_payload: dict) -> dict:
    skip_if_services_down()
    r = requests.post(f"{ONBOARDING_BASE}/contas/pj", json=pj_payload, timeout=10)
    assert r.status_code == 200, f"PJ solicitation creation failed: {r.text}"
    body = r.json()
    assert body["id"] is not None
    yield body

class TestOnboardingHealth:
    def test_gateway_health(self) -> None:
        r = requests.get(f"{GATEWAY_URL}/health", timeout=10)
        assert r.status_code == 200
        data = r.json()
        assert data["status"] == "UP"

class TestOnboardingPF:
    def test_criar_solicitacao_pf(self, pf_payload: dict) -> None:
        skip_if_services_down()
        r = requests.post(f"{ONBOARDING_BASE}/contas/pf/solicitacoes", json=pf_payload, timeout=10)
        assert r.status_code == 200
        body = r.json()
        assert body["id"] is not None
        assert body["cpf"] == CPF
        assert body["status"] == "EM_PREENCHIMENTO"

    def test_consultar_solicitacao_pf(self, created_pf_solicitacao: dict) -> None:
        solicitacao_id = created_pf_solicitacao["id"]
        r = requests.get(f"{ONBOARDING_BASE}/contas/pf/solicitacoes/{solicitacao_id}", timeout=10)
        assert r.status_code == 200
        body = r.json()
        assert body["id"] == solicitacao_id
        assert body["cpf"] == CPF
        assert body["status"] == "EM_PREENCHIMENTO"

class TestOnboardingPJ:
    def test_criar_solicitacao_pj(self, pj_payload: dict) -> None:
        skip_if_services_down()
        r = requests.post(f"{ONBOARDING_BASE}/contas/pj", json=pj_payload, timeout=10)
        assert r.status_code == 200
        body = r.json()
        assert body["id"] is not None
        assert body["cnpj"] == CNPJ
        assert body["razaoSocial"] == NOME
        assert body["status"] == "EM_PREENCHIMENTO"

    def test_consultar_solicitacao_pj(self, created_pj_solicitacao: dict) -> None:
        solicitacao_id = created_pj_solicitacao["id"]
        r = requests.get(f"{ONBOARDING_BASE}/contas/pj/{solicitacao_id}", timeout=10)
        assert r.status_code == 200
        body = r.json()
        assert body["id"] == solicitacao_id
        assert body["cnpj"] == CNPJ
        assert body["status"] == "EM_PREENCHIMENTO"

    def test_adicionar_socio(self, created_pj_solicitacao: dict) -> None:
        solicitacao_id = created_pj_solicitacao["id"]
        socio_payload = {
            "tipo": "SOCIO",
            "cpf": "12345678901",
            "nome": "Joao Socio",
            "email": "joao@socio.com",
            "percentualParticipacao": 50,
        }
        r = requests.post(
            f"{ONBOARDING_BASE}/contas/pj/{solicitacao_id}/socios",
            json=socio_payload,
            timeout=10,
        )
        assert r.status_code == 204, f"Add socio failed: {r.text}"

    def test_adicionar_documento(self, created_pj_solicitacao: dict) -> None:
        solicitacao_id = created_pj_solicitacao["id"]
        doc_payload = {
            "tipoDocumento": "CONTRATO_SOCIAL",
            "nomeArquivo": "contrato_social.pdf",
            "urlStorage": f"https://storage.aurix.com/documents/{solicitacao_id}/contrato_social.pdf",
        }
        r = requests.post(
            f"{ONBOARDING_BASE}/contas/pj/{solicitacao_id}/documentos",
            json=doc_payload,
            timeout=10,
        )
        assert r.status_code == 204, f"Add document failed: {r.text}"

    def test_adicionar_documento_base64(self, created_pj_solicitacao: dict) -> None:
        solicitacao_id = created_pj_solicitacao["id"]
        doc_payload = {
            "tipoDocumento": "CONTRATO_SOCIAL",
            "nomeArquivo": "contrato.pdf",
            "urlStorage": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        }
        r = requests.post(
            f"{ONBOARDING_BASE}/contas/pj/{solicitacao_id}/documentos",
            json=doc_payload,
            timeout=10,
        )
        assert r.status_code == 204, f"Add base64 document failed: {r.text}"


class TestDocumentValidationPF:
    def test_validar_documento_pf(self, created_pf_solicitacao: dict) -> None:
        solicitacao_id = created_pf_solicitacao["id"]
        r_doc = requests.post(
            f"{ONBOARDING_BASE}/contas/pf/solicitacoes/{solicitacao_id}/documentos",
            json={"tipoDocumento": "RG", "nomeArquivo": "rg.pdf", "urlStorage": "http://storage/rg.pdf"},
            timeout=10,
        )
        assert r_doc.status_code == 204
        r_list = requests.get(
            f"{ONBOARDING_BASE}/contas/pf/solicitacoes/{solicitacao_id}", timeout=10
        )
        documentos = r_list.json().get("documentos", [])
        assert len(documentos) == 1
        doc_id = documentos[0]["id"]
        r = requests.post(
            f"{ONBOARDING_BASE}/contas/pf/solicitacoes/{solicitacao_id}/documentos/{doc_id}/validar",
            json={"validado": True, "observacao": "Documento confere"},
            timeout=10,
        )
        assert r.status_code == 204, f"PF document validation failed: {r.text}"

    def test_rejeitar_documento_pf(self, created_pf_solicitacao: dict) -> None:
        solicitacao_id = created_pf_solicitacao["id"]
        r_doc = requests.post(
            f"{ONBOARDING_BASE}/contas/pf/solicitacoes/{solicitacao_id}/documentos",
            json={"tipoDocumento": "CPF", "nomeArquivo": "cpf.pdf", "urlStorage": "http://storage/cpf.pdf"},
            timeout=10,
        )
        assert r_doc.status_code == 204
        r_list = requests.get(
            f"{ONBOARDING_BASE}/contas/pf/solicitacoes/{solicitacao_id}", timeout=10
        )
        doc_id = r_list.json()["documentos"][0]["id"]
        r = requests.post(
            f"{ONBOARDING_BASE}/contas/pf/solicitacoes/{solicitacao_id}/documentos/{doc_id}/validar",
            json={"validado": False, "observacao": "Documento ilegível"},
            timeout=10,
        )
        assert r.status_code == 204, f"PF document rejection failed: {r.text}"


class TestDocumentValidationPJ:
    def test_validar_documento_pj(self, created_pj_solicitacao: dict) -> None:
        solicitacao_id = created_pj_solicitacao["id"]
        r_doc = requests.post(
            f"{ONBOARDING_BASE}/contas/pj/{solicitacao_id}/documentos",
            json={"tipoDocumento": "CONTRATO_SOCIAL", "nomeArquivo": "contrato.pdf", "urlStorage": "http://storage/contrato.pdf"},
            timeout=10,
        )
        assert r_doc.status_code == 204
        r_list = requests.get(
            f"{ONBOARDING_BASE}/contas/pj/{solicitacao_id}", timeout=10
        )
        doc_id = r_list.json()["documentos"][0]["id"]
        r = requests.post(
            f"{ONBOARDING_BASE}/contas/pj/{solicitacao_id}/documentos/{doc_id}/validar",
            json={"validado": True, "observacao": "Documento aprovado"},
            timeout=10,
        )
        assert r.status_code == 204, f"PJ document validation failed: {r.text}"


class TestSolicitacaoActionsPF:
    def test_aprovar_solicitacao_pf(self, created_pf_solicitacao: dict) -> None:
        solicitacao_id = created_pf_solicitacao["id"]
        r = requests.post(
            f"{ONBOARDING_BASE}/contas/pf/solicitacoes/{solicitacao_id}/aprovar",
            params={"usuarioAnalista": "admin", "observacao": "Aprovado em lote"},
            timeout=10,
        )
        assert r.status_code == 200, f"PF approve failed: {r.text}"

    def test_rejeitar_solicitacao_pf(self, created_pf_solicitacao: dict) -> None:
        solicitacao_id = created_pf_solicitacao["id"]
        r = requests.post(
            f"{ONBOARDING_BASE}/contas/pf/solicitacoes/{solicitacao_id}/rejeitar",
            params={"usuarioAnalista": "admin", "observacao": "Documentacao insuficiente"},
            timeout=10,
        )
        assert r.status_code == 200, f"PF reject failed: {r.text}"
        assert r.json()["status"] == "REJEITADA"


class TestSolicitacaoActionsPJ:
    def test_rejeitar_solicitacao_pj(self, created_pj_solicitacao: dict) -> None:
        solicitacao_id = created_pj_solicitacao["id"]
        r = requests.post(
            f"{ONBOARDING_BASE}/contas/pj/{solicitacao_id}/rejeitar",
            params={"usuarioAnalista": "admin", "observacao": "CNPJ nao confirmado"},
            timeout=10,
        )
        assert r.status_code == 200, f"PJ reject failed: {r.text}"
        assert r.json()["status"] == "REJEITADA"

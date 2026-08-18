package com.aurix.platform.integration;

import io.restassured.http.ContentType;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.is;

/**
 * Testes de integração da gestão de contratos (svc-contracts).
 *
 * <p>Fluxo coberto: listar contratos (GET), criar contrato (POST) com payload
 * mínimo válido e consultar o contrato pelo id (GET). O número do contrato é
 * único por execução para não colidir com a restrição de unicidade.</p>
 */
class ContratoIntegracaoTest extends BaseTestIntegracao {

    private static final String SVC_CONTRACTS =
            System.getProperty("svc.contracts.url", "http://localhost:8085");
    private static final String CONTRATOS_BASE = SVC_CONTRACTS + "/api/contracts/contratos";

    @BeforeAll
    static void verificarDisponibilidade() {
        assumirServicoDisponivel(SVC_CONTRACTS);
    }

    @Test
    void listarContratosRetorna200() {
        given()
                .get(CONTRATOS_BASE)
        .then()
                .statusCode(200);
    }

    @Test
    void criarContratoRetorna201EconsultaPorId() {
        String numeroContrato = "CTR-INTEG-" + System.currentTimeMillis();

        Integer id = given()
                .contentType(ContentType.JSON)
                .body("""
                        {
                          "numeroContrato": "%s",
                          "clienteId": 1,
                          "tipoContrato": "EMPRESTIMO",
                          "valor": 10000.00,
                          "prazoMeses": 12,
                          "valorParcela": 900.00,
                          "taxaJuros": 1.99
                        }
                        """.formatted(numeroContrato))
        .when()
                .post(CONTRATOS_BASE)
        .then()
                .statusCode(201)
                .body("numeroContrato", is(numeroContrato))
                .extract().jsonPath().getInt("id");

        given()
                .get(CONTRATOS_BASE + "/" + id)
        .then()
                .statusCode(200)
                .body("id", is(id))
                .body("numeroContrato", is(numeroContrato));
    }
}

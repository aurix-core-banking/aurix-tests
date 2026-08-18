package com.aurix.platform.integration;

import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.anyOf;
import static org.hamcrest.Matchers.is;

/**
 * Teste de integração do endpoint de health do svc-banking.
 *
 * <p>Verifica que o /actuator/health do svc-banking responde com
 * 200 (UP) ou 503 (DOWN) — qualquer um indica que o serviço está no ar.</p>
 */
class BankingHealthIntegracaoTest extends BaseTestIntegracao {

    private static final String SVC_BANKING =
            System.getProperty("svc.banking.url", "http://localhost:8200");

    @BeforeAll
    static void verificarDisponibilidade() {
        assumirServicoDisponivel(SVC_BANKING);
    }

    @Test
    void healthEndpointRetorna200Ou503() {
        given()
                .get(SVC_BANKING + "/actuator/health")
        .then()
                .statusCode(anyOf(is(200), is(503)));
    }

    @Test
    void healthEndpointRetornaStatusUP() {
        given()
                .get(SVC_BANKING + "/actuator/health")
        .then()
                .statusCode(200)
                .body("status", is("UP"));
    }
}

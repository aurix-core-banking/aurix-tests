package com.aurix.platform.integration;

import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.is;

/**
 * Testes de integração dos cartões (svc-cards).
 *
 * <p>Fluxo coberto: emitir cartão (POST) com payload mínimo válido via
 * parâmetros de consulta e listar cartões de uma conta (GET). O serviço não
 * valida a existência da conta, então a emissão funciona com conta mínima.</p>
 */
class CartaoIntegracaoTest extends BaseTestIntegracao {

    private static final String SVC_CARDS =
            System.getProperty("svc.cards.url", "http://localhost:8094");
    private static final String CARDS_BASE = SVC_CARDS + "/api/cards";

    @BeforeAll
    static void verificarDisponibilidade() {
        assumirServicoDisponivel(SVC_CARDS);
    }

    @Test
    void emitirCartaoRetorna200() {
        given()
                .queryParam("contaId", 1)
                .queryParam("tipoCartao", "CREDITO")
                .queryParam("bandeira", "VISA")
                .queryParam("nomePortador", "Maria da Silva")
                .queryParam("limiteCredito", "5000.00")
        .when()
                .post(CARDS_BASE + "/emitir")
        .then()
                .statusCode(200)
                .body("status", is("PENDENTE_ATIVACAO"))
                .body("tipoCartao", is("CREDITO"))
                .body("bandeira", is("VISA"));
    }

    @Test
    void listarCartoesDaContaRetorna200() {
        given()
                .get(CARDS_BASE + "/conta/1")
        .then()
                .statusCode(200);
    }
}

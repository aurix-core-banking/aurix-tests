package com.aurix.tests.credit;

import com.aurix.tests.config.TestConfig;
import io.restassured.RestAssured;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.*;

import java.util.HashMap;
import java.util.Map;

import static org.hamcrest.Matchers.*;

/**
 * Testes de integração para o domínio de crédito.
 * Testa solicitação e aprovação de crédito.
 */
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
@DisplayName("Crédito - Testes de Integração")
public class CreditoIntegrationTest extends TestConfig {

    private static String creditoId;

    @Test
    @Order(1)
    @DisplayName("Deve solicitar um crédito com sucesso")
    void testSolicitarCredito() {
        Map<String, Object> body = new HashMap<>();
        body.put("clienteId", DEFAULT_CLIENT_ID);
        body.put("tipoCredito", "CONSIGNADO");
        body.put("valorSolicitado", 15000.00);
        body.put("quantidadeParcelas", 24);
        body.put("valorParcela", 750.00);
        body.put("finalidade", "Crédito consignado para reforma");
        body.put("rendaMensal", 5000.00);
        body.put("orgaoPagador", "INSS");

        creditoId = RestAssured.given()
                .spec(requestSpec)
                .body(body)
                .when()
                .post("/credit/solicitacoes")
                .then()
                .statusCode(201)
                .contentType(ContentType.JSON)
                .body("id", notNullValue())
                .body("clienteId", equalTo(DEFAULT_CLIENT_ID))
                .body("tipoCredito", equalTo("CONSIGNADO"))
                .body("valorSolicitado", equalTo(15000.00f))
                .body("quantidadeParcelas", equalTo(24))
                .body("status", equalTo("PENDENTE_APROVACAO"))
                .extract()
                .path("id")
                .toString();
    }

    @Test
    @Order(2)
    @DisplayName("Deve aprovar uma solicitação de crédito")
    void testAprovarCredito() {
        Map<String, Object> body = new HashMap<>();
        body.put("valorAprovado", 15000.00);
        body.put("taxaJuros", 1.79);
        body.put("valorParcela", 750.00);
        body.put("observacoes", "Crédito aprovado conforme análise de crédito");

        RestAssured.given()
                .spec(requestSpec)
                .body(body)
                .when()
                .post("/credit/solicitacoes/" + creditoId + "/aprovar")
                .then()
                .statusCode(200)
                .contentType(ContentType.JSON)
                .body("id", equalTo(creditoId))
                .body("status", equalTo("APROVADO"))
                .body("valorAprovado", equalTo(15000.00f))
                .body("taxaJuros", equalTo(1.79f))
                .body("dataAprovacao", notNullValue());

        // Verifica que o crédito foi aprovado
        RestAssured.given()
                .spec(requestSpec)
                .when()
                .get("/credit/solicitacoes/" + creditoId)
                .then()
                .statusCode(200)
                .body("status", equalTo("APROVADO"))
                .body("valorAprovado", equalTo(15000.00f));
    }
}

package com.aurix.tests.banking;

import com.aurix.tests.config.TestConfig;
import io.restassured.RestAssured;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.*;

import java.util.HashMap;
import java.util.Map;

import static org.hamcrest.Matchers.*;

/**
 * Testes de integração para o domínio de TED (Transferência Eletrônica Disponível).
 * Testa criação, consulta e cancelamento de TEDs.
 */
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
@DisplayName("TED - Testes de Integração")
public class TedIntegrationTest extends TestConfig {

    private static String tedId;

    @Test
    @Order(1)
    @DisplayName("Deve criar uma transferência TED com sucesso")
    void testCriarTed() {
        Map<String, Object> body = new HashMap<>();
        body.put("contaOrigemId", DEFAULT_CONTA_ID);
        body.put("contaDestino", "12345-6");
        body.put("agenciaDestino", "0002");
        body.put("bancoDestino", "001");
        body.put("cpfCnpjDestinatario", "52998224725");
        body.put("nomeDestinatario", "João da Silva");
        body.put("valor", 500.00);
        body.put("descricao", "TED teste integração");
        body.put("finalidade", "PAGAMENTO");

        tedId = RestAssured.given()
                .spec(requestSpec)
                .body(body)
                .when()
                .post("/banking/teds")
                .then()
                .statusCode(201)
                .contentType(ContentType.JSON)
                .body("id", notNullValue())
                .body("status", equalTo("PENDENTE"))
                .body("valor", equalTo(500.00f))
                .extract()
                .path("id")
                .toString();
    }

    @Test
    @Order(2)
    @DisplayName("Deve consultar detalhes de uma TED existente")
    void testConsultarTed() {
        RestAssured.given()
                .spec(requestSpec)
                .when()
                .get("/banking/teds/" + tedId)
                .then()
                .statusCode(200)
                .contentType(ContentType.JSON)
                .body("id", equalTo(tedId))
                .body("contaOrigemId", equalTo(DEFAULT_CONTA_ID))
                .body("valor", equalTo(500.00f))
                .body("nomeDestinatario", equalTo("João da Silva"))
                .body("bancoDestino", equalTo("001"));
    }

    @Test
    @Order(3)
    @DisplayName("Deve cancelar uma TED pendente")
    void testCancelarTed() {
        RestAssured.given()
                .spec(requestSpec)
                .when()
                .post("/banking/teds/" + tedId + "/cancelar")
                .then()
                .statusCode(200)
                .contentType(ContentType.JSON)
                .body("id", equalTo(tedId))
                .body("status", equalTo("CANCELADA"));

        // Verifica que a TED foi cancelada
        RestAssured.given()
                .spec(requestSpec)
                .when()
                .get("/banking/teds/" + tedId)
                .then()
                .statusCode(200)
                .body("status", equalTo("CANCELADA"));
    }
}

package com.aurix.tests.banking;

import com.aurix.tests.config.TestConfig;
import io.restassured.RestAssured;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.*;

import java.util.HashMap;
import java.util.Map;

import static org.hamcrest.Matchers.*;

/**
 * Testes de integração para o domínio de PIX.
 * Testa criação, confirmação, cancelamento e consulta de chaves PIX.
 */
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
@DisplayName("PIX - Testes de Integração")
public class PixIntegrationTest extends TestConfig {

    private static String pixId;
    private static String chavePix;

    @Test
    @Order(1)
    @DisplayName("Deve criar uma chave PIX com sucesso")
    void testCriarPix() {
        Map<String, Object> body = new HashMap<>();
        body.put("contaId", DEFAULT_CONTA_ID);
        body.put("tipoChave", "CPF");
        body.put("chave", DEFAULT_CPF);
        body.put("descricao", "PIX pessoal");

        pixId = RestAssured.given()
                .spec(requestSpec)
                .body(body)
                .when()
                .post("/banking/pix/chaves")
                .then()
                .statusCode(201)
                .contentType(ContentType.JSON)
                .body("id", notNullValue())
                .body("tipoChave", equalTo("CPF"))
                .body("status", equalTo("PENDENTE_ATIVACAO"))
                .extract()
                .path("id")
                .toString();

        chavePix = RestAssured.given()
                .spec(requestSpec)
                .when()
                .get("/banking/pix/chaves/" + pixId)
                .then()
                .extract()
                .path("chave")
                .toString();
    }

    @Test
    @Order(2)
    @DisplayName("Deve confirmar ativação da chave PIX")
    void testConfirmarPix() {
        RestAssured.given()
                .spec(requestSpec)
                .when()
                .post("/banking/pix/chaves/" + pixId + "/confirmar")
                .then()
                .statusCode(200)
                .contentType(ContentType.JSON)
                .body("id", equalTo(pixId))
                .body("status", equalTo("ATIVA"));

        // Verifica que a chave está ativa na listagem
        RestAssured.given()
                .spec(requestSpec)
                .when()
                .get("/banking/pix/chaves/conta/" + DEFAULT_CONTA_ID)
                .then()
                .statusCode(200)
                .contentType(ContentType.JSON)
                .body("chaves", hasItem(
                        hasEntry("id", pixId)
                ));
    }

    @Test
    @Order(3)
    @DisplayName("Deve cancelar uma chave PIX existente")
    void testCancelarPix() {
        RestAssured.given()
                .spec(requestSpec)
                .when()
                .delete("/banking/pix/chaves/" + pixId)
                .then()
                .statusCode(200)
                .contentType(ContentType.JSON)
                .body("id", equalTo(pixId))
                .body("status", equalTo("CANCELADA"));

        // Verifica que a chave foi cancelada
        RestAssured.given()
                .spec(requestSpec)
                .when()
                .get("/banking/pix/chaves/" + pixId)
                .then()
                .statusCode(200)
                .body("status", equalTo("CANCELADA"));
    }

    @Test
    @Order(4)
    @DisplayName("Deve consultar chaves PIX de uma conta")
    void testConsultarPix() {
        RestAssured.given()
                .spec(requestSpec)
                .when()
                .get("/banking/pix/chaves/conta/" + DEFAULT_CONTA_ID)
                .then()
                .statusCode(200)
                .contentType(ContentType.JSON)
                .body("chaves", notNullValue())
                .body("chaves.size()", greaterThanOrEqualTo(0));
    }
}

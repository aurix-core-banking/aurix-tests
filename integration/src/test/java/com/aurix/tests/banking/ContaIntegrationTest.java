package com.aurix.tests.banking;

import com.aurix.tests.config.TestConfig;
import io.restassured.RestAssured;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.*;

import java.util.HashMap;
import java.util.Map;

import static org.hamcrest.Matchers.*;

/**
 * Testes de integração para o domínio de contas bancárias.
 * Testa criação, consulta, depósito, saque, transferência e validação de saldo.
 */
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
@DisplayName("Conta Bancária - Testes de Integração")
public class ContaIntegrationTest extends TestConfig {

    private static String contaId;
    private static String contaDestinoId;

    @Test
    @Order(1)
    @DisplayName("Deve criar uma conta bancária com sucesso")
    void testCriarConta() {
        Map<String, Object> body = new HashMap<>();
        body.put("clienteId", DEFAULT_CLIENT_ID);
        body.put("tipoConta", "CONTA_CORRENTE");
        body.put("agencia", DEFAULT_AGENCIA);
        body.put("moeda", "BRL");

        RestAssured.given()
                .spec(requestSpec)
                .body(body)
                .when()
                .post("/banking/contas")
                .then()
                .statusCode(201)
                .contentType(ContentType.JSON)
                .body("id", notNullValue())
                .body("numeroConta", notNullValue())
                .body("agencia", equalTo(DEFAULT_AGENCIA))
                .body("tipoConta", equalTo("CONTA_CORRENTE"))
                .body("saldo", equalTo(0.0f))
                .body("status", equalTo("ATIVA"));

        // Salva o ID da conta para os próximos testes
        contaId = RestAssured.given()
                .spec(requestSpec)
                .when()
                .get("/banking/contas/cliente/" + DEFAULT_CLIENT_ID)
                .then()
                .extract()
                .path("contas[0].id")
                .toString();
    }

    @Test
    @Order(2)
    @DisplayName("Deve consultar os detalhes de uma conta existente")
    void testConsultarConta() {
        RestAssured.given()
                .spec(requestSpec)
                .when()
                .get("/banking/contas/" + contaId)
                .then()
                .statusCode(200)
                .contentType(ContentType.JSON)
                .body("id", equalTo(contaId))
                .body("agencia", equalTo(DEFAULT_AGENCIA))
                .body("tipoConta", equalTo("CONTA_CORRENTE"))
                .body("moeda", equalTo("BRL"))
                .body("status", equalTo("ATIVA"));
    }

    @Test
    @Order(3)
    @DisplayName("Deve realizar depósito em conta")
    void testDepositar() {
        Map<String, Object> body = new HashMap<>();
        body.put("valor", 1000.00);
        body.put("descricao", "Depósito inicial");

        RestAssured.given()
                .spec(requestSpec)
                .body(body)
                .when()
                .post("/banking/contas/" + contaId + "/deposito")
                .then()
                .statusCode(200)
                .contentType(ContentType.JSON)
                .body("saldo", equalTo(1000.00f))
                .body("transacaoId", notNullValue());

        // Verifica o saldo após depósito
        RestAssured.given()
                .spec(requestSpec)
                .when()
                .get("/banking/contas/" + contaId)
                .then()
                .statusCode(200)
                .body("saldo", equalTo(1000.00f));
    }

    @Test
    @Order(4)
    @DisplayName("Deve realizar saque em conta com saldo suficiente")
    void testSacar() {
        Map<String, Object> body = new HashMap<>();
        body.put("valor", 250.00);
        body.put("descricao", "Saque parcial");

        RestAssured.given()
                .spec(requestSpec)
                .body(body)
                .when()
                .post("/banking/contas/" + contaId + "/saque")
                .then()
                .statusCode(200)
                .contentType(ContentType.JSON)
                .body("saldo", equalTo(750.00f))
                .body("transacaoId", notNullValue());
    }

    @Test
    @Order(5)
    @DisplayName("Deve realizar transferência entre contas")
    void testTransferir() {
        // Cria conta destino
        Map<String, Object> bodyDestino = new HashMap<>();
        bodyDestino.put("clienteId", "test-client-002");
        bodyDestino.put("tipoConta", "CONTA_CORRENTE");
        bodyDestino.put("agencia", DEFAULT_AGENCIA);
        bodyDestino.put("moeda", "BRL");

        contaDestinoId = RestAssured.given()
                .spec(requestSpec)
                .body(bodyDestino)
                .when()
                .post("/banking/contas")
                .then()
                .statusCode(201)
                .extract()
                .path("id")
                .toString();

        // Realiza transferência
        Map<String, Object> body = new HashMap<>();
        body.put("contaDestinoId", contaDestinoId);
        body.put("valor", 200.00);
        body.put("descricao", "Transferência teste");
        body.put("tipoTransferencia", "TED");

        RestAssured.given()
                .spec(requestSpec)
                .body(body)
                .when()
                .post("/banking/contas/" + contaId + "/transferencia")
                .then()
                .statusCode(200)
                .contentType(ContentType.JSON)
                .body("transacaoId", notNullValue())
                .body("status", equalTo("CONCLUIDA"));

        // Verifica saldos
        RestAssured.given()
                .spec(requestSpec)
                .when()
                .get("/banking/contas/" + contaId)
                .then()
                .statusCode(200)
                .body("saldo", equalTo(550.00f));

        RestAssured.given()
                .spec(requestSpec)
                .when()
                .get("/banking/contas/" + contaDestinoId)
                .then()
                .statusCode(200)
                .body("saldo", equalTo(200.00f));
    }

    @Test
    @Order(6)
    @DisplayName("Deve rejeitar saque com saldo insuficiente")
    void testSaldoInsuficiente() {
        Map<String, Object> body = new HashMap<>();
        body.put("valor", 99999.99);
        body.put("descricao", "Tentativa de saque alto");

        RestAssured.given()
                .spec(requestSpec)
                .body(body)
                .when()
                .post("/banking/contas/" + contaId + "/saque")
                .then()
                .statusCode(400)
                .contentType(ContentType.JSON)
                .body("mensagem", containsString("saldo"))
                .body("codigoErro", equalTo("SALDO_INSUFICIENTE"));
    }
}

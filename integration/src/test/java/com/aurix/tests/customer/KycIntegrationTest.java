package com.aurix.tests.customer;

import com.aurix.tests.config.TestConfig;
import io.restassured.RestAssured;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.*;

import java.util.HashMap;
import java.util.Map;

import static org.hamcrest.Matchers.*;

/**
 * Testes de integração para o domínio de KYC (Know Your Customer).
 * Testa início e aprovação de processos de verificação de identidade.
 */
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
@DisplayName("KYC - Testes de Integração")
public class KycIntegrationTest extends TestConfig {

    private static String kycId;

    @Test
    @Order(1)
    @DisplayName("Deve iniciar processo de KYC para um cliente")
    void testIniciarKyc() {
        Map<String, Object> body = new HashMap<>();
        body.put("clienteId", DEFAULT_CLIENT_ID);
        body.put("tipoDocumento", "RG");
        body.put("numeroDocumento", "123456789");
        body.put("orgaoEmissor", "SSP-SP");
        body.put("dataEmissao", "2020-01-15");
        body.put("selfieUrl", "https://storage.aurix.com/selfies/test-selfie.jpg");
        body.put("documentoFrenteUrl", "https://storage.aurix.com/docs/test-doc-frente.jpg");
        body.put("documentoVersoUrl", "https://storage.aurix.com/docs/test-doc-verso.jpg");

        kycId = RestAssured.given()
                .spec(requestSpec)
                .body(body)
                .when()
                .post("/customer/kyc")
                .then()
                .statusCode(201)
                .contentType(ContentType.JSON)
                .body("id", notNullValue())
                .body("clienteId", equalTo(DEFAULT_CLIENT_ID))
                .body("status", equalTo("PENDENTE_ANALISE"))
                .body("tipoDocumento", equalTo("RG"))
                .extract()
                .path("id")
                .toString();
    }

    @Test
    @Order(2)
    @DisplayName("Deve aprovar processo de KYC")
    void testAprovarKyc() {
        RestAssured.given()
                .spec(requestSpec)
                .when()
                .post("/customer/kyc/" + kycId + "/aprovar")
                .then()
                .statusCode(200)
                .contentType(ContentType.JSON)
                .body("id", equalTo(kycId))
                .body("status", equalTo("APROVADO"))
                .body("dataAprovacao", notNullValue());

        // Verifica que o KYC foi aprovado
        RestAssured.given()
                .spec(requestSpec)
                .when()
                .get("/customer/kyc/" + kycId)
                .then()
                .statusCode(200)
                .body("status", equalTo("APROVADO"));
    }
}

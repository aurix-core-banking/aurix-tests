package com.aurix.tests.config;

import io.restassured.RestAssured;
import io.restassured.builder.RequestSpecBuilder;
import io.restassured.filter.log.RequestLoggingFilter;
import io.restassured.filter.log.ResponseLoggingFilter;
import io.restassured.http.ContentType;
import io.restassured.specification.RequestSpecification;
import org.apache.http.HttpStatus;
import org.junit.jupiter.api.BeforeAll;

/**
 * Configuração base para todos os testes de integração REST Assured.
 * Configura URI base, autenticação, specs e validações de resposta.
 */
public class TestConfig {

    protected static final String BASE_URI = System.getenv().getOrDefault("API_BASE_URI", "http://localhost:8080");
    protected static final String API_PREFIX = "/api/v1";
    protected static final String AUTH_TOKEN = System.getenv().getOrDefault("AUTH_TOKEN", "");
    protected static final String DEFAULT_CLIENT_ID = "test-client-001";
    protected static final String DEFAULT_CPF = "52998224725";
    protected static final String DEFAULT_CNPJ = "11222333000181";
    protected static final String DEFAULT_CONTA_ID = "conta-test-001";
    protected static final String DEFAULT_AGENCIA = "0001";

    protected static RequestSpecification requestSpec;

    @BeforeAll
    static void setUp() {
        RestAssured.baseURI = BASE_URI;

        requestSpec = new RequestSpecBuilder()
                .setBaseUri(BASE_URI)
                .setBasePath(API_PREFIX)
                .setContentType(ContentType.JSON)
                .setAccept(ContentType.JSON)
                .addFilter(new RequestLoggingFilter())
                .addFilter(new ResponseLoggingFilter())
                .build();

        if (!AUTH_TOKEN.isEmpty()) {
            requestSpec.header("Authorization", "Bearer " + AUTH_TOKEN);
        }

        requestSpec.header("X-Tenant-Id", "aurix-test");
        requestSpec.header("X-Request-Id", java.util.UUID.randomUUID().toString());
    }

    /**
     * Builder de request com autenticação e headers de tenant.
     */
    protected RequestSpecification givenAuthenticated() {
        return RestAssured.given()
                .spec(requestSpec)
                .auth().oauth2(AUTH_TOKEN)
                .header("X-Tenant-Id", "aurix-test")
                .header("X-Request-Id", java.util.UUID.randomUUID().toString());
    }

    /**
     * Builder de request sem autenticação (para testes de autorização).
     */
    protected RequestSpecification givenUnauthenticated() {
        return RestAssured.given()
                .spec(requestSpec)
                .header("X-Tenant-Id", "aurix-test");
    }

    /**
     * Valida response code de sucesso (2xx).
     */
    protected void assertSuccess(io.restassured.response.Response response, int expectedCode) {
        response.then()
                .statusCode(expectedCode)
                .contentType(ContentType.JSON);
    }

    /**
     * Valida response de erro.
     */
    protected void assertError(io.restassured.response.Response response, int expectedCode) {
        response.then()
                .statusCode(expectedCode)
                .body("mensagem", org.hamcrest.Matchers.notNullValue());
    }

    /**
     * Gera UUID para correlação de requests.
     */
    protected String generateRequestId() {
        return java.util.UUID.randomUUID().toString();
    }
}

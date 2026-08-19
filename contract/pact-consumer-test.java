package com.aurix.tests.contract;

import au.com.dius.pact.consumer.ConsumerPactBuilder;
import au.com.dius.pact.consumer.MockServer;
import au.com.dius.pact.consumer.PactTestRun;
import au.com.dius.pact.consumer.VerificationPactTestRun;
import au.com.dius.pact.consumer.dsl.PactDslWithProvider;
import au.com.dius.pact.model.PactSpecVersion;
import com.google.gson.Gson;
import io.restassured.RestAssured;
import io.restassured.response.Response;
import org.junit.jupiter.api.*;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Testes consumer-side Pact — define contratos entre consumers e providers
 * do Aurix Core Banking.
 *
 * Consumers: svc-customer, svc-payments, svc-credit, svc-fraud
 * Providers: svc-banking, svc-payments
 */
@DisplayName("Pact Consumer Tests — Aurix Platform")
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class PactConsumerTest {

    private static final Gson GSON = new Gson();
    private static final String BROKER_URL = System.getenv().getOrDefault(
            "PACT_BROKER_URL", "http://localhost:9292");
    private static final String PACT_CONSUMER_VERSION = System.getenv().getOrDefault(
            "PACT_CONSUMER_VERSION", "1.0.0-SNAPSHOT");

    // ═══════════════════════════════════════════════════════
    // svc-customer → svc-banking: consulta conta do cliente
    // ═══════════════════════════════════════════════════════

    @Test
    @Order(1)
    @DisplayName("svc-customer consulta conta via svc-banking")
    void test_customer_consulta_conta() {
        ConsumerPactBuilder.PactDslWithProvider builder = ConsumerPactBuilder
                .consumer("svc-customer")
                .hasPactWith("svc-banking")
                .uponReceiving("requisição de conta por cliente_id")
                .path("/api/v1/contas/cliente/52998224725")
                .method("GET")
                .headers(Map.of("X-Tenant-Id", "aurix-test"))
                .willRespondWith()
                .status(200)
                .headers(Map.of("Content-Type", "application/json"))
                .body("""
                        {
                          "id": "conta-001",
                          "cliente_id": "52998224725",
                          "agencia": "0001",
                          "numero": "123456",
                          "saldo": 5000.00,
                          "limite": 10000.00,
                          "status": "ATIVA",
                          "tipo_conta": "CORRENTE"
                        }
                        """);

        builder.toPact().run(new PactTestRun() {
            @Override
            public void run(MockServer mockServer, PactSpecVersion version) {
                Response response = RestAssured.given()
                        .baseUri(mockServer.getUrl())
                        .header("X-Tenant-Id", "aurix-test")
                        .get("/api/v1/contas/cliente/52998224725")
                        .then()
                        .statusCode(200)
                        .extract().response();

                String id = response.jsonPath().getString("id");
                assertNotNull(id, "id da conta não deve ser nulo");
                assertEquals("ATIVA", response.jsonPath().getString("status"));
                assertTrue(response.jsonPath().getFloat("saldo") >= 0);
            }
        });
    }

    // ═══════════════════════════════════════════════════════
    // svc-payments → svc-banking: debita conta para PIX
    // ═══════════════════════════════════════════════════════

    @Test
    @Order(2)
    @DisplayName("svc-payments debita conta via svc-banking (PIX)")
    void test_payments_debita_conta_pix() {
        ConsumerPactBuilder.PactDslWithProvider.builder()
                .consumer("svc-payments")
                .hasPactWith("svc-banking")
                .uponReceiving("requisição de débito para pagamento PIX")
                .path("/api/v1/contas/conta-001/debitar")
                .method("POST")
                .headers(Map.of(
                        "Content-Type", "application/json",
                        "X-Tenant-Id", "aurix-test"
                ))
                .body("""
                        {
                          "valor": 150.00,
                          "descricao": "PIX para 98765432100",
                          "tipo_transacao": "PIX",
                          "idempotency_key": "pix-debit-001"
                        }
                        """)
                .willRespondWith()
                .status(200)
                .headers(Map.of("Content-Type", "application/json"))
                .body("""
                        {
                          "transacao_id": "txn-uuid-001",
                          "status": "AUTORIZADA",
                          "valor": 150.00,
                          "saldo_anterior": 5000.00,
                          "saldo_posterior": 4850.00,
                          "data_processamento": "2026-08-18T10:30:00"
                        }
                        """)
                .toPact()
                .run(new PactTestRun() {
                    @Override
                    public void run(MockServer mockServer, PactSpecVersion version) {
                        Response response = RestAssured.given()
                                .baseUri(mockServer.getUrl())
                                .header("Content-Type", "application/json")
                                .header("X-Tenant-Id", "aurix-test")
                                .body("""
                                        {
                                          "valor": 150.00,
                                          "descricao": "PIX para 98765432100",
                                          "tipo_transacao": "PIX",
                                          "idempotency_key": "pix-debit-001"
                                        }
                                        """)
                                .post("/api/v1/contas/conta-001/debitar")
                                .then()
                                .statusCode(200)
                                .extract().response();

                        assertEquals("AUTORIZADA", response.jsonPath().getString("status"));
                        assertEquals(150.00f, response.jsonPath().getFloat("valor"), 0.01f);
                        assertEquals(4850.00f, response.jsonPath().getFloat("saldo_posterior"), 0.01f);
                    }
                });
    }

    // ═══════════════════════════════════════════════════════
    // svc-credit → svc-banking: consulta extrato para crédito
    // ═══════════════════════════════════════════════════════

    @Test
    @Order(3)
    @DisplayName("svc-credit consulta extrato via svc-banking")
    void test_credit_consulta_extrato() {
        ConsumerPactBuilder.PactDslWithProvider.builder()
                .consumer("svc-credit")
                .hasPactWith("svc-banking")
                .uponReceiving("requisição de extrato para análise de crédito")
                .path("/api/v1/contas/conta-001/extrato")
                .method("GET")
                .query("periodo_dias=90")
                .headers(Map.of("X-Tenant-Id", "aurix-test"))
                .willRespondWith()
                .status(200)
                .headers(Map.of("Content-Type", "application/json"))
                .body("""
                        {
                          "conta_id": "conta-001",
                          "periodo_dias": 90,
                          "transacoes": [
                            {
                              "id": "txn-001",
                              "tipo": "CREDITO",
                              "valor": 5000.00,
                              "data": "2026-08-15",
                              "descricao": "Depósito"
                            }
                          ],
                          "saldo_medio": 4500.00,
                          "total_creditos": 15000.00,
                          "total_debitos": 10500.00,
                          "qtd_transacoes": 42
                        }
                        """)
                .toPact()
                .run(new PactTestRun() {
                    @Override
                    public void run(MockServer mockServer, PactSpecVersion version) {
                        Response response = RestAssured.given()
                                .baseUri(mockServer.getUrl())
                                .header("X-Tenant-Id", "aurix-test")
                                .queryParam("periodo_dias", "90")
                                .get("/api/v1/contas/conta-001/extrato")
                                .then()
                                .statusCode(200)
                                .extract().response();

                        assertEquals("conta-001", response.jsonPath().getString("conta_id"));
                        assertTrue(response.jsonPath().getList("transacoes").size() > 0);
                        assertTrue(response.jsonPath().getFloat("saldo_medio") > 0);
                    }
                });
    }

    // ═══════════════════════════════════════════════════════
    // svc-fraud → svc-payments: bloqueia transação suspeita
    // ═══════════════════════════════════════════════════════

    @Test
    @Order(4)
    @DisplayName("svc-fraud bloqueia transação via svc-payments")
    void test_fraud_bloqueia_transacao() {
        ConsumerPactBuilder.PactDslWithProvider.builder()
                .consumer("svc-fraud")
                .hasPactWith("svc-payments")
                .uponReceiving("requisição de bloqueio de transação suspeita")
                .path("/api/v1/pagamentos/txn-uuid-001/bloquear")
                .method("POST")
                .headers(Map.of(
                        "Content-Type", "application/json",
                        "X-Tenant-Id", "aurix-test"
                ))
                .body("""
                        {
                          "motivo": "FRAUDE_DETECTADA",
                          "score_fraude": 0.92,
                          "alerta_id": "alert-001",
                          "recomendacao": "BLOQUEAR"
                        }
                        """)
                .willRespondWith()
                .status(200)
                .headers(Map.of("Content-Type", "application/json"))
                .body("""
                        {
                          "transacao_id": "txn-uuid-001",
                          "status": "BLOQUEADA",
                          "bloqueado_em": "2026-08-18T10:30:00",
                          "alerta_id": "alert-001"
                        }
                        """)
                .toPact()
                .run(new PactTestRun() {
                    @Override
                    public void run(MockServer mockServer, PactSpecVersion version) {
                        Response response = RestAssured.given()
                                .baseUri(mockServer.getUrl())
                                .header("Content-Type", "application/json")
                                .header("X-Tenant-Id", "aurix-test")
                                .body("""
                                        {
                                          "motivo": "FRAUDE_DETECTADA",
                                          "score_fraude": 0.92,
                                          "alerta_id": "alert-001",
                                          "recomendacao": "BLOQUEAR"
                                        }
                                        """)
                                .post("/api/v1/pagamentos/txn-uuid-001/bloquear")
                                .then()
                                .statusCode(200)
                                .extract().response();

                        assertEquals("BLOQUEADA", response.jsonPath().getString("status"));
                        assertEquals("alert-001", response.jsonPath().getString("alerta_id"));
                    }
                });
    }

    // ═══════════════════════════════════════════════════════
    // Contrato de erro: saldo insuficiente
    // ═══════════════════════════════════════════════════════

    @Test
    @Order(5)
    @DisplayName("svc-payments recebe erro 409 saldo insuficiente")
    void test_payments_saldo_insuficiente() {
        ConsumerPactBuilder.PactDslWithProvider.builder()
                .consumer("svc-payments")
                .hasPactWith("svc-banking")
                .uponReceiving("erro de saldo insuficiente no débito")
                .path("/api/v1/contas/conta-002/debitar")
                .method("POST")
                .headers(Map.of(
                        "Content-Type", "application/json",
                        "X-Tenant-Id", "aurix-test"
                ))
                .body("""
                        {
                          "valor": 50000.00,
                          "descricao": "PIX alto valor",
                          "tipo_transacao": "PIX",
                          "idempotency_key": "pix-debit-002"
                        }
                        """)
                .willRespondWith()
                .status(409)
                .headers(Map.of("Content-Type", "application/json"))
                .body("""
                        {
                          "codigo": "SALDO_INSUFICIENTE",
                          "mensagem": "Saldo insuficiente para realizar a transação",
                          "saldo_disponivel": 1200.00
                        }
                        """)
                .toPact()
                .run(new PactTestRun() {
                    @Override
                    public void run(MockServer mockServer, PactSpecVersion version) {
                        Response response = RestAssured.given()
                                .baseUri(mockServer.getUrl())
                                .header("Content-Type", "application/json")
                                .header("X-Tenant-Id", "aurix-test")
                                .body("""
                                        {
                                          "valor": 50000.00,
                                          "descricao": "PIX alto valor",
                                          "tipo_transacao": "PIX",
                                          "idempotency_key": "pix-debit-002"
                                        }
                                        """)
                                .post("/api/v1/contas/conta-002/debitar")
                                .then()
                                .statusCode(409)
                                .extract().response();

                        assertEquals("SALDO_INSUFICIENTE", response.jsonPath().getString("codigo"));
                        assertTrue(response.jsonPath().getFloat("saldo_disponivel") < 50000.00f);
                    }
                });
    }
}

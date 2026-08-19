package com.aurix.tests.contract;

import au.com.dius.pact.provider.junit5.PactVerificationContext;
import au.com.dius.pact.provider.junit5.PactVerificationInvocationContextProvider;
import au.com.dius.pact.provider.junitsupport.Provider;
import au.com.dius.pact.provider.junitsupport.State;
import au.com.dius.pact.provider.junitsupport.loader.PactBroker;
import au.com.dius.pact.provider.junitsupport.loader.VersionSelector;
import io.restassured.RestAssured;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.junit.jupiter.SpringExtension;

import java.util.Map;

/**
 * Testes provider-side Pact — verifica que os providers do Aurix
 * honram os contratos definidos pelos consumers.
 *
 * Providers testados: svc-banking, svc-payments
 */
@ExtendWith(PactVerificationContext.class)
@ExtendWith(SpringExtension.class)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@PactBroker(
        scheme = "http",
        host = "${PACT_BROKER_HOST:localhost}",
        port = "${PACT_BROKER_PORT:9292}",
        authentication = @au.com.dius.pact.provider.junitsupport.authentication.PactUrlAuth(
                authenticationType = "basic",
                username = "${PACT_BROKER_USERNAME:pact}",
                password = "${PACT_BROKER_PASSWORD:pact}"
        ),
        providerVersionSelectors = {
                @VersionSelector(tag = "main", latest = true)
        }
)
@ActiveProfiles("test")
@DisplayName("Pact Provider Verification — Aurix Platform")
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class PactProviderTest {

    @LocalServerPort
    private int port;

    @BeforeEach
    void setUp(PactVerificationContext context) {
        context.setTarget(new io.restassured.http.VerificationHttpRequest(
                "http://localhost:" + port, port));
    }

    @BeforeAll
    static void beforeAll() {
        RestAssured.baseURI = "http://localhost";
    }

    // ═══════════════════════════════════════════════════════
    // Provider: svc-banking
    // ═══════════════════════════════════════════════════════

    @Test
    @Order(1)
    @Provider("svc-banking")
    void verifyPactForSvcBanking(PactVerificationContext context) {
        context.verifyInteraction();
    }

    @State("conta 52998224725 existe e está ativa")
    void contaClienteExiste() {
        // Setup: banco de dados de teste deve ter a conta
        // Executado antes da verificação do contrato
    }

    @State("conta conta-001 existe com saldo de R$ 5000,00")
    void contaComSaldo() {
        // Setup: conta com saldo específico
    }

    @State("conta conta-001 tem transações nos últimos 90 dias")
    void contaComExtrato() {
        // Setup: extrato populado
    }

    @State("conta conta-002 existe com saldo de R$ 1200,00")
    void contaSaldoInsuficiente() {
        // Setup: saldo baixo para testar 409
    }

    // ═══════════════════════════════════════════════════════
    // Provider: svc-payments
    // ═══════════════════════════════════════════════════════

    @Test
    @Order(2)
    @Provider("svc-payments")
    void verifyPactForSvcPayments(PactVerificationContext context) {
        context.verifyInteraction();
    }

    @State("transação txn-uuid-001 existe e pode ser bloqueada")
    void transacaoBloqueavel() {
        // Setup: transação pendente de bloqueio
    }

    @State("pagamentos API disponível")
    void pagamentosApiDisponivel() {
        // Setup: svc-payments rodando
    }
}

package com.aurix.platform.integration;

import io.restassured.RestAssured;
import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.BeforeAll;

/**
 * Classe base dos testes de integração.
 *
 * <p>Centraliza a configuração do REST Assured e a verificação de
 * disponibilidade dos serviços, permitindo que cada suíte seja pulada
 * (via JUnit Assumptions) quando o serviço alvo não estiver no ar.</p>
 */
public abstract class BaseTestIntegracao {

    @BeforeAll
    static void configurarRestAssured() {
        RestAssured.enableLoggingOfRequestAndResponseIfValidationFails();
    }

    /**
     * Pula a suíte quando o serviço não responde. Qualquer resposta HTTP
     * (mesmo 404/500) indica que o serviço está no ar; apenas falhas de
     * conexão ou timeout geram skip.
     */
    protected static void assumirServicoDisponivel(String baseUrl) {
        boolean disponivel;
        try {
            int status = RestAssured.given().baseUri(baseUrl)
                    .get("/actuator/health").statusCode();
            disponivel = status >= 100;
        } catch (RuntimeException ex) {
            disponivel = false;
        }
        Assumptions.assumeTrue(disponivel,
                "Serviço indisponível em " + baseUrl + " — teste de integração ignorado");
    }
}

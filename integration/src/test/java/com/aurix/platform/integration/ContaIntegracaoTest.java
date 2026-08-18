package com.aurix.platform.integration;

import io.restassured.http.ContentType;
import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.anyOf;
import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.is;

/**
 * Testes de integração das contas (svc-banking).
 *
 * <p>Fluxo coberto: listar contas (GET), criar conta (POST) com cliente
 * criado previamente no svc-customer e consultar a conta pelo id (GET).
 * O caso de criação sem cliente existente valida o contrato de erro.</p>
 *
 * <p>URLs configuráveis via propriedades de sistema (ex.:
 * {@code -Dsvc.banking.url=http://localhost:8200}).</p>
 */
class ContaIntegracaoTest extends BaseTestIntegracao {

    private static final String SVC_CUSTOMER =
            System.getProperty("svc.customer.url", "http://localhost:8083");
    private static final String SVC_BANKING =
            System.getProperty("svc.banking.url", "http://localhost:8200");
    private static final String CONTAS_BASE = SVC_BANKING + "/api/core/contas";

    @BeforeAll
    static void verificarDisponibilidade() {
        assumirServicoDisponivel(SVC_BANKING);
    }

    @Test
    void listarContasRetorna200() {
        given()
                .get(CONTAS_BASE)
        .then()
                .statusCode(200);
    }

    @Test
    void buscarContaInexistenteRetornaErro() {
        given()
                .get(CONTAS_BASE + "/999999999")
        .then()
                .statusCode(greaterThanOrEqualTo(400));
    }

    @Test
    void criarContaComClienteInexistenteRetornaErro() {
        given()
                .contentType(ContentType.JSON)
                .body("""
                        {
                          "clienteId": 999999999,
                          "tipoConta": "CORRENTE",
                          "saldo": 0.0,
                          "limiteCredito": 0.0
                        }
                        """)
        .when()
                .post(CONTAS_BASE)
        .then()
                .statusCode(greaterThanOrEqualTo(400));
    }

    @Test
    void criarContaComClienteCriadoEconsultarPorId() {
        Integer clienteId = criarClienteApoio();
        Assumptions.assumeTrue(clienteId != null,
                "Não foi possível criar cliente de apoio no svc-customer");

        Integer contaId = given()
                .contentType(ContentType.JSON)
                .body("""
                        {
                          "clienteId": %d,
                          "tipoConta": "CORRENTE",
                          "saldo": 0.0,
                          "limiteCredito": 0.0
                        }
                        """.formatted(clienteId))
        .when()
                .post(CONTAS_BASE)
        .then()
                .statusCode(anyOf(is(201), is(200)))
                .extract().jsonPath().getInt("id");

        given()
                .get(CONTAS_BASE + "/" + contaId)
        .then()
                .statusCode(200)
                .body("id", is(contaId));
    }

    private Integer criarClienteApoio() {
        String email = "integracao." + System.currentTimeMillis() + "@aurix.test";
        try {
            return given()
                    .contentType(ContentType.JSON)
                    .body("""
                            {
                              "tipoPessoa": "FISICA",
                              "segmento": "PESSOA_FISICA",
                              "nomeCompleto": "Cliente de Integração Teste",
                              "email": "%s"
                            }
                            """.formatted(email))
            .when()
                    .post(SVC_CUSTOMER + "/clientes")
            .then()
                    .statusCode(anyOf(is(201), is(200)))
                    .extract().jsonPath().getInt("id");
        } catch (AssertionError ex) {
            return null;
        }
    }
}

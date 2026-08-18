package com.aurix.platform.integration;

import io.restassured.http.ContentType;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.is;

/**
 * Testes de integração do catálogo de produtos (svc-products).
 *
 * <p>Fluxo coberto: listar produtos (GET), criar produto (POST) com payload
 * mínimo válido e consultar o produto pelo id (GET). O código do produto é
 * único por execução para não colidir com a restrição de unicidade.</p>
 */
class ProdutoIntegracaoTest extends BaseTestIntegracao {

    private static final String SVC_PRODUCTS =
            System.getProperty("svc.products.url", "http://localhost:8084");
    private static final String PRODUTOS_BASE = SVC_PRODUCTS + "/api/products/produtos";

    @BeforeAll
    static void verificarDisponibilidade() {
        assumirServicoDisponivel(SVC_PRODUCTS);
    }

    @Test
    void listarProdutosRetorna200() {
        given()
                .get(PRODUTOS_BASE)
        .then()
                .statusCode(200);
    }

    @Test
    void criarProdutoRetorna201EconsultaPorId() {
        String codigo = "INTEG-" + System.currentTimeMillis();

        Integer id = given()
                .contentType(ContentType.JSON)
                .body("""
                        {
                          "codigo": "%s",
                          "nome": "Conta Corrente Integração",
                          "descricao": "Produto criado pelo teste de integração",
                          "tipoProduto": "CONTA_CORRENTE",
                          "publicoAlvo": "Pessoa física",
                          "exigenciaMinima": "Renda mínima de R$ 1.000"
                        }
                        """.formatted(codigo))
        .when()
                .post(PRODUTOS_BASE)
        .then()
                .statusCode(201)
                .body("codigo", is(codigo))
                .extract().jsonPath().getInt("id");

        given()
                .get(PRODUTOS_BASE + "/" + id)
        .then()
                .statusCode(200)
                .body("id", is(id))
                .body("codigo", is(codigo));
    }
}

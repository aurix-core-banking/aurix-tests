package com.aurix.tests.customer;

import com.aurix.tests.config.TestConfig;
import io.restassured.RestAssured;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.*;

import java.util.HashMap;
import java.util.Map;

import static org.hamcrest.Matchers.*;

/**
 * Testes de integração para o domínio de clientes (PF/PJ).
 * Testa cadastro, busca por CPF e atualização de dados.
 */
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
@DisplayName("Cliente - Testes de Integração")
public class ClienteIntegrationTest extends TestConfig {

    private static String clienteId;

    @Test
    @Order(1)
    @DisplayName("Deve cadastrar um cliente pessoa física com sucesso")
    void testCadastrarCliente() {
        Map<String, Object> body = new HashMap<>();
        body.put("tipoPessoa", "PF");
        body.put("cpf", DEFAULT_CPF);
        body.put("nome", "Maria José da Silva");
        body.put("dataNascimento", "1990-05-15");
        body.put("email", "maria.jose@example.com");
        body.put("telefone", "11999887766");
        body.put("endereco", Map.of(
                "logradouro", "Rua das Flores",
                "numero", "123",
                "complemento", "Apto 42",
                "bairro", "Centro",
                "cidade", "São Paulo",
                "uf", "SP",
                "cep", "01001-000"
        ));

        clienteId = RestAssured.given()
                .spec(requestSpec)
                .body(body)
                .when()
                .post("/customer/clientes")
                .then()
                .statusCode(201)
                .contentType(ContentType.JSON)
                .body("id", notNullValue())
                .body("cpf", equalTo(DEFAULT_CPF))
                .body("nome", equalTo("Maria José da Silva"))
                .body("tipoPessoa", equalTo("PF"))
                .body("status", equalTo("ATIVO"))
                .extract()
                .path("id")
                .toString();
    }

    @Test
    @Order(2)
    @DisplayName("Deve buscar cliente por CPF")
    void testBuscarPorCpf() {
        RestAssured.given()
                .spec(requestSpec)
                .when()
                .get("/customer/clientes/cpf/" + DEFAULT_CPF)
                .then()
                .statusCode(200)
                .contentType(ContentType.JSON)
                .body("id", equalTo(clienteId))
                .body("cpf", equalTo(DEFAULT_CPF))
                .body("nome", equalTo("Maria José da Silva"))
                .body("email", equalTo("maria.jose@example.com"))
                .body("telefone", equalTo("11999887766"));
    }

    @Test
    @Order(3)
    @DisplayName("Deve atualizar dados do cliente")
    void testAtualizarCliente() {
        Map<String, Object> body = new HashMap<>();
        body.put("email", "maria.jose.novo@example.com");
        body.put("telefone", "11988776655");
        body.put("endereco", Map.of(
                "logradouro", "Avenida Paulista",
                "numero", "1000",
                "complemento", "Sala 101",
                "bairro", "Bela Vista",
                "cidade", "São Paulo",
                "uf", "SP",
                "cep", "01310-100"
        ));

        RestAssured.given()
                .spec(requestSpec)
                .body(body)
                .when()
                .put("/customer/clientes/" + clienteId)
                .then()
                .statusCode(200)
                .contentType(ContentType.JSON)
                .body("id", equalTo(clienteId))
                .body("email", equalTo("maria.jose.novo@example.com"))
                .body("telefone", equalTo("11988776655"))
                .body("endereco.logradouro", equalTo("Avenida Paulista"));
    }
}

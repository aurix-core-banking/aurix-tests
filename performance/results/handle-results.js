// Processador de resultados k6: parse JSON, gera resumo e compara com thresholds.
//
// Uso:
//   node performance/results/handle-results.js <diretorio-resultados> <arquivo-saida.html>
//
// Exemplo:
//   node performance/results/handle-results.js ./results ./results/relatorio.html
import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';

const args = process.argv.slice(2);
const resultadosDir = args[0] || './results';
const saidaHtml = args[1] || join(resultadosDir, 'relatorio.html');

const THRESHOLDS = {
  http_req_duration_p95: 500,
  http_req_duration_p99: 1000,
  http_req_failed_rate: 0.01,
};

function parsearSummary(arquivo) {
  try {
    const conteudo = readFileSync(arquivo, 'utf-8');
    return JSON.parse(conteudo);
  } catch (err) {
    console.warn('[WARN] Nao foi possivel ler ' + arquivo + ': ' + err.message);
    return null;
  }
}

function formatarMs(valor) {
  if (valor === undefined || valor === null) return 'N/A';
  return valor.toFixed(2) + 'ms';
}

function formatarTaxa(valor) {
  if (valor === undefined || valor === null) return 'N/A';
  return (valor * 100).toFixed(4) + '%';
}

function verificarThreshold(valor, limite, operador) {
  if (valor === undefined || valor === null) return 'N/A';
  if (operador === '<' && valor < limite) return 'PASS';
  if (operador === '>' && valor > limite) return 'PASS';
  return 'FAIL';
}

function estilizarStatus(status) {
  if (status === 'PASS') return 'pass';
  if (status === 'FAIL') return 'fail';
  return 'warn';
}

function coletarResultados(diretorio) {
  const resultados = [];
  try {
    const arquivos = readdirSync(diretorio);
    const summaryFiles = arquivos.filter(function (f) {
      return f.endsWith('_summary.json');
    });

    for (const arquivo of summaryFiles) {
      const dados = parsearSummary(join(diretorio, arquivo));
      if (dados) {
        const nome = arquivo.replace(/_\d{8}_\d{6}_summary\.json$/, '').replace(/_/g, ' ');
        resultados.push({ nome: nome, dados: dados, arquivo: arquivo });
      }
    }
  } catch (err) {
    console.warn('[WARN] Diretorio nao encontrado: ' + diretorio);
  }
  return resultados;
}

function extrairMetricas(dados) {
  const httpReqs = (dados.metrics && dados.metrics.http_reqs && dados.metrics.http_reqs.values) || {};
  const httpDuration = (dados.metrics && dados.metrics.http_req_duration && dados.metrics.http_req_duration.values) || {};
  const httpFailed = (dados.metrics && dados.metrics.http_req_failed && dados.metrics.http_req_failed.values) || {};

  return {
    totalReqs: httpReqs.count || 0,
    taxaErro: httpFailed.rate || 0,
    p95: httpDuration['p(95)'] || 0,
    p99: httpDuration['p(99)'] || 0,
    media: httpDuration.avg || 0,
    mediana: httpDuration.med || 0,
    maximo: httpDuration.max || 0,
    minimo: httpDuration.min || 0,
  };
}

function gerarLinhaTabela(metricas) {
  var statusP95 = verificarThreshold(metricas.p95, THRESHOLDS.http_req_duration_p95, '<');
  var statusP99 = verificarThreshold(metricas.p99, THRESHOLDS.http_req_duration_p99, '<');
  var statusErro = verificarThreshold(metricas.taxaErro, THRESHOLDS.http_req_failed_rate, '<');

  return '    <tr>\n' +
    '      <td>' + metricas.totalReqs + '</td>\n' +
    '      <td>' + formatarMs(metricas.media) + '</td>\n' +
    '      <td>' + formatarMs(metricas.mediana) + '</td>\n' +
    '      <td class="' + estilizarStatus(statusP95) + '">' + formatarMs(metricas.p95) + ' [' + statusP95 + ']</td>\n' +
    '      <td class="' + estilizarStatus(statusP99) + '">' + formatarMs(metricas.p99) + ' [' + statusP99 + ']</td>\n' +
    '      <td>' + formatarMs(metricas.maximo) + '</td>\n' +
    '      <td class="' + estilizarStatus(statusErro) + '">' + formatarTaxa(metricas.taxaErro) + ' [' + statusErro + ']</td>\n' +
    '    </tr>';
}

function gerarHtml(resultados) {
  var linhas = '';
  var totalGeral = 0;
  var todosPassaram = true;

  for (var i = 0; i < resultados.length; i++) {
    var r = resultados[i];
    var metricas = extrairMetricas(r.dados);
    totalGeral += metricas.totalReqs;

    var statusP95 = verificarThreshold(metricas.p95, THRESHOLDS.http_req_duration_p95, '<');
    var statusP99 = verificarThreshold(metricas.p99, THRESHOLDS.http_req_duration_p99, '<');
    var statusErro = verificarThreshold(metricas.taxaErro, THRESHOLDS.http_req_failed_rate, '<');

    if (statusP95 === 'FAIL' || statusP99 === 'FAIL' || statusErro === 'FAIL') {
      todosPassaram = false;
    }

    linhas += '  <div class="card">\n';
    linhas += '    <h2>' + r.nome + '</h2>\n';
    linhas += '    <table>\n';
    linhas += '      <tr><th>Requisicoes</th><th>Media</th><th>Mediana</th><th>P95 (meta <500ms)</th><th>P99 (meta <1000ms)</th><th>Max</th><th>Taxa Erro (meta <1%)</th></tr>\n';
    linhas += gerarLinhaTabela(metricas);
    linhas += '    </table>\n';
    linhas += '  </div>\n';
  }

  var statusGeral = todosPassaram ? 'pass' : 'fail';
  var textoGeral = todosPassaram ? 'TODOS OS TESTES PASSARAM' : 'ALGUNS TESTES FALHARAM';

  var html = '<!DOCTYPE html>\n' +
    '<html lang="pt-BR">\n' +
    '<head>\n' +
    '  <meta charset="UTF-8">\n' +
    '  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
    '  <title>Relatorio de Performance — Aurix Core Banking</title>\n' +
    '  <style>\n' +
    '    * { margin: 0; padding: 0; box-sizing: border-box; }\n' +
    '    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0d1117; color: #c9d1d9; padding: 20px; }\n' +
    '    h1 { color: #58a6ff; margin-bottom: 8px; font-size: 24px; }\n' +
    '    .subtitle { color: #8b949e; margin-bottom: 30px; font-size: 14px; }\n' +
    '    .card { background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 20px; margin-bottom: 20px; }\n' +
    '    .card h2 { color: #58a6ff; font-size: 18px; margin-bottom: 15px; }\n' +
    '    table { width: 100%; border-collapse: collapse; }\n' +
    '    th { background: #21262d; color: #8b949e; text-align: left; padding: 10px 12px; font-size: 12px; text-transform: uppercase; }\n' +
    '    td { padding: 10px 12px; border-top: 1px solid #30363d; font-size: 14px; }\n' +
    '    tr:hover { background: #1c2128; }\n' +
    '    .pass { color: #3fb950; font-weight: 600; }\n' +
    '    .fail { color: #f85149; font-weight: 600; }\n' +
    '    .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 20px; }\n' +
    '    .summary-item { background: #21262d; border-radius: 6px; padding: 15px; text-align: center; }\n' +
    '    .summary-item .value { font-size: 28px; font-weight: 700; color: #58a6ff; }\n' +
    '    .summary-item .label { font-size: 12px; color: #8b949e; margin-top: 5px; }\n' +
    '  </style>\n' +
    '</head>\n' +
    '<body>\n' +
    '  <h1>Relatorio de Performance</h1>\n' +
    '  <p class="subtitle">Aurix Core Banking — Gerado em ' + new Date().toLocaleString('pt-BR') + '</p>\n' +
    '\n' +
    '  <div class="card">\n' +
    '    <h2>Resumo Geral</h2>\n' +
    '    <div class="summary-grid">\n' +
    '      <div class="summary-item">\n' +
    '        <div class="value">' + resultados.length + '</div>\n' +
    '        <div class="label">Cenarios Executados</div>\n' +
    '      </div>\n' +
    '      <div class="summary-item">\n' +
    '        <div class="value">' + totalGeral + '</div>\n' +
    '        <div class="label">Total de Requisicoes</div>\n' +
    '      </div>\n' +
    '      <div class="summary-item">\n' +
    '        <div class="value ' + statusGeral + '">' + textoGeral + '</div>\n' +
    '        <div class="label">Status</div>\n' +
    '      </div>\n' +
    '    </div>\n' +
    '  </div>\n' +
    '\n' +
    linhas +
    '\n</body>\n</html>';

  return html;
}

// ── Execucao principal ─────────────────────────────────────────────────
console.log('Processando resultados de: ' + resultadosDir);

var resultados = coletarResultados(resultadosDir);
console.log('Encontrados ' + resultados.length + ' arquivos de resultado');

if (resultados.length === 0) {
  console.log('Nenhum arquivo *_summary.json encontrado. Execute os testes primeiro.');
  console.log('Exemplo: k6 run --summary-export=results/test_summary.json performance/tests/health-check.js');
  process.exit(0);
}

var html = gerarHtml(resultados);
writeFileSync(saidaHtml, html, 'utf-8');
console.log('Relatorio HTML gerado em: ' + saidaHtml);

// Imprimir resumo no console
console.log('\n═══════════════════════════════════════════════════════════');
console.log('  RESUMO');
console.log('═══════════════════════════════════════════════════════════');

for (var j = 0; j < resultados.length; j++) {
  var metricas = extrairMetricas(resultados[j].dados);
  var sP95 = verificarThreshold(metricas.p95, THRESHOLDS.http_req_duration_p95, '<');
  var sP99 = verificarThreshold(metricas.p99, THRESHOLDS.http_req_duration_p99, '<');
  var sErr = verificarThreshold(metricas.taxaErro, THRESHOLDS.http_req_failed_rate, '<');

  console.log('  ' + resultados[j].nome);
  console.log('    Requisicoes: ' + metricas.totalReqs + ' | P95: ' + formatarMs(metricas.p95) + ' [' + sP95 + '] | P99: ' + formatarMs(metricas.p99) + ' [' + sP99 + '] | Erro: ' + formatarTaxa(metricas.taxaErro) + ' [' + sErr + ']');
}

console.log('═══════════════════════════════════════════════════════════');

// Teste de health check: valida disponibilidade do sistema com carga constante.
//
// Cenário: 10 VUs por 30 segundos, apenas GET /actuator/health.
// Objetivo: verificar que o gateway e todos os microserviços estão up.
//
// Execução:
//   k6 run performance/tests/health-check.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL } from '../k6-config.js';

export const options = {
  scenarios: {
    health_check: {
      executor: 'constant-vus',
      vus: 10,
      duration: '30s',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<200', 'p(99)<500'],
    http_req_failed: ['rate<0.001'],
  },
};

export default function () {
  const res = http.get(`${BASE_URL}/actuator/health`);

  check(res, {
    'Health check responde 200': (r) => r.status === 200,
    'Health check corpo contém status': (r) => {
      try {
        const body = r.json();
        return body.status === 'UP';
      } catch (e) {
        return false;
      }
    },
    'Health check latência < 100ms': (r) => r.timings.duration < 100,
  });

  sleep(1);
}

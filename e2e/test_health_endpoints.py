import pytest
import requests
from tenacity import retry, stop_after_delay, wait_fixed

from .config import SERVICE_HEALTH_ENDPOINTS, DEFAULT_TIMEOUT_SECONDS


@retry(stop=stop_after_delay(DEFAULT_TIMEOUT_SECONDS), wait=wait_fixed(5))
def wait_for_service_healthy(url: str) -> None:
    response = requests.get(url, timeout=10)
    assert response.status_code == 200


@pytest.mark.parametrize("service_name, url", SERVICE_HEALTH_ENDPOINTS.items())
def test_service_health_endpoints(service_name: str, url: str) -> None:
    wait_for_service_healthy(url)


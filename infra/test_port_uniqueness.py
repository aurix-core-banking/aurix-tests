import glob
import os
import re

import pytest

# Portas host esperadas dos serviços Aurix (gateway Traefik + 14 svc-*),
# conforme aurix-infrastructure/docker-compose.yml. Manter sincronizado com o compose.
PORTAS_ESPERADAS = {
    "gateway": 8080,
    "svc-banking": 8200,
    "svc-payments": 8201,
    "svc-credit": 8082,
    "svc-customer": 8083,
    "svc-products": 8084,
    "svc-contracts": 8085,
    "svc-finance-mgmt": 8089,
    "svc-intelligence": 8091,
    "svc-platform": 8092,
    "svc-cambio": 8093,
    "svc-cards": 8094,
    "svc-compliance": 8205,
    "svc-ai": 8206,
    "svc-fraud": 8207,
}

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), os.pardir, os.pardir))
COMPOSE_DIR = os.path.join(REPO_ROOT, "aurix-infrastructure")
COMPOSE_FILES = sorted(glob.glob(os.path.join(COMPOSE_DIR, "docker-compose*.yml")))


def find_all_ports() -> dict:
    port_map = {}
    for filepath in COMPOSE_FILES:
        with open(filepath) as f:
            content = f.read()
        for match in re.finditer(r'["\']?(\d+):(\d+)["\']?', content):
            host_port = int(match.group(1))
            if host_port not in port_map:
                port_map[host_port] = []
            port_map[host_port].append(filepath)
    return port_map


def test_encontra_docker_compose() -> None:
    assert COMPOSE_FILES, f"Nenhum docker-compose encontrado em {COMPOSE_DIR}"


def test_portas_esperadas_presentes() -> None:
    port_map = find_all_ports()
    portas_presentes = set(port_map.keys())
    ausentes = {
        servico: porta
        for servico, porta in PORTAS_ESPERADAS.items()
        if porta not in portas_presentes
    }
    assert not ausentes, (
        f"Portas esperadas ausentes no docker-compose:\n" +
        "\n".join(f"  {servico}: {porta}" for servico, porta in ausentes.items())
    )


def test_no_duplicate_host_ports() -> None:
    port_map = find_all_ports()
    conflicts = {port: files for port, files in port_map.items() if len(files) > 1}
    assert not conflicts, (
        f"Portas host duplicadas encontradas:\n" +
        "\n".join(f"  {port}: {', '.join(files)}" for port, files in conflicts.items())
    )

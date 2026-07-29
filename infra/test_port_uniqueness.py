import glob
import re
import pytest


def find_all_ports() -> dict:
    compose_files = glob.glob("**/docker-compose*.yml", recursive=True)
    port_map = {}
    for filepath in sorted(compose_files):
        with open(filepath) as f:
            content = f.read()
        for match in re.finditer(r'["\']?(\d+):(\d+)["\']?', content):
            host_port = int(match.group(1))
            if host_port not in port_map:
                port_map[host_port] = []
            port_map[host_port].append(filepath)
    return port_map


def test_no_duplicate_host_ports():
    port_map = find_all_ports()
    conflicts = {port: files for port, files in port_map.items() if len(files) > 1}
    assert not conflicts, (
        f"Portas host duplicadas encontradas:\n" +
        "\n".join(f"  {port}: {', '.join(files)}" for port, files in conflicts.items())
    )

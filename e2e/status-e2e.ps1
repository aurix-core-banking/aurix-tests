Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "AUREUS E2E - Status dos Testes" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "1. Verificando Docker..." -ForegroundColor Yellow
$dockerRunning = $false
try {
    $null = docker version 2>&1
    $dockerRunning = $true
    Write-Host "   Docker: OK" -ForegroundColor Green
} catch {
    Write-Host "   Docker: ERRO - Nao esta rodando" -ForegroundColor Red
    exit 1
}

Write-Host "`n2. Verificando containers..." -ForegroundColor Yellow
try {
    $containers = docker ps -a --format "{{.Names}}|{{.Status}}|{{.Ports}}" 2>&1 | Select-Object -First 30
    
    if ($containers) {
        Write-Host "   Containers encontrados:" -ForegroundColor Green
        $aurixCount = 0
        $runningCount = 0
        
        foreach ($line in $containers) {
            if ($line -match "aurix-") {
                $aurixCount++
                $parts = $line -split '\|'
                if ($parts.Length -ge 2) {
                    $status = $parts[1]
                    if ($status -match "Up|Running") {
                        $runningCount++
                        Write-Host "   [OK] $($parts[0])" -ForegroundColor Green
                    } else {
                        Write-Host "   [STOPPED] $($parts[0])" -ForegroundColor Yellow
                    }
                }
            }
        }
        
        Write-Host "`n   Total AUREUS: $aurixCount | Rodando: $runningCount" -ForegroundColor Cyan
    } else {
        Write-Host "   Nenhum container encontrado" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   Erro ao verificar containers" -ForegroundColor Red
}

Write-Host "`n3. Verificando testes E2E..." -ForegroundColor Yellow
$testFile = "tests\e2e\test_health_endpoints.py"
if (Test-Path $testFile) {
    Write-Host "   Arquivo de testes: OK" -ForegroundColor Green
    
    try {
        $pytestCheck = python -c "import pytest; print('OK')" 2>&1
        if ($pytestCheck -match "OK") {
            Write-Host "   pytest instalado: OK" -ForegroundColor Green
        } else {
            Write-Host "   pytest instalado: NAO" -ForegroundColor Red
            Write-Host "   Execute: pip install -r tests\e2e\requirements.txt" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "   pytest: Erro ao verificar" -ForegroundColor Red
    }
} else {
    Write-Host "   Arquivo de testes: NAO ENCONTRADO" -ForegroundColor Red
}

Write-Host "`n=============================================" -ForegroundColor Cyan
Write-Host "Para executar os testes:" -ForegroundColor Yellow
Write-Host "  cd infrastructure\scripts" -ForegroundColor White
Write-Host "  .\run-e2e-tests.bat" -ForegroundColor White
Write-Host "=============================================" -ForegroundColor Cyan

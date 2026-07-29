Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "AUREUS E2E - Monitoramento de Testes" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

$maxAttempts = 60
$attempt = 0

Write-Host "Verificando status dos containers..." -ForegroundColor Yellow

while ($attempt -lt $maxAttempts) {
    $attempt++
    Write-Host "Tentativa $attempt/$maxAttempts..." -ForegroundColor Gray
    
    try {
        $containers = docker ps --format "{{.Names}}|{{.Status}}" 2>&1
        
        if ($LASTEXITCODE -eq 0 -and $containers) {
            Write-Host "`nContainers encontrados:" -ForegroundColor Green
            $containers | ForEach-Object {
                $parts = $_ -split '\|'
                if ($parts.Length -eq 2) {
                    Write-Host "  $($parts[0]): $($parts[1])" -ForegroundColor White
                }
            }
            
            $aurixContainers = $containers | Where-Object { $_ -match "aurix-" }
            $count = ($aurixContainers | Measure-Object).Count
            
            Write-Host "`nTotal de containers AUREUS rodando: $count" -ForegroundColor Green
            
            if ($count -gt 0) {
                Write-Host "`nTestando endpoints de health..." -ForegroundColor Yellow
                python -m pytest tests\e2e\test_health_endpoints.py -v 2>&1
                break
            }
        } else {
            Write-Host "Aguardando containers iniciarem..." -ForegroundColor Yellow
        }
    } catch {
        Write-Host "Erro ao verificar containers: $_" -ForegroundColor Red
    }
    
    Start-Sleep -Seconds 10
}

if ($attempt -ge $maxAttempts) {
    Write-Host "`nTimeout: Containers nao iniciaram a tempo." -ForegroundColor Red
    Write-Host "Verifique manualmente: docker ps" -ForegroundColor Yellow
}

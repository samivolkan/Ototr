[CmdletBinding()]
param(
  [switch]$StopOnFailure
)

$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $root

$runtimeNodeModules = Join-Path $env:USERPROFILE ".cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules"
$runtimePnpmModules = Join-Path $runtimeNodeModules ".pnpm\node_modules"
$nodePathParts = @()

if ($env:NODE_PATH) {
  $nodePathParts += $env:NODE_PATH -split [IO.Path]::PathSeparator
}

foreach ($candidate in @($runtimeNodeModules, $runtimePnpmModules)) {
  if (Test-Path $candidate) {
    $nodePathParts += $candidate
  }
}

$env:NODE_PATH = ($nodePathParts | Where-Object { $_ } | Select-Object -Unique) -join [IO.Path]::PathSeparator

$checks = @(
  @{
    Name = "flutter pub get"
    Area = "Flutter dependencies"
    Priority = "P0"
    File = "flutter"
    Args = @("pub", "get")
  },
  @{
    Name = "flutter analyze"
    Area = "Flutter static analysis"
    Priority = "P0"
    File = "flutter"
    Args = @("analyze")
  },
  @{
    Name = "flutter test"
    Area = "Flutter unit/widget tests"
    Priority = "P0"
    File = "flutter"
    Args = @("test")
  },
  @{
    Name = "node tools/test-demo-data.mjs"
    Area = "ERP/CRM demo data"
    Priority = "P0"
    File = "node"
    Args = @("tools/test-demo-data.mjs")
  },
  @{
    Name = "node tools/test-vin-service.mjs"
    Area = "VIN service"
    Priority = "P0"
    File = "node"
    Args = @("tools/test-vin-service.mjs")
  },
  @{
    Name = "node tools/test-vin-ui.mjs"
    Area = "Dealer VIN UI"
    Priority = "P0"
    File = "node"
    Args = @("tools/test-vin-ui.mjs")
  },
  @{
    Name = "node tools/test-android-preview.mjs"
    Area = "Android preview UI"
    Priority = "P0"
    File = "node"
    Args = @("tools/test-android-preview.mjs")
  },
  @{
    Name = "node tools/test-index.mjs"
    Area = "ERP/CRM smoke"
    Priority = "P0"
    File = "node"
    Args = @("tools/test-index.mjs")
  }
)

$results = @()

foreach ($check in $checks) {
  Write-Host ""
  Write-Host "==> $($check.Name)"

  $output = New-Object System.Collections.Generic.List[string]
  $stopwatch = [Diagnostics.Stopwatch]::StartNew()
  $exitCode = 0

  try {
    $previousErrorActionPreference = $ErrorActionPreference
    $ErrorActionPreference = "Continue"

    & $check.File @($check.Args) 2>&1 | ForEach-Object {
      $line = $_.ToString()
      $output.Add($line)
      Write-Host $line
    }

    if ($LASTEXITCODE -ne $null) {
      $exitCode = $LASTEXITCODE
    }
  }
  catch {
    $exitCode = 1
    $line = $_.Exception.Message
    $output.Add($line)
    Write-Host $line
  }
  finally {
    if ($previousErrorActionPreference) {
      $ErrorActionPreference = $previousErrorActionPreference
    }

    $stopwatch.Stop()
  }

  $status = if ($exitCode -eq 0) { "passed" } else { "failed" }
  $tailStart = [Math]::Max(0, $output.Count - 80)
  $tailCount = $output.Count - $tailStart

  $results += [pscustomobject]@{
    name = $check.Name
    area = $check.Area
    priority = $check.Priority
    status = $status
    exitCode = $exitCode
    durationSeconds = [Math]::Round($stopwatch.Elapsed.TotalSeconds, 2)
    logTail = if ($tailCount -gt 0) { $output.GetRange($tailStart, $tailCount) } else { @() }
  }

  if ($exitCode -ne 0 -and $StopOnFailure) {
    break
  }
}

$failed = @($results | Where-Object { $_.status -eq "failed" })
$passed = @($results | Where-Object { $_.status -eq "passed" })

$summary = [pscustomobject]@{
  generatedAtUtc = (Get-Date).ToUniversalTime().ToString("o")
  projectRoot = $root.Path
  nodePath = $env:NODE_PATH
  passedCount = $passed.Count
  failedCount = $failed.Count
  firstFailure = if ($failed.Count -gt 0) { $failed[0].name } else { $null }
  nextAction = if ($failed.Count -gt 0) {
    "Fix the first failed P0 check, rerun tools/ototr_quality_gate.cmd, then update docs/ototr-yol-haritasi-otomasyon.md."
  } else {
    "All P0 checks passed. Continue with the next roadmap item."
  }
  results = $results
}

$reportPath = Join-Path $root "docs\ototr-quality-gate-latest.json"
$summary | ConvertTo-Json -Depth 8 | Set-Content -Path $reportPath -Encoding UTF8

Write-Host ""
Write-Host "Quality gate report: $reportPath"
Write-Host "Passed: $($passed.Count)  Failed: $($failed.Count)"

if ($failed.Count -gt 0) {
  Write-Host "First failure: $($failed[0].name)"
  exit 1
}

exit 0

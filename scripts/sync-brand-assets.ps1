param(
  [string]$SourceRoot = "d:\StFinal\serrian_tide"
)

$ErrorActionPreference = "Stop"

$TargetRoot = Resolve-Path (Join-Path $PSScriptRoot "..")

if (-not (Test-Path $SourceRoot)) {
  throw "Source repo not found at $SourceRoot"
}

Write-Host "Syncing public assets..."
Copy-Item -Path (Join-Path $SourceRoot "public\*") -Destination (Join-Path $TargetRoot "public") -Recurse -Force

Write-Host "Syncing core visual files..."
Copy-Item -Path (Join-Path $SourceRoot "src\app\globals.css") -Destination (Join-Path $TargetRoot "src\app\globals.css") -Force
Copy-Item -Path (Join-Path $SourceRoot "src\components\Button.tsx") -Destination (Join-Path $TargetRoot "src\components\Button.tsx") -Force
Copy-Item -Path (Join-Path $SourceRoot "src\components\Card.tsx") -Destination (Join-Path $TargetRoot "src\components\Card.tsx") -Force
Copy-Item -Path (Join-Path $SourceRoot "src\components\GradientText.tsx") -Destination (Join-Path $TargetRoot "src\components\GradientText.tsx") -Force

Write-Host "Brand sync complete."

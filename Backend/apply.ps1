#Requires -Version 5.1
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$root = $PSScriptRoot
Write-Host "==> RAG Support Backend Setup" -ForegroundColor Cyan

# --- Directories ---
@("routers", "uploads", "chroma_db") | ForEach-Object {
    New-Item -ItemType Directory -Path (Join-Path $root $_) -Force | Out-Null
}

# --- Python venv ---
$venvPath = Join-Path $root ".venv"
if (-not (Test-Path $venvPath)) {
    Write-Host "==> Creating Python venv..." -ForegroundColor Cyan
    python -m venv $venvPath
}

$pip = if ($IsWindows -or $env:OS -eq "Windows_NT") {
    Join-Path $venvPath "Scripts\pip.exe"
}
else {
    Join-Path $venvPath "bin/pip"
}

Write-Host "==> Installing dependencies..." -ForegroundColor Cyan
& $pip install --quiet --upgrade pip
& $pip install --quiet -r (Join-Path $root "requirements.txt")

# --- .env ---
$envPath = Join-Path $root ".env"
$envExample = Join-Path $root ".env.example"
if (-not (Test-Path $envPath)) {
    Copy-Item $envExample $envPath
    Write-Host ""
    Write-Host "==> ACTION REQUIRED: Edit .env with your keys before starting!" -ForegroundColor Yellow
    Write-Host "    1. Set OPENAI_API_KEY" -ForegroundColor Yellow
    Write-Host "    2. Set JWT_SECRET (random 32+ char string)" -ForegroundColor Yellow
    Write-Host "    3. Generate ADMIN_PASSWORD_HASH:" -ForegroundColor Yellow
    Write-Host "       python -c `"import bcrypt; print(bcrypt.hashpw(b'yourpassword', bcrypt.gensalt(12)).decode())`"" -ForegroundColor Yellow
    Write-Host "    4. Paste hash into ADMIN_PASSWORD_HASH in .env" -ForegroundColor Yellow
}

# --- routers __init__.py ---
$initPath = Join-Path $root "routers\__init__.py"
if (-not (Test-Path $initPath)) {
    Set-Content -Path $initPath -Value "" -Encoding UTF8
}

Write-Host ""
Write-Host "==> Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Start server:" -ForegroundColor White
Write-Host "  .venv\Scripts\activate  (Windows)" -ForegroundColor Gray
Write-Host "  source .venv/bin/activate  (Linux/Mac)" -ForegroundColor Gray
Write-Host "  uvicorn main:app --reload --port 8000" -ForegroundColor Gray
Write-Host ""
Write-Host "API docs: http://localhost:8000/docs" -ForegroundColor Cyan
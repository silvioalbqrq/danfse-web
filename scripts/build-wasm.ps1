#requires -version 5.1
<#
Compila o gerador oficial de DANFSe (Receita Federal) para WebAssembly e copia
o binário para wasm/, junto com o wasm_exec.js do mesmo Go.

Uso:
  powershell -ExecutionPolicy Bypass -File scripts\build-wasm.ps1

O script fixa o commit do upstream e a versão do Go; para atualizar, troque os
parâmetros e rode de novo (o site passa a servir o novo binário).
#>
param(
  [string]$Commit = "8d79e6b2f7fad6375340afcb51c85ed370c64a14",
  [string]$GoVersion = "1.27.4"
)

$ErrorActionPreference = "Stop"
$raiz = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$destino = Join-Path $raiz "wasm"
$cache = Join-Path $env:TEMP "danfse-wasm-build"
New-Item -ItemType Directory -Force -Path $destino, $cache | Out-Null

function Baixar($url, $arquivo) {
  if (Test-Path $arquivo) { return }
  Write-Host "Baixando $url"
  Invoke-WebRequest -Uri $url -OutFile $arquivo
}

# --- Go portátil (não mexe no PATH do sistema) ---
$goExe = (Get-Command go -ErrorAction SilentlyContinue).Source
if (-not $goExe) {
  $zipGo = Join-Path $cache "go$GoVersion.windows-amd64.zip"
  Baixar "https://go.dev/dl/go$GoVersion.windows-amd64.zip" $zipGo
  $pastaGo = Join-Path $cache "go$GoVersion"
  if (-not (Test-Path $pastaGo)) {
    Write-Host "Extraindo Go $GoVersion…"
    Expand-Archive -Path $zipGo -DestinationPath $pastaGo -Force
  }
  $goExe = Join-Path $pastaGo "go\bin\go.exe"
}
if (-not (Test-Path $goExe)) { throw "Go não encontrado em $goExe" }
$versaoInstalada = (& $goExe version).Trim()
Write-Host "Usando $versaoInstalada"

# --- código-fonte do gerador no commit fixo ---
$fonte = Join-Path $cache "fonte-$Commit"
if (-not (Test-Path (Join-Path $fonte "go.mod"))) {
  $zipFonte = Join-Path $cache "upstream-$Commit.zip"
  Baixar "https://codeload.github.com/ReceitaFederal/calculadora-rtc-gerador-danfse/zip/$Commit" $zipFonte
  $extraido = Join-Path $cache "calculadora-rtc-gerador-danfse-$Commit"
  if (Test-Path $extraido) { Remove-Item $extraido -Recurse -Force }
  Expand-Archive -Path $zipFonte -DestinationPath $cache -Force
  Move-Item $extraido $fonte
}

# --- build ---
Push-Location $fonte
try {
  $env:GOOS = "js"
  $env:GOARCH = "wasm"
  $env:CGO_ENABLED = "0"
  & $goExe build -trimpath -ldflags "-s -w" -o (Join-Path $destino "danfse.wasm") ./cmd/danfse-wasm
  if ($LASTEXITCODE -ne 0) { throw "go build falhou (código $LASTEXITCODE)" }
} finally {
  Pop-Location
  Remove-Item Env:GOOS, Env:GOARCH, Env:CGO_ENABLED -ErrorAction SilentlyContinue
}

# --- runtime JS da MESMA versão do Go ---
$goroot = (& $goExe env GOROOT).Trim()
$wasmExec = Join-Path $goroot "lib\wasm\wasm_exec.js"
if (-not (Test-Path $wasmExec)) { throw "wasm_exec.js não encontrado em $wasmExec" }
Copy-Item $wasmExec (Join-Path $destino "wasm_exec.js") -Force

$binario = Join-Path $destino "danfse.wasm"
$hash = (Get-FileHash $binario -Algorithm SHA256).Hash.ToLowerInvariant()
$tamanho = (Get-Item $binario).Length
$nota = @"
Commit upstream : $Commit
Go              : $(& $goExe version)
SHA-256         : $hash
Tamanho         : $tamanho bytes
Gerado em       : $(Get-Date -Format "yyyy-MM-dd HH:mm:ss zzz")
"@
Set-Content -Path (Join-Path $destino "BUILD.txt") -Value $nota -Encoding UTF8
Write-Host ""
Write-Host "wasm/danfse.wasm gerado ($tamanho bytes)"
Write-Host "SHA-256: $hash"

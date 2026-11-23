# Publica o site em https://silvioalbqrq.github.io/danfse-web/
# Uso:  powershell -ExecutionPolicy Bypass -File scripts\publicar-github.ps1
param(
  [string]$Repo = "danfse-web",
  [string]$Mensagem = "Site DANFSe Web: XML para PDF no navegador"
)

$ErrorActionPreference = "Stop"
$origem = (Resolve-Path (Join-Path $PSScriptRoot "..\page-shell")).Path
$temp = Join-Path $env:TEMP "danfse-web-publicar"

if (Test-Path $temp) { Remove-Item $temp -Recurse -Force }
New-Item -ItemType Directory -Force -Path $temp | Out-Null

gh repo view "silvioalbqrq/$Repo" --json name 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) {
  gh repo create "silvioalbqrq/$Repo" --public --description "Gera o DANFSe em PDF a partir do XML da NFS-e, no navegador." | Out-Null
}

git clone "https://github.com/silvioalbqrq/$Repo.git" $temp
Get-ChildItem $origem -Force -Exclude ".git" | Copy-Item -Destination $temp -Recurse -Force

Push-Location $temp
git add -A
git commit -m $Mensagem
git push origin HEAD:main
Pop-Location

Write-Host "Site: https://silvioalbqrq.github.io/$Repo/"

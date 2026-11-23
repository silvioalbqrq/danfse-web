# DANFSe Web — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (native, single session).

**Goal:** Site estático que gera DANFSe em PDF a partir de XMLs de NFS-e, no navegador, via WASM.

**Architecture:** Site estático sem build (ES modules). O gerador oficial é compilado por `scripts/build-wasm.ps1` para `wasm/danfse.wasm` e commitado. `app.js` orquestra; módulos `wasm`, `danfse`, `zip`, `ui` são independentes.

**Tech Stack:** HTML/CSS/JS puro, Go 1.27.4 (WASM), `node:test`.

**Spec:** `docs/superpowers/specs/2026-11-23-danfse-web-design.md`

## Global Constraints

- Limite de XML: 5.242.880 bytes (5 MiB), igual ao upstream.
- `stc`: 0 válida, 1 substituída, 2 cancelada; canhoto padrão `true`.
- Nenhuma dependência de runtime, CDN ou backend.
- Nenhum dado em storage; nenhuma rede após carregar wasm.
- Nomes: PDF `DANFSe-<chave>.pdf`; ZIP `danfse-AAAAMMDD-HHMM.zip`.
- Upstream fixo: `ReceitaFederal/calculadora-rtc-gerador-danfse@8d79e6b2f7fad6375340afcb51c85ed370c64a14`.
- Textos de interface em pt-BR.

## Review Focus

- XML com BOM/encoding diferente (`ISO-8859-1`): deve ser lido como bytes e decodificado sem quebrar.
- XML sem `Id="NFS…"`: deve usar o nome do arquivo.
- Dois arquivos com o mesmo nome no lote: ZIP não pode sobrescrever.
- Usuário troca opções no meio do lote: resultado antigo não pode ser baixado como se fosse novo.
- Abrir por `file://`: mensagem clara, sem tela em branco.

---

### Task 1: ZIP e nomes (utilitários puros)

**Files:** Create `js/zip.js`, `js/nomes.js`, `tests/zip.test.js`, `tests/nomes.test.js`

**Interfaces:**
- `crc32(bytes: Uint8Array): number`
- `criarZip(arquivos: {nome: string, bytes: Uint8Array}[]): Blob`
- `nomePdf(xmlTexto: string, nomeArquivo: string): string`
- `nomeZip(data: Date): string`
- `formatarBytes(n: number): string`

- [ ] Testes: CRC32 de "123456789" = 0xCBF43926; ZIP começa `PK\x03\x04`, termina `PK\x05\x06`, contém os nomes; `nomePdf` extrai 50 dígitos de `Id="NFS…"`, cai para o nome do arquivo; sanitização; `formatarBytes`.
- [ ] Rodar `node --test tests/` e ver falhar.
- [ ] Implementar os módulos.
- [ ] Rodar testes e validar ZIP com `python -m zipfile -t`.
- [ ] Commit.

### Task 2: Pipeline WASM

**Files:** Create `scripts/build-wasm.ps1`, `wasm/danfse.wasm`, `wasm/wasm_exec.js`, `THIRD-PARTY-NOTICES.md`

- [ ] Baixar Go 1.27.4 portátil e o fonte do upstream no commit fixo.
- [ ] Compilar `GOOS=js GOARCH=wasm go build -o wasm/danfse.wasm ./cmd/danfse-wasm`; copiar `wasm_exec.js`.
- [ ] Registrar no script: versão do Go, commit, SHA-256 do binário.
- [ ] Verificar tamanho e assinatura do wasm; commit.

### Task 3: Casca visual

**Files:** Create `index.html`, `style.css`, `assets/logo.svg`, `assets/favicon.svg`

- [ ] Estrutura: topo com marca/status, hero, card de arquivos (drop zone + lista), card de opções, resumo/ZIP, rodapé de privacidade.
- [ ] Tokens do nfse-web, dark mode, responsivo, foco visível, `aria-live`.
- [ ] Testar em 360px e 1440px, claro e escuro.

### Task 4: Motor e geração

**Files:** Create `js/wasm.js`, `js/danfse.js`; Modify `app.js`

**Interfaces:**
- `carregarMotor(): Promise<{gerarPdf(json: string): unknown}>`
- `gerarPdf(xml: string, opcoes: {stc: number, canhoto: boolean}): Promise<Blob>`

- [ ] Desabilitar entrada até o motor ficar pronto; erro de carga com checklist.
- [ ] Fila sequencial com progresso, cancelar, tentar novamente.
- [ ] Opções invalidam resultados.
- [ ] Ver/Baixar por linha; ZIP do lote; limpar revoga URLs.

### Task 5: Fechamento

**Files:** Create `README.md`, `LICENSE`, `.nojekyll`, `.gitignore`, `iniciar-site.bat`, `.github/workflows/verify-wasm.yml`

- [ ] README: abrir local, publicar no Pages, limites, privacidade, fumaça manual.
- [ ] `verify-wasm.yml` recompila e compara SHA-256.
- [ ] Commit final e push (quando o usuário criar o repositório remoto).

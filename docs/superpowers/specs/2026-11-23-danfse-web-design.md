# DANFSe Web — design

Data: 2026-11-23
Status: aprovado em conversa (arquitetura, escopo, visual e abertura)

## Objetivo

Site **estático e local** que converte XML de NFS-e em DANFSe (PDF) inteiramente
no navegador, usando o gerador oficial da Receita compilado para WebAssembly.
O XML nunca sai da máquina. Publicável no GitHub Pages sem backend.

## Fora de escopo

- Baixar XML do ADN, certificado A1, integração com o Portal Nacional.
- Edição de XML, cálculo de tributos, assinatura digital.
- Backend, banco, telemetria, login.
- Persistência de arquivos ou dados fiscais no navegador.

## Arquitetura

Projeto independente em `danfse-web/` (repositório próprio). Sem framework,
sem bundler, sem CDN. ES modules nativos.

```
index.html            tela única
style.css             tokens visuais herdados do nfse-web
app.js                orquestra estado, fila, opções e downloads
js/wasm.js            carrega wasm_exec.js + danfse.wasm; espera o motor
js/danfse.js          chama danfseWasm.gerarPdf; base64 -> Blob PDF
js/zip.js             escritor ZIP (método store) com CRC32, sem dependência
js/ui.js              DOM: drop zone, lista, progresso, toasts, aria-live
wasm/danfse.wasm      build do upstream 8d79e6b (Go 1.27.4)
wasm/wasm_exec.js     runtime da mesma versão do Go
assets/               logo, favicon e fontes (copiados do nfse-web)
scripts/build-wasm.ps1
tests/                node:test (zip, nomes, tamanhos)
iniciar-site.bat      http.server 8020 + abre o navegador
.github/workflows/verify-wasm.yml
```

Fronteiras: cada módulo tem uma responsabilidade; `app.js` é o único que
conhece todos e mantém o estado. Nenhum módulo de UI gera PDF, nenhum módulo
de PDF toca no DOM.

## Contrato do motor

Upstream `cmd/danfse-wasm` expõe:

```js
danfseWasm.ready            // boolean
danfseWasm.error            // string quando a inicialização falhou
danfseWasm.gerarPdf(json)   // json: {"xml": string, "stc": 0|1|2, "canhoto": boolean}
                            // retorno: {"pdf": base64, "size": n} ou {"error": "..."}
```

`stc`: 0 válida, 1 substituída, 2 cancelada. Limite de XML: 5 MiB (5.242.880 bytes).

## Fluxo

1. Ao abrir, carrega o motor; selo no topo indica carregando/pronto/falhou.
   Drop zone fica inativa até o motor subir.
2. Entrada por arrastar-e-soltar ou seletor múltiplo. Validação por arquivo:
   extensão `.xml`, conteúdo não vazio, tamanho ≤ 5 MiB, duplicado por nome+tamanho.
   Recusados aparecem na lista com o motivo.
3. Opções do lote: situação (stc) e canhoto. Mudar opção invalida resultados
   anteriores (voltam a pendente).
4. Geração sequencial, um arquivo por vez, com progresso “n de total”.
   Botão cancelar interrompe após o arquivo atual.
5. Resultado por linha: pronto (tamanho) com Ver/Baixar, ou erro com mensagem
   curta em português e detalhe técnico recolhível; tentar novamente por linha.
6. ZIP com todos os prontos, nome `danfse-AAAAMMDD-HHMM.zip`; PDFs nomeados
   `DANFSe-<chave>.pdf` (chave extraída de `Id="NFS…"`; fallback: nome do XML).
7. Limpar remove tudo e revoga object URLs.

## Nome do PDF

- Regex `Id\s*=\s*["']NFS(\d{50})["']` no texto do XML.
- Sanitização para `[A-Za-z0-9._-]`, tamanho máximo 120.
- Duplicados no ZIP recebem sufixo `-(2)`, `-(3)`.

## Erros

| Situação | Tratamento |
|---|---|
| `file://` | mensagem específica pedindo `http://127.0.0.1:8020` |
| wasm ausente/404 | banner com o caminho esperado |
| navegador sem WebAssembly | banner de incompatibilidade |
| XML grande | linha recusada com tamanho real |
| XML inválido | erro do motor, resumo em pt-BR + detalhe |
| ZIP falha | toast; PDFs individuais continuam disponíveis |

Nenhuma chamada de rede após o carregamento inicial. Nenhum dado em
localStorage/sessionStorage.

## Visual

Herdado do nfse-web: Plus Jakarta Sans (local), navy `#0b1f3a`, azul `#2563eb`,
esmeralda `#0f9f6e`, cards com `--r: 16px`, modo escuro automático. Uma coluna
no mobile; duas no desktop. Foco visível, `aria-live` para progresso.

## Testes

- `node --test tests/`: CRC32, estrutura do ZIP (assinatura, diretório central,
  store, nomes duplicados), extração de chave, sanitização, formatação de bytes.
- Validação cruzada do ZIP com `python -m zipfile -t`.
- Fumaça manual no README (2 XMLs, ZIP, opções, arquivo inválido, offline).
- `verify-wasm.yml` recompila o commit fixo e compara SHA-256.

## Distribuição

- Local: `iniciar-site.bat` → `http://127.0.0.1:8020`.
- GitHub Pages: raiz de `main`, com `.nojekyll`.
- Licença MIT; avisos de terceiros com o MIT da Receita, commit e build.

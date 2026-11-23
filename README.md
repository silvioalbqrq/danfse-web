# DANFSe Web

Gera o DANFSe (PDF) a partir do XML da NFS-e, **no próprio navegador**.

- Nenhum XML sai da máquina: o motor é o `calculadora-rtc-gerador-danfse` da Receita
  Federal compilado para WebAssembly (`wasm/danfse.wasm`) e roda em uma `Web Worker`.
- Sem certificado, sem login, sem upload.
- Lote: vários XMLs de uma vez, com ZIP no final.
- Funciona offline: basta abrir `iniciar-site.bat`.

## Como abrir

1. Dê duplo clique em `iniciar-site.bat`.
2. O navegador abre em **http://127.0.0.1:8020**.

Não abra o `index.html` com duplo clique. Navegadores bloqueiam o carregamento de
módulos e de WebAssembly em endereços `file://`, e a página avisa isso com uma
mensagem clara.

Requisitos: Python 3 instalado (é o que serve os arquivos) e um navegador atual.

## Como usar

1. Arraste os XMLs de NFS-e para a área indicada (ou clique para escolher).
2. Escolha a **situação** do DANFSe: válida, substituída ou cancelada.
3. Deixe o **canhoto** ligado se precisar imprimir e assinar. Desligado, o PDF fica
   só com o corpo da nota.
4. Clique em **Gerar DANFSe**.

Cada arquivo ganha os botões **Ver** e **Baixar**, e o lote inteiro um **Baixar ZIP**.
O ZIP sai como `danfse-AAAAMMDD-HHMM.zip`, com um PDF por XML, nomeado pela chave de
acesso da nota (`DANFSe-<chave>.pdf`).

Se você mexer em situação ou canhoto depois de gerar, os PDFs daquela sessão ficam
marcados como **desatualizados** e podem ser gerados de novo.

## Limites

- 100 arquivos por lote.
- 5 MiB por arquivo.
- Apenas XMLs. Arquivos de mesmo nome e tamanho entram uma vez só.
- O XML precisa estar em UTF-8 ou ISO-8859-1/windows-1252 (o site converte). Em
  qualquer outra codificação, a mensagem pede o arquivo convertido.

## Erros

Quando um XML é recusado, o motivo aparece em português (por exemplo, “O XML não
está no padrão de NFS-e”) e há um detalhe técnico recolhível com a mensagem bruta
do motor oficial. Cada linha pode ser tentada de novo sem recarregar a página.

## O motor

`wasm/danfse.wasm` é o binário oficial, compilado do commit fixo
`8d79e6b2f7fad6375340afcb51c85ed370c64a14` do repositório
[ReceitaFederal/calculadora-rtc-gerador-danfse](https://github.com/ReceitaFederal/calculadora-rtc-gerador-danfse)
(licença MIT). O hash e as instruções de compilação estão em `wasm/BUILD.txt`, e
`scripts/build-wasm.ps1` reproduz o build — o mesmo commit gera um arquivo idêntico
byte a byte.

O workflow `.github/workflows/verify-wasm.yml` recompila esse commit a cada push para
`main` e falha se o hash mudar, garantindo que o binário publicado é o oficial.

O site funciona sem essa verificação; ela é só uma garantia para quem for clonar ou
publicar o repositório.

## Estrutura

```
index.html          página única
style.css           visual (mesmo tema do nfse-web: claro/escuro automático)
app.js              estado, fila de geração, eventos, ZIP
js/wasm.js          carrega o motor e fala com a Web Worker
js/danfse.js        ponte com o gerador oficial (gerarPdf)
js/entrada.js       leitura e normalização dos XMLs
js/nomes.js         nome do PDF pela chave de acesso; desduplicação
js/zip.js           escritor ZIP sem dependências (CRC32 próprio)
js/ui.js            utilidades de tela (toast, aria-live)
wasm/               binário oficial + wasm_exec.js + BUILD.txt
assets/             logo, favicon, fonte Plus Jakarta Sans local
tests/              testes (node --test tests/)
scripts/            build do WASM e publicação no GitHub
amostras/           XML fictício e um real anonimizado para testar
```

## Testes

```
node --test tests/
```

Cobrem o ZIP (cabeçalhos, CRC32, assinatura) e a escolha/desduplicação de nomes de PDF.

## GitHub Pages

O site é estático e funciona no GitHub Pages sem etapa de build:
`.github/workflows/pages.yml` publica a raiz da branch `main`. Configure
**Settings → Pages → Source: GitHub Actions** uma única vez no repositório.

## Licença

MIT, igual ao projeto original da Receita Federal. Veja `LICENSE` e
`THIRD-PARTY-NOTICES.md`.

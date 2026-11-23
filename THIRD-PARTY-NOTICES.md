# Avisos de terceiros

## calculadora-rtc-gerador-danfse (Receita Federal do Brasil)

- Repositório: <https://github.com/ReceitaFederal/calculadora-rtc-gerador-danfse>
- Commit usado no build: `8d79e6b2f7fad6375340afcb51c85ed370c64a14` (release 1.0.0)
- Licença: MIT

O arquivo `wasm/danfse.wasm` é a compilação de `cmd/danfse-wasm` desse projeto
(`GOOS=js GOARCH=wasm`, Go 1.27.4, `-trimpath -ldflags "-s -w"`), gerada por
`scripts/build-wasm.ps1`. `wasm/wasm_exec.js` é copiado do runtime da mesma
versão do Go (licença BSD-3-Clause, Copyright The Go Authors).

### Texto da licença MIT do projeto oficial

```
MIT License

Copyright (c) 2026 Receita Federal do Brasil

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Go (runtime WebAssembly)

- Site: <https://go.dev/>
- Licença: BSD-3-Clause, Copyright The Go Authors.

`wasm/wasm_exec.js` é distribuído com o toolchain do Go e é necessário para
executar o binário no navegador.

## Plus Jakarta Sans

- Site: <https://fonts.google.com/specimen/Plus+Jakarta+Sans>
- Licença: SIL Open Font License 1.1.

Os arquivos em `assets/fonts/` são servidos localmente para o site funcionar
offline.

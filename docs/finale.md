# Espetáculo final da FECART

Abra a cidade e clique em **Detonar a cidade**, na parte inferior da tela, ou pressione **U**. A câmera enquadra o centro automaticamente. O som pode ser desligado pela caixa **Som**.

O mesmo comando abre um cartão de parabéns para **João Gabriel, Arthur Tuccio e Caroline Kaori**, com um agradecimento de João aos colegas. Feche pelo ×, por **Esc** ou pelo botão do cartão para assistir à cidade. Durante o espetáculo, **Ler homenagem ♡** (ou **U** novamente) reabre o presente, sem reiniciar a explosão.

A onda de choque atravessa os bairros e substitui construções, árvores e objetos por fragmentos animados com gravidade, rotação, amortecimento e contato com o chão. Há clarão, fogo procedural, poeira, fumaça, faíscas, tremor e marcas de queimadura. Os escombros permanecem depois que a fumaça se dissipa; arraste a cena para explorar.

**Reconstruir cidade** restaura a geometria e o enquadramento anteriores, liberando outra explosão. O efeito pausa as atualizações visuais da simulação durante a destruição. Não altera os dados da rede elétrica. A preferência do sistema por movimento reduzido desliga o clarão de tela e o tremor.

O módulo `src/cityExplosion.js` usa fragmentos instanciados (limite de 24 mil) e 260 partículas de fumaça/fogo em um único lote. A destruição é uma aproximação visual com fragmentos retangulares e colisão com o chão, sem simulação estrutural ou colisões entre fragmentos. Não exige novas dependências.

## Validação

Com um servidor local em execução na porta 8080:

```powershell
node scripts/test-energy-sources.mjs
node scripts/test-city-explosion.mjs
```

O teste visual usa Chrome sem janela, valida propagação, queda, restauração das instâncias da cidade real, repetição, controles, movimento reduzido e erros de WebGL. Salva imagens da cidade e do cartão (computador e celular) em `scratch/finale-*.png`. `CHROME_PATH` permite indicar outro executável e `CITY_URL` permite trocar a URL.

Se o navegador de testes não alcançar o CDN, `THREE_CACHE` pode apontar para uma pasta contendo `three.module.js` e `OrbitControls.js` da versão **0.160.0**, já utilizada pelo projeto. Essa opção intercepta apenas as duas requisições no teste, sem alterar o carregamento normal da aplicação.

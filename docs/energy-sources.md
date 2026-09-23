# Fontes de energia — reformulação FECART

## Modelos e referências

Os modelos são maquetes procedurais inspiradas em instalações reais, sem pretensão de reproduzir suas dimensões ou potências.

- **Central nuclear:** duas torres de resfriamento com abertura e parede interna, bacias, apoios, contenção com cúpula, galpão de turbinas, tubulações e pátio de transformadores. Referência: [Cattenom / EDF](https://www.edf.fr/centrale-nucleaire-cattenom). A pluma representa condensação de água; a torre de resfriamento é distinta do edifício do reator.
- **Parque solar:** 270 mesas maiores distribuídas em três setores, células desenhadas por Canvas, molduras, apoios, inversores e subestação. Referência: [São Gonçalo / Enel Green Power](https://www.enelgreenpower.com/pt/nossos-projetos/highlights/parque-solar-sao-goncalo).
- **Parque eólico:** nove aerogeradores com torres de 58 unidades e rotores com raio aproximado de 25, naceles, pás afiladas, portas, bases e caminhos de manutenção. Referências: [Chafariz / Neoenergia](https://www.neoenergia.com/en/w/neoenergia-inicia-operacao-comercial-do-complexo-eolico-chafariz) e [componentes de aerogeradores / Iberdrola](https://www.iberdrola.com/about-us/power/onshore-wind-energy/10-relevant-terms).

Cada conjunto tem cerca, portaria, placa educativa, via ligada à malha urbana, veículos de serviço, paisagismo e iluminação de acesso. Os painéis dos telhados compartilham a nova textura de células.

## Navegação

No painel, **Conheça as fontes de energia** leva a câmera à instalação selecionada. Clique na instalação para consultar seu estado e seu valor simulado. O limite do modo de voo agora inclui os parques externos.

## Organização do código

- `src/powerSources.js`: construtores, materiais compartilhados, lotes instanciados, pontos de conexão, emissores de vapor, câmera de visita e animação.
- `src/cityBuilder.js`: mantém o zoneamento e chama os construtores.
- `src/powerGridRenderer.js`: cria as linhas diretamente das arestas do grafo.
- `src/main.js`: visitas, informações, sincronização e foco das sombras.
- `src/vfx.js`: pluma suave com textura reutilizada e descarte dos materiais expirados.
- `scripts/test-energy-sources.mjs`: regressão lógica executável com Node.js.

## IDs e valores didáticos

| Instalação | ID canônico | Representação lógica |
|---|---|---|
| Central nuclear | `Subestacao_Central` | Preserva a capacidade existente de 4500 kW. O popup informa capacidade nominal, não medição de produção. |
| Solar | `Fazenda_Solar` | Preserva 500 kW nominais e aplica exclusivamente o fator solar. Geração zero à noite. |
| Eólica | `Fazenda_Eolica` | Nó agregado de 150 kW nominais didáticos; 60 kW no clima ensolarado, 90 no nublado, 120 no chuvoso e zero em tempestade. |

O nó eólico agora tem as duas conexões que já eram desenhadas visualmente, com Norte e Sul. Antes, o grafo não possuía esse nó, e a interface consultava um terceiro nome, `Parque_Eolico`. A central também consultava um ID inexistente, `Usina_Nuclear`.

A separação solar/eólica altera a geração renovável total diurna: em clima ensolarado, passa de 500 kW para 560 kW. À noite, os 60 kW antes atribuídos incorretamente à solar passam a pertencer à eólica. Essa é uma calibração didática explícita; não corresponde às potências das referências reais. As capacidades das subestações não foram aumentadas com a escala visual.

Os pontos elétricos ficam nos pórticos dos pátios e são convertidos para coordenadas globais após as transformações dos grupos. Os emissores de vapor são filhos das torres. Alterações futuras na posição dos grupos em tempo de execução também deverão atualizar as linhas e o registro de posições.

## Desempenho e limites

As peças estáticas repetidas usam `InstancedMesh`. A quantidade de objetos Mesh das três fontes passou de 341 para 102, apesar de haver mais detalhes geométricos. As turbinas móveis passaram de 64 pequenas para nove maiores. As sombras mantêm mapas de 1024 pixels e acompanham a região observada. O vapor tem teto de 48 partículas, textura compartilhada e descarte dos materiais expirados.

O motor continua sendo uma simulação didática de conectividade e fluxo estimado. Esta alteração não o transforma em cálculo físico de fluxo de potência nem muda o significado do botão existente de falha, que rompe uma linha Central–Hospital.

As dependências Three.js e Chart.js continuam nos CDNs já usados pelo projeto. A reforma dos modelos não adiciona downloads de assets 3D, texturas externas ou dependências npm.

## Validação

Execute na raiz do projeto:

```sh
node scripts/test-energy-sources.mjs
```

O teste cobre solar diurna/noturna, geração eólica, tempestade, isolamento, rota alternativa Dijkstra, reset e integridade das extremidades das arestas. A validação visual complementar usa navegador real, capturas antes/depois, cliques nas instalações, visitas, noite e reset. Medições em navegador automatizado são amostras; o ensaio no computador e na resolução da feira continua sendo a referência para desempenho ao vivo.

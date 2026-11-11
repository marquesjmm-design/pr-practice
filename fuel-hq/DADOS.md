# Dados, fontes e pressupostos

Este documento separa o que vem de fontes públicas do que é **simulado**. Leia-o antes de usar qualquer número da app em decisões.

> Recolha feita por pesquisa web a 11/11/2026. A maior parte dos valores vem de **fontes secundárias** (imprensa e agregadores que citam a DGEG/ERSE/ENSE). Os sites primários (dgeg.gov.pt, erse.pt) não estavam acessíveis a partir do ambiente onde a app foi construída, por isso **não foram verificados na origem**. Confirme-os antes de os usar.

## 1. Indicadores (KPIs) escolhidos

A seleção baseou-se no que ferramentas de gestão de postos e de *head office* publicam como indicadores principais. As fontes são sobretudo material de fornecedores, por isso servem de exemplo do que o setor acompanha, não de norma:

| Área | Indicadores na app | Inspiração |
|---|---|---|
| Combustível | Volume vendido, receita, abastecimentos, litros por abastecimento | Petrosoft Retail 360 (Fuel Sales, Fuel Profit) |
| Preços e margens | Margem bruta, margem por litro, preço praticado, preço de referência nacional, diferença face à referência | Petrosoft (preços da concorrência), Madic evoHeadOffice (pricing, profitability) |
| Loja | Vendas, margem, transações, ticket médio, **conversão pista → loja** | TARGIT (forecourt conversion, margem operacional) |
| Stock | Nível dos tanques, dias de cobertura, descargas, variação de stock (*wetstock*) | Petrosoft (Fuel Inventory), Madic (replenishment) |
| Equipamentos | Disponibilidade das bombas, alarmes, manutenções em atraso | — (pedido explícito: equipamentos Petrotec) |

Fontes consultadas:
- Petrosoft — Retail 360 mobile dashboard: https://help.petrosoftinc.com/Content/Retail_360_Mobile/retail_360_mobile_dashboard.htm
- TARGIT — Top KPIs for your c-store and fuel business: https://targit.com/resources/guides/top-kpis-for-your-c-store-and-fuel-business
- TARGIT — Measure forecourt conversion: https://targit.com/en/blog/measure-forecourt-conversion-at-your-gas-station
- Madic — Head Office Software for Fuel & Forecourt: https://www.madic-uk.com/service/forecourt-head-office
- FleetPanda — The fuel marketer's guide to KPIs (alerta para o risco de olhar só para médias): https://www.fleetpanda.com/blog/the-fuel-marketer-s-guide-to-kpis-part-1

A fórmula de «conversão pista → loja» na app é um **rácio aproximado** (transações de loja ÷ abastecimentos) e inclui clientes que só vão à loja. Um cálculo exato exige ligar o talão da loja ao abastecimento no sistema POS.

## 2. Preço de referência nacional (dados publicados)

Os pontos estão em `src/data/referencePrices.ts` e visíveis na app em **Dados → Preços de referência**. São médias de preço de venda ao público (€/L) de gasóleo simples e gasolina 95 simples:

| Data | Gasóleo | G95 | Tipo | Fonte (secundária) |
|---|---|---|---|---|
| mai 2025 | 1,517 | 1,677 | média mensal | DGEG, citada pelo Jornal de Negócios |
| 31/10/2025 | 1,602 | 1,717 | valor de um dia | combustivel.com.pt (média DGEG sem descontos) |
| jan 2026 | ≈1,54 | ≈1,66 | média mensal | fonte secundária não identificada com precisão — **confirmar** |
| mai 2026 | 1,977 | 2,000 | média mensal | DGEG (Estatísticas Rápidas), citada pelo Jornal de Negócios |
| jun 2026 | 1,837 | 1,907 | média mensal | tabela DGEG em poupapilim.com |
| jul 2026 | 1,880 | 1,929 | média mensal | idem |
| ago 2026 | 2,031 | 1,958 | média mensal | idem |
| set 2026 | 2,135 | 2,079 | média mensal | idem |
| 30/10/2026 | 2,19 | 2,033 | valor de um dia | média DGEG citada pelo ECO |
| semana 2–8/11/2026 | — | 2,001 | média semanal | média DGEG citada por contaspoupanca.pt |

Notas:
- As fontes nem sempre coincidem (ex.: outro agregador indica 2,246 €/L para o gasóleo a 31/10/2026; para maio de 2026 há duas tabelas com valores ligeiramente diferentes).
- Entre pontos, a série é **interpolada linearmente** e mantida constante de segunda a domingo. Não é a série oficial semanal.
- Gasóleo aditivado, gasolina 98 e GPL **não têm pontos publicados** na app: usam diferenciais fixos assumidos (+0,12 €/L, +0,15 €/L e ≈1,00 €/L).
- Para a série oficial, a DGEG publica preços no portal https://precoscombustiveis.dgeg.gov.pt (o portal permite exportar CSV, segundo a imprensa). Pode importá-la na app em **Dados → Importar CSV**.

## 3. Operação da rede (simulada)

`src/data/simulate.ts` gera, de forma determinística (sempre os mesmos números), 01/05/2025 → 10/11/2026 para 12 postos **fictícios** em localidades reais. Pressupostos principais:

| Pressuposto | Valor | Calibração (aproximada) |
|---|---|---|
| Volume médio por posto | 4 500 – 14 000 L/dia conforme tipologia | Ordem de grandeza: consumo rodoviário nacional estimado em ≈7,3 mil milhões de litros/ano (estimativa não oficial da associação ZERO, via imprensa) e ≈3 100 postos (contagem de um site comparador, não confirmada). |
| Peso do gasóleo | ≈66–74 % do volume | Notícias de 2026 citando a DGEG: gasóleo ≈4,5 Mt e gasolina ≈1,4 Mt em ano móvel até julho de 2026; relatório mensal ENSE (dez. 2025): https://www.ense-epe.pt/wp-content/uploads/2026/01/Relatorio_Mensal_Janeiro_2026.pdf |
| Margem bruta por litro | ≈0,15–0,25 €/L conforme produto | A ERSE estimou a margem de retalho em ≈18–19 cêntimos/L em nov. 2026 (citado por contaspoupanca.pt). |
| Sazonalidade | Algarve com pico em julho/agosto; ligeira quebra urbana em agosto | Pressuposto. |
| Dia da semana | Sexta-feira mais forte; domingo fraco em zonas urbanas; autoestradas fortes ao fim de semana | Pressuposto. |
| Litros por abastecimento | 31 L (urbano), 35 L (estrada), 44 L (autoestrada) | Pressuposto. |
| Conversão de loja | parâmetro base 24–42 % conforme tipologia; o rácio mostrado fica mais alto (≈30–50 %) porque inclui clientes só de loja | Pressuposto. |
| Ticket médio de loja | 6,40 – 9,80 € | Pressuposto. |
| Margem de loja | ≈31 % | Pressuposto. |
| Tanques | Encomenda abaixo de 30 %, enchimento até 90 % | Pressuposto. |
| Avarias | Taxa por modelo (gama EURO mais antiga com mais avarias) | Pressuposto. |

Cenários incluídos de propósito para os gráficos terem algo para encontrar:
- **Leiria IC2**: deriva negativa de *wetstock* no gasóleo desde 10/09/2026 (≈−0,35 % do volume), típica de fuga ou desvio de medição.
- **Setúbal EN10**: «guerra de preços» desde 01/07/2026 (preço −4 cêntimos, margem −3 cêntimos, volume +8 %).
- Três bombas com ocorrências em curso no último dia (Aveiro, Setúbal, Évora).

## 4. Equipamentos Petrotec

Modelos em `src/data/catalog.ts`. Só foram incluídas afirmações encontradas em fontes públicas:

| Modelo | Informação usada | Fonte |
|---|---|---|
| Progress 5000 LH | até 5 produtos e 10 mangueiras; compatível com multimédia e OPT tátil | https://www.petrotec.com/products/p5000-lh |
| Progress 5000 HH | mangueira suspensa; até 4 produtos, 8 mangueiras, 130 L/min | https://www.petrotec.eu/products-and-services/dispensers/retail-line/p5000-hh.aspx |
| Progress 1000 R | modelo de entrada da gama Progress | pesquisa web — **sem fonte primária verificada** |
| Progress LPG | dispensador de GPL da gama Progress | https://www.petrotec.com/products/progress-lpg |
| EURO 2000 VI | até 4 produtos e 8 mangueiras | certificado UK-2780 (gov.uk): https://assets.publishing.service.gov.uk/media/5a7c141940f0b61a825d6506/UK-2780-revision-3.pdf |

Números de série (prefixo `DEMO-`), datas de instalação, totalizadores, estados e ocorrências são **simulados**.

**Imagens:** a app não inclui fotografias da Petrotec (não foi possível descarregá-las neste ambiente e são material com direitos de autor). Mostra ilustrações genéricas originais até lhe dar as imagens oficiais — ver README, secção «Imagens dos equipamentos».

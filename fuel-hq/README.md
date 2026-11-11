# HQ Postos — dashboard de Head Office para postos de combustível (Android)

App móvel (Android) para a sede acompanhar uma rede de postos: vendas de combustível, preços e margens, loja, stock nos tanques e estado dos equipamentos Petrotec. Os painéis são **personalizáveis**: cada gráfico pode ser movido, redimensionado e reconfigurado, e é possível construir gráficos novos à medida.

> ⚠️ **Dados:** os preços de referência nacionais vêm de valores publicados (fontes secundárias, ver [DADOS.md](DADOS.md)); **toda a operação da rede é simulada** (postos fictícios). Ligue a app aos sistemas da empresa antes de a usar em decisões.

| Login | Painel | Editar (mover/redimensionar) | Construtor de gráficos |
|---|---|---|---|
| ![Login](docs/screenshots/01-login.jpg) | ![Painel](docs/screenshots/02-painel.jpg) | ![Editar](docs/screenshots/03-editar.jpg) | ![Construtor](docs/screenshots/04-construtor.jpg) |

| Variação de stock | Equipamentos Petrotec | Detalhe de posto |
|---|---|---|
| ![Wetstock](docs/screenshots/05-wetstock.jpg) | ![Equipamentos](docs/screenshots/06-equipamentos.jpg) | ![Posto](docs/screenshots/07-posto.jpg) |

## Funcionalidades

- **Login** com perfis: administrador (toda a rede), gestor regional (só a sua região) e consulta (só leitura). Bloqueio temporário após 5 tentativas falhadas; sessão de 12 h.
- **Painéis personalizáveis** (3 predefinidos: Visão geral, Combustível e preços, Loja e operação; pode criar mais):
  - **Mover e redimensionar** gráficos (modo «Editar painel»: arrastar pela pega ⋮⋮ e pelo canto inferior direito; ou tamanhos rápidos Pequeno/Médio/Grande/Largura total). A disposição é guardada por utilizador e por tamanho de ecrã.
  - **Tipo de gráfico**: indicador (KPI), linhas, área, colunas, empilhado, barras (ranking), circular, anel, dispersão, mapa de calor, medidor e tabela.
  - **Escala**: linear, logarítmica, índice base 100, % do total; mínimo/máximo do eixo automático, zero ou valor fixo.
  - **Período**: 7/30/90 dias, mês, trimestre, ano atual, 12 meses, tudo ou datas à escolha — no painel inteiro ou só num gráfico; granularidade dia/semana/mês/trimestre; comparação com período anterior ou ano anterior; zoom temporal.
  - **Construtor de gráficos**: escolher métrica (22 indicadores), dimensão do eixo (tempo, posto, produto, região, tipologia, dia da semana, hora), desagregação em séries, filtros próprios, ordenação e nº de séries antes de agrupar em «Outros». Pré-visualização em tempo real.
  - Cada gráfico tem **vista de tabela** e vista **expandida**.
- **Postos**: lista com indicadores dos últimos 30 dias, alertas de tanques e equipamentos; detalhe com níveis dos tanques, bombas e ocorrências.
- **Equipamentos**: catálogo de modelos Petrotec — gama **Axon** (5000, 4000, 2000, 1000, LPG), gama **Progress** (5000 LH, 5000 HH, 4000, 3000, 2000, 1000 Retail, LPG) e EURO 2000 VI — com imagens oficiais, características e ligação à página do produto; parque instalado com estado, disponibilidade a 90 dias, totalizador e manutenções em atraso.
- **Dados**: explicação do que é real/simulado, tabela de fontes dos preços, e **importação de CSV** (formato português) para criar gráficos com os seus próprios dados — por exemplo, exportações do portal de preços da DGEG.
- Tema claro/escuro, interface em português, pensada para telemóvel (funciona também em tablet/desktop).

## Experimentar

Requisitos: Node.js 22.

```bash
cd fuel-hq
npm ci          # o .npmrc usa legacy-peer-deps (contorna um erro do npm com dependências opcionais do vitest)
npm run dev     # abre em http://localhost:5173
npm test        # testes unitários (motor de consulta, autenticação, CSV, escalas, layouts)
```

Contas de demonstração (também aparecem no ecrã de login):

| Utilizador | Palavra-passe | Perfil |
|---|---|---|
| `admin` | `HeadOffice#2026` | Administrador, toda a rede |
| `gestor.norte` | `Norte#2026` | Gestor regional (Norte) |
| `consulta` | `Consulta#2026` | Só leitura |

## Gerar a app Android (APK)

**Pelo GitHub Actions:** o workflow [`.github/workflows/fuel-hq-android.yml`](../.github/workflows/fuel-hq-android.yml) corre os testes, faz o build e gera o APK, disponível em «Artifacts» na página de cada execução:

- `hq-postos-apk` → `hq-postos-0.2.N.apk`, assinado com a **chave fixa** da app. Cada nova versão instala-se por cima da anterior e mantém os painéis e imagens guardados no telemóvel.
- `hq-postos-apk-chave-temporaria` → só aparece se o segredo da chave não estiver configurado; esse APK **não** se instala por cima de outras versões.

O número da versão (`0.2.N`) aumenta a cada compilação e aparece na app em **Conta → Sobre**.

### Instalar e atualizar no telemóvel

1. No telemóvel, com sessão iniciada no GitHub, abra a execução mais recente do workflow, desça até «Artifacts» e descarregue `hq-postos-apk` (um `.zip`).
2. Extraia o `.zip` (app «Ficheiros») e toque no `hq-postos-0.2.N.apk`.
3. Na primeira vez, autorize a instalação desta origem e, se o Play Protect avisar, escolha «Instalar mesmo assim».
4. Para atualizar, repita os passos com uma versão mais recente: o Android mostra «Atualizar» e mantém os dados.

Se tinha instalado uma versão anterior a esta configuração (ficheiro `app-debug.apk`), desinstale-a uma vez: foi assinada com outra chave.

### Chave de assinatura (segredo do GitHub)

A chave **não** está no repositório (que é público). Está no segredo `HQ_POSTOS_KEYSTORE` do repositório, em base64:

1. GitHub → repositório → **Settings → Secrets and variables → Actions → New repository secret**.
2. Nome: `HQ_POSTOS_KEYSTORE`. Valor: o conteúdo do ficheiro `HQ_POSTOS_KEYSTORE.txt` entregue com esta configuração.
3. Guarde uma cópia desse ficheiro num local seguro (por exemplo, um gestor de palavras-passe). Se a chave se perder, as versões novas deixam de se instalar por cima e é preciso desinstalar e reinstalar.

O workflow confirma que o APK foi assinado com a chave certa, comparando o certificado com [`android/signing-cert-sha256.txt`](android/signing-cert-sha256.txt) (dado público). Para trocar de chave, gere uma nova (`keytool -genkeypair -storetype PKCS12 -alias hqpostos -storepass hqpostos-teste -keypass hqpostos-teste …`), atualize o segredo e esse ficheiro. A palavra-passe e o alias estão no workflow e não são secretos: sem o ficheiro da chave não permitem assinar.

Esta é uma chave de **teste** para distribuição interna. Para publicar na Google Play é preciso um build *release* com a chave de publicação da empresa (não incluído).

### Compilar no computador

Precisa de JDK 21 e do Android SDK (plataforma 36), por exemplo via Android Studio. Sem as variáveis do CI, o APK local usa a chave de debug do computador e a versão 0.1.0.

```bash
cd fuel-hq
npm run cap:sync              # build web + copia para android/
npx cap open android          # abre no Android Studio (Run ▶ para um telemóvel ligado por USB)
# ou, só por linha de comandos:
cd android && ./gradlew assembleDebug   # APK em android/app/build/outputs/apk/debug/
```

A app é construída com **Capacitor** (React + TypeScript dentro de um WebView nativo). Não foi possível compilar o APK no ambiente onde o código foi escrito (o SDK Android não estava acessível); a compilação é feita e verificada pelo workflow de CI.

## Imagens dos equipamentos Petrotec

A app inclui as **imagens oficiais** de doze modelos, descarregadas de [petrotec.com](https://www.petrotec.com/product-category/fuel-dispensers) a 11/11/2026 e usadas com autorização da empresa. Estão em `public/equipment/` (WebP, ≈1000 px, 40–65 KB cada) e registadas em `public/equipment/manifest.json`:

| Modelo (id) | Ficheiro | Origem |
|---|---|---|
| Axon 5000 (`axon-5000`) | `axon-5000.webp` | imagem do produto na página de dispensadores |
| Axon 4000 (`axon-4000`) | `axon-4000.webp` | idem |
| Axon 2000 (`axon-2000`) | `axon-2000.webp` | idem |
| Axon 1000 (`axon-1000`) | `axon-1000.webp` | idem |
| Axon LPG (`axon-lpg`) | `axon-lpg.webp` | imagem do **Axon 2000 LPG**, usada pela Petrotec para a gama Axon LPG |
| Progress 5000 LH (`p5000-lh`) | `p5000-lh.webp` | idem |
| Progress 5000 HH (`p5000-hh`) | `p5000-hh.webp` | idem |
| Progress 4000 (`p4000`) | `p4000.webp` | idem |
| Progress 3000 (`p3000`) | `p3000.webp` | idem |
| Progress 2000 (`p2000`) | `p2000.webp` | idem |
| Progress 1000 Retail (`p1000r`) | `p1000r.webp` | idem |
| Progress LPG (`progress-lpg`) | `progress-lpg.webp` | imagem do **Progress 2000 LPG**, usada pela Petrotec para a gama Progress LPG |
| EURO 2000 VI (`euro2000-vi`) | — | modelo de geração anterior, já não listado no site; mostra uma ilustração genérica |

Para trocar ou acrescentar imagens:
1. **Para todos (distribuídas com a app):** coloque o ficheiro em `fuel-hq/public/equipment/` e associe-o ao id do modelo em `manifest.json` (campo `images`; o campo `captions` é opcional).
2. **Só num telemóvel:** em Equipamentos → modelo → «Alterar imagem do equipamento», tire/escolha uma fotografia ou indique um endereço `https://`. Esta imagem tem prioridade sobre a oficial nesse dispositivo.

## Passar para produção

- **Autenticação:** a autenticação incluída é **local e só para demonstração** (palavras-passe com PBKDF2 no código; qualquer verificação feita só no telemóvel pode ser contornada). Implemente a interface `AuthService` (`src/auth/authService.ts`) contra o fornecedor de identidade da empresa (ex.: OpenID Connect com PKCE) e valide permissões no servidor.
- **Dados reais:** substitua `simulate()` (`src/data/simulate.ts`) por uma chamada à API do back-office que devolva o mesmo formato `Dataset` (linhas diárias por posto × produto e por posto). Todo o resto (painéis, construtor, filtros) funciona sem alterações. Para preços oficiais, use a série da DGEG em vez dos pontos de `referencePrices.ts`.
- **Armazenamento:** painéis, imagens e CSV importados ficam no armazenamento local do WebView (por dispositivo). Para partilhar painéis entre utilizadores/dispositivos é preciso guardá-los no servidor.
- **Segurança de dependências:** `npm audit` reporta um aviso moderado (`uuid` via `@capacitor/cli` → `xcode`), usado apenas nas ferramentas de build para iOS; não entra na app Android.

## Estrutura

```
fuel-hq/
├── src/
│   ├── auth/            autenticação (interface + implementação local de demonstração)
│   ├── data/            catálogo (postos, produtos, modelos Petrotec), preços de referência,
│   │                    simulador, métricas, motor de consulta, importação CSV
│   ├── dashboard/       grelha arrastável (react-grid-layout), widgets, opções ECharts, construtor
│   ├── pages/           Login, Postos, Equipamentos, Dados, Conta
│   └── components/      ícones, folha modal, ilustrações
├── public/equipment/    imagens oficiais dos equipamentos (manifest.json)
├── android/             projeto nativo gerado pelo Capacitor
├── tests/               testes unitários (Vitest)
└── DADOS.md             fontes, pressupostos e o que é simulado
```

Bibliotecas principais: React 19, ECharts 6, react-grid-layout 2, Capacitor 8, Vite 8.

## Limitações conhecidas

- As ligações externas (fontes, páginas Petrotec) devem abrir no navegador do telemóvel; confirme o comportamento no seu dispositivo.
- O mapa de calor por hora usa perfis horários assumidos por tipologia (a simulação é diária).
- «Conversão pista → loja» é um rácio aproximado (ver DADOS.md).
- Semanas/meses incompletos nas pontas do período aparecem marcados com «*» e com cor mais clara nas colunas.

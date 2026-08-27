const pptxgen = require("pptxgenjs");
const path = require("path");
const IMG = path.join(__dirname, "img");
const OUT = process.argv[2] || path.join(__dirname, "dinossauros-3d.pptx");

const DARK = "0E1F1A", BONE = "F2F5EF", LIGHT = "F7F9F4";
const ACCENT = "E8712F", FERN = "5C8C4A", CLAY = "B0603A";
const MUTED_D = "9FB5A8";   // muted on dark
const MUTED_L = "5A6B61";   // muted on light
const H = "Cambria", B = "Calibri";

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE";          // 13.333 x 7.5
pres.author = "Claude Code";
pres.title = "Dinossauros — Os Gigantes do Mesozoico";

const shadow = (o = {}) => Object.assign(
  { type: "outer", color: "0E1F1A", blur: 14, offset: 3, angle: 90, opacity: 0.18 }, o);

/* ------------------------------------------------------------------ 1. capa */
const s1 = pres.addSlide();
s1.background = { color: DARK };
s1.addImage({ path: `${IMG}/trex3d.png`, x: 6.35, y: 1.55, w: 6.5, h: 4.53 });
s1.addText("MESOZOICO · 252 – 66 MILHÕES DE ANOS", {
  x: 0.9, y: 1.35, w: 5.8, h: 0.35, fontFace: B, fontSize: 11.5, bold: true,
  color: ACCENT, charSpacing: 3, isTextBox: true, margin: 0,
});
s1.addText("DINOSSAUROS", {
  x: 0.85, y: 1.75, w: 6.0, h: 1.3, fontFace: H, fontSize: 58, bold: true,
  color: BONE, isTextBox: true, margin: 0,
});
s1.addText("Os répteis que dominaram o planeta durante 165 milhões de anos — e o que os fósseis ainda nos contam sobre eles.", {
  x: 0.9, y: 3.15, w: 5.3, h: 1.1, fontFace: B, fontSize: 16, color: MUTED_D,
  lineSpacingMultiple: 1.25, valign: "top", isTextBox: true, margin: 0,
});
const stats1 = [
  ["165 M", "anos de domínio, do Triásico ao Cretácico"],
  ["+1 000", "espécies já descritas por paleontólogos"],
  ["11 000", "espécies vivas hoje: as aves"],
];
stats1.forEach(([n, l], i) => {
  const x = 0.9 + i * 1.95;
  s1.addText(n, { x, y: 4.75, w: 1.8, h: 0.5, fontFace: H, fontSize: 26, bold: true, color: ACCENT, isTextBox: true, margin: 0 });
  s1.addText(l, { x, y: 5.28, w: 1.75, h: 0.8, fontFace: B, fontSize: 10.5, color: MUTED_D, lineSpacingMultiple: 1.15, valign: "top", isTextBox: true, margin: 0 });
});
s1.addText("Tyrannosaurus rex · até 12 m de comprimento e 8 toneladas", {
  x: 6.5, y: 6.2, w: 6.2, h: 0.35, fontFace: B, fontSize: 11, italic: true,
  color: MUTED_D, isTextBox: true, margin: 0,
});
s1.addNotes("Apresentação em quatro andamentos: quem foram, quando viveram, que dimensões atingiram e como desapareceram. Todos os elementos visuais são renderizações 3D.");

/* --------------------------------------------------------------- 2. as eras */
const s2 = pres.addSlide();
s2.background = { color: LIGHT };
s2.addText("As Três Eras do Mesozoico", {
  x: 0.75, y: 0.5, w: 9.0, h: 0.7, fontFace: H, fontSize: 38, bold: true, color: DARK, isTextBox: true, margin: 0,
});
s2.addText("Cada camada de rocha guarda um capítulo da história — da primeira pegada ao último rugido.", {
  x: 0.78, y: 1.2, w: 8.5, h: 0.4, fontFace: B, fontSize: 14, color: MUTED_L, isTextBox: true, margin: 0,
});
const eras = [
  { img: "strata_tri", nome: "Triásico", per: "252 – 201 M.a.", cor: CLAY,
    txt: "Os primeiros dinossauros surgem no supercontinente Pangeia: pequenos, bípedes e velozes, como o Eoraptor. Partilham o mundo com répteis bem maiores." },
  { img: "strata_jur", nome: "Jurássico", per: "201 – 145 M.a.", cor: FERN,
    txt: "A era dos gigantes. Saurópodes como o Diplodocus ultrapassam os 26 metros e surgem as primeiras aves, entre elas o Archaeopteryx." },
  { img: "strata_cre", nome: "Cretácico", per: "145 – 66 M.a.", cor: ACCENT,
    txt: "Diversidade máxima: Tyrannosaurus, Triceratops e Velociraptor. As plantas com flor espalham-se e transformam as paisagens." },
];
eras.forEach((e, i) => {
  const x = 0.75 + i * 4.11;
  s2.addShape(pres.ShapeType.roundRect, {
    x, y: 1.95, w: 3.6, h: 4.75, rectRadius: 0.08,
    fill: { color: "FFFFFF" }, line: { type: "none" }, shadow: shadow(),
  });
  s2.addImage({ path: `${IMG}/${e.img}.png`, x: x + 0.3, y: 2.35, w: 2.3, h: 1.725 });
  s2.addText(e.nome, { x: x + 0.3, y: 4.25, w: 3.0, h: 0.45, fontFace: H, fontSize: 21, bold: true, color: DARK, isTextBox: true, margin: 0 });
  s2.addText(e.per, { x: x + 0.3, y: 4.72, w: 3.0, h: 0.3, fontFace: B, fontSize: 12, bold: true, color: e.cor, charSpacing: 1, isTextBox: true, margin: 0 });
  s2.addText(e.txt, { x: x + 0.3, y: 5.12, w: 3.0, h: 1.5, fontFace: B, fontSize: 12.5, color: MUTED_L, lineSpacingMultiple: 1.2, valign: "top", isTextBox: true, margin: 0 });
});
s2.addNotes("O bloco 3D de estratos repete-se nos três cartões: a camada realçada indica a posição de cada período na coluna geológica — o mais antigo em baixo.");

/* ---------------------------------------------------------- 3. os tamanhos */
const s3 = pres.addSlide();
s3.background = { color: "FFFFFF" };
s3.addText("Gigantes em Números", {
  x: 0.75, y: 0.5, w: 9.0, h: 0.7, fontFace: H, fontSize: 38, bold: true, color: DARK, isTextBox: true, margin: 0,
});
s3.addText("Comprimento estimado dos dinossauros mais conhecidos, em metros.", {
  x: 0.78, y: 1.2, w: 8.5, h: 0.4, fontFace: B, fontSize: 14, color: MUTED_L, isTextBox: true, margin: 0,
});
const stats3 = [
  ["≈ 70 t", "Massa estimada do Argentinosaurus — cerca de doze elefantes africanos."],
  ["3,5 t", "Força da mordida do T. rex, a mais potente já medida num animal terrestre."],
  ["≈ 40 km/h", "Velocidade de ponta calculada para um T. rex adulto em corrida."],
];
stats3.forEach(([n, l], i) => {
  const y = 1.95 + i * 1.65;
  s3.addText(n, { x: 0.78, y, w: 3.4, h: 0.6, fontFace: H, fontSize: 34, bold: true, color: ACCENT, isTextBox: true, margin: 0 });
  s3.addText(l, { x: 0.8, y: y + 0.62, w: 3.2, h: 0.9, fontFace: B, fontSize: 12, color: MUTED_L, lineSpacingMultiple: 1.2, valign: "top", isTextBox: true, margin: 0 });
});
s3.addChart(pres.ChartType.bar3d, [{
  name: "Comprimento (m)",
  labels: ["Argentinosaurus", "Diplodocus", "Spinosaurus", "Tyrannosaurus", "Triceratops", "Velociraptor"],
  values: [37, 26, 15, 12, 9, 2],
}], {
  x: 4.5, y: 1.7, w: 8.1, h: 4.9,
  barDir: "bar", bar3DShape: "box", barGapWidthPct: 55,
  chartColors: [ACCENT],
  showTitle: false, showLegend: false,
  showValue: true, dataLabelPosition: "outEnd", dataLabelFormatCode: '0" m"',
  dataLabelFontFace: B, dataLabelFontSize: 12, dataLabelColor: DARK,
  catAxisLabelFontFace: B, catAxisLabelFontSize: 12, catAxisLabelColor: DARK,
  valAxisLabelFontFace: B, valAxisLabelFontSize: 10, valAxisLabelColor: MUTED_L,
  valAxisMinVal: 0, valAxisMaxVal: 40, valAxisMajorUnit: 10, valGridLine: { color: "E4E8E0", size: 1 }, catGridLine: { style: "none" },
  v3DRotX: 12, v3DRotY: 20, v3DRAngAx: true,
});
s3.addText("Estimativas médias da literatura paleontológica; os valores variam consoante o exemplar e o estudo.", {
  x: 0.78, y: 6.85, w: 11.8, h: 0.35, fontFace: B, fontSize: 10, italic: true, color: MUTED_L, isTextBox: true, margin: 0,
});
s3.addNotes("As barras são um gráfico 3D nativo do PowerPoint — os valores podem ser editados diretamente nos dados do gráfico.");

/* ------------------------------------------------------------- 4. extinção */
const s4 = pres.addSlide();
s4.background = { color: DARK };
s4.addImage({ path: `${IMG}/asteroid3d.png`, x: 7.5, y: 1.5, w: 4.9, h: 4.9 });
s4.addText("O Fim de uma Era", {
  x: 0.75, y: 0.75, w: 6.2, h: 0.75, fontFace: H, fontSize: 40, bold: true, color: BONE, isTextBox: true, margin: 0,
});
s4.addText("Há 66 milhões de anos um asteroide com 10 a 15 km de diâmetro embateu na península de Iucatã, no atual México, e abriu a cratera de Chicxulub — 180 km de bordo a bordo.", {
  x: 0.78, y: 1.62, w: 5.7, h: 1.2, fontFace: B, fontSize: 14.5, color: MUTED_D, lineSpacingMultiple: 1.25, valign: "top", isTextBox: true, margin: 0,
});
const passos = [
  ["1", "O impacto", "Libertou energia equivalente a milhares de milhões de bombas atómicas."],
  ["2", "O inverno de impacto", "Poeira e sulfatos taparam o Sol durante anos e a fotossíntese colapsou."],
  ["3", "A extinção", "Cerca de 75 % das espécies desapareceram, entre elas todos os dinossauros não-avianos."],
];
passos.forEach(([n, t, d], i) => {
  const y = 3.05 + i * 1.12;
  s4.addShape(pres.ShapeType.ellipse, { x: 0.78, y, w: 0.46, h: 0.46, fill: { color: ACCENT }, line: { type: "none" } });
  s4.addText(n, { x: 0.78, y, w: 0.46, h: 0.46, fontFace: B, fontSize: 14, bold: true, color: "FFFFFF", align: "center", valign: "middle", isTextBox: true, margin: 0 });
  s4.addText(t, { x: 1.45, y: y - 0.04, w: 5.0, h: 0.32, fontFace: B, fontSize: 14.5, bold: true, color: BONE, isTextBox: true, margin: 0 });
  s4.addText(d, { x: 1.45, y: y + 0.32, w: 5.0, h: 0.62, fontFace: B, fontSize: 12, color: MUTED_D, lineSpacingMultiple: 1.15, valign: "top", isTextBox: true, margin: 0 });
});
s4.addText("Nem todos partiram: as 11 000 espécies de aves que hoje voam sobre nós são dinossauros.", {
  x: 0.78, y: 6.5, w: 6.0, h: 0.6, fontFace: H, fontSize: 14, italic: true, bold: true, color: ACCENT, lineSpacingMultiple: 1.15, isTextBox: true, margin: 0,
});
s4.addNotes("Fechar ligando o passado ao presente: a linhagem dos terópodes sobreviveu no grupo das aves.");

pres.writeFile({ fileName: OUT }).then(() => console.log("escrito:", OUT));

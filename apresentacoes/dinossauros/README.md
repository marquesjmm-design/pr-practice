# Dinossauros — apresentação (4 slides)

`dinossauros-3d.pptx` — deck 16:9 em português, com elementos visuais 3D:

| Slide | Conteúdo | Elemento 3D |
|---|---|---|
| 1 | Capa e números-chave | *Tyrannosaurus rex* em silhueta extrudida |
| 2 | As três eras do Mesozoico | Blocos de estratos geológicos em isometria |
| 3 | Gigantes em números | Gráfico de barras 3D nativo do PowerPoint |
| 4 | A extinção do Cretácico | Asteroide com craterização, iluminado por *ray casting* |

## Reproduzir

As imagens 3D são geradas por código, não são stock:

```bash
python3 fontes/gen_images.py     # escreve fontes/img/*.png (matplotlib + numpy)
npm install pptxgenjs
node fontes/make_deck.js dinossauros-3d.pptx
```

`gen_images.py` projeta os volumes manualmente (projeção oblíqua com varrimento
de fatias para a extrusão; sombreamento por produto escalar normal-luz para o
asteroide). `make_deck.js` monta o deck com pptxgenjs.

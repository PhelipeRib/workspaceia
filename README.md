# STARTUP HQ — Gather Pixel Office v2

## O que mudou
- Sprites individuais extraídos do atlas original, em PNG com transparência.
- Contorno pixel-art mais forte aplicado aos objetos.
- Personagens possuem 4 frames de idle/walk por direção.
- Idle tem breathing/bobbing sutil.
- Walk alterna frames a cada ~105 ms.
- Movimento horizontal usa espelhamento; vertical usa sprites front/back.
- Objetos deixaram de ser desenhados por grandes recortes do atlas, evitando retângulos grosseiros.
- `sprite_manifest.json` descreve os assets para uso por outras IAs e pelo frontend.
- `app.js` contém o motor do mapa, câmera, animação, interação e chat.

## Estrutura
```text
index.html
app.js
sprite_manifest.json
assets/
  characters/
  furniture/
  office/
  nature/
  tiles/
```

## Execução
Sirva a pasta por HTTP local (por exemplo, Live Server/Vite). O `fetch()` do manifest
não funciona corretamente quando o arquivo é aberto diretamente via `file://` em alguns browsers.

## Renderização
- Canvas 2D
- `imageSmoothingEnabled = false`
- imagens PNG
- nearest-neighbor/pixelated
- coordenadas inteiras
- sprites separados com alpha

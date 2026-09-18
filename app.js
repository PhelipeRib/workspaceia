// Remove o fundo preto do spritesheet uma única vez na memória para não travar o jogo
const processedCache = new Map();

function getCleanImage(im) {
  if (!im || !im.complete || !im.naturalWidth) return null;
  if (processedCache.has(im.src)) return processedCache.get(im.src);

  const canvasTemp = document.createElement('canvas');
  canvasTemp.width = im.naturalWidth;
  canvasTemp.height = im.naturalHeight;
  const tCtx = canvasTemp.getContext('2d');
  tCtx.drawImage(im, 0, 0);

  try {
    const imgData = tCtx.getImageData(0, 0, canvasTemp.width, canvasTemp.height);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i] < 30 && data[i + 1] < 30 && data[i + 2] < 30) {
        data[i + 3] = 0; // Torna o fundo preto transparente
      }
    }
    tCtx.putImageData(imgData, 0, 0);
    processedCache.set(im.src, canvasTemp);
    return canvasTemp;
  } catch (e) {
    return im; // Fallback caso ocorra restrição de CORS local
  }
}

function drawAsset(id, x, y, scale = 1, anchor = .5) {
  const a = atlasAssets[id];
  const rawIm = img(a?.file || 'sprites.png');
  const im = getCleanImage(rawIm);
  if (!im) return;

  // Se o objeto no manifest definir coordenadas no spritesheet (x, y, w, h), ele fatia aqui
  const sx = a?.sx || 0, sy = a?.sy || 0;
  const sw = a?.w || im.width, sh = a?.h || im.height;
  const dw = sw * scale, dh = sh * scale;

  ctx.drawImage(im, sx, sy, sw, sh, Math.round(x - dw * anchor), Math.round(y - dh), Math.round(dw), Math.round(dh));
}

function drawCharacter(a, x, y, moving) {
  const c = characterAssets[a.character] || characterAssets.char_01;
  const dir = a.direction === 'up' ? 'up' : 'down';
  const frames = c?.[dir] || ['sprites.png'];
  
  const src = frames[0];
  const rawIm = img(src);
  const im = getCleanImage(rawIm);
  if (!im) return;

  // Posição base do personagem na imagem (Fatia de 32x32px)
  const sw = 32, sh = 32;
  const scale = 1.3;

  shadow(x, y + 2, 14);

  ctx.save();
  if (a.direction === 'left') {
    ctx.translate(Math.round(x), Math.round(y));
    ctx.scale(-1, 1);
    ctx.drawImage(im, 0, 0, sw, sh, Math.round(-sw * scale / 2), Math.round(-sh * scale), Math.round(sw * scale), Math.round(sh * scale));
  } else {
    ctx.drawImage(im, 0, 0, sw, sh, Math.round(x - sw * scale / 2), Math.round(y - sh * scale), Math.round(sw * scale), Math.round(sh * scale));
  }
  ctx.restore();
}

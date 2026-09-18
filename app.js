// Desenha os móveis e objetos removendo o fundo preto automaticamente
function drawAsset(id, x, y, scale = 1, anchor = .5) {
  const a = atlasAssets[id];
  const im = img(a?.file || (id + '.png'));
  if (!im || !im.complete || !im.naturalWidth) return;

  const w = (a?.w || im.naturalWidth) * scale;
  const h = (a?.h || im.naturalHeight) * scale;

  // Canvas temporário para remover o pixel preto
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = im.naturalWidth;
  tempCanvas.height = im.naturalHeight;
  const tCtx = tempCanvas.getContext('2d');
  tCtx.drawImage(im, 0, 0);

  const imgData = tCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
  const data = imgData.data;

  // Filtro de Transparência: Transforma RGB escuro (RGB < 25) em transparente
  for (let i = 0; i < data.length; i += 4) {
    if (data[i] < 25 && data[i + 1] < 25 && data[i + 2] < 25) {
      data[i + 3] = 0;
    }
  }
  tCtx.putImageData(imgData, 0, 0);

  ctx.drawImage(tempCanvas, Math.round(x - w * anchor), Math.round(y - h), Math.round(w), Math.round(h));
}

// Desenha os personagens e agentes removendo o fundo preto e espelhando
function drawCharacter(a, x, y, moving) {
  const c = characterAssets[a.character] || characterAssets.char_01;
  const dir = a.direction === 'up' ? 'up' : 'down';
  const frames = c?.[dir] || [`${a.character}_down_1.png`];
  
  const frameIdx = moving ? Math.floor(walkClock / 120) % frames.length : 0;
  const src = frames[frameIdx];
  const im = img(src);

  if (!im || !im.complete || !im.naturalWidth) return;

  const nw = im.naturalWidth;
  const nh = im.naturalHeight;
  const scale = 1.2;

  shadow(x, y + 2, 14);

  // Processa a transparência do personagem
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = nw;
  tempCanvas.height = nh;
  const tCtx = tempCanvas.getContext('2d');
  tCtx.drawImage(im, 0, 0);

  const imgData = tCtx.getImageData(0, 0, nw, nh);
  const data = imgData.data;

  for (let i = 0; i < data.length; i += 4) {
    if (data[i] < 25 && data[i + 1] < 25 && data[i + 2] < 25) {
      data[i + 3] = 0;
    }
  }
  tCtx.putImageData(imgData, 0, 0);

  ctx.save();
  if (a.direction === 'left') {
    ctx.translate(Math.round(x), Math.round(y));
    ctx.scale(-1, 1);
    ctx.drawImage(tempCanvas, Math.round(-nw * scale / 2), Math.round(-nh * scale), Math.round(nw * scale), Math.round(nh * scale));
  } else {
    ctx.drawImage(tempCanvas, Math.round(x - nw * scale / 2), Math.round(y - nh * scale), Math.round(nw * scale), Math.round(nh * scale));
  }
  ctx.restore();
}

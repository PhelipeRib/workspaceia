const $ = id => document.getElementById(id);
const canvas = $('officeCanvas'), ctx = canvas ? canvas.getContext('2d', { alpha: false }) : null;
if (ctx) ctx.imageSmoothingEnabled = false;

const WORLD = { w: 1800, h: 1080 };
const PLAYER_RADIUS = 13;
let camera = { x: 0, y: 0 }, keys = {}, activeAgent = null, last = performance.now(), walkClock = 0, idleClock = 0;
let atlasAssets = {}, characterAssets = {}, sceneObjects = [], staticColliders = [];

let settings = JSON.parse(localStorage.getItem('startup_hq_settings') || '{"aiMode":"custom-webhook","webhookUrl":"https://workspaceia.onrender.com/agent-chat","apiKey":""}');

const DEFAULT = [
  { id: 'dev', name: 'Rafacaco', role: 'Tech Lead / Dev', short: 'Tech Lead', desc: 'Análise de código, Pull Requests, WeAction API e integrações.', character: 'char_01', direction: 'down', x: 680, y: 335, status: 'Ocioso', skills: ['Review de PR', 'Consultar WeAction API', 'Setup Gupshup/COEX', 'Debug Endpoint'], history: [{ sender: 'agent', text: 'E aí! Sou o Rafacaco, seu Tech Lead.' }] },
  { id: 'pm', name: 'Maycaco', role: 'Product Owner', short: 'Product', desc: 'Requisitos de Kick-Off, estórias de usuário e bots Node-RED.', character: 'char_04', direction: 'down', x: 850, y: 335, status: 'Ocioso', skills: ['User Stories', 'Forms Kick-Off', 'Node-RED Bot', 'Priorizar Backlog'], history: [{ sender: 'agent', text: 'Oi! Maycaco na área.' }] },
  { id: 'cx', name: 'Amandacaco', role: 'CX & Product Analytics', short: 'CX', desc: 'Retenção, relatórios de SLA, CSAT e métricas do cliente.', character: 'char_02', direction: 'down', x: 1325, y: 670, status: 'Ocioso', skills: ['Relatório NPS', 'Análise de Churn', 'Métricas SLA', 'Logs de Atendimento'], history: [{ sender: 'agent', text: 'Olá! Amandacaco por aqui.' }] },
  { id: 'arch', name: 'Phemonkey', role: 'Arquitetos & Estratégia', short: 'Strategy', desc: 'Arquitetura de soluções, Business Plan e formulários estratégicos.', character: 'char_04', direction: 'down', x: 355, y: 650, status: 'Ocioso', skills: ['Business Plan', 'Kick-Off Inicial', 'Desenho de BD', 'Plano Cloud'], history: [{ sender: 'agent', text: 'Fala mestre! Phemonkey no comando.' }] }
];

let agents = DEFAULT;
let player = { x: 700, y: 560, targetX: 700, targetY: 560, speed: 220, direction: 'down', moving: false, character: 'char_02' };

const doors = [
  { id: 'door-lounge', x: 510, y: 270, w: 16, h: 74, axis: 'v', open: 0, target: 0 },
  { id: 'door-game', x: 510, y: 665, w: 16, h: 74, axis: 'v', open: 0, target: 0 },
  { id: 'door-product', x: 805, y: 470, w: 74, h: 16, axis: 'h', open: 0, target: 0 },
  { id: 'door-right', x: 1323, y: 470, w: 74, h: 16, axis: 'h', open: 0, target: 0 }
];

async function loadJSON() {
  try {
    const r = await fetch('sprite_manifest.json?v=' + Date.now());
    if (r.ok) {
      const m = await r.json();
      atlasAssets = m.assets || {};
      characterAssets = m.characters || {};
    }
  } catch (e) {
    console.warn('Fallback JSON:', e);
  }
  buildScene();
}

const imageCache = new Map();
function img(path) {
  if (!path) return null;
  if (!imageCache.has(path)) { const im = new Image(); im.src = path; imageCache.set(path, im); }
  return imageCache.get(path);
}

function resize() {
  if (!canvas) return;
  const r = canvas.getBoundingClientRect();
  const d = Math.min(devicePixelRatio || 1, 2);
  canvas.width = Math.floor(r.width * d);
  canvas.height = Math.floor(r.height * d);
  if (ctx) { ctx.setTransform(d, 0, 0, d, 0, 0); ctx.imageSmoothingEnabled = false; }
}
addEventListener('resize', resize);

function drawAsset(id, x, y, scale = 1, anchor = .5) {
  const a = atlasAssets[id]; if (!a) return;
  const im = img(a.file); if (!im || !im.complete || !im.naturalWidth) return;
  const w = (a.w || im.naturalWidth) * scale, h = (a.h || im.naturalHeight) * scale;
  ctx.drawImage(im, Math.round(x - w * anchor), Math.round(y - h), Math.round(w), Math.round(h));
}

function addObject(id, x, y, scale = 1, anchor = .5) {
  sceneObjects.push({ id, x, y, scale, anchor });
}

function shadow(x, y, w = 28) {
  if (!ctx) return;
  ctx.save();
  ctx.globalAlpha = .22;
  ctx.fillStyle = '#101722';
  ctx.beginPath();
  ctx.ellipse(x, y, w, Math.max(3, w * .22), 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawCharacter(a, x, y, moving) {
  const c = characterAssets[a.character];
  const src = c?.down?.[0] || (a.character + '_down_0.png');
  const im = img(src);
  if (!im || !im.complete || !im.naturalWidth) return;

  const nw = im.naturalWidth, nh = im.naturalHeight;
  shadow(x, y + 3, 16);

  ctx.save();
  if (a.direction === 'left') {
    ctx.translate(Math.round(x), Math.round(y));
    ctx.scale(-1, 1);
    ctx.drawImage(im, Math.round(-nw / 2), Math.round(-nh), nw, nh);
  } else {
    ctx.drawImage(im, Math.round(x - nw / 2), Math.round(y - nh), nw, nh);
  }
  ctx.restore();
}

function label(t, x, y) {
  ctx.save();
  ctx.fillStyle = '#3a1e05';
  ctx.beginPath();
  ctx.roundRect(x - 55, y - 12, 110, 24, 4);
  ctx.fill();
  ctx.strokeStyle = '#8b5a2b';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#fff1d6';
  ctx.font = '9px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(t, x, y + 4);
  ctx.restore();
}

function nameBadge(a, x, y) {
  ctx.save();
  ctx.font = 'bold 10px sans-serif';
  const txt = `${a.name} · ${a.short || a.role}`;
  const tw = ctx.measureText(txt).width + 25;
  ctx.fillStyle = '#3a1e05';
  ctx.beginPath();
  ctx.roundRect(x - tw / 2, y - 18, tw, 19, 4);
  ctx.fill();
  ctx.strokeStyle = '#8b5a2b';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = '#35d486';
  ctx.beginPath();
  ctx.arc(x - tw / 2 + 9, y - 8.5, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff1d6';
  ctx.textAlign = 'left';
  ctx.fillText(txt, x - tw / 2 + 16, y - 5);
  ctx.restore();
}

function tileFloor(x, y, w, h, tile = 'floor_beige') {
  const a = atlasAssets[tile];
  const im = img(a?.file || (tile + '.png'));
  if (!im || !im.complete || !im.naturalWidth) {
    ctx.fillStyle = '#3d2817';
    ctx.fillRect(x, y, w, h);
    return;
  }
  const tw = im.naturalWidth || 32, th = im.naturalHeight || 32;
  for (let yy = y; yy < y + h; yy += th) {
    for (let xx = x; xx < x + w; xx += tw) {
      ctx.drawImage(im, xx, yy, Math.min(tw, x + w - xx), Math.min(th, y + h - yy));
    }
  }
}

const walls = [
  { x: 150, y: 90, w: 1480, h: 10 }, { x: 150, y: 980, w: 1480, h: 10 }, { x: 150, y: 90, w: 10, h: 900 }, { x: 1620, y: 90, w: 10, h: 900 },
  { x: 515, y: 115, w: 10, h: 155 }, { x: 515, y: 344, w: 10, h: 321 }, { x: 515, y: 739, w: 10, h: 226 },
  { x: 1090, y: 115, w: 10, h: 210 }, { x: 1090, y: 385, w: 10, h: 280 }, { x: 1090, y: 725, w: 10, h: 240 },
  { x: 175, y: 480, w: 335, h: 10 }, { x: 555, y: 480, w: 250, h: 10 }, { x: 879, y: 480, w: 211, h: 10 },
  { x: 1115, y: 480, w: 208, h: 10 }, { x: 1397, y: 480, w: 213, h: 10 }
];

function buildScene() {
  sceneObjects = [];
  addObject('sofa_blue', 250, 205); addObject('sofa_orange', 285, 365); addObject('coffee_table_round', 370, 285); addObject('plant_large', 475, 190);
  [[635, 245], [820, 245], [635, 385], [820, 385], [635, 565], [820, 565], [635, 705], [820, 705]].forEach(p => addObject('desk_single', p[0], p[1]));
  [[1190, 585], [1370, 585], [1190, 735], [1370, 735]].forEach(p => addObject('desk_single', p[0], p[1]));
}

function drawWorld() {
  if (!ctx) return;
  const W = canvas.clientWidth || 800, H = canvas.clientHeight || 600;
  ctx.clearRect(0, 0, W, H);

  camera.x = Math.max(0, Math.min(WORLD.w - W, player.x - W / 2));
  camera.y = Math.max(0, Math.min(WORLD.h - H, player.y - H / 2));

  ctx.save();
  ctx.translate(-camera.x, -camera.y);

  ctx.fillStyle = '#5c8b43';
  ctx.fillRect(0, 0, WORLD.w, WORLD.h);

  tileFloor(150, 90, 1480, 900, 'floor_beige');
  tileFloor(175, 115, 335, 360, 'floor_purple');
  tileFloor(175, 505, 335, 460, 'floor_gray');
  tileFloor(1115, 505, 495, 460, 'floor_gray');

  walls.forEach(w => {
    ctx.fillStyle = '#3a1e05';
    ctx.fillRect(w.x, w.y, w.w, w.h);
  });

  label('LOUNGE', 342, 140);
  label('PRODUCT TEAM', 822, 140);
  label('MEETING', 1360, 140);
  label('GAME ROOM', 342, 530);
  label('DEV / OPS', 822, 530);
  label('CX TEAM', 1360, 530);

  const drawables = [
    ...sceneObjects.map(o => ({ y: o.y, fn: () => drawAsset(o.id, o.x, o.y, o.scale, o.anchor) })),
    ...agents.map(a => ({ y: a.y, fn: () => { drawCharacter(a, a.x, a.y, a.moving); nameBadge(a, a.x, a.y - 65); } })),
    { y: player.y, fn: () => { drawCharacter({ character: player.character, direction: player.direction }, player.x, player.y, player.moving); nameBadge({ name: 'MACACO MESTRE', short: 'CEO' }, player.x, player.y - 65); } }
  ].sort((a, b) => a.y - b.y);

  drawables.forEach(d => d.fn());
  ctx.restore();
}

function movement(dt) {
  let dx = 0, dy = 0;
  if (keys.w || keys.arrowup) dy--; if (keys.s || keys.arrowdown) dy++; if (keys.a || keys.arrowleft) dx--; if (keys.d || keys.arrowright) dx++;
  if (dx || dy) {
    player.moving = true; const n = Math.hypot(dx, dy) || 1; dx /= n; dy /= n;
    if (Math.abs(dx) > Math.abs(dy)) player.direction = dx < 0 ? 'left' : 'right'; else player.direction = dy < 0 ? 'up' : 'down';
    player.x = Math.max(165, Math.min(1615, player.x + dx * player.speed * dt));
    player.y = Math.max(105, Math.min(975, player.y + dy * player.speed * dt));
  } else player.moving = false;
}

function animate(now) {
  const dt = Math.min((now - last) / 1000, .05); last = now;
  movement(dt);
  drawWorld();
  requestAnimationFrame(animate);
}

addEventListener('keydown', e => { keys[e.key.toLowerCase()] = true; });
addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });

async function init() {
  resize();
  await loadJSON();
  requestAnimationFrame(animate);
}

init();

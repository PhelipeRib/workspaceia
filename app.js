const $ = id => document.getElementById(id);
const canvas = $('officeCanvas'), ctx = canvas ? canvas.getContext('2d', { alpha: false }) : null;
if (ctx) ctx.imageSmoothingEnabled = false;

const WORLD = { w: 1800, h: 1080 };
const PLAYER_RADIUS = 13;
let camera = { x: 0, y: 0 }, keys = {}, activeAgent = null, last = performance.now(), walkClock = 0, idleClock = 0;
let atlasAssets = {}, characterAssets = {}, sceneObjects = [], staticColliders = [];

let settings = JSON.parse(localStorage.getItem('startup_hq_settings') || '{"aiMode":"custom-webhook","webhookUrl":"https://workspaceia.onrender.com/agent-chat","apiKey":""}');
if (!settings.webhookUrl || settings.webhookUrl.includes('ngrok')) {
  settings.webhookUrl = 'https://workspaceia.onrender.com/agent-chat';
  settings.aiMode = 'custom-webhook';
}

const DEFAULT = [
  { id: 'dev', name: 'Rafacaco', role: 'Tech Lead / Dev', short: 'Tech Lead', desc: 'Análise de código, Pull Requests, WeAction API e integrações.', character: 'char_01', direction: 'down', x: 680, y: 335, status: 'Ocioso', skills: ['Review de PR', 'Consultar WeAction API', 'Setup Gupshup/COEX', 'Debug Endpoint'], history: [{ sender: 'agent', text: 'E aí! Sou o Rafacaco, seu Tech Lead. Bora revisar código ou olhar as APIs da WeON?' }] },
  { id: 'pm', name: 'Maycaco', role: 'Product Owner', short: 'Product', desc: 'Requisitos de Kick-Off, estórias de usuário e bots Node-RED.', character: 'char_04', direction: 'down', x: 850, y: 335, status: 'Ocioso', skills: ['User Stories', 'Forms Kick-Off', 'Node-RED Bot', 'Priorizar Backlog'], history: [{ sender: 'agent', text: 'Oi! Maycaco na área. Pronta para mapear o Kick-off e alinhar requisitos de produto.' }] },
  { id: 'cx', name: 'Amandacaco', role: 'CX & Product Analytics', short: 'CX', desc: 'Retenção, relatórios de SLA, CSAT e métricas do cliente.', character: 'char_02', direction: 'down', x: 1325, y: 670, status: 'Ocioso', skills: ['Relatório NPS', 'Análise de Churn', 'Métricas SLA', 'Logs de Atendimento'], history: [{ sender: 'agent', text: 'Olá! Amandacaco por aqui. Monitorando os indicadores de atendimento da WeON.' }] },
  { id: 'arch', name: 'Phemonkey', role: 'Arquitetos & Estratégia', short: 'Strategy', desc: 'Arquitetura de soluções, Business Plan e formulários estratégicos.', character: 'char_04', direction: 'down', x: 355, y: 650, status: 'Ocioso', skills: ['Business Plan', 'Kick-Off Inicial', 'Desenho de BD', 'Plano Cloud'], history: [{ sender: 'agent', text: 'Fala mestre! Phemonkey no comando da estratégia e arquitetura de negócios.' }] }
];

let agents = JSON.parse(localStorage.getItem('startup_hq_agents') || 'null') || DEFAULT;
for (const d of DEFAULT) {
  const a = agents.find(x => x.id === d.id);
  if (a) { a.character = d.character; a.direction = a.direction || 'down'; a.name = d.name; a.role = d.role; }
}

let player = { x: 700, y: 560, targetX: 700, targetY: 560, speed: 220, direction: 'down', moving: false, character: 'char_02' };

const doors = [
  { id: 'door-lounge', x: 510, y: 270, w: 16, h: 74, axis: 'v', open: 0, target: 0, label: 'Lounge' },
  { id: 'door-game', x: 510, y: 665, w: 16, h: 74, axis: 'v', open: 0, target: 0, label: 'Game Room' },
  { id: 'door-product', x: 805, y: 470, w: 74, h: 16, axis: 'h', open: 0, target: 0, label: 'Product / Dev' },
  { id: 'door-right', x: 1323, y: 470, w: 74, h: 16, axis: 'h', open: 0, target: 0, label: 'Meeting / CX' }
];

async function loadJSON() {
  try {
    const r = await fetch('sprite_manifest.json?v=4');
    const m = await r.json();
    atlasAssets = m.assets || {};
    characterAssets = m.characters || {};
    buildScene();
  } catch (e) {
    console.warn('Erro manifest:', e);
  }
}

const imageCache = new Map();
function img(path) {
  if (!imageCache.has(path)) { const im = new Image(); im.decoding = 'async'; im.src = path; imageCache.set(path, im); }
  return imageCache.get(path);
}

function preload() {
  Object.values(atlasAssets).forEach(a => img(a.file));
  Object.values(characterAssets).forEach(c => ['down', 'up'].forEach(d => (c[d] || []).forEach(f => img(f))));
}

function resize() {
  if (!canvas) return;
  const r = canvas.getBoundingClientRect();
  const d = Math.min(devicePixelRatio || 1, 2);
  canvas.width = Math.floor(r.width * d);
  canvas.height = Math.floor(r.height * d);
  if (ctx) {
    ctx.setTransform(d, 0, 0, d, 0, 0);
    ctx.imageSmoothingEnabled = false;
  }
}
addEventListener('resize', resize);

function drawAsset(id, x, y, scale = 1, anchor = .5) {
  const a = atlasAssets[id]; if (!a) return;
  const im = img(a.file); if (!im.complete || !im.naturalWidth) return;
  const w = a.w * scale, h = a.h * scale;
  ctx.drawImage(im, Math.round(x - w * anchor), Math.round(y - h), Math.round(w), Math.round(h));
}

function addObject(id, x, y, scale = 1, anchor = .5, interactive = null) {
  const a = atlasAssets[id]; if (!a) return;
  const w = a.w * scale, h = a.h * scale, left = x - w * anchor, top = y - h;
  sceneObjects.push({ id, x, y, scale, anchor, interactive });
  if (a.collision) {
    const c = a.collision;
    staticColliders.push({ x: left + c.x * scale, y: top + c.y * scale, w: c.w * scale, h: c.h * scale, type: 'object', id });
  }
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

function characterFrame(a, moving) {
  const c = characterAssets[a.character] || characterAssets.char_01;
  let dir = a.direction || 'down';
  let frameDir = (dir === 'up') ? 'up' : 'down';
  let frames = c?.[frameDir] || [];
  if (!frames.length) return null;
  const idx = moving ? Math.floor(walkClock / 125) % frames.length : 0;
  return img(frames[idx]);
}

function drawCharacter(a, x, y, moving) {
  const im = characterFrame(a, moving); if (!im || !im.complete || !im.naturalWidth) return;
  const dir = a.direction || 'down', s = 1.08;
  const idleBob = moving ? 0 : Math.sin(idleClock / 650 * Math.PI * 2) * .8;
  const walkBob = moving ? Math.abs(Math.sin(walkClock / 125 * Math.PI)) * .8 : 0;
  const bob = idleBob - walkBob;
  shadow(x, y + 3, 16);
  ctx.save();
  if (dir === 'left' || dir === 'right') {
    ctx.translate(Math.round(x), Math.round(y + bob));
    if (dir === 'left') ctx.scale(-1, 1);
    ctx.drawImage(im, Math.round(-im.width * s / 2), Math.round(-im.height * s), Math.round(im.width * s), Math.round(im.height * s));
  } else {
    ctx.drawImage(im, Math.round(x - im.width * s / 2), Math.round(y - im.height * s + bob), Math.round(im.width * s), Math.round(im.height * s));
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
  ctx.font = '9px "Press Start 2P", cursive';
  ctx.textAlign = 'center';
  ctx.fillText(t, x, y + 4);
  ctx.restore();
}

function nameBadge(a, x, y) {
  ctx.save();
  ctx.font = '700 10px Arial';
  const txt = `${a.name} · ${a.short || a.role}`;
  const tw = ctx.measureText(txt).width + 25;
  ctx.fillStyle = '#3a1e05';
  ctx.beginPath();
  ctx.roundRect(x - tw / 2, y - 18, tw, 19, 4);
  ctx.fill();
  ctx.strokeStyle = '#8b5a2b';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = a.status === 'Executando...' ? '#ffb13b' : '#35d486';
  ctx.beginPath();
  ctx.arc(x - tw / 2 + 9, y - 8.5, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff1d6';
  ctx.textAlign = 'left';
  ctx.fillText(txt, x - tw / 2 + 16, y - 5);
  ctx.restore();
}

function tileFloor(x, y, w, h, tile = 'floor_beige') {
  const a = atlasAssets[tile]; if (!a) return;
  const im = img(a.file), tw = a.w, th = a.h; if (!im.complete || !im.naturalWidth) return;
  for (let yy = y; yy < y + h; yy += th) {
    for (let xx = x; xx < x + w; xx += tw) {
      ctx.drawImage(im, xx, yy, Math.min(tw, x + w - xx), Math.min(th, y + h - yy));
    }
  }
}

function wallRect(x, y, w, h, draw = true) {
  if (draw) {
    ctx.fillStyle = '#3a1e05';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#5a3921';
    if (w > h) ctx.fillRect(x, y, w, 3); else ctx.fillRect(x, y, 3, h);
  }
}

function drawRoom(x, y, w, h, tile = 'floor_beige') {
  tileFloor(x, y, w, h, tile);
}

const walls = [
  { x: 150, y: 90, w: 1480, h: 10 }, { x: 150, y: 980, w: 1480, h: 10 }, { x: 150, y: 90, w: 10, h: 900 }, { x: 1620, y: 90, w: 10, h: 900 },
  { x: 515, y: 115, w: 10, h: 155 }, { x: 515, y: 344, w: 10, h: 321 }, { x: 515, y: 739, w: 10, h: 226 },
  { x: 1090, y: 115, w: 10, h: 210 }, { x: 1090, y: 385, w: 10, h: 280 }, { x: 1090, y: 725, w: 10, h: 240 },
  { x: 175, y: 480, w: 335, h: 10 },
  { x: 555, y: 480, w: 250, h: 10 }, { x: 879, y: 480, w: 211, h: 10 },
  { x: 1115, y: 480, w: 208, h: 10 }, { x: 1397, y: 480, w: 213, h: 10 }
];

function buildScene() {
  sceneObjects = []; staticColliders = [];
  addObject('sofa_blue', 250, 205, 1); addObject('sofa_orange', 285, 365, .9); addObject('coffee_table_round', 370, 285, .8); addObject('plant_large', 475, 190, .75);
  [[635, 245], [820, 245], [635, 385], [820, 385], [635, 565], [820, 565], [635, 705], [820, 705]].forEach(p => addObject('desk_single', p[0], p[1], .9));
  [[600, 240], [785, 240], [600, 380], [785, 380]].forEach(p => addObject('plant_small', p[0], p[1], .65));
  addObject('sofa_blue', 1190, 205, .9); addObject('sofa_orange', 1230, 360, .85); addObject('sofa_orange_2', 1400, 360, .82); addObject('round_meeting_table', 1320, 295, .72);
  addObject('plant_large', 1530, 190, .75);
  [[1190, 585], [1370, 585], [1190, 735], [1370, 735]].forEach(p => addObject('desk_single', p[0], p[1], .9));
  [[1160, 580], [1340, 580], [1160, 730], [1340, 730]].forEach(p => addObject('plant_small', p[0], p[1], .65));
  addObject('pool_table', 300, 680, .85, .5, 'Mesa de sinuca'); addObject('foosball', 210, 680, .8, .5, 'Pebolim'); addObject('sofa_orange', 250, 845, .65); addObject('plant_large', 470, 580, .65);
  addObject('whiteboard', 900, 120, .8); addObject('wall_tv', 1220, 120, .8); addObject('bookshelf', 485, 130, .8); addObject('water_cooler', 1540, 480, .9, .5, 'Bebedouro');
  walls.forEach(w => staticColliders.push({ ...w, type: 'wall' }));
}

function drawDoor(d) {
  const t = d.open;
  ctx.save();
  ctx.fillStyle = '#3a1e05';
  if (d.axis === 'v') ctx.fillRect(d.x - 3, d.y, 22, d.h); else ctx.fillRect(d.x, d.y - 3, d.w, 22);
  ctx.fillStyle = '#8b5a2b'; ctx.strokeStyle = '#3a1e05'; ctx.lineWidth = 2;
  if (d.axis === 'v') {
    const ph = Math.max(5, d.h * (1 - t));
    ctx.fillRect(d.x, d.y, 12, ph); ctx.strokeRect(d.x + .5, d.y + .5, 11, Math.max(4, ph - 1));
    ctx.fillStyle = '#f7e2b7'; ctx.fillRect(d.x + 7, d.y + Math.min(ph - 8, ph * .65), 2, 2);
  } else {
    const pw = Math.max(5, d.w * (1 - t));
    ctx.fillRect(d.x, d.y, pw, 12); ctx.strokeRect(d.x + .5, d.y + .5, Math.max(4, pw - 1), 11);
    ctx.fillStyle = '#f7e2b7'; ctx.fillRect(d.x + Math.min(pw - 8, pw * .65), d.y + 7, 2, 2);
  }
  ctx.restore();
}

function doorCollider(d) {
  if (d.open > .82) return null;
  if (d.axis === 'v') return { x: d.x, y: d.y, w: 12, h: d.h * (1 - d.open), type: 'door' };
  return { x: d.x, y: d.y, w: d.w * (1 - d.open), h: 12, type: 'door' };
}

function circleRect(cx, cy, r, rect) {
  const nx = Math.max(rect.x, Math.min(cx, rect.x + rect.w)), ny = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
  return (cx - nx) ** 2 + (cy - ny) ** 2 < r * r;
}

function collides(x, y) {
  for (const c of staticColliders) if (circleRect(x, y, PLAYER_RADIUS, c)) return true;
  for (const d of doors) { const c = doorCollider(d); if (c && circleRect(x, y, PLAYER_RADIUS, c)) return true }
  return false;
}

function tryMove(nx, ny) {
  if (!collides(nx, player.y)) player.x = nx;
  if (!collides(player.x, ny)) player.y = ny;
  player.x = Math.max(165, Math.min(1615, player.x)); player.y = Math.max(105, Math.min(975, player.y));
}

function updateDoors(dt) {
  doors.forEach(d => {
    const cx = d.x + d.w / 2, cy = d.y + d.h / 2, near = Math.hypot(player.x - cx, player.y - cy) < 90;
    d.target = near ? 1 : 0;
    const speed = dt * 4.8;
    d.open += Math.sign(d.target - d.open) * Math.min(Math.abs(d.target - d.open), speed);
  });
}

function nearestInteractive() {
  let best = null, dist = Infinity;
  for (const o of sceneObjects) {
    if (!o.interactive) continue;
    const d = Math.hypot(player.x - o.x, player.y - o.y);
    if (d < 75 && d < dist) { best = o; dist = d }
  }
  return best;
}

function interact() {
  const o = nearestInteractive();
  if (!o) return;
  const logEl = $('globalLog');
  if (logEl) logEl.textContent = `[INTERAÇÃO] ${o.interactive}: interação visual ativada.`;
  o.pulse = performance.now() + 600;
}

function drawWorld() {
  if (!ctx) return;
  const W = canvas.clientWidth || 800, H = canvas.clientHeight || 600;
  ctx.clearRect(0, 0, W, H);

  camera.x = Math.max(0, Math.min(WORLD.w - W, player.x - W / 2));
  camera.y = Math.max(0, Math.min(WORLD.h - H, player.y - H / 2));

  ctx.save();
  ctx.translate(-camera.x, -camera.y);

  // 1. Fundo Terroso / Grama Estilo RPG
  ctx.fillStyle = '#5c8b43';
  ctx.fillRect(0, 0, WORLD.w, WORLD.h);

  for (let i = 0; i < 30; i++) {
    const x = (i * 137) % 1700 + 35, y = (i * 93) % 1010 + 35;
    drawAsset('plant_small', x, y, .5);
  }

  // 2. Chão das Salas
  drawRoom(150, 90, 1480, 900, 'floor_beige');
  drawRoom(175, 115, 335, 360, 'floor_purple');
  drawRoom(175, 505, 335, 460, 'floor_gray');
  drawRoom(555, 115, 535, 360, 'floor_beige');
  drawRoom(555, 495, 535, 470, 'floor_beige');
  drawRoom(1115, 115, 495, 360, 'floor_beige');
  drawRoom(1115, 505, 495, 460, 'floor_gray');

  walls.forEach(w => wallRect(w.x, w.y, w.w, w.h, true));

  label('LOUNGE', 342, 140);
  label('PRODUCT TEAM', 822, 140);
  label('MEETING', 1360, 140);
  label('GAME ROOM', 342, 530);
  label('DEV / OPS', 822, 530);
  label('CX TEAM', 1360, 530);

  // 3. Y-Sorting
  const drawables = [
    ...sceneObjects.map(o => ({
      y: o.y,
      fn: () => {
        drawAsset(o.id, o.x, o.y, o.scale, o.anchor);
        if (o.pulse && performance.now() < o.pulse) {
          ctx.save();
          ctx.strokeStyle = '#f8e36b';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(o.x, o.y - 20, 28, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
      }
    })),
    ...agents.map(a => ({
      y: a.y,
      fn: () => {
        drawCharacter(a, a.x, a.y, a.moving);
        nameBadge(a, a.x, a.y - 65);
      }
    })),
    {
      y: player.y,
      fn: () => {
        drawCharacter({ character: player.character, direction: player.direction }, player.x, player.y, player.moving);
        nameBadge({ name: 'MACACO MESTRE', short: 'CEO', status: 'Online' }, player.x, player.y - 65);
      }
    }
  ].sort((a, b) => a.y - b.y);

  drawables.forEach(d => d.fn());
  doors.forEach(drawDoor);

  // 4. Overlay de Iluminação Ambient Quente
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = 'rgba(240, 230, 210, 0.15)';
  ctx.fillRect(0, 0, WORLD.w, WORLD.h);
  ctx.restore();

  ctx.restore();
}

function movement(dt) {
  let dx = 0, dy = 0;
  if (keys.w || keys.arrowup) dy--; if (keys.s || keys.arrowdown) dy++; if (keys.a || keys.arrowleft) dx--; if (keys.d || keys.arrowright) dx++;
  if (dx || dy) {
    player.moving = true; const n = Math.hypot(dx, dy) || 1; dx /= n; dy /= n;
    if (Math.abs(dx) > Math.abs(dy)) player.direction = dx < 0 ? 'left' : 'right'; else player.direction = dy < 0 ? 'up' : 'down';
    tryMove(player.x + dx * player.speed * dt, player.y + dy * player.speed * dt);
    player.targetX = player.x; player.targetY = player.y;
  } else {
    const dx2 = player.targetX - player.x, dy2 = player.targetY - player.y, d = Math.hypot(dx2, dy2);
    if (d > 3) {
      player.moving = true;
      if (Math.abs(dx2) > Math.abs(dy2)) player.direction = dx2 < 0 ? 'left' : 'right'; else player.direction = dy2 < 0 ? 'up' : 'down';
      const step = Math.min(player.speed * dt, d);
      const ox = player.x, oy = player.y;
      tryMove(player.x + dx2 / d * step, player.y + dy2 / d * step);
      if (Math.hypot(player.x - ox, player.y - oy) < .2) { player.targetX = player.x; player.targetY = player.y; player.moving = false }
    } else player.moving = false;
  }
}

function updateAgentIdle() {
  for (const a of agents) a.moving = false;
}

function animate(now) {
  const dt = Math.min((now - last) / 1000, .05); last = now;
  movement(dt); updateDoors(dt); updateAgentIdle();
  if (player.moving) { walkClock += dt * 1000; idleClock += dt * 1000 } else idleClock += dt * 1000;
  drawWorld();

  let found = null; for (const a of agents) if (Math.hypot(player.x - a.x, player.y - a.y) < 82) { found = a; break }
  const interactObj = nearestInteractive();
  const b = $('proximity');
  if (b) {
    if (found) {
      b.style.display = 'block';
      b.style.left = (found.x - camera.x) + 'px';
      b.style.top = (found.y - camera.y - 70) + 'px';
      b.innerHTML = `Conversar com ${found.name} <span class="key">ESPAÇO</span>`;
      b.onclick = () => openChat(found);
    } else if (interactObj) {
      b.style.display = 'block';
      b.style.left = (interactObj.x - camera.x) + 'px';
      b.style.top = (interactObj.y - camera.y - 55) + 'px';
      b.innerHTML = `${interactObj.interactive} <span class="key">E</span>`;
      b.onclick = interact;
    } else b.style.display = 'none';
  }
  requestAnimationFrame(animate);
}

addEventListener('keydown', e => {
  if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
  keys[e.key.toLowerCase()] = true;
  if (e.code === 'Space') { const a = agents.find(a => Math.hypot(player.x - a.x, player.y - a.y) < 82); if (a) openChat(a); e.preventDefault() }
  if (e.key.toLowerCase() === 'e') { interact(); e.preventDefault() }
});
addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);

if (canvas) {
  canvas.addEventListener('pointerdown', e => {
    const r = canvas.getBoundingClientRect();
    player.targetX = e.clientX - r.left + camera.x;
    player.targetY = e.clientY - r.top + camera.y;
  });
}

function renderAgents() {
  const el = $('agents'); if (!el) return;
  el.innerHTML = '';
  const countBadge = $('agentCount');
  if (countBadge) countBadge.textContent = agents.length;

  agents.forEach(a => {
    const d = document.createElement('div');
    d.className = 'agentCard';
    const c = characterAssets[a.character], srcPath = c?.down?.[0] || 'char_01_down_0.png';
    d.innerHTML = `<img class="mini" src="${srcPath}"><div><strong>${a.name}</strong><br><span style="font-size: 11px; opacity:0.8;">${a.role}</span></div>`;
    d.onclick = () => { player.targetX = a.x; player.targetY = a.y + 72 };
    el.appendChild(d);
  });
}

function openChat(a) {
  activeAgent = a;
  const modalName = $('modalName');
  const modalRole = $('modalRole');
  const modalDesc = $('modalDesc');
  const modalAvatar = $('modalAvatar');
  const chatModal = $('chatModal');

  if (modalName) modalName.textContent = a.name;
  if (modalRole) modalRole.textContent = a.role;
  if (modalDesc) modalDesc.textContent = a.desc;
  if (modalAvatar) modalAvatar.src = characterAssets[a.character]?.down?.[0] || 'char_01_down_0.png';
  if (chatModal) chatModal.classList.remove('hidden');

  renderChat();
  const c = $('chips');
  if (c) {
    c.innerHTML = '';
    a.skills.forEach(s => {
      const b = document.createElement('button');
      b.className = 'chip';
      b.textContent = s;
      b.onclick = () => {
        const input = $('chatInput');
        if (input) input.value = 'Executar: ' + s;
        sendMessage();
      };
      c.appendChild(b);
    });
  }
}

function renderChat() {
  const el = $('messages'); if (!el) return;
  el.innerHTML = '';

  activeAgent.history.forEach((m, idx) => {
    const msgDiv = document.createElement('div');
    msgDiv.style.display = 'flex';
    msgDiv.style.flexDirection = 'column';
    msgDiv.style.marginBottom = '14px';
    msgDiv.style.alignItems = m.sender === 'user' ? 'flex-end' : 'flex-start';

    const bubble = document.createElement('div');
    bubble.style.maxWidth = '85%';
    bubble.style.padding = '12px 16px';
    bubble.style.borderRadius = '4px';
    bubble.style.fontSize = '12px';
    bubble.style.lineHeight = '1.6';
    bubble.style.whiteSpace = 'pre-wrap';

    if (m.sender === 'user') {
      bubble.style.backgroundColor = '#8b5a2b';
      bubble.style.color = '#fff1d6';
      bubble.style.border = '2px solid #3a1e05';
    } else {
      bubble.style.backgroundColor = '#fff1d6';
      bubble.style.color = '#2b1704';
      bubble.style.border = '2px solid #3a1e05';
      bubble.style.boxShadow = 'inset -2px -2px 0px #cda26f';
    }

    let formattedText = m.text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/### (.*?)\n/g, '<h4 style="font-weight:bold; color:#8b5a2b; margin-top:8px;">$1</h4>')
      .replace(/```([\s\S]*?)```/g, '<pre style="background:#3a1e05; padding:10px; border-radius:4px; overflow-x:auto; font-family:monospace; color:#fff1d6; margin:8px 0;"><code>$1</code></pre>');

    bubble.innerHTML = formattedText;
    msgDiv.appendChild(bubble);

    if (m.sender === 'agent' && idx > 0) {
      const pdfBtn = document.createElement('button');
      pdfBtn.className = 'pixel-button';
      pdfBtn.style.marginTop = '6px';
      pdfBtn.style.fontSize = '8px';
      pdfBtn.innerHTML = '📄 Baixar PDF';
      pdfBtn.onclick = () => downloadPDF(idx);
      msgDiv.appendChild(pdfBtn);
    }

    el.appendChild(msgDiv);
  });

  el.scrollTop = el.scrollHeight;
}

function sendMessage() {
  const input = $('chatInput');
  if (!input || !input.value.trim() || !activeAgent) return;

  const text = input.value.trim();
  input.value = '';

  activeAgent.history.push({ sender: 'user', text });
  renderChat();

  activeAgent.status = 'Executando...';

  setTimeout(() => {
    activeAgent.history.push({
      sender: 'agent',
      text: `[AGENTE ${activeAgent.name.toUpperCase()}]\n\nRecebi o comando: "${text}".\n\nModo demonstração ativo. Configure o webhook para integrar ao backend.`
    });
    activeAgent.status = 'Ocioso';
    renderChat();
    localStorage.setItem('startup_hq_agents', JSON.stringify(agents));
  }, 1000);
}

window.downloadPDF = function (index) {
  if (!activeAgent || !activeAgent.history[index]) return;
  const msgText = activeAgent.history[index].text;

  const element = document.createElement('div');
  element.style.padding = '30px';
  element.style.fontFamily = 'Arial, sans-serif';
  element.style.color = '#1e293b';
  element.innerHTML = `
    <h1 style="color: #4f46e5; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">${activeAgent.name} - Documento Oficial WeON</h1>
    <p style="font-size: 12px; color: #64748b;">Função: ${activeAgent.role} | Gerado via AI Virtual Office 2D</p>
    <hr style="margin-bottom: 20px; border: 0; border-top: 1px solid #cbd5e1;">
    <div style="font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${msgText.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')}</div>
  `;

  const opt = {
    margin: 10,
    filename: `Documento_WeON_${activeAgent.name.replace(/\s+/g, '_')}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };

  if (window.html2pdf) {
    html2pdf().set(opt).from(element).save();
  } else {
    alert('Biblioteca de PDF carregando... Tente em 2 segundos.');
  }
};

// Configurações
$('settingsBtn')?.addEventListener('click', () => {
  $('settingsModal')?.classList.remove('hidden');
});

$('saveSettings')?.addEventListener('click', () => {
  settings.aiMode = $('aiMode').value;
  settings.webhookUrl = $('webhook').value;
  settings.apiKey = $('apiKey').value;
  localStorage.setItem('startup_hq_settings', JSON.stringify(settings));
  $('settingsModal')?.classList.add('hidden');
});

// Inicialização
async function init() {
  await loadJSON();
  preload();
  resize();
  renderAgents();
  requestAnimationFrame(animate);
}

init();

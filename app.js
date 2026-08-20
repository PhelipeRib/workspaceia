const $ = id => document.getElementById(id);
const canvas = $('officeCanvas'), ctx = canvas ? canvas.getContext('2d', { alpha: false }) : null;
if (ctx) ctx.imageSmoothingEnabled = false;

const WORLD = { w: 1800, h: 1080 };
const PLAYER_RADIUS = 13;
let camera = { x: 0, y: 0 }, keys = {}, activeAgent = null, last = performance.now(), walkClock = 0, idleClock = 0;
let atlasAssets = {}, characterAssets = {}, sceneObjects = [], staticColliders = [];

let settings = JSON.parse(localStorage.getItem('startup_hq_settings') || '{"aiMode":"custom-webhook","webhookUrl":"https://workspaceia.onrender.com/agent-chat","apiKey":""}');

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
    const r = await fetch('sprite_manifest.json?v=' + Date.now());
    if (r.ok) {
      const m = await r.json();
      atlasAssets = m.assets || {};
      characterAssets = m.characters || {};
    }
  } catch (e) {
    console.warn('Erro ao carregar o manifest:', e);
  }
  buildScene();
}

const imageCache = new Map();
function img(path) {
  if (!path) return null;
  if (!imageCache.has(path)) { 
    const im = new Image(); 
    im.src = path; 
    imageCache.set(path, im); 
  }
  return imageCache.get(path);
}

function preload() {
  Object.values(atlasAssets).forEach(a => { if (a.file) img(a.file); });
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
  const a = atlasAssets[id];
  const im = img(a?.file || (id + '.png'));
  if (!im || !im.complete || !im.naturalWidth) return;

  const w = (a?.w || im.naturalWidth) * scale;
  const h = (a?.h || im.naturalHeight) * scale;
  ctx.drawImage(im, Math.round(x - w * anchor), Math.round(y - h), Math.round(w), Math.round(h));
}

function addObject(id, x, y, scale = 1, anchor = .5, interactive = null) {
  sceneObjects.push({ id, x, y, scale, anchor, interactive });
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

  ctx.save();
  if (a.direction === 'left') {
    ctx.translate(Math.round(x), Math.round(y));
    ctx.scale(-1, 1);
    ctx.drawImage(im, Math.round(-nw * scale / 2), Math.round(-nh * scale), Math.round(nw * scale), Math.round(nh * scale));
  } else {
    ctx.drawImage(im, Math.round(x - nw * scale / 2), Math.round(y - nh * scale), Math.round(nw * scale), Math.round(nh * scale));
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
  ctx.font = '9px "Press Start 2P", cursive, sans-serif';
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

function drawDoor(d) {
  const t = d.open;
  ctx.save();
  ctx.fillStyle = '#3a1e05';
  if (d.axis === 'v') ctx.fillRect(d.x - 3, d.y, 22, d.h); else ctx.fillRect(d.x, d.y - 3, d.w, 22);
  ctx.fillStyle = '#8b5a2b'; ctx.strokeStyle = '#3a1e05'; ctx.lineWidth = 2;
  if (d.axis === 'v') {
    const ph = Math.max(5, d.h * (1 - t));
    ctx.fillRect(d.x, d.y, 12, ph); ctx.strokeRect(d.x + .5, d.y + .5, 11, Math.max(4, ph - 1));
  } else {
    const pw = Math.max(5, d.w * (1 - t));
    ctx.fillRect(d.x, d.y, pw, 12); ctx.strokeRect(d.x + .5, d.y + .5, Math.max(4, pw - 1), 11);
  }
  ctx.restore();
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
  doors.forEach(drawDoor);

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
    player.targetX = player.x; player.targetY = player.y;
  } else {
    const dx2 = player.targetX - player.x, dy2 = player.targetY - player.y, d = Math.hypot(dx2, dy2);
    if (d > 3) {
      player.moving = true;
      if (Math.abs(dx2) > Math.abs(dy2)) player.direction = dx2 < 0 ? 'left' : 'right'; else player.direction = dy2 < 0 ? 'up' : 'down';
      const step = Math.min(player.speed * dt, d);
      player.x += dx2 / d * step;
      player.y += dy2 / d * step;
    } else player.moving = false;
  }
}

function updateDoors(dt) {
  doors.forEach(d => {
    const cx = d.x + d.w / 2, cy = d.y + d.h / 2, near = Math.hypot(player.x - cx, player.y - cy) < 90;
    d.target = near ? 1 : 0;
    const speed = dt * 4.8;
    d.open += Math.sign(d.target - d.open) * Math.min(Math.abs(d.target - d.open), speed);
  });
}

function animate(now) {
  const dt = Math.min((now - last) / 1000, .05); last = now;
  movement(dt);
  updateDoors(dt);
  if (player.moving) { walkClock += dt * 1000; idleClock += dt * 1000; } else idleClock += dt * 1000;
  drawWorld();

  let found = null; for (const a of agents) if (Math.hypot(player.x - a.x, player.y - a.y) < 82) { found = a; break; }
  const b = $('proximity');
  if (b) {
    if (found) {
      b.style.display = 'block';
      b.style.left = (found.x - camera.x) + 'px';
      b.style.top = (found.y - camera.y - 70) + 'px';
      b.innerHTML = `Conversar com ${found.name} <span class="key">ESPAÇO</span>`;
      b.onclick = () => openChat(found);
    } else b.style.display = 'none';
  }
  requestAnimationFrame(animate);
}

addEventListener('keydown', e => {
  if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
  keys[e.key.toLowerCase()] = true;
  if (e.code === 'Space') { const a = agents.find(a => Math.hypot(player.x - a.x, player.y - a.y) < 82); if (a) openChat(a); e.preventDefault(); }
});
addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });

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
    const c = characterAssets[a.character], srcPath = c?.down?.[0] || `${a.character}_down_1.png`;
    d.innerHTML = `<img class="mini" src="${srcPath}"><div><strong>${a.name}</strong><br><span style="font-size: 11px; opacity:0.8;">${a.role}</span></div>`;
    d.onclick = () => { player.targetX = a.x; player.targetY = a.y + 72; };
    el.appendChild(d);
  });
}

function openChat(a) {
  activeAgent = a;
  const modalName = $('modalName'), modalRole = $('modalRole'), modalDesc = $('modalDesc'), modalAvatar = $('modalAvatar'), chatModal = $('chatModal');

  if (modalName) modalName.textContent = a.name;
  if (modalRole) modalRole.textContent = a.role;
  if (modalDesc) modalDesc.textContent = a.desc;
  if (modalAvatar) modalAvatar.src = characterAssets[a.character]?.down?.[0] || `${a.character}_down_1.png`;
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

  activeAgent.history.forEach((m) => {
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
    }

    bubble.innerHTML = m.text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/```([\s\S]*?)```/g, '<pre style="background:#3a1e05; padding:10px; border-radius:4px; color:#fff1d6;"><code>$1</code></pre>');

    msgDiv.appendChild(bubble);
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
      text: `[AGENTE ${activeAgent.name.toUpperCase()}]\n\nRecebi o comando: "${text}".`
    });
    activeAgent.status = 'Ocioso';
    renderChat();
    localStorage.setItem('startup_hq_agents', JSON.stringify(agents));
  }, 1000);
}

$('settingsBtn')?.addEventListener('click', () => $('settingsModal')?.classList.remove('hidden'));
$('saveSettings')?.addEventListener('click', () => {
  settings.aiMode = $('aiMode')?.value || settings.aiMode;
  settings.webhookUrl = $('webhook')?.value || settings.webhookUrl;
  settings.apiKey = $('apiKey')?.value || settings.apiKey;
  localStorage.setItem('startup_hq_settings', JSON.stringify(settings));
  $('settingsModal')?.classList.add('hidden');
});

async function init() {
  resize();
  await loadJSON();
  preload();
  renderAgents();
  requestAnimationFrame(animate);
}

init();

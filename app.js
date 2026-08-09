const $=id=>document.getElementById(id);
const canvas=$('officeCanvas'),ctx=canvas.getContext('2d',{alpha:false});
ctx.imageSmoothingEnabled=false;

const WORLD={w:1800,h:1080};
let camera={x:0,y:0},keys={},activeAgent=null,last=performance.now(),walkClock=0,idleClock=0;
let atlasAssets={}, characterAssets={};
let settings=JSON.parse(localStorage.getItem('startup_hq_settings')||'{"aiMode":"simulated","webhookUrl":"","apiKey":""}');

const DEFAULT=[
{id:'dev',name:'Brad',role:'Tech Lead / Dev',short:'Tech Lead',desc:'Análise de código, Pull Requests e automação de builds.',character:'char_01',direction:'down',x:680,y:335,status:'Ocioso',skills:['Review de PR','Gerar Testes Unitários','Deploy Staging','Debug Endpoint'],history:[{sender:'agent',text:'E aí! Sou o Brad, seu Lead de Eng. Qual repositório ou tarefa de código vamos rodar?'}]},
{id:'pm',name:'Alison',role:'Product Owner',short:'Product',desc:'Definição de estórias de usuário e planejamento de Sprints.',character:'char_04',direction:'down',x:850,y:335,status:'Ocioso',skills:['Escrever User Stories','Priorizar Backlog','Roadmap Q3'],history:[{sender:'agent',text:'Oi! Alison por aqui. Pronta para mapear requisitos e alinhar a visão de produto.'}]},
{id:'cx',name:'Som & Morgan',role:'CX & Product Analytics',short:'CX',desc:'Retenção, feedback de clientes e métricas de uso.',character:'char_06',direction:'down',x:1325,y:670,status:'Ocioso',skills:['Relatório NPS','Métricas de Coorte','Feedbacks Críticos','Análise de Churn'],history:[{sender:'agent',text:'Olá! Estamos monitorando a experiência do cliente e os logs de atendimento.'}]},
{id:'arch',name:'Jinen & Steven',role:'Arquitetos & Estratégia',short:'Strategy',desc:'Design de sistemas e arquitetura de integração.',character:'char_08',direction:'down',x:355,y:650,status:'Ocioso',skills:['Mapeamento de APIs','Desenho de BD','Refatoração Core','Plano Cloud'],history:[{sender:'agent',text:'Pausa para o café! Quer revisar a arquitetura da infraestrutura ou banco?'}]}
];
let agents=JSON.parse(localStorage.getItem('startup_hq_agents')||'null')||DEFAULT;
let player={x:700,y:560,targetX:700,targetY:560,speed:230,direction:'down',moving:false};

async function loadJSON(){
 const r=await fetch('sprite_manifest.json');const m=await r.json();
 atlasAssets=m.assets;characterAssets=m.characters;
}
const imageCache=new Map();
function img(path){if(!imageCache.has(path)){const im=new Image();im.src=path;imageCache.set(path,im)}return imageCache.get(path)}
function preload(){
 Object.values(atlasAssets).forEach(a=>img(a.file));
 Object.values(characterAssets).forEach(c=>['down','up'].forEach(d=>c[d].forEach(f=>img('assets/characters/'+f))));
}
function resize(){const r=canvas.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,2);canvas.width=Math.floor(r.width*d);canvas.height=Math.floor(r.height*d);ctx.setTransform(d,0,0,d,0,0);ctx.imageSmoothingEnabled=false}
addEventListener('resize',resize);resize();

function drawAsset(id,x,y,scale=1,anchor=.5){
 const a=atlasAssets[id];if(!a)return;
 const im=img(a.file);if(!im.complete)return;
 const w=a.w*scale,h=a.h*scale;
 ctx.drawImage(im,Math.round(x-w*anchor),Math.round(y-h),Math.round(w),Math.round(h));
}
function shadow(x,y,w=28){ctx.save();ctx.globalAlpha=.22;ctx.fillStyle='#101722';ctx.beginPath();ctx.ellipse(x,y,w,Math.max(3,w*.22),0,0,Math.PI*2);ctx.fill();ctx.restore()}
function drawCharacter(a,x,y,moving){
 const c=characterAssets[a.character]||characterAssets.char_01;
 let dir=a.direction||'down';
 let frames=c[dir]||c.down;
 let idx=moving?Math.floor(walkClock/105)%frames.length:Math.floor(idleClock/390)%frames.length;
 let im=img('assets/characters/'+frames[idx]);if(!im.complete)return;
 const s=1.05;
 shadow(x,y+2,17);
 let bob=moving?Math.sin(walkClock/55)*1.0:Math.sin(idleClock/390*Math.PI*2)*.65;
 ctx.save();
 if(dir==='left'||dir==='right'){
   if(dir==='left')ctx.translate(x+22,y-3);else ctx.translate(x-22,y-3);
   if(dir==='left')ctx.scale(-1,1);
   ctx.drawImage(im,-Math.round(im.width*s/2),-Math.round(im.height*s),Math.round(im.width*s),Math.round(im.height*s));
 }else{
   ctx.drawImage(im,Math.round(x-im.width*s/2),Math.round(y-im.height*s+bob),Math.round(im.width*s),Math.round(im.height*s));
 }
 ctx.restore();
}
function label(t,x,y){ctx.save();ctx.fillStyle='#fff';ctx.beginPath();ctx.roundRect(x-55,y-12,110,24,12);ctx.fill();ctx.fillStyle='#7b8495';ctx.font='800 9px Arial';ctx.textAlign='center';ctx.fillText(t,x,y+3);ctx.restore()}
function nameBadge(a,x,y){ctx.save();ctx.font='700 10px Arial';const txt=`${a.name} · ${a.short||a.role}`;const tw=ctx.measureText(txt).width+25;ctx.fillStyle='#101827f5';ctx.beginPath();ctx.roundRect(x-tw/2,y-18,tw,19,9);ctx.fill();ctx.fillStyle=a.status==='Executando...'?'#ffb13b':'#35d486';ctx.beginPath();ctx.arc(x-tw/2+9,y-8.5,3,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff';ctx.textAlign='left';ctx.fillText(txt,x-tw/2+16,y-5);ctx.restore()}

function tileFloor(x,y,w,h,tile='floor_beige'){
 const im=img(atlasAssets[tile].file),tw=atlasAssets[tile].w,th=atlasAssets[tile].h;
 for(let yy=y;yy<y+h;yy+=th)for(let xx=x;xx<x+w;xx+=tw)ctx.drawImage(im,xx,yy,Math.min(tw,x+w-xx),Math.min(th,y+h-yy));
}
function room(x,y,w,h,tile='floor_beige'){
 tileFloor(x,y,w,h,tile);
 ctx.fillStyle='#707782';ctx.fillRect(x,y,w,10);ctx.fillRect(x,y+h-10,w,10);ctx.fillRect(x,y,10,h);ctx.fillRect(x+w-10,y,10,h);
 ctx.fillStyle='#9299a4';ctx.fillRect(x+10,y+10,w-20,3);
}
function furniture(){
 // lounge
 drawAsset('sofa_blue',250,205,1.0);drawAsset('sofa_orange',285,365,.9);drawAsset('coffee_table_round',370,285,.8);drawAsset('plant_large',475,190,.75);
 // meeting/product
 drawAsset('desk_single',635,245,.9);drawAsset('desk_single',820,245,.9);drawAsset('desk_single',635,385,.9);drawAsset('desk_single',820,385,.9);
 drawAsset('desk_single',635,565,.9);drawAsset('desk_single',820,565,.9);drawAsset('desk_single',635,705,.9);drawAsset('desk_single',820,705,.9);
 drawAsset('plant_small',600,240,.65);drawAsset('plant_small',785,240,.65);drawAsset('plant_small',600,380,.65);drawAsset('plant_small',785,380,.65);
 // right lounge
 drawAsset('sofa_blue',1190,205,.9);drawAsset('sofa_orange',1230,360,.85);drawAsset('sofa_orange_2',1400,360,.82);
 drawAsset('round_meeting_table',1320,295,.72);drawAsset('plant_large',1530,190,.75);
 // CX
 drawAsset('desk_single',1190,585,.9);drawAsset('desk_single',1370,585,.9);drawAsset('desk_single',1190,735,.9);drawAsset('desk_single',1370,735,.9);
 drawAsset('plant_small',1160,580,.65);drawAsset('plant_small',1340,580,.65);drawAsset('plant_small',1160,730,.65);drawAsset('plant_small',1340,730,.65);
 // game room
 drawAsset('pool_table',300,680,.85);drawAsset('foosball',210,680,.8);drawAsset('sofa_orange',250,845,.65);drawAsset('plant_large',470,580,.65);
 // architecture
 drawAsset('whiteboard',900,120,.8);drawAsset('wall_tv',1220,120,.8);drawAsset('bookshelf',485,130,.8);drawAsset('water_cooler',1540,480,.9);
}
function drawWorld(){
 const W=canvas.clientWidth,H=canvas.clientHeight;
 ctx.clearRect(0,0,W,H);
 camera.x=Math.max(0,Math.min(WORLD.w-W,player.x-W/2));camera.y=Math.max(0,Math.min(WORLD.h-H,player.y-H/2));
 ctx.save();ctx.translate(-camera.x,-camera.y);
 ctx.fillStyle='#a8d88d';ctx.fillRect(0,0,WORLD.w,WORLD.h);
 // simple outdoor vegetation
 for(let i=0;i<20;i++){const x=(i*173)%1700+35,y=(i*117)%1010+35;drawAsset('plant_small',x,y,.55)}
 room(150,90,1480,900,'floor_beige');
 room(175,115,335,360,'floor_purple');room(175,505,335,460,'floor_gray');
 room(555,115,535,360,'floor_beige');room(555,495,535,470,'floor_beige');
 room(1115,115,495,360,'floor_beige');room(1115,505,495,460,'floor_gray');
 // wall dividers
 ctx.fillStyle='#737a84';ctx.fillRect(515,115,10,850);ctx.fillRect(1090,115,10,850);ctx.fillRect(175,480,335,10);ctx.fillRect(555,480,535,10);ctx.fillRect(1115,480,495,10);
 label('LOUNGE',342,140);label('PRODUCT TEAM',822,140);label('MEETING',1360,140);label('GAME ROOM',342,530);label('DEV / OPS',822,530);label('CX TEAM',1360,530);
 furniture();
 // draw agents after furniture for proper depth
 [...agents].sort((a,b)=>a.y-b.y).forEach(a=>{drawCharacter(a,a.x,a.y,a.moving);nameBadge(a,a.x,a.y-65)});
 drawCharacter({character:'char_03',direction:player.direction},player.x,player.y,player.moving);
 nameBadge({name:'You',short:'CEO',status:'Online'},player.x,player.y-65);
 ctx.restore();
}

function movement(dt){
 let dx=0,dy=0;
 if(keys.w||keys.arrowup)dy--;if(keys.s||keys.arrowdown)dy++;if(keys.a||keys.arrowleft)dx--;if(keys.d||keys.arrowright)dx++;
 if(dx||dy){
   player.moving=true;const n=Math.hypot(dx,dy)||1;dx/=n;dy/=n;
   if(Math.abs(dx)>Math.abs(dy))player.direction=dx<0?'left':'right';else player.direction=dy<0?'up':'down';
   player.x+=dx*player.speed*dt;player.y+=dy*player.speed*dt;player.targetX=player.x;player.targetY=player.y;
 }else{
   const dx2=player.targetX-player.x,dy2=player.targetY-player.y,d=Math.hypot(dx2,dy2);
   if(d>3){player.moving=true;player.x+=dx2/d*player.speed*dt;player.y+=dy2/d*player.speed*dt;if(Math.abs(dx2)>Math.abs(dy2))player.direction=dx2<0?'left':'right';else player.direction=dy2<0?'up':'down'}else player.moving=false;
 }
 player.x=Math.max(210,Math.min(1580,player.x));player.y=Math.max(145,Math.min(930,player.y));
}
function animate(now){
 const dt=Math.min((now-last)/1000,.05);last=now;
 if(player.moving){walkClock+=dt*1000;idleClock=0}else{idleClock+=dt*1000;walkClock=0}
 movement(dt);drawWorld();
 let found=null;for(const a of agents)if(Math.hypot(player.x-a.x,player.y-a.y)<82){found=a;break}
 const b=$('proximity');if(found){b.style.display='block';b.style.left=(found.x-camera.x)+'px';b.style.top=(found.y-camera.y-70)+'px';b.innerHTML=`<span class="online"></span>Conversar com ${found.name}<span class="key">ESPAÇO</span>`;b.onclick=()=>openChat(found)}else b.style.display='none';
 requestAnimationFrame(animate)
}
addEventListener('keydown',e=>{keys[e.key.toLowerCase()]=true;if(e.code==='Space'){const a=agents.find(a=>Math.hypot(player.x-a.x,player.y-a.y)<82);if(a)openChat(a);e.preventDefault()}});
addEventListener('keyup',e=>keys[e.key.toLowerCase()]=false);
canvas.addEventListener('pointerdown',e=>{const r=canvas.getBoundingClientRect();player.targetX=e.clientX-r.left+camera.x;player.targetY=e.clientY-r.top+camera.y});

function renderAgents(){
 const el=$('agents');el.innerHTML='';$('agentCount').textContent=agents.length;
 agents.forEach(a=>{
   const d=document.createElement('div');d.className='agentCard';
   const c=characterAssets[a.character],srcPath='assets/characters/'+c.down[0];
   d.innerHTML=`<img class="mini" src="${srcPath}"><div><strong>${a.name}</strong><span>${a.role}</span></div>`;
   d.onclick=()=>{player.targetX=a.x;player.targetY=a.y+70;openChat(a)};el.appendChild(d)
 })
}
function openChat(a){
 activeAgent=a;$('modalName').textContent=a.name;$('modalRole').textContent=a.role;$('modalDesc').textContent=a.desc;
 $('modalAvatar').src='assets/characters/'+characterAssets[a.character].down[0];$('chatModal').classList.add('open');renderChat();
 const c=$('chips');c.innerHTML='';a.skills.forEach(s=>{const b=document.createElement('button');b.className='chip';b.textContent=s;b.onclick=()=>{$('chatInput').value='Executar: '+s;sendMessage()};c.appendChild(b)})
}
function renderChat(){const el=$('messages');el.innerHTML='';activeAgent.history.forEach(m=>{const d=document.createElement('div');d.className='msg '+(m.sender==='user'?'user':'agent');d.textContent=m.text;el.appendChild(d)});el.scrollTop=el.scrollHeight}
async function queryAI(a,p){
 if(settings.aiMode==='custom-webhook'&&settings.webhookUrl){
  try{const r=await fetch(settings.webhookUrl,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({agentId:a.id,agentName:a.name,role:a.role,prompt:p})});const d=await r.json();return d.reply||d.response||d.message||'Resposta recebida sem texto.'}catch(e){return '[WEBHOOK] Não foi possível conectar ao backend.'}
 }
 await new Promise(r=>setTimeout(r,700));return `[AGENTE ${a.name.toUpperCase()}]\n\nRecebi: "${p}".\n\nModo de demonstração ativo. Configure o webhook para executar a tarefa no seu backend.`
}
async function sendMessage(){const input=$('chatInput'),p=input.value.trim();if(!p||!activeAgent)return;activeAgent.history.push({sender:'user',text:p});activeAgent.status='Executando...';input.value='';renderChat();renderAgents();$('globalLog').textContent=`[AGENTE ${activeAgent.name.toUpperCase()}] Processando ordem "${p}"...`;const reply=await queryAI(activeAgent,p);activeAgent.status='Ocioso';activeAgent.history.push({sender:'agent',text:reply});localStorage.setItem('startup_hq_agents',JSON.stringify(agents));renderChat();renderAgents();$('globalLog').textContent=`[AGENTE ${activeAgent.name.toUpperCase()}] Tarefa concluída.`}
$('send').onclick=sendMessage;$('chatInput').addEventListener('keydown',e=>{if(e.key==='Enter')sendMessage()});$('closeChat').onclick=()=>$('chatModal').classList.remove('open');
$('settingsBtn').onclick=()=>$('settingsModal').classList.add('open');$('closeSettings').onclick=()=>$('settingsModal').classList.remove('open');$('rosterBtn').onclick=()=>$('layout').classList.toggle('sidebar-open');
$('saveSettings').onclick=()=>{settings={aiMode:$('aiMode').value,webhookUrl:$('webhook').value,apiKey:$('apiKey').value};localStorage.setItem('startup_hq_settings',JSON.stringify(settings));$('modeLabel').textContent=settings.aiMode==='custom-webhook'?'Ngrok / Backend':settings.aiMode==='claude-api'?'Claude API':'Simulação Local';$('settingsModal').classList.remove('open')};
$('aiMode').value=settings.aiMode;$('webhook').value=settings.webhookUrl;$('apiKey').value=settings.apiKey;$('modeLabel').textContent=settings.aiMode==='custom-webhook'?'Ngrok / Backend':settings.aiMode==='claude-api'?'Claude API':'Simulação Local';

(async()=>{try{await loadJSON();preload();renderAgents();requestAnimationFrame(animate)}catch(e){$('globalLog').textContent='[ERRO] Não foi possível carregar sprite_manifest.json: '+e.message}})();

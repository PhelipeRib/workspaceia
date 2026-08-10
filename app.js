// --- CONFIGURAÇÃO COM O RENDER ---
const DEFAULT_SETTINGS = {
    aiMode: 'custom-webhook',
    apiKey: '',
    webhookUrl: 'https://workspaceia.onrender.com/agent-chat'
};

let appSettings = { ...DEFAULT_SETTINGS };

// DADOS DOS AGENTES
const DEFAULT_AGENTS = [
    {
        id: 'agent-dev',
        name: 'Alex (Dev Lead)',
        role: 'Tech Lead / Code Reviewer',
        desc: 'Especialista em arquitetura, CI/CD, revisão de PRs e relatórios de código.',
        avatar: '👨‍💻',
        color: '#6366f1',
        x: 200,
        y: 180,
        skills: ['Review de PRs', 'Status da Sprint', 'Arquitetura Cloud'],
        history: [
            { sender: 'agent', text: 'Olá! Sou o Alex, Tech Lead. Como posso ajudar com a arquitetura ou o progresso do código hoje?' }
        ]
    },
    {
        id: 'agent-pm',
        name: 'Sophia (Product Manager)',
        role: 'PM & Agile Specialist',
        desc: 'Organiza backlog, métricas de roadmap, priorização de features e OKRs.',
        avatar: '👩‍💼',
        color: '#ec4899',
        x: 480,
        y: 180,
        skills: ['Roadmap 2026', 'Priorizar Backlog', 'Métricas de OKR'],
        history: [
            { sender: 'agent', text: 'Oi! Tudo bem? Quer alinhar entregáveis de produto ou rodar uma priorização?' }
        ]
    },
    {
        id: 'agent-data',
        name: 'Carlos (Data Scientist)',
        role: 'Analytics & BI',
        desc: 'Executa queries em SQL, gera gráficos de ROI e relatórios de métricas.',
        avatar: '📊',
        color: '#10b981',
        x: 200,
        y: 380,
        skills: ['Relatório de Churn', 'Consultar SQL', 'Métricas CAC/LTV'],
        history: [
            { sender: 'agent', text: 'E aí! Os dados de BI estão atualizados. O que você gostaria de analisar?' }
        ]
    },
    {
        id: 'agent-hr',
        name: 'Beatriz (People & Ops)',
        role: 'HR & Work Culture',
        desc: 'Gerencia onboarding, agendamento de reuniões de time e clima organizacional.',
        avatar: '🤝',
        color: '#f59e0b',
        x: 480,
        y: 380,
        skills: ['Onboarding Time', 'Agendar All-Hands', 'Políticas Internas'],
        history: [
            { sender: 'agent', text: 'Boas-vindas ao escritório virtual! Como posso te ajudar com a equipe hoje?' }
        ]
    }
];

let agents = [];
let player = {
    x: 340,
    y: 280,
    radius: 12,
    speed: 3.5,
    dir: 'down',
    frame: 0,
    animTimer: 0
};

let activeAgent = null;
let keys = {};
let ttsEnabled = true;
let isListeningVoice = false;
let recognition = null;

// ELEMENTOS DE ÁUDIO E CANVAS
const canvas = document.getElementById('officeCanvas');
const ctx = canvas ? canvas.getContext('2d') : null;
const CANVAS_WIDTH = 680;
const CANVAS_HEIGHT = 520;

if (canvas) {
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
}

// CARREGAMENTO DE IMAGENS DO SEU MAPA
const images = {};
const imageSources = {
    floor_beige: 'floor_beige.png',
    floor_gray: 'floor_gray.png',
    floor_purple: 'floor_purple.png',
    desk_dual: 'desk_dual.png',
    desk_single: 'desk_single.png',
    desk_triple: 'desk_triple.png',
    meeting_table: 'meeting_table.png',
    round_meeting_table: 'round_meeting_table.png',
    sofa_blue: 'sofa_blue.png',
    sofa_orange: 'sofa_orange.png',
    sofa_orange_2: 'sofa_orange_2.png',
    coffee_table_round: 'coffee_table_round.png',
    armchair: 'armchair.png',
    bench: 'bench.png',
    bookshelf: 'bookshelf.png',
    cabinet: 'cabinet.png',
    plant_large: 'plant_large.png',
    plant_pot: 'plant_pot.png',
    plant_small: 'plant_small.png',
    office_chair: 'office_chair.png',
    foosball: 'foosball.png',
    pool_table: 'pool_table.png',
    monitor: 'monitor.png'
};

// SPRITES DOS PERSONAGENS
const spriteSheets = {
    player: {
        down: ['char_01_down_0.png', 'char_01_down_1.png', 'char_01_down_2.png', 'char_01_down_3.png'],
        up: ['char_01_up_0.png', 'char_01_up_1.png', 'char_01_up_2.png', 'char_01_up_3.png']
    },
    'agent-dev': {
        down: ['char_02_down_0.png', 'char_02_down_1.png', 'char_02_down_2.png', 'char_02_down_3.png'],
        up: ['char_02_up_0.png', 'char_02_up_1.png', 'char_02_up_2.png', 'char_02_up_3.png']
    },
    'agent-pm': {
        down: ['char_03_down_0.png', 'char_03_down_1.png', 'char_03_down_2.png', 'char_03_down_3.png'],
        up: ['char_03_up_0.png', 'char_03_up_1.png', 'char_03_up_2.png', 'char_03_up_3.png']
    },
    'agent-data': {
        down: ['char_04_down_0.png', 'char_04_down_1.png', 'char_04_down_2.png', 'char_04_down_3.png'],
        up: ['char_04_up_0.png', 'char_04_up_1.png', 'char_04_up_2.png', 'char_04_up_3.png']
    },
    'agent-hr': {
        down: ['char_05_down_0.png', 'char_05_down_1.png', 'char_05_down_2.png', 'char_05_down_3.png'],
        up: ['char_05_up_0.png', 'char_05_up_1.png', 'char_05_up_2.png', 'char_05_up_3.png']
    }
};

let loadedImagesCount = 0;
let totalImagesCount = Object.keys(imageSources).length;

function loadImages() {
    for (let key in imageSources) {
        images[key] = new Image();
        images[key].src = imageSources[key];
        images[key].onload = () => {
            loadedImagesCount++;
        };
    }

    // Precarrega Sprites
    for (let charKey in spriteSheets) {
        for (let dirKey in spriteSheets[charKey]) {
            spriteSheets[charKey][dirKey] = spriteSheets[charKey][dirKey].map(src => {
                const img = new Image();
                img.src = src;
                return img;
            });
        }
    }
}

// INICIALIZADOR
window.addEventListener('DOMContentLoaded', () => {
    if (window.lucide) lucide.createIcons();
    loadImages();
    loadStateFromStorage();
    renderAgentRoster();
    setupControls();
    setupSpeechRecognition();
    requestAnimationFrame(gameLoop);
});

function loadStateFromStorage() {
    const savedSettings = localStorage.getItem('ai_office_settings');
    if (savedSettings) {
        appSettings = JSON.parse(savedSettings);
        if (!appSettings.webhookUrl || appSettings.webhookUrl.includes('ngrok')) {
            appSettings.webhookUrl = 'https://workspaceia.onrender.com/agent-chat';
            appSettings.aiMode = 'custom-webhook';
        }
    } else {
        appSettings = { ...DEFAULT_SETTINGS };
    }

    const savedAgents = localStorage.getItem('ai_office_agents_data');
    agents = savedAgents ? JSON.parse(savedAgents) : JSON.parse(JSON.stringify(DEFAULT_AGENTS));

    const selectMode = document.getElementById('setting-ai-mode');
    const inputWebhook = document.getElementById('setting-webhook-url');
    if (selectMode) selectMode.value = appSettings.aiMode;
    if (inputWebhook) inputWebhook.value = appSettings.webhookUrl;

    updateStatusIndicator();
}

function saveStateToStorage() {
    localStorage.setItem('ai_office_agents_data', JSON.stringify(agents));
    localStorage.setItem('ai_office_settings', JSON.stringify(appSettings));
}

function updateStatusIndicator() {
    const dot = document.getElementById('connection-status-dot');
    const text = document.getElementById('connection-status-text');
    if (!dot || !text) return;

    if (appSettings.aiMode === 'custom-webhook') {
        dot.className = "w-2 h-2 rounded-full bg-emerald-400 animate-pulse";
        text.innerText = "Motor: Custom Webhook (Render/Groq)";
    } else if (appSettings.aiMode === 'claude-api') {
        dot.className = "w-2 h-2 rounded-full bg-indigo-400 animate-pulse";
        text.innerText = "Motor: Claude API Direct";
    } else {
        dot.className = "w-2 h-2 rounded-full bg-amber-400";
        text.innerText = "Motor: Simulação Local (Offline)";
    }
}

function renderAgentRoster() {
    const container = document.getElementById('agents-list');
    if (!container) return;
    container.innerHTML = '';

    agents.forEach(agent => {
        const card = document.createElement('div');
        card.className = "bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 p-3 rounded-xl transition cursor-pointer flex items-center gap-3";
        card.onclick = () => {
            player.x = agent.x + 35;
            player.y = agent.y + 35;
            openChatModal(agent);
        };
        card.innerHTML = `
            <div class="w-9 h-9 rounded-lg flex items-center justify-center text-lg shrink-0" style="background-color: ${agent.color}25; border: 1px solid ${agent.color}50;">
                ${agent.avatar}
            </div>
            <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between">
                    <h4 class="text-xs font-bold text-slate-200 truncate">${agent.name}</h4>
                    <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
                </div>
                <p class="text-[11px] text-slate-400 truncate">${agent.role}</p>
            </div>
        `;
        container.appendChild(card);
    });

    const badge = document.getElementById('agent-count-badge');
    if (badge) badge.innerText = agents.length;
}

function setupControls() {
    window.addEventListener('keydown', e => {
        keys[e.key.toLowerCase()] = true;
        keys[e.code] = true;
    });

    window.addEventListener('keyup', e => {
        keys[e.key.toLowerCase()] = false;
        keys[e.code] = false;
    });

    const btnSettings = document.getElementById('btn-settings');
    const btnCloseSettings = document.getElementById('btn-close-settings');
    const btnSaveSettings = document.getElementById('btn-save-settings');
    const btnResetCache = document.getElementById('btn-reset-cache');
    const btnCloseModal = document.getElementById('btn-close-modal');
    const btnSendMessage = document.getElementById('btn-send-message');
    const chatInput = document.getElementById('chat-input');
    const btnToggleTts = document.getElementById('btn-toggle-tts');

    if (btnSettings) btnSettings.onclick = () => document.getElementById('settings-modal').classList.remove('hidden');
    if (btnCloseSettings) btnCloseSettings.onclick = () => document.getElementById('settings-modal').classList.add('hidden');

    if (btnSaveSettings) {
        btnSaveSettings.onclick = () => {
            appSettings.aiMode = document.getElementById('setting-ai-mode').value;
            appSettings.apiKey = document.getElementById('setting-api-key').value;
            appSettings.webhookUrl = document.getElementById('setting-webhook-url').value;
            saveStateToStorage();
            updateStatusIndicator();
            document.getElementById('settings-modal').classList.add('hidden');
        };
    }

    if (btnResetCache) {
        btnResetCache.onclick = () => {
            if (confirm('Deseja resetar as configurações e histórico do mapa?')) {
                localStorage.clear();
                location.reload();
            }
        };
    }

    if (btnCloseModal) {
        btnCloseModal.onclick = () => {
            document.getElementById('chat-modal').classList.add('hidden');
            activeAgent = null;
        };
    }

    if (btnSendMessage) btnSendMessage.onclick = handleUserSendMessage;
    if (chatInput) {
        chatInput.addEventListener('keypress', e => {
            if (e.key === 'Enter') handleUserSendMessage();
        });
    }

    if (btnToggleTts) {
        btnToggleTts.onclick = () => {
            ttsEnabled = !ttsEnabled;
            btnToggleTts.innerHTML = ttsEnabled 
                ? `<i data-lucide="volume-2" class="w-4 h-4 text-indigo-400"></i> Voz: ON`
                : `<i data-lucide="volume-x" class="w-4 h-4 text-slate-500"></i> Voz: OFF`;
            if (window.lucide) lucide.createIcons();
        };
    }
}

// LOOP E DESENHO
function gameLoop() {
    const chatModal = document.getElementById('chat-modal');
    if (chatModal && chatModal.classList.contains('hidden')) {
        let dx = 0, dy = 0;
        if (keys['w'] || keys['arrowup']) { dy -= 1; player.dir = 'up'; }
        if (keys['s'] || keys['arrowdown']) { dy += 1; player.dir = 'down'; }
        if (keys['a'] || keys['arrowleft']) dx -= 1;
        if (keys['d'] || keys['arrowright']) dx += 1;

        if (dx !== 0 || dy !== 0) {
            player.animTimer++;
            if (player.animTimer % 8 === 0) {
                player.frame = (player.frame + 1) % 4;
            }
        } else {
            player.frame = 0;
        }

        if (dx !== 0 && dy !== 0) { dx *= 0.7071; dy *= 0.7071; }
        player.x = Math.max(25, Math.min(CANVAS_WIDTH - 25, player.x + dx * player.speed));
        player.y = Math.max(25, Math.min(CANVAS_HEIGHT - 25, player.y + dy * player.speed));
    }

    let foundAgent = null;
    agents.forEach(agent => {
        if (Math.hypot(player.x - agent.x, player.y - agent.y) < 55) {
            foundAgent = agent;
        }
    });

    const badge = document.getElementById('proximity-badge');
    if (badge) {
        if (foundAgent) {
            badge.classList.remove('hidden');
            document.getElementById('proximity-text').innerText = `Pressione [ESPAÇO] para conversar com ${foundAgent.name}`;
            if (keys[' '] || keys['space']) {
                openChatModal(foundAgent);
                keys[' '] = false; keys['space'] = false;
            }
        } else {
            badge.classList.add('hidden');
        }
    }

    drawScene();
    requestAnimationFrame(gameLoop);
}

function drawScene() {
    if (!ctx) return;
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Desenha Chão com Imagens
    drawFloor();

    // Desenha Móveis
    drawFurniture();

    // Desenha Agentes com Sprites
    agents.forEach(agent => {
        drawCharacter(agent.id, 'down', 0, agent.x, agent.y, agent.name, agent.color);
    });

    // Desenha Player
    drawCharacter('player', player.dir, player.frame, player.x, player.y, 'Você', '#6366f1');
}

function drawFloor() {
    // Sala Principal
    if (images.floor_beige && images.floor_beige.complete) {
        const pattern = ctx.createPattern(images.floor_beige, 'repeat');
        ctx.fillStyle = pattern;
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    } else {
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }
}

function drawFurniture() {
    // Desenha Objetos do Escritório
    const furnitureList = [
        { img: 'desk_dual', x: 140, y: 140 },
        { img: 'desk_dual', x: 420, y: 140 },
        { img: 'desk_dual', x: 140, y: 340 },
        { img: 'desk_dual', x: 420, y: 340 },
        { img: 'sofa_blue', x: 280, y: 240 },
        { img: 'plant_large', x: 50, y: 50 },
        { img: 'plant_large', x: 600, y: 50 },
        { img: 'bookshelf', x: 320, y: 50 }
    ];

    furnitureList.forEach(item => {
        if (images[item.img] && images[item.img].complete) {
            ctx.drawImage(images[item.img], item.x, item.y);
        }
    });
}

function drawCharacter(charKey, dir, frame, x, y, name, color) {
    const sheet = spriteSheets[charKey];
    if (sheet && sheet[dir] && sheet[dir][frame] && sheet[dir][frame].complete) {
        const img = sheet[dir][frame];
        ctx.drawImage(img, x - 16, y - 24, 32, 32);
    } else {
        // Fallback genérico caso sprite falhe
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, 14, 0, Math.PI * 2);
        ctx.fill();
    }

    // Label do Nome
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(x - 40, y - 36, 80, 14);
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 9px Plus Jakarta Sans';
    ctx.textAlign = 'center';
    ctx.fillText(name.split(' ')[0], x, y - 26);
}

// CHAT E MENSAGENS
function openChatModal(agent) {
    activeAgent = agent;
    document.getElementById('modal-agent-name').innerText = agent.name;
    document.getElementById('modal-agent-role').innerText = agent.role;
    document.getElementById('modal-agent-desc').innerText = agent.desc;
    document.getElementById('modal-agent-avatar').innerText = agent.avatar;

    const chipsContainer = document.getElementById('command-chips');
    if (chipsContainer) {
        chipsContainer.innerHTML = `<span class="text-slate-500 text-[11px] whitespace-nowrap">Comandos rápidos:</span>`;
        agent.skills.forEach(skill => {
            const btn = document.createElement('button');
            btn.className = "chip-btn bg-slate-800 hover:bg-indigo-900/40 text-indigo-300 border border-slate-700 px-2.5 py-1 rounded-lg text-xs transition";
            btn.innerText = skill;
            btn.onclick = () => {
                document.getElementById('chat-input').value = `Executar: ${skill}`;
                handleUserSendMessage();
            };
            chipsContainer.appendChild(btn);
        });
    }

    renderChatMessages();
    document.getElementById('chat-modal').classList.remove('hidden');
    document.getElementById('chat-input').focus();
}

function renderChatMessages() {
    if (!activeAgent) return;
    const container = document.getElementById('chat-messages');
    if (!container) return;
    container.innerHTML = '';

    activeAgent.history.forEach(msg => {
        const msgDiv = document.createElement('div');
        msgDiv.className = `flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`;
        const bubble = document.createElement('div');
        bubble.className = msg.sender === 'user'
            ? "bg-indigo-600 text-white p-3 rounded-2xl rounded-tr-none max-w-[80%] text-xs shadow-md"
            : "bg-slate-800 text-slate-100 border border-slate-700/80 p-3 rounded-2xl rounded-tl-none max-w-[85%] text-xs shadow-md leading-relaxed";
        bubble.innerText = msg.text;
        msgDiv.appendChild(bubble);
        container.appendChild(msgDiv);
    });

    container.scrollTop = container.scrollHeight;
}

async function handleUserSendMessage() {
    const input = document.getElementById('chat-input');
    const text = input ? input.value.trim() : '';
    if (!text || !activeAgent) return;

    activeAgent.history.push({ sender: 'user', text });
    if (input) input.value = '';
    renderChatMessages();

    const container = document.getElementById('chat-messages');
    const thinkingDiv = document.createElement('div');
    thinkingDiv.id = 'thinking-indicator';
    thinkingDiv.className = "flex justify-start";
    thinkingDiv.innerHTML = `
        <div class="bg-slate-800/80 border border-slate-700 p-2.5 rounded-2xl text-xs text-indigo-400 flex items-center gap-2">
            <i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i>
            <span>${activeAgent.name} está processando com a IA...</span>
        </div>
    `;
    if (container) {
        container.appendChild(thinkingDiv);
        if (window.lucide) lucide.createIcons();
        container.scrollTop = container.scrollHeight;
    }

    const reply = await queryAIMode(activeAgent, text);

    const indicator = document.getElementById('thinking-indicator');
    if (indicator) indicator.remove();

    activeAgent.history.push({ sender: 'agent', text: reply });
    saveStateToStorage();
    renderChatMessages();

    if (ttsEnabled && ('speechSynthesis' in window)) {
        window.speechSynthesis.cancel();
        const utt = new SpeechSynthesisUtterance(reply);
        utt.lang = 'pt-BR';
        window.speechSynthesis.speak(utt);
    }
}

async function queryAIMode(agent, prompt) {
    if (appSettings.aiMode === 'custom-webhook' && appSettings.webhookUrl) {
        try {
            const res = await fetch(appSettings.webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    agentId: agent.id,
                    agentRole: agent.role,
                    prompt: prompt
                })
            });
            const data = await res.json();
            if (data.reply) return data.reply;
        } catch (e) {
            console.error("Erro no Webhook do Render:", e);
        }
    }

    if (appSettings.aiMode === 'claude-api' && appSettings.apiKey) {
        try {
            const res = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': appSettings.apiKey,
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify({
                    model: 'claude-3-5-sonnet-20241022',
                    max_tokens: 300,
                    messages: [{ role: 'user', content: prompt }]
                })
            });
            const data = await res.json();
            if (data.content && data.content[0]) return data.content[0].text;
        } catch (e) {
            console.error("Erro na API do Claude:", e);
        }
    }

    await new Promise(r => setTimeout(r, 800));
    return `[${agent.role}] Recebi sua mensagem: "${prompt}". O meu backend no Render processará a resposta!`;
}

function setupSpeechRecognition() {
    const btnVoice = document.getElementById('btn-voice-input');
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition || !btnVoice) return;

    recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';

    recognition.onresult = (e) => {
        const input = document.getElementById('chat-input');
        if (input) {
            input.value = e.results[0][0].transcript;
            handleUserSendMessage();
        }
    };

    btnVoice.onclick = () => {
        try { recognition.start(); } catch(e) {}
    };
}

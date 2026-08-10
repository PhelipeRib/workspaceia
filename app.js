// Mapeamento garantindo que todos os agentes apontem para sprites válidos do repositório
const spriteSheets = {
    char_01: {
        down: ['char_01_down_0.png', 'char_01_down_1.png', 'char_01_down_2.png', 'char_01_down_3.png'],
        up: ['char_01_up_0.png', 'char_01_up_1.png', 'char_01_up_2.png', 'char_01_up_3.png']
    },
    char_02: {
        down: ['char_02_down_0.png', 'char_02_down_1.png', 'char_02_down_2.png', 'char_02_down_3.png'],
        up: ['char_02_up_0.png', 'char_02_up_1.png', 'char_02_up_2.png', 'char_02_up_3.png']
    },
    char_03: {
        down: ['char_03_down_0.png', 'char_03_down_1.png', 'char_03_down_2.png', 'char_03_down_3.png'],
        up: ['char_03_up_0.png', 'char_03_up_1.png', 'char_03_up_2.png', 'char_03_up_3.png']
    },
    char_04: {
        down: ['char_04_down_0.png', 'char_04_down_1.png', 'char_04_down_2.png', 'char_04_down_3.png'],
        up: ['char_04_up_0.png', 'char_04_up_1.png', 'char_04_up_2.png', 'char_04_up_3.png']
    },
    char_05: {
        down: ['char_05_down_0.png', 'char_05_down_1.png', 'char_05_down_2.png', 'char_05_down_3.png'],
        up: ['char_05_up_0.png', 'char_05_up_1.png', 'char_05_up_2.png', 'char_05_up_3.png']
    },
    char_06: {
        down: ['char_07_down_0.png', 'char_07_down_1.png', 'char_07_down_2.png', 'char_07_down_3.png'],
        up: ['char_07_up_0.png', 'char_07_up_1.png', 'char_07_up_2.png', 'char_07_up_3.png']
    },
    char_08: { // Redirecionando char_08 para char_05 para evitar transparência/falha de arquivo
        down: ['char_05_down_0.png', 'char_05_down_1.png', 'char_05_down_2.png', 'char_05_down_3.png'],
        up: ['char_05_up_0.png', 'char_05_up_1.png', 'char_05_up_2.png', 'char_05_up_3.png']
    }
};

// Renderização corrigida com Ancoragem Fixa e Pixel-Perfect
function drawCharacter(a, x, y, moving) {
    const im = characterFrame(a, moving);
    if (!im || !im.complete || !im.naturalWidth) return;

    const dir = a.direction || 'down';
    const renderWidth = 32;  // Largura padronizada do sprite na tela
    const renderHeight = 32; // Altura padronizada do sprite na tela

    // Efeito de breathing (respiro) sem achatar o arquivo PNG
    const idleBob = moving ? 0 : Math.round(Math.sin(idleClock / 650 * Math.PI * 2) * 1.2);
    const walkBob = moving ? Math.round(Math.abs(Math.sin(walkClock / 125 * Math.PI)) * 1.5) : 0;
    const bob = idleBob - walkBob;

    shadow(Math.round(x), Math.round(y + 2), 16);

    ctx.save();
    const drawX = Math.round(x - renderWidth / 2);
    const drawY = Math.round(y - renderHeight + bob);

    if (dir === 'left' || dir === 'right') {
        ctx.translate(Math.round(x), Math.round(y + bob));
        if (dir === 'left') ctx.scale(-1, 1);
        ctx.drawImage(
            im,
            Math.round(-renderWidth / 2),
            Math.round(-renderHeight),
            renderWidth,
            renderHeight
        );
    } else {
        ctx.drawImage(
            im,
            drawX,
            drawY,
            renderWidth,
            renderHeight
        );
    }
    ctx.restore();
}

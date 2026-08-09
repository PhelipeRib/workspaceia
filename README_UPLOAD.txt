# WorkspaceIA v3 — colisão, portas e sprites corrigidos

Substitua na RAIZ do repositório:
- index.html
- app.js
- sprite_manifest.json

Não mova os PNGs atuais: esta versão referencia todos diretamente na raiz, compatível com GitHub Pages em /workspaceia/.

Principais ajustes:
- Corrige caminhos dos personagens e assets.
- `down` usa arquivos `*_down_*` de verdade; `up` usa `*_up_*`.
- Idle usa frame estável + breathing/bobbing, evitando recortes/frames quebrados.
- Walk usa os 4 frames.
- Movimento horizontal espelha o sprite sem deslocamento incorreto.
- Colisão real com paredes e móveis.
- Click-to-move para ao encontrar obstáculos.
- Portas automáticas abrem ao aproximar e fecham ao sair.
- Portas bloqueiam fisicamente enquanto fechadas.
- Depth sorting por coordenada Y.
- Objetos interativos (sinuca, pebolim, bebedouro) respondem à tecla E.
- Query string ?v=3 reduz problemas de cache do GitHub Pages.

Se o navegador insistir em mostrar a versão antiga após o push:
1. Aguarde o deploy do GitHub Pages.
2. Faça Ctrl+F5.
3. Se necessário, abra uma janela anônima.

# WEON OMNICHANNEL - GUIA DE CRIAÇÃO RÁPIDA DE BOTS (NODE-RED & CLAUDE IA)

## Metodologia de Desenvolvimento
Para evitar o desenho manual nó por nó no Node-RED, utiliza-se a geração assistida por IA a partir de um fluxo de atendimento enviado pelo cliente (em formato BPMN, tabela ou imagem).

## Passo a Passo de Execução

1. **Captura do Requisito:**
   - Obter a imagem/fluxograma do atendimento do cliente (preferencialmente formato BPMN).

2. **Geração do JSON pelo Claude IA:**
   - Utilizar o modelo Claude Sonnet para ler a imagem e injetar um JSON estruturado para o Node-RED.
   - **Prompt Padrão:** 
     `"Capture a imagem/planilha e insumos enviados pelo cliente e gere um JSON para inserção no Node-RED de maneira que possa ser gerado um fluxo de atendimento de um bot de WhatsApp. O fluxo deverá replicar todo o fluxo enviado pelo cliente, suas respectivas mensagens e nós de decisão."`

3. **Importação do Fluxo no WeON Studio (Node-RED):**
   - Acesse o WeON Admin ➔ `Bots` ➔ Clique em **NOVO**.
   - Tipo: WhatsApp, Chat ou Voz. Defina o Timeout (padrão: 10 minutos).
   - Verifique a criação dos nós cruciais de sistema (`Timeout`, `Banco de Variáveis`, `Início`).
   - No menu superior do Node-RED, clique em `Menu (Três linhas)` ➔ `Importar`.
   - Cole o código JSON gerado e selecione `Importar para fluxo corrente`.

4. **Conexão e Publicação:**
   - Conecte a saída do nó `Início` ao primeiro nó do menu importado.
   - Clique no botão vermelho **Implementar (Deploy)**.
   - Valide no menu `Visão` ➔ `Simulador` para testar as respostas das opções.
   - Vincule o Bot criado na Rota de WhatsApp do WeON Admin (`Será direcionado para: Bot`).

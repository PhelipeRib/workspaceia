# WEON OMNICHANNEL - DOCUMENTAÇÃO WEACTION API (VERSÃO 5)

## Visão Geral & Autenticação
- **Versão:** WeON 5.
- **URL Base:** `https://{subdominio}.com.br/weaction/api/{endpoint}`
- **Exemplo de URL:** `https://next.com.br/weaction/api/v1/users/`
- **Padrão de Parâmetros:** 
  - Propriedades em formato padrão de objeto JSON.
  - Váriáveis são denotadas por `{chave}` (ex: `{user_id}`).
  - Suporte a filtros de consulta: `include` e `exclude`.

## Principais Endpoints da API

### 1. Usuários e Agentes (/users)
- `GET /users`: Listar todos os usuários/agentes da operação.
- `POST /users/pause`: Aplicar pausa ao agente.
- `GET /pauses`: Listar os motivos de pausa cadastrados.
- `POST /users/unpause`: Remover estado de pausa do agente.
- `POST /users/disconnect`: Desconectar forçadamente o agente do sistema.
- `GET /users/events`: Listar eventos de pausa, login e atendimento (Voz e WhatsApp).
- `GET /integration/cpj/getAgentStatus`: Consultar tempos e status do agente.

### 2. Atendimentos e Grupos (/groups & /raw)
- `POST /groups/create`: Criar novo grupo de atendimento (PABX/Fila).
- `GET /groups`: Listar grupos de atendimento existentes.
- `GET /raw/queueevents`: Consultar histórico de abandono nas filas de atendimento.

### 3. Contatos, Mailings e Campanhas (/contacts & /campaigns)
- `GET /contacts`: Listar contatos cadastrados.
- `POST /contacts/create`: Criar novo contato.
- `POST /contacts/update`: Atualizar dados do contato.
- `POST /contacts/create-multiple`: Ingestão massiva de contatos.
- `GET /campaigns`: Listar campanhas ativas.
- `GET /dialer-logs`: Eventos em tempo real do discador automático.
- `POST /campaigns-whatsapp/{campaign_id}/mailing/create`: Criar mailing de WhatsApp.
- `POST /campaigns-whatsapp/{campaign_id}/mailing/{mailing_id}/contacts/add`: Adicionar contato ao mailing.

### 4. WhatsApp & Logs de Conversas (/whatsapp & /conversation-logs)
- `GET /conversation-logs`: Registros e gravações de áudio/mensagens em tempo real.
- `POST /whatsapp/message/send`: Envio de mensagens de WhatsApp.
- `POST /bot/new-attendance`: Iniciar fluxo automatizado de Bot.
- `GET /queue-events`: Consulta de status de entrega de mensagens de WhatsApp.
- `GET /whatsapp/message/history/protocol`: Consultar histórico por protocolo de atendimento.

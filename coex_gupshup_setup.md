# WEON OMNICHANNEL - PASSO A PASSO CONFIGURAÇÃO COEX GUPSHUP & META

## Requisitos Iniciais
- Portfólio Empresarial Meta (BM) Verificado (Até 5 dias úteis).
- Cadastro ativo e saldo na carteira (My Wallet) na plataforma Gupshup (https://www.gupshup.io/console/).
- Comprovante de CNPJ e dados financeiros cadastrados na Gupshup.

## Etapas de Integração no Painel Gupshup & Meta

1. **Configuração Inicial do App:**
   - Tipo de Conta: Selecionar "Use existing WhatsApp Business App Number".
   - Região de Armazenamento de Dados: Selecionar **Brazil**.

2. **Detalhes de Contato & Verificação:**
   - Inserir nome e e-mail corporativo de suporte (ex: `suporte@weon.com.br`).
   - Validar o código OTP enviado por e-mail.

3. **Embedded Signup (Conexão Meta):**
   - Autenticar com a conta administrativa da BM no Facebook.
   - Selecionar o Portfólio Empresarial (WeON) e a Conta de WhatsApp Business.
   - Digitar o número de telefone com DDD (BR +55).
   - Escanear o QR Code no app WhatsApp Business no celular para importar o histórico dos últimos 180 dias.

4. **Configuração de Webhooks na Gupshup:**
   - **Webhook Default (v2):**
     - Tag: `default`
     - URL Callback: `https://weon5m3-data.weon.com.br/api/weon/whatsapp/gupshup/receipt/{NUMERO_TELEFONE}`
     - Format: **Gupshup format (v2)**
     - Marcar todos os eventos (Message, System, Template, Account).
   - **Webhook COEX (v3):**
     - Tag: `coex`
     - URL Callback: Mesma URL do webhook default.
     - Format: **Meta format (v3)**
     - Marcar: `Additional Events` e `Coexistence`.

5. **Ajustes Finais de Integração:**
   - Partner Name: Selecionar o código **106** (`SOLVE - SOLUCOES EM INFORMATICA LTDA`).
   - Gerar `API Key` e `Partner Token` (token iniciado por `sk_...` via Partner Docs da Gupshup).

## Configuração da Rota no Painel WeON Admin
- Acesse `WeON Admin` ➔ `Whatsapp` ➔ `Rotas de WhatsApp`.
- **1º Passo:** Nome da Rota, Número (com +55 e DDD), API `Gupshup` (marcar caixa **Oficial**).
- **2º Passo:** Inserir `SRC Name` (Nome do App Gupshup), `API Key`, URL `https://api.gupshup.io/wa/api/v1/msg`, `Token de Parceiro` e `App ID`.
- **3º Passo:** Apontar direcionamento para **Grupo de Atendimento** e vincular à Rota de Saída nas Configurações Gerais do grupo.

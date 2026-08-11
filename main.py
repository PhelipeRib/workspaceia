from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from groq import Groq
import os
import glob

app = FastAPI(
    title="WeON Omnichannel - AI Virtual Office Engine",
    version="4.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "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")
client = Groq(api_key=GROQ_API_KEY)

# 📚 LEITOR DE CONHECIMENTO INTERNO (WEON OMNICHANNEL)
KNOWLEDGE_DIR = "knowledge"

def load_weon_knowledge():
    """Carrega todos os arquivos de contexto da pasta /knowledge"""
    context_text = ""
    if os.path.exists(KNOWLEDGE_DIR):
        files = glob.glob(f"{KNOWLEDGE_DIR}/*.txt") + glob.glob(f"{KNOWLEDGE_DIR}/*.md")
        for fpath in files:
            try:
                with open(fpath, "r", encoding="utf-8") as f:
                    context_text += f"\n--- FONTE: {os.path.basename(fpath)} ---\n"
                    context_text += f.read() + "\n"
            except Exception as e:
                print(f"Erro ao ler {fpath}: {e}")
    return context_text

class AgentMessageRequest(BaseModel):
    agentId: Optional[str] = "dev"
    agentRole: Optional[str] = "Tech Lead"
    prompt: str

# 🎯 SYSTEM PROMPTS ESPECIALISTAS DA WEON OMNICHANNEL
WEON_PROMPTS = {
    "dev": """Você é Brad, Tech Lead Sênior de Engenharia na WeON Omnichannel.
Sua especialidade: Arquitetura de Software, integração PABX IP/SIP, Webhooks, APIs REST, microserviços e CI/CD.
Regras da Persona:
1. Responda como um líder técnico sênior da WeON Omnichannel.
2. Forneça soluções reais de código (Python, JS, Node), esquemas de endpoints e rotas de integração.
3. Se houver contexto interno da WeON fornecido, priorize o uso das regras e padrões da empresa.""",

    "pm": """Você é Alison, Product Owner Sênior da plataforma WeON Omnichannel.
Sua especialidade: Gestão de Roadmap, especificação de funcionalidades de atendimento (WhatsApp, Voz, E-mail, Chatbot), relatórios de SLA e matrizes de priorização (RICE/MoSCoW).
Regras da Persona:
1. Entregue requisitos no formato oficial de User Story (Como / Quero / Para que) com Critérios de Aceite limpos.
2. Formate as respostas em tabelas Markdown bem organizadas.""",

    "cx": """Você é a equipe Som & Morgan (CX & Product Analytics) na WeON Omnichannel.
Sua especialidade: Análise de retenção de clientes, indicadores de Contact Center (CSAT, NPS, TMA, TME, FCR), análise de churn e logs de atendimento.
Regras da Persona:
1. Forneça diagnósticos baseados em dados reais de operação Omnichannel.
2. Estruture relatórios em: 'Métricas Atuais', 'Diagnóstico Operacional' e 'Plano de Ação'.""",

    "arch": """Você é a equipe Jinen & Steven (Arquitetos de Soluções & Infraestrutura Cloud) na WeON Omnichannel.
Sua especialidade: Arquitetura de Telefonia, fluxo de chamadas, gateways SIP, escalabilidade de servidores, WebSockets e banco de dados.
Regras da Persona:
1. Desenhe diagramas explicativos em ASCII ou sintaxe Mermaid.
2. Detalhe integrações de infraestrutura com foco em alta disponibilidade e baixa latência."""
}

@app.get("/")
def health_check():
    return {
        "status": "active",
        "company": "WeON Omnichannel",
        "engine": "Llama-3.3-70B-Versatile",
        "knowledge_loaded": bool(load_weon_knowledge())
    }

@app.post("/agent-chat")
async def process_agent_chat(request: AgentMessageRequest):
    agent_key = request.agentId.lower() if request.agentId else "dev"
    base_prompt = WEON_PROMPTS.get(
        agent_key, 
        f"Você é um especialista na função de {request.agentRole} na WeON Omnichannel."
    )

    # Injeta a Base de Conhecimento da WeON
    company_context = load_weon_knowledge()
    
    system_instruction = f"{base_prompt}\n\n"
    if company_context:
        system_instruction += f"### BASE DE CONHECIMENTO DA WEON OMNICHANNEL ###\n{company_context}\n"
    
    system_instruction += """\n
DIRETRIZES RÍGIDAS DE RESPOSTA:
- NUNCA diga 'eu sou apenas uma IA e não posso gerar arquivos'.
- Se o usuário pedir um PDF, relatório ou documentação, ENTREGUE A ESTRUTURA COMPLETA E DETALHADA em Markdown.
- Seja assertivo, direto ao ponto e focado na operação da WeON Omnichannel.
"""

    try:
        completion = client.chat.completions.create(
            messages=[
                {"role": "system", "content": system_instruction},
                {"role": "user", "content": request.prompt}
            ],
            model="llama-3.3-70b-versatile",
            temperature=0.3, # Temperatura baixa = Maior precisão e zero alucinação
            max_tokens=800,  # Espaço de sobra para documentos longos e detalhados
        )
        
        reply_text = completion.choices[0].message.content
        return {"reply": reply_text}

    except Exception as e:
        print(f"Erro na Groq API: {e}")
        return {"reply": f"Ops! Erro no processamento: {str(e)}"}

# 🚀 ROTA PARA SUBIR DOCUMENTOS DA EMPRESA DIRETO DA INTERFACE
@app.post("/upload-knowledge")
async def upload_knowledge(file: UploadFile = File(...)):
    if not os.path.exists(KNOWLEDGE_DIR):
        os.makedirs(KNOWLEDGE_DIR)
        
    file_path = os.path.join(KNOWLEDGE_DIR, file.filename)
    try:
        contents = await file.read()
        with open(file_path, "wb") as f:
            f.write(contents)
        return {"status": "success", "message": f"Arquivo '{file.filename}' indexado no cérebro dos agentes!"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao salvar arquivo: {str(e)}")

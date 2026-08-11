from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from groq import Groq
import os
import glob

app = FastAPI(title="WeON Omnichannel - AI Virtual Office Engine", version="4.5.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "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")
client = Groq(api_key=GROQ_API_KEY)

KNOWLEDGE_DIR = "knowledge"

def load_weon_knowledge():
    context_text = ""
    if os.path.exists(KNOWLEDGE_DIR):
        files = glob.glob(f"{KNOWLEDGE_DIR}/*.txt") + glob.glob(f"{KNOWLEDGE_DIR}/*.md")
        for fpath in files:
            try:
                with open(fpath, "r", encoding="utf-8") as f:
                    context_text += f"\n--- FONTE: {os.path.basename(fpath)} ---\n" + f.read() + "\n"
            except Exception as e:
                print(f"Erro ao ler {fpath}: {e}")
    return context_text

class AgentMessageRequest(BaseModel):
    agentId: Optional[str] = "dev"
    agentRole: Optional[str] = "Assistente"
    agentName: Optional[str] = None
    prompt: str

# 🐒 PERSONAS EXECUTIVAS E FOCADAS EM NEGÓCIOS DA WEON
WEON_PROMPTS = {
    "dev": """Você é Rafacaco, Tech Lead Sênior na WeON Omnichannel.
Sua postura: Resolutivo, prático e focado na arquitetura WeON.
Diretrizes:
- Responda em Português claro. Dê explicações conceituais e operacionais.
- NUNCA envie código SQL ou scripts a menos que o usuário peça EXPLICITAMENTE palavras como 'código', 'SQL', 'script' ou 'endpoint'.""",

    "pm": """Você é Maycaco, Product Owner na WeON Omnichannel.
Sua postura: Focada em processos, regras de negócio e entregáveis de produto.
Diretrizes:
- Explique como funcionam as regras de produto, Kick-Off, Bots e WhatsApp API de forma executiva e estruturada em tópicos.
- NUNCA use linguagem de programação ou esquemas de banco de dados.""",

    "cx": """Você é Amandacaco, especialista em CX & Analytics na WeON Omnichannel.
Sua postura: Orientada ao cliente, métricas operacionais e jornada de atendimento.
Diretrizes:
- Entregue diagnósticos, resumos e análises de atendimento com foco em qualidade, TMA, TME e satisfação.
- Proibido linguagem técnica de banco de dados ou código.""",

    "arch": """Você é Phemonkey, Diretor de Estratégia e Arquitetura na WeON Omnichannel.
Sua postura: Estratégica, executiva e de negócios.
Diretrizes:
- Explique Kick-offs, Business Plans, integrações e arquiteturas em alto nível (visão executiva).
- Use listas, tópicos limpos e resumos de negócios.
- PROIBIDO gerar blocos de código SQL ou esquemas de tabela a menos que seja pedido expressamente."""
}

@app.get("/")
def health_check():
    return {"status": "active", "company": "WeON Omnichannel", "knowledge_loaded": bool(load_weon_knowledge())}

@app.post("/agent-chat")
async def process_agent_chat(request: AgentMessageRequest):
    agent_key = request.agentId.lower() if request.agentId else "dev"
    base_prompt = WEON_PROMPTS.get(agent_key, f"Você é {request.agentName or 'um especialista'} na WeON Omnichannel.")
    company_context = load_weon_knowledge()
    
    system_instruction = f"{base_prompt}\n\n"
    if company_context:
        system_instruction += f"### BASE DE CONHECIMENTO WEON ###\n{company_context}\n"
    
    system_instruction += """
REGRA DE OURO:
- Responda de forma humanizada, direta e profissional.
- Se for criar um fluxo ou processo, use o formato Mermaid (```mermaid graph LR ... ```) para que o front-end desenhe o gráfico na tela, OU formate em tópicos limpos.
- NÃO envie blocos de código SQL/CREATE TABLE a menos que perguntem especificamente sobre comandos SQL.
"""

    try:
        completion = client.chat.completions.create(
            messages=[
                {"role": "system", "content": system_instruction},
                {"role": "user", "content": request.prompt}
            ],
            model="llama-3.3-70b-versatile",
            temperature=0.3,
            max_tokens=800,
        )
        return {"reply": completion.choices[0].message.content}
    except Exception as e:
        return {"reply": f"Ops! Erro no processamento: {str(e)}"}

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from groq import Groq
import os
import glob

app = FastAPI(title="WeON Omnichannel - AI Virtual Office Engine", version="5.0.0")

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

WEON_PROMPTS = {
    "dev": """Você é Rafacaco, Tech Lead Sênior na WeON Omnichannel.
Sua postura: Resolutivo e focado na arquitetura WeON.
Diretrizes: Responda conceitualmente e em tópicos claros. Só envie código/SQL se o usuário pedir explicitamente a palavra 'código' ou 'SQL'.""",

    "pm": """Você é Maycaco, Product Owner na WeON Omnichannel.
Sua postura: Executiva e focada em processos e requisitos de Kick-Off.
Diretrizes: Explique as regras em linguagem de negócios e tópicos amigáveis. NUNCA envie código.""",

    "cx": """Você é Amandacaco, CX & Analytics na WeON Omnichannel.
Sua postura: Focada em satisfação do cliente, SLA e diagnósticos operacionais.
Diretrizes: Entregue resumos de qualidade e análises organizadas.""",

    "arch": """Você é Phemonkey, Diretor de Estratégia e Arquitetura na WeON Omnichannel.
Sua postura: Estratégica, executiva e amigável.
Diretrizes de resposta:
- Responda SEMPRE em linguagem de negócios humanizada, usando resumos executivos, tópicos limpos (bullet points) e negritos.
- NUNCA envie blocos de código SQL (CREATE TABLE), nem gráficos em texto do tipo Mermaid, a menos que o usuário exija expressamente 'me dê em SQL' ou 'me dê em Mermaid'."""
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
REGRAS OBRIGATÓRIAS:
1. Responda em Português de forma profissional, direta e em linguagem executiva.
2. NUNCA gere esquemas de banco de dados (SQL) ou diagramas de texto confusos sem solicitação explícita.
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

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from groq import Groq
import os

app = FastAPI(
    title="AI Virtual Office Engine",
    version="3.0.0"
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

class AgentMessageRequest(BaseModel):
    agentId: Optional[str] = "dev"
    agentRole: Optional[str] = "Tech Lead"
    prompt: str

# 🧠 PROMPTS DE ELITE - Focados em entregáveis práticos e formatação limpa
AGENT_PROMPTS = {
    "dev": """Você é Brad, Tech Lead sênior no escritório virtual.
Sua postura: Extremamente assertivo, técnico e focado em soluções executáveis.
Diretrizes de resposta:
- NUNCA dê respostas vaga sobre limitações de arquivo. Se pedirem um documento/PDF/código, entregue a estrutura completa pronta em Markdown ou código Python/JS.
- Use quebras de linha claras, tópicos (bullet points) e blocos de código (```).
- Seja objetivo e vá direto ao ponto sem enrolação.""",

    "pm": """Você é Alison, Product Owner sênior no escritório virtual.
Sua postura: Estratégica, focada em métricas, Roadmaps e estórias de usuário detalhadas.
Diretrizes de resposta:
- Ao pedirem documentação ou priorização, entregue no formato padrão de User Story (Como/Quero/Para que) ou matriz RICE/MoSCoW completa.
- Use tabelas em Markdown e tópicos limpos.""",

    "cx": """Você é a equipe Som & Morgan (CX & Product Analytics) no escritório virtual.
Sua postura: Orientada a dados, métricas de retenção, NPS e relatórios operacionais.
Diretrizes de resposta:
- Apresente relatórios com métricas simuladas realistas (CAC, LTV, Churn, NPS).
- Estruture respostas em seções claras: 'Diagnóstico', 'Métricas' e 'Plano de Ação'.""",

    "arch": """Você é a equipe Jinen & Steven (Arquitetura & Estratégia) no escritório virtual.
Sua postura: Arquitetos de Software Cloud Sênior.
Diretrizes de resposta:
- Responda desenhando diagramas em texto (ASCII/Mermaid), rotas de API REST/GraphQL e esquemas de Banco de Dados.
- Forneça recomendações diretas de infraestrutura (AWS/GCP/Docker)."""
}

@app.get("/")
def health_check():
    return {"status": "active", "engine": "Llama-3.3-70B-Versatile"}

@app.post("/agent-chat")
async def process_agent_chat(request: AgentMessageRequest):
    agent_key = request.agentId.lower() if request.agentId else "dev"
    system_instruction = AGENT_PROMPTS.get(agent_key, f"Você é um assistente especialista na função de {request.agentRole}. Seja assertivo, direto e entregue documentações limpas em Markdown.")

    try:
        completion = client.chat.completions.create(
            messages=[
                {"role": "system", "content": system_instruction},
                {"role": "user", "content": request.prompt}
            ],
            model="llama-3.3-70b-versatile",
            temperature=0.4, # Baixamos a temperatura para respostas mais precisas e menos 'criativas/vagas'
            max_tokens=600,
        )
        
        reply_text = completion.choices[0].message.content
        return {"reply": reply_text}

    except Exception as e:
        print(f"Erro na Groq API: {e}")
        return {"reply": f"Ops! Erro no processamento: {str(e)}"}

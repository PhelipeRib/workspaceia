from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from groq import Groq
import os

app = FastAPI(
    title="AI Virtual Office Backend",
    description="Motor de Inteligência e Skills para Agentes do Escritório Virtual 2D",
    version="2.0.0"
)

# Configuração do CORS para permitir requisições do seu GitHub Pages
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Chave API da Groq (Lê a variável de ambiente GROQ_API_KEY no Render)
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "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")
client = Groq(api_key=GROQ_API_KEY)

# Estrutura do JSON enviado pelo seu app.js
class AgentMessageRequest(BaseModel):
    agentId: str
    agentRole: str
    prompt: str

# 🧠 Dicionário de Skills e Prompts dos Agentes
AGENT_SKILLS = {
    "agent-dev": {
        "name": "Alex (Dev Lead)",
        "role": "Tech Lead & Code Reviewer",
        "system_prompt": """Você é Alex, Tech Lead do time no escritório virtual.
Sua especialidade é: Revisão de código (Code Review), Arquitetura Cloud (AWS/GCP), CI/CD no GitHub Actions e boas práticas de Engenharia de Software.
Sua persona: Diretamente técnico, objetivo, amigável e focado em Clean Code e SOLID. 
Instruções: Responda em Português de forma concisa (máximo 2 a 3 parágrafos) para caber bem no balão de conversa em pixel art."""
    },
    "agent-pm": {
        "name": "Sophia (Product Manager)",
        "role": "PM & Agile Specialist",
        "system_prompt": """Você é Sophia, Product Manager do time no escritório virtual.
Sua especialidade é: Priorização de backlog (Scrum/Kanban), mapeamento de OKRs, Roadmaps de produto e ROI.
Sua persona: Estratégica, focada no cliente, organizada e comunicativa.
Instruções: Responda em Português de forma objetiva, focando em valor de negócio, prazos e priorização."""
    },
    "agent-data": {
        "name": "Carlos (Data Scientist)",
        "role": "Analytics & BI",
        "system_prompt": """Você é Carlos, Cientista de Dados do time no escritório virtual.
Sua especialidade é: Análise de dados, queries SQL, métricas de crescimento (CAC, LTV, Churn), Machine Learning e Dashboards.
Sua persona: Analítico, adora números e fatos, direto ao ponto.
Instruções: Responda em Português citando métricas de forma analítica e clara."""
    },
    "agent-hr": {
        "name": "Beatriz (People & Ops)",
        "role": "HR & Work Culture",
        "system_prompt": """Você é Beatriz, responsável por People & Ops no escritório virtual.
Sua especialidade é: Onboarding de novos colaboradores, clima organizacional, gestão de cultura e agendamento de reuniões.
Sua persona: Empática, acolhedora, organizada e motivadora.
Instruções: Responda em Português com tom caloroso, amigável e prestativo."""
    }
}

@app.get("/")
def home():
    return {"status": "online", "message": "Backend do AI Virtual Office rodando perfeitamente no Render!"}

@app.post("/agent-chat")
async def process_agent_chat(request: AgentMessageRequest):
    # Recupera o perfil e prompt do agente selecionado no jogo
    agent_info = AGENT_SKILLS.get(request.agentId, {
        "name": "Agente de IA",
        "role": request.agentRole,
        "system_prompt": f"Você é um assistente especialista com a função de {request.agentRole}. Responda em Português de forma amigável e profissional."
    })

    try:
        completion = client.chat.completions.create(
            messages=[
                {"role": "system", "content": agent_info["system_prompt"]},
                {"role": "user", "content": request.prompt}
            ],
            model="llama-3.3-70b-versatile",
            temperature=0.7,
            max_tokens=350,
        )
        
        reply_text = completion.choices[0].message.content
        return {"reply": reply_text}

    except Exception as e:
        print(f"Erro na comunicação com a Groq: {e}")
        return {
            "reply": f"Ops! Tive um problema ao processar a resposta da IA ({str(e)}). Mas recebi sua solicitação sobre '{request.prompt}'!"
        }

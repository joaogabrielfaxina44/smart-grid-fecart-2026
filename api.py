from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from backend.orchestrator import Orchestrator

# Inicialização Global
orchestrator = Orchestrator(clima_inicial="ensolarado")

app = FastAPI(title="Smart Grid API")

# Configuração de CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class FalhaRequest(BaseModel):
    origem: str
    destino: str

@app.get("/estado")
def get_estado():
    grafo = orchestrator.grafo
    estado = orchestrator.estado

    nos = []
    for node_id, data in grafo.graph.nodes(data=True):
        nos.append({
            "id": node_id,
            "tipo": data.get("tipo"),
            "demanda_atual": data.get("demanda_kw_atual"),
            "status_energizado": data.get("status_energizado")
        })

    arestas = []
    for u, v, data in grafo.graph.edges(data=True):
        arestas.append({
            "origem": u,
            "destino": v,
            "fluxo_atual": data.get("fluxo_kw_atual"),
            "capacidade": data.get("capacidade_maxima_kw"),
            "status_ativa": data.get("status_ativa")
        })

    return {
        "hora_atual": estado.hora_atual,
        "clima": estado.clima,
        "nos": nos,
        "arestas": arestas
    }

@app.post("/avancar_tempo")
def avancar_tempo():
    # Avança o relógio da simulação em 1 hora (60 minutos)
    orchestrator.tick(minutos=60)
    return get_estado()

@app.post("/simular_falha")
def simular_falha(req: FalhaRequest):
    # Desativa a aresta específica
    orchestrator.injetar_falha(req.origem, req.destino)
    
    # Chama o ciclo do orquestrador para que o SelfHealingAgent (e outros agentes) atuem
    # Passamos 0 minutos para não avançar o relógio
    log = orchestrator.tick(minutos=0)
    
    estado_atual = get_estado()
    return {
        "logs": log.acoes_agentes,
        "estado": estado_atual
    }

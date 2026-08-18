from backend.agents.base_agent import BaseAgent
from backend.smart_grid_graph import SmartGridGraph
from backend.city_state import CityState


class SmartLightingAgent(BaseAgent):
    nome = "Agente de Iluminação Pública Inteligente"
    prioridade = 60

    def executar(self, grafo: SmartGridGraph, estado: CityState) -> list[str]:
        logs = []
        hora = estado.hora_atual
        clima = estado.clima

        deve_ligar = False
        if hora >= 18.0 or hora < 6.0 or clima == "tempestade":
            deve_ligar = True
            
        if deve_ligar and not estado.iluminacao_publica:
            estado.iluminacao_publica = True
            for node_id, data in grafo.graph.nodes(data=True):
                if not data.get("is_subestacao") and "Geração" not in data.get("tipo", ""):
                    base = data.get("demanda_base_kw", 0.0)
                    # Aumenta 3% do base ou atual, o prompt diz "+3% to all node demands"
                    # Vamos adicionar 3% da demanda base para manter consistência sem acumular erro
                    atual = data.get("demanda_kw_atual", 0.0)
                    grafo.graph.nodes[node_id]["demanda_kw_atual"] = atual + (base * 0.03)
            logs.append(f"[{self.nome}] Iluminação pública LIGADA.")
            
        elif not deve_ligar and estado.iluminacao_publica:
            estado.iluminacao_publica = False
            for node_id, data in grafo.graph.nodes(data=True):
                if not data.get("is_subestacao") and "Geração" not in data.get("tipo", ""):
                    base = data.get("demanda_base_kw", 0.0)
                    atual = data.get("demanda_kw_atual", 0.0)
                    grafo.graph.nodes[node_id]["demanda_kw_atual"] = max(0.0, atual - (base * 0.03))
            logs.append(f"[{self.nome}] Iluminação pública DESLIGADA.")

        return logs

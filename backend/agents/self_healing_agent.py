from backend.agents.base_agent import BaseAgent
from backend.smart_grid_graph import SmartGridGraph
from backend.city_state import CityState


class SelfHealingAgent(BaseAgent):
    nome = "Agente de Self-Healing"
    prioridade = 50

    def executar(self, grafo: SmartGridGraph, estado: CityState) -> list[str]:
        logs = []

        nos_desenergizados = grafo.nos_desenergizados()
        
        # Atualiza falhas_ativas no estado (opcional, manter rastreio)
        falhas = []
        for u, v, data in grafo.graph.edges(data=True):
            if not data.get("status_ativa", True):
                falhas.append((u, v))
        estado.falhas_ativas = falhas

        if not nos_desenergizados:
            # Garante que todos os nós sem flag de desenergizado fiquem com status_energizado=True
            for node_id in grafo.graph.nodes():
                grafo.graph.nodes[node_id]["status_energizado"] = True
            return logs

        logs.append(f"[{self.nome}] Detectados nós sem energia: {', '.join(nos_desenergizados)}")

        for node_id in nos_desenergizados:
            rota = grafo.recalcular_rota_critica(node_id)
            if rota:
                logs.append(f"[{self.nome}] Rota alternativa encontrada para {node_id}: {' -> '.join(rota)}")
                grafo.graph.nodes[node_id]["status_energizado"] = True
                
                # Validar capacidade (simplificado: verifica se as arestas da rota suportam a demanda do nó)
                demanda = grafo.graph.nodes[node_id].get("demanda_kw_atual", 0.0)
                if demanda > 0:
                    for i in range(len(rota) - 1):
                        u = rota[i]
                        v = rota[i+1]
                        cap = grafo.graph[u][v].get("capacidade_maxima_kw", 0.0)
                        # Idealmente isso seria integrado com o fluxo, mas self-healing tenta ligar de qualquer forma.
                        # Se não suporta, pode avisar.
                        if cap < demanda:
                            logs.append(f"[{self.nome}] AVISO: Rota para {node_id} via {u}-{v} pode causar sobrecarga (Capacidade: {cap} < Demanda: {demanda:.1f})")
                            
            else:
                logs.append(f"[{self.nome}] FALHA CRÍTICA: Sem rota alternativa para {node_id}. Nó permanecerá desenergizado.")
                grafo.graph.nodes[node_id]["status_energizado"] = False
                grafo.graph.nodes[node_id]["demanda_kw_atual"] = 0.0 # Se não tem energia, demanda fica zero efetivamente.

        return logs

from backend.agents.base_agent import BaseAgent
from backend.smart_grid_graph import SmartGridGraph
from backend.city_state import CityState


class DemandResponseAgent(BaseAgent):
    nome = "Agente de Resposta à Demanda"
    prioridade = 40
    
    def __init__(self):
        self.cortes_aplicados = {} # node_id -> multiplicador_atual (e.g. 0.75 for 25% cut)

    def executar(self, grafo: SmartGridGraph, estado: CityState) -> list[str]:
        logs = []
        
        # Gradual restoration
        nos_para_restaurar = list(self.cortes_aplicados.keys())
        for node_id in nos_para_restaurar:
            if self.cortes_aplicados[node_id] < 1.0:
                self.cortes_aplicados[node_id] = min(1.0, self.cortes_aplicados[node_id] + 0.05)
                if self.cortes_aplicados[node_id] == 1.0:
                    del self.cortes_aplicados[node_id]

        demanda_total = grafo.demanda_total_kw()
        capacidade_total = grafo.capacidade_total_subestacoes_kw()
        
        corte_global = False
        if capacidade_total > 0 and demanda_total > 0.95 * capacidade_total:
            corte_global = True
            logs.append(f"[{self.nome}] GATILHO 2: Demanda total excedeu 95% da capacidade. Aplicando corte de 30%.")

        nos_em_risco = set()
        if estado.alertas_manutencao:
            for alerta in estado.alertas_manutencao:
                if alerta.severidade == "RISCO_SUPERAQUECIMENTO":
                    nos_em_risco.add(alerta.aresta[0])
                    nos_em_risco.add(alerta.aresta[1])
            if nos_em_risco:
                logs.append(f"[{self.nome}] GATILHO 1: Recebido alerta de SUPERAQUECIMENTO. Aplicando corte de 25% nos nós afetados.")
                
        if not corte_global and not nos_em_risco:
            # Apenas aplicar cortes existentes (restauração gradual)
            self._aplicar_cortes(grafo)
            if self.cortes_aplicados:
                logs.append(f"[{self.nome}] Restaurando energia gradualmente (+5%).")
            return logs

        # Ordenar os nós (cortar prioridade 3 primeiro, depois 2). Nunca cortar 1.
        for prioridade_alvo in [3, 2]:
            for node_id, data in grafo.graph.nodes(data=True):
                if data.get("is_subestacao"):
                    continue
                    
                prioridade = data.get("prioridade_de_vida", 3)
                if prioridade == 1:
                    continue # Nunca corta hospitais/data centers
                    
                tipo = data.get("tipo", "")
                is_alvo_corte = ("Comercial" in tipo or "Indústria" in tipo or "Grandes Edifícios" in tipo)
                
                if prioridade == prioridade_alvo and is_alvo_corte:
                    if corte_global:
                        novo_corte = 0.70 # 30% cut
                    elif node_id in nos_em_risco:
                        novo_corte = 0.75 # 25% cut
                    else:
                        continue
                        
                    # Pega o pior cenário entre o corte atual e o novo corte necessário
                    corte_atual = self.cortes_aplicados.get(node_id, 1.0)
                    self.cortes_aplicados[node_id] = min(corte_atual, novo_corte)

        self._aplicar_cortes(grafo)
        
        return logs

    def _aplicar_cortes(self, grafo: SmartGridGraph):
        for node_id, mult in self.cortes_aplicados.items():
            if mult < 1.0:
                atual = grafo.graph.nodes[node_id].get("demanda_kw_atual", 0.0)
                grafo.graph.nodes[node_id]["demanda_kw_atual"] = atual * mult

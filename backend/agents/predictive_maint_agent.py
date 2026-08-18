from backend.agents.base_agent import BaseAgent
from backend.smart_grid_graph import SmartGridGraph
from backend.city_state import CityState, AlertaManutencao


class PredictiveMaintAgent(BaseAgent):
    nome = "Agente de Manutenção Preditiva"
    prioridade = 30
    
    def __init__(self):
        self.historico_sobrecarga = {} # (u, v) -> horas_acima_90

    def executar(self, grafo: SmartGridGraph, estado: CityState) -> list[str]:
        logs = []
        
        # Primeiro, precisamos calcular o fluxo atual em cada aresta
        grafo.calcular_fluxo_arestas()
        
        novos_alertas = []
        
        for u, v, data in grafo.graph.edges(data=True):
            if not data.get("status_ativa"):
                continue
                
            fluxo = data.get("fluxo_kw_atual", 0.0)
            capacidade = data.get("capacidade_maxima_kw", 1.0)
            taxa_carga = fluxo / capacidade
            
            aresta = (u, v)
            if aresta not in self.historico_sobrecarga:
                self.historico_sobrecarga[aresta] = 0.0
                
            if taxa_carga > 0.90:
                self.historico_sobrecarga[aresta] += 0.25 # assumindo tick de 15 min
                
                if self.historico_sobrecarga[aresta] >= 2.0:
                    alerta = AlertaManutencao(
                        aresta=aresta,
                        taxa_carga=taxa_carga,
                        horas_acima_90=self.historico_sobrecarga[aresta],
                        severidade="RISCO_SUPERAQUECIMENTO"
                    )
                    novos_alertas.append(alerta)
                    logs.append(f"[{self.nome}] ALERTA CRÍTICO: Linha {u}-{v} operando acima de 90% por {self.historico_sobrecarga[aresta]:.1f}h! Taxa atual: {taxa_carga*100:.1f}%")
            
            elif taxa_carga <= 0.85:
                # Hysteresis reset
                if self.historico_sobrecarga[aresta] > 0:
                    self.historico_sobrecarga[aresta] = 0.0
                    logs.append(f"[{self.nome}] Linha {u}-{v} estabilizada (Taxa: {taxa_carga*100:.1f}%). Risco descartado.")

        estado.alertas_manutencao = novos_alertas
        return logs

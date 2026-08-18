from dataclasses import dataclass
from typing import Any

from backend.smart_grid_graph import SmartGridGraph
from backend.city_state import CityState
from backend.agents import (
    PeakHourAgent,
    DistributedGenAgent,
    PredictiveMaintAgent,
    DemandResponseAgent,
    SelfHealingAgent,
    SmartLightingAgent,
)


@dataclass
class SimulationLog:
    hora: float
    clima: str
    luminosidade: float
    acoes_agentes: list[str]
    demanda_total: float


class Orchestrator:
    def __init__(self, grafo=None, clima_inicial="ensolarado"):
        self.grafo = grafo if grafo else SmartGridGraph()
        self.estado = CityState(hora_atual=0.0, clima=clima_inicial)
        
        # Instantiate agents in priority order
        self.agentes = [
            PeakHourAgent(),
            DistributedGenAgent(),
            PredictiveMaintAgent(),
            DemandResponseAgent(),
            SelfHealingAgent(),
            SmartLightingAgent(),
        ]
        self.agentes.sort(key=lambda a: a.prioridade)

    def tick(self, minutos=15) -> SimulationLog:
        # Advance clock
        nova_hora = self.estado.hora_atual + (minutos / 60.0)
        if nova_hora >= 24.0:
            nova_hora -= 24.0
            
        self.estado.atualizar_hora_clima(nova_hora, self.estado.clima)
        
        logs_agentes = []
        
        # Run agents
        for agente in self.agentes:
            logs = agente.executar(self.grafo, self.estado)
            logs_agentes.extend(logs)
            
        return SimulationLog(
            hora=self.estado.hora_atual,
            clima=self.estado.clima,
            luminosidade=self.estado.luminosidade,
            acoes_agentes=logs_agentes,
            demanda_total=self.grafo.demanda_total_kw()
        )

    def simular_dia(self, passo_min=15) -> list[SimulationLog]:
        logs = []
        ticks = int((24 * 60) / passo_min)
        
        for _ in range(ticks):
            log = self.tick(minutos=passo_min)
            logs.append(log)
            
        return logs

    def injetar_falha(self, origem: str, destino: str):
        self.grafo.simular_falha(origem, destino)

    def alterar_clima(self, novo_clima: str):
        self.estado.atualizar_hora_clima(self.estado.hora_atual, novo_clima)

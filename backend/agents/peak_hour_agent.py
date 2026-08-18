from backend.agents.base_agent import BaseAgent
from backend.smart_grid_graph import SmartGridGraph
from backend.city_state import CityState


class PeakHourAgent(BaseAgent):
    nome = "Agente de Perfil de Consumo"
    prioridade = 10

    def executar(self, grafo: SmartGridGraph, estado: CityState) -> list[str]:
        logs = []
        hora = estado.hora_atual

        if 0.0 <= hora < 5.0:
            fator_res, fator_com, fator_ind, fator_hosp = 0.60, 0.60, 0.75, 0.90
            periodo = "Madrugada"
        elif 5.0 <= hora < 8.0:
            fator_res, fator_com, fator_ind, fator_hosp = 0.85, 0.70, 0.90, 1.00
            periodo = "Manhã"
        elif 8.0 <= hora < 18.0:
            fator_res, fator_com, fator_ind, fator_hosp = 0.80, 1.20, 1.15, 1.00
            periodo = "Comercial"
        elif 18.0 <= hora < 21.0:
            fator_res, fator_com, fator_ind, fator_hosp = 1.60, 1.10, 0.90, 1.05
            periodo = "Pico"
        else:
            fator_res, fator_com, fator_ind, fator_hosp = 1.10, 0.75, 0.70, 0.95
            periodo = "Noite"

        logs.append(f"[{self.nome}] Ajustando consumo para período: {periodo}")

        for node_id, data in grafo.graph.nodes(data=True):
            if data.get("is_subestacao"):
                continue

            tipo = data.get("tipo", "")
            base = data.get("demanda_base_kw", 0.0)

            fator = 1.0
            if "Residencial" in tipo:
                fator = fator_res
            elif "Comercial" in tipo or "Grandes Edifícios" in tipo or "Público" in tipo:
                fator = fator_com
            elif "Indústria" in tipo:
                fator = fator_ind
            elif "Hospital" in tipo:
                fator = fator_hosp

            # Se for Geração e demanda negativa, não mexe nesse agente
            if "Geração" in tipo:
                continue

            nova_demanda = base * fator
            grafo.graph.nodes[node_id]["demanda_kw_atual"] = nova_demanda

        return logs

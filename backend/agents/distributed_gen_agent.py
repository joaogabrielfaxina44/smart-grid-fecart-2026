from backend.agents.base_agent import BaseAgent
from backend.smart_grid_graph import SmartGridGraph
from backend.city_state import CityState


class DistributedGenAgent(BaseAgent):
    nome = "Agente de Geração Distribuída"
    prioridade = 20

    def executar(self, grafo: SmartGridGraph, estado: CityState) -> list[str]:
        logs = []
        hora = estado.hora_atual
        clima = estado.clima

        if 7.0 <= hora < 17.0:
            if clima == "ensolarado":
                fator_solar, fator_eolica = 1.0, 0.4
            elif clima == "nublado":
                fator_solar, fator_eolica = 0.45, 0.6
            elif clima == "chuvoso":
                fator_solar, fator_eolica = 0.15, 0.8
            else: # tempestade
                fator_solar, fator_eolica = 0.0, 0.0
        else:
            fator_solar = 0.0
            if clima == "ensolarado":
                fator_eolica = 0.4
            elif clima == "nublado":
                fator_eolica = 0.6
            elif clima == "chuvoso":
                fator_eolica = 0.8
            else: # tempestade
                fator_eolica = 0.0

        logs.append(f"[{self.nome}] Clima: {clima} | Fator Solar: {fator_solar*100:.0f}% | Fator Eólica: {fator_eolica*100:.0f}%")

        geracao_por_no = 15.0 * fator_solar + 5.0 * fator_eolica # Exemplo de ajuste (max 20kw)

        if geracao_por_no > 0:
            # Injecting kW into residential/commercial nodes
            for node_id, data in grafo.graph.nodes(data=True):
                tipo = data.get("tipo", "")
                if "Residencial" in tipo or "Comercial" in tipo:
                    # Reduz demanda
                    atual = data.get("demanda_kw_atual", 0.0)
                    grafo.graph.nodes[node_id]["demanda_kw_atual"] = max(0.0, atual - geracao_por_no)

            logs.append(f"[{self.nome}] Injetou ~{geracao_por_no:.1f} kW via microgeradores residenciais/comerciais.")

        # Ajusta SOLAR node
        if "SOLAR" in grafo.graph:
            base_solar = abs(grafo.graph.nodes["SOLAR"].get("demanda_base_kw", 280))
            geracao_solar = base_solar * fator_solar
            grafo.graph.nodes["SOLAR"]["demanda_kw_atual"] = -geracao_solar
            logs.append(f"[{self.nome}] Fazenda Solar gerando {geracao_solar:.1f} kW.")

        return logs

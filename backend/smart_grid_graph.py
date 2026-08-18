"""Modelo matemático da rede elétrica usando grafos.

Este módulo representa a cidade como uma malha de nós consumidores/geradores
e linhas de transmissão. Ele é a base para os agentes de IA e para uma futura
API com FastAPI.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import networkx as nx


@dataclass(frozen=True)
class NodeSpec:
    """Definição inicial de um setor da cidade."""

    node_id: str
    nome: str
    tipo: str
    demanda_base_kw: float
    prioridade_de_vida: int
    is_subestacao: bool = False
    capacidade_maxima_kw: float = 0.0


@dataclass(frozen=True)
class EdgeSpec:
    """Definição inicial de uma linha de transmissão."""

    origem: str
    destino: str
    capacidade_maxima_kw: float
    distancia_km: float


class SmartGridGraph:
    """Grafo principal da rede energética da cidade."""

    def __init__(self) -> None:
        self.graph = nx.Graph()
        self._build_default_city()

    def _build_default_city(self) -> None:
        """Cria uma cidade de médio porte com setores e redundâncias."""

        nodes = [
            NodeSpec("SUB_CENTRAL", "Subestação Central", "Subestação", 0, 0, True, 1200),
            NodeSpec("SUB_NORTE", "Subestação Norte", "Subestação", 0, 0, True, 650),
            NodeSpec("SUB_SUL", "Subestação Sul", "Subestação", 0, 0, True, 700),
            NodeSpec("HOSPITAL", "Hospital Principal", "Hospital", 180, 1),
            NodeSpec("RES_A", "Bairro Residencial A", "Residencial", 260, 3),
            NodeSpec("RES_B", "Bairro Residencial B", "Residencial", 230, 3),
            NodeSpec("COM_A", "Centro Comercial", "Comercial", 320, 2),
            NodeSpec("COM_B", "Shopping Metropolitano", "Grandes Edifícios", 300, 2),
            NodeSpec("IND_A", "Parque Industrial", "Indústria", 420, 2),
            NodeSpec("DATA_CENTER", "Data Center Municipal", "Grandes Edifícios", 220, 1),
            NodeSpec("ESCOLAS", "Distrito Educacional", "Público", 140, 2),
            NodeSpec("SOLAR", "Fazenda Solar Urbana", "Geração", -280, 0),
        ]

        for node in nodes:
            self.graph.add_node(
                node.node_id,
                nome=node.nome,
                tipo=node.tipo,
                demanda_base_kw=node.demanda_base_kw,
                demanda_kw_atual=node.demanda_base_kw,
                prioridade_de_vida=node.prioridade_de_vida,
                is_subestacao=node.is_subestacao,
                capacidade_maxima_kw=node.capacidade_maxima_kw,
                status_energizado=True,
            )

        edges = [
            EdgeSpec("SUB_CENTRAL", "SUB_NORTE", 700, 4.0),
            EdgeSpec("SUB_CENTRAL", "SUB_SUL", 750, 4.5),
            EdgeSpec("SUB_CENTRAL", "HOSPITAL", 350, 2.0),
            EdgeSpec("SUB_NORTE", "RES_A", 360, 2.4),
            EdgeSpec("SUB_NORTE", "COM_A", 420, 2.0),
            EdgeSpec("SUB_NORTE", "DATA_CENTER", 280, 1.8),
            EdgeSpec("SUB_SUL", "RES_B", 350, 2.2),
            EdgeSpec("SUB_SUL", "COM_B", 380, 2.1),
            EdgeSpec("SUB_SUL", "IND_A", 520, 3.2),
            EdgeSpec("SUB_SUL", "ESCOLAS", 220, 1.6),
            EdgeSpec("SOLAR", "SUB_NORTE", 300, 3.0),
            EdgeSpec("SOLAR", "SUB_SUL", 260, 4.0),
            EdgeSpec("HOSPITAL", "DATA_CENTER", 180, 2.6),
            EdgeSpec("COM_A", "COM_B", 220, 3.3),
            EdgeSpec("RES_A", "RES_B", 180, 5.0),
            EdgeSpec("IND_A", "COM_B", 250, 2.8),
        ]

        for edge in edges:
            self.graph.add_edge(
                edge.origem,
                edge.destino,
                capacidade_maxima_kw=edge.capacidade_maxima_kw,
                distancia_km=edge.distancia_km,
                status_ativa=True,
                fluxo_kw_atual=0.0,
            )

    def simular_falha(self, origem: str, destino: str) -> None:
        """Desativa uma linha de transmissão existente."""

        if not self.graph.has_edge(origem, destino):
            raise ValueError(f"Linha inexistente: {origem} -> {destino}")

        self.graph[origem][destino]["status_ativa"] = False

    def restaurar_linha(self, origem: str, destino: str) -> None:
        """Reativa uma linha de transmissão existente."""

        if not self.graph.has_edge(origem, destino):
            raise ValueError(f"Linha inexistente: {origem} -> {destino}")

        self.graph[origem][destino]["status_ativa"] = True

    def recalcular_rota_critica(self, destino: str) -> list[str] | None:
        """Encontra a melhor rota ativa para manter um nó crítico energizado.

        A busca considera apenas linhas ativas. O custo favorece linhas curtas
        e com maior capacidade, simulando uma decisão inicial de self-healing.
        """

        if destino not in self.graph:
            raise ValueError(f"Nó inexistente: {destino}")

        active_graph = self._active_transmission_graph()
        subestacoes = [
            node_id
            for node_id, data in active_graph.nodes(data=True)
            if data.get("is_subestacao")
        ]

        best_path: list[str] | None = None
        best_cost = float("inf")

        for origem in subestacoes:
            if origem == destino or not nx.has_path(active_graph, origem, destino):
                continue

            path = nx.shortest_path(active_graph, origem, destino, weight="custo_rota")
            cost = nx.path_weight(active_graph, path, weight="custo_rota")

            if cost < best_cost:
                best_path = path
                best_cost = cost

        return best_path

    def demanda_total_kw(self) -> float:
        """Retorna a demanda líquida total da cidade."""

        return sum(
            max(0.0, data["demanda_kw_atual"])
            for _, data in self.graph.nodes(data=True)
            if not data.get("is_subestacao")
        )

    def capacidade_total_subestacoes_kw(self) -> float:
        """Retorna a capacidade máxima somada das subestações."""

        return sum(
            data["capacidade_maxima_kw"]
            for _, data in self.graph.nodes(data=True)
            if data.get("is_subestacao")
        )

    def setores_por_tipo(self, tipos: set[str]) -> list[tuple[str, dict[str, Any]]]:
        """Lista nós cujo tipo pertence ao conjunto informado."""

        return [
            (node_id, data)
            for node_id, data in self.graph.nodes(data=True)
            if data.get("tipo") in tipos
        ]

    def _active_transmission_graph(self) -> nx.Graph:
        """Cria uma visão do grafo contendo apenas linhas ativas."""

        active_graph = nx.Graph()
        active_graph.add_nodes_from(self.graph.nodes(data=True))

        for origem, destino, data in self.graph.edges(data=True):
            if not data.get("status_ativa", True):
                continue

            capacity = max(data["capacidade_maxima_kw"], 1.0)
            route_cost = data["distancia_km"] / capacity
            active_graph.add_edge(origem, destino, **data, custo_rota=route_cost)

        return active_graph

    def nos_desenergizados(self) -> list[str]:
        """Retorna lista de nós que não possuem caminho ativo até nenhuma subestação."""
        active_graph = self._active_transmission_graph()
        subestacoes = [
            n for n, d in active_graph.nodes(data=True) if d.get("is_subestacao")
        ]
        
        nos_desenergizados = []
        for node_id in active_graph.nodes():
            if active_graph.nodes[node_id].get("is_subestacao"):
                continue
            
            tem_caminho = False
            for sub in subestacoes:
                if nx.has_path(active_graph, sub, node_id):
                    tem_caminho = True
                    break
                    
            if not tem_caminho:
                nos_desenergizados.append(node_id)
                
        return nos_desenergizados

    def calcular_fluxo_arestas(self) -> None:
        """Estima o fluxo de kW em cada aresta ativa."""
        # Reseta os fluxos
        for u, v in self.graph.edges():
            self.graph[u][v]["fluxo_kw_atual"] = 0.0

        active_graph = self._active_transmission_graph()
        subestacoes = [
            n for n, d in active_graph.nodes(data=True) if d.get("is_subestacao")
        ]

        # Para cada nó não-subestação, acha a rota de menor custo até uma subestação
        for node_id in active_graph.nodes():
            if active_graph.nodes[node_id].get("is_subestacao"):
                continue
            
            demanda = active_graph.nodes[node_id].get("demanda_kw_atual", 0.0)
            
            best_path = None
            best_cost = float('inf')
            
            for sub in subestacoes:
                if nx.has_path(active_graph, sub, node_id):
                    path = nx.shortest_path(active_graph, sub, node_id, weight="custo_rota")
                    cost = nx.path_weight(active_graph, path, weight="custo_rota")
                    if cost < best_cost:
                        best_cost = cost
                        best_path = path
                        
            if best_path:
                # Adiciona a demanda desse nó ao longo das arestas do caminho
                for i in range(len(best_path) - 1):
                    u = best_path[i]
                    v = best_path[i+1]
                    if self.graph.has_edge(u, v):
                        self.graph[u][v]["fluxo_kw_atual"] += abs(demanda)

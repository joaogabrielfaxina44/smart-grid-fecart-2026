"""Motor de tempo e consumo dinâmico da Smart City."""

from __future__ import annotations

from dataclasses import dataclass, field

from backend.smart_grid_graph import SmartGridGraph


@dataclass
class SimulationLog:
    """Registro resumido de um passo da simulação."""

    hora: str
    demanda_total_kw: float
    intervencoes: list[str] = field(default_factory=list)


class SmartCitySimulator:
    """Coordena o relógio virtual e os primeiros agentes da cidade."""

    PEAK_START_HOUR = 18
    PEAK_END_HOUR = 21
    LOW_DEMAND_START_HOUR = 0
    LOW_DEMAND_END_HOUR = 5

    def __init__(self, smart_grid: SmartGridGraph | None = None) -> None:
        self.smart_grid = smart_grid or SmartGridGraph()
        self.hora_atual = 0.0
        self.logs: list[SimulationLog] = []

    def avancar_tempo(self, minutos: int) -> SimulationLog:
        """Avança o relógio e executa os agentes reativos da simulação."""

        if minutos <= 0:
            raise ValueError("O avanço de tempo precisa ser maior que zero.")

        self.hora_atual = (self.hora_atual + minutos / 60) % 24

        self._aplicar_agente_horario_de_pico()
        intervencoes = self._aplicar_resposta_a_demanda()

        demanda_total = self.smart_grid.demanda_total_kw()
        log = SimulationLog(
            hora=self.hora_formatada,
            demanda_total_kw=demanda_total,
            intervencoes=intervencoes,
        )
        self.logs.append(log)
        self._imprimir_log(log)

        return log

    @property
    def hora_formatada(self) -> str:
        """Retorna o horário virtual no formato HH:MM."""

        hora = int(self.hora_atual)
        minuto = int(round((self.hora_atual - hora) * 60))

        if minuto == 60:
            hora = (hora + 1) % 24
            minuto = 0

        return f"{hora:02d}:{minuto:02d}"

    def simular_dia_inteiro(self, passo_minutos: int = 60) -> list[SimulationLog]:
        """Executa uma simulação de 24h em poucos segundos."""

        total_passos = int((24 * 60) / passo_minutos)
        return [self.avancar_tempo(passo_minutos) for _ in range(total_passos)]

    def _aplicar_agente_horario_de_pico(self) -> None:
        """Ajusta demandas de setores sensíveis ao ciclo diário."""

        multiplier_by_type = {
            "Residencial": self._multiplicador_residencial(),
            "Comercial": self._multiplicador_comercial(),
            "Grandes Edifícios": self._multiplicador_comercial(),
        }

        for _, data in self.smart_grid.graph.nodes(data=True):
            if data.get("is_subestacao"):
                continue

            demanda_base = data["demanda_base_kw"]
            tipo = data["tipo"]
            multiplicador = multiplier_by_type.get(tipo, 1.0)
            data["demanda_kw_atual"] = demanda_base * multiplicador

    def _aplicar_resposta_a_demanda(self) -> list[str]:
        """Reduz consumo de grandes cargas quando o pico ameaça a rede."""

        if not self._esta_no_horario_de_pico():
            return []

        demanda_total = self.smart_grid.demanda_total_kw()
        capacidade_total = self.smart_grid.capacidade_total_subestacoes_kw()

        if demanda_total <= capacidade_total:
            return []

        intervencoes = []
        tipos_alvo = {"Indústria", "Grandes Edifícios"}

        for node_id, data in self.smart_grid.setores_por_tipo(tipos_alvo):
            consumo_original = data["demanda_kw_atual"]
            data["demanda_kw_atual"] = consumo_original * 0.8
            intervencoes.append(
                f"Resposta à demanda em {data['nome']} ({node_id}): -20%"
            )

        return intervencoes

    def _multiplicador_residencial(self) -> float:
        if self._esta_em_baixa_demanda():
            return 0.3
        if self._esta_no_horario_de_pico():
            return 1.5
        return 1.0

    def _multiplicador_comercial(self) -> float:
        if self._esta_em_baixa_demanda():
            return 0.3
        if self._esta_no_horario_de_pico():
            return 1.5
        return 1.0

    def _esta_em_baixa_demanda(self) -> bool:
        return self.LOW_DEMAND_START_HOUR <= self.hora_atual < self.LOW_DEMAND_END_HOUR

    def _esta_no_horario_de_pico(self) -> bool:
        return self.PEAK_START_HOUR <= self.hora_atual < self.PEAK_END_HOUR

    def _imprimir_log(self, log: SimulationLog) -> None:
        intervencao = (
            " | IA: " + "; ".join(log.intervencoes)
            if log.intervencoes
            else " | IA: sem intervenção"
        )
        print(
            f"[{log.hora}] Demanda total: {log.demanda_total_kw:.1f} kW"
            f"{intervencao}"
        )

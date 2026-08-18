from dataclasses import dataclass, field
import math

@dataclass
class AlertaManutencao:
    aresta: tuple[str, str]
    taxa_carga: float
    horas_acima_90: float
    severidade: str


@dataclass
class CityState:
    hora_atual: float
    clima: str
    luminosidade: float = field(init=False)
    iluminacao_publica: bool = False
    falhas_ativas: list[tuple[str, str]] = field(default_factory=list)
    alertas_manutencao: list[AlertaManutencao] = field(default_factory=list)

    def __post_init__(self):
        self._calcular_luminosidade()

    def _calcular_luminosidade(self):
        # 0.0 (night) to 1.0 (midday sunny)
        # Assumindo dia entre 6h e 18h
        if self.hora_atual < 6.0 or self.hora_atual >= 18.0:
            base = 0.0
        else:
            # Pico de luz as 12h
            dist_pico = abs(12.0 - self.hora_atual)
            base = max(0.0, 1.0 - (dist_pico / 6.0))
        
        fator_clima = {
            "ensolarado": 1.0,
            "nublado": 0.6,
            "chuvoso": 0.3,
            "tempestade": 0.1
        }.get(self.clima, 1.0)
        
        self.luminosidade = base * fator_clima

    def atualizar_hora_clima(self, hora: float, clima: str):
        self.hora_atual = hora
        self.clima = clima
        self._calcular_luminosidade()

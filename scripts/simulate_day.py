"""Executa uma simulação simples de um dia inteiro."""

from pathlib import Path
import sys

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from backend.simulation_engine import SmartCitySimulator


def main() -> None:
    simulator = SmartCitySimulator()
    simulator.simular_dia_inteiro(passo_minutos=60)


if __name__ == "__main__":
    main()

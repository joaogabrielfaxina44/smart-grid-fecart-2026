from abc import ABC, abstractmethod
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from backend.smart_grid_graph import SmartGridGraph
    from backend.city_state import CityState


class BaseAgent(ABC):
    nome: str
    prioridade: int

    @abstractmethod
    def executar(self, grafo: 'SmartGridGraph', estado: 'CityState') -> list[str]:
        """Returns list of actions/logs."""
        pass

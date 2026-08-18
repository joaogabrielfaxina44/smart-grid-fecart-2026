import sys
import os

# Adiciona o diretório raiz ao PYTHONPATH para permitir imports do backend
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.orchestrator import Orchestrator


def format_hora(hora_float: float) -> str:
    h = int(hora_float)
    m = int((hora_float - h) * 60)
    return f"{h:02d}:{m:02d}"


def run():
    print("Iniciando Simulação do Smart Grid (Multi-Agent System)...\n")
    
    orchestrator = Orchestrator(clima_inicial="ensolarado")
    
    # Simulação opcional de eventos durante o dia
    # Por exemplo, injetamos uma falha às 14:00 (no tick de 14:00 a gente injeta manualmente, ou apenas rodamos simular_dia)
    
    ticks = int((24 * 60) / 15)
    
    for i in range(ticks):
        log = orchestrator.tick(minutos=15)
        
        hora_str = format_hora(log.hora)
        
        # Eventos hardcoded para testar os agentes
        if hora_str == "14:00":
            print(f"\n[EVENTO EXTERNO] Injetando falha na linha SUB_CENTRAL -> HOSPITAL às {hora_str}")
            orchestrator.injetar_falha("SUB_CENTRAL", "HOSPITAL")
        elif hora_str == "16:00":
            print(f"\n[EVENTO EXTERNO] Clima mudou para tempestade às {hora_str}")
            orchestrator.alterar_clima("tempestade")
            
        if log.acoes_agentes:
            print(f"\n--- {hora_str} | Clima: {log.clima} | Lum: {log.luminosidade:.2f} ---")
            for acao in log.acoes_agentes:
                print(f"  {acao}")
            print(f"  Demanda Total Atual: {log.demanda_total:.1f} kW")


if __name__ == "__main__":
    run()

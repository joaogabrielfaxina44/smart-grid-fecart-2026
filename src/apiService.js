// apiService.js
// Responsável por toda a comunicação com o backend FastAPI (Inteligência Artificial)

const API_BASE_URL = 'http://localhost:8000';

class ApiService {
    /**
     * Busca o estado atual da simulação (foto da cidade)
     * GET /estado
     */
    static async fetchEstadoAtual() {
        try {
            const response = await fetch(`${API_BASE_URL}/estado`);
            if (!response.ok) throw new Error('Erro ao buscar estado da rede');
            return await response.json();
        } catch (error) {
            console.error('[ApiService] Falha em fetchEstadoAtual:', error);
            return null;
        }
    }

    /**
     * Avança o relógio da simulação em 1 hora
     * POST /avancar_tempo
     */
    static async avancarTempoBackend() {
        try {
            const response = await fetch(`${API_BASE_URL}/avancar_tempo`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            if (!response.ok) throw new Error('Erro ao avançar tempo');
            return await response.json();
        } catch (error) {
            console.error('[ApiService] Falha em avancarTempoBackend:', error);
            return null;
        }
    }

    /**
     * Simula o corte manual de uma linha de transmissão específica
     * POST /simular_falha
     */
    static async simularFalhaBackend(origem, destino) {
        try {
            const response = await fetch(`${API_BASE_URL}/simular_falha`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ origem, destino })
            });
            if (!response.ok) throw new Error('Erro ao simular falha na rede');
            return await response.json();
        } catch (error) {
            console.error('[ApiService] Falha em simularFalhaBackend:', error);
            return null;
        }
    }
}

export default ApiService;

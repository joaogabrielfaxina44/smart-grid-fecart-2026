/**
 * smartAgents.js — Motor de Simulação Client-Side da Smart Grid
 * Porta completa do Sistema Multi-Agente Python para JavaScript puro.
 * Roda 100% no navegador, sem nenhuma dependência de API externa.
 */

// ═══════════════════════════════════════════════════════════════
// 1. GRAFO DA CIDADE
//    Armazena nós (setores) e arestas (linhas de transmissão)
//    usando os IDs que mapeamos no Three.js.
// ═══════════════════════════════════════════════════════════════

export class CityGraph {
    constructor() {
        // Mapa de nós: id → { nome, tipo, demanda_base_kw, demanda_kw_atual, prioridade, is_subestacao, status_energizado }
        this.nodes = new Map();
        // Mapa de arestas: `origem-destino` → { origem, destino, capacidade_maxima_kw, fluxo_kw_atual, status_ativa }
        this.edges = new Map();
        // Lista de adjacência para algoritmos de busca
        this.adjacency = new Map();

        this._buildDefaultCity();
    }

    _addNode(id, props) {
        this.nodes.set(id, {
            id,
            demanda_kw_atual: props.demanda_base_kw,
            status_energizado: true,
            ...props
        });
        this.adjacency.set(id, []);
    }

    _addEdge(origemId, destinoId, capacidade, distancia = 1.0) {
        const key    = `${origemId}-${destinoId}`;
        const keyRev = `${destinoId}-${origemId}`;
        const edgeData = {
            origem: origemId,
            destino: destinoId,
            capacidade_maxima_kw: capacidade,
            distancia_km: distancia,
            fluxo_kw_atual: 0,
            status_ativa: true
        };
        this.edges.set(key, edgeData);
        this.edges.set(keyRev, edgeData); // grafo não-direcionado

        this.adjacency.get(origemId)?.push(destinoId);
        this.adjacency.get(destinoId)?.push(origemId);
    }

    getEdge(origemId, destinoId) {
        return this.edges.get(`${origemId}-${destinoId}`)
            ?? this.edges.get(`${destinoId}-${origemId}`);
    }

    desativarAresta(origemId, destinoId) {
        const edge = this.getEdge(origemId, destinoId);
        if (edge) {
            edge.status_ativa = false;
            console.log(`[CityGraph] Linha desativada: ${origemId} → ${destinoId}`);
        }
    }

    reativarAresta(origemId, destinoId) {
        const edge = this.getEdge(origemId, destinoId);
        if (edge) {
            edge.status_ativa = true;
            console.log(`[CityGraph] Linha reativada: ${origemId} → ${destinoId}`);
        }
    }

    resetarAresta(origemId, destinoId) {
        this.reativarAresta(origemId, destinoId);
    }

    // Retorna nós sem caminho ativo até nenhuma subestação
    nosDesenergizados() {
        const subestacoes = [...this.nodes.values()]
            .filter(n => n.is_subestacao)
            .map(n => n.id);

        const sem_energia = [];

        for (const [id, node] of this.nodes) {
            if (node.is_subestacao) continue;
            const temCaminho = subestacoes.some(sub => this._bfsTemCaminho(sub, id));
            if (!temCaminho) sem_energia.push(id);
        }
        return sem_energia;
    }

    // BFS simples para verificar conectividade (ignora arestas inativas)
    _bfsTemCaminho(inicio, fim) {
        const visitados = new Set();
        const fila = [inicio];
        visitados.add(inicio);

        while (fila.length > 0) {
            const atual = fila.shift();
            if (atual === fim) return true;

            for (const vizinho of (this.adjacency.get(atual) ?? [])) {
                if (visitados.has(vizinho)) continue;
                const edge = this.getEdge(atual, vizinho);
                if (!edge || !edge.status_ativa) continue;
                visitados.add(vizinho);
                fila.push(vizinho);
            }
        }
        return false;
    }

    // Dijkstra: menor caminho ponderado de qualquer subestação até o destino
    dijkstraRotaAlternativa(destinoId) {
        const subestacoes = [...this.nodes.values()]
            .filter(n => n.is_subestacao)
            .map(n => n.id);

        let melhorCaminho = null;
        let melhorCusto   = Infinity;

        for (const origem of subestacoes) {
            const resultado = this._dijkstra(origem, destinoId);
            if (resultado && resultado.custo < melhorCusto) {
                melhorCusto   = resultado.custo;
                melhorCaminho = resultado.caminho;
            }
        }
        return melhorCaminho;
    }

    _dijkstra(origemId, destinoId) {
        const dist = new Map();
        const prev = new Map();
        const visitados = new Set();
        const queue = []; // min-heap simples via array ordenado

        for (const id of this.nodes.keys()) {
            dist.set(id, Infinity);
        }
        dist.set(origemId, 0);
        queue.push({ id: origemId, custo: 0 });

        while (queue.length > 0) {
            // Extrai o nó com menor custo
            queue.sort((a, b) => a.custo - b.custo);
            const { id: atual } = queue.shift();

            if (visitados.has(atual)) continue;
            visitados.add(atual);

            if (atual === destinoId) break;

            for (const vizinho of (this.adjacency.get(atual) ?? [])) {
                const edge = this.getEdge(atual, vizinho);
                if (!edge || !edge.status_ativa) continue;

                // Custo = distância / capacidade (prioriza linhas curtas e com mais folga)
                const peso = edge.distancia_km / Math.max(edge.capacidade_maxima_kw, 1);
                const novaDist = dist.get(atual) + peso;

                if (novaDist < dist.get(vizinho)) {
                    dist.set(vizinho, novaDist);
                    prev.set(vizinho, atual);
                    queue.push({ id: vizinho, custo: novaDist });
                }
            }
        }

        if (!isFinite(dist.get(destinoId))) return null;

        // Reconstrói o caminho
        const caminho = [];
        let cursor = destinoId;
        while (cursor !== undefined) {
            caminho.unshift(cursor);
            cursor = prev.get(cursor);
        }

        return { caminho, custo: dist.get(destinoId) };
    }

    // Estima o fluxo em cada aresta com base nas demandas dos nós a jusante
    calcularFluxoArestas() {
        // Zera todos os fluxos
        for (const edge of this.edges.values()) {
            edge.fluxo_kw_atual = 0;
        }

        const subestacoes = [...this.nodes.values()]
            .filter(n => n.is_subestacao)
            .map(n => n.id);

        for (const [id, node] of this.nodes) {
            if (node.is_subestacao) continue;
            const demanda = Math.max(0, node.demanda_kw_atual);
            if (demanda <= 0) continue;

            // Acha o melhor caminho até uma subestação
            let melhorCaminho = null;
            let melhorCusto = Infinity;

            for (const sub of subestacoes) {
                const r = this._dijkstra(sub, id);
                if (r && r.custo < melhorCusto) {
                    melhorCusto   = r.custo;
                    melhorCaminho = r.caminho;
                }
            }

            if (melhorCaminho) {
                for (let i = 0; i < melhorCaminho.length - 1; i++) {
                    const a = melhorCaminho[i];
                    const b = melhorCaminho[i + 1];
                    const edge = this.getEdge(a, b);
                    if (edge) edge.fluxo_kw_atual += demanda;
                }
            }
        }
    }

    demandaTotalKw() {
        let total = 0;
        for (const node of this.nodes.values()) {
            if (!node.is_subestacao) total += Math.max(0, node.demanda_kw_atual);
        }
        return total;
    }

    capacidadeTotalSubestacoes() {
        let total = 0;
        for (const node of this.nodes.values()) {
            if (node.is_subestacao) total += node.capacidade_maxima_kw;
        }
        return total;
    }

    resetarEstado() {
        for (const node of this.nodes.values()) {
            node.demanda_kw_atual   = node.demanda_base_kw;
            node.status_energizado  = true;
        }
        for (const edge of this.edges.values()) {
            edge.status_ativa      = true;
            edge.fluxo_kw_atual    = 0;
        }
    }

    // ── Topologia padrão da cidade (espelha a configuração base) ───

    _buildDefaultCity() {
        // Subestações
        this._addNode('Subestacao_Central', { nome: 'Subestação Central',     tipo: 'Subestação', demanda_base_kw: 0,    prioridade: 0, is_subestacao: true, capacidade_maxima_kw: 4500 });
        this._addNode('Subestacao_Norte',   { nome: 'Subestação Norte',       tipo: 'Subestação', demanda_base_kw: 0,    prioridade: 0, is_subestacao: true, capacidade_maxima_kw: 2200 });
        this._addNode('Subestacao_Sul',     { nome: 'Subestação Sul',         tipo: 'Subestação', demanda_base_kw: 0,    prioridade: 0, is_subestacao: true, capacidade_maxima_kw: 2300 });

        // Consumidores
        this._addNode('Hospital_Prontomed',     { nome: 'Hospital Prontomed',         tipo: 'Hospital',         demanda_base_kw: 600,  prioridade: 1 });
        this._addNode('Bairro_Residencial_A',   { nome: 'Bairro Residencial A',        tipo: 'Residencial',      demanda_base_kw: 400,  prioridade: 3 });
        this._addNode('Bairro_Residencial_B',   { nome: 'Bairro Residencial B',        tipo: 'Residencial',      demanda_base_kw: 400,  prioridade: 3 });
        this._addNode('Centro_Comercial',       { nome: 'Centro Comercial',            tipo: 'Comercial',        demanda_base_kw: 1000, prioridade: 2 });
        this._addNode('Shopping_Metropolitano', { nome: 'Shopping Metropolitano',      tipo: 'Grandes Edifícios',demanda_base_kw: 800,  prioridade: 2 });
        this._addNode('Zona_Industrial_A',      { nome: 'Zona Industrial A',           tipo: 'Indústria',        demanda_base_kw: 1500, prioridade: 2 });
        this._addNode('Data_Center',            { nome: 'Data Center Municipal',       tipo: 'Grandes Edifícios',demanda_base_kw: 500,  prioridade: 1 });
        this._addNode('Escolas',                { nome: 'Distrito Educacional',        tipo: 'Público',          demanda_base_kw: 300,  prioridade: 2 });
        this._addNode('Fazenda_Solar',          { nome: 'Fazenda Solar Urbana',        tipo: 'Geração',          demanda_base_kw: -500, prioridade: 0 });

        // Linhas de transmissão (capacidades ajustadas para 4500 kW)
        this._addEdge('Subestacao_Central', 'Subestacao_Norte',   2200, 4.0);
        this._addEdge('Subestacao_Central', 'Subestacao_Sul',     2300, 4.5);
        this._addEdge('Subestacao_Central', 'Hospital_Prontomed', 1200, 2.0);
        this._addEdge('Subestacao_Norte',   'Bairro_Residencial_A', 900, 2.4);
        this._addEdge('Subestacao_Norte',   'Centro_Comercial',   1500, 2.0);
        this._addEdge('Subestacao_Norte',   'Data_Center',        900, 1.8);
        this._addEdge('Subestacao_Sul',     'Bairro_Residencial_B', 900, 2.2);
        this._addEdge('Subestacao_Sul',     'Shopping_Metropolitano', 1200, 2.1);
        this._addEdge('Subestacao_Sul',     'Zona_Industrial_A',  2200, 3.2);
        this._addEdge('Subestacao_Sul',     'Escolas',            600, 1.6);
        this._addEdge('Fazenda_Solar',      'Subestacao_Norte',   1000, 3.0);
        this._addEdge('Fazenda_Solar',      'Subestacao_Sul',     1000, 4.0);
        this._addEdge('Hospital_Prontomed', 'Data_Center',        800, 2.6);
        this._addEdge('Centro_Comercial',   'Shopping_Metropolitano', 800, 3.3);
        this._addEdge('Bairro_Residencial_A','Bairro_Residencial_B', 800, 5.0);
        this._addEdge('Zona_Industrial_A',  'Shopping_Metropolitano', 1000, 2.8);
    }
}


// ═══════════════════════════════════════════════════════════════
// 2. AGENTES DE IA
// ═══════════════════════════════════════════════════════════════

// Classe base (interface)
class BaseAgent {
    constructor(nome, prioridade) {
        this.nome      = nome;
        this.prioridade = prioridade;
    }
    // Retorna array de strings com logs do que foi feito
    executar(grafo, estado) {
        return [];
    }
}

// ── Agente 1: Horários de Pico ───────────────────────────────
export class PeakHourAgent extends BaseAgent {
    constructor() { super('PeakHourAgent', 10); }

    executar(grafo, estado) {
        const hora = estado.hora;
        let fatores, periodo;

        if (hora >= 0 && hora < 5) {
            fatores = { Residencial: 0.60, Comercial: 0.60, 'Grandes Edifícios': 0.60, Indústria: 0.75, Hospital: 0.90, Público: 0.70 };
            periodo = 'Madrugada';
        } else if (hora < 8) {
            fatores = { Residencial: 0.85, Comercial: 0.70, 'Grandes Edifícios': 0.70, Indústria: 0.90, Hospital: 1.00, Público: 0.80 };
            periodo = 'Manhã';
        } else if (hora < 18) {
            fatores = { Residencial: 0.80, Comercial: 1.20, 'Grandes Edifícios': 1.20, Indústria: 1.15, Hospital: 1.00, Público: 1.10 };
            periodo = 'Comercial';
        } else if (hora < 21) {
            // Lógica de Pico (18h-21h): Residencial 1.8x, Hospital 1.1x, Indústria 0.9x e Comercial 0.8x
            fatores = { Residencial: 1.80, Comercial: 0.80, 'Grandes Edifícios': 0.80, Indústria: 0.90, Hospital: 1.10, Público: 0.85 };
            periodo = 'Pico Noturno';
        } else {
            fatores = { Residencial: 1.10, Comercial: 0.75, 'Grandes Edifícios': 0.75, Indústria: 0.70, Hospital: 0.95, Público: 0.80 };
            periodo = 'Noite';
        }

        for (const node of grafo.nodes.values()) {
            if (node.is_subestacao || node.tipo === 'Geração') continue;
            const fator = fatores[node.tipo] ?? 1.0;
            node.demanda_kw_atual = node.demanda_base_kw * fator;
        }

        return [`[${this.nome}] Período: ${periodo} | Hora: ${hora}h`];
    }
}

// ── Agente 2: Geração Distribuída (Solar/Eólica) ─────────────
export class DistributedGenAgent extends BaseAgent {
    constructor() { super('DistributedGenAgent', 20); }

    executar(grafo, estado) {
        const { hora, clima } = estado;
        const logs = [];

        const fatorSolar = (hora >= 7 && hora < 17)
            ? ({ ensolarado: 1.0, nublado: 0.45, chuvoso: 0.15, tempestade: 0.0 }[clima] ?? 1.0)
            : 0.0;
        const fatorEolica = { ensolarado: 0.4, nublado: 0.6, chuvoso: 0.8, tempestade: 0.0 }[clima] ?? 0.4;

        // Microgeração nos bairros residenciais e comerciais
        const geracaoPorNo = 15.0 * fatorSolar + 5.0 * fatorEolica;
        if (geracaoPorNo > 0) {
            for (const node of grafo.nodes.values()) {
                if (node.tipo === 'Residencial' || node.tipo === 'Comercial') {
                    node.demanda_kw_atual = Math.max(0, node.demanda_kw_atual - geracaoPorNo);
                }
            }
            logs.push(`[${this.nome}] Microgeração: −${geracaoPorNo.toFixed(1)} kW/nó | Solar ${(fatorSolar*100).toFixed(0)}% | Eólica ${(fatorEolica*100).toFixed(0)}%`);
        }

        // Ajusta geração da Fazenda Solar
        const solar = grafo.nodes.get('Fazenda_Solar');
        if (solar) {
            const base = Math.abs(solar.demanda_base_kw);
            solar.demanda_kw_atual = -(base * Math.max(fatorSolar, fatorEolica * 0.3));
            logs.push(`[${this.nome}] Fazenda Solar gerando ${Math.abs(solar.demanda_kw_atual).toFixed(1)} kW`);
        }

        return logs;
    }
}

// ── Agente 3: Manutenção Preditiva ────────────────────────────
export class PredictiveMaintAgent extends BaseAgent {
    constructor() {
        super('PredictiveMaintAgent', 30);
        this.historicoSobrecarga = new Map(); // `u-v` → horas acumuladas
    }

    executar(grafo, estado) {
        grafo.calcularFluxoArestas();
        const logs = [];
        const alertas = [];

        const processadas = new Set();

        for (const edge of grafo.edges.values()) {
            const key = `${edge.origem}-${edge.destino}`;
            const keyNorm = [edge.origem, edge.destino].sort().join('|');
            if (processadas.has(keyNorm)) continue;
            processadas.add(keyNorm);

            if (!edge.status_ativa) {
                this.historicoSobrecarga.set(keyNorm, 0);
                continue;
            }

            const taxaCarga = edge.fluxo_kw_atual / Math.max(edge.capacidade_maxima_kw, 1);

            if (taxaCarga > 0.90) {
                const horasAcum = (this.historicoSobrecarga.get(keyNorm) ?? 0) + 0.25;
                this.historicoSobrecarga.set(keyNorm, horasAcum);

                if (horasAcum >= 2.0) {
                    alertas.push({ aresta: keyNorm, taxa: taxaCarga, horas: horasAcum, severidade: 'RISCO_SUPERAQUECIMENTO' });
                    logs.push(`[${this.nome}] ⚠️ SUPERAQUECIMENTO: ${edge.origem}→${edge.destino} (${(taxaCarga*100).toFixed(0)}% por ${horasAcum.toFixed(1)}h)`);
                }
            } else if (taxaCarga <= 0.85) {
                if ((this.historicoSobrecarga.get(keyNorm) ?? 0) > 0) {
                    this.historicoSobrecarga.set(keyNorm, 0);
                    logs.push(`[${this.nome}] ✅ Linha ${edge.origem}→${edge.destino} estabilizada`);
                }
            }
        }

        estado.alertasManutencao = alertas;
        return logs;
    }
}

// ── Agente 4: Resposta à Demanda (Corte de Emergência) ────────
export class DemandResponseAgent extends BaseAgent {
    constructor() {
        super('DemandResponseAgent', 40);
        this.cortesAtivos = new Map(); // nodeId → multiplicador
    }

    executar(grafo, estado) {
        const logs = [];

        // Restauração gradual (+5% por tick)
        for (const [nodeId, mult] of this.cortesAtivos) {
            if (mult >= 1.0) { this.cortesAtivos.delete(nodeId); continue; }
            this.cortesAtivos.set(nodeId, Math.min(1.0, mult + 0.05));
        }

        const demanda   = grafo.demandaTotalKw();
        const capacidade = grafo.capacidadeTotalSubestacoes();
        const temAlerta  = estado.alertasManutencao?.length > 0;
        const cargaGlobal = demanda > capacidade * 0.90;
        const temFalha    = [...grafo.edges.values()].some(e => !e.status_ativa);

        if (!temAlerta && !cargaGlobal && !temFalha) {
            this._aplicarCortes(grafo);
            if (this.cortesAtivos.size > 0) logs.push(`[${this.nome}] Restaurando energia gradualmente (+5%/tick)`);
            return logs;
        }

        logs.push(`[${this.nome}] 🔴 CORTE DE EMERGÊNCIA ATIVADO: 30% Indústria | 20% Comércio | 0% Hospital`);

        // Corte de Emergência: 30% Indústria, 20% Comércio, 0% Hospital (prioridade 1)
        for (const [nodeId, node] of grafo.nodes) {
            if (node.is_subestacao || node.prioridade === 1) continue; // Hospital (0% de corte)

            let novaMult = 1.0;
            if (node.tipo === 'Indústria') {
                novaMult = 0.70; // 30% de corte
            } else if (node.tipo === 'Comercial' || node.tipo === 'Grandes Edifícios') {
                novaMult = 0.80; // 20% de corte
            }

            if (novaMult < 1.0) {
                const atualMult = this.cortesAtivos.get(nodeId) ?? 1.0;
                this.cortesAtivos.set(nodeId, Math.min(atualMult, novaMult));
            }
        }

        this._aplicarCortes(grafo);
        return logs;
    }

    _aplicarCortes(grafo) {
        for (const [nodeId, mult] of this.cortesAtivos) {
            const node = grafo.nodes.get(nodeId);
            if (node) node.demanda_kw_atual *= mult;
        }
    }

    resetar() { this.cortesAtivos.clear(); }
}

// ── Agente 5: Self-Healing (Autorrecuperação) ────────────────
export class SelfHealingAgent extends BaseAgent {
    constructor() { super('SelfHealingAgent', 50); }

    executar(grafo, estado) {
        const logs = [];
        const devenergizados = grafo.nosDesenergizados();

        if (devenergizados.length === 0) {
            for (const node of grafo.nodes.values()) node.status_energizado = true;
            return logs;
        }

        logs.push(`[${this.nome}] 🔌 Nós sem energia: ${devenergizados.join(', ')}`);

        for (const nodeId of devenergizados) {
            const rota = grafo.dijkstraRotaAlternativa(nodeId);
            const node = grafo.nodes.get(nodeId);

            if (rota) {
                node.status_energizado = true;
                logs.push(`[${this.nome}] ✅ Rota alternativa para ${nodeId}: ${rota.join(' → ')}`);

                // Verifica capacidade ao longo da rota
                const demanda = Math.max(0, node.demanda_kw_atual);
                for (let i = 0; i < rota.length - 1; i++) {
                    const edge = grafo.getEdge(rota[i], rota[i + 1]);
                    if (edge && edge.capacidade_maxima_kw < demanda) {
                        logs.push(`[${this.nome}] ⚠️ AVISO: ${rota[i]}→${rota[i+1]} pode sobrecarregar (cap: ${edge.capacidade_maxima_kw} kW < demanda: ${demanda.toFixed(0)} kW)`);
                    }
                }
            } else {
                node.status_energizado = false;
                node.demanda_kw_atual  = 0;
                logs.push(`[${this.nome}] 🚫 Sem rota possível para ${nodeId}. Nó em blackout total.`);
            }
        }

        return logs;
    }
}

// ── Agente 6: Iluminação Pública Inteligente ─────────────────
export class SmartLightingAgent extends BaseAgent {
    constructor() {
        super('SmartLightingAgent', 60);
        this.iluminacaoLigada = false;
    }

    executar(grafo, estado) {
        const { hora, clima } = estado;
        const logs = [];
        const deveAcender = hora >= 18 || hora < 6 || clima === 'tempestade';

        if (deveAcender && !this.iluminacaoLigada) {
            this.iluminacaoLigada = true;
            for (const node of grafo.nodes.values()) {
                if (!node.is_subestacao && node.tipo !== 'Geração') {
                    node.demanda_kw_atual += node.demanda_base_kw * 0.03;
                }
            }
            logs.push(`[${this.nome}] 💡 Iluminação pública LIGADA`);

        } else if (!deveAcender && this.iluminacaoLigada) {
            this.iluminacaoLigada = false;
            for (const node of grafo.nodes.values()) {
                if (!node.is_subestacao && node.tipo !== 'Geração') {
                    node.demanda_kw_atual = Math.max(0, node.demanda_kw_atual - node.demanda_base_kw * 0.03);
                }
            }
            logs.push(`[${this.nome}] 🌑 Iluminação pública DESLIGADA`);
        }

        return logs;
    }

    resetar() { this.iluminacaoLigada = false; }
}


// ═══════════════════════════════════════════════════════════════
// 3. ORQUESTRADOR — Motor Central do Loop de Tempo
// ═══════════════════════════════════════════════════════════════

export class CitySimulator {
    /**
     * @param {object} opts
     * @param {Function} opts.onSync - Callback chamado após cada tick com o estado atualizado.
     *   Assinatura: (grafo: CityGraph, estado: object, logs: string[]) => void
     */
    constructor({ onSync = null } = {}) {
        this.grafo   = new CityGraph();
        this.onSync  = onSync;

        // Estado global da simulação
        this.estado = {
            hora: 7,                // Hora virtual (0–23)
            clima: 'ensolarado',    // ensolarado | nublado | chuvoso | tempestade
            luminosidade: 1.0,
            alertasManutencao: []
        };

        // Instancia os 6 agentes em ordem de prioridade
        this.agentes = [
            new PeakHourAgent(),
            new DistributedGenAgent(),
            new PredictiveMaintAgent(),
            new DemandResponseAgent(),
            new SelfHealingAgent(),
            new SmartLightingAgent()
        ].sort((a, b) => a.prioridade - b.prioridade);

        this._demandResponseAgent = this.agentes.find(a => a instanceof DemandResponseAgent);
        this._lightingAgent       = this.agentes.find(a => a instanceof SmartLightingAgent);

        // Temporizador interno (opcional)
        this._timerId = null;
    }

    // ── API Pública ─────────────────────────────────────────────

    /** Avança o relógio em `horas` e executa todos os agentes */
    tick(horas = 1) {
        this.estado.hora = (this.estado.hora + horas) % 24;
        this._atualizarLuminosidade();
        return this._executarAgentes();
    }

    /** Simula o corte de uma linha e aciona Self-Healing imediatamente */
    simularFalha(origemId, destinoId) {
        this.grafo.desativarAresta(origemId, destinoId);
        // Ticks instantâneos sem avançar o relógio
        return this._executarAgentes();
    }

    /** Inicia o loop automático de tempo (1 hora virtual a cada `intervaloMs`) */
    iniciarLoop(intervaloMs = 3000) {
        if (this._timerId) return;
        this._timerId = setInterval(() => this.tick(1), intervaloMs);
        console.log(`[CitySimulator] Loop iniciado — avanço de 1h a cada ${intervaloMs}ms`);
    }

    /** Para o loop automático */
    pararLoop() {
        clearInterval(this._timerId);
        this._timerId = null;
        console.log('[CitySimulator] Loop parado');
    }

    /** Altera o clima e reaplicar a lógica */
    alterarClima(novoClima) {
        this.estado.clima = novoClima;
        return this._executarAgentes();
    }

    /** Reseta toda a simulação ao estado inicial */
    resetar() {
        this.pararLoop();
        this.grafo.resetarEstado();
        this.estado.hora              = 7;
        this.estado.clima             = 'ensolarado';
        this.estado.alertasManutencao = [];
        this._demandResponseAgent?.resetar();
        this._lightingAgent?.resetar();
        const logs = this._executarAgentes();
        return logs;
    }

    /** Retorna um snapshot serializável do estado atual (útil para debug/UI) */
    snapshot() {
        const nos = [...this.grafo.nodes.values()].map(n => ({
            id: n.id,
            nome: n.nome,
            tipo: n.tipo,
            demanda_kw_atual: +n.demanda_kw_atual.toFixed(1),
            status_energizado: n.status_energizado
        }));

        const arestasVistas = new Set();
        const arestas = [];
        for (const edge of this.grafo.edges.values()) {
            const key = [edge.origem, edge.destino].sort().join('|');
            if (arestasVistas.has(key)) continue;
            arestasVistas.add(key);
            arestas.push({
                origem: edge.origem,
                destino: edge.destino,
                fluxo_atual: +edge.fluxo_kw_atual.toFixed(1),
                capacidade: edge.capacidade_maxima_kw,
                taxa_carga: +(edge.fluxo_kw_atual / Math.max(edge.capacidade_maxima_kw, 1)).toFixed(3),
                status_ativa: edge.status_ativa
            });
        }

        return {
            hora: this.estado.hora,
            clima: this.estado.clima,
            luminosidade: this.estado.luminosidade,
            demanda_total_kw: +this.grafo.demandaTotalKw().toFixed(1),
            nos,
            arestas
        };
    }

    // ── Internos ────────────────────────────────────────────────

    _executarAgentes() {
        const todosLogs = [];
        for (const agente of this.agentes) {
            const logs = agente.executar(this.grafo, this.estado);
            todosLogs.push(...logs);
        }

        // Dispara o callback de sincronização visual
        if (typeof this.onSync === 'function') {
            this.onSync(this.grafo, this.estado, todosLogs);
        }

        return todosLogs;
    }

    _atualizarLuminosidade() {
        const hora = this.estado.hora;
        let base = 0;
        if (hora >= 6 && hora < 18) {
            const distPico = Math.abs(12 - hora);
            base = Math.max(0, 1 - distPico / 6);
        }
        const fatorClima = { ensolarado: 1.0, nublado: 0.6, chuvoso: 0.3, tempestade: 0.1 }[this.estado.clima] ?? 1.0;
        this.estado.luminosidade = base * fatorClima;
    }
}

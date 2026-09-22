/**
 * notificationSystem.js — Sistema de Notificações Cinematográfico
 * Converte eventos internos da Smart Grid em mensagens visuais claras
 * para visitantes que não conhecem a simulação.
 */

// ── Mapeamento de tipos para estilos visuais ──────────────────
const TOAST_CONFIGS = {
    blackout: {
        icon: '⚡',
        accentColor: '#ef4444',
        glowColor: 'rgba(239, 68, 68, 0.35)',
        borderColor: 'rgba(239, 68, 68, 0.6)',
        label: 'FALHA DE ENERGIA',
        duration: 6000
    },
    healing: {
        icon: '🔄',
        accentColor: '#00d2ff',
        glowColor: 'rgba(0, 210, 255, 0.25)',
        borderColor: 'rgba(0, 210, 255, 0.5)',
        label: 'IA: AUTO-RECUPERAÇÃO',
        duration: 7000
    },
    overload: {
        icon: '🔥',
        accentColor: '#f59e0b',
        glowColor: 'rgba(245, 158, 11, 0.25)',
        borderColor: 'rgba(245, 158, 11, 0.5)',
        label: 'ALERTA DE SOBRECARGA',
        duration: 6000
    },
    'ai-decision': {
        icon: '🤖',
        accentColor: '#a78bfa',
        glowColor: 'rgba(167, 139, 250, 0.2)',
        borderColor: 'rgba(167, 139, 250, 0.45)',
        label: 'DECISÃO DA IA',
        duration: 5500
    },
    success: {
        icon: '✅',
        accentColor: '#22c55e',
        glowColor: 'rgba(34, 197, 94, 0.2)',
        borderColor: 'rgba(34, 197, 94, 0.4)',
        label: 'ENERGIA RESTAURADA',
        duration: 5000
    },
    info: {
        icon: 'ℹ️',
        accentColor: '#38bdf8',
        glowColor: 'rgba(56, 189, 248, 0.15)',
        borderColor: 'rgba(56, 189, 248, 0.35)',
        label: 'INFORMAÇÃO',
        duration: 4500
    },
    wire_cut: {
        icon: '✂️',
        accentColor: '#fb923c',
        glowColor: 'rgba(251, 146, 60, 0.25)',
        borderColor: 'rgba(251, 146, 60, 0.55)',
        label: 'LINHA CORTADA',
        duration: 6000
    }
};

// ── Mapeamento de logs técnicos → linguagem humana ────────────
const LOG_TRANSLATIONS = [
    {
        pattern: /Rota de contingência Dijkstra encontrada para (.+?): (.+)/,
        translate: (m) => ({
            type: 'healing',
            title: `Rota Alternativa para ${humanizeName(m[1])}`,
            body: `A IA encontrou uma nova rota de energia:\n${humanizeRoute(m[2])}`
        })
    },
    {
        pattern: /Sem rota alternativa para (.+)\. Nó em [Bb]lackout/,
        translate: (m) => ({
            type: 'blackout',
            title: `Blackout em ${humanizeName(m[1])}`,
            body: 'Nenhuma rota alternativa disponível. Setor sem energia.'
        })
    },
    {
        pattern: /CORTE DE EMERGÊNCIA ATIVADO.*?Cortando (\d+)%/,
        translate: (m) => ({
            type: 'ai-decision',
            title: 'IA Cortou Carga Elétrica',
            body: `Corte de ${m[1]}% ativado para evitar sobrecarga total da rede.`
        })
    },
    {
        pattern: /SUPERAQUECIMENTO: (.+?)→(.+?) \((\d+)%/,
        translate: (m) => ({
            type: 'overload',
            title: 'Superaquecimento Detectado',
            body: `Linha ${humanizeName(m[1])} → ${humanizeName(m[2])} em ${m[3]}% da capacidade!`
        })
    },
    {
        pattern: /Restaurando energia gradualmente/,
        translate: () => ({
            type: 'success',
            title: 'Energia Sendo Restaurada',
            body: 'A IA está gradualmente devolvendo energia aos setores cortados.'
        })
    },
    {
        pattern: /Período: Pico Noturno/,
        translate: () => ({
            type: 'overload',
            title: 'Pico de Demanda Noturna',
            body: 'Alta demanda residencial (18h-21h). Consumo +80% nos bairros!'
        })
    },
    {
        pattern: /Iluminação pública LIGADA/,
        translate: () => ({
            type: 'info',
            title: 'Iluminação Pública Ativada',
            body: 'A IA ativou automaticamente os postes da cidade.'
        })
    },
    {
        pattern: /Linha (.+?)→(.+?) estabilizada/,
        translate: (m) => ({
            type: 'success',
            title: 'Linha Estabilizada',
            body: `${humanizeName(m[1])} → ${humanizeName(m[2])} voltou ao normal.`
        })
    },
    {
        pattern: /Nós sem energia: (.+)/,
        translate: (m) => ({
            type: 'blackout',
            title: 'Setores Sem Energia',
            body: `Desconectados: ${m[1].split(', ').map(humanizeName).join(', ')}`
        })
    }
];

// ── Nomes amigáveis ───────────────────────────────────────────
const NAME_MAP = {
    'Subestacao_Central':       'Subestação Central',
    'Subestacao_Norte':         'Subestação Norte',
    'Subestacao_Sul':           'Subestação Sul',
    'Hospital_Prontomed':       'Hospital Prontomed',
    'Bairro_Residencial_A':     'Bairro Residencial A',
    'Bairro_Residencial_B':     'Bairro Residencial B',
    'Centro_Comercial':         'Centro Comercial',
    'Shopping_Metropolitano':   'Shopping Metropolitano',
    'Zona_Industrial_A':        'Zona Industrial',
    'Data_Center':              'Data Center',
    'Escolas':                  'Distrito Escolar',
    'Fazenda_Solar':            'Fazenda Solar'
};

function humanizeName(id) {
    return NAME_MAP[id?.trim()] || id?.trim() || '?';
}

function humanizeRoute(routeStr) {
    return routeStr.split(' → ').map(humanizeName).join(' → ');
}

// ── Classe Principal ──────────────────────────────────────────

export class NotificationSystem {
    constructor() {
        this.container = null;
        this.screenFlash = null;
        this.aiThinkingBanner = null;
        this.activeToasts = [];
        this.suppressedTypes = new Set(); // evita flood de notificações iguais
        this._init();
    }

    _init() {
        // Container de toasts
        this.container = document.getElementById('event-toasts');
        this.screenFlash = document.getElementById('screen-flash');
        this.aiThinkingBanner = document.getElementById('ai-thinking-banner');
    }

    /**
     * Exibe uma notificação do tipo especificado.
     * @param {'blackout'|'healing'|'overload'|'ai-decision'|'success'|'info'|'wire_cut'} type
     * @param {string} title - Título em destaque
     * @param {string} body - Descrição detalhada (pode ter \n para quebras)
     * @param {number} [durationOverride] - Duração em ms (opcional)
     */
    show(type, title, body, durationOverride = null) {
        if (!this.container) return;

        const config = TOAST_CONFIGS[type] || TOAST_CONFIGS.info;
        const duration = durationOverride ?? config.duration;

        // Suprimir duplicatas por 3s
        const suppressKey = `${type}:${title}`;
        if (this.suppressedTypes.has(suppressKey)) return;
        this.suppressedTypes.add(suppressKey);
        setTimeout(() => this.suppressedTypes.delete(suppressKey), 3000);

        // Criar elemento toast
        const toast = document.createElement('div');
        toast.className = 'event-toast';
        toast.style.cssText = `
            --accent: ${config.accentColor};
            --glow: ${config.glowColor};
            --border: ${config.borderColor};
        `;

        const bodyHtml = body.replace(/\n/g, '<br>');

        toast.innerHTML = `
            <div class="toast-side-bar"></div>
            <div class="toast-content">
                <div class="toast-header">
                    <span class="toast-icon">${config.icon}</span>
                    <span class="toast-label">${config.label}</span>
                </div>
                <div class="toast-title">${title}</div>
                ${body ? `<div class="toast-body">${bodyHtml}</div>` : ''}
            </div>
            <div class="toast-progress">
                <div class="toast-progress-bar"></div>
            </div>
        `;

        this.container.appendChild(toast);
        this.activeToasts.push(toast);

        // Animar entrada
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                toast.classList.add('toast-enter');

                // Animar barra de progresso
                const bar = toast.querySelector('.toast-progress-bar');
                if (bar) {
                    bar.style.transition = `width ${duration}ms linear`;
                    bar.style.width = '0%';
                }
            });
        });

        // Remover após duração
        setTimeout(() => {
            toast.classList.remove('toast-enter');
            toast.classList.add('toast-exit');
            setTimeout(() => {
                if (toast.parentNode) toast.parentNode.removeChild(toast);
                this.activeToasts = this.activeToasts.filter(t => t !== toast);
            }, 500);
        }, duration);
    }

    /**
     * Mostra o banner "IA Pensando..." por um tempo
     * @param {number} duration ms
     */
    showAiThinking(duration = 1400) {
        if (!this.aiThinkingBanner) return;
        this.aiThinkingBanner.classList.add('ai-banner-active');
        setTimeout(() => {
            this.aiThinkingBanner.classList.remove('ai-banner-active');
        }, duration);
    }

    /**
     * Flash de tela (blackout visual imediato)
     * @param {'red'|'white'|'blue'} color
     * @param {number} duration ms
     */
    triggerScreenFlash(color = 'red', duration = 350) {
        if (!this.screenFlash) return;
        const colorMap = {
            red: 'rgba(200, 20, 20, 0.55)',
            white: 'rgba(255, 255, 255, 0.8)',
            blue: 'rgba(0, 180, 255, 0.45)'
        };
        this.screenFlash.style.background = colorMap[color] || colorMap.red;
        this.screenFlash.classList.add('flash-active');
        setTimeout(() => {
            this.screenFlash.classList.remove('flash-active');
        }, duration);
    }

    /**
     * Processa um array de logs do motor de IA e exibe as notificações relevantes.
     * @param {string[]} logs
     * @param {boolean} delayed - se true, espaça as notificações com atraso (para sequência dramática)
     */
    processLogs(logs, delayed = false) {
        if (!logs || logs.length === 0) return;

        let delay = 0;
        const shown = new Set(); // deduplicar dentro do mesmo batch

        for (const log of logs) {
            let matched = false;
            for (const mapping of LOG_TRANSLATIONS) {
                const m = log.match(mapping.pattern);
                if (m) {
                    const { type, title, body } = mapping.translate(m);
                    const key = `${type}:${title}`;
                    if (!shown.has(key)) {
                        shown.add(key);
                        if (delayed) {
                            setTimeout(() => this.show(type, title, body), delay);
                            delay += 800;
                        } else {
                            this.show(type, title, body);
                        }
                    }
                    matched = true;
                    break;
                }
            }
        }
    }

    /**
     * Mostra uma notificação de linha de transmissão cortada manualmente.
     * @param {string} u - Nó origem
     * @param {string} v - Nó destino
     */
    showLineCut(u, v) {
        this.show(
            'wire_cut',
            `Linha Interrompida`,
            `${humanizeName(u)} ↔ ${humanizeName(v)}\nA IA está recalculando a distribuição de energia...`,
            6500
        );
    }

    /**
     * Mostra notificação de blackout de setor (clique em bloco/grupo de fios)
     * @param {string} sectorName
     */
    showSectorBlackout(sectorName) {
        this.show(
            'blackout',
            `Blackout em ${sectorName}`,
            'Energia cortada neste setor. A IA está buscando rota alternativa.',
            6000
        );
    }
}

// Instância singleton exportada
export const notificationSystem = new NotificationSystem();

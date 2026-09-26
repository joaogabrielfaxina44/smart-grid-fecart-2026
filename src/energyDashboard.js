const fmt = (n, digits = 0) => Number(n).toLocaleString('pt-BR', { maximumFractionDigits: digits, minimumFractionDigits: digits });
const hourLabel = h => `${String(Math.floor(h) % 24).padStart(2, '0')}:${String(Math.floor((h % 1) * 60)).padStart(2, '0')}`;
const icons = { Residencial: '⌂', Hospital: '✚', Comercial: '▥', 'Grandes Edifícios': '▥', Indústria: '▤', Público: '◈' };

export class EnergyDashboard {
    constructor({ onTime, onWeather, onSpeed, onFocus }) {
        this.history = [];
        this.tab = 'overview';
        this.selected = null;
        this.filter = 'all';
        this.onFocus = onFocus;
        this.root = document.getElementById('city-dashboard');
        this.root.classList.add('energy-dashboard');
        this.root.innerHTML = `
          <button id="dash-toggle-btn" class="dash-toggle" aria-label="Recolher painel">‹</button>
          <div class="energy-content">
            <header class="energy-header"><div><span class="energy-eyebrow">FECART 2026 / SMART GRID</span><h2>Pulso da cidade<span class="live-dot"></span></h2></div><button id="dash-maximize-btn" class="energy-icon-button" aria-label="Expandir painel" title="Expandir painel">⛶</button></header>
            <div class="energy-status-row"><span id="energy-status" class="energy-status">Rede estável</span><span><span id="dash-weather">☀</span> <b id="dash-time">07:00</b></span></div>
            <section class="energy-hero"><div class="energy-eyebrow">CONSUMO ATENDIDO AGORA</div><div class="energy-number"><span id="energy-demand">0,00</span><span>MW</span></div><div class="energy-trend" id="energy-trend">Aguardando primeira leitura</div><div class="energy-load-label"><span>Uso da capacidade disponível</span><strong id="energy-load">0%</strong></div><div class="energy-load-track"><div id="energy-load-fill"></div></div></section>
            <div class="energy-kpis"><div><span>Renováveis</span><strong id="energy-renewable">0 kW</strong><small>solar + eólica</small></div><div><span>Margem disponível</span><strong id="energy-reserve">0 MW</strong><small id="energy-online">0 setores atendidos</small></div></div>
            <nav class="energy-tabs" aria-label="Visões da rede"><button data-tab="overview" class="active" aria-pressed="true">Visão geral</button><button data-tab="districts" aria-pressed="false">Setores</button><button data-tab="grid" aria-pressed="false">Rede elétrica</button></nav>
            <section class="energy-tab-pane" data-pane="overview">
              <div class="energy-section-title"><h3>Consumo ao longo do tempo</h3><span id="energy-samples">AO VIVO</span></div>
              <div class="energy-chart-wrap"><svg id="energy-chart" viewBox="0 0 360 130" role="img" aria-label="Histórico do consumo atendido em megawatts"><defs><linearGradient id="energy-gradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#57dfc4" stop-opacity=".30"/><stop offset="100%" stop-color="#57dfc4" stop-opacity="0"/></linearGradient></defs><g stroke="#ffffff0c"><path d="M0 25H360 M0 65H360 M0 105H360"/></g><path id="energy-area" fill="url(#energy-gradient)"/><path id="energy-line" fill="none" stroke="#57dfc4" stroke-width="2.5" stroke-linejoin="round"/><circle id="energy-tip" r="4" fill="#9af7df"/><line id="energy-hover-line" y1="12" y2="116" stroke="#b8c8d7" stroke-dasharray="3 3" visibility="hidden"/></svg><div id="energy-chart-readout">Passe o mouse para explorar as leituras</div></div>
              <div class="energy-chart-axis"><span id="energy-chart-start">07:00</span><span id="energy-chart-scale">MW · leituras reais da simulação</span><span id="energy-chart-end">agora</span></div>
              <div class="energy-section-title"><h3>Onde a energia é usada</h3><span>CLIQUE PARA EXPLORAR</span></div><div id="energy-top-sectors"></div>
            </section>
            <section class="energy-tab-pane" data-pane="districts" hidden><div class="energy-section-title"><h3>Consumo por setor</h3><select id="energy-filter" aria-label="Filtrar setores"><option value="all">Todos</option><option value="critical">Prioritários</option><option value="cut">Com restrição</option></select></div><div id="energy-districts"></div><div id="energy-detail" class="energy-detail">Selecione um setor para consultar os detalhes.</div></section>
            <section class="energy-tab-pane" data-pane="grid" hidden><div class="energy-section-title"><h3>Fontes de energia</h3><span>kW</span></div><div id="energy-sources"></div><div class="energy-section-title"><h3>Linhas mais carregadas</h3><span id="energy-lines-status"></span></div><div id="energy-lines"></div></section>
            <section class="energy-experiment"><div class="energy-section-title"><h3>Experimente a cidade</h3><span>INTERATIVO</span></div><div class="energy-presets"><button data-scenario="day">☀ Dia</button><button data-scenario="peak">☾ Pico noturno</button><button data-scenario="storm">ϟ Tempestade</button></div><label class="energy-slider-label" for="energy-time">Horário da simulação <b id="energy-time-label">07:00</b></label><input id="energy-time" type="range" min="0" max="23.75" step="0.25" value="7"/><div class="energy-range-labels"><span>00h</span><span>06h</span><span>12h</span><span>18h</span><span>24h</span></div><div class="energy-speed"><span>Velocidade do dia</span><div><button data-speed="0" aria-pressed="false">Ⅱ</button><button data-speed="1" class="active" aria-pressed="true">1×</button><button data-speed="4" aria-pressed="false">4×</button></div></div></section>
            <footer class="energy-footer"><span class="live-dot"></span> Telemetria simulada · atualização a cada 5 min virtuais</footer>
          </div>`;
        this.root.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => this.setTab(b.dataset.tab)));
        this.root.querySelectorAll('[data-speed]').forEach(b => b.addEventListener('click', () => { onSpeed(Number(b.dataset.speed)); this.setSpeed(Number(b.dataset.speed)); }));
        this.root.querySelectorAll('[data-scenario]').forEach(b => b.addEventListener('click', () => {
            const scenario = b.dataset.scenario;
            onWeather(scenario === 'storm' ? 'tempestade' : 'ensolarado');
            onTime(scenario === 'peak' ? 20 : 12);
        }));
        this.root.querySelector('#energy-time').addEventListener('input', e => onTime(Number(e.target.value)));
        this.root.querySelector('#energy-filter').addEventListener('change', e => { this.filter = e.target.value; this.renderSectors(); });
        this.root.addEventListener('click', e => { const b = e.target.closest('[data-sector]'); if (!b) return; this.selected = b.dataset.sector; this.setTab('districts'); this.renderSectors(); this.onFocus?.(this.selected); });
        const chart = this.root.querySelector('#energy-chart');
        chart.addEventListener('pointermove', e => {
            if (!this.history.length) return;
            const rect = chart.getBoundingClientRect();
            const t = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            const i = Math.round(t * (this.history.length - 1));
            const sample = this.history[i];
            this.text('energy-chart-readout', `${sample.time} · ${fmt(sample.demand / 1000, 2)} MW consumidos · ${fmt(sample.renewable)} kW renováveis`);
            const line = this.el('energy-hover-line'); line.setAttribute('x1', 8 + i / Math.max(1, this.history.length - 1) * 344); line.setAttribute('x2', line.getAttribute('x1')); line.setAttribute('visibility', 'visible');
        });
        chart.addEventListener('pointerleave', () => { this.el('energy-hover-line').setAttribute('visibility', 'hidden'); this.text('energy-chart-readout', 'Passe o mouse para explorar as leituras'); });
    }
    el(id) { return document.getElementById(id); }
    text(id, value) { this.el(id).textContent = value; }
    setTab(tab) { this.tab = tab; this.root.querySelectorAll('[data-tab]').forEach(b => { b.classList.toggle('active', b.dataset.tab === tab); b.setAttribute('aria-pressed', String(b.dataset.tab === tab)); }); this.root.querySelectorAll('[data-pane]').forEach(p => p.hidden = p.dataset.pane !== tab); }
    setSpeed(speed) { this.root.querySelectorAll('[data-speed]').forEach(b => { b.classList.toggle('active', Number(b.dataset.speed) === speed); b.setAttribute('aria-pressed', String(Number(b.dataset.speed) === speed)); }); }
    clear() { this.history = []; this.selected = null; }
    clock(hour) { this.text('dash-time', hourLabel(hour)); this.text('energy-time-label', hourLabel(hour)); if (document.activeElement !== this.el('energy-time')) this.el('energy-time').value = hour; }
    update(grafo, estado) {
        this.grafo = grafo;
        const nodes = [...grafo.nodes.values()];
        this.consumers = nodes.filter(n => !n.is_subestacao && n.tipo !== 'Geração').sort((a,b) => b.demanda_kw_atual - a.demanda_kw_atual);
        const demand = this.consumers.reduce((sum,n) => sum + (n.status_energizado ? Math.max(0,n.demanda_kw_atual) : 0), 0);
        const renewable = nodes.filter(n => n.tipo === 'Geração' && n.status_energizado).reduce((sum,n) => sum + Math.max(0,-n.demanda_kw_atual), 0);
        const capacity = nodes.filter(n => n.is_subestacao && n.status_energizado).reduce((sum,n) => sum + n.capacidade_maxima_kw, 0) + renewable;
        const edges = [...new Set(grafo.edges.values())];
        const broken = edges.filter(e => !e.status_ativa).length;
        const overloaded = edges.filter(e => e.status_ativa && e.fluxo_kw_atual >= e.capacidade_maxima_kw).length;
        const offline = this.consumers.filter(n => !n.status_energizado).length;
        const cut = this.consumers.filter(n => n.em_corte_emergencia).length;
        const previous = this.history.at(-1);
        const change = previous && previous.demand ? (demand - previous.demand) / previous.demand * 100 : 0;
        this.text('energy-demand', fmt(demand / 1000, 2));
        this.text('energy-trend', previous ? `${change > .01 ? '↗' : change < -.01 ? '↘' : '→'} ${fmt(Math.abs(change), 1)}% em relação à leitura anterior` : 'Primeira leitura · histórico iniciado');
        this.el('energy-trend').dataset.direction = change > 0 ? 'up' : 'down';
        const usage = capacity ? demand / capacity * 100 : 0;
        this.text('energy-load', `${fmt(usage, 1)}%`);
        this.el('energy-load-fill').style.width = `${Math.min(100,usage)}%`;
        this.el('energy-load-fill').style.background = usage >= 95 ? '#ff7c85' : usage >= 80 ? '#f4c36c' : '#57dfc4';
        this.text('energy-renewable', `${fmt(renewable)} kW`);
        this.text('energy-reserve', `${fmt((capacity-demand)/1000,2)} MW`);
        this.text('energy-online', `${this.consumers.length - offline}/${this.consumers.length} setores atendidos`);
        this.text('energy-status', offline ? `${offline} setor(es) sem energia` : overloaded ? `${overloaded} linha(s) sobrecarregada(s)` : broken ? `${broken} linha(s) interrompida(s)` : cut ? 'Restaurando consumo' : 'Rede estável');
        this.el('energy-status').dataset.level = offline || overloaded ? 'danger' : broken || cut ? 'warning' : 'normal';
        this.text('dash-weather', { ensolarado:'☀', nublado:'☁', chuvoso:'☂', tempestade:'ϟ' }[estado.clima] || '☀');
        this.el('dash-weather').title = estado.clima;
        this.clock(estado.hora);
        this.history.push({ time:hourLabel(estado.hora), demand, renewable });
        if (this.history.length > 90) this.history.shift();
        this.drawHistory(); this.renderSectors();
        this.el('energy-sources').innerHTML = nodes.filter(n => n.is_subestacao || n.tipo === 'Geração').map(n => `<div class="energy-source"><span>${n.nome}<small>${n.is_subestacao ? 'Capacidade nominal' : n.status_energizado ? 'Geração simulada' : 'Desconectada'}</small></span><strong>${fmt(n.is_subestacao ? n.capacidade_maxima_kw : Math.max(0,-n.demanda_kw_atual))}</strong></div>`).join('');
        this.text('energy-lines-status', `${edges.length - broken}/${edges.length} ATIVAS`);
        this.el('energy-lines').innerHTML = edges.sort((a,b) => Number(a.status_ativa)-Number(b.status_ativa) || b.fluxo_kw_atual/b.capacidade_maxima_kw-a.fluxo_kw_atual/a.capacidade_maxima_kw).slice(0,5).map(e => {
            const load=e.fluxo_kw_atual/e.capacidade_maxima_kw*100;
            return `<div class="energy-line-row"><span>${grafo.nodes.get(e.origem).nome} → ${grafo.nodes.get(e.destino).nome}</span><b class="${!e.status_ativa || load>=100 ? 'energy-danger' : ''}">${e.status_ativa ? fmt(load)+'%' : 'OFF'}</b><div class="energy-mini-track"><i style="width:${e.status_ativa ? Math.min(100,load) : 0}%;background:${load>=100?'#ff7c85':'#80bfff'}"></i></div></div>`;
        }).join('');
    }
    renderSectors() {
        if (!this.consumers) return;
        const max = Math.max(1,...this.consumers.map(n=>n.demanda_kw_atual));
        const row = n => `<button class="energy-sector ${this.selected===n.id?'selected':''}" data-sector="${n.id}"><span class="energy-sector-icon">${icons[n.tipo]||'◈'}</span><span class="energy-sector-body"><span>${n.nome}</span><span class="energy-mini-track"><i style="width:${n.status_energizado ? Math.max(0,n.demanda_kw_atual)/max*100 : 0}%"></i></span></span><strong>${n.status_energizado ? fmt(n.demanda_kw_atual)+'<small> kW</small>' : '<span class="energy-danger">OFF</span>'}</strong></button>`;
        this.el('energy-top-sectors').innerHTML = this.consumers.slice(0,3).map(row).join('');
        const filtered = this.consumers.filter(n=>this.filter==='all'||this.filter==='critical'&&n.prioridade===1||this.filter==='cut'&&(n.em_corte_emergencia||!n.status_energizado));
        this.el('energy-districts').innerHTML = filtered.map(row).join('') || '<p class="energy-empty">Nenhum setor com restrição neste momento.</p>';
        const selected = this.grafo.nodes.get(this.selected);
        this.el('energy-detail').innerHTML = selected ? `<b>${selected.nome}</b><div>${selected.tipo} · ${selected.prioridade===1?'Prioridade máxima':'Prioridade '+selected.prioridade}</div><div>Demanda base <strong>${fmt(selected.demanda_base_kw)} kW</strong></div><div>Consumo atendido <strong>${fmt(selected.status_energizado?selected.demanda_kw_atual:0)} kW</strong></div><small>${!selected.status_energizado?'Sem conexão com a rede.':selected.em_corte_emergencia?'Redução de carga acionada pelo agente de demanda.':'Conectado à rede elétrica.'}</small>` : 'Selecione um setor para consultar os detalhes.';
    }
    drawHistory() {
        const high = Math.max(1000,...this.history.map(s=>s.demand))*1.15;
        const points = this.history.map((s,i)=>[8+i/Math.max(1,this.history.length-1)*344,116-s.demand/high*102]);
        const line = points.map((p,i)=>`${i?'L':'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
        this.el('energy-line').setAttribute('d',line);
        this.el('energy-area').setAttribute('d',`${line} L${points.at(-1)[0]},116 L8,116 Z`);
        this.el('energy-tip').setAttribute('cx',points.at(-1)[0]); this.el('energy-tip').setAttribute('cy',points.at(-1)[1]);
        this.text('energy-chart-start',this.history[0].time); this.text('energy-chart-end',this.history.at(-1).time);
        this.text('energy-chart-scale',`0 — ${fmt(high/1000,1)} MW`);
        this.text('energy-samples',`${this.history.length} LEITURAS`);
    }
}

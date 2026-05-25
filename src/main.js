import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// ==========================================
// 1. CONFIGURAÇÃO BASE (ENGINE 3D & BLOOM)
// ==========================================
const canvasContainer = document.getElementById('canvas-container');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020205); 
scene.fog = new THREE.FogExp2(0x020205, 0.015);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 30, 45);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ReinhardToneMapping;
canvasContainer.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.maxPolarAngle = Math.PI / 2 - 0.05; // Don't go below ground
controls.minDistance = 10;
controls.maxDistance = 100;

// Efeito Bloom (Neon Glow)
const renderScene = new RenderPass(scene, camera);
const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
bloomPass.threshold = 0.2;
bloomPass.strength = 1.2;
bloomPass.radius = 0.5;

const composer = new EffectComposer(renderer);
composer.addPass(renderScene);
composer.addPass(bloomPass);

// ==========================================
// 2. AMBIENTE E LUZES
// ==========================================
// Chão Matrix
const planeGeo = new THREE.PlaneGeometry(200, 200, 40, 40);
const planeMat = new THREE.MeshStandardMaterial({ 
    color: 0x050a10,
    roughness: 0.8,
    metalness: 0.2,
    wireframe: true,
    transparent: true,
    opacity: 0.15
});
const gridChao = new THREE.Mesh(planeGeo, planeMat);
gridChao.rotation.x = -Math.PI / 2;
scene.add(gridChao);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.1);
scene.add(ambientLight);

const sol = new THREE.DirectionalLight(0xffddaa, 2);
sol.castShadow = true;
sol.shadow.camera.top = 50;
sol.shadow.camera.bottom = -50;
sol.shadow.camera.left = -50;
sol.shadow.camera.right = 50;
scene.add(sol);

// ==========================================
// 3. MODELOS 3D E ESTRUTURA DE DADOS
// ==========================================
const nosDaRede = [];
const linhasDeEnergia = [];
const particulasEnergia = [];

let configGeral = {
    capacidadeMaximaUsina: 500,
    capacidadeAtual: 500,
    bateriaMax: 200,
    bateriaAtual: 100,
    velocidade: 1.0,
    cenarioForcado: null // null, 'sobrecarga', 'noite', 'falha'
};

let tempoVirtual = 0; 
let falhaCritica = false;

// --- A USINA CENTRAL ---
const usinaGroup = new THREE.Group();
scene.add(usinaGroup);

// Base da Usina
const baseGeo = new THREE.CylinderGeometry(4, 4.5, 2, 8);
const baseMat = new THREE.MeshStandardMaterial({ color: 0x112233, metalness: 0.8, roughness: 0.2 });
const baseUsina = new THREE.Mesh(baseGeo, baseMat);
baseUsina.position.y = 1;
baseUsina.castShadow = true;
usinaGroup.add(baseUsina);

// Torre Principal
const torreGeo = new THREE.CylinderGeometry(2, 2.5, 8, 16);
const torreMat = new THREE.MeshStandardMaterial({ color: 0x001122, metalness: 0.9, roughness: 0.1 });
const torreUsina = new THREE.Mesh(torreGeo, torreMat);
torreUsina.position.y = 6;
torreUsina.castShadow = true;
usinaGroup.add(torreUsina);

// Anéis de Energia (Neon)
const anelMat = new THREE.MeshStandardMaterial({ color: 0x004488, emissive: 0x00ccff, emissiveIntensity: 2 });
const aneisUsina = [];
for (let i = 0; i < 3; i++) {
    const anelGeo = new THREE.TorusGeometry(3.5 - (i * 0.4), 0.15, 8, 32);
    const anel = new THREE.Mesh(anelGeo, anelMat);
    anel.position.y = 4 + (i * 2);
    anel.rotation.x = Math.PI / 2;
    usinaGroup.add(anel);
    aneisUsina.push(anel);
}

// Luz pulsante no topo
const luzUsina = new THREE.PointLight(0x00ccff, 50, 40);
luzUsina.position.y = 12;
usinaGroup.add(luzUsina);

// Esfera emissiva no topo
const coreGeo = new THREE.SphereGeometry(1, 16, 16);
const coreUsina = new THREE.Mesh(coreGeo, anelMat);
coreUsina.position.y = 11;
usinaGroup.add(coreUsina);

// --- CRIADOR DE NÓS (Prédios) ---
function criarNo(id, tipo, x, z, consumoBase, prioridade) {
    const grupo = new THREE.Group();
    grupo.position.set(x, 0, z);
    
    let altura = 2;
    let corCorpo = 0x8899aa;
    let malhaCorpo, malhaDetalhe;

    if (tipo === 'Hospital') {
        altura = 4;
        const corpoGeo = new THREE.BoxGeometry(4, altura, 4);
        malhaCorpo = new THREE.MeshStandardMaterial({ color: 0xdddddd, metalness: 0.1, roughness: 0.8 });
        const corpo = new THREE.Mesh(corpoGeo, malhaCorpo);
        corpo.position.y = altura / 2;
        corpo.castShadow = true;
        grupo.add(corpo);
        
        // Cruz do Hospital
        const cruzGeo = new THREE.BoxGeometry(1.5, 1.5, 0.2);
        malhaDetalhe = new THREE.MeshStandardMaterial({ color: 0x550000, emissive: 0xff0000, emissiveIntensity: 2 });
        const cruz1 = new THREE.Mesh(cruzGeo, malhaDetalhe);
        cruz1.position.set(0, altura + 1, 0);
        const cruz2 = new THREE.Mesh(cruzGeo, malhaDetalhe);
        cruz2.rotation.z = Math.PI / 2;
        cruz2.position.set(0, altura + 1, 0);
        grupo.add(cruz1, cruz2);
    } 
    else if (tipo === 'Comercial') {
        altura = 7;
        const corpoGeo = new THREE.BoxGeometry(3, altura, 3);
        malhaCorpo = new THREE.MeshStandardMaterial({ color: 0x111122, metalness: 0.9, roughness: 0.1 });
        const corpo = new THREE.Mesh(corpoGeo, malhaCorpo);
        corpo.position.y = altura / 2;
        corpo.castShadow = true;
        grupo.add(corpo);

        // Faixas Neon do Shopping
        const faixaGeo = new THREE.BoxGeometry(3.2, 0.2, 3.2);
        malhaDetalhe = new THREE.MeshStandardMaterial({ color: 0x002244, emissive: 0x0088ff, emissiveIntensity: 1.5 });
        for(let i=1; i<=3; i++) {
            const faixa = new THREE.Mesh(faixaGeo, malhaDetalhe);
            faixa.position.y = (altura / 4) * i;
            grupo.add(faixa);
        }
    } 
    else { // Residencial
        altura = 1.5;
        const corpoGeo = new THREE.BoxGeometry(2, altura, 2);
        malhaCorpo = new THREE.MeshStandardMaterial({ color: 0xa0a0a0, metalness: 0.5, roughness: 0.5 });
        const corpo = new THREE.Mesh(corpoGeo, malhaCorpo);
        corpo.position.y = altura / 2;
        corpo.castShadow = true;
        grupo.add(corpo);

        // Telhado Solar
        const telhadoGeo = new THREE.PlaneGeometry(1.8, 1.8);
        malhaDetalhe = new THREE.MeshStandardMaterial({ color: 0x001122, emissive: 0xffaa00, emissiveIntensity: 0 });
        const telhado = new THREE.Mesh(telhadoGeo, malhaDetalhe);
        telhado.rotation.x = -Math.PI / 2;
        telhado.position.y = altura + 0.05;
        grupo.add(telhado);
    }

    // Hitbox invisível para o Raycaster
    const hitboxGeo = new THREE.BoxGeometry(5, altura + 2, 5);
    const hitboxMat = new THREE.MeshBasicMaterial({ visible: false });
    const hitbox = new THREE.Mesh(hitboxGeo, hitboxMat);
    hitbox.position.y = altura / 2;
    hitbox.userData = { id }; // Link para dados
    grupo.add(hitbox);

    scene.add(grupo);

    const dados = {
        id: id,
        tipo: tipo,
        prioridade: prioridade,
        consumoBase: consumoBase,
        consumoAtual: 0,
        geracaoSolar: 0,
        status: "NORMAL",
        grupo: grupo,
        malhaCorpo: malhaCorpo,
        malhaDetalhe: malhaDetalhe,
        temBackup: tipo === 'Hospital'
    };

    nosDaRede.push(dados);

    // Criar linha de energia conectando à Usina
    criarLinhaEnergia(grupo.position, dados);
}

function criarLinhaEnergia(pos, noProps) {
    const pontos = [];
    pontos.push(new THREE.Vector3(0, 1, 0)); // Usina
    
    // Ponto médio para dar um arco suave e colocar um poste
    const midX = pos.x / 2;
    const midZ = pos.z / 2;
    pontos.push(new THREE.Vector3(midX, 0.5, midZ)); 
    pontos.push(new THREE.Vector3(pos.x, 0.5, pos.z)); // Nó

    const spline = new THREE.CatmullRomCurve3(pontos);
    const tubeGeo = new THREE.TubeGeometry(spline, 20, 0.1, 8, false);
    const tubeMat = new THREE.MeshStandardMaterial({ 
        color: 0x00ff00, emissive: 0x00ff00, emissiveIntensity: 0.5, transparent: true, opacity: 0.6
    });
    const linha = new THREE.Mesh(tubeGeo, tubeMat);
    scene.add(linha);

    linhasDeEnergia.push({ mesh: linha, noId: noProps.id });

    // Poste no meio
    const posteGeo = new THREE.CylinderGeometry(0.1, 0.2, 3);
    const posteMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
    const poste = new THREE.Mesh(posteGeo, posteMat);
    poste.position.set(midX, 1.5, midZ);
    scene.add(poste);

    // Criar Partículas fluindo
    for(let i=0; i<3; i++) {
        const partGeo = new THREE.SphereGeometry(0.25, 8, 8);
        const partMat = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        const part = new THREE.Mesh(partGeo, partMat);
        scene.add(part);
        particulasEnergia.push({
            mesh: part,
            spline: spline,
            progress: i * 0.33,
            noId: noProps.id
        });
    }
}

// Povoando
criarNo("Hospital Central", "Hospital", -15, -15, 120, 1);
criarNo("Shopping Plaza", "Comercial", 20, -10, 150, 2);
criarNo("Centro Financeiro", "Comercial", -20, 15, 130, 2);
criarNo("Bairro Norte", "Residencial", 5, -25, 70, 3);
criarNo("Bairro Sul", "Residencial", -5, 25, 80, 3);
criarNo("Bairro Leste", "Residencial", 25, 10, 60, 3);
criarNo("Bairro Oeste", "Residencial", -25, -5, 65, 3);
criarNo("Vila Verde", "Residencial", 15, 20, 50, 3);

// ==========================================
// 4. LÓGICA DE SIMULAÇÃO (IA & FÍSICA)
// ==========================================
const logEntries = document.getElementById('log-entries');
function logEvent(msg, tipo = "info") {
    const el = document.createElement('div');
    el.className = 'log-entry';
    let horaReal = new Date().toLocaleTimeString();
    
    let color = "#e0e8f0";
    if (tipo === "warning") color = "#ffcc00";
    if (tipo === "danger") color = "#ff3344";
    if (tipo === "success") color = "#00ff66";
    
    el.innerHTML = `<span style="color:#5a7a9a">[${horaReal}]</span> <span style="color:${color}">${msg}</span>`;
    logEntries.prepend(el);
    if(logEntries.children.length > 20) logEntries.lastChild.remove();
}

logEvent("Sistema Smart Grid Inicializado. IA Operacional.", "success");

function processarSmartGrid() {
    let demandaTotal = 0;
    let geracaoSolarTotal = 0;

    // Calculando intensidade do sol (Ciclo de 0 a 1)
    let solZ = Math.sin(tempoVirtual); 
    let intensidadeSol = Math.max(0, solZ);
    
    if (configGeral.cenarioForcado === 'noite') intensidadeSol = 0;
    if (configGeral.cenarioForcado === 'solar') intensidadeSol = 1;

    // Atualiza Nó a Nó
    nosDaRede.forEach(no => {
        // Variação de consumo (Residencial sobe a noite, Comercial sobe de dia)
        let multiplicadorHorario = 1;
        if (no.tipo === 'Residencial') {
            multiplicadorHorario = 1 + (1 - intensidadeSol) * 0.5; // Mais a noite
        } else if (no.tipo === 'Comercial') {
            multiplicadorHorario = 1 + (intensidadeSol) * 0.4; // Mais de dia
        }

        let sobrecargaMult = configGeral.cenarioForcado === 'sobrecarga' ? 1.5 : 1;
        no.consumoAtual = no.consumoBase * multiplicadorHorario * sobrecargaMult * (1 + (Math.random() * 0.1 - 0.05));

        // Geração Solar (Apenas residenciais e comerciais tem painel neste modelo)
        no.geracaoSolar = 0;
        if (no.tipo !== 'Hospital') {
            no.geracaoSolar = (no.consumoBase * 0.6) * intensidadeSol; // Pode gerar ate 60% da sua base
        }

        let cargaEfetiva = no.consumoAtual - no.geracaoSolar;
        if (cargaEfetiva < 0) cargaEfetiva = 0; // Injeção de sobra não descontada da demanda aqui p/ simplificar

        demandaTotal += cargaEfetiva;
        geracaoSolarTotal += no.geracaoSolar;
    });

    // IA: Gestão de Bateria da Usina
    if (demandaTotal < configGeral.capacidadeAtual) {
        // Sobra energia, carregar bateria
        let sobra = configGeral.capacidadeAtual - demandaTotal;
        if (configGeral.bateriaAtual < configGeral.bateriaMax) {
            configGeral.bateriaAtual += Math.min(sobra * 0.05, 1);
        }
    }

    // IA: Verificação de Falha Crítica e Corte
    let energiaDisponivel = configGeral.capacidadeAtual;
    if (demandaTotal > energiaDisponivel && configGeral.bateriaAtual > 0) {
        // Usa bateria
        configGeral.bateriaAtual -= (demandaTotal - energiaDisponivel) * 0.05;
        if (configGeral.bateriaAtual < 0) configGeral.bateriaAtual = 0;
        energiaDisponivel += (configGeral.bateriaMax * 0.5); // Boost temporario
    }

    let falhaAnterior = falhaCritica;
    falhaCritica = demandaTotal > energiaDisponivel;

    if (falhaCritica && !falhaAnterior) logEvent("⚠️ ATENÇÃO: Demanda excede capacidade. Iniciando cortes.", "danger");
    if (!falhaCritica && falhaAnterior) logEvent("✅ Estabilidade recuperada. Restaurando rede.", "success");

    let demandaCortada = 0;

    nosDaRede.forEach(no => {
        let statusAnterior = no.status;
        no.status = "NORMAL";

        if (falhaCritica) {
            let demandaRestante = demandaTotal - demandaCortada;
            if (demandaRestante > energiaDisponivel) {
                // Tenta cortar Prioridade 3
                if (no.prioridade === 3) {
                    no.status = "CORTE";
                    demandaCortada += (no.consumoAtual - no.geracaoSolar);
                } 
                // Se ainda precisar, alerta Prioridade 2
                else if (no.prioridade === 2) {
                    no.status = "ALERTA";
                }
            }
        }

        // Se cortou, mas é hospital, liga backup
        if (no.status === "CORTE" && no.temBackup) {
            no.status = "BACKUP";
        }

        // Logs de mudança
        if (statusAnterior !== no.status) {
            if (no.status === "CORTE") logEvent(`🔻 Corte de energia aplicado em: ${no.id}`, "warning");
            if (no.status === "NORMAL" && statusAnterior === "CORTE") logEvent(`⚡ Energia restaurada em: ${no.id}`, "success");
        }

        // --- FEEDBACK VISUAL 3D ---
        let corPrincipal = 0x00ff00; // Verde

        if (no.status === "NORMAL" || no.status === "BACKUP") {
            if (no.tipo === 'Residencial') no.malhaDetalhe.emissiveIntensity = intensidadeSol; // Painel solar brilha
            if (no.tipo === 'Comercial') no.malhaDetalhe.emissive.setHex(0x0088ff);
            corPrincipal = 0x00ff00;
        } 
        else if (no.status === "ALERTA") {
            corPrincipal = 0xffff00;
            if (no.tipo === 'Comercial') no.malhaDetalhe.emissive.setHex(0xffff00);
        } 
        else if (no.status === "CORTE") {
            corPrincipal = 0xff0000;
            if (no.tipo === 'Residencial') no.malhaDetalhe.emissiveIntensity = 0;
            if (no.tipo === 'Comercial') no.malhaDetalhe.emissive.setHex(0x220000);
        }

        // Atualiza Linhas e Partículas
        linhasDeEnergia.forEach(linha => {
            if (linha.noId === no.id) {
                linha.mesh.material.color.setHex(corPrincipal);
                linha.mesh.material.emissive.setHex(corPrincipal);
                linha.mesh.material.opacity = no.status === "CORTE" ? 0.2 : 0.6;
            }
        });

        particulasEnergia.forEach(part => {
            if (part.noId === no.id) {
                part.mesh.material.color.setHex(corPrincipal);
                part.mesh.visible = no.status !== "CORTE"; // Some no corte
            }
        });
    });

    return { demandaTotal: demandaTotal - demandaCortada, geracaoSolarTotal };
}

// ==========================================
// 5. ATUALIZAÇÃO DA INTERFACE (DOM)
// ==========================================
const uiIds = {
    aiStatus: document.getElementById('ai-status'),
    usinaFill: document.getElementById('usina-capacity-fill'),
    usinaText: document.getElementById('usina-capacity-text'),
    solarFill: document.getElementById('solar-fill'),
    solarText: document.getElementById('solar-text'),
    batteryFill: document.getElementById('battery-fill'),
    batteryText: document.getElementById('battery-text'),
    clockDisplay: document.getElementById('clock-display'),
    nodesContainer: document.getElementById('nodes-container')
};

function initNodesUI() {
    uiIds.nodesContainer.innerHTML = '';
    nosDaRede.forEach(no => {
        const card = document.createElement('div');
        card.className = `node-card ${no.status.toLowerCase()}`;
        card.id = `card-${no.id.replace(/\s+/g, '-')}`;
        
        let icone = no.tipo === 'Hospital' ? '🏥' : (no.tipo === 'Comercial' ? '🏢' : '🏠');

        card.innerHTML = `
            <div class="node-header">
                <span class="node-icon">${icone}</span>
                <span class="node-name" title="${no.id}">${no.id}</span>
            </div>
            <div class="node-status ${no.status.toLowerCase()}">${no.status}</div>
            <div class="node-stats">
                <div class="stat-row"><span>Carga:</span> <span>${no.consumoAtual.toFixed(0)} kW</span></div>
                <div class="stat-row"><span class="solar-val">Solar:</span> <span class="solar-val">+${no.geracaoSolar.toFixed(0)} kW</span></div>
                <div class="mini-bar"><div class="mini-fill ${no.status.toLowerCase()}" style="width: 100%"></div></div>
            </div>
        `;
        uiIds.nodesContainer.appendChild(card);
    });
}
initNodesUI();

function updateUI(stats) {
    // Relógio
    let horaReal = ((tempoVirtual / (Math.PI * 2)) * 24 + 6) % 24; // Offset to start at dawn
    if(horaReal < 0) horaReal += 24;
    let h = Math.floor(horaReal);
    let m = Math.floor((horaReal - h) * 60);
    uiIds.clockDisplay.innerText = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;

    // Status da IA
    if (falhaCritica) {
        uiIds.aiStatus.className = 'ai-status danger';
        uiIds.aiStatus.innerText = '🔴 IA ATIVA: CORTES REALIZADOS';
    } else {
        uiIds.aiStatus.className = 'ai-status normal';
        uiIds.aiStatus.innerText = '🟢 REDE ESTÁVEL';
    }

    // Barras de Progresso
    let pctUsina = (stats.demandaTotal / configGeral.capacidadeAtual) * 100;
    uiIds.usinaFill.style.width = `${Math.min(pctUsina, 100)}%`;
    uiIds.usinaFill.className = `bar-fill ${pctUsina > 90 ? 'danger' : (pctUsina > 75 ? 'warning' : '')}`;
    uiIds.usinaText.innerText = `${stats.demandaTotal.toFixed(0)} / ${configGeral.capacidadeAtual} kW`;

    let maxSolar = 300; // Valor teórico maximo pra barra
    let pctSolar = (stats.geracaoSolarTotal / maxSolar) * 100;
    uiIds.solarFill.style.width = `${Math.min(pctSolar, 100)}%`;
    uiIds.solarText.innerText = `${stats.geracaoSolarTotal.toFixed(0)} kW (${pctSolar.toFixed(0)}%)`;

    let pctBateria = (configGeral.bateriaAtual / configGeral.bateriaMax) * 100;
    uiIds.batteryFill.style.width = `${pctBateria}%`;
    uiIds.batteryText.innerText = `${configGeral.bateriaAtual.toFixed(0)} / ${configGeral.bateriaMax} kWh`;

    // Atualiza Cards
    nosDaRede.forEach(no => {
        const card = document.getElementById(`card-${no.id.replace(/\s+/g, '-')}`);
        if(card) {
            card.className = `node-card ${no.status.toLowerCase()}`;
            card.querySelector('.node-status').className = `node-status ${no.status.toLowerCase()}`;
            card.querySelector('.node-status').innerText = no.status;
            card.querySelectorAll('.stat-row span:nth-child(2)')[0].innerText = `${no.consumoAtual.toFixed(0)} kW`;
            card.querySelectorAll('.stat-row span:nth-child(2)')[1].innerText = `+${no.geracaoSolar.toFixed(0)} kW`;
            card.querySelector('.mini-fill').className = `mini-fill ${no.status.toLowerCase()}`;
            card.querySelector('.mini-fill').style.width = `${Math.min((no.consumoAtual/no.consumoBase)*100, 100)}%`;
        }
    });
}

// ==========================================
// 6. INTERAÇÃO E CONTROLES (EVENTOS)
// ==========================================
const btnSobrecarga = document.getElementById('btn-sobrecarga');
const btnSolar = document.getElementById('btn-solar');
const btnNoite = document.getElementById('btn-noite');
const btnFalha = document.getElementById('btn-falha');
const btnReset = document.getElementById('btn-reset');
const speedSlider = document.getElementById('speed-slider');
const speedValue = document.getElementById('speed-value');

function clearBtns() {
    [btnSobrecarga, btnSolar, btnNoite, btnFalha].forEach(b => b.classList.remove('active'));
    configGeral.cenarioForcado = null;
    configGeral.capacidadeAtual = configGeral.capacidadeMaximaUsina;
}

btnSobrecarga.addEventListener('click', () => {
    clearBtns();
    btnSobrecarga.classList.add('active');
    configGeral.cenarioForcado = 'sobrecarga';
    logEvent("🔌 Cenário Ativado: Pico de Sobrecarga Simulada", "warning");
});

btnSolar.addEventListener('click', () => {
    clearBtns();
    btnSolar.classList.add('active');
    configGeral.cenarioForcado = 'solar';
    tempoVirtual = Math.PI / 2; // Sol a pino
    logEvent("☀️ Cenário Ativado: Pico de Geração Solar", "success");
});

btnNoite.addEventListener('click', () => {
    clearBtns();
    btnNoite.classList.add('active');
    configGeral.cenarioForcado = 'noite';
    tempoVirtual = Math.PI * 1.5; // Meia noite
    logEvent("🌙 Cenário Ativado: Noite Forçada", "info");
});

btnFalha.addEventListener('click', () => {
    clearBtns();
    btnFalha.classList.add('active');
    configGeral.cenarioForcado = 'falha';
    configGeral.capacidadeAtual = configGeral.capacidadeMaximaUsina * 0.4; // Cai pra 40%
    logEvent("💥 Cenário Ativado: Falha Estrutural na Usina Central!", "danger");
});

btnReset.addEventListener('click', () => {
    clearBtns();
    configGeral.bateriaAtual = configGeral.bateriaMax / 2;
    logEvent("🔄 Sistema reiniciado. Condições normais restauradas.", "info");
});

speedSlider.addEventListener('input', (e) => {
    configGeral.velocidade = parseFloat(e.target.value);
    speedValue.innerText = `${configGeral.velocidade.toFixed(1)}x`;
});

// --- RAYCASTER (Clique no 3D) ---
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const panelDetail = document.getElementById('panel-detail');

window.addEventListener('click', (event) => {
    // Ignora cliques nos painéis HTML
    if(event.target.tagName !== 'CANVAS') return;

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(scene.children, true);

    let clicouNo = false;

    for (let i = 0; i < intersects.length; i++) {
        let obj = intersects[i].object;
        if (obj.userData && obj.userData.id) {
            clicouNo = true;
            abrirDetalhe(obj.userData.id);
            break;
        }
    }

    if (!clicouNo) fecharDetalhe();
});

function abrirDetalhe(id) {
    const no = nosDaRede.find(n => n.id === id);
    if (!no) return;

    let icone = no.tipo === 'Hospital' ? '🏥' : (no.tipo === 'Comercial' ? '🏢' : '🏠');

    panelDetail.innerHTML = `
        <div class="detail-header">
            <span class="detail-icon">${icone}</span>
            <h3>${no.id}</h3>
            <button id="detail-close">✕</button>
        </div>
        <div class="detail-row"><span>Tipo</span> <span>${no.tipo}</span></div>
        <div class="detail-row"><span>Prioridade</span> <span>Nível ${no.prioridade}</span></div>
        <div class="detail-row"><span>Status</span> <span style="color:${no.status === 'NORMAL' || no.status === 'BACKUP' ? '#00ff66' : (no.status === 'ALERTA' ? '#ffff00' : '#ff3344')}">${no.status}</span></div>
        <div class="detail-row"><span>Consumo Atual</span> <span>${no.consumoAtual.toFixed(1)} kW</span></div>
        <div class="detail-row"><span>Geração Solar</span> <span>+${no.geracaoSolar.toFixed(1)} kW</span></div>
    `;
    
    panelDetail.classList.add('visible');
    document.getElementById('detail-close').addEventListener('click', fecharDetalhe);
}

function fecharDetalhe() {
    panelDetail.classList.remove('visible');
}

// ==========================================
// 7. LOOP PRINCIPAL DE RENDERIZAÇÃO
// ==========================================
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);

    let delta = clock.getDelta() * configGeral.velocidade;
    
    if (!configGeral.cenarioForcado || configGeral.cenarioForcado === 'falha' || configGeral.cenarioForcado === 'sobrecarga') {
        tempoVirtual += delta * 0.2; // Tempo corre normal
    }

    // Movimenta Sol (Orbitando o mundo)
    sol.position.x = Math.cos(tempoVirtual) * 50;
    sol.position.y = Math.sin(tempoVirtual) * 50;
    sol.position.z = Math.sin(tempoVirtual) * 20;

    // Muda a cor do céu baseado na altura do sol
    let solY = Math.max(0, Math.sin(tempoVirtual));
    scene.background.setRGB(0.01 + solY*0.1, 0.01 + solY*0.2, 0.02 + solY*0.4);
    scene.fog.color.copy(scene.background);

    // Anima Usina
    usinaGroup.rotation.y += delta * 0.2;
    aneisUsina.forEach((anel, i) => {
        anel.rotation.z += delta * (0.5 + i*0.2);
    });

    if (configGeral.cenarioForcado === 'falha') {
        luzUsina.color.setHex(0xff0000); // Fica vermelha
        coreUsina.material.emissive.setHex(0xff0000);
        // Pisca errático
        luzUsina.intensity = Math.random() > 0.5 ? 50 : 10;
    } else {
        luzUsina.color.setHex(0x00ccff);
        coreUsina.material.emissive.setHex(0x00ccff);
        luzUsina.intensity = 50 + Math.sin(Date.now() * 0.005) * 10; // Pulsação suave
    }

    // Anima Partículas nas Linhas
    particulasEnergia.forEach(part => {
        part.progress += delta * 0.5;
        if (part.progress > 1) part.progress = 0;
        
        let pos = part.spline.getPoint(part.progress);
        part.mesh.position.copy(pos);
    });

    // Processa Regras do Smart Grid
    let stats = processarSmartGrid();
    
    // Atualiza HTML
    updateUI(stats);

    controls.update();
    composer.render(); // Usa composer (Bloom) em vez do renderer normal
}

// Tratamento de Redimensionamento da Tela
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
});

// Iniciar
animate();

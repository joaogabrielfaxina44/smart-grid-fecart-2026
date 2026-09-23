import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CitySimulator, peakHourAgent, demandResponseAgent } from './smartAgents.js';
import { VFXManager } from './vfx.js';
import { StorytellingTour } from './storytelling.js';
import { PoleManager, TrafficManager, RepairManager } from './cityEntities.js';
import { materials, powerMats, groundLightPoolMaterial } from './sharedAssets.js';
import { cityGroup, powerGridObjects, windTurbines, cityStats, backendNodePositions } from './sceneState.js';
import { allFacadeMaterials } from './buildingRenderer.js';
import { ROAD_WIDTH, BLOCK_SIZE, ROAD_COORDS, BLOCK_CENTERS, WORLD_SIZE, createDistricts, createGround, createRoadNetwork, buildInstancedTrees, buildInstancedBases, buildInstancedRooftopsAndDetails } from './cityBuilder.js';
import { createPowerGrid, createTransmissionLines } from './powerGridRenderer.js';
import { notificationSystem } from './notificationSystem.js';
let poleManager, trafficManager, repairManager;

const container = document.getElementById('canvas-container');

// ── Cena, Câmera e Renderizador Ultraleve ─────────────────────

let currentDecimalTime = 7.0; // Hora inicial (07:00)
let targetDecimalTime = 7.0;
let isTimeRunning = true; // Simulação de tempo contínua ativa por padrão
let timeSpeed = 0.08; // 1 hora virtual a cada ~12.5s (minutos avançam continuamente e de forma fluida)
export let globalNightFactor = 0.0;

const scene = new THREE.Scene();
const vfxManager = new VFXManager(scene);
const skyColorDay = new THREE.Color(0xbfd3e6);
scene.background = skyColorDay.clone();
scene.fog = new THREE.Fog(0xbfd3e6, 320, 860);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1600);
const defaultAerialPos = new THREE.Vector3(190, 160, 230);
const defaultStreetPos = new THREE.Vector3(0, 2.2, 45);
camera.position.copy(defaultAerialPos);

const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: 'high-performance',
    stencil: false
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
container.appendChild(renderer.domElement);

// Controles Orbitais (para Modo Órbita)
const orbitControls = new OrbitControls(camera, renderer.domElement);
orbitControls.target.set(0, 0, 0);
orbitControls.enableDamping = true;
orbitControls.dampingFactor = 0.06;
orbitControls.screenSpacePanning = true;
orbitControls.minDistance = 4;
orbitControls.maxDistance = 800;
orbitControls.enabled = false;

// ── Sistema de Voo Espectador Livre (Spectator Fly Engine) ───

let cameraMode = 'fly';

const keys = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    up: false,
    down: false,
    sprint: false
};

const flyVelocity = new THREE.Vector3();
let isDraggingMouse = false;
let previousMousePos = { x: 0, y: 0 };
let mouseMovedDistance = 0;

let pitch = -0.58;
let yaw = -0.68;
let targetPitch = pitch;
let targetYaw = yaw;

let isGliding = false;
let glideTargetPos = null;

function resetKeys() {
    keys.forward = false;
    keys.backward = false;
    keys.left = false;
    keys.right = false;
    keys.up = false;
    keys.down = false;
    keys.sprint = false;
    isDraggingMouse = false;
    flyVelocity.set(0, 0, 0);
}

function setCameraMode(mode) {
    cameraMode = mode;
    resetKeys();
    const modeBtnText = document.getElementById('cam-mode-text');
    const hudPill = document.getElementById('hud-spectator');

    if (mode === 'fly') {
        orbitControls.enabled = false;
        const dir = new THREE.Vector3();
        camera.getWorldDirection(dir);
        yaw = Math.atan2(-dir.x, -dir.z);
        pitch = Math.asin(Math.max(-0.99, Math.min(0.99, dir.y)));
        targetYaw = yaw;
        targetPitch = pitch;
        if (modeBtnText) modeBtnText.textContent = 'Modo: 🛩️ Voo Espectador';
        if (hudPill) hudPill.style.display = 'flex';
    } else {
        orbitControls.enabled = true;
        const dir = new THREE.Vector3();
        camera.getWorldDirection(dir);
        const focusDistance = Math.min(80, Math.max(15, camera.position.y * 1.5));
        orbitControls.target.copy(camera.position).addScaledVector(dir, focusDistance);
        if (modeBtnText) modeBtnText.textContent = 'Modo: 🌐 Órbita Panorâmica';
        if (hudPill) hudPill.style.display = 'none';
    }
}

window.smoothGlideTo = function(pos, pitch, yaw) {
    const p = new THREE.Vector3(pos.x, pos.y, pos.z);
    smoothGlideToImpl(p, pitch, yaw);
};

function smoothGlideToImpl(pos, pitch, yaw) {
    isGliding = true;
    glideTargetPos = pos.clone();
    if (pitch !== undefined) targetPitch = pitch;
    if (yaw !== undefined) targetYaw = yaw;
    resetKeys();
}

function updateKey(code, key, isPressed) {
    const c = code || '';
    const k = (key || '').toLowerCase();

    if (c === 'KeyW' || c === 'ArrowUp' || k === 'w' || k === 'arrowup') {
        keys.forward = isPressed;
    } else if (c === 'KeyS' || c === 'ArrowDown' || k === 's' || k === 'arrowdown') {
        keys.backward = isPressed;
    } else if (c === 'KeyA' || c === 'ArrowLeft' || k === 'a' || k === 'arrowleft') {
        keys.left = isPressed;
    } else if (c === 'KeyD' || c === 'ArrowRight' || k === 'd' || k === 'arrowright') {
        keys.right = isPressed;
    } else if (c === 'Space' || c === 'KeyE' || k === ' ' || k === 'e') {
        keys.up = isPressed;
    } else if (c === 'ControlLeft' || c === 'ControlRight' || c === 'KeyC' || k === 'control' || k === 'c') {
        keys.down = isPressed;
    } else if (c === 'ShiftLeft' || c === 'ShiftRight' || k === 'shift') {
        keys.sprint = isPressed;
    }
}

// Listeners de Teclado no modo capture para nunca perder soltura de teclas
window.addEventListener('keydown', (e) => {
    if (cameraMode !== 'fly') return;
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
    updateKey(e.code, e.key, true);
    if (['Space', 'KeyE', 'KeyQ', 'ShiftLeft', 'ShiftRight', 'ArrowUp', 'ArrowDown'].includes(e.code)) {
        e.preventDefault();
    }
}, { capture: true });

window.addEventListener('keyup', (e) => {
    updateKey(e.code, e.key, false);
}, { capture: true });

// Previne globalmente menu de contexto do botão direito em toda a página
window.addEventListener('contextmenu', (e) => {
    e.preventDefault();
}, { capture: true });
document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
}, { capture: true });

// Reseta o estado das teclas se a janela perder o foco (Alt+Tab, troca de aba, clique fora)
window.addEventListener('blur', resetKeys);
window.addEventListener('focus', resetKeys);
document.addEventListener('visibilitychange', () => {
    if (document.hidden) resetKeys();
});

// Controle de Rotação por Mouse / Pointer
window.addEventListener('mousedown', (e) => {
    if (cameraMode !== 'fly') return;
    if (e.target && e.target.closest('#control-panel, #toggle-panel-btn')) return;

    if (e.button === 0 || e.button === 2) {
        if (e.button === 2) e.preventDefault();
        isDraggingMouse = true;
        previousMousePos = { x: e.clientX, y: e.clientY };
        mouseMovedDistance = 0;
    }
});

window.addEventListener('mousemove', (e) => {
    if (!isDraggingMouse || cameraMode !== 'fly') return;
    if (e.buttons === 0) {
        isDraggingMouse = false;
        return;
    }

    const deltaX = e.clientX - previousMousePos.x;
    const deltaY = e.clientY - previousMousePos.y;
    mouseMovedDistance += Math.hypot(deltaX, deltaY);

    const sensitivity = 0.0028;
    targetYaw -= deltaX * sensitivity;
    targetPitch -= deltaY * sensitivity;
    targetPitch = Math.max(-Math.PI / 2 + 0.04, Math.min(Math.PI / 2 - 0.04, targetPitch));

    previousMousePos = { x: e.clientX, y: e.clientY };
});

window.addEventListener('mouseup', () => {
    isDraggingMouse = false;
});
window.addEventListener('pointerup', () => {
    isDraggingMouse = false;
});
window.addEventListener('pointercancel', () => {
    isDraggingMouse = false;
});

renderer.domElement.addEventListener('wheel', (e) => {
    if (cameraMode !== 'fly') return;
    const forwardDir = new THREE.Vector3();
    camera.getWorldDirection(forwardDir);
    const altitude = camera.position.y;
    const baseSpeed = Math.max(12, 10 + Math.pow(Math.max(0, altitude) / 14, 1.2) * 4.5);
    const impulse = e.deltaY < 0 ? 12 : -12;
    flyVelocity.addScaledVector(forwardDir, impulse);
    flyVelocity.clampLength(0, baseSpeed * 2.0);
}, { passive: true });

// ── Geometrias, Materiais & Texturas Compartilhadas ──────────

scene.add(cityGroup);
// ── Raycaster & Cliques ─────────────────────────────────────

const raycaster = new THREE.Raycaster();
raycaster.params.Line.threshold = 1.5;
raycaster.params.Points = { threshold: 1.0 };
const mouse = new THREE.Vector2();
const mouseScreen = new THREE.Vector2(); // posição em pixels do mouse
let hoveredTransmissionLine = null; // linha de transmissão sob o cursor
let wireTooltipEl = null;
let wireTooltipNameEl = null;

// Nomes amigáveis (espelha o NAME_MAP do notificationSystem)
const NODE_DISPLAY_NAMES = {
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
function nodeName(id) { return NODE_DISPLAY_NAMES[id] || id || '?'; }

// ── Hover sobre linhas de transmissão ─────────────────────────
function setupHover() {
    wireTooltipEl = document.getElementById('wire-tooltip');
    wireTooltipNameEl = document.getElementById('wire-tooltip-name');

    renderer.domElement.addEventListener('mousemove', (event) => {
        if (isDraggingMouse) {
            if (hoveredTransmissionLine) {
                hoveredTransmissionLine = null;
                if (wireTooltipEl) wireTooltipEl.classList.remove('visible');
                renderer.domElement.style.cursor = '';
            }
            return;
        }

        mouseScreen.x = event.clientX;
        mouseScreen.y = event.clientY;

        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);

        // Testar apenas linhas de transmissão (com backendEdgeId)
        const transLinesGroup = cityGroup.children.find(c => c.name === 'transmission_lines');
        if (!transLinesGroup) return;

        const transmissionMeshes = transLinesGroup.children.filter(
            c => c.userData?.backendEdgeId && c.userData?.u && c.userData?.v
        );

        const hits = raycaster.intersectObjects(transmissionMeshes, false);

        if (hits.length > 0) {
            const hit = hits[0].object;
            if (hit !== hoveredTransmissionLine) {
                hoveredTransmissionLine = hit;
                renderer.domElement.style.cursor = 'crosshair';

                const u = hit.userData.u;
                const v = hit.userData.v;
                const edge = citySimulator?.grafo?.getEdge(u, v);
                const carga = edge ? Math.round((edge.fluxo_kw_atual / Math.max(edge.capacidade_maxima_kw, 1)) * 100) : 0;
                const status = edge?.status_ativa === false ? '⛔ INATIVA' : `${carga}% de carga`;

                if (wireTooltipNameEl) wireTooltipNameEl.textContent = `${nodeName(u)} ↔ ${nodeName(v)}`;

                // Atualiza hint com status da linha
                const hintEl = wireTooltipEl?.querySelector('.wt-hint');
                if (hintEl) {
                    if (edge?.status_ativa === false) {
                        hintEl.textContent = '(linha já inativa)';
                    } else {
                        hintEl.textContent = `${status} — Clique para cortar`;
                    }
                }
            }

            if (wireTooltipEl) {
                wireTooltipEl.classList.add('visible');
                wireTooltipEl.style.left = `${mouseScreen.x + 18}px`;
                wireTooltipEl.style.top = `${mouseScreen.y - 40}px`;
            }
        } else {
            if (hoveredTransmissionLine) {
                hoveredTransmissionLine = null;
                renderer.domElement.style.cursor = '';
                if (wireTooltipEl) wireTooltipEl.classList.remove('visible');
            }
        }
    });
}

function setupRaycaster() {
    setupHover();

    renderer.domElement.addEventListener('click', (event) => {
        if (mouseMovedDistance > 8) return;

        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);

        if (poleManager && poleManager.checkClick(mouse, camera)) {
            return;
        }

        const interactables = [];
        powerGridObjects.forEach(g => {
            g.children.forEach(c => interactables.push(c));
        });
        cityGroup.children.forEach(g => {
            if (g.name.startsWith('solar_farm') || g.name.startsWith('wind_farm') || g.name.startsWith('power_plant')) {
                interactables.push(g);
            }
        });

        const intersects = raycaster.intersectObjects(interactables, true);
        if (intersects.length > 0) {
            const hit = intersects[0];
            let target = hit.object;

            // ── Clique em Fonte de Energia ───────────────
            let current = target;
            while (current && current !== scene) {
                if (current.name.startsWith('solar_farm') || current.name.startsWith('wind_farm') || current.name.startsWith('power_plant')) {
                    triggerEnergySourceInfo(current, hit.point.clone(), event);
                    return;
                }
                current = current.parent;
            }

            // ── Clique em Linha de Transmissão ───────────────
            if (target.userData?.backendEdgeId && target.userData.u && target.userData.v) {
                const u = target.userData.u;
                const v = target.userData.v;
                const edge = citySimulator?.grafo?.getEdge(u, v);

                if (edge && !edge.status_ativa) {
                    notificationSystem.show('info', 'Linha já Inativa',
                        `${nodeName(u)} ↔ ${nodeName(v)} já está desligada.`, 3000);
                    return;
                }

                const clickPoint = hit.point.clone();
                triggerLineBreak(u, v, clickPoint);
                return;
            }

            // ── Clique em Fio de Distribuição (postes locais) ─
            while (target.parent && !target.parent.userData?.isGridNode) {
                target = target.parent;
                if (!target) break;
            }
            if (target && target.parent && target.parent.userData?.isGridNode) {
                const clickPoint = hit.point.clone();
                triggerLocalBlackout(target.parent, clickPoint);
            }
        }
    });
}

function triggerEnergySourceInfo(group, point, event = null) {
    const isSolar = group.name.startsWith('solar');
    const isWind = group.name.startsWith('wind');
    const isNuclear = group.name.startsWith('power_plant');

    let title = '';
    let nodeNameStr = '';
    let color = 0xffffff;

    if (isSolar) {
        title = 'Fazenda Solar';
        nodeNameStr = 'Fazenda_Solar';
        color = 0x38bdf8;
        vfxManager.createPulseEffect(point, color, true, 18.0);
    } else if (isWind) {
        title = 'Parque Eólico';
        nodeNameStr = 'Parque_Eolico';
        color = 0xffffff;
        vfxManager.createPulseEffect(point, color, false, 25.0);
        // Spin blades faster temporarily
        window._windBoostTime = 2.0; 
    } else if (isNuclear) {
        title = 'Usina Nuclear';
        nodeNameStr = 'Usina_Nuclear';
        color = 0x4ade80;
        vfxManager.createPulseEffect(point, color, false, 20.0);
        vfxManager.emitNuclearSteam(new THREE.Vector3(point.x, point.y + 20, point.z), 5);
    }

    const node = citySimulator?.grafo?.nodes.get(nodeNameStr);
    const kw = node ? Math.abs(node.demanda_kw_atual || 0).toFixed(1) : '0.0';
    const status = node ? (node.demanda_kw_atual < 0 ? 'Gerando' : 'Inativo') : 'Desconhecido';

    const div = document.createElement('div');
    div.className = 'energy-source-popup';
    div.innerHTML = `
        <h4 style="color: #${color.toString(16).padStart(6, '0')}; margin: 0 0 8px 0; border-bottom: 1px solid rgba(255,255,255,0.2); padding-bottom: 4px;">${title}</h4>
        <div style="font-size: 0.9rem; margin-bottom: 4px;"><strong>Status:</strong> ${status}</div>
        <div style="font-size: 0.9rem; margin-bottom: 4px;"><strong>Produção:</strong> ${kw} kW</div>
    `;
    div.style.position = 'absolute';
    div.style.background = 'rgba(15, 20, 30, 0.85)';
    div.style.backdropFilter = 'blur(8px)';
    div.style.border = `1px solid #${color.toString(16).padStart(6, '0')}`;
    div.style.padding = '12px 16px';
    div.style.borderRadius = '8px';
    div.style.color = '#fff';
    div.style.pointerEvents = 'none';
    div.style.zIndex = '9999';
    div.style.opacity = '0';
    div.style.transform = 'translateY(10px)';
    div.style.transition = 'all 0.3s ease-out';
    div.style.boxShadow = `0 4px 15px rgba(0,0,0,0.5), 0 0 10px #${color.toString(16).padStart(6, '0')}44`;
    
    // Position near mouse or screen center
    const clientX = event?.clientX ?? (window.innerWidth / 2);
    const clientY = event?.clientY ?? (window.innerHeight / 2);
    div.style.left = Math.min(window.innerWidth - 200, clientX + 15) + 'px';
    div.style.top = Math.max(20, clientY - 40) + 'px';
    
    document.body.appendChild(div);
    
    // Animate in
    requestAnimationFrame(() => {
        div.style.opacity = '1';
        div.style.transform = 'translateY(0)';
    });

    // Remove after 3 seconds
    setTimeout(() => {
        div.style.opacity = '0';
        div.style.transform = 'translateY(-10px)';
        setTimeout(() => div.remove(), 300);
    }, 3000);
}

// ── Corte de Linha de Transmissão (com resposta da IA) ───────
function triggerLineBreak(u, v, clickPoint) {
    console.log(`[3D Click] Cortando linha de transmissão: ${u} ↔ ${v}`);

    // 1. VFX imediato
    notificationSystem.triggerScreenFlash('red', 400);
    vfxManager.createArcFlash(clickPoint);
    // Faíscas adicionais
    setTimeout(() => vfxManager.createSparks(clickPoint), 80);

    // 2. Notificação de corte imediata
    notificationSystem.showLineCut(u, v);

    // 3. Banner "IA processando" (aparece logo após)
    setTimeout(() => {
        notificationSystem.showAiThinking(1600);
    }, 400);

    // 4. Executar a falha na IA (e capturar os logs)
    setTimeout(() => {
        const logs = citySimulator.simularFalha(u, v);

        // 5. Após a IA processar, mostrar as decisões com delay dramático
        setTimeout(() => {
            notificationSystem.processLogs(logs, true);

            // 6. Se houver rota de contingência, animar o healing pulse
            const transLinesGroup = cityGroup.children.find(c => c.name === 'transmission_lines');
            if (transLinesGroup) {
                for (const edge of citySimulator.grafo.edges.values()) {
                    if (edge.is_contingencia) {
                        const p1 = backendNodePositions[edge.origem];
                        const p2 = backendNodePositions[edge.destino];
                        if (p1 && p2) {
                            // Cria o pulso de cura ao longo da rota de contingência
                            vfxManager.createHealingPulse([
                                p1.clone().setY(p1.y + 2),
                                p2.clone().setY(p2.y + 2)
                            ]);
                        }
                    }
                }
            }
        }, 1200);
    }, 200);
}

// ── Blackout Local (fios de poste) ────────────────────────────
function setWireMaterial(group, matKey) {
    group.children.forEach(child => {
        if ((child.isLine || child.isLineSegments) && child.userData[matKey]) {
            child.material = child.userData[matKey];
        }
    });
}

function triggerLocalBlackout(targetGroup, clickPoint) {
    if (!targetGroup.userData.active) {
        notificationSystem.show('info', 'Setor Já Desligado',
            'Este trecho de fios já está sem energia.', 2500);
        return;
    }
    targetGroup.userData.active = false;
    setWireMaterial(targetGroup, 'blackoutMat');

    // Apaga lâmpadas de rua no grupo
    targetGroup.traverse(child => {
        if (child.name === 'streetLampBulb' && child.material) {
            child.material.emissive.setHex(0x000000);
        }
    });

    // VFX no ponto de clique
    if (clickPoint) {
        notificationSystem.triggerScreenFlash('red', 300);
        vfxManager.createSparks(clickPoint);
    }

    // Notificação
    notificationSystem.showSectorBlackout('Setor de Distribuição Local');
}

// Alias legado para compatibilidade com código existente
function triggerBlackout(targetGroup) {
    triggerLocalBlackout(targetGroup, null);
}

let sceneLightState = 'day';

function setupUI() {
    const panel = document.getElementById('control-panel');
    const headerBar = document.getElementById('panel-header-bar');

    if (headerBar && panel) {
        // Clicar no cabeçalho inteiro minimiza/maximiza
        headerBar.addEventListener('click', () => {
            panel.classList.toggle('collapsed');
        });
    }

    // 🛑 CORREÇÃO DEFINITIVA DO SCROLL (Impede Zoom/Pan na câmera do Three.js)
    if (panel) {
        const stopEvent = (e) => e.stopPropagation();
        const events = ['wheel', 'touchstart', 'touchmove', 'touchend', 'pointerdown', 'pointermove', 'pointerup', 'dblclick'];
        events.forEach(eventType => {
            panel.addEventListener(eventType, stopEvent, { passive: false });
        });
    }

    // Toggle Dashboard Avançado (Minimizar)
    const dashToggleBtn = document.getElementById('dash-toggle-btn');
    const dashPanel = document.getElementById('city-dashboard');
    if (dashToggleBtn && dashPanel) {
        dashToggleBtn.addEventListener('click', () => {
            dashPanel.classList.toggle('collapsed');
        });
    }

    // Toggle Dashboard Avançado (Maximizar / Fullscreen)
    const dashMaxBtn = document.getElementById('dash-maximize-btn');
    if (dashMaxBtn && dashPanel) {
        dashMaxBtn.addEventListener('click', () => {
            dashPanel.classList.toggle('maximized');
            if(dashPanel.classList.contains('maximized')) {
                dashMaxBtn.innerHTML = '🗗'; // icone de restaurar
            } else {
                dashMaxBtn.innerHTML = '⛶'; // icone de maximizar
            }
        });
    }

    // 🛑 CORREÇÃO DEFINITIVA DO SCROLL PARA O DASHBOARD (Impede Zoom/Pan)
    if (dashPanel) {
        const stopEvent = (e) => e.stopPropagation();
        const events = ['wheel', 'touchstart', 'touchmove', 'touchend', 'pointerdown', 'pointermove', 'pointerup', 'dblclick'];
        events.forEach(eventType => {
            dashPanel.addEventListener(eventType, stopEvent, { passive: false });
        });
    }

    // 0. Botão: Pausar / Destravar Tempo (Play/Pause)
    const btnToggleTime = document.getElementById('btn-toggle-time');
    const iconPause = document.getElementById('icon-time-pause');
    const iconPlay = document.getElementById('icon-time-play');
    const textTimeToggle = document.getElementById('time-toggle-text');

    btnToggleTime?.addEventListener('click', () => {
        isTimeRunning = !isTimeRunning;
        if (isTimeRunning) {
            btnToggleTime.className = 'control-btn success';
            if (iconPause) iconPause.style.display = 'block';
            if (iconPlay) iconPlay.style.display = 'none';
            if (textTimeToggle) textTimeToggle.textContent = 'Pausar Tempo (Travar)';
            console.log('[Simulador] Tempo destravado (avanço contínuo ativo).');
        } else {
            btnToggleTime.className = 'control-btn warning';
            if (iconPause) iconPause.style.display = 'none';
            if (iconPlay) iconPlay.style.display = 'block';
            if (textTimeToggle) textTimeToggle.textContent = 'Destravar Tempo (Rodar)';
            console.log('[Simulador] Tempo travado / pausado.');
        }
    });

    // 1. Botão: Avançar 1 Hora (+1h)
    document.getElementById('btn-avancar-hora')?.addEventListener('click', () => {
        const proximaHora = (Math.floor(targetDecimalTime) + 1) % 24;
        targetDecimalTime = proximaHora;
        currentDecimalTime = proximaHora;
        lastCheckedHour = proximaHora;
        if (citySimulator?.estado) {
            citySimulator.estado.hora = proximaHora;
            citySimulator.tick(0);
        }
        console.log(`[Painel] Botão Avançar Hora clicado (${proximaHora}:00).`);
    });

    // 2. Botão: Simular Sobrecarga
    document.getElementById('btn-sobrecarga')?.addEventListener('click', () => {
        const noIndustria = citySimulator.grafo.nodes.get('Zona_Industrial_A');
        if (noIndustria) {
            noIndustria.sobrecarga_ativa = true;
        }
        // Flash de aviso
        notificationSystem.triggerScreenFlash('red', 300);
        notificationSystem.show('overload', 'Sobrecarga Aplicada',
            'Zona Industrial A operando em 250% da demanda base.\nA IA vai acionar o corte de emergência.', 6000);
        if (citySimulator) citySimulator.tick(0);
    });

    // 3. Botão: Forçar Noite / Clima (20h)
    document.getElementById('btn-forcar-noite')?.addEventListener('click', () => {
        targetDecimalTime = 20.0;
        currentDecimalTime = 20.0;
        lastCheckedHour = 20;
        if (citySimulator?.estado) {
            citySimulator.estado.hora = 20;
            citySimulator.tick(0);
        }
        notificationSystem.show('info', 'Hora Avançada para 20:00',
            'Pico noturno ativo. Demanda residencial em alta.', 4000);
    });

    // 4. Botão: Falha na Usina (Blackout / Self-Healing) — com sequência dramática completa
    document.getElementById('btn-falha-usina')?.addEventListener('click', () => {
        const u = 'Subestacao_Central';
        const v = 'Hospital_Prontomed';
        const edge = citySimulator?.grafo?.getEdge(u, v);

        // Ponto central da cena como posição para o VFX
        const vfxPoint = new THREE.Vector3(0, 25, 0);
        const p1 = backendNodePositions[u];
        const p2 = backendNodePositions[v];
        if (p1 && p2) {
            vfxPoint.lerpVectors(p1, p2, 0.5);
        }

        if (edge && !edge.status_ativa) {
            notificationSystem.show('info', 'Linha Já Inativa',
                'Subestação Central ↔ Hospital Prontomed já está desligada.\nResetar a cidade para nova simulação.', 4000);
            return;
        }

        triggerLineBreak(u, v, vfxPoint);
    });

    // 5. Botão: Resetar Cidade
    document.getElementById('btn-reset')?.addEventListener('click', () => {
        console.log('[Painel] Resetando cidade...');
        targetDecimalTime = 7.0;
        currentDecimalTime = 7.0;
        lastCheckedHour = 7;
        if (citySimulator) citySimulator.resetar();
        notificationSystem.show('success', 'Cidade Resetada', 'Rede elétrica restaurada ao estado inicial (07:00).', 4000);
    });

    // 6. Tour Guiada
    const hudAlertContainer = document.getElementById('hud-alert-container');
    const tour = new StorytellingTour(camera, citySimulator, hudAlertContainer);
    document.getElementById('btn-iniciar-tour')?.addEventListener('click', () => {
        tour.start();
        setCameraMode('fly'); // Garante que a câmera aceita Glide
    });

    // 7. Controles de Câmera
    document.getElementById('btn-toggle-cam-mode')?.addEventListener('click', () => {
        setCameraMode(cameraMode === 'fly' ? 'orbit' : 'fly');
    });

    document.getElementById('btn-street-level')?.addEventListener('click', () => {
        if (cameraMode !== 'fly') setCameraMode('fly');
        targetPitch = 0.04;
        targetYaw = 0;
        smoothGlideToImpl(defaultStreetPos);
    });

    document.getElementById('btn-aerial-view')?.addEventListener('click', () => {
        if (cameraMode !== 'fly') setCameraMode('fly');
        targetPitch = -0.58;
        targetYaw = -0.68;
        smoothGlideToImpl(defaultAerialPos);
    });
}

let hemiLight = null;
let sunLight = null;
let moonLight = null;
let starMaterial = null;

function createLighting() {
    hemiLight = new THREE.HemisphereLight(0xdcefff, 0x6e7568, 1.45);
    scene.add(hemiLight);

    // Luz Solar (Dia)
    sunLight = new THREE.DirectionalLight(0xfff3d7, 3.0);
    sunLight.position.set(-180, 250, 130);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.set(1024, 1024);
    sunLight.shadow.camera.near = 40;
    sunLight.shadow.camera.far = 650;
    sunLight.shadow.camera.left = -260;
    sunLight.shadow.camera.right = 260;
    sunLight.shadow.camera.top = 260;
    sunLight.shadow.camera.bottom = -260;
    sunLight.shadow.bias = -0.0004;
    sunLight.shadow.normalBias = 0.02;
    scene.add(sunLight);

    // Luz Lunar (Noite - iluminação azulada elegante e sombras suaves à noite)
    moonLight = new THREE.DirectionalLight(0x8eaed6, 0.0);
    moonLight.position.set(180, 250, -130);
    moonLight.castShadow = true;
    moonLight.shadow.mapSize.set(1024, 1024);
    moonLight.shadow.camera.near = 40;
    moonLight.shadow.camera.far = 650;
    moonLight.shadow.camera.left = -260;
    moonLight.shadow.camera.right = 260;
    moonLight.shadow.camera.top = 260;
    moonLight.shadow.camera.bottom = -260;
    moonLight.shadow.bias = -0.0004;
    moonLight.shadow.normalBias = 0.02;
    scene.add(moonLight);
}

function createStarfield() {
    const starCount = 1600;
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
        const radius = 600 + Math.random() * 350;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(0.04 + Math.random() * 0.96);

        positions[i * 3]     = radius * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = radius * Math.cos(phi);
        positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);

        const starType = Math.random();
        if (starType > 0.75) {
            colors[i * 3] = 0.85; colors[i * 3 + 1] = 0.93; colors[i * 3 + 2] = 1.0;
        } else if (starType > 0.5) {
            colors[i * 3] = 1.0; colors[i * 3 + 1] = 0.94; colors[i * 3 + 2] = 0.82;
        } else {
            colors[i * 3] = 0.98; colors[i * 3 + 1] = 0.98; colors[i * 3 + 2] = 0.98;
        }
    }

    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    starMaterial = new THREE.PointsMaterial({
        size: 2.2,
        vertexColors: true,
        transparent: true,
        opacity: 0.0,
        sizeAttenuation: false,
        depthWrite: false
    });

    const starPoints = new THREE.Points(starGeo, starMaterial);
    scene.add(starPoints);
}

let activePole = null;

function showPoleUI(pole) {
    activePole = pole;
    document.getElementById('pole-ui-container').style.display = 'block';
    updatePoleUI();
}

function updatePoleUI() {
    if (!activePole) return;
    document.getElementById('pole-ui-id').innerText = '#' + activePole.userData.id;
    const st = activePole.userData.status;
    document.getElementById('pole-ui-status').innerText = st.charAt(0).toUpperCase() + st.slice(1);
    
    const dur = activePole.userData.durability;
    const bar = document.getElementById('pole-ui-durability-bar');
    bar.style.width = dur + '%';
    
    if (dur > 60) bar.style.background = '#2ecc71';
    else if (dur > 20) bar.style.background = '#f1c40f';
    else bar.style.background = '#e74c3c';
    
    const repairBtn = document.getElementById('pole-ui-repair-btn');
    if (st === 'manutencao') {
        repairBtn.innerText = 'Em Manutenção...';
        repairBtn.disabled = true;
        repairBtn.style.opacity = '0.5';
    } else if (st === 'quebrado' || dur <= 0) {
        repairBtn.innerText = 'Quebrado (Aguardando IA)';
        repairBtn.disabled = true;
        repairBtn.style.opacity = '0.5';
    } else {
        repairBtn.innerText = 'Simular Quebra do Poste';
        repairBtn.disabled = false;
        repairBtn.style.opacity = '1.0';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('pole-ui-close-btn').addEventListener('click', () => {
        activePole = null;
        document.getElementById('pole-ui-container').style.display = 'none';
    });

    document.getElementById('pole-ui-repair-btn').addEventListener('click', () => {
        if (activePole) {
            activePole.userData.durability = 0;
            // The AI will automatically dispatch the truck in the next frame
            updatePoleUI();
        }
    });
});

function initializeScene() {
    poleManager = new PoleManager(scene);
    poleManager.onPoleClick = showPoleUI;
    trafficManager = new TrafficManager(scene, ROAD_COORDS, BLOCK_SIZE, ROAD_WIDTH);
    repairManager = new RepairManager(scene, poleManager);

    createGround();
    createRoadNetwork();
    createDistricts();
    createLighting();
    createStarfield();
    createPowerGrid(poleManager);
    poleManager.build();
    createTransmissionLines();

    buildInstancedTrees();
    buildInstancedBases();
    buildInstancedRooftopsAndDetails();

    trafficManager.init();

    cityGroup.updateMatrixWorld(true);

    setupRaycaster();
    setupUI();
    setCameraMode('fly');
    window.smartCityStats = cityStats;
}

// ── Sincronização Visual com o Motor de IA ───────────────────

const ID_MAP = {
    'Subestacao_Central':   'Subestacao_Central',
    'Subestacao_Norte':     'Subestacao_Norte',
    'Subestacao_Sul':       'Subestacao_Sul',
    'Hospital_Prontomed':   'Hospital_Prontomed',
    'Bairro_Residencial_A': 'Bairro_Residencial_A',
    'Bairro_Residencial_B': 'Bairro_Residencial_B',
    'Centro_Comercial':     'Centro_Comercial',
    'Shopping_Metropolitano':'Shopping_Metropolitano',
    'Zona_Industrial_A':    'Zona_Industrial_A',
    'Data_Center':          'Data_Center',
    'Escolas':              'Escolas',
    'Fazenda_Solar':        'Fazenda_Solar'
};

function syncSceneWithBackend(grafo, estado, logs) {
    if (logs && logs.length > 0) {
        console.groupCollapsed(`[SmartGrid] Tick ${estado.hora}h — ${logs.length} ação(ões)`);
        logs.forEach(l => console.log(l));
        console.groupEnd();
    }

    // ── 1. Sincronizar Nós (Apagão por bairro / Edifícios) ──────
    // First, map nodes to their primary 3D blocks
    const blockMappings = [];
    for (const [nodeId, node] of grafo.nodes) {
        const threeId = ID_MAP[nodeId];
        if (!threeId) continue;
        const bloco3D = cityGroup.children.find(c => c.isGroup && c.userData?.backendId === threeId);
        if (bloco3D) blockMappings.push({ node, bloco3D, primary: true });
    }

    // Mirror Bairro_Residencial_A to ALL cosmetic residential/mixed blocks for maximum visual impact
    const nodeResA = grafo.nodes.get('Bairro_Residencial_A');
    const nodeComA = grafo.nodes.get('Centro_Comercial');
    cityGroup.children.forEach(c => {
        if (c.isGroup && !c.userData?.backendId) {
            if (nodeResA && (c.name.startsWith('residential-') || c.name.startsWith('mixed-'))) {
                blockMappings.push({ node: nodeResA, bloco3D: c, primary: false });
            } else if (nodeComA && c.name.startsWith('commercial-')) {
                blockMappings.push({ node: nodeComA, bloco3D: c, primary: false });
            }
        }
    });

    // Process all visual updates
    for (const { node, bloco3D } of blockMappings) {
        bloco3D.children.forEach(child => {
            if (child.name === 'distribution_wire') {
                const isCortado = node.em_corte_emergencia;
                if (!node.status_energizado) {
                    child.material = powerMats.wireBlackout;
                } else if (isCortado) {
                    child.material = powerMats.wireBlackout; // Sem fluxo!
                } else {
                    child.material = powerMats.wireGlowing; // Fluxo normal
                }
            }
        });

        if (bloco3D.userData.facadeMaterials) {
            bloco3D.userData.facadeMaterials.forEach(mat => {
                if (!mat) return;
                const isCortado = node.em_corte_emergencia;

                if (!node.status_energizado) {
                    if (mat.emissive) mat.emissive.setHex(0x000000);
                    if (mat.emissiveIntensity !== undefined) mat.emissiveIntensity = 0;
                } else if (isCortado) {
                    if (mat.emissive) mat.emissive.setHex(0x440000); // Red glow for cut demand
                    if (mat.emissiveIntensity !== undefined) mat.emissiveIntensity = 1.0;
                } else {
                    if (sceneLightState === 'night' && mat.map && mat.emissive) {
                        mat.emissive.setHex(0x555544); // Normal night window glow
                        mat.emissiveIntensity = 1.0;
                    } else if (sceneLightState === 'day' && mat.emissive) {
                        mat.emissive.setHex(0x000000);
                        mat.emissiveIntensity = 0;
                    }
                }
            });
        }
    }

    // ── 2. Sincronizar Linhas de Transmissão (Sobrecarga / Falha) ──
    const transLinesGroup = cityGroup.children.find(c => c.name === 'transmission_lines');
    if (transLinesGroup) {
        for (const edge of grafo.edges.values()) {
            const edgeKey1 = `${edge.origem}-${edge.destino}`;
            const edgeKey2 = `${edge.destino}-${edge.origem}`;
            const linha = transLinesGroup.children.find(
                l => l.userData?.backendEdgeId === edgeKey1 || l.userData?.backendEdgeId === edgeKey2
            );
            if (!linha) continue;

            const taxaCarga = edge.fluxo_kw_atual / Math.max(edge.capacidade_maxima_kw, 1);

            if (!edge.status_ativa) {
                linha.material = powerMats.wireBlackout;
                if (!linha.userData.broken) {
                    // Just broke! Create sparks at the middle of the line
                    linha.geometry.computeBoundingBox();
                    const center = new THREE.Vector3();
                    linha.geometry.boundingBox.getCenter(center);
                    center.applyMatrix4(linha.matrixWorld);
                    if (typeof vfxManager !== 'undefined') vfxManager.createSparks(center);
                }
                linha.userData.broken = true;
            } else if (edge.is_contingencia) {
                linha.material = powerMats.wireHealing;
                const direcao = edge.fluxo_kw_atual < 0 ? -1 : 1;
                linha.userData.currentSpeed = 15.0 * direcao;
                linha.userData.broken = false;
            } else if (taxaCarga >= 0.95) {
                linha.material = powerMats.wireCritical; // Vermelho
                const direcao = edge.fluxo_kw_atual < 0 ? -1 : 1;
                linha.userData.currentSpeed = 20.0 * direcao;      // 3x mais rápido
                linha.userData.broken = false;
            } else if (taxaCarga >= 0.85) {
                linha.material = powerMats.wireOverload; // Laranja
                const direcao = edge.fluxo_kw_atual < 0 ? -1 : 1;
                linha.userData.currentSpeed = 10.0 * direcao;      // 2x mais rápido
                linha.userData.broken = false;
            } else {
                linha.material = powerMats.wireGlowing;  // Azul neon
                const direcao = edge.fluxo_kw_atual < 0 ? -1 : 1;
                linha.userData.currentSpeed = 5.0 * direcao;       // Velocidade normal
                linha.userData.broken = false;
            }
        }
    }

    // ── 3. Atualizar Dashboard de Telemetria Avançado ──────────────
    if (estado && estado.hora !== undefined) {
        targetDecimalTime = estado.hora;
    }
    
    // Status Global & Tempo
    const dashTime = document.getElementById('dash-time');
    const dashWeather = document.getElementById('dash-weather');
    if (dashTime) {
        const hh = Math.floor(estado.hora).toString().padStart(2, '0');
        const mm = Math.floor((estado.hora % 1) * 60).toString().padStart(2, '0');
        dashTime.textContent = `${hh}:${mm}`;
    }
    const weatherIcons = { 'ensolarado': '☀️', 'nublado': '☁️', 'chuvoso': '🌧️', 'tempestade': '⛈️' };
    if (dashWeather) dashWeather.textContent = weatherIcons[estado.clima] || estado.clima;

    // Métricas
    const demandaAtual = grafo.demandaTotalKw();
    const capacidadeMax = (typeof grafo.capacidadeTotalSubestacoes === 'function') ? grafo.capacidadeTotalSubestacoes() : 9000;
    let geracaoRenovavel = 0;
    
    // Listas do DOM
    const sourcesList = document.getElementById('dash-sources-list');
    const distList = document.getElementById('dash-districts-list');
    if (sourcesList) sourcesList.innerHTML = '';
    if (distList) distList.innerHTML = '';

    let blackouts = 0;
    let sobrecargas = 0;

    for (const node of grafo.nodes.values()) {
        if (node.is_subestacao || node.tipo === 'Geração') {
            // É Fonte
            let capUsada = node.demanda_kw_atual;
            let maxCap = node.capacidade_maxima_kw || Math.abs(node.demanda_base_kw);
            let valText = node.is_subestacao ? `${maxCap} kW Disp.` : `${Math.abs(capUsada).toFixed(0)} kW Ger.`;
            
            if (node.tipo === 'Geração') geracaoRenovavel += Math.abs(capUsada);

            const statusClass = node.status_energizado ? 'is-normal' : 'is-critical';
            let icon = node.tipo === 'Geração' ? '☀️' : '🏭';
            if (node.nome.includes('Eólica')) icon = '🎐';

            const html = `<div class="list-item ${statusClass}">
                            <div>
                                <div class="item-name">${icon} ${node.nome}</div>
                                <div class="item-sub">${node.tipo}</div>
                            </div>
                            <div class="item-val">${valText}</div>
                          </div>`;
            if (sourcesList) sourcesList.insertAdjacentHTML('beforeend', html);
        } else {
            // Consumidor (Bairro/Setor)
            if (!node.status_energizado) blackouts++;
            if (node.sobrecarga_ativa) sobrecargas++;

            let statusClass = 'is-normal';
            let statusText = `${Math.abs(node.demanda_kw_atual).toFixed(0)} kW`;
            let statusBadge = '';
            
            if (!node.status_energizado) {
                statusClass = 'is-critical';
                statusText = 'OFFLINE';
                statusBadge = '🔴';
            } else if (node.sobrecarga_ativa) {
                statusClass = 'is-warning';
                statusBadge = '🟠';
            } else {
                statusBadge = '🟢';
            }
            
            // Define o ícone com base no tipo
            let icon = '🏘️';
            if (node.tipo === 'Hospital') icon = '🏥';
            if (node.tipo === 'Indústria') icon = '🏭';
            if (node.tipo === 'Comercial' || node.tipo === 'Grandes Edifícios') icon = '🏢';
            if (node.nome.includes('Educa')) icon = '🏫';
            if (node.nome.includes('Data')) icon = '💻';

            const html = `<div class="list-item ${statusClass}">
                            <div>
                                <div class="item-name">${icon} ${node.nome}</div>
                                <div class="item-sub">Demanda Base: ${node.demanda_base_kw} kW</div>
                            </div>
                            <div class="item-val ${statusClass === 'is-critical' ? 'status-critical' : ''}">
                                ${statusBadge} ${statusText}
                            </div>
                          </div>`;
            if (distList) distList.insertAdjacentHTML('beforeend', html);
        }
    }

    const totalGerado = capacidadeMax + geracaoRenovavel;
    const pct = Math.min(100, Math.round((demandaAtual / totalGerado) * 100));

    // Atualiza Textos do Gráfico
    const elPct = document.getElementById('chart-pct');
    const elDem = document.getElementById('dash-dem-val');
    const elCap = document.getElementById('dash-cap-val');
    if (elPct) {
        elPct.textContent = `${pct}%`;
        elPct.style.color = pct > 95 ? '#ef4444' : (pct > 85 ? '#f59e0b' : '#fff');
    }
    if (elDem) elDem.textContent = `${demandaAtual.toFixed(0)} kW`;
    if (elCap) elCap.textContent = `${totalGerado.toFixed(0)} kW`;

    // Gráfico Chart.js
    if (window.Chart) {
        const ctx = document.getElementById('powerChart');
        if (ctx) {
            if (!window.powerChartInst) {
                window.powerChartInst = new Chart(ctx, {
                    type: 'doughnut',
                    data: {
                        labels: ['Demanda', 'Livre'],
                        datasets: [{
                            data: [demandaAtual, Math.max(0, totalGerado - demandaAtual)],
                            backgroundColor: ['#38bdf8', 'rgba(255,255,255,0.05)'],
                            borderWidth: 0,
                            cutout: '78%'
                        }]
                    },
                    options: {
                        responsive: true, maintainAspectRatio: false,
                        animation: { duration: 400 },
                        plugins: { legend: { display: false }, tooltip: { enabled: false } }
                    }
                });
            } else {
                let color = '#38bdf8';
                if (pct > 95) color = '#ef4444';
                else if (pct > 85) color = '#f59e0b';
                
                window.powerChartInst.data.datasets[0].data = [demandaAtual, Math.max(0, totalGerado - demandaAtual)];
                window.powerChartInst.data.datasets[0].backgroundColor[0] = color;
                window.powerChartInst.update();
            }
        }
    }

    // Status Global
    const dashStatus = document.getElementById('dash-status');
    let hasContingency = false;
    for (const edge of grafo.edges.values()) {
        if (edge.is_contingencia) hasContingency = true;
    }

    if (dashStatus) {
        if (blackouts > 0) {
            dashStatus.innerHTML = '🔴 FALHA NA REDE';
            dashStatus.className = 'dash-val status-critical';
        } else if (hasContingency) {
            dashStatus.innerHTML = '🔄 CONTINGÊNCIA';
            dashStatus.className = 'dash-val status-healing';
        } else if (sobrecargas > 0 || pct > 85) {
            dashStatus.innerHTML = '🟠 SOBRECARGA';
            dashStatus.className = 'dash-val status-warning';
        } else {
            dashStatus.innerHTML = '🟢 NORMAL';
            dashStatus.className = 'dash-val status-normal';
        }
    }

    // Terminal IA e Pílulas
    const agentsList = document.getElementById('dash-ai-agents');
    const termText = document.getElementById('ai-terminal-text');
    if (agentsList && logs) {
        const activeAgents = new Set(['Monitoramento']);
        for (const log of logs) {
            if (log.includes('Pico Noturno')) activeAgents.add('Peak Hour Agent');
            if (log.includes('CORTE DE EMERGÊNCIA') || log.includes('Restaurando')) activeAgents.add('Demand Response');
            if (log.includes('SUPERAQUECIMENTO') || log.includes('estabilizada')) activeAgents.add('Predictive Maint');
            if (log.includes('Self-Healing') || log.includes('Rota') || log.includes('Blackout')) activeAgents.add('Self-Healing');
            if (log.includes('Iluminação')) activeAgents.add('Smart Lighting');
        }

        agentsList.innerHTML = '';
        activeAgents.forEach(ag => {
            const pill = document.createElement('span');
            pill.className = ag === 'Monitoramento' ? 'ai-agent-pill normal' : 'ai-agent-pill active';
            pill.textContent = ag;
            agentsList.appendChild(pill);
        });

        if (logs.length > 0 && termText) {
            // Filtrar log mais relevante
            const lastLog = logs[logs.length - 1];
            termText.textContent = lastLog.replace(/\[.*?\] /, ''); // Remove o [AgentName]
        } else if (termText && (!termText.textContent || termText.textContent.includes('Aguardando'))) {
            termText.textContent = "Sistema estável. Aguardando eventos...";
        }
    }

    // ── 4. Processar logs da IA via novo sistema de notificações ──
    // (apenas para ticks automáticos de hora, não para cliques — esses têm sua
    //  própria sequência de notificações com delay dramático em triggerLineBreak)
    if (logs && logs.length > 0) {
        notificationSystem.processLogs(logs, false);
    }
}

function atualizarPainelHUD() {
    if (typeof syncSceneWithBackend === 'function' && typeof citySimulator !== 'undefined') {
        syncSceneWithBackend(citySimulator.grafo, citySimulator.estado, []);
    }
}


// ── Instanciação do Simulador ─────────────────────────────────
const citySimulator = new CitySimulator({ onSync: syncSceneWithBackend });
const grafo = citySimulator.grafo;

initializeScene();

// Primeiro tick logo ao carregar — popula o HUD e a cena com o estado das 07h
citySimulator.tick(0);

// ── Loop de Renderização 60+ FPS & Física do Voo ────────────

let lastFrameTime = performance.now();
const euler = new THREE.Euler(0, 0, 0, 'YXZ');
const forwardVector = new THREE.Vector3();
const rightVector = new THREE.Vector3();
const moveDirection = new THREE.Vector3();

function animate() {
    requestAnimationFrame(animate);

    const now = performance.now();
    const delta = Math.min(0.08, (now - lastFrameTime) / 1000);
    lastFrameTime = now;

    if (windTurbines && windTurbines.length) {
        // Base speed based on AI values
        const node = citySimulator?.grafo?.nodes.get('Parque_Eolico');
        let windSpeed = 1.0;
        if (node) {
            // Se está gerando, gira mais rápido (ex: 2.0 a 3.5). Se não, mais devagar.
            windSpeed = node.demanda_kw_atual < 0 ? 1.5 + (Math.abs(node.demanda_kw_atual) / 1000) * 2.0 : 0.5;
        }
        
        // Boost from clicking
        if (window._windBoostTime > 0) {
            windSpeed += 5.0;
            window._windBoostTime -= delta;
        }

        windTurbines.forEach(rotor => {
            rotor.rotation.z += delta * windSpeed;
        });
    }

    // Painéis solares (só emitem luz quando há produção de dia)
    if (materials?.solar) {
        materials.solar.emissiveIntensity = Math.max(0, 1.0 - globalNightFactor) * 0.8;
    }

    // Vapor contínuo da usina nuclear
    window._nuclearSteamTimer = (window._nuclearSteamTimer || 0) + delta;
    if (window._nuclearSteamTimer > 0.4) {
        window._nuclearSteamTimer = 0;
        const nuclearNode = citySimulator?.grafo?.nodes.get('Usina_Nuclear');
        if (nuclearNode && nuclearNode.demanda_kw_atual < 0) {
            const nuclearPos = backendNodePositions['Usina_Nuclear'];
            if (nuclearPos && vfxManager) {
                // A torre de resfriamento fica a x + 7*4=28, z + 5*4=20 no grupo? 
                // Wait, o grupo power_plant tem scale(4,4,4). 
                // A torre coolingTower fica em position(7, 0, 5) em relação ao grupo.
                // Logo, no mundo ela fica em: nuclearPos.x + 28, nuclearPos.z + 20
                vfxManager.emitNuclearSteam(new THREE.Vector3(nuclearPos.x + 28, 80.0, nuclearPos.z + 20), 1);
            }
        }
    }



    if (poleManager) poleManager.update(delta, now/1000, camera.position, globalNightFactor, trafficManager ? trafficManager.vehicles : [], trafficManager ? trafficManager.pedestrians : []);
    if (trafficManager) trafficManager.update(delta);
    if (repairManager) repairManager.update(delta, now/1000);
    if (activePole) updatePoleUI();

    if (cameraMode === 'fly') {
        const rotFactor = 1 - Math.exp(-22 * delta);
        pitch = THREE.MathUtils.lerp(pitch, targetPitch, rotFactor);
        yaw = THREE.MathUtils.lerp(yaw, targetYaw, rotFactor);

        euler.set(pitch, yaw, 0, 'YXZ');
        camera.quaternion.setFromEuler(euler);

        if (isGliding && glideTargetPos) {
            camera.position.lerp(glideTargetPos, 0.08);
            if (camera.position.distanceTo(glideTargetPos) < 0.5) {
                isGliding = false;
            }
        } else {
            const altitude = camera.position.y;
            let baseSpeed = Math.max(12, 10 + Math.pow(Math.max(0, altitude) / 14, 1.2) * 4.5);
            if (keys.sprint) baseSpeed *= 1.8;

            forwardVector.set(0, 0, -1).applyQuaternion(camera.quaternion);
            rightVector.set(1, 0, 0).applyQuaternion(camera.quaternion);

            moveDirection.set(0, 0, 0);

            if (keys.forward) moveDirection.add(forwardVector);
            if (keys.backward) moveDirection.sub(forwardVector);
            if (keys.right) moveDirection.add(rightVector);
            if (keys.left) moveDirection.sub(rightVector);

            if (keys.up) moveDirection.y += 1;
            if (keys.down) moveDirection.y -= 1;

            if (moveDirection.lengthSq() > 0.001) {
                moveDirection.normalize();
                const targetVelocity = moveDirection.multiplyScalar(baseSpeed);
                flyVelocity.lerp(targetVelocity, Math.min(1, delta * 10));
            } else {
                if (!animate._zeroVector) animate._zeroVector = new THREE.Vector3();
                flyVelocity.lerp(animate._zeroVector, Math.min(1, delta * 14));
                if (flyVelocity.lengthSq() < 0.02) flyVelocity.set(0, 0, 0);
            }

            camera.position.addScaledVector(flyVelocity, delta);

            if (camera.position.y < 1.6) {
                camera.position.y = 1.6;
                if (flyVelocity.y < 0) flyVelocity.y = 0;
            }

            const bound = WORLD_SIZE / 2 + 50;
            camera.position.x = Math.max(-bound, Math.min(bound, camera.position.x));
            camera.position.z = Math.max(-bound, Math.min(bound, camera.position.z));
            camera.position.y = Math.min(420, camera.position.y);
        }

        const altElem = document.getElementById('hud-altitude');
        const spdElem = document.getElementById('hud-speed');
        if (altElem) altElem.textContent = `${Math.max(1, Math.round(camera.position.y))}m`;
        if (spdElem) spdElem.textContent = `${Math.round(flyVelocity.length() * 3.6)} km/h`;

    } else {
        orbitControls.update();
    }

    // Animação de pulsação para as linhas de energia (Mesh)
    // wireCritical: pisca rápido e intenso — alerta máximo
    if (powerMats.wireCritical) powerMats.wireCritical.opacity = 0.55 + Math.abs(Math.sin(now * 0.018)) * 0.45;
    // wireGlowing: brilho suave e fluido — fluxo normal
    if (powerMats.wireGlowing) powerMats.wireGlowing.opacity = 0.80 + Math.sin(now * 0.004) * 0.15;
    // wireOverload: pulsação moderada — alerta de sobrecarga
    if (powerMats.wireOverload) powerMats.wireOverload.opacity = 0.65 + Math.sin(now * 0.01) * 0.30;
    // wireHealing: brilha suavemente — contingência ativa
    if (powerMats.wireHealing) powerMats.wireHealing.opacity = 0.75 + Math.sin(now * 0.007) * 0.25;

    // Atualização fluida e contínua do Ciclo Dia/Noite & Minutos
    updateSmoothDayNightCycle(delta);

    // VFX update (retorna camera shake offset)
    const shakeOffset = vfxManager.update(delta, camera);
    if (shakeOffset && (shakeOffset.x !== 0 || shakeOffset.y !== 0 || shakeOffset.z !== 0)) {
        camera.position.add(shakeOffset);
    }

    renderer.render(scene, camera);
}

// ── Sistema de Transição Suave do Dia/Noite, Minutos & Iluminação Urbana ────

const colorNight     = new THREE.Color(0x060c18); // Azul noite cinematográfico e profundo
const colorDawn      = new THREE.Color(0xdf7c4e); // Amanhecer dourado/pêssego
const colorDay       = new THREE.Color(0x82b2dd); // Céu limpo diurno
const colorSunset    = new THREE.Color(0xdb5834); // Pôr do sol alaranjado
const colorDusk      = new THREE.Color(0x401d4a); // Crepúsculo violeta

const hemiDayTop     = new THREE.Color(0xdcefff);
const hemiDayGround  = new THREE.Color(0x6e7568);
const hemiDuskTop    = new THREE.Color(0x7c3aed);
const hemiDuskGround = new THREE.Color(0x381907);
const hemiNightTop   = new THREE.Color(0x0e182e);
const hemiNightGround= new THREE.Color(0x050a12);

let lastCheckedHour = 7;

function updateSmoothDayNightCycle(delta) {
    if (isTimeRunning) {
        targetDecimalTime = (targetDecimalTime + delta * timeSpeed) % 24;
        currentDecimalTime = targetDecimalTime;
    } else {
        const diff = targetDecimalTime - currentDecimalTime;
        if (Math.abs(diff) > 0.001) {
            currentDecimalTime += diff * Math.min(1.0, delta * 3.5);
        } else {
            currentDecimalTime = targetDecimalTime;
        }
    }

    const h = (currentDecimalTime % 24 + 24) % 24;
    sceneLightState = (h >= 18 || h < 6) ? 'night' : 'day';

    // Atualiza HUD com minutos contínuos (formato HH:MM)
    const hInt = Math.floor(h);
    const mInt = Math.floor((h - hInt) * 60);
    const hudHora = document.getElementById('hud-sim-hora');
    if (hudHora) {
        hudHora.textContent = `${String(hInt).padStart(2, '0')}:${String(mInt).padStart(2, '0')}`;
    }

    // Sincroniza estado dos agentes quando a hora inteira muda
    if (hInt !== lastCheckedHour) {
        lastCheckedHour = hInt;
        if (typeof citySimulator !== 'undefined' && citySimulator.estado) {
            citySimulator.estado.hora = hInt;
            citySimulator.tick(0);
        }
    }

    // Trajetória orbital do Sol (Leste -> Oeste durante o dia: 6h às 18h)
    const sunAngle = ((h - 6) / 12) * Math.PI;
    if (sunLight) {
        sunLight.position.x = -240 * Math.cos(sunAngle);
        sunLight.position.y = Math.max(-40, 260 * Math.sin(sunAngle));
        sunLight.position.z = 130;
    }

    // Trajetória orbital da Lua (Noite: 18h às 6h)
    if (moonLight) {
        const moonAngle = sunAngle + Math.PI;
        moonLight.position.x = -240 * Math.cos(moonAngle);
        moonLight.position.y = Math.max(-40, 260 * Math.sin(moonAngle));
        moonLight.position.z = -130;
    }

    // Fator de Luz Solar (0 = Noite, 1 = Meio-Dia)
    let sunFactor = 0;
    if (h >= 5.5 && h <= 18.5) {
        sunFactor = Math.sin(((h - 5.5) / 13) * Math.PI);
    }
    sunFactor = Math.max(0, Math.min(1, sunFactor));

    // Fator Noturno (0 = Dia Pleno 07h-17h, 1 = Plena Noite 19h30-05h30)
    if (h >= 19.5 || h < 5.5) {
        globalNightFactor = 1.0;
    } else if (h >= 17.5 && h < 19.5) {
        globalNightFactor = (h - 17.5) / 2.0; // Acende gradualmente ao entardecer
    } else if (h >= 5.5 && h < 6.8) {
        globalNightFactor = 1.0 - (h - 5.5) / 1.3; // Apaga ao amanhecer
    } else {
        globalNightFactor = 0.0; // Totalmente desligado durante o dia
    }
    const nightFactor = globalNightFactor;

    // Interpolação suave de 24h para Cor do Céu e Névoa
    if (!updateSmoothDayNightCycle._currentSkyColor) {
        updateSmoothDayNightCycle._currentSkyColor = new THREE.Color();
        updateSmoothDayNightCycle._sunColorStart = new THREE.Color(0xf59e0b);
        updateSmoothDayNightCycle._sunColorEnd = new THREE.Color(0xfff3d7);
        updateSmoothDayNightCycle._sunColor = new THREE.Color();
    }
    const currentSkyColor = updateSmoothDayNightCycle._currentSkyColor;
    
    if (h >= 0 && h < 5.2) {
        currentSkyColor.copy(colorNight);
    } else if (h >= 5.2 && h < 6.3) {
        const t = (h - 5.2) / 1.1;
        currentSkyColor.copy(colorNight).lerp(colorDawn, t);
    } else if (h >= 6.3 && h < 7.0) {
        const t = (h - 6.3) / 0.7;
        currentSkyColor.copy(colorDawn).lerp(colorDay, t);
    } else if (h >= 7.0 && h < 16.8) {
        currentSkyColor.copy(colorDay);
    } else if (h >= 16.8 && h < 18.2) {
        const t = (h - 16.8) / 1.4;
        currentSkyColor.copy(colorDay).lerp(colorSunset, t);
    } else if (h >= 18.2 && h < 19.6) {
        const t = (h - 18.2) / 1.4;
        currentSkyColor.copy(colorSunset).lerp(colorDusk, t);
    } else if (h >= 19.6 && h < 20.8) {
        const t = (h - 19.6) / 1.2;
        currentSkyColor.copy(colorDusk).lerp(colorNight, t);
    } else {
        currentSkyColor.copy(colorNight);
    }

    scene.background.copy(currentSkyColor);
    if (scene.fog) {
        scene.fog.color.copy(currentSkyColor);
        if (cameraMode === 'fly') {
            const altitude = camera.position.y;
            const tAlt = Math.max(0, Math.min(1, altitude / 250));
            scene.fog.near = 100 + (tAlt * 250);
            scene.fog.far = 380 + (tAlt * 650);
        }
    }

    // Intensidades e Tonalidades das Luzes
    if (sunLight) {
        sunLight.intensity = THREE.MathUtils.lerp(0.0, 3.0, sunFactor);
        const sunColor = updateSmoothDayNightCycle._sunColor.lerpColors(
            updateSmoothDayNightCycle._sunColorStart, 
            updateSmoothDayNightCycle._sunColorEnd, 
            sunFactor
        );
        sunLight.color.copy(sunColor);
    }

    if (moonLight) {
        moonLight.intensity = THREE.MathUtils.lerp(0.0, 0.6, nightFactor);
    }

    if (hemiLight) {
        hemiLight.intensity = THREE.MathUtils.lerp(0.45, 1.45, sunFactor);
        if (h >= 16.5 && h < 20.0) {
            const t = (h - 16.5) / 3.5;
            hemiLight.color.copy(hemiDayTop).lerp(hemiDuskTop, t);
            hemiLight.groundColor.copy(hemiDayGround).lerp(hemiDuskGround, t);
        } else {
            hemiLight.color.lerpColors(hemiNightTop, hemiDayTop, sunFactor);
            hemiLight.groundColor.lerpColors(hemiNightGround, hemiDayGround, sunFactor);
        }
    }

    // Estrelas cintilantes no céu noturno
    if (starMaterial) {
        starMaterial.opacity = Math.max(0, Math.min(1, (nightFactor - 0.25) / 0.75));
    }

    // Postes de Iluminação Pública & Manchas de Luz Âmbar no Asfalto/Calçadas
    if (powerMats.streetLampBulb) {
        powerMats.streetLampBulb.emissiveIntensity = nightFactor * 4.2;
    }
    if (groundLightPoolMaterial) {
        groundLightPoolMaterial.opacity = nightFactor * 0.78;
    }

    // Janelas dos Edifícios e Casas (Apenas as janelas acendem à noite!)
    const windowGlow = nightFactor * 1.8;
    if (Math.abs(windowGlow - (updateSmoothDayNightCycle._lastGlow || 0)) > 0.01) {
        updateSmoothDayNightCycle._lastGlow = windowGlow;
        if (allFacadeMaterials && allFacadeMaterials.length) {
            allFacadeMaterials.forEach(mat => {
                mat.emissiveIntensity = windowGlow;
            });
        }
    }
}

function handleResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

window.addEventListener('resize', handleResize);
animate();

window.camera = camera;


import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CitySimulator, peakHourAgent, demandResponseAgent } from './smartAgents.js';
import { VFXManager } from './vfx.js';
import { StorytellingTour } from './storytelling.js';
import { PoleManager, TrafficManager, RepairManager } from './cityEntities.js';
import { materials, detailMats, powerMats, unitBoxGeometry, trunkGeometry, canopyGeometry, waterTankGeo } from './sharedAssets.js';
import { cityGroup, powerGridObjects, windTurbines, cityStats, backendNodePositions } from './sceneState.js';
import { noise, seededRandom } from './utils.js';
import { getBlockFacadeMaterial, addBuildingWithFacade, createRoofDetails } from './buildingRenderer.js';
import { ROAD_WIDTH, BLOCK_SIZE, ROAD_COORDS, BLOCK_CENTERS, createResidentialBlock, createOfficeTower, createDistricts, createGround, createRoadNetwork, buildInstancedTrees, buildInstancedBases, buildInstancedRooftopsAndDetails } from './cityBuilder.js';
import { createPowerGrid, createTransmissionLines } from './powerGridRenderer.js';
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
const mouse = new THREE.Vector2();

function setupRaycaster() {
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

        const intersects = raycaster.intersectObjects(interactables, false);
        if (intersects.length > 0) {
            let target = intersects[0].object;

            if (target.userData?.backendEdgeId && target.userData.u && target.userData.v) {
                console.log(`[3D Click] Falha simulada pelo clique na linha: ${target.userData.u} ↔ ${target.userData.v}`);
                citySimulator.simularFalha(target.userData.u, target.userData.v);
                return;
            }

            while (target.parent && !target.parent.userData.isGridNode) {
                target = target.parent;
            }
            if (target.parent && target.parent.userData.isGridNode) {
                triggerBlackout(target.parent);
            }
        }
    });
}

function setWireMaterial(group, matKey) {
    group.children.forEach(child => {
        if ((child.isLine || child.isLineSegments) && child.userData[matKey]) {
            child.material = child.userData[matKey];
        }
    });
}

function triggerBlackout(targetGroup) {
    if (!targetGroup.userData.active) return;
    targetGroup.userData.active = false;
    setWireMaterial(targetGroup, 'blackoutMat');

    targetGroup.traverse(child => {
        if (child.name === "streetLampBulb" && child.material) {
            child.material.emissive.setHex(0x000000);
        }
    });
}

let sceneLightState = 'day';

function setupUI() {
    const toggleBtn = document.getElementById('toggle-panel-btn');
    const panel = document.getElementById('control-panel');

    if (toggleBtn && panel) {
        toggleBtn.addEventListener('click', () => {
            panel.classList.toggle('hidden');
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
            console.log(`[Painel] Sobrecarga aplicada na Zona_Industrial_A.`);
        }
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
        console.log('[Painel] Botão Forçar Noite clicado (20:00).');
    });

    // 4. Botão: Falha na Usina (Blackout / Self-Healing)
    document.getElementById('btn-falha-usina')?.addEventListener('click', () => {
        console.log('[Painel] Botão Falha na Usina clicado. Rompendo aresta Subestacao_Central <-> Hospital_Prontomed...');
        if (citySimulator) citySimulator.simularFalha('Subestacao_Central', 'Hospital_Prontomed');
    });

    // 5. Botão: Resetar Cidade
    document.getElementById('btn-reset')?.addEventListener('click', () => {
        console.log('[Painel] Resetando cidade...');
        targetDecimalTime = 7.0;
        currentDecimalTime = 7.0;
        lastCheckedHour = 7;
        if (citySimulator) citySimulator.resetar();
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

    // ── 3. Atualizar HUD com dados da simulação ──────────────
    const hudDemanda = document.getElementById('hud-sim-demanda');
    const hudClima = document.getElementById('hud-sim-clima');
    const hudAlert = document.getElementById('hud-alert-container');
    if (estado && estado.hora !== undefined) {
        targetDecimalTime = estado.hora;
    }
    if (hudDemanda) hudDemanda.textContent = `${grafo.demandaTotalKw().toFixed(0)} kW`;
    if (hudClima)   hudClima.textContent   = estado.clima;
    
    // Processar logs para exibição no HUD
    if (hudAlert && logs && logs.length > 0) {
        logs.forEach(log => {
            if (log.includes('Pico Noturno') || log.includes('CORTE DE EMERGÊNCIA') || log.includes('SUPERAQUECIMENTO') || log.includes('Blackout') || log.includes('Romper')) {
                const alertDiv = document.createElement('div');
                alertDiv.className = 'hud-pill';
                alertDiv.style.backgroundColor = 'rgba(200, 30, 30, 0.85)';
                alertDiv.style.color = '#fff';
                alertDiv.style.pointerEvents = 'none';
                
                let icon = '⚠️';
                if (log.includes('Pico Noturno')) icon = '🌙';
                if (log.includes('CORTE DE EMERGÊNCIA')) icon = '⚡';
                if (log.includes('SUPERAQUECIMENTO')) icon = '🔥';
                if (log.includes('Blackout')) icon = '🔌';
                
                alertDiv.innerHTML = `<div class="hud-item">${icon} <strong>${log}</strong></div>`;
                hudAlert.appendChild(alertDiv);
                
                // Remove após 8 segundos
                setTimeout(() => {
                    if (hudAlert.contains(alertDiv)) hudAlert.removeChild(alertDiv);
                }, 8000);
            }
        });
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
        windTurbines.forEach(rotor => {
            rotor.rotation.z += delta * 1.5;
        });
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
                flyVelocity.lerp(new THREE.Vector3(0, 0, 0), Math.min(1, delta * 14));
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

    // Animação de pulsação para as linhas de energia Mesh
    if (powerMats.wireCritical) powerMats.wireCritical.opacity = 0.6 + Math.sin(now * 0.012) * 0.4;
    if (powerMats.wireGlowing) powerMats.wireGlowing.opacity = 0.7 + Math.sin(now * 0.005) * 0.2;
    if (powerMats.wireOverload) powerMats.wireOverload.opacity = 0.6 + Math.sin(now * 0.008) * 0.3;

    // Atualização fluida e contínua do Ciclo Dia/Noite & Minutos
    updateSmoothDayNightCycle(delta);
    vfxManager.update(delta, camera);

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
    const currentSkyColor = new THREE.Color();
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
        const sunColor = new THREE.Color().lerpColors(new THREE.Color(0xf59e0b), new THREE.Color(0xfff3d7), sunFactor);
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
    allFacadeMaterials.forEach(mat => {
        mat.emissiveIntensity = windowGlow;
    });

    // Luzes dos Carros (Faróis e Lanternas)
    if (carLightMaterial) carLightMaterial.opacity = Math.min(1.0, 0.4 + nightFactor * 0.6);
    if (carTailMaterial)  carTailMaterial.opacity  = Math.min(1.0, 0.4 + nightFactor * 0.6);
}

function handleResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

window.addEventListener('resize', handleResize);
animate();

window.camera = camera;


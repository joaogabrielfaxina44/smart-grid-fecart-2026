import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CitySimulator } from './smartAgents.js';
import { VFXManager } from './vfx.js';

const container = document.getElementById('canvas-container');

// ── Cena, Câmera e Renderizador Ultraleve ─────────────────────

const scene = new THREE.Scene();
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
renderer.shadowMap.type = THREE.PCFShadowMap; // PCFShadowMap: muito mais leve e fluido que PCFSoft
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
    down: false
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

function setCameraMode(mode) {
    cameraMode = mode;
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

function smoothGlideTo(pos) {
    isGliding = true;
    glideTargetPos = pos.clone();
    flyVelocity.set(0, 0, 0);
}

// Listeners de Teclado
window.addEventListener('keydown', (e) => {
    if (cameraMode !== 'fly') return;
    switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
            keys.forward = true;
            break;
        case 'KeyS':
        case 'ArrowDown':
            keys.backward = true;
            break;
        case 'KeyA':
        case 'ArrowLeft':
            keys.left = true;
            break;
        case 'KeyD':
        case 'ArrowRight':
            keys.right = true;
            break;
        case 'Space':
        case 'KeyE':
            keys.up = true;
            e.preventDefault();
            break;
        case 'ShiftLeft':
        case 'ShiftRight':
        case 'KeyQ':
            keys.down = true;
            e.preventDefault();
            break;
    }
});

window.addEventListener('keyup', (e) => {
    switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
            keys.forward = false;
            break;
        case 'KeyS':
        case 'ArrowDown':
            keys.backward = false;
            break;
        case 'KeyA':
        case 'ArrowLeft':
            keys.left = false;
            break;
        case 'KeyD':
        case 'ArrowRight':
            keys.right = false;
            break;
        case 'Space':
        case 'KeyE':
            keys.up = false;
            break;
        case 'ShiftLeft':
        case 'ShiftRight':
        case 'KeyQ':
            keys.down = false;
            break;
    }
});

renderer.domElement.addEventListener('mousedown', (e) => {
    if (e.button === 0 || e.button === 2) {
        isDraggingMouse = true;
        previousMousePos = { x: e.clientX, y: e.clientY };
        mouseMovedDistance = 0;
    }
});

window.addEventListener('mousemove', (e) => {
    if (!isDraggingMouse || cameraMode !== 'fly') return;

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

renderer.domElement.addEventListener('wheel', (e) => {
    if (cameraMode !== 'fly') return;
    const forwardDir = new THREE.Vector3();
    camera.getWorldDirection(forwardDir);
    const impulse = e.deltaY < 0 ? 14 : -14;
    flyVelocity.addScaledVector(forwardDir, impulse);
}, { passive: true });

// ── Geometrias, Materiais & Texturas Compartilhadas ──────────

const cityGroup = new THREE.Group();
cityGroup.name = 'Large Mixed Smart City';
scene.add(cityGroup);

const unitBoxGeometry = new THREE.BoxGeometry(1, 1, 1);
const trunkGeometry = new THREE.CylinderGeometry(0.22, 0.28, 1.8, 7);
const canopyGeometry = new THREE.SphereGeometry(1.1, 8, 6);

const materials = {
    terrain: new THREE.MeshStandardMaterial({ color: 0x708d63, roughness: 0.96 }),
    asphalt: new THREE.MeshStandardMaterial({ color: 0x2b2e32, roughness: 0.9 }),
    sidewalk: new THREE.MeshStandardMaterial({ color: 0xb8b3a9, roughness: 0.92 }),
    park: new THREE.MeshStandardMaterial({ color: 0x4f8a4c, roughness: 0.98 }),
    roofDark: new THREE.MeshStandardMaterial({ color: 0x555550, roughness: 0.86 }),
    roofConcrete: new THREE.MeshStandardMaterial({ color: 0x858a86, roughness: 0.88 }),
    roofTerracotta: new THREE.MeshStandardMaterial({ color: 0x9d5b3f, roughness: 0.9 }),
    hospitalWhite: new THREE.MeshStandardMaterial({ color: 0xe6e8e3, roughness: 0.72 }),
    hospitalRed: new THREE.MeshStandardMaterial({ color: 0xb32e2a, roughness: 0.58 }),
    concrete: new THREE.MeshStandardMaterial({ color: 0xa9aaa4, roughness: 0.76 }),
    industryWall: new THREE.MeshStandardMaterial({ color: 0x9c9688, roughness: 0.86 }),
    industryRoof: new THREE.MeshStandardMaterial({ color: 0x6e7778, roughness: 0.78 }),
    solar: new THREE.MeshStandardMaterial({ color: 0x243849, roughness: 0.38, metalness: 0.18 }),
    roadMarking: new THREE.MeshBasicMaterial({ color: 0xf2e7c9 }),
    trunk: new THREE.MeshStandardMaterial({ color: 0x73523b, roughness: 0.9 }),
    canopy: new THREE.MeshStandardMaterial({ color: 0x3f7944, roughness: 0.95 }),
    carRed: new THREE.MeshStandardMaterial({ color: 0xa84a3f, roughness: 0.52 }),
    carWhite: new THREE.MeshStandardMaterial({ color: 0xdad7ce, roughness: 0.48 }),
    carBlue: new THREE.MeshStandardMaterial({ color: 0x405c74, roughness: 0.52 }),
    carGray: new THREE.MeshStandardMaterial({ color: 0x777b7a, roughness: 0.52 })
};

const detailMats = {
    balcony: new THREE.MeshStandardMaterial({ color: 0x8a8a86, roughness: 0.75 }),
    railing: new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.5, metalness: 0.3 }),
    acUnit: new THREE.MeshStandardMaterial({ color: 0xc8c8c4, roughness: 0.5 }),
    antenna: new THREE.MeshStandardMaterial({ color: 0x4a4a4a, roughness: 0.5, metalness: 0.3 }),
    waterTank: new THREE.MeshStandardMaterial({ color: 0x6a7a8a, roughness: 0.6, metalness: 0.15 }),
    ductwork: new THREE.MeshStandardMaterial({ color: 0x8a9090, roughness: 0.55, metalness: 0.2 }),
    ledge: new THREE.MeshStandardMaterial({ color: 0x9a9a96, roughness: 0.7 }),
    entranceFrame: new THREE.MeshStandardMaterial({ color: 0x5a5a5a, roughness: 0.5, metalness: 0.15 }),
    chimneyCap: new THREE.MeshStandardMaterial({ color: 0x8a6650, roughness: 0.85 }),
};

const powerMats = {
    woodPole: new THREE.MeshStandardMaterial({ color: 0x584b3e, roughness: 0.85 }),
    metalArm: new THREE.MeshStandardMaterial({ color: 0x3d4146, roughness: 0.5, metalness: 0.4 }),
    transformer: new THREE.MeshStandardMaterial({ color: 0x32373d, roughness: 0.4, metalness: 0.5 }),
    streetLamp: new THREE.MeshStandardMaterial({ color: 0x22262b, roughness: 0.5 }),
    wireNormal: new THREE.LineBasicMaterial({ color: 0x1f2429, linewidth: 1 }),
    wireGlowing: new THREE.LineDashedMaterial({ color: 0x00d2ff, transparent: true, opacity: 0.85, linewidth: 3, dashSize: 2, gapSize: 2 }),  // Azul neon (< 85%)
    wireOverload: new THREE.LineDashedMaterial({ color: 0xffa500, transparent: true, opacity: 0.95, linewidth: 4, dashSize: 3, gapSize: 2 }), // Laranja (>= 85%)
    wireCritical: new THREE.LineDashedMaterial({ color: 0xff0000, transparent: true, opacity: 0.95, linewidth: 5, dashSize: 4, gapSize: 1.5 }), // Vermelho (>= 95%)
    wireBlackout: new THREE.LineBasicMaterial({ color: 0x18181b, transparent: true, opacity: 0.25, linewidth: 1 }),
};

// ── Pool Pré-gerado de Texturas de Fachadas (Zero Sobrecarga de GPU) ──

const sharedFacadeMaterials = {
    residential: [],
    office: [],
    glass: [],
    shop: [],
    industrial: []
};

function initSharedFacadeMaterials() {
    // Nova Paleta Low-Poly Limpa (Tons Pastéis Modernos)
    const wallColors = {
        residential: ['#f2ebdb', '#e2dfd2', '#dcd8c0', '#eae2d6'], // Beges e areia
        office:      ['#d4d9de', '#c9cfd3', '#b8c3cc', '#e3e8eb'], // Cinza azulado claro
        glass:       ['#86b1c2', '#9fc5d6', '#72a0b4'],             // Vidros pastéis brilhantes
        shop:        ['#dfccbe', '#e6dacb', '#d3bfb1'],             // Tons pêssego/terra
        industrial:  ['#bdc2b8', '#aab2a8', '#99a399']              // Verde sálvia / Concreto
    };

    const windowColors = ['#1a2838', '#1e2e3e', '#222e3a', '#182434'];
    const litColors = ['#ffedb3', '#ffe494', '#fff5cc', '#ffd666']; // Amarelo/Laranja neon

    Object.keys(wallColors).forEach(type => {
        const pal = wallColors[type];
        pal.forEach((baseColor, idx) => {
            const cw = 128;
            const ch = 128;
            
            // Canvas principal (Albedo/Diffuse)
            const canvas = document.createElement('canvas');
            canvas.width = cw;
            canvas.height = ch;
            const ctx = canvas.getContext('2d');

            // Canvas de Emissão (Apenas janelas acesas)
            const canvasEmissive = document.createElement('canvas');
            canvasEmissive.width = cw;
            canvasEmissive.height = ch;
            const ctxEmissive = canvasEmissive.getContext('2d');

            // Fundo Albedo
            ctx.fillStyle = baseColor;
            ctx.fillRect(0, 0, cw, ch);

            // Fundo Emissivo (Preto = não emite luz)
            ctxEmissive.fillStyle = '#000000';
            ctxEmissive.fillRect(0, 0, cw, ch);

            const isGlass = type === 'glass';
            const cols = isGlass ? 6 : 5;
            const rows = isGlass ? 8 : 6;
            const ww = Math.round(cw / cols * 0.6);
            const wh = Math.round(ch / rows * 0.55);
            const spX = Math.round(cw / cols);
            const spY = Math.round(ch / rows);

            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    const wx = Math.round(c * spX + (spX - ww) / 2);
                    const wy = Math.round(r * spY + (spY - wh) / 2);
                    const isLit = (r + c + idx) % 5 === 0;

                    // Desenha janela no Albedo
                    ctx.fillStyle = isLit ? litColors[(r + c) % litColors.length] : windowColors[(r + c) % windowColors.length];
                    ctx.fillRect(wx, wy, ww, wh);
                    ctx.strokeStyle = isGlass ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.15)';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(wx, wy, ww, wh);

                    // Se estiver acesa, desenha brilho no EmissiveMap
                    if (isLit) {
                        ctxEmissive.fillStyle = ctx.fillStyle; // mesma cor neon
                        ctxEmissive.fillRect(wx, wy, ww, wh);
                    }
                }
            }

            const texture = new THREE.CanvasTexture(canvas);
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            texture.colorSpace = THREE.SRGBColorSpace;

            const emissiveTexture = new THREE.CanvasTexture(canvasEmissive);
            emissiveTexture.wrapS = THREE.RepeatWrapping;
            emissiveTexture.wrapT = THREE.RepeatWrapping;
            emissiveTexture.colorSpace = THREE.SRGBColorSpace;

            const mat = new THREE.MeshStandardMaterial({
                map: texture,
                emissiveMap: emissiveTexture,
                emissive: new THREE.Color(0xffffff),
                emissiveIntensity: 0.0, // Começa apagado de dia, liga à noite
                roughness: isGlass ? 0.2 : 0.9,
                metalness: isGlass ? 0.3 : 0.0
            });

            sharedFacadeMaterials[type].push(mat);
        });
    });
}

initSharedFacadeMaterials();

function getSharedFacadeMaterial(type, seed) {
    const list = sharedFacadeMaterials[type] || sharedFacadeMaterials.office;
    return list[Math.abs(seed) % list.length];
}

function addBuildingWithFacade({ width, height, depth, x, z, seed, type, parent = cityGroup, roofMaterial = null }) {
    const wallMat = getSharedFacadeMaterial(type, seed);
    const topMat = roofMaterial || materials.roofConcrete;
    const botMat = materials.sidewalk;
    // [+X, -X, +Y, -Y, +Z, -Z] -> paredes compartilham a mesma referência de material
    const mesh = new THREE.Mesh(unitBoxGeometry, [wallMat, wallMat, topMat, botMat, wallMat, wallMat]);
    mesh.position.set(x, height / 2, z);
    mesh.scale.set(width, height, depth);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
}

function addRooftopDetails(parent, x, z, w, d, h, seed) {
    const n1 = noise(seed, 0, 560);
    const n2 = noise(seed, 1, 561);
    if (n1 > 0.4) {
        const tank = new THREE.Mesh(
            new THREE.CylinderGeometry(0.35 + n1 * 0.25, 0.35 + n1 * 0.25, 0.9, 8),
            detailMats.waterTank
        );
        tank.position.set(x + w * 0.2, h + 0.45, z - d * 0.15);
        parent.add(tank);
    }
    if (n2 > 0.35) {
        addBox({ width: 0.9 + n2 * 0.5, height: 0.45, depth: 0.6 + n2 * 0.35, x: x - w * 0.15, y: h + 0.22, z: z + d * 0.1, material: detailMats.acUnit, parent, cast: false, receive: false });
    }
    if (noise(seed, 2, 562) > 0.6) {
        addBox({ width: 0.06, height: 1.4, depth: 0.06, x: x + w * 0.25, y: h + 0.7, z: z + d * 0.22, material: detailMats.antenna, parent, cast: false, receive: false });
    }
}

function addBalconies(parent, x, z, w, d, h, seed, count) {
    const bw = 1.4 + noise(seed, 0, 570) * 0.7;
    const bd = 0.45 + noise(seed, 1, 571) * 0.25;
    const flH = h / Math.max(2, count + 1);
    for (let i = 1; i <= count; i++) {
        const by = flH * i;
        if (noise(seed + i, 0, 572) > 0.35) {
            addBox({ width: bw, height: 0.07, depth: bd, x, y: by, z: z + d / 2 + bd / 2, material: detailMats.balcony, parent, cast: false, receive: false });
            addBox({ width: bw, height: 0.3, depth: 0.04, x, y: by + 0.15, z: z + d / 2 + bd, material: detailMats.railing, parent, cast: false, receive: false });
        }
    }
}

function addEntranceCanopy(parent, x, z, canopyW, bDepth) {
    addBox({ width: canopyW, height: 0.08, depth: 0.9, x, y: 2.2, z: z - bDepth / 2 - 0.45, material: detailMats.ledge, parent, cast: false, receive: false });
    addBox({ width: 0.08, height: 2.1, depth: 0.08, x: x - canopyW / 2 + 0.08, y: 1.05, z: z - bDepth / 2 - 0.8, material: detailMats.entranceFrame, parent, cast: false, receive: false });
    addBox({ width: 0.08, height: 2.1, depth: 0.08, x: x + canopyW / 2 - 0.08, y: 1.05, z: z - bDepth / 2 - 0.8, material: detailMats.entranceFrame, parent, cast: false, receive: false });
}

// ── Dimensões com Ruas Mais Espaçosas e Avenidas Amplas ─────

const GRID_SIZE = 15; // 15x15 quadras = 225 quadras de altíssima performance
const GRID_RADIUS = Math.floor(GRID_SIZE / 2);
const BLOCK_SIZE = 20; // Tamanho de cada quadra
const ROAD_WIDTH = 10; // Ruas muito mais largas (espaçamento espaçoso de 10 metros!)
const SIDEWALK_WIDTH = 2.4; // Calçadas amplas e arborizadas
const ROAD_STEP = BLOCK_SIZE + ROAD_WIDTH; // 30 metros de passo entre quadras
const EDGE_MARGIN = 20;
const WORLD_SIZE = GRID_SIZE * BLOCK_SIZE + (GRID_SIZE + 1) * ROAD_WIDTH + EDGE_MARGIN * 2;
const ROAD_COORDS = Array.from({ length: GRID_SIZE + 1 }, (_, index) => (index - GRID_SIZE / 2) * ROAD_STEP);
const BLOCK_CENTERS = Array.from({ length: GRID_SIZE }, (_, index) => (index - GRID_RADIUS) * ROAD_STEP);

const cityStats = {
    blocks: 0,
    houses: 0,
    midRises: 0,
    towers: 0,
    industrial: 0,
    parks: 0,
    hospitals: 0,
    trees: 0,
    cars: 0
};

const treeInstancesData = [];
const baseInstancesData = [];
const carInstancesData = [];
const poleShaftData = [];
const poleTransData = [];
const poleLampData = [];

function seededRandom(seed) {
    let value = seed % 2147483647;
    return () => {
        value = (value * 16807) % 2147483647;
        return (value - 1) / 2147483646;
    };
}

function noise(row, col, salt = 0) {
    const value = Math.sin(row * 127.1 + col * 311.7 + salt * 74.7) * 43758.5453;
    return value - Math.floor(value);
}

function addBox({
    width,
    height,
    depth,
    x,
    y = height / 2,
    z,
    material,
    parent = cityGroup,
    cast = true,
    receive = true,
    rotationY = 0
}) {
    const mesh = new THREE.Mesh(unitBoxGeometry, material);
    mesh.position.set(x, y, z);
    mesh.scale.set(width, height, depth);
    mesh.rotation.y = rotationY;
    mesh.castShadow = cast;
    mesh.receiveShadow = receive;
    parent.add(mesh);
    return mesh;
}

function createGround() {
    const terrain = new THREE.Mesh(new THREE.PlaneGeometry(WORLD_SIZE, WORLD_SIZE), materials.terrain);
    terrain.rotation.x = -Math.PI / 2;
    terrain.receiveShadow = true;
    cityGroup.add(terrain);
}

function createRoadNetwork() {
    ROAD_COORDS.forEach((coord) => {
        addRoadSegment(WORLD_SIZE, ROAD_WIDTH, 0, coord);
        addRoadSegment(ROAD_WIDTH, WORLD_SIZE, coord, 0);
        addRoadMarking(WORLD_SIZE, 0.2, 0, coord);
        addRoadMarking(0.2, WORLD_SIZE, coord, 0);
    });
}

function addRoadSegment(width, depth, x, z) {
    addBox({ width, height: 0.08, depth, x, y: 0.04, z, material: materials.asphalt, cast: false, receive: true });

    if (width > depth) {
        addBox({ width, height: 0.12, depth: SIDEWALK_WIDTH, x, y: 0.11, z: z - ROAD_WIDTH / 2 - SIDEWALK_WIDTH / 2, material: materials.sidewalk, cast: false, receive: true });
        addBox({ width, height: 0.12, depth: SIDEWALK_WIDTH, x, y: 0.11, z: z + ROAD_WIDTH / 2 + SIDEWALK_WIDTH / 2, material: materials.sidewalk, cast: false, receive: true });
    } else {
        addBox({ width: SIDEWALK_WIDTH, height: 0.12, depth, x: x - ROAD_WIDTH / 2 - SIDEWALK_WIDTH / 2, y: 0.11, z, material: materials.sidewalk, cast: false, receive: true });
        addBox({ width: SIDEWALK_WIDTH, height: 0.12, depth, x: x + ROAD_WIDTH / 2 + SIDEWALK_WIDTH / 2, y: 0.11, z, material: materials.sidewalk, cast: false, receive: true });
    }
}

function addRoadMarking(width, depth, x, z) {
    addBox({ width, height: 0.025, depth, x, y: 0.13, z, material: materials.roadMarking, cast: false, receive: false });
}

function getBlockType(row, col) {
    if (row === GRID_SIZE - 2 && col === GRID_SIZE - 2) return 'power_plant';
    if (row === 1 && col === 1) return 'solar_farm';
    if (row === GRID_SIZE - 2 && col === 1) return 'wind_farm';
    if (row === 3 && col === 3) return 'substation';
    if (row === GRID_SIZE - 4 && col === GRID_SIZE - 4) return 'substation';

    const dr = row - GRID_RADIUS;
    const dc = col - GRID_RADIUS;
    const distance = Math.hypot(dr, dc);
    const n = noise(row, col);

    if (row === GRID_RADIUS - 3 && col === GRID_RADIUS - 1) return 'hospital';
    if (row === GRID_RADIUS + 2 && col === GRID_RADIUS - 4) return 'hospital';
    if (row === GRID_RADIUS + 1 && col === GRID_RADIUS + 1) return 'services';
    if (row === GRID_RADIUS - 3 && col === GRID_RADIUS + 4) return 'park';
    if (row === GRID_RADIUS + 3 && col === GRID_RADIUS - 2) return 'park';

    const industrialEdge = row > GRID_RADIUS + 3 && col > GRID_RADIUS + 1;
    if (industrialEdge) return n > 0.7 ? 'mixed' : 'industrial';

    if (distance < 2.2) return n > 0.2 ? 'commercial' : 'mixed';
    if (distance < 4.5) return n > 0.3 ? 'mixed' : 'commercial';
    return n > 0.65 ? 'mixed' : 'residential';
}

const backendNodePositions = {};

function getBlockBackendId(row, col, type) {
    if (type === 'power_plant') return 'Subestacao_Central';
    if (type === 'solar_farm') return 'Fazenda_Solar';
    if (type === 'hospital') {
        if (row === GRID_RADIUS - 3 && col === GRID_RADIUS - 1) return 'Hospital_Prontomed';
    }
    
    // Subestações auxiliares do backend
    if (row === 3 && col === 3) return 'Subestacao_Norte';
    if (row === GRID_SIZE - 4 && col === GRID_SIZE - 4) return 'Subestacao_Sul';
    
    // Bairros residenciais
    if (row === 2 && col === 5) return 'Bairro_Residencial_A';
    if (row === 12 && col === 3) return 'Bairro_Residencial_B';
    
    // Zonas comerciais/industriais/serviços
    if (row === 6 && col === 6) return 'Centro_Comercial';
    if (row === 7 && col === 8) return 'Shopping_Metropolitano';
    if (row === 12 && col === 11) return 'Zona_Industrial_A';
    if (row === GRID_RADIUS + 1 && col === GRID_RADIUS + 1) return 'Data_Center';
    if (row === 5 && col === 11) return 'Escolas';
    
    return null;
}

function createDistricts() {
    for (let row = 0; row < GRID_SIZE; row += 1) {
        for (let col = 0; col < GRID_SIZE; col += 1) {
            const block = {
                row,
                col,
                index: row * GRID_SIZE + col,
                x: BLOCK_CENTERS[col],
                z: BLOCK_CENTERS[row],
                type: getBlockType(row, col),
                label: `Quadra ${row}-${col}`
            };

            createBlockBase(block);

            const initialChildrenCount = cityGroup.children.length;
            const backendId = getBlockBackendId(row, col, block.type);
            block.backendId = backendId;

            if (block.type === 'residential') createResidentialBlock(block);
            else if (block.type === 'mixed') createMixedUrbanBlock(block);
            else if (block.type === 'commercial') createCommercialBlock(block);
            else if (block.type === 'hospital') createHospital(block);
            else if (block.type === 'industrial') createIndustrialBlock(block);
            else if (block.type === 'park') createPark(block);
            else if (block.type === 'services') createServiceBlock(block);
            else if (block.type === 'power_plant') createPowerPlant(block);
            else if (block.type === 'solar_farm') createSolarFarm(block);
            else if (block.type === 'wind_farm') createWindFarm(block);
            else if (block.type === 'substation') createSubstation(block);

            // Se um grupo foi adicionado, atribui o backendId e guarda a posição
            if (cityGroup.children.length > initialChildrenCount) {
                const addedElement = cityGroup.children[cityGroup.children.length - 1];
                if (addedElement.isGroup && backendId) {
                    addedElement.userData.backendId = backendId;
                    backendNodePositions[backendId] = new THREE.Vector3(block.x, 8.0, block.z);
                }
            }
        }
    }
}

function createBlockBase(block) {
    baseInstancesData.push({
        x: block.x,
        y: 0.14,
        z: block.z,
        width: BLOCK_SIZE,
        height: 0.16,
        depth: BLOCK_SIZE
    });
    cityStats.blocks += 1;
}

function createResidentialBlock(block) {
    const group = new THREE.Group();
    group.name = `residential-${block.index}`;
    cityGroup.add(group);

    const lots = [
        [-6.8, -6.6], [0, -6.8], [6.8, -6.5],
        [-6.9, 0.1], [0.2, 0.3], [6.8, 0.2],
        [-3.5, 6.8], [4.2, 6.6]
    ];
    const local = seededRandom(3000 + block.index * 41);

    lots.forEach(([lx, lz], lotIndex) => {
        if (lotIndex > 5 && local() < 0.35) return;

        if (lotIndex === 4 && local() > 0.65) {
            createLowRise(group, block.x + lx, block.z + lz, block.index + lotIndex, 6.0 + local() * 5.0);
        } else if (lotIndex === 2 && local() > 0.75) {
            createShopHouse(group, block.x + lx, block.z + lz, block.index + lotIndex);
        } else {
            createDetachedHouse(group, block.x + lx, block.z + lz, block.index + lotIndex, 0.9 + local() * 0.3);
        }
    });

    createStreetTrees(block.x, block.z, 3);
}

function createMixedUrbanBlock(block) {
    const group = new THREE.Group();
    group.name = `mixed-${block.index}`;
    cityGroup.add(group);

    const distance = Math.hypot(block.row - GRID_RADIUS, block.col - GRID_RADIUS);
    const lots = [
        [-6.8, -6.8], [0.2, -6.7], [6.8, -6.8],
        [-6.9, 0.3], [0.1, 0.2], [6.7, 0.2],
        [-3.6, 6.8], [4.2, 6.7]
    ];

    lots.forEach(([lx, lz], lotIndex) => {
        const n = noise(block.row + lotIndex, block.col, 8);
        const x = block.x + lx + (n - 0.5) * 0.7;
        const z = block.z + lz + (noise(block.row, block.col + lotIndex, 9) - 0.5) * 0.7;

        if (lotIndex === 4 && distance < 5.0 && n > 0.4) {
            createOfficeTower(group, x, z, block.index + lotIndex, 20 + n * 30);
        } else if (n > 0.65) {
            createSmallApartment(group, x, z, block.index + lotIndex, 9 + n * 14);
        } else if (n > 0.35) {
            createShopHouse(group, x, z, block.index + lotIndex);
        } else {
            createDetachedHouse(group, x, z, block.index + lotIndex, 0.9 + n * 0.3);
        }
    });

    createStreetTrees(block.x, block.z, 2);
}

function createCommercialBlock(block) {
    const group = new THREE.Group();
    group.name = `commercial-${block.index}`;
    cityGroup.add(group);

    const distance = Math.hypot(block.row - GRID_RADIUS, block.col - GRID_RADIUS);
    const towerLots = [
        [-6.5, -6.5], [6.5, -6.5], [-6.5, 6.5], [6.5, 6.5], [0, 0]
    ];
    const towerCount = distance < 2.0 ? 5 : 4;

    for (let i = 0; i < towerCount; i += 1) {
        const [lx, lz] = towerLots[i];
        const n = noise(block.row + i, block.col, 21);
        const height = (distance < 2.0 ? 36 : 24) + n * (distance < 2.0 ? 54 : 38);
        createOfficeTower(group, block.x + lx, block.z + lz, block.index + i, height);
    }
}

function createDetachedHouse(parent, x, z, seed, scale = 1) {
    const n = noise(seed, seed + 1, 30);
    const width = (3.6 + n * 1.8) * scale;
    const depth = (3.4 + noise(seed, seed + 2, 31) * 1.9) * scale;
    const height = (2.2 + noise(seed, seed + 3, 32) * 2.2) * scale;
    const roofMaterial = noise(seed, seed + 4, 33) > 0.45 ? materials.roofTerracotta : materials.roofDark;

    addBuildingWithFacade({ width, height, depth, x, z, seed, type: 'residential', parent, roofMaterial });
    
    // Telhado Sólido Low-Poly (Pirâmide)
    const roofHeight = 1.5;
    const roofGeo = new THREE.ConeGeometry(Math.max(width, depth) * 0.8, roofHeight, 4);
    const roofMesh = new THREE.Mesh(roofGeo, roofMaterial);
    roofMesh.position.set(x, height + roofHeight / 2, z);
    roofMesh.rotation.y = Math.PI / 4; // Alinhar faces com as paredes
    roofMesh.castShadow = true;
    roofMesh.receiveShadow = true;
    parent.add(roofMesh);

    // Chaminé opcional
    if (noise(seed, seed + 5, 34) > 0.6) {
        addBox({ width: 0.6, height: 2.0, depth: 0.6, x: x - width * 0.2, y: height + 0.5, z: z, material: materials.concrete, parent, cast: true, receive: true });
    }
    
    // Base/quintal simples
    addBox({ width: width + 2, height: 0.2, depth: depth + 2, x: x, y: 0.1, z: z, material: materials.concrete, parent, cast: true, receive: true });

    cityStats.houses += 1;
}

function createShopHouse(parent, x, z, seed, scale = 1) {
    const width = (4.6 + noise(seed, seed + 7, 40) * 2.8) * scale;
    const depth = (4.4 + noise(seed, seed + 8, 41) * 2.5) * scale;
    const height = (3.4 + noise(seed, seed + 9, 42) * 2.8) * scale;

    addBuildingWithFacade({ width, height, depth, x, z, seed, type: 'shop', parent, roofMaterial: materials.roofConcrete });
    addBox({ width: width + 0.24, height: 0.34, depth: depth + 0.24, x, y: height + 0.17, z, material: materials.roofConcrete, parent, cast: false, receive: true });

    cityStats.midRises += 1;
}

function createLowRise(parent, x, z, seed, height) {
    const width = 5.6 + noise(seed, seed + 11, 50) * 2.8;
    const depth = 5.4 + noise(seed, seed + 12, 51) * 2.8;

    addBuildingWithFacade({ width, height, depth, x, z, seed, type: 'office', parent });
    addBox({ width: width * 0.72, height: 0.42, depth: depth * 0.7, x, y: height + 0.21, z, material: materials.roofConcrete, parent, cast: false, receive: true });
    addRooftopDetails(parent, x, z, width, depth, height, seed);

    cityStats.midRises += 1;
}

function createSmallApartment(parent, x, z, seed, height) {
    const width = 5.2 + noise(seed, seed + 13, 60) * 2.2;
    const depth = 5.2 + noise(seed, seed + 14, 61) * 2.5;
    const isGlass = noise(seed, seed + 15, 62) > 0.62;
    const facadeType = isGlass ? 'glass' : 'office';

    addBuildingWithFacade({ width, height, depth, x, z, seed, type: facadeType, parent });

    const balconyCount = Math.max(1, Math.floor(height / 5));
    addBalconies(parent, x, z, width, depth, height, seed, balconyCount);
    addRooftopDetails(parent, x, z, width, depth, height, seed);

    cityStats.midRises += 1;
}

function createOfficeTower(parent, x, z, seed, height) {
    const width = 5.2 + noise(seed, seed + 16, 70) * 3.8;
    const depth = 5.2 + noise(seed, seed + 17, 71) * 3.9;
    const materialRoll = noise(seed, seed + 18, 72);
    const facadeType = materialRoll > 0.4 ? 'glass' : 'office';

    addBuildingWithFacade({ width, height, depth, x, z, seed, type: facadeType, parent });

    if (noise(seed, seed + 19, 73) > 0.58) {
        addBox({ width: width * 0.7, height: 1.2, depth: depth * 0.68, x, y: height + 0.6, z, material: materials.concrete, parent, cast: true, receive: true });
    }

    addRooftopDetails(parent, x, z, width, depth, height, seed);

    if (noise(seed, seed + 20, 74) > 0.4) {
        addEntranceCanopy(parent, x, z, Math.min(3.5, width * 0.6), depth);
    }

    cityStats.towers += 1;
}

function createHospital(block) {
    const group = new THREE.Group();
    group.name = `hospital-${block.index}`;
    cityGroup.add(group);

    addBox({ width: 16.5, height: 6.5, depth: 13.5, x: block.x, z: block.z, material: materials.hospitalWhite, parent: group, cast: true, receive: true });
    addBox({ width: 7.8, height: 5.2, depth: 17.5, x: block.x - 4.5, y: 2.6, z: block.z, material: materials.hospitalWhite, parent: group, cast: true, receive: true });
    addBox({ width: 5.8, height: 8.8, depth: 7.2, x: block.x + 5.5, y: 4.4, z: block.z - 2.8, material: materials.concrete, parent: group, cast: true, receive: true });
    addBox({ width: 1.2, height: 0.08, depth: 6.5, x: block.x, y: 6.62, z: block.z, material: materials.hospitalRed, parent: group, cast: false, receive: false });
    addBox({ width: 6.5, height: 0.08, depth: 1.2, x: block.x, y: 6.64, z: block.z, material: materials.hospitalRed, parent: group, cast: false, receive: false });

    const helipad = new THREE.Mesh(
        new THREE.CylinderGeometry(3.2, 3.2, 0.08, 24),
        new THREE.MeshStandardMaterial({ color: 0x50565a, roughness: 0.74 })
    );
    helipad.position.set(block.x + 5.5, 8.88, block.z - 2.8);
    helipad.castShadow = false;
    helipad.receiveShadow = true;
    group.add(helipad);

    cityStats.hospitals += 1;
}

function createIndustrialBlock(block) {
    const group = new THREE.Group();
    group.name = `industrial-${block.index}`;
    cityGroup.add(group);

    const buildings = 2 + Math.floor(noise(block.row, block.col, 90) * 2);
    for (let i = 0; i < buildings; i += 1) {
        const x = block.x - 6.0 + i * 8.0 + (noise(block.row + i, block.col, 91) - 0.5) * 1.7;
        const z = block.z + (noise(block.row, block.col + i, 92) - 0.5) * 8.0;
        const width = 7.5 + noise(block.row + i, block.col, 93) * 4.6;
        const depth = 7.0 + noise(block.row, block.col + i, 94) * 5.0;
        const height = 4.4 + noise(block.row + i, block.col + i, 95) * 4.2;

        addBuildingWithFacade({ width, height, depth, x, z, seed: block.index + i * 7, type: 'industrial', parent: group, roofMaterial: materials.industryRoof });
        addBox({ width: width + 0.34, height: 0.48, depth: depth + 0.34, x, y: height + 0.24, z, material: materials.industryRoof, parent: group, cast: false, receive: true });
    }

    if (noise(block.row, block.col, 96) > 0.48) {
        createChimney(group, block.x + 7.0, block.z - 6.5);
    }

    cityStats.industrial += 1;
}

function createChimney(parent, x, z) {
    const chimney = new THREE.Mesh(
        new THREE.CylinderGeometry(0.72, 0.96, 9, 12),
        new THREE.MeshStandardMaterial({ color: 0x7d776d, roughness: 0.82 })
    );
    chimney.position.set(x, 4.5, z);
    chimney.castShadow = true;
    chimney.receiveShadow = true;
    parent.add(chimney);
}

function createPark(block) {
    addBox({ width: 18.8, height: 0.1, depth: 18.8, x: block.x, y: 0.24, z: block.z, material: materials.park, cast: false, receive: true });

    const treeCount = 12 + Math.floor(noise(block.row, block.col, 100) * 10);
    for (let i = 0; i < treeCount; i += 1) {
        const x = block.x - 8.0 + noise(block.row + i, block.col, 101) * 16.0;
        const z = block.z - 8.0 + noise(block.row, block.col + i, 102) * 16.0;
        collectTreeInstance(x, z, 0.9 + noise(block.row + i, block.col + i, 103) * 0.7);
    }

    cityStats.parks += 1;
}

function createServiceBlock(block) {
    const group = new THREE.Group();
    group.name = `services-${block.index}`;
    cityGroup.add(group);

    addBox({ width: 8.5, height: 5.5, depth: 7.0, x: block.x - 4.5, z: block.z - 3.0, material: materials.concrete, parent: group, cast: true, receive: true });
    addBox({ width: 8.0, height: 4.0, depth: 9.0, x: block.x + 4.8, z: block.z + 3.2, material: materials.industryWall, parent: group, cast: true, receive: true });
}

function addPerimeterFence(group, bx, bz) {
    addBox({ width: BLOCK_SIZE, height: 1.2, depth: 0.1, x: bx, y: 0.6, z: bz + BLOCK_SIZE/2, material: detailMats.railing, parent: group, cast: true, receive: true });
    addBox({ width: BLOCK_SIZE, height: 1.2, depth: 0.1, x: bx, y: 0.6, z: bz - BLOCK_SIZE/2, material: detailMats.railing, parent: group, cast: true, receive: true });
    addBox({ width: 0.1, height: 1.2, depth: BLOCK_SIZE, x: bx + BLOCK_SIZE/2, y: 0.6, z: bz, material: detailMats.railing, parent: group, cast: true, receive: true });
    addBox({ width: 0.1, height: 1.2, depth: BLOCK_SIZE, x: bx - BLOCK_SIZE/2, y: 0.6, z: bz, material: detailMats.railing, parent: group, cast: true, receive: true });
}

function createPowerPlant(block) {
    const group = new THREE.Group();
    group.name = `power_plant-${block.index}`;
    cityGroup.add(group);
    
    addBox({ width: 14, height: 8, depth: 10, x: block.x, y: 4, z: block.z - 2, material: materials.industryWall, parent: group, cast: true, receive: true });
    addBox({ width: 14.5, height: 0.5, depth: 10.5, x: block.x, y: 8.25, z: block.z - 2, material: materials.industryRoof, parent: group, cast: true, receive: true });

    const stackGeo = new THREE.CylinderGeometry(0.8, 1.2, 20, 12);
    for (let i=0; i<3; i++) {
        const stack = new THREE.Mesh(stackGeo, materials.concrete);
        stack.position.set(block.x - 4 + i*4, 10, block.z + 5);
        stack.castShadow = true;
        group.add(stack);
    }

    const points = [];
    for ( let i = 0; i <= 10; i ++ ) {
        const y = i * 1.5;
        const x = 3 - Math.sin( i * 0.15 ) * 1.0;
        points.push( new THREE.Vector2( x, y ) );
    }
    const coolingTowerGeo = new THREE.LatheGeometry(points, 16);
    const coolingTower = new THREE.Mesh(coolingTowerGeo, materials.concrete);
    coolingTower.position.set(block.x + 6, 0, block.z + 5);
    coolingTower.castShadow = true;
    group.add(coolingTower);

    addPerimeterFence(group, block.x, block.z);
}

function createSolarFarm(block) {
    const group = new THREE.Group();
    group.name = `solar_farm-${block.index}`;
    cityGroup.add(group);

    const panelCount = 8 * 8;
    const imesh = new THREE.InstancedMesh(unitBoxGeometry, materials.solar, panelCount);
    imesh.castShadow = true;
    imesh.receiveShadow = true;
    
    const dummy = new THREE.Object3D();
    let i = 0;
    for (let r=0; r<8; r++) {
        for (let c=0; c<8; c++) {
            dummy.position.set(block.x - 7 + c*2.0, 0.8, block.z - 7 + r*2.0);
            dummy.scale.set(1.8, 0.1, 1.2);
            dummy.rotation.set(0.5, 0, 0);
            dummy.updateMatrix();
            imesh.setMatrixAt(i++, dummy.matrix);
        }
    }
    group.add(imesh);

    const supportMesh = new THREE.InstancedMesh(unitBoxGeometry, materials.concrete, panelCount);
    i = 0;
    for (let r=0; r<8; r++) {
        for (let c=0; c<8; c++) {
            dummy.position.set(block.x - 7 + c*2.0, 0.4, block.z - 7 + r*2.0);
            dummy.scale.set(0.1, 0.8, 0.1);
            dummy.rotation.set(0, 0, 0);
            dummy.updateMatrix();
            supportMesh.setMatrixAt(i++, dummy.matrix);
        }
    }
    group.add(supportMesh);

    addBox({ width: 3, height: 2, depth: 3, x: block.x, y: 1, z: block.z + 8, material: materials.concrete, parent: group, cast: true, receive: true });
    addPerimeterFence(group, block.x, block.z);
}

const windTurbines = [];

function createWindFarm(block) {
    const group = new THREE.Group();
    group.name = `wind_farm-${block.index}`;
    cityGroup.add(group);

    for (let i=0; i<4; i++) {
        const x = block.x - 5 + (i%2)*10;
        const z = block.z - 5 + Math.floor(i/2)*10;
        
        const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.5, 25, 8), materials.concrete);
        tower.position.set(x, 12.5, z);
        tower.castShadow = true;
        group.add(tower);

        addBox({ width: 1.5, height: 1.5, depth: 3, x: x, y: 25, z: z, material: materials.concrete, parent: group, cast: true, receive: true });

        const rotor = new THREE.Group();
        rotor.position.set(x, 25, z + 1.6);
        
        for (let b=0; b<3; b++) {
            const blade = new THREE.Mesh(unitBoxGeometry, materials.concrete);
            blade.scale.set(0.2, 10, 0.4);
            blade.position.set(0, 5, 0);
            
            const pivot = new THREE.Group();
            pivot.rotation.z = (b * Math.PI * 2) / 3;
            pivot.add(blade);
            rotor.add(pivot);
        }
        group.add(rotor);
        windTurbines.push(rotor);
    }
    
    addBox({ width: 4, height: 2.5, depth: 3, x: block.x, y: 1.25, z: block.z + 8, material: materials.industryWall, parent: group, cast: true, receive: true });
}

function createSubstation(block) {
    const group = new THREE.Group();
    group.name = `substation-${block.index}`;
    cityGroup.add(group);

    for (let i=0; i<3; i++) {
        addBox({ width: 2, height: 2, depth: 3, x: block.x - 4 + i*4, y: 1, z: block.z - 2, material: powerMats.transformer, parent: group, cast: true, receive: true });
        addBox({ width: 1, height: 3, depth: 0.1, x: block.x - 4 + i*4, y: 2.5, z: block.z - 2, material: powerMats.metalArm, parent: group, cast: true, receive: true });
    }
    
    addBox({ width: 12, height: 0.2, depth: 0.2, x: block.x, y: 4, z: block.z - 2, material: powerMats.metalArm, parent: group, cast: true, receive: true });
    addBox({ width: 4, height: 3, depth: 3, x: block.x, y: 1.5, z: block.z + 5, material: materials.concrete, parent: group, cast: true, receive: true });

    addPerimeterFence(group, block.x, block.z);
}

function createStreetTrees(blockX, blockZ, count) {
    for (let i = 0; i < count; i += 1) {
        const side = i % 2 === 0 ? -1 : 1;
        collectTreeInstance(blockX + side * 10.2, blockZ - 7.5 + i * 5.2, 0.72 + noise(blockX + i, blockZ, 120) * 0.2);
    }
}

function collectTreeInstance(x, z, scale = 1) {
    treeInstancesData.push({ x, z, scale });
    cityStats.trees += 1;
}

function buildInstancedTrees() {
    const count = treeInstancesData.length;
    if (count === 0) return;

    const trunkMesh = new THREE.InstancedMesh(trunkGeometry, materials.trunk, count);
    const canopyMesh = new THREE.InstancedMesh(canopyGeometry, materials.canopy, count);

    trunkMesh.castShadow = true;
    canopyMesh.castShadow = true;
    canopyMesh.receiveShadow = true;

    const dummy = new THREE.Object3D();

    treeInstancesData.forEach((item, index) => {
        dummy.position.set(item.x, 0.9 * item.scale, item.z);
        dummy.scale.set(item.scale, item.scale, item.scale);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        trunkMesh.setMatrixAt(index, dummy.matrix);

        dummy.position.set(item.x, 2.1 * item.scale, item.z);
        dummy.updateMatrix();
        canopyMesh.setMatrixAt(index, dummy.matrix);
    });

    trunkMesh.instanceMatrix.needsUpdate = true;
    canopyMesh.instanceMatrix.needsUpdate = true;

    cityGroup.add(trunkMesh);
    cityGroup.add(canopyMesh);
}

function buildInstancedBases() {
    const count = baseInstancesData.length;
    if (count === 0) return;

    const baseMesh = new THREE.InstancedMesh(unitBoxGeometry, materials.sidewalk, count);
    baseMesh.receiveShadow = true;
    baseMesh.castShadow = false;

    const dummy = new THREE.Object3D();
    baseInstancesData.forEach((b, i) => {
        dummy.position.set(b.x, b.y, b.z);
        dummy.scale.set(b.width, b.height, b.depth);
        dummy.updateMatrix();
        baseMesh.setMatrixAt(i, dummy.matrix);
    });

    baseMesh.instanceMatrix.needsUpdate = true;
    cityGroup.add(baseMesh);
}

function createTrafficHints() {
    const carMaterials = [materials.carRed, materials.carWhite, materials.carBlue, materials.carGray];
    const carCount = 180;

    for (let i = 0; i < carCount; i += 1) {
        const road = ROAD_COORDS[Math.floor(noise(i, i + 1, 130) * ROAD_COORDS.length)];
        const along = -WORLD_SIZE / 2 + EDGE_MARGIN + noise(i, i + 2, 131) * (WORLD_SIZE - EDGE_MARGIN * 2);
        const horizontal = noise(i, i + 3, 132) > 0.5;
        const laneOffset = noise(i, i + 4, 133) > 0.5 ? -2.2 : 2.2;
        const width = horizontal ? 2.6 : 1.3;
        const depth = horizontal ? 1.3 : 2.6;
        const x = horizontal ? along : road + laneOffset;
        const z = horizontal ? road + laneOffset : along;

        carInstancesData.push({
            x, y: 0.42, z,
            width, height: 0.45, depth,
            matIndex: i % carMaterials.length
        });
        cityStats.cars += 1;
    }

    carMaterials.forEach((mat, matIdx) => {
        const matchingCars = carInstancesData.filter(c => c.matIndex === matIdx);
        if (matchingCars.length === 0) return;

        const carMesh = new THREE.InstancedMesh(unitBoxGeometry, mat, matchingCars.length);
        carMesh.castShadow = false;
        carMesh.receiveShadow = false;

        const dummy = new THREE.Object3D();
        matchingCars.forEach((c, idx) => {
            dummy.position.set(c.x, c.y, c.z);
            dummy.scale.set(c.width, c.height, c.depth);
            dummy.updateMatrix();
            carMesh.setMatrixAt(idx, dummy.matrix);
        });

        carMesh.instanceMatrix.needsUpdate = true;
        cityGroup.add(carMesh);
    });
}

// ── Smart Grid Infrastructure ───────────────────────────────

const powerGridObjects = [];
let powerState = 'normal';

const poleShaftGeo = new THREE.CylinderGeometry(0.12, 0.18, 5.0, 8);
const poleCrossArmGeo = new THREE.BoxGeometry(1.6, 0.12, 0.12);
const transformerGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.7, 8);
const lampHeadGeo = new THREE.BoxGeometry(0.2, 0.08, 0.4);
const bulbGeo = new THREE.SphereGeometry(0.07, 8, 8);

function collectPoleInstance(group, x, z, angleRad = 0, opts = {}) {
    const { hasTransformer = false, hasStreetlight = true } = opts;

    poleShaftData.push({ x, z, angleRad });
    if (hasTransformer) poleTransData.push({ x, z, angleRad });
    if (hasStreetlight) poleLampData.push({ x, z, angleRad });

    if (hasStreetlight) {
        const bulbMat = new THREE.MeshStandardMaterial({ color: 0xffeaad, roughness: 0.3, emissive: 0x000000 });
        const bulb = new THREE.Mesh(bulbGeo, bulbMat);
        const bulbPos = new THREE.Vector3(0, 4.58, 1.2);
        bulbPos.applyAxisAngle(new THREE.Vector3(0, 1, 0), angleRad);
        bulbPos.add(new THREE.Vector3(x, 0, z));
        bulb.position.copy(bulbPos);
        bulb.name = "streetLampBulb";
        group.add(bulb);
    }

    const insulatorOffsets = [-0.65, 0, 0.65];
    const insulatorWorldPositions = [];
    insulatorOffsets.forEach(offX => {
        const pt = new THREE.Vector3(offX, 5.02, 0);
        pt.applyAxisAngle(new THREE.Vector3(0, 1, 0), angleRad);
        pt.add(new THREE.Vector3(x, 0, z));
        insulatorWorldPositions.push(pt);
    });

    return insulatorWorldPositions;
}

function buildInstancedPoles() {
    const dummy = new THREE.Object3D();

    if (poleShaftData.length > 0) {
        const shaftMesh = new THREE.InstancedMesh(poleShaftGeo, powerMats.woodPole, poleShaftData.length);
        const crossArmMesh = new THREE.InstancedMesh(poleCrossArmGeo, powerMats.woodPole, poleShaftData.length);
        shaftMesh.castShadow = true;
        crossArmMesh.castShadow = false;

        poleShaftData.forEach((p, i) => {
            dummy.position.set(p.x, 2.6, p.z);
            dummy.rotation.set(0, p.angleRad, 0);
            dummy.scale.set(1, 1, 1);
            dummy.updateMatrix();
            shaftMesh.setMatrixAt(i, dummy.matrix);

            dummy.position.set(p.x, 4.75, p.z);
            dummy.updateMatrix();
            crossArmMesh.setMatrixAt(i, dummy.matrix);
        });

        shaftMesh.instanceMatrix.needsUpdate = true;
        crossArmMesh.instanceMatrix.needsUpdate = true;
        cityGroup.add(shaftMesh);
        cityGroup.add(crossArmMesh);
    }

    if (poleTransData.length > 0) {
        const transMesh = new THREE.InstancedMesh(transformerGeo, powerMats.transformer, poleTransData.length);
        transMesh.castShadow = false;

        poleTransData.forEach((p, i) => {
            dummy.position.set(p.x + 0.3, 3.6, p.z);
            dummy.rotation.set(0, p.angleRad, 0);
            dummy.scale.set(1, 1, 1);
            dummy.updateMatrix();
            transMesh.setMatrixAt(i, dummy.matrix);
        });

        transMesh.instanceMatrix.needsUpdate = true;
        cityGroup.add(transMesh);
    }

    if (poleLampData.length > 0) {
        const lampHeadMesh = new THREE.InstancedMesh(lampHeadGeo, powerMats.streetLamp, poleLampData.length);
        lampHeadMesh.castShadow = false;

        poleLampData.forEach((p, i) => {
            const headPos = new THREE.Vector3(0, 4.65, 1.15);
            headPos.applyAxisAngle(new THREE.Vector3(0, 1, 0), p.angleRad);
            headPos.add(new THREE.Vector3(p.x, 0, p.z));

            dummy.position.copy(headPos);
            dummy.rotation.set(0, p.angleRad, 0);
            dummy.scale.set(1, 1, 1);
            dummy.updateMatrix();
            lampHeadMesh.setMatrixAt(i, dummy.matrix);
        });

        lampHeadMesh.instanceMatrix.needsUpdate = true;
        cityGroup.add(lampHeadMesh);
    }
}

function addCatenaryWires(group, posArray1, posArray2, wireMaterial, blackoutMat, overloadMat, sagAmount = 0.35) {
    const count = Math.min(posArray1.length, posArray2.length);
    for (let k = 0; k < count; k++) {
        const p1 = posArray1[k];
        const p2 = posArray2[k];

        const points = [];
        const segments = 8;
        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const x = THREE.MathUtils.lerp(p1.x, p2.x, t);
            const z = THREE.MathUtils.lerp(p1.z, p2.z, t);
            const yLinear = THREE.MathUtils.lerp(p1.y, p2.y, t);
            const sag = 4 * sagAmount * t * (1 - t);
            points.push(new THREE.Vector3(x, yLinear - sag, z));
        }

        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(geometry, wireMaterial);
        line.userData = { originalMat: wireMaterial, blackoutMat, overloadMat };
        group.add(line);
    }
}

function createPowerGrid() {
    const offset = ROAD_WIDTH / 2 + 0.5;

    for (let r = 0; r < ROAD_COORDS.length; r++) {
        const z = ROAD_COORDS[r];
        
        for (let side = -1; side <= 1; side += 2) {
            const group = new THREE.Group();
            group.name = `powergrid-h-${r}-${side}`;
            group.userData = { isGridNode: true, active: true };
            cityGroup.add(group);
            powerGridObjects.push(group);

            let prevPole = null;
            for (let c = 0; c < BLOCK_CENTERS.length; c++) {
                const x = BLOCK_CENTERS[c];
                const hasTrans = noise(r, c, 801) > 0.7;
                
                const pPos = collectPoleInstance(group, x, z + side * offset, 0, { hasTransformer: hasTrans, hasStreetlight: true });
                if (prevPole) {
                    addCatenaryWires(group, prevPole, pPos, powerMats.wireNormal, powerMats.wireBlackout, powerMats.wireOverload, 0.4);
                }
                prevPole = pPos;
            }
        }
    }

    for (let c = 0; c < ROAD_COORDS.length; c++) {
        const x = ROAD_COORDS[c];
        
        for (let side = -1; side <= 1; side += 2) {
            const group = new THREE.Group();
            group.name = `powergrid-v-${c}-${side}`;
            group.userData = { isGridNode: true, active: true };
            cityGroup.add(group);
            powerGridObjects.push(group);

            let prevPole = null;
            for (let r = 0; r < BLOCK_CENTERS.length; r++) {
                const z = BLOCK_CENTERS[r];
                const hasTrans = noise(r, c, 802) > 0.7;
                
                const pPos = collectPoleInstance(group, x + side * offset, z, Math.PI / 2, { hasTransformer: hasTrans, hasStreetlight: true });
                if (prevPole) {
                    addCatenaryWires(group, prevPole, pPos, powerMats.wireNormal, powerMats.wireBlackout, powerMats.wireOverload, 0.4);
                }
                prevPole = pPos;
            }
        }
    }
}

function createTransmissionLines() {
    const transmissionEdges = [
        { u: 'Subestacao_Central', v: 'Subestacao_Norte' },
        { u: 'Subestacao_Central', v: 'Subestacao_Sul' },
        { u: 'Subestacao_Central', v: 'Hospital_Prontomed' },
        { u: 'Subestacao_Norte', v: 'Bairro_Residencial_A' },
        { u: 'Subestacao_Norte', v: 'Centro_Comercial' },
        { u: 'Subestacao_Norte', v: 'Data_Center' },
        { u: 'Subestacao_Sul', v: 'Bairro_Residencial_B' },
        { u: 'Subestacao_Sul', v: 'Shopping_Metropolitano' },
        { u: 'Subestacao_Sul', v: 'Zona_Industrial_A' },
        { u: 'Subestacao_Sul', v: 'Escolas' },
        { u: 'Fazenda_Solar', v: 'Subestacao_Norte' },
        { u: 'Fazenda_Solar', v: 'Subestacao_Sul' },
        { u: 'Hospital_Prontomed', v: 'Data_Center' },
        { u: 'Centro_Comercial', v: 'Shopping_Metropolitano' },
        { u: 'Bairro_Residencial_A', v: 'Bairro_Residencial_B' },
        { u: 'Zona_Industrial_A', v: 'Shopping_Metropolitano' }
    ];

    const group = new THREE.Group();
    group.name = 'transmission_lines';
    group.userData = { isGridNode: true, active: true };
    cityGroup.add(group);
    powerGridObjects.push(group);

    transmissionEdges.forEach(edge => {
        const p1 = backendNodePositions[edge.u];
        const p2 = backendNodePositions[edge.v];

        if (p1 && p2) {
            // Curva Bezier Quadrática (pontos p1 e p2 na base/altura 8, controle no ar)
            const controlPoint = new THREE.Vector3(
                (p1.x + p2.x) / 2,
                Math.max(p1.y, p2.y) + 35.0, // Altura para evitar colisão com prédios altos
                (p1.z + p2.z) / 2
            );

            const curve = new THREE.QuadraticBezierCurve3(p1, controlPoint, p2);
            
            // Gerar geometria suave
            const points = curve.getPoints(32);
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            
            const line = new THREE.Line(geometry, powerMats.wireGlowing);
            line.computeLineDistances(); // Essencial para o LineDashedMaterial funcionar

            line.userData = { 
                originalMat: powerMats.wireGlowing, 
                blackoutMat: powerMats.wireBlackout, 
                overloadMat: powerMats.wireOverload,
                criticalMat: powerMats.wireCritical,
                backendEdgeId: `${edge.u}-${edge.v}`,
                currentSpeed: 5.0, // Velocidade padrão do dash (multiplicador)
                broken: false
            };
            group.add(line);
        }
    });
}

// ── Raycaster & Cliques ─────────────────────────────────────

const raycaster = new THREE.Raycaster();
raycaster.params.Line.threshold = 1.5;
const mouse = new THREE.Vector2();

let hoveredObject = null;

function setupRaycaster() {
    const tooltip = document.getElementById('xray-tooltip');
    const tooltipTitle = document.getElementById('tooltip-title');
    const tooltipDesc = document.getElementById('tooltip-desc');

    renderer.domElement.addEventListener('pointermove', (event) => {
        if (isDraggingMouse) return;

        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);

        const interactables = [...cityGroup.children, ...powerGridObjects];
        // Encontrar objetos com backendId ou backendEdgeId
        const intersects = raycaster.intersectObjects(interactables, true);
        
        let foundHover = null;
        for (let i = 0; i < intersects.length; i++) {
            let obj = intersects[i].object;
            // Subir na hierarquia até achar um com ID
            while (obj && !obj.userData?.backendId && !obj.userData?.backendEdgeId && obj !== scene) {
                obj = obj.parent;
            }
            if (obj && (obj.userData?.backendId || obj.userData?.backendEdgeId)) {
                foundHover = obj;
                break;
            }
        }

        if (hoveredObject !== foundHover) {
            // Reverter highlight anterior
            if (hoveredObject) {
                hoveredObject.traverse(child => {
                    if (child.material && child.material.emissive) {
                        child.material.emissiveIntensity = child.userData.origEmissiveInt || 0;
                    }
                });
            }

            hoveredObject = foundHover;

            // Aplicar novo highlight
            if (hoveredObject) {
                hoveredObject.traverse(child => {
                    if (child.material && child.material.emissive) {
                        child.userData.origEmissiveInt = child.material.emissiveIntensity;
                        child.material.emissiveIntensity = 0.5;
                        child.material.emissive.setHex(0xffffff);
                    }
                });
                
                tooltip.classList.remove('hidden');
                tooltip.style.opacity = '1';
                
                if (hoveredObject.userData.backendId) {
                    const id = hoveredObject.userData.backendId;
                    tooltipTitle.innerText = `🏢 ${id.replace(/_/g, ' ')}`;
                    
                    const nodeState = citySimulator.grafo.nodes.get(id);
                    if (nodeState) {
                        tooltipDesc.innerText = `Demanda: ${nodeState.demanda.toFixed(0)} kW\nStatus: ${nodeState.energizado ? 'Energizado ⚡' : 'Sem Energia ❌'}`;
                    } else {
                        tooltipDesc.innerText = 'Desconectado da Rede Principal';
                    }
                } else if (hoveredObject.userData.backendEdgeId) {
                    const id = hoveredObject.userData.backendEdgeId;
                    tooltipTitle.innerText = `🔌 Linha ${id}`;
                    
                    const [u, v] = id.split('-');
                    let edgeState = null;
                    if (citySimulator.grafo.edges.has(u) && citySimulator.grafo.edges.get(u).has(v)) {
                        edgeState = citySimulator.grafo.edges.get(u).get(v);
                    }
                    if (edgeState) {
                        const cap = (edgeState.fluxo / edgeState.capacidade) * 100;
                        tooltipDesc.innerText = `Carga: ${cap.toFixed(1)}%\nStatus: ${edgeState.ativa ? 'Ativa 🟢' : 'Rompida 🔴'}`;
                    } else {
                        tooltipDesc.innerText = 'Dados indisponíveis';
                    }
                }
            } else {
                tooltip.style.opacity = '0';
                setTimeout(() => { if (!hoveredObject) tooltip.classList.add('hidden'); }, 200);
            }
        }

        // Posicionar Tooltip (se ativo)
        if (hoveredObject) {
            tooltip.style.left = `${event.clientX + 15}px`;
            tooltip.style.top = `${event.clientY + 15}px`;
        }
    });

    // Multiclick (Caos)
    renderer.domElement.addEventListener('pointerdown', (event) => {
        if (mouseMovedDistance > 8 || !hoveredObject) return;

        // Botão Esquerdo (Cortar Fio)
        if (event.button === 0 && hoveredObject.userData.backendEdgeId) {
            const [origem, destino] = hoveredObject.userData.backendEdgeId.split('-');
            hoveredObject.traverse(child => {
                if (child.isLine) {
                    child.material = powerMats.wireBlackout;
                    child.userData.broken = true;
                    // Tocar VFX no meio da linha
                    if (window.vfxManager) {
                        const midPoint = new THREE.Vector3();
                        child.geometry.computeBoundingSphere();
                        midPoint.copy(child.geometry.boundingSphere.center);
                        midPoint.applyMatrix4(child.matrixWorld);
                        window.vfxManager.createSparks(midPoint);
                    }
                }
            });
            console.log(`[USER] Linha rompida: ${origem} -> ${destino}`);
            citySimulator.simularFalha(origem, destino);
        }

        // Botão Direito (Sobrecarga em Prédio)
        if (event.button === 2 && hoveredObject.userData.backendId) {
            const id = hoveredObject.userData.backendId;
            const nodeState = citySimulator.grafo.nodes.get(id);
            
            if (nodeState && nodeState.tipo !== 'gerador') {
                console.log(`[USER] Induzindo Sobrecarga no: ${id}`);
                nodeState.demanda *= 3.0; // Puxa 300% de carga instantaneamente
                
                hoveredObject.traverse(child => {
                    if (child.material && child.material.emissive) {
                        child.material.emissive.setHex(0xff0000); // Pisca Vermelho
                        child.material.emissiveIntensity = 1.0;
                    }
                });

                if (window.vfxManager) window.vfxManager.triggerShake(0.5);
                
                // Força orquestrador a recalcular
                citySimulator.sincronizarFrontEnd();
            }
        }
    });
    
    // Desativar menu de contexto do botão direito
    renderer.domElement.addEventListener('contextmenu', e => e.preventDefault());
}

function setWireMaterial(group, matKey) {
    group.children.forEach(child => {
        if (child.isLine && child.userData[matKey]) {
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

function simulateOverload() {
    powerState = 'overload';
    powerGridObjects.forEach(group => {
        if (group.userData.active) setWireMaterial(group, 'overloadMat');
    });
}

let sceneLightState = 'day';
let originalHemiColor, originalHemiGround, originalSunIntensity;

function forceNight() {
    if (!originalHemiColor) {
        const hemi = scene.children.find(c => c.isHemisphereLight);
        const sun = scene.children.find(c => c.isDirectionalLight);
        if (hemi && sun) {
            originalHemiColor = hemi.color.clone();
            originalHemiGround = hemi.groundColor.clone();
            originalSunIntensity = sun.intensity;
        }
    }

    sceneLightState = 'night';
    const hemi = scene.children.find(c => c.isHemisphereLight);
    const sun = scene.children.find(c => c.isDirectionalLight);

    if (hemi) {
        hemi.color.setHex(0x1a2a40);
        hemi.groundColor.setHex(0x0a101a);
        hemi.intensity = 0.5;
    }
    if (sun) {
        sun.intensity = 0.05;
        sun.color.setHex(0x6b80a6);
    }

    scene.background.setHex(0x0a1020);
    scene.fog.color.setHex(0x0a1020);

    powerGridObjects.forEach(group => {
        if (group.userData.active) {
            group.traverse(child => {
                if (child.name === "streetLampBulb" && child.material) {
                    child.material.emissive.setHex(0xffaa22);
                }
            });
        }
    });

    cityGroup.traverse(child => {
        if (child.isMesh && child.material && child.material.length) {
            child.material.forEach(mat => {
                if (mat.map && mat.emissive) {
                    mat.emissive.setHex(0x555544);
                    mat.emissiveIntensity = 1.0;
                }
            });
        }
    });
}

function powerPlantFailure() {
    powerState = 'blackout';
    let delay = 0;

    const sorted = [...powerGridObjects].sort((a, b) => {
        const d1 = Math.hypot(a.userData.row - GRID_RADIUS, a.userData.col - GRID_RADIUS);
        const d2 = Math.hypot(b.userData.row - GRID_RADIUS, b.userData.col - GRID_RADIUS);
        return d1 - d2;
    });

    sorted.forEach(group => {
        setTimeout(() => {
            triggerBlackout(group);
            if (sceneLightState === 'night') {
                cityGroup.children.forEach(c => {
                    if (c.name.includes(`${group.userData.row * GRID_SIZE + group.userData.col}`)) {
                        c.traverse(mesh => {
                            if (mesh.isMesh && mesh.material && mesh.material.length) {
                                mesh.material.forEach(mat => {
                                    if (mat.map && mat.emissive) {
                                        mat.emissive.setHex(0x000000);
                                    }
                                });
                            }
                        });
                    }
                });
            }
        }, delay);
        delay += 30 + Math.random() * 40;
    });
}

function resetCity() {
    powerState = 'normal';
    powerGridObjects.forEach(group => {
        group.userData.active = true;
        setWireMaterial(group, 'originalMat');
        group.traverse(child => {
            if (child.name === "streetLampBulb" && child.material) {
                child.material.emissive.setHex(0x000000);
            }
        });
    });

    if (sceneLightState === 'night') {
        sceneLightState = 'day';
        const hemi = scene.children.find(c => c.isHemisphereLight);
        const sun = scene.children.find(c => c.isDirectionalLight);

        if (hemi && originalHemiColor) {
            hemi.color.copy(originalHemiColor);
            hemi.groundColor.copy(originalHemiGround);
            hemi.intensity = 1.68;
        }
        if (sun && originalSunIntensity !== undefined) {
            sun.intensity = originalSunIntensity;
            sun.color.setHex(0xfff3d7);
        }
    }

    cityGroup.traverse(child => {
        if (child.isMesh && child.material && child.material.length) {
            child.material.forEach(mat => {
                if (mat.map && mat.emissive) {
                    mat.emissive.setHex(0x000000);
                    mat.emissiveIntensity = 1;
                }
            });
        }
    });
}

function setupUI() {
    const toggleBtn = document.getElementById('toggle-panel-btn');
    const panel = document.getElementById('control-panel');

    if (toggleBtn && panel) {
        toggleBtn.addEventListener('click', () => {
            panel.classList.toggle('hidden');
        });
    }

    document.getElementById('btn-overload')?.addEventListener('click', () => {
        // Simula sobrecarga alterando o clima para "chuvoso" (reduz geração solar) e avança 2h no pico
        citySimulator.alterarClima('chuvoso');
        citySimulator.tick(2);
        simulateOverload(); // mantém efeito visual de fios amarelos globalmente
    });

    document.getElementById('btn-night')?.addEventListener('click', () => {
        forceNight();
        // Sincroniza o motor: avança para as 20h (horário de pico noturno)
        citySimulator.estado.hora = 20;
        citySimulator.tick(0);
    });

    document.getElementById('btn-failure')?.addEventListener('click', () => {
        // Simula corte da linha principal da Usina → Subestação Norte
        const logs = citySimulator.simularFalha('Subestacao_Central', 'Subestacao_Norte');
        powerPlantFailure(); // cascata visual nos fios
        console.log('[UI] Falha injetada. Self-Healing respondeu:', logs);
    });

    document.getElementById('btn-reset')?.addEventListener('click', () => {
        resetCity();        // reseta luzes e fios no Three.js
        citySimulator.resetar(); // reseta todo o motor de IA
    });

    document.getElementById('btn-toggle-cam-mode')?.addEventListener('click', () => {
        setCameraMode(cameraMode === 'fly' ? 'orbit' : 'fly');
    });

    document.getElementById('btn-street-level')?.addEventListener('click', () => {
        if (cameraMode !== 'fly') setCameraMode('fly');
        targetPitch = 0.04;
        targetYaw = 0;
        smoothGlideTo(defaultStreetPos);
    });

    document.getElementById('btn-aerial-view')?.addEventListener('click', () => {
        if (cameraMode !== 'fly') setCameraMode('fly');
        targetPitch = -0.58;
        targetYaw = -0.68;
        smoothGlideTo(defaultAerialPos);
    });
}

function createLighting() {
    const hemi = new THREE.HemisphereLight(0xdcefff, 0x7c806d, 1.68);
    scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xfff3d7, 3.1);
    sun.position.set(-180, 250, 130);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024); // 1024x1024: leve, nítido e super rápido
    sun.shadow.camera.near = 40;
    sun.shadow.camera.far = 650;
    sun.shadow.camera.left = -260;
    sun.shadow.camera.right = 260;
    sun.shadow.camera.top = 260;
    sun.shadow.camera.bottom = -260;
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.02;
    scene.add(sun);
}

function initializeScene() {
    createGround();
    createRoadNetwork();
    createDistricts();
    createTrafficHints();
    createLighting();
    createPowerGrid();
    createTransmissionLines();

    buildInstancedTrees();
    buildInstancedBases();
    buildInstancedPoles();

    window.vfxManager = new VFXManager(scene);

    setupRaycaster();
    setupUI();
    setCameraMode('fly');
    window.smartCityStats = cityStats;
}

// ── Sincronização Visual com o Motor de IA ───────────────────

// Dicionário de tradução: ID interno do grafo JS → userData.backendId no Three.js
// (os dois são idênticos neste projeto — o mapeamento já foi alinhado)
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

// Estado de emissão salvo para restaurar brilho de janelas à noite
const _savedEmissive = new Map();

function syncSceneWithBackend(grafo, estado, logs) {
    if (logs && logs.length > 0) {
        console.groupCollapsed(`[SmartGrid] Tick ${estado.hora}h — ${logs.length} ação(ões)`);
        logs.forEach(l => {
            console.log(l);
            if (l.includes('[Self-Healing]') && l.includes('Rede restaurada via rotas alternativas')) {
                // Toca shockwave na Subestação Central
                if (window.vfxManager && backendNodePositions['Subestacao_Central']) {
                    window.vfxManager.createShockwave(backendNodePositions['Subestacao_Central']);
                    window.vfxManager.triggerShake(1.0);
                }
            }
        });
        console.groupEnd();
    }

    // ── 1. Sincronizar Nós (Apagão por bairro) ──────────────
    for (const [nodeId, node] of grafo.nodes) {
        const threeId = ID_MAP[nodeId];
        if (!threeId) continue;

        const bloco3D = cityGroup.children.find(
            c => c.isGroup && c.userData?.backendId === threeId
        );
        if (!bloco3D) continue;

        bloco3D.traverse(child => {
            if (!child.isMesh || !child.material) return;

            if (!node.status_energizado) {
                // APAGÃO: remove toda emissão e escurece
                if (child.material.emissive) child.material.emissive.setHex(0x000000);
                if (child.material.emissiveIntensity !== undefined) child.material.emissiveIntensity = 0;
            } else {
                // ENERGIZADO: restaura emissão da janela se for modo noite
                if (sceneLightState === 'night' && child.material.map && child.material.emissive) {
                    child.material.emissive.setHex(0x555544);
                    child.material.emissiveIntensity = 1.0;
                }
            }
        });
    }

    // ── 2. Sincronizar Linhas de Transmissão (Sobrecarga / Falha) ──
    const transLinesGroup = cityGroup.children.find(c => c.name === 'transmission_lines');
    if (transLinesGroup) {
        for (const edge of grafo.edges.values()) {
            const edgeId = `${edge.origem}-${edge.destino}`;
            const linha = transLinesGroup.children.find(
                l => l.userData?.backendEdgeId === edgeId
            );
            if (!linha) continue;

            const taxaCarga = edge.fluxo_kw_atual / Math.max(edge.capacidade_maxima_kw, 1);

            if (!edge.status_ativa) {
                linha.material = powerMats.wireBlackout;
                linha.userData.broken = true;
            } else if (taxaCarga >= 0.95) {
                linha.material = powerMats.wireCritical; // Vermelho
                linha.userData.currentSpeed = 15.0;      // 3x mais rápido
                linha.userData.broken = false;
            } else if (taxaCarga >= 0.85) {
                linha.material = powerMats.wireOverload; // Laranja
                linha.userData.currentSpeed = 10.0;      // 2x mais rápido
                linha.userData.broken = false;
            } else {
                linha.material = powerMats.wireGlowing;  // Azul neon
                linha.userData.currentSpeed = 5.0;       // Velocidade normal
                linha.userData.broken = false;
            }
        }
    }

    // ── 3. Atualizar HUD com dados da simulação ──────────────
    const hudHora = document.getElementById('hud-sim-hora');
    const hudDemanda = document.getElementById('hud-sim-demanda');
    const hudClima = document.getElementById('hud-sim-clima');
    if (hudHora)    hudHora.textContent    = `${String(estado.hora).padStart(2,'0')}:00`;
    if (hudDemanda) hudDemanda.textContent = `${grafo.demandaTotalKw().toFixed(0)} kW`;
    if (hudClima)   hudClima.textContent   = estado.clima;
}

// ── Instanciação do Simulador ─────────────────────────────────
// O CitySimulator é criado ANTES de initializeScene() para que
// setupUI() já possa referenciar seus métodos.
const citySimulator = new CitySimulator({ onSync: syncSceneWithBackend });

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

    if (cameraMode === 'fly') {
        pitch = THREE.MathUtils.lerp(pitch, targetPitch, 0.2);
        yaw = THREE.MathUtils.lerp(yaw, targetYaw, 0.2);

        euler.set(pitch, yaw, 0, 'YXZ');
        camera.quaternion.setFromEuler(euler);

        if (isGliding && glideTargetPos) {
            camera.position.lerp(glideTargetPos, 0.08);
            if (camera.position.distanceTo(glideTargetPos) < 0.5) {
                isGliding = false;
            }
        } else {
            const altitude = camera.position.y;
            // Velocidade adaptativa fluida: ~13 m/s no chão, ~90 m/s no céu
            const baseSpeed = Math.max(12, 10 + Math.pow(Math.max(0, altitude) / 14, 1.2) * 4.5);

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
                flyVelocity.lerp(targetVelocity, Math.min(1, delta * 9));
            } else {
                flyVelocity.lerp(new THREE.Vector3(0, 0, 0), Math.min(1, delta * 7));
            }

            camera.position.addScaledVector(flyVelocity, delta);

            // Trava do Solo para não afundar no asfalto
            if (camera.position.y < 1.4) {
                camera.position.y = 1.4;
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

    // Atualizar animação dos fios
    const transLinesGroup = cityGroup.children.find(c => c.name === 'transmission_lines');
    if (transLinesGroup) {
        transLinesGroup.children.forEach(linha => {
            if (linha.isLine && linha.material.isLineDashedMaterial && !linha.userData.broken) {
                const speed = linha.userData.currentSpeed || 5.0;
                linha.material.dashOffset -= delta * speed;
            }
        });
    }

    if (scene.fog && sceneLightState === 'day') {
        const altitude = camera.position.y;
        const t = Math.max(0, Math.min(1, altitude / 250));
        scene.fog.near = 70 + (t * 250);
        scene.fog.far = 240 + (t * 620);

        const r = 166 + t * (191 - 166);
        const g = 194 + t * (211 - 194);
        const b = 218 + t * (230 - 218);
        scene.background.setRGB(r / 255, g / 255, b / 255);
        scene.fog.color.setRGB(r / 255, g / 255, b / 255);
    }

    let originalCamPos = null;
    let shakeOffset = null;
    if (window.vfxManager) {
        shakeOffset = window.vfxManager.update(delta, camera);
        if (shakeOffset && (shakeOffset.x !== 0 || shakeOffset.y !== 0 || shakeOffset.z !== 0)) {
            originalCamPos = camera.position.clone();
            camera.position.add(shakeOffset);
        }
    }

    renderer.render(scene, camera);

    if (originalCamPos) {
        camera.position.copy(originalCamPos);
    }
}

function handleResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

window.addEventListener('resize', handleResize);
animate();

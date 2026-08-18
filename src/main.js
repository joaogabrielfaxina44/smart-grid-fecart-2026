import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const container = document.getElementById('canvas-container');

// ── Cena, Câmera e Renderizador Otimizado ────────────────────

const scene = new THREE.Scene();
const skyColorDay = new THREE.Color(0xbfd3e6);
scene.background = skyColorDay.clone();
scene.fog = new THREE.Fog(0xbfd3e6, 320, 860);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1600);
const defaultCamPos = new THREE.Vector3(260, 220, 330);
const defaultCamTarget = new THREE.Vector3(0, 0, 0);
camera.position.copy(defaultCamPos);

const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: 'high-performance',
    stencil: false
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
container.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.copy(defaultCamTarget);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.screenSpacePanning = true;
controls.minDistance = 6;
controls.maxDistance = 780;
controls.maxPolarAngle = Math.PI / 2 - 0.02;
controls.rotateSpeed = 0.52;
controls.zoomSpeed = 0.88;
controls.panSpeed = 0.82;

// Sistema de transição suave de foco da câmera
let targetFocusPoint = null;
let targetCamPos = null;
let isTransitioningCam = false;

function focusOnPoint(targetX, targetY, targetZ, shouldZoom = false) {
    targetFocusPoint = new THREE.Vector3(targetX, targetY, targetZ);
    if (shouldZoom) {
        const offset = new THREE.Vector3().subVectors(camera.position, controls.target);
        const currentDist = offset.length();
        const desiredDist = Math.max(32, Math.min(currentDist, 75));
        offset.normalize().multiplyScalar(desiredDist);
        if (offset.y < 15) offset.y = 15;
        targetCamPos = new THREE.Vector3().addVectors(targetFocusPoint, offset);
    } else {
        targetCamPos = null;
    }
    isTransitioningCam = true;
}

function resetCameraView() {
    targetFocusPoint = defaultCamTarget.clone();
    targetCamPos = defaultCamPos.clone();
    isTransitioningCam = true;
}

const cityGroup = new THREE.Group();
cityGroup.name = 'Large Mixed Smart City';
scene.add(cityGroup);

// Geometrias reutilizáveis base
const unitBoxGeometry = new THREE.BoxGeometry(1, 1, 1);
const trunkGeometry = new THREE.CylinderGeometry(0.2, 0.26, 1.6, 7);
const canopyGeometry = new THREE.SphereGeometry(1, 8, 6);

// Materiais compartilhados
const materials = {
    terrain: new THREE.MeshStandardMaterial({ color: 0x708d63, roughness: 0.96 }),
    asphalt: new THREE.MeshStandardMaterial({ color: 0x303337, roughness: 0.9 }),
    sidewalk: new THREE.MeshStandardMaterial({ color: 0xb8b3a9, roughness: 0.92 }),
    park: new THREE.MeshStandardMaterial({ color: 0x4f8a4c, roughness: 0.98 }),
    roofDark: new THREE.MeshStandardMaterial({ color: 0x5d5d58, roughness: 0.86 }),
    roofConcrete: new THREE.MeshStandardMaterial({ color: 0x858a86, roughness: 0.88 }),
    roofTerracotta: new THREE.MeshStandardMaterial({ color: 0x9d5b3f, roughness: 0.9 }),
    hospitalWhite: new THREE.MeshStandardMaterial({ color: 0xe6e8e3, roughness: 0.72 }),
    hospitalRed: new THREE.MeshStandardMaterial({ color: 0xb32e2a, roughness: 0.58 }),
    concrete: new THREE.MeshStandardMaterial({ color: 0xa9aaa4, roughness: 0.76 }),
    glassBlue: new THREE.MeshStandardMaterial({
        color: 0x8fa9b4,
        roughness: 0.28,
        metalness: 0.1,
        transparent: true,
        opacity: 0.78
    }),
    glassGreen: new THREE.MeshStandardMaterial({
        color: 0x8aa39b,
        roughness: 0.34,
        metalness: 0.08,
        transparent: true,
        opacity: 0.72
    }),
    industryWall: new THREE.MeshStandardMaterial({ color: 0x9c9688, roughness: 0.86 }),
    industryRoof: new THREE.MeshStandardMaterial({ color: 0x6e7778, roughness: 0.78 }),
    solar: new THREE.MeshStandardMaterial({ color: 0x243849, roughness: 0.38, metalness: 0.18 }),
    roadMarking: new THREE.MeshBasicMaterial({ color: 0xf2e7c9 }),
    windowBand: new THREE.MeshBasicMaterial({ color: 0xd6dee1 }),
    awning: new THREE.MeshStandardMaterial({ color: 0x7f3f35, roughness: 0.68 }),
    trunk: new THREE.MeshStandardMaterial({ color: 0x73523b, roughness: 0.9 }),
    canopy: new THREE.MeshStandardMaterial({ color: 0x3f7944, roughness: 0.95 }),
    carRed: new THREE.MeshStandardMaterial({ color: 0xa84a3f, roughness: 0.52 }),
    carWhite: new THREE.MeshStandardMaterial({ color: 0xdad7ce, roughness: 0.48 }),
    carBlue: new THREE.MeshStandardMaterial({ color: 0x405c74, roughness: 0.52 }),
    carGray: new THREE.MeshStandardMaterial({ color: 0x777b7a, roughness: 0.52 })
};

const residentialWalls = [
    new THREE.MeshStandardMaterial({ color: 0xd8c9b0, roughness: 0.84 }),
    new THREE.MeshStandardMaterial({ color: 0xc9c3b4, roughness: 0.84 }),
    new THREE.MeshStandardMaterial({ color: 0xe1d8c8, roughness: 0.86 }),
    new THREE.MeshStandardMaterial({ color: 0xb9c0b5, roughness: 0.83 }),
    new THREE.MeshStandardMaterial({ color: 0xc6ad99, roughness: 0.84 }),
    new THREE.MeshStandardMaterial({ color: 0xd0d2ca, roughness: 0.86 }),
    new THREE.MeshStandardMaterial({ color: 0xbda994, roughness: 0.84 })
];

const officeMaterials = [
    new THREE.MeshStandardMaterial({ color: 0x9ea5a8, roughness: 0.58 }),
    new THREE.MeshStandardMaterial({ color: 0xb7b3aa, roughness: 0.64 }),
    new THREE.MeshStandardMaterial({ color: 0x7d909c, roughness: 0.36, metalness: 0.08 }),
    new THREE.MeshStandardMaterial({ color: 0xc4c1b7, roughness: 0.68 }),
    new THREE.MeshStandardMaterial({ color: 0x8a8f8e, roughness: 0.62 })
];

// ── Sistema de Texturas de Fachadas & Detalhes Urbanos ───────

const facadeMaterialCache = new Map();

const wallPalettes = {
    residential: ['#d8c9b0', '#c9c3b4', '#e1d8c8', '#b9c0b5', '#c6ad99', '#d0d2ca', '#bda994', '#c4b8a0', '#ddd5c6', '#e8dcc8'],
    office: ['#b8bcc0', '#a0a4a8', '#c4c1b7', '#8a8f8e', '#9ea5a8', '#bbb8b0', '#a8b0b4', '#c0c4c8', '#d0ccc4', '#a4aab0'],
    glass: ['#6a8a9a', '#7a9aaa', '#5a7a8a', '#8aaabc', '#6090a0', '#7888a0', '#5a8898', '#6a98a8'],
    shop: ['#d8c9b0', '#c4b8a0', '#e1d8c8', '#ddd0bc', '#c9c0b0', '#d0c4b4'],
    industrial: ['#9c9688', '#a8a298', '#8a8880', '#b0a898', '#948c80', '#a0988c']
};

const windowDarkColors = ['#1a2838', '#1e2e3e', '#222e3a', '#182434', '#202c38'];
const windowLitWarm = ['#d4c87a', '#c8bc6a', '#e0d48a', '#ccbe70', '#dcc468'];
const windowLitCool = ['#a0b8d0', '#90a8c0', '#b0c8e0', '#88a0b8'];

const awningPalette = [
    new THREE.MeshStandardMaterial({ color: 0x7f3f35, roughness: 0.68 }),
    new THREE.MeshStandardMaterial({ color: 0x2d5a3a, roughness: 0.68 }),
    new THREE.MeshStandardMaterial({ color: 0x3a4a6a, roughness: 0.68 }),
    new THREE.MeshStandardMaterial({ color: 0x6a3a5a, roughness: 0.68 }),
    new THREE.MeshStandardMaterial({ color: 0x8a6a2a, roughness: 0.68 }),
    new THREE.MeshStandardMaterial({ color: 0x4a2a2a, roughness: 0.68 }),
    new THREE.MeshStandardMaterial({ color: 0x2a4a4a, roughness: 0.68 }),
];

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
    pole: new THREE.MeshStandardMaterial({ color: 0x4a443d, roughness: 0.88 }),
    woodPole: new THREE.MeshStandardMaterial({ color: 0x584b3e, roughness: 0.85 }),
    metalArm: new THREE.MeshStandardMaterial({ color: 0x3d4146, roughness: 0.5, metalness: 0.4 }),
    insulator: new THREE.MeshStandardMaterial({ color: 0x3b8b88, roughness: 0.25, metalness: 0.2 }),
    transformer: new THREE.MeshStandardMaterial({ color: 0x32373d, roughness: 0.4, metalness: 0.5 }),
    streetLamp: new THREE.MeshStandardMaterial({ color: 0x22262b, roughness: 0.5 }),
    wireNormal: new THREE.LineBasicMaterial({ color: 0x1f2429, linewidth: 1 }),
    wireGlowing: new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.85, linewidth: 2 }),
    wireOverload: new THREE.LineBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.95, linewidth: 2 }),
    wireBlackout: new THREE.LineBasicMaterial({ color: 0x18181b, transparent: true, opacity: 0.25, linewidth: 1 }),
};

function createFacadeCanvas(faceW, faceH, seed, opts = {}) {
    const { type = 'office', hasEntrance = false, hasShopFront = false } = opts;
    const ppu = 16;
    const cw = Math.max(16, Math.round(faceW * ppu));
    const ch = Math.max(16, Math.round(faceH * ppu));
    const canvas = document.createElement('canvas');
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext('2d');

    const pal = wallPalettes[type] || wallPalettes.office;
    ctx.fillStyle = pal[Math.abs(seed) % pal.length];
    ctx.fillRect(0, 0, cw, ch);

    ctx.globalAlpha = 0.03;
    for (let i = 0; i < 14; i++) {
        ctx.fillStyle = noise(seed + i, i, 500) > 0.5 ? '#000' : '#fff';
        ctx.fillRect(
            noise(seed + i, i, 501) * cw, noise(i, seed, 502) * ch,
            3 + noise(seed, i, 503) * 8, 3 + noise(i, seed, 504) * 8
        );
    }
    ctx.globalAlpha = 1;

    let ww, wh, spX, spY;
    if (type === 'glass') {
        ww = Math.round((0.9 + noise(seed, 0, 510) * 0.4) * ppu);
        wh = Math.round((1.2 + noise(seed, 1, 511) * 0.5) * ppu);
        spX = Math.round((1.1 + noise(seed, 2, 512) * 0.2) * ppu);
        spY = Math.round((1.5 + noise(seed, 3, 513) * 0.3) * ppu);
    } else if (type === 'residential') {
        ww = Math.round((0.4 + noise(seed, 0, 514) * 0.25) * ppu);
        wh = Math.round((0.5 + noise(seed, 1, 515) * 0.25) * ppu);
        spX = Math.round((1.2 + noise(seed, 2, 516) * 0.5) * ppu);
        spY = Math.round((1.2 + noise(seed, 3, 517) * 0.5) * ppu);
    } else if (type === 'industrial') {
        ww = Math.round((0.9 + noise(seed, 0, 518) * 0.5) * ppu);
        wh = Math.round((0.5 + noise(seed, 1, 519) * 0.2) * ppu);
        spX = Math.round((2.0 + noise(seed, 2, 520) * 0.8) * ppu);
        spY = Math.round((2.0 + noise(seed, 3, 521) * 0.6) * ppu);
    } else if (type === 'shop') {
        ww = Math.round((0.45 + noise(seed, 0, 522) * 0.2) * ppu);
        wh = Math.round((0.55 + noise(seed, 1, 523) * 0.2) * ppu);
        spX = Math.round((1.1 + noise(seed, 2, 524) * 0.4) * ppu);
        spY = Math.round((1.3 + noise(seed, 3, 525) * 0.4) * ppu);
    } else {
        ww = Math.round((0.55 + noise(seed, 0, 526) * 0.3) * ppu);
        wh = Math.round((0.7 + noise(seed, 1, 527) * 0.35) * ppu);
        spX = Math.round((1.15 + noise(seed, 2, 528) * 0.4) * ppu);
        spY = Math.round((1.5 + noise(seed, 3, 529) * 0.35) * ppu);
    }

    const mTop = Math.round(0.4 * ppu);
    const mBot = hasEntrance || hasShopFront ? Math.round(ch * 0.16) : Math.round(0.25 * ppu);
    const cols = Math.max(1, Math.floor((cw - ww) / spX));
    const rows = Math.max(1, Math.floor((ch - mTop - mBot) / spY));
    const x0 = (cw - (cols - 1) * spX - ww) / 2;

    ctx.fillStyle = 'rgba(0,0,0,0.06)';
    for (let r = 1; r < rows; r++) ctx.fillRect(0, mTop + r * spY - 1, cw, 2);

    const litChance = type === 'glass' ? 0.3 : 0.15;
    const litPal = type === 'glass' ? windowLitCool : windowLitWarm;

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if ((hasEntrance || hasShopFront) && r === rows - 1 && Math.abs(c - cols / 2) < 1.2) continue;
            const wx = x0 + c * spX;
            const wy = mTop + r * spY;
            const h = noise(seed + r, c, 530);
            ctx.fillStyle = h > (1 - litChance)
                ? litPal[Math.floor(h * 100) % litPal.length]
                : windowDarkColors[Math.abs(seed + r + c) % windowDarkColors.length];
            ctx.fillRect(wx, wy, ww, wh);
            ctx.strokeStyle = type === 'glass' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.16)';
            ctx.lineWidth = 1;
            ctx.strokeRect(wx, wy, ww, wh);
            if (type !== 'glass' && type !== 'industrial' && noise(seed + c, r, 531) > 0.45) {
                ctx.beginPath();
                ctx.moveTo(wx + ww / 2, wy);
                ctx.lineTo(wx + ww / 2, wy + wh);
                ctx.strokeStyle = 'rgba(0,0,0,0.1)';
                ctx.stroke();
            }
            if (type !== 'glass') {
                ctx.fillStyle = 'rgba(0,0,0,0.07)';
                ctx.fillRect(wx - 1, wy + wh, ww + 2, 2);
            }
        }
    }

    if (hasEntrance) {
        const dw = Math.round(cw * 0.2);
        const dh = Math.round(ch * 0.12);
        const dx = Math.round((cw - dw) / 2);
        const dy = ch - dh;
        ctx.fillStyle = '#4a4a48';
        ctx.fillRect(dx - 2, dy - 2, dw + 4, dh + 2);
        ctx.fillStyle = '#2a1a0a';
        ctx.fillRect(dx, dy, dw, dh);
        ctx.fillStyle = 'rgba(100,140,170,0.4)';
        ctx.fillRect(dx + 2, dy + 2, dw / 2 - 3, dh - 4);
        ctx.fillRect(dx + dw / 2 + 1, dy + 2, dw / 2 - 3, dh - 4);
    }

    if (hasShopFront) {
        const sh = Math.round(ch * 0.14);
        const sfy = ch - sh;
        const sfColors = ['#405060', '#504838', '#3a5040', '#504050'];
        ctx.fillStyle = sfColors[Math.abs(seed) % sfColors.length];
        ctx.fillRect(2, sfy, cw - 4, sh - 1);
        ctx.fillStyle = 'rgba(120,160,180,0.45)';
        ctx.fillRect(6, sfy + 2, cw - 12, sh - 5);
        const sdw = Math.round((cw - 12) * 0.18);
        ctx.fillStyle = '#2a1a0a';
        ctx.fillRect(Math.round(cw / 2 - sdw / 2), sfy + 2, sdw, sh - 4);
    }

    if (type === 'industrial' && noise(seed, 5, 540) > 0.4) {
        const ldw = Math.round(cw * 0.3);
        const ldh = Math.round(ch * 0.35);
        const ldx = Math.round(cw * 0.1);
        const ldy = ch - ldh;
        ctx.fillStyle = '#5a5a58';
        ctx.fillRect(ldx, ldy, ldw, ldh);
        ctx.strokeStyle = '#444';
        ctx.lineWidth = 2;
        ctx.strokeRect(ldx, ldy, ldw, ldh);
    }

    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    ctx.fillRect(0, 0, cw, 3);

    return canvas;
}

function getFacadeMaterial(fw, fh, seed, type, opts = {}) {
    const qw = Math.round(fw * 2) / 2;
    const qh = Math.round(fh);
    const sk = Math.abs(seed) % 47;
    const key = `${type}_${qw}_${qh}_${sk}_${opts.hasEntrance ? 'e' : ''}_${opts.hasShopFront ? 's' : ''}`;
    if (facadeMaterialCache.has(key)) return facadeMaterialCache.get(key);
    const canvas = createFacadeCanvas(fw, fh, seed, { type, ...opts });
    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.MeshStandardMaterial({
        map: texture,
        roughness: type === 'glass' ? 0.28 : type === 'residential' ? 0.84 : 0.74,
        metalness: type === 'glass' ? 0.1 : 0,
        transparent: type === 'glass',
        opacity: type === 'glass' ? 0.88 : 1,
    });
    facadeMaterialCache.set(key, mat);
    return mat;
}

function addBuildingWithFacade({ width, height, depth, x, z, seed, type, parent = cityGroup, hasEntrance = false, hasShopFront = false, roofMaterial = null }) {
    const frontMat = getFacadeMaterial(width, height, seed, type, { hasEntrance, hasShopFront });
    const backMat = getFacadeMaterial(width, height, seed + 50, type, {});
    const sideMatL = getFacadeMaterial(depth, height, seed + 100, type, {});
    const sideMatR = getFacadeMaterial(depth, height, seed + 150, type, {});
    const topMat = roofMaterial || materials.roofConcrete;
    const botMat = materials.sidewalk;
    const mesh = new THREE.Mesh(unitBoxGeometry, [sideMatR, sideMatL, topMat, botMat, frontMat, backMat]);
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
    const n3 = noise(seed, 2, 562);
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
    if (n3 > 0.55) {
        addBox({ width: 0.06, height: 1.4 + n3 * 1.0, depth: 0.06, x: x + w * 0.25, y: h + 0.7 + n3 * 0.5, z: z + d * 0.22, material: detailMats.antenna, parent, cast: false, receive: false });
    }
    if (noise(seed, 3, 563) > 0.6) {
        addBox({ width: w * 0.4, height: 0.2, depth: 0.25, x, y: h + 0.1, z: z - d * 0.25, material: detailMats.ductwork, parent, cast: false, receive: false });
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
        if (noise(seed + i, 1, 573) > 0.6) {
            addBox({ width: bd, height: 0.07, depth: bw, x: x + w / 2 + bd / 2, y: by, z, material: detailMats.balcony, parent, cast: false, receive: false });
            addBox({ width: 0.04, height: 0.3, depth: bw, x: x + w / 2 + bd, y: by + 0.15, z, material: detailMats.railing, parent, cast: false, receive: false });
        }
    }
}

function addEntranceCanopy(parent, x, z, canopyW, bDepth) {
    addBox({ width: canopyW, height: 0.08, depth: 0.9, x, y: 2.2, z: z - bDepth / 2 - 0.45, material: detailMats.ledge, parent, cast: false, receive: false });
    addBox({ width: 0.08, height: 2.1, depth: 0.08, x: x - canopyW / 2 + 0.08, y: 1.05, z: z - bDepth / 2 - 0.8, material: detailMats.entranceFrame, parent, cast: false, receive: false });
    addBox({ width: 0.08, height: 2.1, depth: 0.08, x: x + canopyW / 2 - 0.08, y: 1.05, z: z - bDepth / 2 - 0.8, material: detailMats.entranceFrame, parent, cast: false, receive: false });
}

// ── Dimensões do Grid e Estatísticas ────────────────────────

const GRID_SIZE = 19;
const GRID_RADIUS = Math.floor(GRID_SIZE / 2);
const BLOCK_SIZE = 18;
const ROAD_WIDTH = 6;
const SIDEWALK_WIDTH = 1.65;
const ROAD_STEP = BLOCK_SIZE + ROAD_WIDTH;
const EDGE_MARGIN = 18;
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

// Coleta de dados para InstancedMesh (Árvores, Carros e Bases de Calçada)
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

function pick(list, index) {
    return list[Math.abs(index) % list.length];
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
        addRoadMarking(WORLD_SIZE, 0.16, 0, coord);
        addRoadMarking(0.16, WORLD_SIZE, coord, 0);
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
    const dr = row - GRID_RADIUS;
    const dc = col - GRID_RADIUS;
    const distance = Math.hypot(dr, dc);
    const n = noise(row, col);

    if (row === GRID_RADIUS - 5 && col === GRID_RADIUS - 1) return 'hospital';
    if (row === GRID_RADIUS + 3 && col === GRID_RADIUS - 6) return 'hospital';
    if (row === GRID_RADIUS + 1 && col === GRID_RADIUS + 1) return 'services';
    if (row === GRID_RADIUS - 4 && col === GRID_RADIUS + 5) return 'services';
    if ((row === GRID_RADIUS - 3 && col === GRID_RADIUS + 6) || (row === GRID_RADIUS + 4 && col === GRID_RADIUS - 2)) return 'park';

    const industrialEdge = row > GRID_RADIUS + 4 && col > GRID_RADIUS + 2;
    const industrialSouth = row > GRID_RADIUS + 6 && n > 0.32;
    const industrialEast = col > GRID_RADIUS + 6 && row > GRID_RADIUS + 1 && n > 0.28;

    if (industrialEdge || industrialSouth || industrialEast) {
        return n > 0.78 ? 'mixed' : 'industrial';
    }

    if (distance > 4 && n > 0.91) return 'park';
    if (distance < 2.6) return n > 0.18 ? 'commercial' : 'mixed';
    if (distance < 5.7) return n > 0.27 ? 'mixed' : 'commercial';
    if (distance < 8.1) return n > 0.48 ? 'mixed' : 'residential';
    return n > 0.76 ? 'mixed' : 'residential';
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

            if (block.type === 'residential') createResidentialBlock(block);
            if (block.type === 'mixed') createMixedUrbanBlock(block);
            if (block.type === 'commercial') createCommercialBlock(block);
            if (block.type === 'hospital') createHospital(block);
            if (block.type === 'industrial') createIndustrialBlock(block);
            if (block.type === 'park') createPark(block);
            if (block.type === 'services') createServiceBlock(block);
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
        [-5.9, -5.7], [0, -5.9], [5.9, -5.5],
        [-6.0, 0.1], [0.2, 0.3], [5.8, 0.2],
        [-3.1, 5.9], [3.7, 5.7]
    ];
    const local = seededRandom(3000 + block.index * 41);

    lots.forEach(([lx, lz], lotIndex) => {
        if (lotIndex > 5 && local() < 0.38) return;

        if (lotIndex === 4 && local() > 0.66) {
            createLowRise(group, block.x + lx, block.z + lz, block.index + lotIndex, 5.5 + local() * 4.5);
        } else if (lotIndex === 2 && local() > 0.76) {
            createShopHouse(group, block.x + lx, block.z + lz, block.index + lotIndex);
        } else {
            createDetachedHouse(group, block.x + lx, block.z + lz, block.index + lotIndex, 0.86 + local() * 0.25);
        }
    });

    if (noise(block.row, block.col, 2) > 0.72) {
        createSmallApartment(group, block.x + 5.6, block.z + 5.6, block.index, 8 + noise(block.row, block.col, 3) * 8);
    }

    createStreetTrees(block.x, block.z, 2 + Math.floor(noise(block.row, block.col, 4) * 3));
}

function createMixedUrbanBlock(block) {
    const group = new THREE.Group();
    group.name = `mixed-${block.index}`;
    cityGroup.add(group);

    const distance = Math.hypot(block.row - GRID_RADIUS, block.col - GRID_RADIUS);
    const lots = [
        [-5.8, -5.8], [0.2, -5.7], [5.9, -5.8],
        [-5.9, 0.3], [0.1, 0.2], [5.7, 0.2],
        [-3.2, 5.8], [3.7, 5.7]
    ];

    lots.forEach(([lx, lz], lotIndex) => {
        const n = noise(block.row + lotIndex, block.col, 8);
        const x = block.x + lx + (n - 0.5) * 0.7;
        const z = block.z + lz + (noise(block.row, block.col + lotIndex, 9) - 0.5) * 0.7;

        if (lotIndex === 4 && distance < 6.8 && n > 0.42) {
            createOfficeTower(group, x, z, block.index + lotIndex, 18 + n * 28);
        } else if (n > 0.68) {
            createSmallApartment(group, x, z, block.index + lotIndex, 8 + n * 12);
        } else if (n > 0.38) {
            createShopHouse(group, x, z, block.index + lotIndex);
        } else {
            createDetachedHouse(group, x, z, block.index + lotIndex, 0.85 + n * 0.28);
        }
    });

    if (distance < 4.6 && noise(block.row, block.col, 12) > 0.58) {
        createOfficeTower(group, block.x - 6.1, block.z + 6.0, block.index + 77, 22 + noise(block.row, block.col, 13) * 38);
    }

    createStreetTrees(block.x, block.z, 1 + Math.floor(noise(block.row, block.col, 14) * 3));
}

function createCommercialBlock(block) {
    const group = new THREE.Group();
    group.name = `commercial-${block.index}`;
    cityGroup.add(group);

    const distance = Math.hypot(block.row - GRID_RADIUS, block.col - GRID_RADIUS);
    const towerCount = distance < 2.4 ? 5 : 3 + Math.floor(noise(block.row, block.col, 20) * 3);
    const towerLots = [
        [-5.8, -5.7], [5.7, -5.5], [-5.4, 5.5], [5.6, 5.3], [0, 0]
    ];

    for (let i = 0; i < towerCount; i += 1) {
        const [lx, lz] = towerLots[i];
        const n = noise(block.row + i, block.col, 21);
        const height = (distance < 2.4 ? 34 : 22) + n * (distance < 2.4 ? 52 : 36);
        createOfficeTower(group, block.x + lx, block.z + lz, block.index + i, height);
    }

    if (distance > 2.1 || noise(block.row, block.col, 22) > 0.55) {
        createShopHouse(group, block.x, block.z - 7.1, block.index + 40, 1.15);
        createLowRise(group, block.x - 7.0, block.z + 0.8, block.index + 41, 7 + noise(block.row, block.col, 23) * 6);
    }
}

function createDetachedHouse(parent, x, z, seed, scale = 1) {
    const n = noise(seed, seed + 1, 30);
    const width = (3.3 + n * 1.7) * scale;
    const depth = (3.1 + noise(seed, seed + 2, 31) * 1.8) * scale;
    const height = (2.1 + noise(seed, seed + 3, 32) * 2.1) * scale;
    const roofMaterial = noise(seed, seed + 4, 33) > 0.45 ? materials.roofTerracotta : materials.roofDark;

    addBuildingWithFacade({ width, height, depth, x, z, seed, type: 'residential', parent, hasEntrance: true, roofMaterial });
    addBox({ width: width + 0.38, height: 0.42, depth: depth + 0.38, x, y: height + 0.21, z, material: roofMaterial, parent, cast: false, receive: true });

    if (noise(seed, seed + 5, 34) > 0.62) {
        addBox({ width: width * 0.48, height: 0.04, depth: depth * 0.42, x: x + width * 0.09, y: height + 0.45, z, material: materials.solar, parent, cast: false, receive: false });
    }

    if (noise(seed, seed + 6, 35) > 0.74) {
        addBuildingWithFacade({ width: width * 0.55, height: 1.15 * scale, depth: 1.9 * scale, x: x - width * 0.26, z: z + depth * 0.65, seed: seed + 200, type: 'residential', parent, roofMaterial: materials.roofConcrete });
    }

    if (noise(seed, seed + 7, 36) > 0.7) {
        addBox({ width: 0.35 * scale, height: 1.0 * scale, depth: 0.35 * scale, x: x + width * 0.2, y: height + 0.5 * scale, z: z - depth * 0.15, material: detailMats.chimneyCap, parent, cast: false, receive: false });
    }

    cityStats.houses += 1;
}

function createShopHouse(parent, x, z, seed, scale = 1) {
    const width = (4.4 + noise(seed, seed + 7, 40) * 2.8) * scale;
    const depth = (4.2 + noise(seed, seed + 8, 41) * 2.5) * scale;
    const height = (3.2 + noise(seed, seed + 9, 42) * 2.8) * scale;

    addBuildingWithFacade({ width, height, depth, x, z, seed, type: 'shop', parent, hasShopFront: true, roofMaterial: materials.roofConcrete });
    addBox({ width: width + 0.24, height: 0.34, depth: depth + 0.24, x, y: height + 0.17, z, material: materials.roofConcrete, parent, cast: false, receive: true });

    const awningMat = pick(awningPalette, seed);
    addBox({ width: width * 0.82, height: 0.26, depth: 0.28, x, y: 1.7 * scale, z: z - depth / 2 - 0.16, material: awningMat, parent, cast: false, receive: false });

    if (noise(seed, seed + 11, 44) > 0.5) {
        addBox({ width: 0.45, height: 0.3, depth: 0.25, x: x + width / 2 + 0.13, y: 2.2 * scale, z: z + depth * 0.2, material: detailMats.acUnit, parent, cast: false, receive: false });
    }

    cityStats.midRises += 1;
}

function createLowRise(parent, x, z, seed, height) {
    const width = 5.2 + noise(seed, seed + 11, 50) * 2.8;
    const depth = 5.0 + noise(seed, seed + 12, 51) * 2.8;

    addBuildingWithFacade({ width, height, depth, x, z, seed, type: 'office', parent, hasEntrance: true });
    addBox({ width: width * 0.72, height: 0.42, depth: depth * 0.7, x, y: height + 0.21, z, material: materials.roofConcrete, parent, cast: false, receive: true });
    addRooftopDetails(parent, x, z, width, depth, height, seed);

    if (noise(seed, seed + 13, 52) > 0.45) {
        addEntranceCanopy(parent, x, z, 2.5, depth);
    }

    cityStats.midRises += 1;
}

function createSmallApartment(parent, x, z, seed, height) {
    const width = 4.8 + noise(seed, seed + 13, 60) * 2.2;
    const depth = 4.8 + noise(seed, seed + 14, 61) * 2.5;
    const isGlass = noise(seed, seed + 15, 62) > 0.62;
    const facadeType = isGlass ? 'glass' : 'office';

    addBuildingWithFacade({ width, height, depth, x, z, seed, type: facadeType, parent, hasEntrance: true });

    const balconyCount = Math.max(1, Math.floor(height / 4));
    addBalconies(parent, x, z, width, depth, height, seed, balconyCount);
    addRooftopDetails(parent, x, z, width, depth, height, seed);

    cityStats.midRises += 1;
}

function createOfficeTower(parent, x, z, seed, height) {
    const width = 4.8 + noise(seed, seed + 16, 70) * 3.8;
    const depth = 4.8 + noise(seed, seed + 17, 71) * 3.9;
    const materialRoll = noise(seed, seed + 18, 72);
    const facadeType = materialRoll > 0.42 ? 'glass' : 'office';

    addBuildingWithFacade({ width, height, depth, x, z, seed, type: facadeType, parent, hasEntrance: true });

    if (noise(seed, seed + 19, 73) > 0.58) {
        addBox({ width: width * 0.7, height: 1.2, depth: depth * 0.68, x, y: height + 0.6, z, material: materials.concrete, parent, cast: true, receive: true });
    }

    addRooftopDetails(parent, x, z, width, depth, height, seed);

    if (noise(seed, seed + 20, 74) > 0.4) {
        addEntranceCanopy(parent, x, z, Math.min(3.5, width * 0.6), depth);
    }

    if (facadeType !== 'glass' && noise(seed, seed + 21, 75) > 0.5) {
        const balconyCount = Math.max(2, Math.floor(height / 6));
        addBalconies(parent, x, z, width, depth, height, seed, balconyCount);
    }

    cityStats.towers += 1;
}

function createHospital(block) {
    const group = new THREE.Group();
    group.name = `hospital-${block.index}`;
    cityGroup.add(group);

    addBox({ width: 15.6, height: 6, depth: 12.6, x: block.x, z: block.z, material: materials.hospitalWhite, parent: group, cast: true, receive: true });
    addBox({ width: 7.2, height: 5, depth: 17.0, x: block.x - 4.2, y: 2.5, z: block.z, material: materials.hospitalWhite, parent: group, cast: true, receive: true });
    addBox({ width: 5.4, height: 8.4, depth: 6.6, x: block.x + 5.4, y: 4.2, z: block.z - 2.8, material: materials.concrete, parent: group, cast: true, receive: true });
    addBox({ width: 1.1, height: 0.08, depth: 6.2, x: block.x, y: 6.12, z: block.z, material: materials.hospitalRed, parent: group, cast: false, receive: false });
    addBox({ width: 6.2, height: 0.08, depth: 1.1, x: block.x, y: 6.14, z: block.z, material: materials.hospitalRed, parent: group, cast: false, receive: false });

    const helipad = new THREE.Mesh(
        new THREE.CylinderGeometry(3.0, 3.0, 0.08, 24),
        new THREE.MeshStandardMaterial({ color: 0x50565a, roughness: 0.74 })
    );
    helipad.position.set(block.x + 5.4, 8.48, block.z - 2.8);
    helipad.castShadow = false;
    helipad.receiveShadow = true;
    group.add(helipad);

    addBox({ width: 0.35, height: 0.1, depth: 3.6, x: block.x + 5.4, y: 8.56, z: block.z - 2.8, material: materials.roadMarking, parent: group, cast: false, receive: false });
    addBox({ width: 2.4, height: 0.1, depth: 0.35, x: block.x + 5.4, y: 8.57, z: block.z - 2.8, material: materials.roadMarking, parent: group, cast: false, receive: false });
    addBox({ width: 10.0, height: 0.04, depth: 4.2, x: block.x - 1.8, y: 0.32, z: block.z - 7.1, material: materials.asphalt, parent: group, cast: false, receive: true });

    cityStats.hospitals += 1;
}

function createIndustrialBlock(block) {
    const group = new THREE.Group();
    group.name = `industrial-${block.index}`;
    cityGroup.add(group);

    const buildings = 2 + Math.floor(noise(block.row, block.col, 90) * 2);
    for (let i = 0; i < buildings; i += 1) {
        const x = block.x - 5.5 + i * 7.5 + (noise(block.row + i, block.col, 91) - 0.5) * 1.7;
        const z = block.z + (noise(block.row, block.col + i, 92) - 0.5) * 8.0;
        const width = 7 + noise(block.row + i, block.col, 93) * 4.6;
        const depth = 6.5 + noise(block.row, block.col + i, 94) * 5.0;
        const height = 4.2 + noise(block.row + i, block.col + i, 95) * 4.2;

        addBuildingWithFacade({ width, height, depth, x, z, seed: block.index + i * 7, type: 'industrial', parent: group, roofMaterial: materials.industryRoof });
        addBox({ width: width + 0.34, height: 0.48, depth: depth + 0.34, x, y: height + 0.24, z, material: materials.industryRoof, parent: group, cast: false, receive: true });
    }

    if (noise(block.row, block.col, 96) > 0.48) {
        createChimney(group, block.x + 6.3, block.z - 6.0);
    }

    addBox({ width: 13, height: 0.06, depth: 4.7, x: block.x - 1.8, y: 0.32, z: block.z + 6.7, material: materials.asphalt, parent: group, cast: false, receive: true });
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
    addBox({ width: 16.8, height: 0.1, depth: 16.8, x: block.x, y: 0.24, z: block.z, material: materials.park, cast: false, receive: true });

    const treeCount = 10 + Math.floor(noise(block.row, block.col, 100) * 11);
    for (let i = 0; i < treeCount; i += 1) {
        const x = block.x - 7.0 + noise(block.row + i, block.col, 101) * 14.0;
        const z = block.z - 7.0 + noise(block.row, block.col + i, 102) * 14.0;
        collectTreeInstance(x, z, 0.82 + noise(block.row + i, block.col + i, 103) * 0.72);
    }

    if (noise(block.row, block.col, 104) > 0.32) {
        addBox({ width: 12, height: 0.04, depth: 1.1, x: block.x, y: 0.33, z: block.z, material: materials.sidewalk, cast: false, receive: true });
        addBox({ width: 1.1, height: 0.04, depth: 12, x: block.x, y: 0.34, z: block.z, material: materials.sidewalk, cast: false, receive: true });
    }

    cityStats.parks += 1;
}

function createServiceBlock(block) {
    const group = new THREE.Group();
    group.name = `services-${block.index}`;
    cityGroup.add(group);

    addBox({ width: 7.8, height: 5.2, depth: 6.2, x: block.x - 4.3, z: block.z - 3.0, material: materials.concrete, parent: group, cast: true, receive: true });
    addBox({ width: 7.2, height: 3.7, depth: 8.2, x: block.x + 4.4, z: block.z + 3.1, material: materials.industryWall, parent: group, cast: true, receive: true });
    addBox({ width: 12.8, height: 0.04, depth: 4.6, x: block.x, y: 0.32, z: block.z + 7.0, material: materials.asphalt, parent: group, cast: false, receive: true });

    for (let i = 0; i < 4; i += 1) {
        createUtilityFrame(group, block.x - 5.0 + i * 3.2, block.z + 5.8);
    }
}

function createUtilityFrame(parent, x, z) {
    const poleMaterial = new THREE.MeshStandardMaterial({ color: 0x4f5557, roughness: 0.7 });
    addBox({ width: 0.18, height: 3.2, depth: 0.18, x: x - 0.8, y: 1.6, z, material: poleMaterial, parent, cast: false });
    addBox({ width: 0.18, height: 3.2, depth: 0.18, x: x + 0.8, y: 1.6, z, material: poleMaterial, parent, cast: false });
    addBox({ width: 1.9, height: 0.18, depth: 0.18, x, y: 3.1, z, material: poleMaterial, parent, cast: false });
}

function createStreetTrees(blockX, blockZ, count) {
    for (let i = 0; i < count; i += 1) {
        const side = i % 2 === 0 ? -1 : 1;
        collectTreeInstance(blockX + side * 8.9, blockZ - 6.5 + i * 5.2, 0.66 + noise(blockX + i, blockZ, 120) * 0.18);
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
        dummy.position.set(item.x, 0.8 * item.scale, item.z);
        dummy.scale.set(item.scale, item.scale, item.scale);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        trunkMesh.setMatrixAt(index, dummy.matrix);

        dummy.position.set(item.x, 1.9 * item.scale, item.z);
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
    const carCount = 220;

    for (let i = 0; i < carCount; i += 1) {
        const road = ROAD_COORDS[Math.floor(noise(i, i + 1, 130) * ROAD_COORDS.length)];
        const along = -WORLD_SIZE / 2 + EDGE_MARGIN + noise(i, i + 2, 131) * (WORLD_SIZE - EDGE_MARGIN * 2);
        const horizontal = noise(i, i + 3, 132) > 0.5;
        const laneOffset = noise(i, i + 4, 133) > 0.5 ? -1.25 : 1.25;
        const width = horizontal ? 2.4 : 1.2;
        const depth = horizontal ? 1.2 : 2.4;
        const x = horizontal ? along : road + laneOffset;
        const z = horizontal ? road + laneOffset : along;

        carInstancesData.push({
            x, y: 0.42, z,
            width, height: 0.42, depth,
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

// ── Smart Grid Infrastructure & Otimizações de Rede ─────────

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
    const blockPolesMap = new Map();

    for (let row = 0; row < GRID_SIZE; row += 1) {
        for (let col = 0; col < GRID_SIZE; col += 1) {
            const type = getBlockType(row, col);
            const bx = BLOCK_CENTERS[col];
            const bz = BLOCK_CENTERS[row];

            const group = new THREE.Group();
            group.name = `powergrid-${row}-${col}`;
            group.userData = { isGridNode: true, row, col, type, active: true };
            cityGroup.add(group);
            powerGridObjects.push(group);

            if (type === 'commercial' || type === 'hospital' || type === 'mixed') {
                const lineGeo = new THREE.BufferGeometry().setFromPoints([
                    new THREE.Vector3(bx - 8.5, 0.22, bz - 8.5),
                    new THREE.Vector3(bx + 8.5, 0.22, bz - 8.5),
                    new THREE.Vector3(bx + 8.5, 0.22, bz + 8.5),
                    new THREE.Vector3(bx - 8.5, 0.22, bz + 8.5),
                    new THREE.Vector3(bx - 8.5, 0.22, bz - 8.5)
                ]);
                const line = new THREE.Line(lineGeo, powerMats.wireGlowing);
                line.userData = { originalMat: powerMats.wireGlowing, blackoutMat: powerMats.wireBlackout, overloadMat: powerMats.wireOverload };
                group.add(line);

                if (noise(row, col, 800) > 0.4) {
                    const crossGeo = new THREE.BufferGeometry().setFromPoints([
                        new THREE.Vector3(bx - 8.5, 0.22, bz),
                        new THREE.Vector3(bx + 8.5, 0.22, bz)
                    ]);
                    const cross = new THREE.Line(crossGeo, powerMats.wireGlowing);
                    cross.userData = { originalMat: powerMats.wireGlowing, blackoutMat: powerMats.wireBlackout, overloadMat: powerMats.wireOverload };
                    group.add(cross);
                }
            } else {
                const hasTrans = noise(row, col, 801) > 0.5;

                const p1Pos = collectPoleInstance(group, bx - 4.5, bz + 8.2, 0, { hasTransformer: false, hasStreetlight: true });
                const p2Pos = collectPoleInstance(group, bx + 4.5, bz + 8.2, 0, { hasTransformer: hasTrans, hasStreetlight: true });

                addCatenaryWires(group, p1Pos, p2Pos, powerMats.wireNormal, powerMats.wireBlackout, powerMats.wireOverload, 0.3);

                blockPolesMap.set(`${row}-${col}`, { p1Pos, p2Pos });

                const prev = blockPolesMap.get(`${row}-${col - 1}`);
                if (prev) {
                    addCatenaryWires(group, prev.p2Pos, p1Pos, powerMats.wireNormal, powerMats.wireBlackout, powerMats.wireOverload, 0.4);
                }
            }
        }
    }
}

// ── Interatividade Raycaster & Duplo Clique ──────────────────

const raycaster = new THREE.Raycaster();
raycaster.params.Line.threshold = 1.5;
const mouse = new THREE.Vector2();

function setupRaycaster() {
    renderer.domElement.addEventListener('pointerdown', (event) => {
        if (event.button !== 0) return;

        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);

        const interactables = [];
        powerGridObjects.forEach(g => {
            g.children.forEach(c => interactables.push(c));
        });

        const intersects = raycaster.intersectObjects(interactables, false);
        if (intersects.length > 0) {
            let target = intersects[0].object;
            while (target.parent && !target.parent.userData.isGridNode) {
                target = target.parent;
            }
            if (target.parent && target.parent.userData.isGridNode) {
                triggerBlackout(target.parent);
            }
        }
    });

    renderer.domElement.addEventListener('dblclick', (event) => {
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        const allHits = raycaster.intersectObjects(cityGroup.children, true);
        if (allHits.length > 0) {
            const hitPoint = allHits[0].point;
            focusOnPoint(hitPoint.x, hitPoint.y, hitPoint.z, true);
        }
    });
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
                if (mat.map && mat.map.isCanvasTexture && mat.emissive) {
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
                                    if (mat.map && mat.map.isCanvasTexture && mat.emissive) {
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
                if (mat.map && mat.map.isCanvasTexture && mat.emissive) {
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

    document.getElementById('btn-overload')?.addEventListener('click', simulateOverload);
    document.getElementById('btn-night')?.addEventListener('click', forceNight);
    document.getElementById('btn-failure')?.addEventListener('click', powerPlantFailure);
    document.getElementById('btn-reset')?.addEventListener('click', resetCity);
    document.getElementById('btn-reset-cam')?.addEventListener('click', resetCameraView);
}

function createLighting() {
    const hemi = new THREE.HemisphereLight(0xdcefff, 0x7c806d, 1.68);
    scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xfff3d7, 3.1);
    sun.position.set(-180, 250, 130);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 40;
    sun.shadow.camera.far = 650;
    sun.shadow.camera.left = -260;
    sun.shadow.camera.right = 260;
    sun.shadow.camera.top = 260;
    sun.shadow.camera.bottom = -260;
    sun.shadow.bias = -0.0003;
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

    buildInstancedTrees();
    buildInstancedBases();
    buildInstancedPoles();

    setupRaycaster();
    setupUI();
    window.smartCityStats = cityStats;
}

initializeScene();

// ── Loop de Renderização com Câmera e Neblina Adaptativas ───

function animate() {
    requestAnimationFrame(animate);

    if (isTransitioningCam && targetFocusPoint) {
        controls.target.lerp(targetFocusPoint, 0.08);
        if (targetCamPos) {
            camera.position.lerp(targetCamPos, 0.08);
        }
        if (controls.target.distanceTo(targetFocusPoint) < 0.1 && (!targetCamPos || camera.position.distanceTo(targetCamPos) < 0.3)) {
            isTransitioningCam = false;
        }
    }

    if (controls && scene.fog) {
        const distance = controls.getDistance();
        const t = Math.max(0, Math.min(1, (distance - controls.minDistance) / (controls.maxDistance - controls.minDistance)));

        controls.rotateSpeed = 0.18 + (t * 0.55);
        controls.panSpeed = 0.22 + (t * 0.72);
        controls.zoomSpeed = 0.38 + (t * 0.58);

        if (sceneLightState === 'day') {
            scene.fog.near = 70 + (t * 250);
            scene.fog.far = 260 + (t * 600);

            const r = 166 + t * (191 - 166);
            const g = 194 + t * (211 - 194);
            const b = 218 + t * (230 - 218);
            scene.background.setRGB(r / 255, g / 255, b / 255);
            scene.fog.color.setRGB(r / 255, g / 255, b / 255);
        }
    }

    controls.update();
    renderer.render(scene, camera);
}

function handleResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

window.addEventListener('resize', handleResize);
animate();

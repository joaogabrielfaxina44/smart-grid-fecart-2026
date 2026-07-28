import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const container = document.getElementById('canvas-container');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xbfd3e6);
scene.fog = new THREE.Fog(0xbfd3e6, 320, 860);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1600);
camera.position.set(260, 220, 330);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.65));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
container.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.screenSpacePanning = true;
controls.minDistance = 24;
controls.maxDistance = 760;
controls.maxPolarAngle = Math.PI / 2 - 0.03;
controls.rotateSpeed = 0.52;
controls.zoomSpeed = 0.88;
controls.panSpeed = 0.82;

const cityGroup = new THREE.Group();
cityGroup.name = 'Large Mixed Smart City';
scene.add(cityGroup);

const unitBoxGeometry = new THREE.BoxGeometry(1, 1, 1);
const trunkGeometry = new THREE.CylinderGeometry(0.2, 0.26, 1.6, 8);
const canopyGeometry = new THREE.SphereGeometry(1, 10, 8);

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

function seededRandom(seed) {
    let value = seed % 2147483647;
    return () => {
        value = (value * 16807) % 2147483647;
        return (value - 1) / 2147483646;
    };
}

const random = seededRandom(2026);

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
    addBox({ width, height: 0.08, depth, x, y: 0.04, z, material: materials.asphalt, cast: false });

    if (width > depth) {
        addBox({ width, height: 0.12, depth: SIDEWALK_WIDTH, x, y: 0.11, z: z - ROAD_WIDTH / 2 - SIDEWALK_WIDTH / 2, material: materials.sidewalk, cast: false });
        addBox({ width, height: 0.12, depth: SIDEWALK_WIDTH, x, y: 0.11, z: z + ROAD_WIDTH / 2 + SIDEWALK_WIDTH / 2, material: materials.sidewalk, cast: false });
    } else {
        addBox({ width: SIDEWALK_WIDTH, height: 0.12, depth, x: x - ROAD_WIDTH / 2 - SIDEWALK_WIDTH / 2, y: 0.11, z, material: materials.sidewalk, cast: false });
        addBox({ width: SIDEWALK_WIDTH, height: 0.12, depth, x: x + ROAD_WIDTH / 2 + SIDEWALK_WIDTH / 2, y: 0.11, z, material: materials.sidewalk, cast: false });
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
    const base = addBox({
        width: BLOCK_SIZE,
        height: 0.16,
        depth: BLOCK_SIZE,
        x: block.x,
        y: 0.14,
        z: block.z,
        material: materials.sidewalk,
        cast: false
    });
    base.userData = { zone: block.type, label: block.label };
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
    const wallMaterial = pick(residentialWalls, seed);
    const roofMaterial = noise(seed, seed + 4, 33) > 0.45 ? materials.roofTerracotta : materials.roofDark;

    addBox({ width, height, depth, x, z, material: wallMaterial, parent });
    addBox({ width: width + 0.38, height: 0.42, depth: depth + 0.38, x, y: height + 0.21, z, material: roofMaterial, parent });

    if (noise(seed, seed + 5, 34) > 0.62) {
        addBox({ width: width * 0.48, height: 0.04, depth: depth * 0.42, x: x + width * 0.09, y: height + 0.45, z, material: materials.solar, parent, cast: false });
    }

    if (noise(seed, seed + 6, 35) > 0.74) {
        addBox({ width: width * 0.55, height: 1.15 * scale, depth: 1.9 * scale, x: x - width * 0.26, y: 0.58 * scale, z: z + depth * 0.65, material: materials.roofConcrete, parent });
    }

    cityStats.houses += 1;
}

function createShopHouse(parent, x, z, seed, scale = 1) {
    const width = (4.4 + noise(seed, seed + 7, 40) * 2.8) * scale;
    const depth = (4.2 + noise(seed, seed + 8, 41) * 2.5) * scale;
    const height = (3.2 + noise(seed, seed + 9, 42) * 2.8) * scale;
    const material = noise(seed, seed + 10, 43) > 0.5 ? materials.concrete : pick(residentialWalls, seed + 2);

    addBox({ width, height, depth, x, z, material, parent });
    addBox({ width: width + 0.24, height: 0.34, depth: depth + 0.24, x, y: height + 0.17, z, material: materials.roofConcrete, parent });
    addBox({ width: width * 0.82, height: 0.26, depth: 0.28, x, y: 1.7 * scale, z: z - depth / 2 - 0.16, material: materials.awning, parent, cast: false });

    cityStats.midRises += 1;
}

function createLowRise(parent, x, z, seed, height) {
    const width = 5.2 + noise(seed, seed + 11, 50) * 2.8;
    const depth = 5.0 + noise(seed, seed + 12, 51) * 2.8;
    const material = pick(officeMaterials, seed + 1);

    addBox({ width, height, depth, x, z, material, parent });
    addFacadeBands(parent, x, z, width, depth, height, 0.85);
    addBox({ width: width * 0.72, height: 0.42, depth: depth * 0.7, x, y: height + 0.21, z, material: materials.roofConcrete, parent });

    cityStats.midRises += 1;
}

function createSmallApartment(parent, x, z, seed, height) {
    const width = 4.8 + noise(seed, seed + 13, 60) * 2.2;
    const depth = 4.8 + noise(seed, seed + 14, 61) * 2.5;
    const material = noise(seed, seed + 15, 62) > 0.62 ? materials.glassGreen : pick(officeMaterials, seed + 3);

    addBox({ width, height, depth, x, z, material, parent });
    addFacadeBands(parent, x, z, width, depth, height, 0.7);

    cityStats.midRises += 1;
}

function createOfficeTower(parent, x, z, seed, height) {
    const width = 4.8 + noise(seed, seed + 16, 70) * 3.8;
    const depth = 4.8 + noise(seed, seed + 17, 71) * 3.9;
    const materialRoll = noise(seed, seed + 18, 72);
    const material = materialRoll > 0.66 ? materials.glassBlue : materialRoll > 0.42 ? materials.glassGreen : pick(officeMaterials, seed + 4);

    addBox({ width, height, depth, x, z, material, parent });
    addFacadeBands(parent, x, z, width, depth, height, 1.0);

    if (noise(seed, seed + 19, 73) > 0.58) {
        addBox({ width: width * 0.7, height: 1.2, depth: depth * 0.68, x, y: height + 0.6, z, material: materials.concrete, parent });
    }

    cityStats.towers += 1;
}

function addFacadeBands(parent, x, z, width, depth, height, density = 1) {
    const bandCount = Math.min(9, Math.max(3, Math.floor((height / 5.6) * density)));
    for (let band = 1; band <= bandCount; band += 1) {
        const y = (height / (bandCount + 1)) * band;
        addBox({ width: width + 0.06, height: 0.13, depth: 0.07, x, y, z: z + depth / 2 + 0.04, material: materials.windowBand, parent, cast: false, receive: false });
        addBox({ width: width + 0.06, height: 0.13, depth: 0.07, x, y, z: z - depth / 2 - 0.04, material: materials.windowBand, parent, cast: false, receive: false });
    }
}

function createHospital(block) {
    const group = new THREE.Group();
    group.name = `hospital-${block.index}`;
    cityGroup.add(group);

    addBox({ width: 15.6, height: 6, depth: 12.6, x: block.x, z: block.z, material: materials.hospitalWhite, parent: group });
    addBox({ width: 7.2, height: 5, depth: 17.0, x: block.x - 4.2, y: 2.5, z: block.z, material: materials.hospitalWhite, parent: group });
    addBox({ width: 5.4, height: 8.4, depth: 6.6, x: block.x + 5.4, y: 4.2, z: block.z - 2.8, material: materials.concrete, parent: group });
    addBox({ width: 1.1, height: 0.08, depth: 6.2, x: block.x, y: 6.12, z: block.z, material: materials.hospitalRed, parent: group, cast: false });
    addBox({ width: 6.2, height: 0.08, depth: 1.1, x: block.x, y: 6.14, z: block.z, material: materials.hospitalRed, parent: group, cast: false });

    const helipad = new THREE.Mesh(
        new THREE.CylinderGeometry(3.0, 3.0, 0.08, 48),
        new THREE.MeshStandardMaterial({ color: 0x50565a, roughness: 0.74 })
    );
    helipad.position.set(block.x + 5.4, 8.48, block.z - 2.8);
    helipad.castShadow = true;
    helipad.receiveShadow = true;
    group.add(helipad);

    addBox({ width: 0.35, height: 0.1, depth: 3.6, x: block.x + 5.4, y: 8.56, z: block.z - 2.8, material: materials.roadMarking, parent: group, cast: false });
    addBox({ width: 2.4, height: 0.1, depth: 0.35, x: block.x + 5.4, y: 8.57, z: block.z - 2.8, material: materials.roadMarking, parent: group, cast: false });
    addBox({ width: 10.0, height: 0.04, depth: 4.2, x: block.x - 1.8, y: 0.32, z: block.z - 7.1, material: materials.asphalt, parent: group, cast: false });

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

        addBox({ width, height, depth, x, z, material: materials.industryWall, parent: group });
        addBox({ width: width + 0.34, height: 0.48, depth: depth + 0.34, x, y: height + 0.24, z, material: materials.industryRoof, parent: group });
    }

    if (noise(block.row, block.col, 96) > 0.48) {
        createChimney(group, block.x + 6.3, block.z - 6.0);
    }

    addBox({ width: 13, height: 0.06, depth: 4.7, x: block.x - 1.8, y: 0.32, z: block.z + 6.7, material: materials.asphalt, parent: group, cast: false });
    cityStats.industrial += 1;
}

function createChimney(parent, x, z) {
    const chimney = new THREE.Mesh(
        new THREE.CylinderGeometry(0.72, 0.96, 9, 18),
        new THREE.MeshStandardMaterial({ color: 0x7d776d, roughness: 0.82 })
    );
    chimney.position.set(x, 4.5, z);
    chimney.castShadow = true;
    chimney.receiveShadow = true;
    parent.add(chimney);
}

function createPark(block) {
    addBox({ width: 16.8, height: 0.1, depth: 16.8, x: block.x, y: 0.24, z: block.z, material: materials.park, cast: false });

    const treeCount = 10 + Math.floor(noise(block.row, block.col, 100) * 11);
    for (let i = 0; i < treeCount; i += 1) {
        const x = block.x - 7.0 + noise(block.row + i, block.col, 101) * 14.0;
        const z = block.z - 7.0 + noise(block.row, block.col + i, 102) * 14.0;
        createTree(x, z, 0.82 + noise(block.row + i, block.col + i, 103) * 0.72);
    }

    if (noise(block.row, block.col, 104) > 0.32) {
        addBox({ width: 12, height: 0.04, depth: 1.1, x: block.x, y: 0.33, z: block.z, material: materials.sidewalk, cast: false });
        addBox({ width: 1.1, height: 0.04, depth: 12, x: block.x, y: 0.34, z: block.z, material: materials.sidewalk, cast: false });
    }

    cityStats.parks += 1;
}

function createServiceBlock(block) {
    const group = new THREE.Group();
    group.name = `services-${block.index}`;
    cityGroup.add(group);

    addBox({ width: 7.8, height: 5.2, depth: 6.2, x: block.x - 4.3, z: block.z - 3.0, material: materials.concrete, parent: group });
    addBox({ width: 7.2, height: 3.7, depth: 8.2, x: block.x + 4.4, z: block.z + 3.1, material: materials.industryWall, parent: group });
    addBox({ width: 12.8, height: 0.04, depth: 4.6, x: block.x, y: 0.32, z: block.z + 7.0, material: materials.asphalt, parent: group, cast: false });

    for (let i = 0; i < 4; i += 1) {
        createUtilityFrame(group, block.x - 5.0 + i * 3.2, block.z + 5.8);
    }
}

function createUtilityFrame(parent, x, z) {
    const poleMaterial = new THREE.MeshStandardMaterial({ color: 0x4f5557, roughness: 0.7 });
    addBox({ width: 0.18, height: 3.2, depth: 0.18, x: x - 0.8, y: 1.6, z, material: poleMaterial, parent });
    addBox({ width: 0.18, height: 3.2, depth: 0.18, x: x + 0.8, y: 1.6, z, material: poleMaterial, parent });
    addBox({ width: 1.9, height: 0.18, depth: 0.18, x, y: 3.1, z, material: poleMaterial, parent });
}

function createStreetTrees(blockX, blockZ, count) {
    for (let i = 0; i < count; i += 1) {
        const side = i % 2 === 0 ? -1 : 1;
        createTree(blockX + side * 8.9, blockZ - 6.5 + i * 5.2, 0.66 + noise(blockX + i, blockZ, 120) * 0.18);
    }
}

function createTree(x, z, scale = 1) {
    const trunk = new THREE.Mesh(trunkGeometry, materials.trunk);
    trunk.position.set(x, 0.8 * scale, z);
    trunk.scale.set(scale, scale, scale);
    trunk.castShadow = true;
    cityGroup.add(trunk);

    const canopy = new THREE.Mesh(canopyGeometry, materials.canopy);
    canopy.position.set(x, 1.9 * scale, z);
    canopy.scale.set(scale, scale, scale);
    canopy.castShadow = true;
    cityGroup.add(canopy);

    cityStats.trees += 1;
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

        addBox({
            width,
            height: 0.42,
            depth,
            x,
            y: 0.42,
            z,
            material: pick(carMaterials, i),
            cast: false,
            receive: false
        });
        cityStats.cars += 1;
    }
}

function createLighting() {
    const hemi = new THREE.HemisphereLight(0xdcefff, 0x7c806d, 1.68);
    scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xfff3d7, 3.1);
    sun.position.set(-180, 250, 130);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 40;
    sun.shadow.camera.far = 620;
    sun.shadow.camera.left = -300;
    sun.shadow.camera.right = 300;
    sun.shadow.camera.top = 300;
    sun.shadow.camera.bottom = -300;
    scene.add(sun);
}

function initializeScene() {
    createGround();
    createRoadNetwork();
    createDistricts();
    createTrafficHints();
    createLighting();
    window.smartCityStats = cityStats;
}

initializeScene();

function animate() {
    requestAnimationFrame(animate);
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

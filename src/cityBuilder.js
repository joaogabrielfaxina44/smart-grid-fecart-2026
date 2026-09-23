import * as THREE from 'three';
import { materials, detailMats, powerMats, unitBoxGeometry, trunkGeometry, canopyGeometry, waterTankGeo } from './sharedAssets.js';
import { cityGroup, powerGridObjects, backendNodePositions, cityStats } from './sceneState.js';
import { createPowerPlant, createSolarFarm, createWindFarm } from './powerSources.js';
import { noise, seededRandom } from './utils.js';
import { addBox, addBuildingWithFacade } from './buildingRenderer.js';

const waterTankInstancesData = [];
const acUnitInstancesData = [];
const antennaInstancesData = [];
const balconyInstancesData = [];
const railingInstancesData = [];
const canopyLedgeInstancesData = [];
const canopyFrameInstancesData = [];
const fenceInstancesData = [];
const microSolarInstancesData = [];

function addRooftopDetails(parent, x, z, w, d, h, seed) {
    const n1 = noise(seed, 0, 560);
    const n2 = noise(seed, 1, 561);
    if (n1 > 0.4) {
        waterTankInstancesData.push({
            x: x + w * 0.2,
            y: h + 0.45,
            z: z - d * 0.15,
            scaleRadius: 0.35 + n1 * 0.25,
            scaleY: 0.9
        });
    }
    if (n2 > 0.35) {
        acUnitInstancesData.push({
            x: x - w * 0.15,
            y: h + 0.22,
            z: z + d * 0.1,
            w: 0.9 + n2 * 0.5,
            h: 0.45,
            d: 0.6 + n2 * 0.35
        });
    }
    if (noise(seed, 2, 562) > 0.6) {
        antennaInstancesData.push({
            x: x + w * 0.25,
            y: h + 0.7,
            z: z + d * 0.22,
            w: 0.06,
            h: 1.4,
            d: 0.06
        });
    }
    if (noise(seed, 3, 563) > 0.15) { 
        microSolarInstancesData.push({
            x: x,
            y: h + 0.1,
            z: z + d * 0.2,
            w: Math.min(w * 0.6, 3.5),
            h: 0.05,
            d: Math.min(d * 0.6, 2.5),
            rotX: 0.35 
        });
    }
}

function addBalconies(parent, x, z, w, d, h, seed, count) {
    const bw = 1.4 + noise(seed, 0, 570) * 0.7;
    const bd = 0.45 + noise(seed, 1, 571) * 0.25;
    const flH = h / Math.max(2, count + 1);
    for (let i = 1; i <= count; i++) {
        const by = flH * i;
        if (noise(seed + i, 0, 572) > 0.35) {
            balconyInstancesData.push({ x, y: by, z: z + d / 2 + bd / 2, w: bw, h: 0.07, d: bd });
            railingInstancesData.push({ x, y: by + 0.15, z: z + d / 2 + bd, w: bw, h: 0.3, d: 0.04 });
        }
    }
}

function addEntranceCanopy(parent, x, z, canopyW, bDepth) {
    canopyLedgeInstancesData.push({ x, y: 2.2, z: z - bDepth / 2 - 0.45, w: canopyW, h: 0.08, d: 0.9 });
    canopyFrameInstancesData.push({ x: x - canopyW / 2 + 0.08, y: 1.05, z: z - bDepth / 2 - 0.8, w: 0.08, h: 2.1, d: 0.08 });
    canopyFrameInstancesData.push({ x: x + canopyW / 2 - 0.08, y: 1.05, z: z - bDepth / 2 - 0.8, w: 0.08, h: 2.1, d: 0.08 });
}

function addPerimeterFence(group, bx, bz) {
    fenceInstancesData.push({ x: bx, y: 0.6, z: bz + BLOCK_SIZE / 2, w: BLOCK_SIZE, h: 1.2, d: 0.1 });
    fenceInstancesData.push({ x: bx, y: 0.6, z: bz - BLOCK_SIZE / 2, w: BLOCK_SIZE, h: 1.2, d: 0.1 });
    fenceInstancesData.push({ x: bx + BLOCK_SIZE / 2, y: 0.6, z: bz, w: 0.1, h: 1.2, d: BLOCK_SIZE });
    fenceInstancesData.push({ x: bx - BLOCK_SIZE / 2, y: 0.6, z: bz, w: 0.1, h: 1.2, d: BLOCK_SIZE });
}

export function buildInstancedRooftopsAndDetails() {
    const dummy = new THREE.Object3D();

    const createBatch = (geo, mat, dataList, scaleFn, cast = false, receive = false) => {
        if (dataList.length === 0) return;
        const imesh = new THREE.InstancedMesh(geo, mat, dataList.length);
        imesh.castShadow = cast;
        imesh.receiveShadow = receive;
        imesh.matrixAutoUpdate = false;

        dataList.forEach((item, index) => {
            dummy.position.set(item.x, item.y, item.z);
            dummy.rotation.set(0, 0, 0);
            scaleFn(dummy, item);
            dummy.updateMatrix();
            imesh.setMatrixAt(index, dummy.matrix);
        });

        imesh.instanceMatrix.needsUpdate = true;
        imesh.updateMatrix();
        cityGroup.add(imesh);
    };

    createBatch(waterTankGeo, detailMats.waterTank, waterTankInstancesData, (d, item) => {
        d.scale.set(item.scaleRadius, item.scaleY, item.scaleRadius);
    }, false, true);

    createBatch(unitBoxGeometry, detailMats.acUnit, acUnitInstancesData, (d, item) => {
        d.scale.set(item.w, item.h, item.d);
    }, false, true);

    createBatch(unitBoxGeometry, detailMats.antenna, antennaInstancesData, (d, item) => {
        d.scale.set(item.w, item.h, item.d);
    }, false, true);

    createBatch(unitBoxGeometry, materials.solar, microSolarInstancesData, (d, item) => {
        d.scale.set(item.w, item.h, item.d);
        d.rotation.x = item.rotX || 0;
    }, false, true);

    createBatch(unitBoxGeometry, detailMats.railing, railingInstancesData, (d, item) => {
        d.scale.set(item.w, item.h, item.d);
    }, false, false);

    createBatch(unitBoxGeometry, detailMats.ledge, canopyLedgeInstancesData, (d, item) => {
        d.scale.set(item.w, item.h, item.d);
    }, false, true);

    createBatch(unitBoxGeometry, detailMats.entranceFrame, canopyFrameInstancesData, (d, item) => {
        d.scale.set(item.w, item.h, item.d);
    }, false, false);

    createBatch(unitBoxGeometry, detailMats.railing, fenceInstancesData, (d, item) => {
        d.scale.set(item.w, item.h, item.d);
    }, false, true);
}

export const GRID_SIZE = 15;
export const GRID_RADIUS = Math.floor(GRID_SIZE / 2);
export const BLOCK_SIZE = 20;
export const ROAD_WIDTH = 10;
export const SIDEWALK_WIDTH = 2.4;
export const ROAD_STEP = BLOCK_SIZE + ROAD_WIDTH;
export const EDGE_MARGIN = 20;
export const WORLD_SIZE = GRID_SIZE * BLOCK_SIZE + (GRID_SIZE + 1) * ROAD_WIDTH + EDGE_MARGIN * 2;
export const ROAD_COORDS = Array.from({ length: GRID_SIZE + 1 }, (_, index) => (index - GRID_SIZE / 2) * ROAD_STEP);
export const BLOCK_CENTERS = Array.from({ length: GRID_SIZE }, (_, index) => (index - GRID_RADIUS) * ROAD_STEP);

const treeInstancesData = [];
const baseInstancesData = [];

export function createGround() {
    const terrain = new THREE.Mesh(new THREE.PlaneGeometry(WORLD_SIZE * 2.6, WORLD_SIZE * 2.6), materials.terrain);
    terrain.rotation.x = -Math.PI / 2;
    terrain.receiveShadow = true;
    terrain.matrixAutoUpdate = false;
    terrain.updateMatrix();
    cityGroup.add(terrain);
}

export function createRoadNetwork() {
    ROAD_COORDS.forEach((coord) => {
        addRoadSegment(WORLD_SIZE, ROAD_WIDTH, 0, coord);
        addRoadSegment(ROAD_WIDTH, WORLD_SIZE, coord, 0);

        const halfInter = ROAD_WIDTH / 2 + 1.0;
        const dashLen = 3.0;
        const dashGap = 3.0;

        for (let c = 0; c < ROAD_COORDS.length - 1; c++) {
            const segStart = ROAD_COORDS[c] + halfInter;
            const segEnd   = ROAD_COORDS[c + 1] - halfInter;
            let pos = segStart + dashLen / 2;
            while (pos + dashLen / 2 <= segEnd) {
                addRoadMarking(dashLen, 0.18, pos, coord);
                pos += dashLen + dashGap;
            }
        }
        for (let r = 0; r < ROAD_COORDS.length - 1; r++) {
            const segStart = ROAD_COORDS[r] + halfInter;
            const segEnd   = ROAD_COORDS[r + 1] - halfInter;
            let pos = segStart + dashLen / 2;
            while (pos + dashLen / 2 <= segEnd) {
                addRoadMarking(0.18, dashLen, coord, pos);
                pos += dashLen + dashGap;
            }
        }
    });

    const swHalf = SIDEWALK_WIDTH / 2;
    const rwHalf = ROAD_WIDTH / 2;
    const interHalf = ROAD_WIDTH / 2;
    ROAD_COORDS.forEach((rz) => {
        for (let c = 0; c < ROAD_COORDS.length - 1; c++) {
            const x1 = ROAD_COORDS[c]   + interHalf;
            const x2 = ROAD_COORDS[c+1] - interHalf;
            const segW = x2 - x1;
            if (segW <= 0) continue;
            const cx = (x1 + x2) / 2;
            addBox({ width: segW, height: 0.12, depth: SIDEWALK_WIDTH, x: cx, y: 0.11, z: rz - rwHalf - swHalf, material: materials.sidewalk, parent: cityGroup, cast: false, receive: true });
            addBox({ width: segW, height: 0.12, depth: SIDEWALK_WIDTH, x: cx, y: 0.11, z: rz + rwHalf + swHalf, material: materials.sidewalk, parent: cityGroup, cast: false, receive: true });
        }
    });
    ROAD_COORDS.forEach((rx) => {
        for (let r = 0; r < ROAD_COORDS.length - 1; r++) {
            const z1 = ROAD_COORDS[r]   + interHalf;
            const z2 = ROAD_COORDS[r+1] - interHalf;
            const segD = z2 - z1;
            if (segD <= 0) continue;
            const cz = (z1 + z2) / 2;
            addBox({ width: SIDEWALK_WIDTH, height: 0.12, depth: segD, x: rx - rwHalf - swHalf, y: 0.11, z: cz, material: materials.sidewalk, parent: cityGroup, cast: false, receive: true });
            addBox({ width: SIDEWALK_WIDTH, height: 0.12, depth: segD, x: rx + rwHalf + swHalf, y: 0.11, z: cz, material: materials.sidewalk, parent: cityGroup, cast: false, receive: true });
        }
    });

    ROAD_COORDS.forEach((rx) => {
        ROAD_COORDS.forEach((rz) => {
            addCrosswalk(rx, rz);
        });
    });
}

function addCrosswalk(cx, cz) {
    const stripeW = 0.55;
    const stripeD = 2.2;
    const gap = 0.55;
    const numStripes = 5;
    const totalW = numStripes * stripeW + (numStripes - 1) * gap;
    const startOffset = -totalW / 2;
    const edgeDist = ROAD_WIDTH / 2 + 0.1;

    for (let i = 0; i < numStripes; i++) {
        const p = startOffset + i * (stripeW + gap) + stripeW / 2;
        addRoadMarking(stripeW, stripeD, cx + p, cz - edgeDist - stripeD / 2);
        addRoadMarking(stripeW, stripeD, cx + p, cz + edgeDist + stripeD / 2);
        addRoadMarking(stripeD, stripeW, cx - edgeDist - stripeD / 2, cz + p);
        addRoadMarking(stripeD, stripeW, cx + edgeDist + stripeD / 2, cz + p);
    }
}

function addRoadSegment(width, depth, x, z) {
    addBox({ width, height: 0.08, depth, x, y: 0.04, z, material: materials.asphalt, parent: cityGroup, cast: false, receive: true });
}

function addRoadMarking(width, depth, x, z) {
    addBox({ width, height: 0.025, depth, x, y: 0.13, z, material: materials.roadMarking, parent: cityGroup, cast: false, receive: false });
}

function getBlockType(row, col) {
    if (row === GRID_SIZE - 1 && col === GRID_SIZE - 1) return 'power_plant';
    if (row === 0 && col === 0) return 'solar_farm';
    if (row === GRID_SIZE - 1 && col === 0) return 'wind_farm';
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
    if (industrialEdge) return n > 0.6 ? 'mixed' : 'industrial';

    if (distance <= 2.5) {
        return n > 0.15 ? 'commercial' : 'mixed';
    } else if (distance <= 5.0) {
        return n > 0.4 ? 'mixed' : (n > 0.8 ? 'commercial' : 'residential');
    } else {
        return n > 0.8 ? 'mixed' : 'residential';
    }
}

function getBlockBackendId(row, col, type) {
    if (type === 'power_plant') return 'Subestacao_Central';
    if (type === 'solar_farm') return 'Fazenda_Solar';
    if (type === 'wind_farm') return 'Fazenda_Eolica';
    if (type === 'hospital') {
        if (row === GRID_RADIUS - 3 && col === GRID_RADIUS - 1) return 'Hospital_Prontomed';
    }
    
    if (row === 3 && col === 3) return 'Subestacao_Norte';
    if (row === GRID_SIZE - 4 && col === GRID_SIZE - 4) return 'Subestacao_Sul';
    
    if (row === 2 && col === 5) return 'Bairro_Residencial_A';
    if (row === 12 && col === 3) return 'Bairro_Residencial_B';
    
    if (row === 6 && col === 6) return 'Centro_Comercial';
    if (row === 7 && col === 8) return 'Shopping_Metropolitano';
    if (row === 12 && col === 11) return 'Zona_Industrial_A';
    if (row === GRID_RADIUS + 1 && col === GRID_RADIUS + 1) return 'Data_Center';
    if (row === 5 && col === 11) return 'Escolas';
    
    return null;
}

export function createDistricts() {
    for (let row = 0; row < GRID_SIZE; row += 1) {
        for (let col = 0; col < GRID_SIZE; col += 1) {
            const blockType = getBlockType(row, col);
            const block = {
                row,
                col,
                index: row * GRID_SIZE + col,
                x: BLOCK_CENTERS[col],
                z: BLOCK_CENTERS[row],
                type: blockType,
                label: `Quadra ${row}-${col}`
            };

            if (block.type === 'power_plant') {
                block.x += 130;
                block.z += 130;
            } else if (block.type === 'solar_farm') {
                block.x -= 130;
                block.z -= 130;
            } else if (block.type === 'wind_farm') {
                block.x -= 130;
                block.z += 130;
            }

            if (!['power_plant', 'solar_farm', 'wind_farm'].includes(block.type)) {
                createBlockBase(block);
            }

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

            if (cityGroup.children.length > initialChildrenCount) {
                const addedElement = cityGroup.children[cityGroup.children.length - 1];
                if (addedElement.isGroup && backendId) {
                    addedElement.userData.backendId = backendId;
                    if (!addedElement.userData.isEnergySource) {
                        backendNodePositions[backendId] = new THREE.Vector3(block.x, 16.0, block.z);
                    }
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
    group.matrixAutoUpdate = false;
    cityGroup.add(group);

    const lots = [
        [-6.5, -6.5], [6.5, -6.5],
        [-6.5, 0.0],  [6.5, 0.0],
        [-6.5, 6.5],  [6.5, 6.5]
    ];
    const local = seededRandom(3000 + block.index * 41);

    lots.forEach(([lx, lz], lotIndex) => {
        if (lotIndex > 5 && local() < 0.35) return;

        if (lotIndex === 4 && local() > 0.65) {
            createLowRise(group, block.x + lx, block.z + lz, block.index + lotIndex, 6.0 + local() * 5.0, block.index);
        } else if (lotIndex === 2 && local() > 0.75) {
            createShopHouse(group, block.x + lx, block.z + lz, block.index + lotIndex, 1, block.index);
        } else {
            createDetachedHouse(group, block.x + lx, block.z + lz, block.index + lotIndex, 0.9 + local() * 0.3, block.index);
        }
    });

    createStreetTrees(block.x, block.z, 3);
    addDistributionWiresToBlock(group, block.x, block.z, lots);
}

function addDistributionWiresToBlock(group, blockX, blockZ, lotsList) {
    const hubY = 10.0;
    const centralPole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, hubY), new THREE.MeshStandardMaterial({color: 0x111111}));
    centralPole.position.set(blockX, hubY/2, blockZ);
    group.add(centralPole);

    const hubPos = new THREE.Vector3(blockX, hubY, blockZ);
    
    lotsList.forEach(lot => {
        const lotPos = new THREE.Vector3(blockX + lot[0], 4.5, blockZ + lot[1]);
        const midY = Math.min(hubPos.y, lotPos.y) - 1.5;
        const midPos = new THREE.Vector3().addVectors(hubPos, lotPos).multiplyScalar(0.5);
        midPos.y = midY;
        
        const curve = new THREE.QuadraticBezierCurve3(hubPos, midPos, lotPos);
        const geometry = new THREE.TubeGeometry(curve, 10, 0.15, 4, false);
        const wire = new THREE.Mesh(geometry, powerMats.wireGlowing);
        wire.name = 'distribution_wire';
        group.add(wire);
    });
}

function createMixedUrbanBlock(block) {
    const group = new THREE.Group();
    group.name = `mixed-${block.index}`;
    group.matrixAutoUpdate = false;
    cityGroup.add(group);

    const distance = Math.hypot(block.row - GRID_RADIUS, block.col - GRID_RADIUS);
    const lots = [
        [-6.5, -6.5], [6.5, -6.5],
        [-6.5, 0.0],  [6.5, 0.0],
        [-6.5, 6.5],  [6.5, 6.5]
    ];

    lots.forEach(([lx, lz], lotIndex) => {
        const n = noise(block.row + lotIndex, block.col, 8);
        const x = block.x + lx + (n - 0.5) * 0.7;
        const z = block.z + lz + (noise(block.row, block.col + lotIndex, 9) - 0.5) * 0.7;

        if (lotIndex === 4 && distance < 5.0 && n > 0.4) {
            createOfficeTower(group, x, z, block.index + lotIndex, 20 + n * 30, block.index);
        } else if (n > 0.65) {
            createSmallApartment(group, x, z, block.index + lotIndex, 9 + n * 14, block.index);
        } else if (n > 0.35) {
            createShopHouse(group, x, z, block.index + lotIndex, 1, block.index);
        } else {
            createDetachedHouse(group, x, z, block.index + lotIndex, 0.9 + n * 0.3, block.index);
        }
    });

    createStreetTrees(block.x, block.z, 2);
    addDistributionWiresToBlock(group, block.x, block.z, lots);
}

function createCommercialBlock(block) {
    const group = new THREE.Group();
    group.name = `commercial-${block.index}`;
    group.matrixAutoUpdate = false;
    cityGroup.add(group);

    const distance = Math.hypot(block.row - GRID_RADIUS, block.col - GRID_RADIUS);
    const nLayout = noise(block.row, block.col, 900);
    
    if (nLayout < 0.3) {
        const height = (distance < 2.0 ? 45 : 35) + noise(block.index, 1, 1) * 40;
        createOfficeTower(group, block.x, block.z, block.index, height, block.index);
        
        if (noise(block.index, 2, 2) > 0.5) createShopHouse(group, block.x - 6.5, block.z - 6.5, block.index+1, 1, block.index);
        if (noise(block.index, 3, 3) > 0.5) createShopHouse(group, block.x + 6.5, block.z + 6.5, block.index+2, 1, block.index);
        
        createStreetTrees(block.x, block.z, 3);
    } else if (nLayout < 0.6) {
        const height1 = (distance < 2.0 ? 30 : 25) + noise(block.index, 4, 4) * 35;
        const height2 = (distance < 2.0 ? 30 : 25) + noise(block.index, 5, 5) * 35;
        
        if (noise(block.index, 6, 6) > 0.5) {
            createOfficeTower(group, block.x - 4.5, block.z, block.index + 10, height1, block.index);
            createOfficeTower(group, block.x + 4.5, block.z, block.index + 11, height2, block.index);
        } else {
            createOfficeTower(group, block.x, block.z - 4.5, block.index + 12, height1, block.index);
            createOfficeTower(group, block.x, block.z + 4.5, block.index + 13, height2, block.index);
        }
    } else {
        const towerLots = [
            [-6.5, -6.5], [6.5, -6.5], [-6.5, 6.5], [6.5, 6.5], [0, 0]
        ];
        const towerCount = distance < 2.0 ? 5 : 4;

        for (let i = 0; i < towerCount; i += 1) {
            const [lx, lz] = towerLots[i];
            const n = noise(block.row + i, block.col, 21);
            const height = (distance < 2.0 ? 36 : 24) + n * (distance < 2.0 ? 54 : 38);
            createOfficeTower(group, block.x + lx, block.z + lz, block.index + i, height, block.index);
        }
    }
}

function createDetachedHouse(parent, x, z, seed, scale = 1, blockIndex = 0) {
    const n = noise(seed, seed + 1, 30);
    const width = (3.6 + n * 1.8) * scale;
    const depth = (3.4 + noise(seed, seed + 2, 31) * 1.9) * scale;
    const height = (2.2 + noise(seed, seed + 3, 32) * 2.2) * scale;
    const roofMaterial = noise(seed, seed + 4, 33) > 0.45 ? materials.roofTerracotta : materials.roofDark;

    addBuildingWithFacade({ width, height, depth, x, z, seed, type: 'residential', parent, roofMaterial, blockIndex });
    
    const rw = width + 0.4;
    const rd = depth/2 + 0.4;
    const ry = height + 0.6;
    const rRot = 0.5;
    const r1 = addBox({ width: rw, height: 0.1, depth: rd, x: x, y: ry, z: z + rd/2 - 0.2, material: roofMaterial, parent, cast: true, receive: true });
    r1.rotation.x = rRot; 
    r1.updateMatrix();
    const r2 = addBox({ width: rw, height: 0.1, depth: rd, x: x, y: ry, z: z - rd/2 + 0.2, material: roofMaterial, parent, cast: true, receive: true });
    r2.rotation.x = -rRot; 
    r2.updateMatrix();

    addBox({ width: 1.5, height: 0.1, depth: 1.0, x: x, y: height * 0.4, z: z + depth/2 + 0.5, material: materials.concrete, parent, cast: false, receive: true });
    
    if (noise(seed, seed + 5, 34) > 0.6) {
        addBox({ width: 0.4, height: height + 2.0, depth: 0.4, x: x - width * 0.2, y: height, z: z, material: materials.industryWall, parent, cast: false, receive: true });
    }
    
    addBox({ width: width + 2, height: 0.6, depth: 0.1, x: x, y: 0.3, z: z + depth/2 + 1.5, material: materials.concrete, parent, cast: false, receive: true });
    addBox({ width: width + 2, height: 0.6, depth: 0.1, x: x, y: 0.3, z: z - depth/2 - 1.5, material: materials.concrete, parent, cast: false, receive: true });
    addBox({ width: 0.1, height: 0.6, depth: depth + 3, x: x + width/2 + 1, y: 0.3, z: z, material: materials.concrete, parent, cast: false, receive: true });
    addBox({ width: 0.1, height: 0.6, depth: depth + 3, x: x - width/2 - 1, y: 0.3, z: z, material: materials.concrete, parent, cast: false, receive: true });

    cityStats.houses += 1;
}

function createShopHouse(parent, x, z, seed, scale = 1, blockIndex = 0) {
    const width = (4.6 + noise(seed, seed + 7, 40) * 2.8) * scale;
    const depth = (4.4 + noise(seed, seed + 8, 41) * 2.5) * scale;
    const height = (3.4 + noise(seed, seed + 9, 42) * 2.8) * scale;

    addBuildingWithFacade({ width, height, depth, x, z, seed, type: 'shop', parent, roofMaterial: materials.roofConcrete, blockIndex });
    addBox({ width: width + 0.24, height: 0.34, depth: depth + 0.24, x, y: height + 0.17, z, material: materials.roofConcrete, parent, cast: false, receive: true });

    cityStats.midRises += 1;
}

function createLowRise(parent, x, z, seed, height, blockIndex = 0) {
    const width = 5.6 + noise(seed, seed + 11, 50) * 2.8;
    const depth = 5.4 + noise(seed, seed + 12, 51) * 2.8;

    addBuildingWithFacade({ width, height, depth, x, z, seed, type: 'office', parent, blockIndex });
    addBox({ width: width * 0.72, height: 0.42, depth: depth * 0.7, x, y: height + 0.21, z, material: materials.roofConcrete, parent, cast: false, receive: true });
    addRooftopDetails(parent, x, z, width, depth, height, seed);

    cityStats.midRises += 1;
}

function createSmallApartment(parent, x, z, seed, height, blockIndex = 0) {
    const width = 5.2 + noise(seed, seed + 13, 60) * 2.2;
    const depth = 5.2 + noise(seed, seed + 14, 61) * 2.5;
    const isGlass = noise(seed, seed + 15, 62) > 0.62;
    const facadeType = isGlass ? 'glass' : 'office';

    addBuildingWithFacade({ width, height, depth, x, z, seed, type: facadeType, parent, blockIndex });

    const balconyCount = Math.max(1, Math.floor(height / 5));
    addBalconies(parent, x, z, width, depth, height, seed, balconyCount);
    addRooftopDetails(parent, x, z, width, depth, height, seed);

    cityStats.midRises += 1;
}

function createOfficeTower(parent, x, z, seed, height, blockIndex = 0) {
    const towerType = Math.floor(noise(seed, seed + 16, 70) * 4); 
    const materialRoll = noise(seed, seed + 18, 72);
    const facadeType = materialRoll > 0.4 ? 'glass' : 'office';

    if (towerType === 0) {
        const width = 5.2 + noise(seed, 1, 1) * 3.8;
        const depth = 5.2 + noise(seed, 2, 2) * 3.9;
        addBuildingWithFacade({ width, height, depth, x, z, seed, type: facadeType, parent, blockIndex });
        if (noise(seed, seed + 19, 73) > 0.58) {
            addBox({ width: width * 0.7, height: 1.2, depth: depth * 0.68, x, y: height + 0.6, z, material: materials.concrete, parent, cast: false, receive: true });
        }
        addRooftopDetails(parent, x, z, width, depth, height, seed);
        if (noise(seed, seed + 20, 74) > 0.4) {
            addEntranceCanopy(parent, x, z, Math.min(3.5, width * 0.6), depth);
        }
    } else if (towerType === 1) {
        const podW = 7.5 + noise(seed, 1, 1) * 2;
        const podD = 7.5 + noise(seed, 2, 2) * 2;
        const podH = 4 + noise(seed, 3, 3) * 3;
        addBuildingWithFacade({ width: podW, height: podH, depth: podD, x, z, seed, type: 'shop', parent, blockIndex });
        
        const towW = podW * 0.55;
        const towD = podD * 0.55;
        addBuildingWithFacade({ width: towW, height: height, depth: towD, x: x - podW/2 + towW/2 + 0.5, z: z - podD/2 + towD/2 + 0.5, seed: seed+1, type: facadeType, parent, blockIndex });
        addRooftopDetails(parent, x - podW/2 + towW/2 + 0.5, z - podD/2 + towD/2 + 0.5, towW, towD, height, seed);
        addEntranceCanopy(parent, x, z, Math.min(3.5, podW * 0.6), podD);
    } else if (towerType === 2) {
        const baseW = 6.5 + noise(seed, 1, 1) * 2.5;
        const baseD = 6.5 + noise(seed, 2, 2) * 2.5;
        const h1 = height * 0.4;
        const h2 = height * 0.75;
        addBuildingWithFacade({ width: baseW, height: h1, depth: baseD, x, z, seed, type: facadeType, parent, blockIndex });
        addBuildingWithFacade({ width: baseW * 0.75, height: h2, depth: baseD * 0.75, x, z, seed: seed+1, type: facadeType, parent, blockIndex });
        addBuildingWithFacade({ width: baseW * 0.5, height: height, depth: baseD * 0.5, x, z, seed: seed+2, type: facadeType, parent, blockIndex });
        addRooftopDetails(parent, x, z, baseW * 0.5, baseD * 0.5, height, seed);
        if (noise(seed, 3, 3) > 0.4) addEntranceCanopy(parent, x, z, Math.min(3.5, baseW * 0.6), baseD);
    } else {
        const w1 = 3.5 + noise(seed, 1, 1) * 1.5;
        const d1 = 7.0 + noise(seed, 2, 2) * 2;
        addBuildingWithFacade({ width: w1, height: height, depth: d1, x: x - 2.5, z, seed, type: facadeType, parent, blockIndex });
        addBuildingWithFacade({ width: w1, height: height * 0.85, depth: d1, x: x + 2.5, z, seed: seed+1, type: facadeType, parent, blockIndex });
        addBuildingWithFacade({ width: 5, height: height * 0.5, depth: d1 * 0.4, x, z, seed: seed+2, type: 'glass', parent, blockIndex }); 
        addRooftopDetails(parent, x - 2.5, z, w1, d1, height, seed);
        addRooftopDetails(parent, x + 2.5, z, w1, d1, height * 0.85, seed + 1);
        addEntranceCanopy(parent, x, z, 4, d1);
    }

    cityStats.towers += 1;
}

function createHospital(block) {
    const group = new THREE.Group();
    group.name = `hospital-${block.index}`;
    group.position.set(block.x, 0, block.z);
    group.matrixAutoUpdate = false;
    cityGroup.add(group);

    const geoMat = new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.8 }); 

    addBox({ width: 14, height: 6, depth: 8, x: 0, y: 3, z: 5, material: geoMat, parent: group, cast: true, receive: true });
    addBox({ width: 8, height: 28, depth: 8, x: 0, y: 14, z: -3, material: geoMat, parent: group, cast: true, receive: true });
    addBox({ width: 6, height: 0.4, depth: 4, x: 0, y: 3.5, z: 11, material: geoMat, parent: group, cast: true, receive: true });
    addBox({ width: 0.4, height: 3.5, depth: 0.4, x: -2.5, y: 1.75, z: 12.5, material: geoMat, parent: group, cast: true, receive: true });
    addBox({ width: 0.4, height: 3.5, depth: 0.4, x: 2.5, y: 1.75, z: 12.5, material: geoMat, parent: group, cast: true, receive: true });

    group.userData = { isGridNode: true, active: true };
    powerGridObjects.push(group);
}

function createIndustrialBlock(block) {
    const group = new THREE.Group();
    group.name = `industrial-${block.index}`;
    group.matrixAutoUpdate = false;
    cityGroup.add(group);

    const buildings = 2 + Math.floor(noise(block.row, block.col, 90) * 2);
    for (let i = 0; i < buildings; i += 1) {
        const x = block.x - 6.0 + i * 8.0 + (noise(block.row + i, block.col, 91) - 0.5) * 1.7;
        const z = block.z + (noise(block.row, block.col + i, 92) - 0.5) * 8.0;
        const width = 7.5 + noise(block.row + i, block.col, 93) * 4.6;
        const depth = 7.0 + noise(block.row, block.col + i, 94) * 5.0;
        const height = 4.4 + noise(block.row + i, block.col + i, 95) * 4.2;

        addBuildingWithFacade({ width, height, depth, x, z, seed: block.index + i * 7, type: 'industrial', parent: group, roofMaterial: materials.industryRoof, blockIndex: block.index });
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
    chimney.matrixAutoUpdate = false;
    chimney.updateMatrix();
    parent.add(chimney);
}

function createPark(block) {
    addBox({ width: 18.8, height: 0.1, depth: 18.8, x: block.x, y: 0.24, z: block.z, material: materials.park, parent: cityGroup, cast: false, receive: true });

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
    group.matrixAutoUpdate = false;
    cityGroup.add(group);

    addBox({ width: 8.5, height: 5.5, depth: 7.0, x: block.x - 4.5, z: block.z - 3.0, material: materials.concrete, parent: group, cast: true, receive: true });
    addBox({ width: 8.0, height: 4.0, depth: 9.0, x: block.x + 4.8, z: block.z + 3.2, material: materials.industryWall, parent: group, cast: true, receive: true });
}

function createSubstation(block) {
    const group = new THREE.Group();
    group.name = `substation-${block.index}`;
    group.matrixAutoUpdate = false;
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

export function buildInstancedTrees() {
    const count = treeInstancesData.length;
    if (count === 0) return;

    const trunkMesh = new THREE.InstancedMesh(trunkGeometry, materials.trunk, count);
    const canopyMesh = new THREE.InstancedMesh(canopyGeometry, materials.canopy, count);

    trunkMesh.castShadow = true;
    canopyMesh.castShadow = true;
    canopyMesh.receiveShadow = true;
    trunkMesh.matrixAutoUpdate = false;
    canopyMesh.matrixAutoUpdate = false;

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
    trunkMesh.updateMatrix();
    canopyMesh.updateMatrix();

    cityGroup.add(trunkMesh);
    cityGroup.add(canopyMesh);
}

export function buildInstancedBases() {
    const count = baseInstancesData.length;
    if (count === 0) return;

    const baseMesh = new THREE.InstancedMesh(unitBoxGeometry, materials.sidewalk, count);
    baseMesh.receiveShadow = true;
    baseMesh.castShadow = false;
    baseMesh.matrixAutoUpdate = false;

    const dummy = new THREE.Object3D();
    baseInstancesData.forEach((b, i) => {
        dummy.position.set(b.x, b.y, b.z);
        dummy.scale.set(b.width, b.height, b.depth);
        dummy.updateMatrix();
        baseMesh.setMatrixAt(i, dummy.matrix);
    });

    baseMesh.instanceMatrix.needsUpdate = true;
    baseMesh.updateMatrix();
    cityGroup.add(baseMesh);
}

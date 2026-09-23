import * as THREE from 'three';
import { powerMats } from './sharedAssets.js';
import { cityGroup, powerGridObjects, backendNodePositions } from './sceneState.js';
import { ROAD_WIDTH, ROAD_COORDS, BLOCK_CENTERS, BLOCK_SIZE } from './cityBuilder.js';
import { noise } from './utils.js';

export function createPowerGrid(poleManager) {
    const offset = ROAD_WIDTH / 2 + 0.6;

    for (let r = 0; r < ROAD_COORDS.length; r++) {
        const z = ROAD_COORDS[r];
        for (let side = -1; side <= 1; side += 2) {
            const group = new THREE.Group();
            group.name = `powergrid-h-${r}-${side}`;
            group.userData = { isGridNode: true, active: true };
            group.matrixAutoUpdate = false;
            cityGroup.add(group);
            powerGridObjects.push(group);

            const lampAngleRad = side === 1 ? Math.PI : 0;
            const vertices = [];
            let prevPolePositions = null;

            for (let c = 0; c < BLOCK_CENTERS.length; c++) {
                const x = BLOCK_CENTERS[c];
                const hasTrans = noise(r, c, 801) > 0.7;
                
                const currentPositions = spawnPole(poleManager, x, z + side * offset, 0, { hasTransformer: hasTrans, hasStreetlight: true, lampAngleRad });
                
                if (prevPolePositions) {
                    addWireSegmentVertices(vertices, prevPolePositions, currentPositions, 0.35);
                }
                prevPolePositions = currentPositions;
            }
            createMergedLineSegments(group, vertices);
        }
    }

    for (let c = 0; c < ROAD_COORDS.length; c++) {
        const x = ROAD_COORDS[c];
        for (let side = -1; side <= 1; side += 2) {
            const group = new THREE.Group();
            group.name = `powergrid-v-${c}-${side}`;
            group.userData = { isGridNode: true, active: true };
            group.matrixAutoUpdate = false;
            cityGroup.add(group);
            powerGridObjects.push(group);

            const lampAngleRad = side === 1 ? -Math.PI / 2 : Math.PI / 2;
            const vertices = [];
            let prevPolePositions = null;

            for (let r = 0; r < BLOCK_CENTERS.length; r++) {
                const z = BLOCK_CENTERS[r];
                const hasTrans = noise(r, c, 802) > 0.7;
                
                const currentPositions = spawnPole(poleManager, x + side * offset, z, Math.PI / 2, { hasTransformer: hasTrans, hasStreetlight: true, lampAngleRad });
                
                if (prevPolePositions) {
                    addWireSegmentVertices(vertices, prevPolePositions, currentPositions, 0.35);
                }
                prevPolePositions = currentPositions;
            }
            createMergedLineSegments(group, vertices);
        }
    }
}

function spawnPole(poleManager, x, z, angleRad, opts) {
    poleManager.addPole(x, z, angleRad, opts);
    const insulatorOffsets = [-0.75, 0, 0.75];
    const insulatorWorldPositions = [];
    insulatorOffsets.forEach(offX => {
        const pt = new THREE.Vector3(offX, 7.02, 0);
        pt.applyAxisAngle(new THREE.Vector3(0, 1, 0), angleRad);
        pt.add(new THREE.Vector3(x, 0, z));
        insulatorWorldPositions.push(pt);
    });
    return insulatorWorldPositions;
}

function addWireSegmentVertices(vertices, posArray1, posArray2, sagAmount = 0.35) {
    const count = Math.min(posArray1.length, posArray2.length);
    const segments = 8;

    for (let k = 0; k < count; k++) {
        const p1 = posArray1[k];
        const p2 = posArray2[k];

        let prevPoint = p1.clone();
        for (let i = 1; i <= segments; i++) {
            const t = i / segments;
            const x = THREE.MathUtils.lerp(p1.x, p2.x, t);
            const z = THREE.MathUtils.lerp(p1.z, p2.z, t);
            const yLinear = THREE.MathUtils.lerp(p1.y, p2.y, t);
            const sag = 4 * sagAmount * t * (1 - t);
            const currentPoint = new THREE.Vector3(x, yLinear - sag, z);

            vertices.push(prevPoint.x, prevPoint.y, prevPoint.z);
            vertices.push(currentPoint.x, currentPoint.y, currentPoint.z);

            prevPoint = currentPoint;
        }
    }
}

function createMergedLineSegments(group, vertices) {
    if (vertices.length === 0) return;
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));

    const lineSegments = new THREE.LineSegments(geometry, powerMats.wireNormal);
    lineSegments.userData = { 
        originalMat: powerMats.wireNormal, 
        blackoutMat: powerMats.wireBlackout, 
        overloadMat: powerMats.wireOverload 
    };
    lineSegments.matrixAutoUpdate = false;
    lineSegments.updateMatrix();
    group.add(lineSegments);
}

export function createTransmissionLines(grafo) {
    // Render the actual graph, including future generators, without phantom edges.
    const transmissionEdges = [...new Set(grafo.edges.values())].map(edge => ({ u: edge.origem, v: edge.destino }));

    const group = new THREE.Group();
    group.name = 'transmission_lines';
    group.userData = { isGridNode: true, active: true };
    group.matrixAutoUpdate = false;
    cityGroup.add(group);
    powerGridObjects.push(group);

    transmissionEdges.forEach(edge => {
        const p1 = backendNodePositions[edge.u];
        const p2 = backendNodePositions[edge.v];

        if (p1 && p2) {
            const roadOffset = BLOCK_SIZE / 2 + ROAD_WIDTH / 2;
            const h = 32.0; 
            
            const roadX1 = p1.x + Math.sign(p2.x - p1.x || 1) * roadOffset;
            const roadZ2 = p2.z + Math.sign(p1.z - p2.z || 1) * roadOffset;
            
            const points = [
                p1,
                new THREE.Vector3(p1.x, h, p1.z),
                new THREE.Vector3(roadX1, h, p1.z),
                new THREE.Vector3(roadX1, h, roadZ2),
                new THREE.Vector3(p2.x, h, roadZ2),
                new THREE.Vector3(p2.x, h, p2.z),
                p2
            ];

            // Centripetal interpolation avoids loops at short terminal approaches.
            const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal');
            const geometry = new THREE.TubeGeometry(curve, 64, 0.4, 6, false);
            const line = new THREE.Mesh(geometry, powerMats.wireGlowing);
            line.userData = { 
                originalMat: powerMats.wireGlowing, 
                blackoutMat: powerMats.wireBlackout, 
                overloadMat: powerMats.wireOverload,
                criticalMat: powerMats.wireCritical,
                backendEdgeId: `${edge.u}-${edge.v}`,
                u: edge.u,
                v: edge.v,
                currentSpeed: 5.0,
                broken: false
            };
            line.matrixAutoUpdate = false;
            line.updateMatrix();
            group.add(line);
        }
    });
}

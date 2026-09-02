const fs = require('fs');

let code = fs.readFileSync('src/main.js', 'utf8');

// 1. Materials
code = code.replace(
    /industryRoof: new THREE\.MeshStandardMaterial\({ color: 0x6e7778, roughness: 0\.78 }\),[\s\S]*?roadMarking: new THREE\.MeshBasicMaterial\({ color: 0xf2e7c9 }\),/,
    `industryRoof: new THREE.MeshStandardMaterial({ color: 0x6e7778, roughness: 0.78 }),
    solar: new THREE.MeshStandardMaterial({ color: 0x1a3a5a, roughness: 0.1, metalness: 0.85 }),
    redLight: new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 2.0 }),
    darkConcrete: new THREE.MeshStandardMaterial({ color: 0x3d3d3d, roughness: 0.9, metalness: 0.1 }),
    whiteTurbine: new THREE.MeshStandardMaterial({ color: 0xf5f5f5, roughness: 0.2, metalness: 0.1 }),
    roadMarking: new THREE.MeshBasicMaterial({ color: 0xf2e7c9 }),`
);

// 2. Arrays & Rooftops
code = code.replace(
    /const canopyFrameInstancesData = \[\];\r?\nconst fenceInstancesData = \[\];\r?\n\r?\nfunction addRooftopDetails\(parent, x, z, w, d, h, seed\) \{[\s\S]*?\}\r?\n/m,
    `const canopyFrameInstancesData = [];
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
    if (noise(seed, 3, 563) > 0.45) { // Microgeração distribuída sutil
        microSolarInstancesData.push({
            x: x,
            y: h + 0.1,
            z: z + d * 0.2,
            w: Math.min(w * 0.4, 2.5),
            h: 0.05,
            d: Math.min(d * 0.4, 1.5),
            rotX: 0.35 // Inclinado para o sol
        });
    }
}
`
);

// 3. buildInstancedRooftopsAndDetails
code = code.replace(
    /createBatch\(unitBoxGeometry, detailMats\.antenna, antennaInstancesData, \(d, item\) => \{[\s\S]*?\}, false, true\);/,
    `createBatch(unitBoxGeometry, detailMats.antenna, antennaInstancesData, (d, item) => {
        d.scale.set(item.w, item.h, item.d);
    }, false, true);

    createBatch(unitBoxGeometry, materials.solar, microSolarInstancesData, (d, item) => {
        d.scale.set(item.w, item.h, item.d);
        if (item.rotX) d.rotation.set(item.rotX, 0, 0);
    }, false, true);`
);

// 4. Power plants
code = code.replace(
    /function createPowerPlant\(block\) \{[\s\S]*?function createSubstation\(block\) \{/m,
    `function createPowerPlant(block) {
    const group = new THREE.Group();
    group.name = \`power_plant-\${block.index}\`;
    group.matrixAutoUpdate = false;
    cityGroup.add(group);
    
    // Prédio Principal em concreto escuro
    addBox({ width: 14, height: 8, depth: 10, x: block.x, y: 4, z: block.z - 2, material: materials.darkConcrete, parent: group, cast: true, receive: true });
    addBox({ width: 14.5, height: 0.5, depth: 10.5, x: block.x, y: 8.25, z: block.z - 2, material: materials.industryRoof, parent: group, cast: true, receive: true });

    // Chaminés detalhadas com luzes vermelhas de balizamento
    const stackGeo = new THREE.CylinderGeometry(0.8, 1.2, 20, 12);
    for (let i=0; i<3; i++) {
        const stack = new THREE.Mesh(stackGeo, materials.darkConcrete);
        stack.position.set(block.x - 4 + i*4, 10, block.z + 5);
        stack.castShadow = true;
        stack.matrixAutoUpdate = false;
        stack.updateMatrix();
        group.add(stack);
        
        // Luz vermelha no topo
        addBox({ width: 0.4, height: 0.4, depth: 0.4, x: block.x - 4 + i*4, y: 20.2, z: block.z + 5, material: materials.redLight, parent: group, cast: false, receive: false });
    }

    // Torres de Resfriamento usando LatheGeometry
    const points = [];
    for ( let i = 0; i <= 10; i ++ ) {
        const y = i * 2.0;
        const x = 3.5 - Math.sin( i * 0.15 ) * 1.5;
        points.push( new THREE.Vector2( x, y ) );
    }
    const coolingTowerGeo = new THREE.LatheGeometry(points, 16);
    const coolingTower = new THREE.Mesh(coolingTowerGeo, materials.darkConcrete);
    coolingTower.position.set(block.x + 6, 0, block.z + 5);
    coolingTower.castShadow = true;
    coolingTower.matrixAutoUpdate = false;
    coolingTower.updateMatrix();
    group.add(coolingTower);
    
    // Luz de balizamento na torre de resfriamento
    addBox({ width: 0.6, height: 0.6, depth: 0.6, x: block.x + 6, y: 20.2, z: block.z + 5, material: materials.redLight, parent: group, cast: false, receive: false });

    addPerimeterFence(group, block.x, block.z);
}

function createSolarFarm(block) {
    const group = new THREE.Group();
    group.name = \`solar_farm-\${block.index}\`;
    group.matrixAutoUpdate = false;
    cityGroup.add(group);

    const panelCount = 8 * 8;
    const imesh = new THREE.InstancedMesh(unitBoxGeometry, materials.solar, panelCount);
    imesh.castShadow = true;
    imesh.receiveShadow = true;
    imesh.matrixAutoUpdate = false;
    
    const dummy = new THREE.Object3D();
    let i = 0;
    // Fileiras precisas e alinhadas
    for (let r=0; r<8; r++) {
        for (let c=0; c<8; c++) {
            dummy.position.set(block.x - 7 + c*2.0, 0.8, block.z - 7 + r*2.0);
            dummy.scale.set(1.8, 0.1, 1.2);
            dummy.rotation.set(0.5, 0, 0); // Inclinado para o sol
            dummy.updateMatrix();
            imesh.setMatrixAt(i++, dummy.matrix);
        }
    }
    imesh.instanceMatrix.needsUpdate = true;
    imesh.updateMatrix();
    group.add(imesh);

    const supportMesh = new THREE.InstancedMesh(unitBoxGeometry, materials.concrete, panelCount);
    supportMesh.matrixAutoUpdate = false;
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
    supportMesh.instanceMatrix.needsUpdate = true;
    supportMesh.updateMatrix();
    group.add(supportMesh);

    addBox({ width: 3, height: 2, depth: 3, x: block.x, y: 1, z: block.z + 8, material: materials.concrete, parent: group, cast: true, receive: true });
    addPerimeterFence(group, block.x, block.z);
}

const windTurbines = [];

function createWindFarm(block) {
    const group = new THREE.Group();
    group.name = \`wind_farm-\${block.index}\`;
    group.matrixAutoUpdate = false;
    cityGroup.add(group);

    for (let i=0; i<4; i++) {
        const x = block.x - 5 + (i%2)*10;
        const z = block.z - 5 + Math.floor(i/2)*10;
        
        // Torres altas, brancas e elegantes
        const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.5, 35, 12), materials.whiteTurbine);
        tower.position.set(x, 17.5, z);
        tower.castShadow = true;
        tower.matrixAutoUpdate = false;
        tower.updateMatrix();
        group.add(tower);

        const nacelle = new THREE.Mesh(unitBoxGeometry, materials.whiteTurbine);
        nacelle.scale.set(1.2, 1.2, 3);
        nacelle.position.set(x, 35, z);
        nacelle.castShadow = true;
        nacelle.matrixAutoUpdate = false;
        nacelle.updateMatrix();
        group.add(nacelle);

        const rotor = new THREE.Group();
        rotor.position.set(x, 35, z + 1.6);
        
        // Pás finas e elegantes
        for (let b=0; b<3; b++) {
            const blade = new THREE.Mesh(unitBoxGeometry, materials.whiteTurbine);
            blade.scale.set(0.1, 14, 0.3); // Pás maiores e mais finas
            blade.position.set(0, 7, 0);
            blade.matrixAutoUpdate = false;
            blade.updateMatrix();
            
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

function createSubstation(block) {`
);

fs.writeFileSync('src/main.js', code);
console.log("Done upgrading!");

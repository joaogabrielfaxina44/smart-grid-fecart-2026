import * as THREE from 'three';

// --- Shared Resources for Entities ---
const poleMats = {
    wood: new THREE.MeshStandardMaterial({ color: 0x584b3e, roughness: 0.85 }),
    metal: new THREE.MeshStandardMaterial({ color: 0x3d4146, roughness: 0.5, metalness: 0.4 }),
    transformer: new THREE.MeshStandardMaterial({ color: 0x32373d, roughness: 0.4, metalness: 0.5 }),
    solar: new THREE.MeshStandardMaterial({ color: 0x1a3a5a, roughness: 0.1, metalness: 0.85 }),
    lampHousing: new THREE.MeshStandardMaterial({ color: 0x22262b, roughness: 0.5 }),
    lampBulbOff: new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.8 }),
    lampBulbOn: new THREE.MeshStandardMaterial({ color: 0xffeaad, roughness: 0.2, emissive: 0xffa024, emissiveIntensity: 1.0 })
};

const trafficMats = {
    carRed: new THREE.MeshStandardMaterial({ color: 0xa84a3f, roughness: 0.52 }),
    carWhite: new THREE.MeshStandardMaterial({ color: 0xdad7ce, roughness: 0.48 }),
    carBlue: new THREE.MeshStandardMaterial({ color: 0x405c74, roughness: 0.52 }),
    carGray: new THREE.MeshStandardMaterial({ color: 0x777b7a, roughness: 0.52 }),
    carYellow: new THREE.MeshStandardMaterial({ color: 0xebae34, roughness: 0.4 }),
    repairTruck: new THREE.MeshStandardMaterial({ color: 0xffaa00, roughness: 0.6 }),
    cargoBox: new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.7 }),
    windowGlass: new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.1, metalness: 0.9 }),
    headlight: new THREE.MeshBasicMaterial({ color: 0xfffae0 }),
    taillight: new THREE.MeshBasicMaterial({ color: 0xff2222 }),
    bumper: new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8 }),
    wheel: new THREE.MeshBasicMaterial({ color: 0x151515 }),
    personShirt1: new THREE.MeshStandardMaterial({ color: 0x3498db }),
    personShirt2: new THREE.MeshStandardMaterial({ color: 0xe74c3c }),
    personShirt3: new THREE.MeshStandardMaterial({ color: 0x2ecc71 }),
    personSkin: new THREE.MeshStandardMaterial({ color: 0xf1c27d }),
    personPants: new THREE.MeshStandardMaterial({ color: 0x2c3e50 })
};

const geometries = {
    box: new THREE.BoxGeometry(1, 1, 1),
    cylinder: new THREE.CylinderGeometry(1, 1, 1, 16),
    sphere: new THREE.SphereGeometry(1, 16, 16)
};

// ---------------------------------------------------------
// POLE MANAGER (Refactored to poleManager.js)
// ---------------------------------------------------------
export { PoleManager } from './poleManager.js';

// ---------------------------------------------------------
// TRAFFIC MANAGER
// ---------------------------------------------------------
export class TrafficManager {
    constructor(scene, roadCoords, blockSize, roadWidth) {
        this.scene = scene;
        this.roadCoords = roadCoords;
        this.blockSize = blockSize;
        this.roadWidth = roadWidth;
        this.vehicles = [];
        this.pedestrians = [];
        this.maxVehicles = 120;
        this.maxPedestrians = 100;
        
        this.vehicleMats = [trafficMats.carRed, trafficMats.carWhite, trafficMats.carBlue, trafficMats.carGray, trafficMats.carYellow];
        this.shirtMats = [trafficMats.personShirt1, trafficMats.personShirt2, trafficMats.personShirt3];
    }
    
    init() {
        for(let i=0; i<this.maxVehicles; i++) this.spawnVehicle();
        for(let i=0; i<this.maxPedestrians; i++) this.spawnPedestrian();
    }
    
    getRandomRoadPos(isSidewalk = false) {
        const isHorizontal = Math.random() > 0.5;
        const line = this.roadCoords[Math.floor(Math.random() * this.roadCoords.length)];
        const along = (Math.random() - 0.5) * 300;
        
        const offset = isSidewalk ? (this.roadWidth/2 + 1.2) : (this.roadWidth/4);
        const sideDir = Math.random() > 0.5 ? 1 : -1;
        
        let pos = new THREE.Vector3();
        let dir = new THREE.Vector3();
        
        if (isHorizontal) {
            pos.set(along, 0, line + offset * sideDir);
            dir.set(sideDir, 0, 0); 
        } else {
            pos.set(line + offset * sideDir, 0, along);
            dir.set(0, 0, -sideDir); 
        }
        return { pos, dir, isHorizontal, sideDir };
    }

    createVehicleMesh(type, mat) {
        const group = new THREE.Group();
        
        if (type === 'truck') {
            // Cabine frontal (+X)
            const cabin = new THREE.Mesh(geometries.box, mat);
            cabin.scale.set(1.4, 1.4, 1.9);
            cabin.position.set(1.3, 1.1, 0);
            cabin.castShadow = true;
            group.add(cabin);

            // Para-brisa
            const windshield = new THREE.Mesh(geometries.box, trafficMats.windowGlass);
            windshield.scale.set(0.1, 0.55, 1.7);
            windshield.position.set(2.01, 1.4, 0);
            group.add(windshield);

            // Baú de Carga traseiro (-X)
            const cargo = new THREE.Mesh(geometries.box, trafficMats.cargoBox);
            cargo.scale.set(2.7, 1.8, 2.0);
            cargo.position.set(-0.75, 1.3, 0);
            cargo.castShadow = true;
            group.add(cargo);

            // Faróis (+X)
            [-0.65, 0.65].forEach(z => {
                const hl = new THREE.Mesh(geometries.box, trafficMats.headlight);
                hl.scale.set(0.08, 0.22, 0.35);
                hl.position.set(2.01, 0.7, z);
                group.add(hl);
            });

            // Lanternas traseiras (-X)
            [-0.75, 0.75].forEach(z => {
                const tl = new THREE.Mesh(geometries.box, trafficMats.taillight);
                tl.scale.set(0.08, 0.22, 0.3);
                tl.position.set(-2.11, 0.6, z);
                group.add(tl);
            });

            // Rodas (6 rodas: 2 na frente, 4 atrás)
            const wheelPositions = [
                [1.3, 0.45, 1.02], [1.3, 0.45, -1.02],
                [-0.4, 0.45, 1.02], [-0.4, 0.45, -1.02],
                [-1.5, 0.45, 1.02], [-1.5, 0.45, -1.02]
            ];
            wheelPositions.forEach(p => {
                const w = new THREE.Mesh(geometries.cylinder, trafficMats.wheel);
                w.scale.set(0.44, 0.22, 0.44);
                w.rotation.x = Math.PI / 2;
                w.position.set(...p);
                group.add(w);
            });

        } else if (type === 'suv') {
            // Chassi SUV
            const body = new THREE.Mesh(geometries.box, mat);
            body.scale.set(3.8, 0.8, 1.75);
            body.position.set(0, 0.7, 0);
            body.castShadow = true;
            group.add(body);

            // Cabine SUV
            const cabin = new THREE.Mesh(geometries.box, mat);
            cabin.scale.set(2.3, 0.75, 1.55);
            cabin.position.set(-0.35, 1.45, 0);
            cabin.castShadow = true;
            group.add(cabin);

            // Vidros SUV
            const glass = new THREE.Mesh(geometries.box, trafficMats.windowGlass);
            glass.scale.set(2.32, 0.62, 1.57);
            glass.position.set(-0.35, 1.45, 0);
            group.add(glass);

            // Faróis (+X)
            [-0.58, 0.58].forEach(z => {
                const hl = new THREE.Mesh(geometries.box, trafficMats.headlight);
                hl.scale.set(0.08, 0.18, 0.32);
                hl.position.set(1.91, 0.75, z);
                group.add(hl);
            });

            // Lanternas traseiras (-X)
            [-0.58, 0.58].forEach(z => {
                const tl = new THREE.Mesh(geometries.box, trafficMats.taillight);
                tl.scale.set(0.08, 0.2, 0.3);
                tl.position.set(-1.91, 0.75, z);
                group.add(tl);
            });

            // 4 Rodas
            const wheelPositions = [
                [1.15, 0.4, 0.92], [1.15, 0.4, -0.92],
                [-1.15, 0.4, 0.92], [-1.15, 0.4, -0.92]
            ];
            wheelPositions.forEach(p => {
                const w = new THREE.Mesh(geometries.cylinder, trafficMats.wheel);
                w.scale.set(0.42, 0.18, 0.42);
                w.rotation.x = Math.PI / 2;
                w.position.set(...p);
                group.add(w);
            });

        } else {
            // Sedan
            // Chassi
            const body = new THREE.Mesh(geometries.box, mat);
            body.scale.set(3.4, 0.65, 1.6);
            body.position.set(0, 0.55, 0);
            body.castShadow = true;
            group.add(body);

            // Cabine (deslocada para trás para deixar o capô mais longo que o porta-malas)
            const cabin = new THREE.Mesh(geometries.box, mat);
            cabin.scale.set(1.7, 0.6, 1.35);
            cabin.position.set(-0.2, 1.15, 0);
            cabin.castShadow = true;
            group.add(cabin);

            // Vidros Sedan
            const glass = new THREE.Mesh(geometries.box, trafficMats.windowGlass);
            glass.scale.set(1.72, 0.5, 1.37);
            glass.position.set(-0.2, 1.15, 0);
            group.add(glass);

            // Faróis (+X)
            [-0.52, 0.52].forEach(z => {
                const hl = new THREE.Mesh(geometries.box, trafficMats.headlight);
                hl.scale.set(0.08, 0.16, 0.28);
                hl.position.set(1.71, 0.58, z);
                group.add(hl);
            });

            // Lanternas traseiras (-X)
            [-0.52, 0.52].forEach(z => {
                const tl = new THREE.Mesh(geometries.box, trafficMats.taillight);
                tl.scale.set(0.08, 0.16, 0.28);
                tl.position.set(-1.71, 0.58, z);
                group.add(tl);
            });

            // 4 Rodas
            const wheelPositions = [
                [1.05, 0.35, 0.84], [1.05, 0.35, -0.84],
                [-1.05, 0.35, 0.84], [-1.05, 0.35, -0.84]
            ];
            wheelPositions.forEach(p => {
                const w = new THREE.Mesh(geometries.cylinder, trafficMats.wheel);
                w.scale.set(0.36, 0.16, 0.36);
                w.rotation.x = Math.PI / 2;
                w.position.set(...p);
                group.add(w);
            });
        }
        
        return group;
    }

    spawnVehicle() {
        const types = ['sedan', 'sedan', 'suv', 'truck'];
        const type = types[Math.floor(Math.random()*types.length)];
        const mat = this.vehicleMats[Math.floor(Math.random()*this.vehicleMats.length)];
        
        const mesh = this.createVehicleMesh(type, mat);
        const { pos, dir } = this.getRandomRoadPos(false);
        
        mesh.position.copy(pos);
        
        // Frente do veículo está no eixo +X, então a rotação correta é atan2(-dir.z, dir.x)
        const angle = Math.atan2(-dir.z, dir.x);
        mesh.rotation.y = angle;
        
        this.scene.add(mesh);
        
        this.vehicles.push({
            mesh,
            dir,
            speed: 10 + Math.random() * 8
        });
    }

    createPedestrianMesh() {
        const group = new THREE.Group();
        const shirtMat = this.shirtMats[Math.floor(Math.random()*this.shirtMats.length)];
        
        const legs = new THREE.Mesh(geometries.box, trafficMats.personPants);
        legs.scale.set(0.4, 0.8, 0.3);
        legs.position.y = 0.4;
        group.add(legs);
        
        const body = new THREE.Mesh(geometries.box, shirtMat);
        body.scale.set(0.5, 0.8, 0.35);
        body.position.y = 1.2;
        group.add(body);
        
        const head = new THREE.Mesh(geometries.box, trafficMats.personSkin);
        head.scale.set(0.3, 0.3, 0.3);
        head.position.y = 1.75;
        group.add(head);
        
        group.castShadow = true;
        return group;
    }

    spawnPedestrian() {
        const mesh = this.createPedestrianMesh();
        const { pos, dir } = this.getRandomRoadPos(true);
        
        mesh.position.copy(pos);
        
        const angle = Math.atan2(dir.x, dir.z);
        mesh.rotation.y = angle;
        
        this.scene.add(mesh);
        
        this.pedestrians.push({
            mesh,
            dir,
            speed: 1.5 + Math.random() * 1.5,
            animTime: Math.random() * 10
        });
    }

    update(delta) {
        const bounds = 450;
        
        this.vehicles.forEach(v => {
            v.mesh.position.addScaledVector(v.dir, v.speed * delta);
            
            if (v.dir.x > 0 && v.mesh.position.x > bounds) v.mesh.position.x = -bounds;
            else if (v.dir.x < 0 && v.mesh.position.x < -bounds) v.mesh.position.x = bounds;
            else if (v.dir.z > 0 && v.mesh.position.z > bounds) v.mesh.position.z = -bounds;
            else if (v.dir.z < 0 && v.mesh.position.z < -bounds) v.mesh.position.z = bounds;
        });

        this.pedestrians.forEach(p => {
            p.mesh.position.addScaledVector(p.dir, p.speed * delta);
            p.animTime += delta * 15;
            
            // Animating legs
            p.mesh.children[0].rotation.x = Math.sin(p.animTime) * 0.5;
            
            if (p.dir.x > 0 && p.mesh.position.x > bounds) p.mesh.position.x = -bounds;
            else if (p.dir.x < 0 && p.mesh.position.x < -bounds) p.mesh.position.x = bounds;
            else if (p.dir.z > 0 && p.mesh.position.z > bounds) p.mesh.position.z = -bounds;
            else if (p.dir.z < 0 && p.mesh.position.z < -bounds) p.mesh.position.z = bounds;
        });
    }
}

// ---------------------------------------------------------
// REPAIR MANAGER
// ---------------------------------------------------------
export class RepairManager {
    constructor(scene, poleManager) {
        this.scene = scene;
        this.poleManager = poleManager;
        this.repairTrucks = [];
        this.depotPos = new THREE.Vector3(150, 0, 150);
    }

    createRepairTruckMesh() {
        const group = new THREE.Group();
        const mat = trafficMats.repairTruck;
        
        // Chassi
        const body = new THREE.Mesh(geometries.box, mat);
        body.scale.set(3.2, 1.1, 1.7);
        body.position.set(0, 0.75, 0);
        body.castShadow = true;
        group.add(body);
        
        // Cabine (+X)
        const cabin = new THREE.Mesh(geometries.box, mat);
        cabin.scale.set(1.3, 1.2, 1.6);
        cabin.position.set(1.0, 1.8, 0);
        cabin.castShadow = true;
        group.add(cabin);

        // Vidro Cabine
        const glass = new THREE.Mesh(geometries.box, trafficMats.windowGlass);
        glass.scale.set(0.1, 0.6, 1.4);
        glass.position.set(1.66, 1.8, 0);
        group.add(glass);
        
        // Giroflex no teto
        const siren = new THREE.Mesh(geometries.box, new THREE.MeshBasicMaterial({color: 0xff0000}));
        siren.scale.set(0.3, 0.25, 0.8);
        siren.position.set(1.0, 2.5, 0);
        group.add(siren);
        group.userData.siren = siren;

        // Faróis (+X)
        [-0.55, 0.55].forEach(z => {
            const hl = new THREE.Mesh(geometries.box, trafficMats.headlight);
            hl.scale.set(0.08, 0.2, 0.3);
            hl.position.set(1.61, 0.8, z);
            group.add(hl);
        });

        // Lanternas (-X)
        [-0.55, 0.55].forEach(z => {
            const tl = new THREE.Mesh(geometries.box, trafficMats.taillight);
            tl.scale.set(0.08, 0.2, 0.3);
            tl.position.set(-1.61, 0.8, z);
            group.add(tl);
        });
        
        // Rodas
        const positions = [[1.0, 0.45, 0.92], [1.0, 0.45, -0.92], [-1.0, 0.45, 0.92], [-1.0, 0.45, -0.92]];
        positions.forEach(p => {
            const w = new THREE.Mesh(geometries.cylinder, trafficMats.wheel);
            w.scale.set(0.44, 0.2, 0.44);
            w.rotation.x = Math.PI / 2;
            w.position.set(...p);
            group.add(w);
        });
        
        return group;
    }

    createWorkerMesh() {
        const group = new THREE.Group();
        const shirt = new THREE.Mesh(geometries.box, trafficMats.repairTruck);
        shirt.scale.set(0.5, 0.8, 0.35);
        shirt.position.y = 1.2;
        group.add(shirt);
        const head = new THREE.Mesh(geometries.box, trafficMats.personSkin);
        head.scale.set(0.3, 0.3, 0.3);
        head.position.y = 1.75;
        group.add(head);
        
        const hardhat = new THREE.Mesh(geometries.box, new THREE.MeshStandardMaterial({color: 0xffff00}));
        hardhat.scale.set(0.35, 0.1, 0.35);
        hardhat.position.y = 1.95;
        group.add(hardhat);
        
        return group;
    }

    dispatchRepair(poleGroup) {
        if (poleGroup.userData.status === 'manutencao') return;
        poleGroup.userData.status = 'manutencao';
        
        const truckMesh = this.createRepairTruckMesh();
        truckMesh.position.copy(this.depotPos);
        this.scene.add(truckMesh);
        
        const workerMesh = this.createWorkerMesh();
        workerMesh.visible = false;
        this.scene.add(workerMesh);
        
        const targetPos = poleGroup.position.clone();
        targetPos.x += 3;
        
        this.repairTrucks.push({
            mesh: truckMesh,
            worker: workerMesh,
            targetPole: poleGroup,
            state: 'driving_to',
            targetPos: targetPos,
            timer: 0
        });
    }

    update(delta, timeElapsed) {
        // IA Self-Healing Automática: Enviar caminhões para postes quebrados
        for (let i = 0; i < this.poleManager.poles.length; i++) {
            const p = this.poleManager.poles[i];
            if (p.userData.status === 'quebrado') {
                this.dispatchRepair(p);
            }
        }

        for (let i = this.repairTrucks.length - 1; i >= 0; i--) {
            const t = this.repairTrucks[i];
            
            t.mesh.userData.siren.material.color.setHex((Math.floor(timeElapsed * 10) % 2 === 0) ? 0xff0000 : 0x0000ff);
            
            if (t.state === 'driving_to' || t.state === 'returning') {
                const target = t.state === 'driving_to' ? t.targetPos : this.depotPos;
                
                const dx = target.x - t.mesh.position.x;
                const dz = target.z - t.mesh.position.z;
                
                let dir = new THREE.Vector3();
                if (Math.abs(dx) > 1.0) {
                    dir.set(Math.sign(dx), 0, 0);
                } else if (Math.abs(dz) > 1.0) {
                    dir.set(0, 0, Math.sign(dz));
                    t.mesh.position.x = target.x; // Trava o X para fazer curva perfeita de 90 graus
                } else {
                    if (t.state === 'driving_to') {
                        t.state = 'repairing';
                        t.timer = 5; 
                        t.worker.position.copy(t.mesh.position);
                        t.worker.position.z -= 2; 
                        t.worker.visible = true;
                    } else {
                        this.scene.remove(t.mesh);
                        this.scene.remove(t.worker);
                        this.repairTrucks.splice(i, 1);
                    }
                    continue;
                }
                
                t.mesh.position.addScaledVector(dir, 20 * delta);
                
                // Rotação instantânea para a direção do movimento
                t.mesh.rotation.y = Math.atan2(-dir.z, dir.x);
                
            } else if (t.state === 'repairing') {
                t.timer -= delta;
                if (t.timer <= 0) {
                    t.targetPole.userData.durability = 100;
                    t.targetPole.userData.status = 'operando';
                    if (t.targetPole.userData.lampBulb) {
                        t.targetPole.userData.lampBulb.material = poleMats.lampBulbOn;
                    }
                    t.state = 'returning';
                    t.worker.visible = false;
                }
            }
        }
    }
}

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
// POLE MANAGER
// ---------------------------------------------------------
export class PoleManager {
    constructor(scene) {
        this.scene = scene;
        this.poles = [];
        this.raycaster = new THREE.Raycaster();
        
        // Setup UI callback
        this.onPoleClick = null;
        
        // Triangle material (blinking red)
        this.alertMat = new THREE.MeshBasicMaterial({ color: 0xff0000, side: THREE.DoubleSide, transparent: true, opacity: 1 });
        const shape = new THREE.Shape();
        shape.moveTo(0, 0.5);
        shape.lineTo(0.4, -0.5);
        shape.lineTo(-0.4, -0.5);
        shape.lineTo(0, 0.5);
        this.alertGeo = new THREE.ShapeGeometry(shape);
    }

    addPole(x, z, angleRad, options = {}) {
        const poleGroup = new THREE.Group();
        poleGroup.position.set(x, 0, z);
        poleGroup.rotation.y = angleRad;
        
        // Base Shaft
        const shaft = new THREE.Mesh(geometries.cylinder, poleMats.wood);
        shaft.scale.set(0.12, 7.2, 0.12);
        shaft.position.y = 3.6;
        shaft.castShadow = true;
        poleGroup.add(shaft);
        
        // Cross Arm
        const crossArm = new THREE.Mesh(geometries.box, poleMats.wood);
        crossArm.scale.set(1.8, 0.12, 0.12);
        crossArm.position.y = 6.8;
        crossArm.castShadow = true;
        poleGroup.add(crossArm);

        // Transformer Box
        if (options.hasTransformer) {
            const trans = new THREE.Mesh(geometries.box, poleMats.transformer);
            trans.scale.set(0.5, 0.8, 0.5);
            trans.position.set(0, 5.0, 0.2);
            trans.castShadow = true;
            poleGroup.add(trans);
        }

        // Solar Panel (New Feature)
        const solar = new THREE.Mesh(geometries.box, poleMats.solar);
        solar.scale.set(0.8, 0.05, 1.2);
        solar.position.set(0, 7.5, 0);
        solar.rotation.x = -Math.PI / 6; // Angled towards the sun
        poleGroup.add(solar);

        // Streetlight
        if (options.hasStreetlight) {
            const lampArm = new THREE.Mesh(geometries.box, poleMats.metal);
            lampArm.scale.set(0.1, 0.1, 1.5);
            lampArm.position.set(0, 6.0, -0.75);
            
            const lampHousing = new THREE.Mesh(geometries.box, poleMats.lampHousing);
            lampHousing.scale.set(0.4, 0.15, 0.6);
            lampHousing.position.set(0, 6.0, -1.6);
            
            const lampBulb = new THREE.Mesh(geometries.box, poleMats.lampBulbOn);
            lampBulb.scale.set(0.3, 0.05, 0.4);
            lampBulb.position.set(0, 5.95, -1.6);
            
            poleGroup.add(lampArm);
            poleGroup.add(lampHousing);
            poleGroup.add(lampBulb);
            
            poleGroup.userData.lampBulb = lampBulb;
        }

        // Alert Triangle (Hidden by default)
        const alertMesh = new THREE.Mesh(this.alertGeo, this.alertMat);
        alertMesh.position.set(0, 8.5, 0);
        alertMesh.visible = false;
        poleGroup.add(alertMesh);

        // Hitbox for raycasting
        const hitbox = new THREE.Mesh(new THREE.BoxGeometry(1.5, 8, 1.5), new THREE.MeshBasicMaterial({visible: false}));
        hitbox.position.y = 4;
        hitbox.userData.isPoleHitbox = true;
        hitbox.userData.poleRef = poleGroup;
        poleGroup.add(hitbox);

        // Pole state
        poleGroup.userData.id = this.poles.length;
        poleGroup.userData.durability = 100;
        poleGroup.userData.status = 'operando'; // operando, quebrado, inativo, manutencao
        poleGroup.userData.alertMesh = alertMesh;
        
        this.scene.add(poleGroup);
        this.poles.push(poleGroup);
        
        return poleGroup;
    }

    update(delta, timeElapsed) {
        // Blink alert triangles
        const blinkOp = 0.5 + Math.sin(timeElapsed * 5) * 0.5;
        this.alertMat.opacity = blinkOp;

        // Decrease durability slowly over time (random chance per frame to spread it out)
        for (let i = 0; i < this.poles.length; i++) {
            const p = this.poles[i];
            if (p.userData.status !== 'manutencao' && Math.random() < 0.01 * delta) {
                p.userData.durability = Math.max(0, p.userData.durability - 5);
            }
            
            if (p.userData.durability <= 0 && p.userData.status !== 'quebrado') {
                p.userData.status = 'quebrado';
                if (p.userData.lampBulb) p.userData.lampBulb.material = poleMats.lampBulbOff;
            }

            // Show alert if durability < 20
            if (p.userData.durability < 20) {
                p.userData.alertMesh.visible = true;
                p.userData.alertMesh.rotation.y += delta * 2; // spin the triangle
            } else {
                p.userData.alertMesh.visible = false;
            }
        }
    }

    checkClick(mouse, camera) {
        this.raycaster.setFromCamera(mouse, camera);
        const intersects = this.raycaster.intersectObjects(this.scene.children, true);
        for (let i = 0; i < intersects.length; i++) {
            if (intersects[i].object.userData.isPoleHitbox) {
                if (this.onPoleClick) {
                    this.onPoleClick(intersects[i].object.userData.poleRef);
                }
                return true;
            }
        }
        return false;
    }
    
    getPoleById(id) {
        return this.poles.find(p => p.userData.id === id);
    }
}

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
        this.maxVehicles = 40;
        this.maxPedestrians = 30;
        
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
        let body;
        
        if (type === 'truck') {
            body = new THREE.Mesh(geometries.box, mat);
            body.scale.set(4, 1.5, 2);
            body.position.y = 1;
            const cabin = new THREE.Mesh(geometries.box, mat);
            cabin.scale.set(1.5, 1.2, 2);
            cabin.position.set(2, 2.3, 0);
            group.add(cabin);
        } else if (type === 'suv') {
            body = new THREE.Mesh(geometries.box, mat);
            body.scale.set(3.8, 1.2, 1.8);
            body.position.y = 0.8;
            const top = new THREE.Mesh(geometries.box, mat);
            top.scale.set(2.4, 0.8, 1.6);
            top.position.set(-0.2, 1.8, 0);
            group.add(top);
        } else { 
            body = new THREE.Mesh(geometries.box, mat);
            body.scale.set(3.4, 0.8, 1.6);
            body.position.y = 0.6;
            const top = new THREE.Mesh(geometries.box, mat);
            top.scale.set(1.6, 0.6, 1.4);
            top.position.set(-0.2, 1.3, 0);
            group.add(top);
        }
        
        body.castShadow = true;
        group.add(body);
        
        const wheelMat = new THREE.MeshBasicMaterial({color: 0x111111});
        const wx = type === 'truck' ? 1.5 : 1.0;
        const wz = type === 'truck' ? 1.1 : 0.9;
        const wy = 0.4;
        
        const positions = [
            [wx, wy, wz], [wx, wy, -wz], [-wx, wy, wz], [-wx, wy, -wz]
        ];
        positions.forEach(p => {
            const w = new THREE.Mesh(geometries.cylinder, wheelMat);
            w.scale.set(0.4, 0.2, 0.4);
            w.rotation.x = Math.PI/2;
            w.position.set(...p);
            group.add(w);
        });
        
        return group;
    }

    spawnVehicle() {
        const types = ['sedan', 'sedan', 'suv', 'truck'];
        const type = types[Math.floor(Math.random()*types.length)];
        const mat = this.vehicleMats[Math.floor(Math.random()*this.vehicleMats.length)];
        
        const mesh = this.createVehicleMesh(type, mat);
        const { pos, dir } = this.getRandomRoadPos(false);
        
        mesh.position.copy(pos);
        
        const angle = Math.atan2(dir.x, dir.z);
        mesh.rotation.y = angle;
        
        this.scene.add(mesh);
        
        this.vehicles.push({
            mesh,
            dir,
            speed: 8 + Math.random() * 6
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
        const bounds = 200;
        
        this.vehicles.forEach(v => {
            v.mesh.position.addScaledVector(v.dir, v.speed * delta);
            
            if (v.mesh.position.x > bounds) v.mesh.position.x = -bounds;
            if (v.mesh.position.x < -bounds) v.mesh.position.x = bounds;
            if (v.mesh.position.z > bounds) v.mesh.position.z = -bounds;
            if (v.mesh.position.z < -bounds) v.mesh.position.z = bounds;
        });
        
        this.pedestrians.forEach(p => {
            p.mesh.position.addScaledVector(p.dir, p.speed * delta);
            p.animTime += delta * p.speed * 4;
            
            p.mesh.position.y = Math.abs(Math.sin(p.animTime)) * 0.1;
            
            if (p.mesh.position.x > bounds) p.mesh.position.x = -bounds;
            if (p.mesh.position.x < -bounds) p.mesh.position.x = bounds;
            if (p.mesh.position.z > bounds) p.mesh.position.z = -bounds;
            if (p.mesh.position.z < -bounds) p.mesh.position.z = bounds;
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
        
        const body = new THREE.Mesh(geometries.box, mat);
        body.scale.set(2.8, 1.2, 1.6);
        body.position.y = 0.8;
        group.add(body);
        
        const cabin = new THREE.Mesh(geometries.box, mat);
        cabin.scale.set(1.2, 1.0, 1.6);
        cabin.position.set(1.4, 1.8, 0);
        group.add(cabin);
        
        const siren = new THREE.Mesh(geometries.box, new THREE.MeshBasicMaterial({color: 0xff0000}));
        siren.scale.set(0.2, 0.2, 0.8);
        siren.position.set(1.4, 2.4, 0);
        group.add(siren);
        group.userData.siren = siren;
        
        const wheelMat = new THREE.MeshBasicMaterial({color: 0x111111});
        const positions = [[1.2, 0.4, 0.9], [1.2, 0.4, -0.9], [-1.0, 0.4, 0.9], [-1.0, 0.4, -0.9]];
        positions.forEach(p => {
            const w = new THREE.Mesh(geometries.cylinder, wheelMat);
            w.scale.set(0.4, 0.2, 0.4);
            w.rotation.x = Math.PI/2;
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
        for (let i = this.repairTrucks.length - 1; i >= 0; i--) {
            const t = this.repairTrucks[i];
            
            t.mesh.userData.siren.material.color.setHex((Math.floor(timeElapsed * 10) % 2 === 0) ? 0xff0000 : 0x0000ff);
            
            if (t.state === 'driving_to') {
                const dir = new THREE.Vector3().subVectors(t.targetPos, t.mesh.position);
                const dist = dir.length();
                if (dist < 1) {
                    t.state = 'repairing';
                    t.timer = 5; 
                    t.worker.position.copy(t.mesh.position);
                    t.worker.position.z -= 2; 
                    t.worker.visible = true;
                } else {
                    dir.normalize();
                    t.mesh.position.addScaledVector(dir, 15 * delta);
                    t.mesh.rotation.y = Math.atan2(dir.x, dir.z);
                }
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
            } else if (t.state === 'returning') {
                const dir = new THREE.Vector3().subVectors(this.depotPos, t.mesh.position);
                const dist = dir.length();
                if (dist < 1) {
                    this.scene.remove(t.mesh);
                    this.scene.remove(t.worker);
                    this.repairTrucks.splice(i, 1);
                } else {
                    dir.normalize();
                    t.mesh.position.addScaledVector(dir, 15 * delta);
                    t.mesh.rotation.y = Math.atan2(dir.x, dir.z);
                }
            }
        }
    }
}

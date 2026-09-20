import * as THREE from 'three';

const poleMats = {
    wood: new THREE.MeshStandardMaterial({ color: 0x584b3e, roughness: 0.85 }),
    metal: new THREE.MeshStandardMaterial({ color: 0x3d4146, roughness: 0.5, metalness: 0.4 }),
    transformer: new THREE.MeshStandardMaterial({ color: 0x32373d, roughness: 0.4, metalness: 0.5 }),
    solar: new THREE.MeshStandardMaterial({ color: 0x1a3a5a, roughness: 0.1, metalness: 0.85 }),
    lampHousing: new THREE.MeshStandardMaterial({ color: 0x22262b, roughness: 0.5 }),
    lampBulbOn: new THREE.MeshBasicMaterial({ color: 0xffffff }) // Use basic for easy tinting
};

const geometries = {
    box: new THREE.BoxGeometry(1, 1, 1),
    cylinder: new THREE.CylinderGeometry(1, 1, 1, 16),
    sphere: new THREE.SphereGeometry(1, 16, 16)
};

export class PoleManager {
    constructor(scene) {
        this.scene = scene;
        this.poles = [];
        this.raycaster = new THREE.Raycaster();
        this.onPoleClick = null;
        
        const size = 128;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
        grad.addColorStop(0, 'rgba(255, 230, 140, 1.0)');
        grad.addColorStop(0.25, 'rgba(255, 180, 60, 0.7)');
        grad.addColorStop(0.65, 'rgba(255, 140, 20, 0.2)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, size, size);
        this.groundLightPoolTexture = new THREE.CanvasTexture(canvas);
        this.groundLightPoolTexture.colorSpace = THREE.SRGBColorSpace;
        this.poolGeo = new THREE.PlaneGeometry(16, 16);

        this.alertMat = new THREE.MeshBasicMaterial({ color: 0xff0000, side: THREE.DoubleSide, transparent: true, opacity: 1 });
        const shape = new THREE.Shape();
        shape.moveTo(0, 0.5);
        shape.lineTo(0.4, -0.5);
        shape.lineTo(-0.4, -0.5);
        shape.lineTo(0, 0.5);
        this.alertGeo = new THREE.ShapeGeometry(shape);

        this.colorNormal = new THREE.Color(0x584b3e);
        this.colorWarning = new THREE.Color(0xff6600);
        
        this.dummy = new THREE.Object3D();
        this.frameCount = 0;
        this.built = false;
    }

    addPole(x, z, angleRad, options = {}) {
        const pole = {
            id: this.poles.length,
            x, z, angleRad, options,
            position: new THREE.Vector3(x, 0, z),
            durability: 60 + Math.random() * 40,
            status: 'operando',
            targetIntensity: 0.1,
            currentIntensity: 0.1,
            emissiveColor: new THREE.Color(0xffa024)
        };
        // Emular userData para compatibilidade com o UI do main.js
        pole.userData = pole;
        this.poles.push(pole);
        return pole;
    }

    build() {
        if (this.built || this.poles.length === 0) return;
        this.built = true;

        const count = this.poles.length;
        
        this.shaftIMesh = new THREE.InstancedMesh(geometries.cylinder, poleMats.wood, count);
        this.crossArmIMesh = new THREE.InstancedMesh(geometries.box, poleMats.wood, count);
        this.transIMesh = new THREE.InstancedMesh(geometries.box, poleMats.transformer, count);
        this.solarIMesh = new THREE.InstancedMesh(geometries.box, poleMats.solar, count);
        this.lampArmIMesh = new THREE.InstancedMesh(geometries.box, poleMats.metal, count);
        this.lampHousingIMesh = new THREE.InstancedMesh(geometries.box, poleMats.lampHousing, count);
        this.lampBulbIMesh = new THREE.InstancedMesh(geometries.box, poleMats.lampBulbOn, count);
        
        const poolMat = new THREE.MeshBasicMaterial({
            map: this.groundLightPoolTexture,
            transparent: true, opacity: 1.0, blending: THREE.AdditiveBlending, depthWrite: false
        });
        this.poolIMesh = new THREE.InstancedMesh(this.poolGeo, poolMat, count);
        this.alertIMesh = new THREE.InstancedMesh(this.alertGeo, this.alertMat, count);

        // Invisible raycast target
        const hitMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
        this.hitboxIMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1.5, 8, 1.5), hitMat, count);

        for (let i = 0; i < count; i++) {
            const p = this.poles[i];
            const pGroup = new THREE.Object3D();
            pGroup.position.set(p.x, 0, p.z);
            pGroup.rotation.y = p.angleRad;
            pGroup.updateMatrix();

            const applyMatrix = (imesh, lx, ly, lz, sx, sy, sz, rx=0, ry=0, rz=0) => {
                this.dummy.position.set(lx, ly, lz);
                this.dummy.rotation.set(rx, ry, rz);
                this.dummy.scale.set(sx, sy, sz);
                this.dummy.updateMatrix();
                this.dummy.applyMatrix4(pGroup.matrix);
                imesh.setMatrixAt(i, this.dummy.matrix);
            };

            applyMatrix(this.shaftIMesh, 0, 3.6, 0, 0.12, 7.2, 0.12);
            applyMatrix(this.crossArmIMesh, 0, 6.8, 0, 1.8, 0.12, 0.12);
            
            if (p.options.hasTransformer) applyMatrix(this.transIMesh, 0, 5.0, 0.2, 0.5, 0.8, 0.5);
            else applyMatrix(this.transIMesh, 0, 0, 0, 0, 0, 0);

            applyMatrix(this.solarIMesh, 0, 7.5, 0, 0.8, 0.05, 1.2, -Math.PI/6, 0, 0);

            if (p.options.hasStreetlight) {
                applyMatrix(this.lampArmIMesh, 0, 6.0, -0.75, 0.1, 0.1, 1.5);
                applyMatrix(this.lampHousingIMesh, 0, 6.0, -1.6, 0.4, 0.15, 0.6);
                applyMatrix(this.lampBulbIMesh, 0, 5.95, -1.6, 0.3, 0.05, 0.4);
                applyMatrix(this.poolIMesh, 0, 0.06, -1.6, 0, 0, 0, -Math.PI/2, 0, 0);
            } else {
                applyMatrix(this.lampArmIMesh, 0,0,0, 0,0,0);
                applyMatrix(this.lampHousingIMesh, 0,0,0, 0,0,0);
                applyMatrix(this.lampBulbIMesh, 0,0,0, 0,0,0);
                applyMatrix(this.poolIMesh, 0,0,0, 0,0,0);
            }

            applyMatrix(this.alertIMesh, 0, 8.5, 0, 0, 0, 0); 
            applyMatrix(this.hitboxIMesh, 0, 4, 0, 1, 1, 1);

            this.shaftIMesh.setColorAt(i, this.colorNormal);
            this.lampBulbIMesh.setColorAt(i, new THREE.Color(0,0,0)); 
            this.poolIMesh.setColorAt(i, new THREE.Color(0,0,0)); 
        }

        this.shaftIMesh.castShadow = false;
        this.crossArmIMesh.castShadow = false;

        this.scene.add(this.shaftIMesh);
        this.scene.add(this.crossArmIMesh);
        this.scene.add(this.transIMesh);
        this.scene.add(this.solarIMesh);
        this.scene.add(this.lampArmIMesh);
        this.scene.add(this.lampHousingIMesh);
        this.scene.add(this.lampBulbIMesh);
        this.scene.add(this.poolIMesh);
        this.scene.add(this.alertIMesh);
        this.scene.add(this.hitboxIMesh);
    }

    update(delta, timeElapsed, cameraPos, nightFactor = 1.0, vehicles = [], pedestrians = []) {
        if (!this.built) return;
        this.frameCount++;
        const blinkOp = 0.5 + Math.sin(timeElapsed * 5) * 0.5;
        this.alertMat.opacity = blinkOp;

        const maxDistSq = 45 * 45;
        let needsUpdateShaft = false;
        let needsUpdateBulb = false;
        let needsUpdatePool = false;
        let needsUpdateAlert = false;

        if (!this._colorTmp) {
            this._colorTmp = new THREE.Color();
            this._pGroupMatrix = new THREE.Matrix4();
            this._posVec = new THREE.Vector3();
        }
        const colorTmp = this._colorTmp;
        const pGroupMatrix = this._pGroupMatrix;
        const posVec = this._posVec;

        const isNight = nightFactor > 0.05;

        for (let i = 0; i < this.poles.length; i++) {
            const p = this.poles[i];
            
            if (p.status !== 'manutencao' && Math.random() < 0.0002 * delta) {
                p.durability = Math.max(0, p.durability - 85);
            }
            if (p.durability <= 0 && p.status !== 'quebrado' && p.status !== 'manutencao') {
                p.status = 'quebrado';
            }
            
            // Only update shaft color if durability changed
            if (p._lastDurability !== p.durability) {
                p._lastDurability = p.durability;
                const lerpFactor = 1.0 - (p.durability / 100.0);
                colorTmp.lerpColors(this.colorNormal, this.colorWarning, lerpFactor);
                this.shaftIMesh.setColorAt(i, colorTmp);
                needsUpdateShaft = true;
            }

            // Alert triangle
            if (p.durability < 20) {
                this.dummy.position.set(0, 8.5, 0);
                this.dummy.rotation.set(0, timeElapsed * 2, 0);
                this.dummy.scale.set(1, 1, 1);
                pGroupMatrix.makeTranslation(p.x, 0, p.z);
                this.dummy.updateMatrix();
                this.dummy.applyMatrix4(pGroupMatrix);
                this.alertIMesh.setMatrixAt(i, this.dummy.matrix);
                needsUpdateAlert = true;
                p._alertVisible = true;
            } else if (p._alertVisible) {
                this.dummy.scale.set(0, 0, 0);
                this.dummy.updateMatrix();
                this.alertIMesh.setMatrixAt(i, this.dummy.matrix);
                needsUpdateAlert = true;
                p._alertVisible = false;
            }

            if (p.options.hasStreetlight) {
                if (p.status === 'operando' && isNight) {
                    if (i % 6 === this.frameCount % 6) {
                        let active = false;
                        const px = p.x, pz = p.z;
                        if (cameraPos && (px - cameraPos.x)**2 + (pz - cameraPos.z)**2 < maxDistSq) {
                            active = true;
                        } else {
                            for (let v = 0; v < vehicles.length; v++) {
                                const vp = vehicles[v].mesh.position;
                                if ((px - vp.x)**2 + (pz - vp.z)**2 < maxDistSq) {
                                    active = true;
                                    break;
                                }
                            }
                        }
                        p.targetIntensity = active ? 1.0 : 0.1;
                    }
                    
                    const prevIntensity = p.currentIntensity;
                    p.currentIntensity += (p.targetIntensity - p.currentIntensity) * (delta * 4);
                    
                    if (Math.abs(prevIntensity - p.currentIntensity) > 0.005) {
                        colorTmp.copy(p.emissiveColor).multiplyScalar(p.currentIntensity);
                        this.lampBulbIMesh.setColorAt(i, colorTmp);
                        needsUpdateBulb = true;

                        if (p.currentIntensity > 0.05) {
                            const newOpacity = p.currentIntensity * nightFactor * 0.8;
                            colorTmp.set(0xffffff).multiplyScalar(newOpacity);
                            this.poolIMesh.setColorAt(i, colorTmp);
                            
                            this.dummy.position.set(0, 0.06, -1.6);
                            this.dummy.rotation.set(-Math.PI/2, 0, 0);
                            this.dummy.scale.set(1, 1, 1);
                            
                            posVec.set(p.x, 0, p.z);
                            pGroupMatrix.makeRotationY(p.angleRad);
                            pGroupMatrix.setPosition(posVec);
                            this.dummy.updateMatrix();
                            this.dummy.applyMatrix4(pGroupMatrix);
                            this.poolIMesh.setMatrixAt(i, this.dummy.matrix);
                            p._poolVisible = true;
                        } else if (p._poolVisible) {
                            this.dummy.scale.set(0, 0, 0);
                            this.dummy.updateMatrix();
                            this.poolIMesh.setMatrixAt(i, this.dummy.matrix);
                            p._poolVisible = false;
                        }
                        needsUpdatePool = true;
                    }
                } else if (p.currentIntensity > 0.001) {
                    p.currentIntensity = 0;
                    this.lampBulbIMesh.setColorAt(i, new THREE.Color(0, 0, 0));
                    this.dummy.scale.set(0, 0, 0);
                    this.dummy.updateMatrix();
                    this.poolIMesh.setMatrixAt(i, this.dummy.matrix);
                    p._poolVisible = false;
                    needsUpdateBulb = true;
                    needsUpdatePool = true;
                }
            }
        }
        
        if (needsUpdateShaft && this.shaftIMesh.instanceColor) this.shaftIMesh.instanceColor.needsUpdate = true;
        if (needsUpdateBulb && this.lampBulbIMesh.instanceColor) this.lampBulbIMesh.instanceColor.needsUpdate = true;
        if (needsUpdatePool) {
            if (this.poolIMesh.instanceColor) this.poolIMesh.instanceColor.needsUpdate = true;
            this.poolIMesh.instanceMatrix.needsUpdate = true;
        }
        if (needsUpdateAlert) this.alertIMesh.instanceMatrix.needsUpdate = true;
    }

    checkClick(mouse, camera) {
        if (!this.built) return false;
        this.raycaster.setFromCamera(mouse, camera);
        const intersects = this.raycaster.intersectObject(this.hitboxIMesh, false);
        if (intersects.length > 0) {
            const instanceId = intersects[0].instanceId;
            if (this.onPoleClick) {
                const pole = this.poles[instanceId];
                this.onPoleClick(pole);
            }
            return true;
        }
        return false;
    }

    getPoleById(id) {
        return this.poles.find(p => p.id === id);
    }
}

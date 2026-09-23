import * as THREE from 'three';

export class VFXManager {
    constructor(scene) {
        this.scene = scene;
        this.sparks = [];
        this.arcFlashes = [];
        this.shockwaves = [];
        this.healingPulses = [];
        this.shakeIntensity = 0;
    }

    // ── Faíscas básicas (mantidas do original) ────────────────
    createSparks(position) {
        const particleCount = 80;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const velocities = [];
        const colors = new Float32Array(particleCount * 3);

        const colorBase = new THREE.Color(0xffaa00);

        for (let i = 0; i < particleCount; i++) {
            positions[i * 3] = position.x;
            positions[i * 3 + 1] = position.y;
            positions[i * 3 + 2] = position.z;

            velocities.push(new THREE.Vector3(
                (Math.random() - 0.5) * 20,
                Math.random() * 25 + 5,
                (Math.random() - 0.5) * 20
            ));

            const t = Math.random();
            const color = new THREE.Color().lerpColors(
                new THREE.Color(0xffff80), // Amarelo brilhante
                new THREE.Color(0xff3300), // Vermelho-laranja
                t
            );
            colors[i * 3] = color.r;
            colors[i * 3 + 1] = color.g;
            colors[i * 3 + 2] = color.b;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const material = new THREE.PointsMaterial({
            size: 0.9,
            vertexColors: true,
            blending: THREE.AdditiveBlending,
            transparent: true,
            opacity: 1.0,
            depthWrite: false
        });

        const particleSystem = new THREE.Points(geometry, material);
        this.scene.add(particleSystem);

        this.sparks.push({
            mesh: particleSystem,
            velocities,
            life: 1.0
        });

        this.triggerShake(1.8);
    }

    // ── Arc Flash (novo) — flash de arco elétrico azul/branco ──
    createArcFlash(position) {
        // Primeira camada: esfera de energia que expande
        const sphereGeo = new THREE.SphereGeometry(0.5, 10, 8);
        const sphereMat = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.9,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        const sphere = new THREE.Mesh(sphereGeo, sphereMat);
        sphere.position.copy(position);
        this.scene.add(sphere);

        // Segunda camada: flash de partículas brilhantes azuis/brancas
        const particleCount = 120;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const velocities = [];
        const colors = new Float32Array(particleCount * 3);

        for (let i = 0; i < particleCount; i++) {
            positions[i * 3] = position.x;
            positions[i * 3 + 1] = position.y;
            positions[i * 3 + 2] = position.z;

            const speed = Math.random() * 30 + 8;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI;
            velocities.push(new THREE.Vector3(
                speed * Math.sin(phi) * Math.cos(theta),
                speed * Math.sin(phi) * Math.sin(theta) + Math.random() * 5,
                speed * Math.cos(phi)
            ));

            const t = Math.random();
            const color = new THREE.Color().lerpColors(
                new THREE.Color(0xffffff), // Branco
                new THREE.Color(0x00aaff), // Azul elétrico
                t
            );
            colors[i * 3] = color.r;
            colors[i * 3 + 1] = color.g;
            colors[i * 3 + 2] = color.b;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const partMat = new THREE.PointsMaterial({
            size: 1.1,
            vertexColors: true,
            blending: THREE.AdditiveBlending,
            transparent: true,
            opacity: 1.0,
            depthWrite: false
        });

        const particles = new THREE.Points(geometry, partMat);
        this.scene.add(particles);

        this.arcFlashes.push({
            sphere,
            particles,
            velocities,
            life: 1.0,
            age: 0
        });

        this.triggerShake(2.5);

        // Também cria ondas de choque
        this.createShockwave(position);
        setTimeout(() => this.createShockwave(position), 120);
    }

    // ── Onda de choque (mantida e aprimorada) ─────────────────
    createShockwave(position) {
        const geometry = new THREE.TorusGeometry(1, 0.5, 12, 48);
        const material = new THREE.MeshBasicMaterial({
            color: 0x00d2ff,
            transparent: true,
            opacity: 0.9,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.copy(position);
        mesh.rotation.x = Math.PI / 2;
        this.scene.add(mesh);

        this.shockwaves.push({
            mesh,
            life: 1.0,
            scale: 1.0
        });
    }

    // ── Pulso de Cura (Self-Healing Visualization) ────────────
    /**
     * Cria um pulso de luz ciano que viaja ao longo dos nós de uma rota
     * para visualizar que a IA está roteando energia por ali.
     * @param {THREE.Vector3[]} nodePositions - posições dos nós na rota
     */
    createHealingPulse(nodePositions) {
        if (!nodePositions || nodePositions.length < 2) return;

        // Cria o "glóbulo" de energia que vai viajar pela rota
        const globeGeo = new THREE.SphereGeometry(1.2, 8, 6);
        const globeMat = new THREE.MeshBasicMaterial({
            color: 0x00ffcc,
            transparent: true,
            opacity: 0.95,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        const globe = new THREE.Mesh(globeGeo, globeMat);
        globe.position.copy(nodePositions[0]);
        this.scene.add(globe);

        // Cria trilha de partículas
        const trailCount = 20;
        const trailGeo = new THREE.BufferGeometry();
        const trailPositions = new Float32Array(trailCount * 3);
        for (let i = 0; i < trailCount * 3; i++) {
            trailPositions[i] = nodePositions[0].x || 0;
        }
        trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
        const trailMat = new THREE.PointsMaterial({
            color: 0x00ffcc,
            size: 0.6,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        const trail = new THREE.Points(trailGeo, trailMat);
        this.scene.add(trail);

        this.healingPulses.push({
            globe,
            trail,
            trailPositions: Array(trailCount).fill(null).map(() => nodePositions[0].clone()),
            route: nodePositions.map(p => p.clone()),
            routeIndex: 0,
            t: 0,
            life: 1.0,
            speed: 1.8 // unidades por segundo ao longo da rota
        });
    }

    triggerShake(intensity = 1.0) {
        this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
    }

    update(delta, camera) {
        // ── Atualizar Faíscas ──────────────────────────────────
        for (let i = this.sparks.length - 1; i >= 0; i--) {
            const spark = this.sparks[i];
            spark.life -= delta * 1.3;

            if (spark.life <= 0) {
                this.scene.remove(spark.mesh);
                spark.mesh.geometry.dispose();
                spark.mesh.material.dispose();
                this.sparks.splice(i, 1);
                continue;
            }

            const positions = spark.mesh.geometry.attributes.position.array;
            for (let j = 0; j < spark.velocities.length; j++) {
                spark.velocities[j].y -= 38 * delta;
                positions[j * 3] += spark.velocities[j].x * delta;
                positions[j * 3 + 1] += spark.velocities[j].y * delta;
                positions[j * 3 + 2] += spark.velocities[j].z * delta;
            }
            spark.mesh.geometry.attributes.position.needsUpdate = true;
            spark.mesh.material.opacity = Math.pow(spark.life, 0.7);
        }

        // ── Atualizar Arc Flashes ──────────────────────────────
        for (let i = this.arcFlashes.length - 1; i >= 0; i--) {
            const af = this.arcFlashes[i];
            af.life -= delta * 2.0;
            af.age += delta;

            if (af.life <= 0) {
                this.scene.remove(af.sphere);
                this.scene.remove(af.particles);
                af.sphere.geometry.dispose();
                af.sphere.material.dispose();
                af.particles.geometry.dispose();
                af.particles.material.dispose();
                this.arcFlashes.splice(i, 1);
                continue;
            }

            // Esfera expande e desaparece
            const scale = 1 + af.age * 18;
            af.sphere.scale.set(scale, scale, scale);
            af.sphere.material.opacity = af.life * 0.8;

            // Partículas voam para fora
            const positions = af.particles.geometry.attributes.position.array;
            for (let j = 0; j < af.velocities.length; j++) {
                positions[j * 3] += af.velocities[j].x * delta;
                positions[j * 3 + 1] += af.velocities[j].y * delta;
                positions[j * 3 + 2] += af.velocities[j].z * delta;
            }
            af.particles.geometry.attributes.position.needsUpdate = true;
            af.particles.material.opacity = Math.pow(af.life, 0.6);
        }

        // ── Atualizar Shockwaves ───────────────────────────────
        for (let i = this.shockwaves.length - 1; i >= 0; i--) {
            const wave = this.shockwaves[i];
            wave.life -= delta * 1.2;
            wave.scale += delta * 140;

            if (wave.life <= 0) {
                this.scene.remove(wave.mesh);
                wave.mesh.geometry.dispose();
                wave.mesh.material.dispose();
                this.shockwaves.splice(i, 1);
                continue;
            }

            wave.mesh.scale.set(wave.scale, wave.scale, wave.scale);
            wave.mesh.material.opacity = wave.life * 0.7;
        }

        // ── Atualizar Healing Pulses ───────────────────────────
        for (let i = this.healingPulses.length - 1; i >= 0; i--) {
            const hp = this.healingPulses[i];
            const route = hp.route;

            if (hp.routeIndex >= route.length - 1) {
                // Chegou ao fim — desvanece
                hp.life -= delta * 1.2;
                if (hp.life <= 0) {
                    this.scene.remove(hp.globe);
                    this.scene.remove(hp.trail);
                    hp.globe.geometry.dispose();
                    hp.globe.material.dispose();
                    hp.trail.geometry.dispose();
                    hp.trail.material.dispose();
                    this.healingPulses.splice(i, 1);
                }
                hp.globe.material.opacity = hp.life * 0.9;
                hp.trail.material.opacity = hp.life * 0.5;
                continue;
            }

            // Avança ao longo do segmento atual
            const from = route[hp.routeIndex];
            const to = route[hp.routeIndex + 1];
            const segLen = from.distanceTo(to);
            const step = (hp.speed * delta) / Math.max(segLen, 0.01);
            hp.t += step;

            if (hp.t >= 1) {
                hp.t -= 1;
                hp.routeIndex++;
            }

            if (hp.routeIndex < route.length - 1) {
                const f = route[hp.routeIndex];
                const t2 = route[hp.routeIndex + 1];
                hp.globe.position.lerpVectors(f, t2, hp.t);
            }

            // Pulsa
            const pulseFactor = 1.0 + Math.sin(Date.now() * 0.012) * 0.25;
            hp.globe.scale.set(pulseFactor, pulseFactor, pulseFactor);

            // Atualizar trilha
            hp.trailPositions.pop();
            hp.trailPositions.unshift(hp.globe.position.clone());

            const trailPosArr = hp.trail.geometry.attributes.position.array;
            for (let j = 0; j < hp.trailPositions.length; j++) {
                trailPosArr[j * 3] = hp.trailPositions[j].x;
                trailPosArr[j * 3 + 1] = hp.trailPositions[j].y;
                trailPosArr[j * 3 + 2] = hp.trailPositions[j].z;
            }
            hp.trail.geometry.attributes.position.needsUpdate = true;
            hp.trail.material.opacity = 0.5;
        }

        // ── Atualização do Vapor Nuclear ──
        if (this.nuclearSteam) {
            for (let i = this.nuclearSteam.particles.length - 1; i >= 0; i--) {
                const p = this.nuclearSteam.particles[i];
                p.life -= delta;
                
                if (p.life <= 0) {
                    this.scene.remove(p.mesh);
                    p.mesh.material.dispose();
                    this.nuclearSteam.particles.splice(i, 1);
                } else {
                    p.mesh.position.addScaledVector(p.velocity, delta);
                    p.mesh.scale.addScalar(delta * 3.5);
                    p.mesh.material.opacity = Math.min(1, (p.maxLife - p.life) * 2) * Math.max(0, p.life / p.maxLife) * 0.3;
                }
            }
        }

        // ── Pulso de Destaque ──
        if (this.highlightPulses) {
            for (let i = this.highlightPulses.length - 1; i >= 0; i--) {
                const pulse = this.highlightPulses[i];
                pulse.life -= delta;
                if (pulse.life <= 0) {
                    this.scene.remove(pulse.mesh);
                    this.highlightPulses.splice(i, 1);
                } else {
                    pulse.scale += delta * pulse.speed;
                    pulse.mesh.scale.set(pulse.scale, pulse.scale, pulse.scale);
                    pulse.mesh.material.opacity = Math.max(0, pulse.life / pulse.maxLife) * pulse.baseOpacity;
                }
            }
        }

        // ── Atualização de Explosões Nucleares (Nukes) ──
        if (this.nukes) {
            for (let i = this.nukes.length - 1; i >= 0; i--) {
                const n = this.nukes[i];
                n.life += delta;
                const t = n.life / n.maxLife;

                if (t >= 1.0) {
                    this.scene.remove(n.elements.light);
                    this.scene.remove(n.elements.fireball);
                    this.scene.remove(n.elements.shockwave);
                    this.scene.remove(n.elements.stem);
                    this.scene.remove(n.elements.halo);
                    this.nukes.splice(i, 1);
                    continue;
                }

                // 1. Luz: Pico extremo imediato, cai exponencialmente
                const flashCurve = Math.max(0, 1.0 - (n.life * 0.8));
                n.elements.light.intensity = flashCurve * 80000;
                n.elements.light.color.setHSL(0.08, 1.0, 0.5 + flashCurve * 0.5);

                // 2. Fireball: Expande rápido e depois sobe, escurecendo (branco -> amarelo -> vermelho -> cinza escuro)
                // Aceleração inicial enorme, depois estabiliza e sobe
                const expansion = Math.pow(Math.min(1.0, n.life / 2.0), 0.5); 
                const fbScale = 20 + expansion * 220; 
                n.elements.fireball.scale.set(fbScale, fbScale, fbScale);
                n.elements.fireball.position.y = n.position.y + Math.pow(n.life, 1.8) * 20; // Sobe acelerando levemente
                
                // HSL: Matiz vai de amarelo/laranja (0.1) até vermelho (0.0). Lightness vai de 1.0 até 0.1
                const fbColorT = Math.min(1.0, n.life / 5.0); 
                n.elements.fireball.material.color.setHSL(
                    0.08 * (1 - fbColorT), // Hue
                    1.0,                   // Saturation
                    1.0 - fbColorT * 0.9   // Lightness (escurece p/ cinza/preto)
                );
                n.elements.fireball.material.opacity = Math.max(0, 1.0 - t * 1.5);

                // 3. Shockwave: Expansão ultra rápida no chão
                const swScale = Math.pow(n.life, 0.8) * 800;
                n.elements.shockwave.scale.set(swScale, swScale, 1);
                n.elements.shockwave.material.opacity = Math.max(0, 1.0 - (n.life / 3.0));

                // 4. Halo (Onda de choque secundária superior)
                const haloScale = Math.pow(n.life, 0.9) * 450;
                n.elements.halo.scale.set(haloScale, haloScale, 1);
                n.elements.halo.position.y = n.position.y + 40 + (n.life * 15);
                n.elements.halo.material.opacity = Math.max(0, 0.7 - (n.life / 3.0));

                // 5. Caule do Cogumelo: Conecta o chão à Fireball
                const stemHeight = Math.max(0.1, n.elements.fireball.position.y - n.position.y);
                n.elements.stem.scale.set(fbScale * 0.25, stemHeight, fbScale * 0.25);
                n.elements.stem.material.color.setHSL(0.05, 1.0, 1.0 - fbColorT * 0.8);
                n.elements.stem.material.opacity = Math.max(0, 0.8 - t * 1.2);
                
                // Shake contínuo tremendo a câmera violentamente
                if (n.life < 10.0) {
                    this.shakeIntensity = Math.max(this.shakeIntensity, (1.0 - (n.life / 10.0)) * 60.0);
                }
            }
        }

        // ── Camera Shake ───────────────────────────────────────
        this._shakeOffset = this._shakeOffset || new THREE.Vector3();
        const shakeOffset = this._shakeOffset;
        shakeOffset.set(0, 0, 0);

        if (this.shakeIntensity > 0) {
            shakeOffset.x = (Math.random() - 0.5) * this.shakeIntensity;
            shakeOffset.y = (Math.random() - 0.5) * this.shakeIntensity;
            shakeOffset.z = (Math.random() - 0.5) * this.shakeIntensity;

            this.shakeIntensity -= delta * 8.0; // Amortecimento
            if (this.shakeIntensity < 0) this.shakeIntensity = 0;
        }

        return shakeOffset;
    }

    triggerNuclearExplosion(position) {
        const nuke = {
            life: 0,
            maxLife: 18.0, // Duração bem longa
            position: position.clone(),
            elements: {}
        };

        // 1. Luz Ofuscante
        const light = new THREE.PointLight(0xffffff, 50000, 4000);
        light.position.copy(position);
        light.position.y += 50;
        this.scene.add(light);
        nuke.elements.light = light;

        // 2. Fireball
        const fbGeo = new THREE.SphereGeometry(1, 32, 32);
        const fbMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 1.0, blending: THREE.AdditiveBlending });
        const fireball = new THREE.Mesh(fbGeo, fbMat);
        fireball.position.copy(position);
        this.scene.add(fireball);
        nuke.elements.fireball = fireball;

        // 3. Shockwave no chão
        const swGeo = new THREE.RingGeometry(0.1, 1, 64);
        const swMat = new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 1.0, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false });
        const shockwave = new THREE.Mesh(swGeo, swMat);
        shockwave.rotation.x = -Math.PI / 2;
        shockwave.position.copy(position);
        shockwave.position.y += 2;
        this.scene.add(shockwave);
        nuke.elements.shockwave = shockwave;

        // 4. Halo Aéreo (anel de condensação)
        const haloGeo = new THREE.RingGeometry(0.8, 1, 64);
        const haloMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false });
        const halo = new THREE.Mesh(haloGeo, haloMat);
        halo.rotation.x = -Math.PI / 2;
        halo.position.copy(position);
        halo.position.y += 120; // Forma-se no alto
        this.scene.add(halo);
        nuke.elements.halo = halo;

        // 5. Caule do Cogumelo
        const stemGeo = new THREE.CylinderGeometry(1, 1, 1, 32);
        stemGeo.translate(0, 0.5, 0); // Pivô na base
        const stemMat = new THREE.MeshBasicMaterial({ color: 0xff4400, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending });
        const stem = new THREE.Mesh(stemGeo, stemMat);
        stem.position.copy(position);
        this.scene.add(stem);
        nuke.elements.stem = stem;

        this.nukes = this.nukes || [];
        this.nukes.push(nuke);

        // Flash de Tela Branco Massivo
        const flashDiv = document.getElementById('screen-flash');
        if (flashDiv) {
            flashDiv.style.transition = 'none';
            flashDiv.style.background = 'white';
            flashDiv.style.opacity = '1';
            
            // Fica ofuscante por 400ms, depois decai lentamente por 3 segundos
            setTimeout(() => {
                flashDiv.style.transition = 'opacity 3s ease-out';
                flashDiv.style.opacity = '0';
                setTimeout(() => {
                    flashDiv.style.transition = 'opacity 0.2s'; // Volta ao padrão das falhas elétricas
                }, 3000);
            }, 400);
        }

        // Tremor maciço
        this.shakeIntensity = 100.0;
    }

    emitNuclearSteam(position, amount = 1) {
        if (!this.nuclearSteam) this.nuclearSteam = { particles: [] };
        
        if (!this._steamTexture) {
            const canvas = document.createElement('canvas');
            canvas.width = canvas.height = 64;
            const ctx = canvas.getContext('2d');
            const fade = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
            fade.addColorStop(0, 'rgba(255,255,255,0.9)');
            fade.addColorStop(0.45, 'rgba(255,255,255,0.5)');
            fade.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.fillStyle = fade; ctx.fillRect(0, 0, 64, 64);
            this._steamTexture = new THREE.CanvasTexture(canvas);
        }
        const mat = new THREE.SpriteMaterial({
            map: this._steamTexture,
            color: 0xe4e8e7,
            transparent: true,
            opacity: 0.4,
            depthWrite: false
        });

        for(let i=0; i<amount && this.nuclearSteam.particles.length < 48; i++) {
            const mesh = new THREE.Sprite(mat.clone());
            mesh.scale.setScalar(9 + Math.random() * 3);
            mesh.position.copy(position);
            mesh.position.x += (Math.random() - 0.5) * 2;
            mesh.position.z += (Math.random() - 0.5) * 2;
            this.scene.add(mesh);
            
            this.nuclearSteam.particles.push({
                mesh,
                velocity: new THREE.Vector3((Math.random()-0.5)*1, 6 + Math.random()*2, (Math.random()-0.5)*1),
                life: 4.0 + Math.random() * 2.0,
                maxLife: 6.0
            });
        }
        mat.dispose();
    }

    createPulseEffect(position, color, isFlat = false, speed = 25.0) {
        if (!this.highlightPulses) this.highlightPulses = [];
        
        let geo;
        if (isFlat) {
            geo = new THREE.RingGeometry(0.1, 1, 32);
        } else {
            geo = new THREE.SphereGeometry(1, 16, 16);
        }
        
        const mat = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            side: THREE.DoubleSide
        });
        
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(position);
        if (isFlat) {
            mesh.rotation.x = -Math.PI / 2;
            mesh.position.y += 1.5;
        }
        this.scene.add(mesh);
        
        this.highlightPulses.push({
            mesh,
            scale: 0.1,
            speed: speed,
            life: 1.0,
            maxLife: 1.0,
            baseOpacity: 0.8
        });
    }
}

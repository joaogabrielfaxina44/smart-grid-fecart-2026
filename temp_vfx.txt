import * as THREE from 'three';

export class VFXManager {
    constructor(scene) {
        this.scene = scene;
        this.sparks = [];
        this.shockwaves = [];
        this.shakeIntensity = 0;
    }

    createSparks(position) {
        const particleCount = 60;
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
                (Math.random() - 0.5) * 15,
                Math.random() * 20 + 5,
                (Math.random() - 0.5) * 15
            ));

            const color = colorBase.clone().lerp(new THREE.Color(0xff0000), Math.random());
            colors[i * 3] = color.r;
            colors[i * 3 + 1] = color.g;
            colors[i * 3 + 2] = color.b;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const material = new THREE.PointsMaterial({
            size: 0.8,
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
            velocities: velocities,
            life: 1.0
        });

        this.triggerShake(1.5);
    }

    createShockwave(position) {
        const geometry = new THREE.TorusGeometry(1, 0.5, 16, 64);
        const material = new THREE.MeshBasicMaterial({
            color: 0x00d2ff,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.copy(position);
        mesh.rotation.x = Math.PI / 2;
        this.scene.add(mesh);

        this.shockwaves.push({
            mesh: mesh,
            life: 1.0,
            scale: 1.0
        });
    }

    triggerShake(intensity = 1.0) {
        this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
    }

    update(delta, camera, originalPosition = null) {
        // Update Sparks
        for (let i = this.sparks.length - 1; i >= 0; i--) {
            const spark = this.sparks[i];
            spark.life -= delta * 1.5;

            if (spark.life <= 0) {
                this.scene.remove(spark.mesh);
                spark.mesh.geometry.dispose();
                spark.mesh.material.dispose();
                this.sparks.splice(i, 1);
                continue;
            }

            const positions = spark.mesh.geometry.attributes.position.array;
            for (let j = 0; j < spark.velocities.length; j++) {
                spark.velocities[j].y -= 40 * delta; // Gravity
                positions[j * 3] += spark.velocities[j].x * delta;
                positions[j * 3 + 1] += spark.velocities[j].y * delta;
                positions[j * 3 + 2] += spark.velocities[j].z * delta;
            }
            spark.mesh.geometry.attributes.position.needsUpdate = true;
            spark.mesh.material.opacity = spark.life;
        }

        // Update Shockwaves
        for (let i = this.shockwaves.length - 1; i >= 0; i--) {
            const wave = this.shockwaves[i];
            wave.life -= delta * 1.2;
            wave.scale += delta * 150; 

            if (wave.life <= 0) {
                this.scene.remove(wave.mesh);
                wave.mesh.geometry.dispose();
                wave.mesh.material.dispose();
                this.shockwaves.splice(i, 1);
                continue;
            }

            wave.mesh.scale.set(wave.scale, wave.scale, wave.scale);
            wave.mesh.material.opacity = wave.life * 0.8;
        }

        // Camera Shake
        let shakeOffset = new THREE.Vector3(0, 0, 0);
        if (this.shakeIntensity > 0) {
            shakeOffset.x = (Math.random() - 0.5) * this.shakeIntensity;
            shakeOffset.y = (Math.random() - 0.5) * this.shakeIntensity;
            shakeOffset.z = (Math.random() - 0.5) * this.shakeIntensity;
            
            this.shakeIntensity -= delta * 3.0; // Decay
            if (this.shakeIntensity < 0) this.shakeIntensity = 0;
        }
        
        return shakeOffset;
    }
}

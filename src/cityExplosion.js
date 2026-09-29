import * as THREE from 'three';

const WAVE_SPEED = 105;
const MAX_DEBRIS = 24000;
const noiseGLSL = `
float hash(vec3 p) { return fract(sin(dot(p, vec3(127.1,311.7,74.7)))*43758.5453); }
float noise(vec3 p) {
    vec3 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
    return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),
                   mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
               mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),
                   mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);
}
float fbm(vec3 p) { return noise(p)*0.57+noise(p*2.03)*0.28+noise(p*4.07)*0.15; }
`;

// A bounded pool of billboards: all smoke/fire puffs use one draw call.
function makeCloud(count) {
    const geometry = new THREE.InstancedBufferGeometry();
    const plane = new THREE.PlaneGeometry(1, 1);
    geometry.index = plane.index.clone();
    geometry.setAttribute('position', plane.attributes.position.clone());
    geometry.setAttribute('uv', plane.attributes.uv.clone());
    plane.dispose();
    for (const [name, size] of [['center', 3], ['size', 1], ['heat', 1], ['alpha', 1], ['seed', 1]]) {
        geometry.setAttribute(name, new THREE.InstancedBufferAttribute(new Float32Array(count * size), size).setUsage(THREE.DynamicDrawUsage));
    }
    geometry.instanceCount = count;
    const material = new THREE.ShaderMaterial({
        transparent: true, depthWrite: false,
        uniforms: { time: { value: 0 } },
        vertexShader: `
            attribute vec3 center;
            attribute float size, heat, alpha, seed;
            varying vec2 vUv;
            varying float vHeat, vAlpha, vSeed;
            void main() {
                vUv=uv; vHeat=heat; vAlpha=alpha; vSeed=seed;
                vec4 p=modelViewMatrix*vec4(center,1.0);
                p.xy+=position.xy*size;
                gl_Position=projectionMatrix*p;
            }`,
        fragmentShader: `
            uniform float time;
            varying vec2 vUv;
            varying float vHeat,vAlpha,vSeed;
            ${noiseGLSL}
            void main() {
                vec2 p=vUv*2.0-1.0;
                float n=fbm(vec3(p*3.2+vSeed,time*0.36+vSeed));
                float body=1.0-smoothstep(0.25,1.0,length(p)+(n-0.5)*0.38);
                float density=body*(0.48+n*0.52)*vAlpha;
                if(density<0.008) discard;
                vec3 smoke=mix(vec3(0.065,0.058,0.054),vec3(0.40,0.35,0.29),n);
                float hot=clamp(vHeat+(n-0.5)*0.9,0.0,1.0);
                vec3 fire=mix(vec3(0.8,0.065,0.006),vec3(2.8,1.15,0.12),hot);
                fire=mix(fire,vec3(4.0,3.1,1.6),smoothstep(0.72,1.0,hot));
                gl_FragColor=vec4(mix(smoke,fire,smoothstep(0.08,0.7,vHeat)),density);
                #include <tonemapping_fragment>
                #include <colorspace_fragment>
            }`
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.frustumCulled = false;
    mesh.renderOrder = 5;
    return mesh;
}

export class CityExplosion {
    constructor(scene) {
        this.scene = scene;
        this.active = false;
        this.age = 0;
        this.dummy = new THREE.Object3D();
        this.zero = new THREE.Matrix4().makeScale(0, 0, 0);
        this.shake = new THREE.Vector3();
        this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    trigger() {
        if (this.active) return false;
        this.active = true;
        this.age = 0;
        this.targets = [];
        this.snapshots = new Map();
        this.fragments = [];
        this.destroyed = 0;
        this.scene.updateMatrixWorld(true);
        const world = new THREE.Matrix4();
        const local = new THREE.Matrix4();
        const box = new THREE.Box3();
        const size = new THREE.Vector3();
        const center = new THREE.Vector3();
        // Capture before adding effects. Shared geometry/materials are never modified.
        this.scene.traverseVisible(mesh => {
            if (!mesh.isMesh && !mesh.isLine && !mesh.isSprite) return;
            const sourceMaterials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            if (sourceMaterials.every(mat => !mat || mat.visible === false || mat.opacity === 0)) return;
            if (!mesh.geometry) {
                this.targets.push({ mesh, delay: mesh.getWorldPosition(center).length() / WAVE_SPEED, pieces: [] });
                this.snapshots.set(mesh, { visible: mesh.visible });
                return;
            }
            if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
            const count = mesh.isInstancedMesh ? mesh.count : 1;
            for (let i = 0; i < count; i++) {
                if (mesh.isInstancedMesh) {
                    mesh.getMatrixAt(i, local);
                    world.multiplyMatrices(mesh.matrixWorld, local);
                } else world.copy(mesh.matrixWorld);
                box.copy(mesh.geometry.boundingBox).applyMatrix4(world);
                box.getSize(size); box.getCenter(center);
                // Keep streets and foundations under the persistent rubble.
                if (box.max.y < 0.7) continue;
                if (!this.snapshots.has(mesh)) this.snapshots.set(mesh, {
                    visible: mesh.visible,
                    matrix: mesh.isInstancedMesh ? mesh.instanceMatrix.array.slice() : null
                });
                const target = { mesh, index: mesh.isInstancedMesh ? i : null,
                    delay: 0.22 + Math.hypot(center.x, center.z) / WAVE_SPEED, pieces: [] };
                this.targets.push(target);
                // Cable bounding boxes enclose empty air: never turn them into solid building slabs.
                if (!mesh.isMesh || mesh.geometry.type === 'TubeGeometry' || size.length() < 0.65 || size.x > 180 || size.z > 180) continue;
                // Large structures fracture into floor slabs; small street objects become single chunks.
                const major = size.y > 5 && size.x > 3 && size.z > 3;
                const nx = major ? 2 : 1, nz = major ? 2 : 1;
                const ny = major ? Math.min(5, Math.ceil(size.y / 7)) : 1;
                const mat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
                const color = mat.color?.clone() || new THREE.Color(0x77716b);
                color.multiplyScalar(0.65 + Math.random() * 0.3);
                for (let x = 0; x < nx; x++) for (let y = 0; y < ny; y++) for (let z = 0; z < nz; z++) {
                    if (this.fragments.length >= MAX_DEBRIS) break;
                    const scale = new THREE.Vector3(size.x / nx, size.y / ny, size.z / nz).multiplyScalar(0.86);
                    scale.clampScalar(0.12, 18);
                    const p = new THREE.Vector3(box.min.x + (x + 0.5) * size.x / nx,
                        box.min.y + (y + 0.5) * size.y / ny, box.min.z + (z + 0.5) * size.z / nz);
                    const distance = Math.hypot(p.x, p.z);
                    const direction = Math.atan2(p.z, p.x) + (Math.random() - 0.5) * 0.7;
                    const impulse = (30 + 75 * Math.exp(-distance / 240)) * (0.6 + Math.random() * 0.7);
                    const fragment = { p, scale, color, delay: target.delay, settled: false,
                        velocity: new THREE.Vector3(Math.cos(direction) * impulse, 24 + Math.random() * 60, Math.sin(direction) * impulse),
                        rotation: new THREE.Euler(Math.random(), Math.random(), Math.random()),
                        spin: new THREE.Vector3(Math.random() * 4 - 2, Math.random() * 4 - 2, Math.random() * 4 - 2) };
                    target.pieces.push(this.fragments.length);
                    this.fragments.push(fragment);
                }
            }
        });
        this.targets.sort((a, b) => a.delay - b.delay);
        this.nextTarget = 0;
        this.group = new THREE.Group();
        this.group.name = 'FECART cinematic destruction';
        this.scene.add(this.group);
        this.debris = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1),
            new THREE.MeshStandardMaterial({ roughness: 0.98, metalness: 0.08 }), this.fragments.length);
        this.debris.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        this.debris.frustumCulled = false;
        this.debris.receiveShadow = true;
        this.fragments.forEach((f, i) => { this.debris.setMatrixAt(i, this.zero); this.debris.setColorAt(i, f.color); });
        this.group.add(this.debris);
        this.cloud = makeCloud(260);
        this.group.add(this.cloud);
        this.puffs = Array.from({ length: 260 }, (_, i) => {
            const angle = Math.random() * Math.PI * 2;
            return { angle, radius: Math.random(), seed: Math.random() * 100,
                kind: i < 100 ? 'core' : i < 180 ? 'dust' : 'fire',
                x: (Math.random() - 0.5) * 440, z: (Math.random() - 0.5) * 440 };
        });
        this.ring = new THREE.Mesh(new THREE.RingGeometry(0.955, 1, 160),
            new THREE.MeshBasicMaterial({ color: 0xffddaa, transparent: true, opacity: 0,
                side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
        this.ring.rotation.x = -Math.PI / 2;
        this.ring.position.y = 0.85;
        this.group.add(this.ring);
        this.scorch = new THREE.Mesh(new THREE.CircleGeometry(1, 96), new THREE.ShaderMaterial({
            transparent: true, depthWrite: false, uniforms: { opacity: { value: 0 } },
            vertexShader: 'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
            fragmentShader: `varying vec2 vUv; uniform float opacity; ${noiseGLSL}
                void main(){float d=length(vUv*2.0-1.0);float n=fbm(vec3(vUv*35.0,1.0));
                gl_FragColor=vec4(vec3(0.045,0.032,0.022),opacity*(1.0-smoothstep(0.5,1.0,d+n*0.2)));}`
        }));
        this.scorch.rotation.x = -Math.PI / 2;
        this.scorch.position.y = 0.36;
        this.scorch.scale.setScalar(270);
        this.group.add(this.scorch);
        this.light = new THREE.PointLight(0xffb35c, 0, 850, 1.3);
        this.light.position.set(0, 45, 0);
        this.group.add(this.light);
        this.createEmbers();
        this.playSound();
        return true;
    }

    createEmbers() {
        const count = 1600;
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
        const colors = new Float32Array(count * 3);
        this.embers = [];
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 25 + Math.random() * 120;
            this.embers.push(new THREE.Vector3(Math.cos(angle) * speed, 25 + Math.random() * 125, Math.sin(angle) * speed));
            const c = new THREE.Color().setHSL(0.025 + Math.random() * 0.09, 1, 0.6);
            colors.set([c.r, c.g, c.b], i * 3);
        }
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        this.sparks = new THREE.Points(geometry, new THREE.PointsMaterial({
            size: 1.2, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
        }));
        this.sparks.frustumCulled = false;
        this.group.add(this.sparks);
    }

    playSound() {
        if (document.getElementById('finale-sound')?.checked === false) return;
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        try {
            this.audio = new AudioContext();
            this.audio.resume().catch(() => {});
            const ctx = this.audio, duration = 10;
            const buffer = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
            const data = buffer.getChannelData(0);
            let brown = 0;
            for (let i = 0; i < data.length; i++) {
                const white = Math.random() * 2 - 1;
                brown = (brown + white * 0.035) / 1.035;
                const t = i / ctx.sampleRate;
                data[i] = (brown * 3 + white * 0.22 * Math.exp(-t * 3)) * Math.exp(-t * 0.44);
            }
            const source = ctx.createBufferSource(); source.buffer = buffer;
            const filter = ctx.createBiquadFilter(); filter.type = 'lowpass';
            filter.frequency.setValueAtTime(3200, ctx.currentTime);
            filter.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 8);
            const gain = ctx.createGain(); gain.gain.value = 0.65;
            source.connect(filter).connect(gain).connect(ctx.destination);
            source.start();
            source.onended = () => { if (this.audio === ctx) this.audio = null; if (ctx.state !== 'closed') void ctx.close(); };
        } catch { /* The visual sequence also works without an audio device. */ }
    }

    update(dt, camera) {
        this.shake.set(0, 0, 0);
        if (!this.active) return this.shake;
        this.age += dt;
        const t = this.age;
        const dirty = new Set();
        while (this.nextTarget < this.targets.length && this.targets[this.nextTarget].delay <= t) {
            const target = this.targets[this.nextTarget++];
            if (target.index !== null && target.index !== undefined) {
                target.mesh.setMatrixAt(target.index, this.zero); dirty.add(target.mesh);
            } else target.mesh.visible = false;
            this.destroyed++;
        }
        dirty.forEach(mesh => { mesh.instanceMatrix.needsUpdate = true; });
        let moving = false;
        for (let i = 0; i < this.fragments.length; i++) {
            const f = this.fragments[i];
            if (t < f.delay || f.settled) continue;
            moving = true;
            f.velocity.y -= 32 * dt;
            f.velocity.multiplyScalar(Math.exp(-0.13 * dt));
            f.p.addScaledVector(f.velocity, dt);
            f.rotation.x += f.spin.x * dt; f.rotation.y += f.spin.y * dt; f.rotation.z += f.spin.z * dt;
            // Conservative radius keeps rotating slabs above the street surface.
            const floor = 0.4 + f.scale.length() * 0.28;
            if (f.p.y < floor) {
                f.p.y = floor;
                f.velocity.y = Math.abs(f.velocity.y) * 0.23;
                f.velocity.x *= 0.55; f.velocity.z *= 0.55; f.spin.multiplyScalar(0.45);
                if (f.velocity.lengthSq() < 16 || t - f.delay > 13) f.settled = true;
            }
            this.dummy.position.copy(f.p); this.dummy.scale.copy(f.scale); this.dummy.rotation.copy(f.rotation);
            this.dummy.updateMatrix(); this.debris.setMatrixAt(i, this.dummy.matrix);
        }
        if (moving) this.debris.instanceMatrix.needsUpdate = true;
        const radius = Math.max(0.01, (t - 0.22) * WAVE_SPEED);
        this.ring.scale.set(radius, radius, 1);
        this.ring.material.opacity = Math.max(0, 0.7 - t * 0.12);
        this.scorch.material.uniforms.opacity.value = Math.min(0.9, t * 0.3);
        this.light.intensity = 75000 * Math.exp(-t * 2.4) + (t < 8 ? 2300 * Math.exp(-t * 0.25) : 0);
        this.updateCloud(camera);
        this.sparks.visible = t < 10;
        if (t < 10) {
            const p = this.sparks.geometry.attributes.position;
            this.embers.forEach((v, i) => p.setXYZ(i, v.x * t * 0.8, Math.max(0.6, 4 + v.y * t - 12 * t * t), v.z * t * 0.8));
            p.needsUpdate = true;
            this.sparks.material.opacity = Math.max(0, 1 - t / 10);
        }
        const flash = document.getElementById('finale-flash');
        if (flash) flash.style.opacity = this.reducedMotion ? '0' : String(0.65 * Math.exp(-t * 7));
        if (!this.reducedMotion && t < 8) {
            const amplitude = (1 - Math.exp(-t * 10)) * Math.exp(-t * 0.65) * 2.8;
            this.shake.set(Math.sin(t * 71) * amplitude, Math.sin(t * 89) * amplitude * 0.65, Math.cos(t * 59) * amplitude);
        }
        return this.shake;
    }

    updateCloud(camera) {
        const t = this.age;
        this.cloud.visible = t < 38;
        if (!this.cloud.visible) return;
        const attributes = this.cloud.geometry.attributes;
        const entries = this.puffs.map(p => {
            let x, y, z, size, heat, alpha;
            if (p.kind === 'core') {
                const expansion = 1 - Math.exp(-t * 1.3);
                const radius = (12 + p.radius * 48) * expansion;
                x = Math.cos(p.angle + t * 0.04) * radius + Math.max(0, t - 4) * 2;
                z = Math.sin(p.angle + t * 0.04) * radius;
                y = 8 + t * 8 + p.radius * 25 + Math.sin(p.seed) * 15;
                size = (22 + p.radius * 30) * expansion + t * 1.6;
                heat = Math.max(0, 1.2 - t * 0.24 - p.radius * 0.25);
                alpha = Math.min(0.88, t * 2) * Math.max(0, 1 - Math.max(0, t - 12) / 22);
            } else if (p.kind === 'dust') {
                const radius = Math.min(400, Math.max(0, t - 0.2) * (75 + p.radius * 30));
                x = Math.cos(p.angle) * radius; z = Math.sin(p.angle) * radius;
                y = 3 + p.radius * t * 2.5;
                size = 12 + Math.min(t, 10) * (5 + p.radius * 3);
                heat = 0;
                alpha = Math.min(0.5, t) * Math.max(0, 1 - t / 16);
            } else {
                const age = t - Math.hypot(p.x, p.z) / WAVE_SPEED - 0.3;
                const cycle = (Math.max(0, age) * 0.32 + p.radius) % 1;
                x = p.x + cycle * 5; z = p.z;
                y = 2 + cycle * 28;
                size = 8 + cycle * 17;
                heat = Math.max(0, (1 - cycle) * 0.9 - Math.max(0, t - 12) * 0.07);
                alpha = age < 0 ? 0 : Math.sin(cycle * Math.PI) * 0.75 * Math.min(1, age) * Math.max(0, 1 - Math.max(0, t - 18) / 20);
            }
            const pos = new THREE.Vector3(x, y, z);
            return { pos, size, heat, alpha, seed: p.seed, distance: pos.distanceToSquared(camera.position) };
        });
        // Back-to-front within the single instanced draw prevents harsh overlapping squares.
        entries.sort((a, b) => b.distance - a.distance);
        entries.forEach((p, i) => {
            attributes.center.setXYZ(i, p.pos.x, p.pos.y, p.pos.z);
            for (const name of ['size', 'heat', 'alpha', 'seed']) attributes[name].setX(i, p[name]);
        });
        for (const name of ['center', 'size', 'heat', 'alpha', 'seed']) attributes[name].needsUpdate = true;
        this.cloud.material.uniforms.time.value = t;
    }

    reset() {
        if (!this.active) return;
        for (const [mesh, state] of this.snapshots) {
            mesh.visible = state.visible;
            if (state.matrix) { mesh.instanceMatrix.array.set(state.matrix); mesh.instanceMatrix.needsUpdate = true; }
        }
        this.group.traverse(mesh => { mesh.geometry?.dispose(); mesh.material?.dispose(); });
        this.scene.remove(this.group);
        if (this.audio) { void this.audio.close(); this.audio = null; }
        this.targets = []; this.fragments = []; this.snapshots.clear();
        this.active = false; this.age = 0; this.destroyed = 0;
        const flash = document.getElementById('finale-flash');
        if (flash) flash.style.opacity = '0';
    }
}

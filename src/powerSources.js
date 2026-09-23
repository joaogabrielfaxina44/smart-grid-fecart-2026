import * as THREE from 'three';
import { materials, unitBoxGeometry, groundLightPoolTexture } from './sharedAssets.js';
import { cityGroup, backendNodePositions, windTurbines } from './sceneState.js';

// Procedural exhibition models, inspired by Cattenom, São Gonçalo and Chafariz.
// Coordinates are local metres in the miniature. Electrical ratings stay in the graph.
export const energySources = new Map();
const cylinder = new THREE.CylinderGeometry(1, 1, 1, 16);
const thinBeam = new THREE.CylinderGeometry(1, 1, 1, 6);
const sphere = new THREE.SphereGeometry(1, 16, 10);
const ring = new THREE.TorusGeometry(1, 0.025, 6, 48);
const panelGeo = new THREE.PlaneGeometry(1, 1);
panelGeo.rotateX(-Math.PI / 2);
const white = new THREE.MeshStandardMaterial({ color: 0xe6e9e4, roughness: 0.68 });
const concrete = new THREE.MeshStandardMaterial({ color: 0xb8b8ab, roughness: 0.9 });
const steel = new THREE.MeshStandardMaterial({ color: 0x71818b, roughness: 0.5, metalness: 0.55 });
const graphite = new THREE.MeshStandardMaterial({ color: 0x293d47, roughness: 0.7 });
const teal = new THREE.MeshStandardMaterial({ color: 0x207f85, roughness: 0.6 });
const gravel = new THREE.MeshStandardMaterial({ color: 0xb0aa93, roughness: 1 });
const grass = new THREE.MeshStandardMaterial({ color: 0x668653, roughness: 1 });
const asphalt = new THREE.MeshStandardMaterial({ color: 0x434e52, roughness: 1 });
const water = new THREE.MeshStandardMaterial({ color: 0x537c85, roughness: 0.3, metalness: 0.25 });
const amber = new THREE.MeshStandardMaterial({ color: 0xf6c563, roughness: 0.5 });
const warning = new THREE.MeshStandardMaterial({ color: 0xc85e49, roughness: 0.6 });

function solarTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#7e9eac'; ctx.fillRect(0, 0, 256, 256);
    ctx.fillStyle = '#102e50'; ctx.fillRect(4, 4, 248, 248);
    for (let y = 0; y < 10; y++) for (let x = 0; x < 6; x++) {
        ctx.fillStyle = (x + y) % 3 ? '#174368' : '#1b4b71';
        ctx.fillRect(8 + x * 40, 8 + y * 24, 38, 22);
        ctx.fillStyle = '#47758e';
        ctx.fillRect(19 + x * 40, 8 + y * 24, 1, 22);
        ctx.fillRect(33 + x * 40, 8 + y * 24, 1, 22);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
}
const cells = solarTexture();
const photovoltaic = new THREE.MeshStandardMaterial({ map: cells, color: 0xffffff, metalness: 0.28, roughness: 0.38, side: THREE.DoubleSide });
// The same texture gives rooftop microgeneration a visible cell pattern.
materials.solar.map = cells;
materials.solar.color.setHex(0xffffff);
materials.solar.metalness = 0.28;
materials.solar.roughness = 0.38;
materials.solar.emissive.setHex(0x000000);

// One draw call per geometry/material pair per site, including small fittings.
class SiteBuilder {
    constructor(group) { this.group = group; this.batches = new Map(); this.dummy = new THREE.Object3D(); }
    part(geo, mat, x, y, z, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0) {
        const key = `${geo.uuid}/${mat.uuid}`;
        if (!this.batches.has(key)) this.batches.set(key, { geo, mat, matrices: [] });
        this.dummy.position.set(x, y, z); this.dummy.scale.set(sx, sy, sz);
        this.dummy.rotation.set(rx, ry, rz); this.dummy.updateMatrix();
        this.batches.get(key).matrices.push(this.dummy.matrix.clone());
    }
    box(mat, x, y, z, w, h, d, rx = 0, ry = 0, rz = 0) { this.part(unitBoxGeometry, mat, x, y, z, w, h, d, rx, ry, rz); }
    beam(mat, a, b, radius = 0.18) {
        const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b);
        const direction = end.clone().sub(start);
        const geo = radius < 0.5 ? thinBeam : cylinder;
        const key = `${geo.uuid}/${mat.uuid}`;
        if (!this.batches.has(key)) this.batches.set(key, { geo, mat, matrices: [] });
        this.dummy.position.copy(start).add(end).multiplyScalar(0.5);
        this.dummy.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize());
        this.dummy.scale.set(radius, direction.length(), radius); this.dummy.updateMatrix();
        this.batches.get(key).matrices.push(this.dummy.matrix.clone());
    }
    flush() {
        for (const {geo, mat, matrices} of this.batches.values()) {
            const mesh = new THREE.InstancedMesh(geo, mat, matrices.length);
            matrices.forEach((m,i) => mesh.setMatrixAt(i,m));
            mesh.instanceMatrix.needsUpdate = true;
            mesh.castShadow = mat !== water && !mat.transparent && !mat.emissive?.getHex();
            mesh.receiveShadow = true;
            mesh.computeBoundingSphere();
            mesh.matrixAutoUpdate = false;
            this.group.add(mesh);
        }
    }
}

function site(block, title, width, depth, accent, subtitle) {
    const group = new THREE.Group();
    group.name = `${block.type}-${block.index}`;
    group.position.set(block.x, 0, block.z);
    group.lookAt(0, 0, 0);
    group.userData.backendId = block.backendId;
    group.userData.isEnergySource = true;
    group.userData.title = title;
    group.userData.description = subtitle;
    group.userData.footprint = { width, depth };
    group.userData.focusTarget = new THREE.Vector3(0, block.type === 'power_plant' ? 27 : 16, 0);
    group.userData.focusCamera = new THREE.Vector3(width * 0.8, width * 0.78, depth * 1.05);
    group.userData.steamOutlets = [];
    group.userData.lampMaterial = new THREE.MeshStandardMaterial({color:0xffe5aa,emissive:0xffc875,emissiveIntensity:0.15});
    group.userData.statusMaterial = new THREE.MeshStandardMaterial({color:accent,emissive:accent,emissiveIntensity:0.4});
    group.userData.poolMaterial = new THREE.MeshBasicMaterial({map:groundLightPoolTexture,color:0xffd89a,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending});
    cityGroup.add(group);
    energySources.set(block.backendId, group);
    const b = new SiteBuilder(group);
    b.box(concrete, 0, 0.18, 0, width + 2, 0.35, depth + 2);
    b.box(block.type === 'wind_farm' ? grass : gravel, 0, 0.4, 0, width, 0.15, depth);
    // Perimeter with an open entrance on the city-facing side.
    for (let x = -width/2; x <= width/2; x += 8) {
        for (const z of [-depth/2, depth/2]) {
            if (z > 0 && Math.abs(x) < 7) continue;
            b.box(steel, x, 1.8, z, 0.2, 3, 0.2);
        }
    }
    for (let z = -depth/2; z <= depth/2; z += 8) for (const x of [-width/2,width/2]) b.box(steel,x,1.8,z,0.2,3,0.2);
    for (const h of [1.15,2.5]) {
        b.box(steel,0,h,-depth/2,width,0.09,0.09);
        b.box(steel,-width/2,h,0,0.09,0.09,depth);
        b.box(steel,width/2,h,0,0.09,0.09,depth);
        for (const side of [-1,1]) b.box(steel,side*(width/4+3),h,depth/2,width/2-6,0.09,0.09);
    }
    b.box(asphalt,0,0.52,depth/2-12,width-12,0.12,9);
    b.box(asphalt,0,0.52,depth/2+9,9,0.12,30);
    // The access road actually reaches the existing outer city intersection.
    const intersectionDistance = Math.hypot(block.x - Math.sign(block.x)*225, block.z - Math.sign(block.z)*225);
    const accessStart = depth/2+24;
    const accessLength = Math.max(0, intersectionDistance-accessStart);
    if (accessLength > 0) {
        b.box(asphalt,0,0.29,accessStart+accessLength/2,9,0.12,accessLength,Math.atan2(0.46,accessLength));
        for(let dz=4;dz<accessLength-2;dz+=9) b.box(white,0,0.58-dz/accessLength*0.46,accessStart+dz,0.15,0.02,3);
    }
    for (let x=-width/2+10;x<width/2-8;x+=10) b.box(white,x,0.6,depth/2-12,3,0.02,0.18);
    for (let x=-width/2+9;x<width/2;x+=28) {
        b.box(graphite,x,4,depth/2-5,0.3,7,0.3);
        b.box(steel,x,7.4,depth/2-6,0.35,0.25,2.2);
        b.box(group.userData.lampMaterial,x,7.3,depth/2-7,1.2,0.18,0.75);
        b.part(panelGeo,group.userData.poolMaterial,x,0.64,depth/2-9,16,1,18);
    }
    building(b, -19, depth/2-6, 12, 5, 7, teal);
    // Low planted beds and parked service vehicles give the site a human scale.
    for(const side of [-1,1]) {
        const x=side*(width/2-6);
        b.box(concrete,x,0.7,depth/2-22,5,0.5,12);
        for(let z=depth/2-27;z<depth/2-16;z+=3) b.part(sphere,grass,x,1.6,z,1.8,1.1,1.8);
    }
    for(const x of [-42,-36]) {
        const z=depth/2-21;
        b.box(white,x,1.25,z,2.2,1.3,4.5);
        b.box(graphite,x,2.0,z-0.3,2,0.6,2.5);
        for(const dx of [-1.15,1.15]) for(const dz of [-1.35,1.35]) b.part(cylinder,graphite,x+dx,0.9,z+dz,0.45,0.3,0.45,0,0,Math.PI/2);
    }
    b.box(warning,0,2,depth/2+1,9,0.28,0.28);
    for(let x=-4;x<5;x+=2) b.box(white,x,2.01,depth/2+1,0.8,0.3,0.3);
    sign(group,b,title,subtitle,accent,28,depth/2-1);
    return {group,b};
}

function sign(group,b,title,subtitle,accent,x,z) {
    const canvas=document.createElement('canvas'); canvas.width=1024;canvas.height=224;
    const ctx=canvas.getContext('2d');
    ctx.fillStyle='#152e3a';ctx.fillRect(0,0,1024,224);
    ctx.fillStyle=`#${accent.toString(16).padStart(6,'0')}`;ctx.fillRect(0,0,12,224);
    ctx.fillStyle='#eaf3f0';ctx.font='bold 63px Segoe UI, sans-serif';ctx.fillText(title.toUpperCase(),42,94);
    ctx.fillStyle='#adcad0';ctx.font='28px Segoe UI, sans-serif';ctx.fillText(subtitle,44,153);
    ctx.font='20px Segoe UI, sans-serif';ctx.fillText('FECART  /  REDE INTELIGENTE',44,195);
    const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;
    const board=new THREE.Mesh(new THREE.PlaneGeometry(37,8.1),new THREE.MeshBasicMaterial({map,side:THREE.DoubleSide}));
    board.position.set(x,7,z);group.add(board);
    b.box(graphite,x,7,z-0.2,37.4,8.5,0.4);
    for(const dx of [-14,14]) b.box(steel,x+dx,2.7,z,0.4,5.4,0.4);
}

function building(b,x,z,w,h,d,color=white) {
    b.box(color,x,h/2+0.5,z,w,h,d);
    b.box(graphite,x,h+0.65,z,w+0.8,0.45,d+0.8);
    b.box(teal,x,h*0.72,z+d/2+0.03,w,0.8,0.1);
    for(let dx=-w/2+2;dx<w/2-1;dx+=3) b.box(graphite,x+dx,h*0.55,z+d/2+0.09,1.5,1.2,0.12);
    b.box(steel,x+w/3,2,z+d/2+0.1,2.4,3,0.15);
    for(let dx=-w/2+2;dx<w/2-1;dx+=5) {
        b.box(steel,x+dx,h+1.1,z,2.4,0.8,2);
        for(let dz=-0.7;dz<=0.7;dz+=0.35) b.box(graphite,x+dx,h+1.52,z+dz,2,0.05,0.1);
    }
}

function switchyard(b,group,x,z,w=32,d=25) {
    b.box(concrete,x,0.7,z,w,0.4,d);
    for (const dx of [-w/4,w/4]) {
        b.box(graphite,x+dx,2.6,z,6,3.6,6);
        b.part(cylinder,steel,x+dx,5,z,1,6,1,0,0,Math.PI/2);
        for(let i=-3;i<=3;i++) for(const side of [-1,1]) b.box(steel,x+dx+i*0.65,2.7,z+side*3.4,0.22,3.5,1.2);
        for(const s of [-1,0,1]) {
            b.part(cylinder,white,x+dx+s*1.7,6.3,z,0.32,2.8,0.32);
            for(let h=5.4;h<7.5;h+=0.36) b.part(cylinder,white,x+dx+s*1.7,h,z,0.55,0.14,0.55);
        }
    }
    const terminalZ=z+d/2-1;
    for(const dx of [-w/2+2,w/2-2]) {
        b.box(steel,x+dx,6.5,terminalZ,0.55,12,0.55);
        b.beam(steel,[x+dx-1.4,0.8,terminalZ],[x+dx,12,terminalZ]);
    }
    b.box(steel,x,12.5,terminalZ,w-3,0.6,0.6);
    for(const dx of [-5,0,5]) b.part(cylinder,white,x+dx,11.5,terminalZ,0.4,1.6,0.4);
    b.box(group.userData.statusMaterial,x,12.95,terminalZ,2.2,0.24,0.7);
    const anchor=new THREE.Object3D();anchor.name='grid_connection';anchor.position.set(x,12.5,terminalZ);group.add(anchor);
    group.userData.gridConnection=anchor;
}

function finish(group,b) {
    b.flush();group.updateWorldMatrix(true,true);
    backendNodePositions[group.userData.backendId]=group.userData.gridConnection.getWorldPosition(new THREE.Vector3());
    return group;
}

function coolingTowerGeometry() {
    const points=[];
    const radius=t=>10.3*Math.sqrt(1+((t-0.7)/0.5)**2);
    for(let i=0;i<=32;i++) points.push(new THREE.Vector2(radius(i/32),6+i/32*82));
    for(let i=32;i>=0;i--) points.push(new THREE.Vector2(radius(i/32)-0.6,6+i/32*82));
    points.push(points[0].clone());
    return new THREE.LatheGeometry(points,48);
}
const coolingGeo=coolingTowerGeometry();
const domeGeo=new THREE.SphereGeometry(1,32,16,0,Math.PI*2,0,Math.PI/2);

export function createPowerPlant(block) {
    const {group,b}=site(block,'Central nuclear',182,160,0x74c6bf,'Calor → vapor → turbina → eletricidade');
    for(const x of [-29,29]) {
        const z=-38;
        b.part(cylinder,concrete,x,1.4,z,19,1.8,19);
        b.part(cylinder,water,x,2.4,z,17.8,0.16,17.8);
        b.part(coolingGeo,concrete,x,0,z);
        for(let i=0;i<20;i++) {
            const a=i*Math.PI/10;
            b.beam(concrete,[x+18*Math.cos(a),2,z+18*Math.sin(a)],[x+17.7*Math.cos(a+0.08),6.2,z+17.7*Math.sin(a+0.08)],0.38);
        }
        const topRadius=10.3*Math.sqrt(1+(0.3/0.5)**2);
        b.part(ring,white,x,88,z,topRadius,topRadius,topRadius,Math.PI/2);
        b.part(ring,concrete,x,6.2,z,17.6,17.6,17.6,Math.PI/2);
        // Mouth is open; emitter remains attached under every site transform.
        const outlet=new THREE.Object3D();outlet.position.set(x,88.5,z);group.add(outlet);group.userData.steamOutlets.push(outlet);
        b.beam(steel,[x,3,z+19],[x,3,7],1.25);
        b.beam(steel,[x,3,7],[0,3,7],1.25);
    }
    b.part(cylinder,concrete,-51,14,18,13,27,13);
    b.part(domeGeo,white,-51,27.5,18,13,10,13);
    b.part(ring,teal,-51,22,18,13.1,13.1,13.1,Math.PI/2);
    building(b,-8,23,50,16,29);
    b.box(teal,-8,12.5,38,50,2.6,0.25);
    for(let i=0;i<12;i++) b.box(steel,-31+i*4.2,8,37.7,0.18,14,0.2);
    b.box(graphite,-8,17,23,42,0.6,4);
    building(b,-47,45,25,7,11,teal);
    switchyard(b,group,53,29,42,32);
    for(const z of [-18,0,18,36]) b.box(asphalt,-77,0.6,z,8,0.15,19);
    for(const x of [34,48,62]) {
        b.box(white,x,0.6,56,0.15,0.06,5);
        b.box(white,x+4,0.6,58.5,8,0.06,0.15);
    }
    return finish(group,b);
}

export function createSolarFarm(block) {
    const {group,b}=site(block,'Parque solar',180,158,0xf2cb73,'Luz do sol → eletricidade');
    const tilt=Math.PI/8;
    // Three sectors, each with 6 columns x 15 rows = 270 framed tables.
    for(let sector=0;sector<3;sector++) {
        const bankX=(sector-1)*54;
        b.box(asphalt,bankX,0.54,39,47,0.12,5);
        for(let row=0;row<15;row++) for(let col=0;col<6;col++) {
            const x=bankX+(col-2.5)*7.3,z=-66+row*6.8,y=3;
            b.box(steel,x,y,z,6.9,0.18,4.7,tilt);
            b.part(panelGeo,photovoltaic,x,y+0.105,z+0.045,6.65,1,4.45,tilt);
            for(const dx of [-2.3,2.3]) {
                b.box(steel,x+dx,1.45,z+1.5,0.14,2,0.14);
                b.box(steel,x+dx,2.0,z-1.5,0.14,3.1,0.14);
                b.beam(steel,[x+dx,0.5,z+1.5],[x+dx,3.6,z-1.5],0.065);
            }
        }
        building(b,bankX,47,9,3.5,4,white);
        b.box(amber,bankX+3,2,49.1,0.9,1.4,0.1);
    }
    switchyard(b,group,56,58,28,17);
    building(b,-53,57,22,6,8,teal);
    for(const x of [-81,-27,27,81]) b.box(gravel,x,0.57,-17,4,0.06,104);
    group.userData.panelTables=270;
    return finish(group,b);
}

function bladeGeometry() {
    const shape=new THREE.Shape();
    shape.moveTo(-0.32,0.7);shape.lineTo(-1.0,3);shape.bezierCurveTo(-1.6,7,-0.65,17,0.8,25);
    shape.bezierCurveTo(1.35,20,1.6,10,1.2,5);shape.lineTo(0.38,0.7);shape.closePath();
    const geo=new THREE.ExtrudeGeometry(shape,{depth:0.18,bevelEnabled:true,bevelThickness:0.08,bevelSize:0.1,bevelSegments:1,steps:1,curveSegments:8});
    geo.translate(0,0,-0.09);return geo;
}
const bladeGeo=bladeGeometry();
const towerGeo=new THREE.CylinderGeometry(0.85,1.7,58,24);
export function createWindFarm(block) {
    const {group,b}=site(block,'Parque eólico',220,196,0x9bd6cf,'Vento → movimento → eletricidade');
    for(let row=0;row<3;row++) {
        const z=-65+row*55;
        b.box(gravel,0,0.55,z+5,199,0.12,5);
        for(let col=0;col<3;col++) {
            const x=(col-1)*65+(row%2?8:0);
            b.part(cylinder,concrete,x,0.9,z,5.5,1.0,5.5);
            b.part(towerGeo,white,x,29.5,z);
            for(const h of [1.7,20,39]) b.part(ring,steel,x,h,z,1.7-h/58*0.85,1.7-h/58*0.85,1.7-h/58*0.85,Math.PI/2);
            b.box(teal,x,2.1,z+1.65,1.15,2.8,0.13);
            b.box(concrete,x,0.7,z+2.5,1.8,0.35,2);
            b.box(white,x,59,z-0.4,3.5,3.2,7);
            b.part(sphere,white,x,59,z-3.8,1.75,1.6,1.2);
            b.box(teal,x,59,z+3.16,3.1,0.8,0.1);
            for(let i=0;i<6;i++) b.box(graphite,x+1.78,59,z-2.3+i*0.65,0.06,1.5,0.22);
            b.box(steel,x,61.4,z-1,0.1,1.8,0.1);
            b.box(warning,x,62.4,z-1,0.28,0.3,0.28);
            const rotor=new THREE.Group();rotor.position.set(x,59,z+3.9);
            rotor.rotation.z=(row*3+col)*0.73;
            rotor.userData.backendId=block.backendId;
            const hub=new THREE.Mesh(sphere,white);hub.scale.set(1.55,1.55,2);rotor.add(hub);
            for(let j=0;j<3;j++) {
                const blade=new THREE.Mesh(bladeGeo,white);blade.rotation.z=j*Math.PI*2/3;blade.castShadow=true;rotor.add(blade);
            }
            group.add(rotor);windTurbines.push(rotor);
            b.box(teal,x+6,1.6,z,2,2.2,3);
        }
    }
    b.box(gravel,-97,0.55,-8,5,0.12,147);
    switchyard(b,group,65,73,32,20);
    building(b,-54,76,24,5,9,teal);
    return finish(group,b);
}

const worldPoint=new THREE.Vector3();
export function updateEnergySources(delta, nightFactor, grafo, estado, vfxManager) {
    for(const [id,group] of energySources) {
        const node=grafo?.nodes.get(id);
        const connected=!!node?.status_energizado && !node.em_corte_emergencia;
        const active=connected && (node.is_subestacao || node.demanda_kw_atual < 0);
        group.userData.lampMaterial.emissiveIntensity=connected ? 0.15+nightFactor*1.7 : 0;
        group.userData.poolMaterial.opacity=connected ? nightFactor*0.45 : 0;
        group.userData.statusMaterial.emissiveIntensity=active ? 0.65 : 0;
        group.userData.statusMaterial.color.setHex(!connected ? 0xb65b4a : active ? 0x59cfba : 0x657884);
        if(group.userData.steamOutlets.length && active) {
            group.userData.steamTimer=(group.userData.steamTimer || 0)+delta;
            if(group.userData.steamTimer>0.8) {
                group.userData.steamTimer=0;
                for(const outlet of group.userData.steamOutlets) vfxManager.emitNuclearSteam(outlet.getWorldPosition(worldPoint),1);
            }
        }
    }
    const windFactor={ensolarado:0.4,nublado:0.6,chuvoso:0.8,tempestade:0}[estado?.clima] ?? 0.4;
    for(const rotor of windTurbines) {
        const node=grafo?.nodes.get(rotor.userData.backendId);
        const target=node?.status_energizado && !node.em_corte_emergencia ? windFactor*1.2 : 0;
        rotor.userData.angularSpeed=THREE.MathUtils.damp(rotor.userData.angularSpeed ?? target,target,2,delta);
        rotor.rotation.z+=delta*rotor.userData.angularSpeed;
    }
}

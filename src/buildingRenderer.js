import * as THREE from 'three';
import { materials, unitBoxGeometry } from './sharedAssets.js';

export const allFacadeMaterials = [];

export const sharedFacadeMaterials = {
    residential: [],
    office: [],
    glass: [],
    shop: [],
    industrial: []
};

export function initSharedFacadeMaterials(maxAnisotropy = 1) {
    const wallColors = {
        residential: ['#d6c9b2', '#c8c1b0', '#e0d6c4', '#c5ad96'],
        office: ['#353e48', '#3f4954', '#a6abb2', '#49535f'],
        glass: ['#42627a', '#36536b', '#2a4458'],
        shop: ['#dcd2bf', '#c8bfa9', '#ded7c8'],
        industrial: ['#8c867c', '#989288', '#7c7a74']
    };

    const windowDayColors = ['#1a2938', '#14202c', '#223446', '#1c2d3e'];
    const litWindowColors = ['#ffd66b', '#ffbe42', '#ffe799', '#cce6ff', '#ffb03a'];
    const doorColor = '#3a2717';

    Object.keys(wallColors).forEach(type => {
        const pal = wallColors[type];
        pal.forEach((baseColor, idx) => {
            const cw = 256;
            const ch = 256;

            const canvas = document.createElement('canvas');
            canvas.width = cw;
            canvas.height = ch;
            const ctx = canvas.getContext('2d');

            const canvasEmissive = document.createElement('canvas');
            canvasEmissive.width = cw;
            canvasEmissive.height = ch;
            const ctxEm = canvasEmissive.getContext('2d');

            ctx.fillStyle = baseColor;
            ctx.fillRect(0, 0, cw, ch);

            ctxEm.fillStyle = '#000000';
            ctxEm.fillRect(0, 0, cw, ch);

            if (type === 'residential') {
                ctx.fillStyle = 'rgba(0,0,0,0.12)';
                ctx.fillRect(0, ch - 12, cw, 12);
                ctx.fillRect(0, 0, cw, 6);

                const drawDoor = (dx, dy, dw = 40, dh = 75) => {
                    ctx.fillStyle = doorColor;
                    ctx.fillRect(dx, dy, dw, dh);
                    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
                    ctx.lineWidth = 2;
                    ctx.strokeRect(dx, dy, dw, dh);
                    ctx.fillStyle = '#f59e0b';
                    ctx.beginPath();
                    ctx.arc(dx + dw * 0.78, dy + dh * 0.55, 3, 0, Math.PI * 2);
                    ctx.fill();
                };

                const drawResidentialWin = (wx, wy, ww = 52, wh = 60, isLit = false, glowColor = '#ffd269') => {
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(wx - 3, wy - 3, ww + 6, wh + 6);
                    ctx.fillStyle = isLit ? '#2a3b4c' : windowDayColors[idx % windowDayColors.length];
                    ctx.fillRect(wx, wy, ww, wh);
                    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
                    ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    ctx.moveTo(wx + ww / 2, wy);
                    ctx.lineTo(wx + ww / 2, wy + wh);
                    ctx.moveTo(wx, wy + wh / 2);
                    ctx.lineTo(wx + ww, wy + wh / 2);
                    ctx.stroke();

                    if (isLit) {
                        ctxEm.fillStyle = glowColor;
                        ctxEm.fillRect(wx, wy, ww, wh);
                        ctxEm.fillStyle = 'rgba(0,0,0,0.15)';
                        ctxEm.fillRect(wx + ww / 2 - 1, wy, 2, wh);
                        ctxEm.fillRect(wx, wy + wh / 2 - 1, ww, 2);
                    }
                };

                if (idx % 4 === 0) {
                    drawDoor(40, 160, 44, 78);
                    drawResidentialWin(140, 50, 54, 64, true, '#ffd67a');
                } else if (idx % 4 === 1) {
                    drawDoor(36, 160, 44, 78);
                    drawResidentialWin(148, 168, 54, 58, false);
                    drawResidentialWin(96, 50, 54, 64, true, '#ffa834');
                } else if (idx % 4 === 2) {
                    drawDoor(106, 160, 44, 78);
                    drawResidentialWin(101, 50, 54, 64, true, '#ffe18f');
                } else {
                    drawDoor(106, 160, 44, 78);
                    drawResidentialWin(42, 50, 50, 62, true, '#ffd269');
                    drawResidentialWin(164, 50, 50, 62, false);
                }
            } else {
                const isGlass = type === 'glass';
                const isShop = type === 'shop';
                const isIndustrial = type === 'industrial';

                const cols = isGlass ? 6 : (isShop ? 3 : (isIndustrial ? 3 : 5));
                const rows = isGlass ? 8 : (isShop ? 4 : (isIndustrial ? 3 : 6));
                const ww = Math.round(cw / cols * 0.62);
                const wh = Math.round(ch / rows * 0.58);
                const spX = Math.round(cw / cols);
                const spY = Math.round(ch / rows);

                for (let r = 0; r <= rows; r++) {
                    ctx.fillStyle = 'rgba(0,0,0,0.18)';
                    ctx.fillRect(0, Math.round(r * spY), cw, 3);
                }

                for (let r = 0; r < rows; r++) {
                    for (let c = 0; c < cols; c++) {
                        const wx = Math.round(c * spX + (spX - ww) / 2);
                        const wy = Math.round(r * spY + (spY - wh) / 2);

                        const hash = (r * 7 + c * 13 + idx * 19) % 100;
                        let isLit = false;
                        let glowColor = litWindowColors[(r + c + idx) % litWindowColors.length];

                        if (isShop && r === rows - 1) {
                            isLit = true; 
                            glowColor = '#ffe394';
                        } else if (isGlass) {
                            isLit = hash < 45;
                        } else if (isIndustrial) {
                            isLit = hash < 22;
                        } else {
                            isLit = hash < 38;
                        }

                        ctx.fillStyle = isGlass ? '#213344' : windowDayColors[(r + c) % windowDayColors.length];
                        ctx.fillRect(wx, wy, ww, wh);
                        ctx.strokeStyle = isGlass ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.3)';
                        ctx.lineWidth = 1;
                        ctx.strokeRect(wx, wy, ww, wh);

                        if (isLit) {
                            ctxEm.fillStyle = glowColor;
                            ctxEm.fillRect(wx, wy, ww, wh);

                            if (!isGlass && hash % 2 === 0) {
                                ctxEm.fillStyle = 'rgba(0,0,0,0.2)';
                                ctxEm.fillRect(wx, wy + 2, ww, Math.round(wh * 0.35));
                            }
                        }
                    }
                }
            }

            const texture = new THREE.CanvasTexture(canvas);
            texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
            texture.colorSpace = THREE.SRGBColorSpace;
            texture.generateMipmaps = true;
            texture.minFilter = THREE.LinearMipmapLinearFilter;
            texture.magFilter = THREE.LinearFilter;
            texture.anisotropy = maxAnisotropy;

            const emissiveTexture = new THREE.CanvasTexture(canvasEmissive);
            emissiveTexture.wrapS = emissiveTexture.wrapT = THREE.RepeatWrapping;
            emissiveTexture.colorSpace = THREE.SRGBColorSpace;
            emissiveTexture.generateMipmaps = true;
            emissiveTexture.minFilter = THREE.LinearMipmapLinearFilter;
            emissiveTexture.magFilter = THREE.LinearFilter;
            emissiveTexture.anisotropy = maxAnisotropy;

            const isGlass = type === 'glass';
            const mat = new THREE.MeshStandardMaterial({
                map: texture,
                emissiveMap: emissiveTexture,
                emissive: new THREE.Color(0xffffff),
                emissiveIntensity: 0.0,
                roughness: isGlass ? 0.22 : 0.76,
                metalness: isGlass ? 0.15 : 0.02,
                transparent: isGlass,
                opacity: isGlass ? 0.92 : 1.0
            });

            sharedFacadeMaterials[type].push(mat);
            allFacadeMaterials.push(mat);
        });
    });
}

const blockFacadeMaterialsCache = new Map();

export function getBlockFacadeMaterial(type, seed, blockIndex = 0) {
    const key = `${blockIndex}_${type}_${seed % 4}`;
    if (!blockFacadeMaterialsCache.has(key)) {
        const list = sharedFacadeMaterials[type] || sharedFacadeMaterials.office;
        const mat = list[Math.abs(seed) % list.length].clone();
        blockFacadeMaterialsCache.set(key, mat);
        allFacadeMaterials.push(mat);
    }
    return blockFacadeMaterialsCache.get(key);
}

export function addBox({ width, height, depth, x, y = height / 2, z, material, parent, cast = true, receive = true, rotationY = 0 }) {
    const mesh = new THREE.Mesh(unitBoxGeometry, material);
    mesh.position.set(x, y, z);
    mesh.scale.set(width, height, depth);
    mesh.rotation.y = rotationY;
    mesh.castShadow = cast;
    mesh.receiveShadow = receive;
    mesh.matrixAutoUpdate = false;
    mesh.updateMatrix();
    parent.add(mesh);
    return mesh;
}

function createTiledBoxGeometry(w, h, d, tileW = 5, tileH = 6) {
    const geo = new THREE.BoxGeometry(w, h, d);
    const pos = geo.attributes.position;
    const uv = geo.attributes.uv;
    const norm = geo.attributes.normal;
    for (let i = 0; i < uv.count; i++) {
        const nx = Math.abs(norm.getX(i));
        const ny = Math.abs(norm.getY(i));
        const nz = Math.abs(norm.getZ(i));
        
        let u = uv.getX(i);
        let v = uv.getY(i);
        
        if (nx > 0.5) { // Right/Left
            uv.setXY(i, u * (d / tileW), v * (h / tileH));
        } else if (ny > 0.5) { // Top/Bottom
            uv.setXY(i, u * (w / tileW), v * (d / tileH));
        } else if (nz > 0.5) { // Front/Back
            uv.setXY(i, u * (w / tileW), v * (h / tileH));
        }
    }
    return geo;
}

export function addBuildingWithFacade({ width, height, depth, x, z, seed, type, parent, roofMaterial = null, blockIndex = 0 }) {
    const wallMat = getBlockFacadeMaterial(type, seed, blockIndex);
    const topMat = roofMaterial || materials.roofConcrete;
    const botMat = materials.sidewalk;

    const geo = createTiledBoxGeometry(width, height, depth, 6.0, 6.0);

    const mesh = new THREE.Mesh(geo, [wallMat, wallMat, topMat, botMat, wallMat, wallMat]);
    mesh.position.set(x, height / 2, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.matrixAutoUpdate = false;
    mesh.updateMatrix();
    parent.add(mesh);
    
    if (!parent.userData.facadeMaterials) parent.userData.facadeMaterials = new Set();
    parent.userData.facadeMaterials.add(wallMat);

    return mesh;
}

initSharedFacadeMaterials();

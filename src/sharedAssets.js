import * as THREE from 'three';

export const unitBoxGeometry = new THREE.BoxGeometry(1, 1, 1);
export const trunkGeometry = new THREE.CylinderGeometry(0.22, 0.28, 1.8, 7);
export const canopyGeometry = new THREE.SphereGeometry(1.1, 8, 6);
export const waterTankGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.9, 8);

export const materials = {
    terrain: new THREE.MeshStandardMaterial({ color: 0x708d63, roughness: 0.96 }),
    asphalt: new THREE.MeshStandardMaterial({ color: 0x2b2e32, roughness: 0.9 }),
    sidewalk: new THREE.MeshStandardMaterial({ color: 0xb8b3a9, roughness: 0.92 }),
    park: new THREE.MeshStandardMaterial({ color: 0x4f8a4c, roughness: 0.98 }),
    roofDark: new THREE.MeshStandardMaterial({ color: 0x555550, roughness: 0.86 }),
    roofConcrete: new THREE.MeshStandardMaterial({ color: 0x858a86, roughness: 0.88 }),
    roofTerracotta: new THREE.MeshStandardMaterial({ color: 0x9d5b3f, roughness: 0.9 }),
    hospitalWhite: new THREE.MeshStandardMaterial({ color: 0xe6e8e3, roughness: 0.72 }),
    hospitalRed: new THREE.MeshStandardMaterial({ color: 0xff0000, roughness: 0.58 }),
    concrete: new THREE.MeshStandardMaterial({ color: 0xa9aaa4, roughness: 0.76 }),
    industryWall: new THREE.MeshStandardMaterial({ color: 0x9c9688, roughness: 0.86 }),
    industryRoof: new THREE.MeshStandardMaterial({ color: 0x6e7778, roughness: 0.78 }),
    solar: new THREE.MeshStandardMaterial({ color: 0x1a3a5a, roughness: 0.1, metalness: 0.85 }),
    redLight: new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 2.0 }),
    darkConcrete: new THREE.MeshStandardMaterial({ color: 0x3d3d3d, roughness: 0.9, metalness: 0.1 }),
    whiteTurbine: new THREE.MeshStandardMaterial({ color: 0xf5f5f5, roughness: 0.2, metalness: 0.1 }),
    roadMarking: new THREE.MeshBasicMaterial({ color: 0xf2e7c9 }),
    trunk: new THREE.MeshStandardMaterial({ color: 0x73523b, roughness: 0.9 }),
    canopy: new THREE.MeshStandardMaterial({ color: 0x3f7944, roughness: 0.95 }),
    carRed: new THREE.MeshStandardMaterial({ color: 0xa84a3f, roughness: 0.52 }),
    carWhite: new THREE.MeshStandardMaterial({ color: 0xdad7ce, roughness: 0.48 }),
    carBlue: new THREE.MeshStandardMaterial({ color: 0x405c74, roughness: 0.52 }),
    carGray: new THREE.MeshStandardMaterial({ color: 0x777b7a, roughness: 0.52 })
};

export const detailMats = {
    balcony: new THREE.MeshStandardMaterial({ color: 0x8a8a86, roughness: 0.75 }),
    railing: new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.5, metalness: 0.3 }),
    acUnit: new THREE.MeshStandardMaterial({ color: 0xc8c8c4, roughness: 0.5 }),
    antenna: new THREE.MeshStandardMaterial({ color: 0x4a4a4a, roughness: 0.5, metalness: 0.3 }),
    waterTank: new THREE.MeshStandardMaterial({ color: 0x6a7a8a, roughness: 0.6, metalness: 0.15 }),
    ductwork: new THREE.MeshStandardMaterial({ color: 0x8a9090, roughness: 0.55, metalness: 0.2 }),
    ledge: new THREE.MeshStandardMaterial({ color: 0x9a9a96, roughness: 0.7 }),
    entranceFrame: new THREE.MeshStandardMaterial({ color: 0x5a5a5a, roughness: 0.5, metalness: 0.15 }),
    chimneyCap: new THREE.MeshStandardMaterial({ color: 0x8a6650, roughness: 0.85 }),
};

export const powerMats = {
    woodPole: new THREE.MeshStandardMaterial({ color: 0x584b3e, roughness: 0.85 }),
    metalArm: new THREE.MeshStandardMaterial({ color: 0x3d4146, roughness: 0.5, metalness: 0.4 }),
    transformer: new THREE.MeshStandardMaterial({ color: 0x32373d, roughness: 0.4, metalness: 0.5 }),
    streetLamp: new THREE.MeshStandardMaterial({ color: 0x22262b, roughness: 0.5 }),
    streetLampBulb: new THREE.MeshStandardMaterial({
        color: 0xffeaad,
        roughness: 0.2,
        emissive: 0xffa024,
        emissiveIntensity: 0.0
    }),
    // Fio normal nos postes (durante o dia, sem energia)
    wireNormal: new THREE.MeshBasicMaterial({ color: 0x2a2f35 }),
    // Fluxo normal de energia — azul ciano neon vibrante
    wireGlowing: new THREE.MeshBasicMaterial({ color: 0x00d2ff, transparent: true, opacity: 0.95 }),
    // Sobrecarga moderada (85-95%) — laranja âmbar
    wireOverload: new THREE.MeshBasicMaterial({ color: 0xf97316, transparent: true, opacity: 1.0 }),
    // Crítico (≥95%) — vermelho intenso pulsante
    wireCritical: new THREE.MeshBasicMaterial({ color: 0xff2020, transparent: true, opacity: 1.0 }),
    // Linha desativada / blackout — quase invisível, escuro
    wireBlackout: new THREE.MeshBasicMaterial({ color: 0x151820, transparent: true, opacity: 0.75 }),
    // Contingência da IA (self-healing) — ciano brilhante, distinto do normal
    wireHealing: new THREE.MeshBasicMaterial({ color: 0x00ffcc, transparent: true, opacity: 1.0 }),
};

export function createLightPoolTexture() {
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

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
}

export const groundLightPoolTexture = createLightPoolTexture();
export const groundLightPoolMaterial = new THREE.MeshBasicMaterial({
    map: groundLightPoolTexture,
    transparent: true,
    opacity: 0.0,
    blending: THREE.AdditiveBlending,
    depthWrite: false
});

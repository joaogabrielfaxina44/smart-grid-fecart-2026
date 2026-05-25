import * as THREE from 'three';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 10, 20);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const tamanhoDaCidade = 50;
const divisoes = 50;
const gridHelper = new THREE.GridHelper(tamanhoDaCidade, divisoes, 0x00ff00, 0x222222);
scene.add(gridHelper);

// ==========================================
// 6. ADICIONANDO ELEMENTOS DA CIDADE (CORRIGIDO)
// ==========================================

// Criando o Prédio da Usina Central (Com propriedade EMISSIVA para brilhar)
const geometriaUsina = new THREE.BoxGeometry(2, 4, 2); 
const materialUsina = new THREE.MeshStandardMaterial({ 
    color: 0x0055aa,         // Cor base quando iluminado de fora
    emissive: 0x00aaff,      // COR DO BRILHO INTERNO (Azul elétrico neon)
    emissiveIntensity: 1.5,  // Intensidade do brilho próprio da usina
    roughness: 0.1 
});
const usinaCentral = new THREE.Mesh(geometriaUsina, materialUsina);
usinaCentral.position.set(0, 2, 0); 
scene.add(usinaCentral);

// LUZ DA USINA: Uma lâmpada forte bem no topo dela para iluminar o chão em volta
const luzDaUsina = new THREE.PointLight(0x00aaff, 5, 15); // Cor, Intensidade, Distância do alcance
luzDaUsina.position.set(0, 4, 0); // Posicionada no topo do prédio azul
scene.add(luzDaUsina);

// Iluminação Geral do Ambiente (Deixamos um pouco mais escura para o brilho destacar)
const luzAmbiente = new THREE.AmbientLight(0xffffff, 0.2); // Diminuída de 0.6 para 0.2
scene.add(luzAmbiente);

const luzDirecional = new THREE.DirectionalLight(0xffffff, 0.5); // Sol mais fraco para contrastar
luzDirecional.position.set(10, 20, 10);
scene.add(luzDirecional);

// ==========================================
// 7. ESPALHANDO CASAS PELA CIDADE (TESTE)
// ==========================================

// Criando uma função para gerar casas em posições diferentes
function criarCasa(x, z) {
    // Corpo da casa (Cubo Vermelho)
    const geoCorpo = new THREE.BoxGeometry(1, 1, 1);
    const matCorpo = new THREE.MeshStandardMaterial({ color: 0xff3333 });
    const corpo = new THREE.Mesh(geoCorpo, matCorpo);
    
    // Telhado da casa (Cone Amarelo)
    const geoTelhado = new THREE.ConeGeometry(0.8, 0.6, 4);
    const matTelhado = new THREE.MeshStandardMaterial({ color: 0xffaa00 });
    const telhado = new THREE.Mesh(geoTelhado, matTelhado);
    
    // Posiciona o telhado em cima do corpo da casa
    telhado.position.y = 0.8;
    telhado.rotation.y = Math.PI / 4; // Gira o cone para alinhar com o cubo
    corpo.add(telhado);

    // Posiciona a casa inteira no chão (eixo X e Z)
    corpo.position.set(x, 0.5, z);
    scene.add(corpo);
}

// Agora escolhemos as coordenadas para brotar 4 casas no mapa
criarCasa(5, 5);
criarCasa(-5, 5);
criarCasa(5, -5);
criarCasa(-5, -5);

function animate() {
    requestAnimationFrame(animate);
    gridHelper.rotation.y += 0.001;
    renderer.render(scene, camera);
}
animate();

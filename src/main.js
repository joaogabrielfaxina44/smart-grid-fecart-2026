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
// 6. ADICIONANDO ELEMENTOS DA CIDADE (TESTE)
// ==========================================

// Criando o Prédio da Usina Central (Um cubo)
const geometriaUsina = new THREE.BoxGeometry(2, 4, 2); // Largura, Altura, Profundidade
const materialUsina = new THREE.MeshStandardMaterial({ 
    color: 0x00aaff, // Azul claro elétrico
    roughness: 0.2 
});
const usinaCentral = new THREE.Mesh(geometriaUsina, materialUsina);

// Posiciona a usina bem no centro do mapa, apoiada sobre a grade
usinaCentral.position.set(0, 2, 0); 
scene.add(usinaCentral);

// Criando a Iluminação do Cenário (Essencial para materiais Standard)
const luzAmbiente = new THREE.AmbientLight(0xffffff, 0.6); // Luz geral suave
scene.add(luzAmbiente);

const luzDirecional = new THREE.DirectionalLight(0xffffff, 1.0); // Luz estilo "Sol" para criar sombras
luzDirecional.position.set(10, 20, 10);
scene.add(luzDirecional);

function animate() {
    requestAnimationFrame(animate);
    gridHelper.rotation.y += 0.001;
    renderer.render(scene, camera);
}
animate();

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

function animate() {
    requestAnimationFrame(animate);
    gridHelper.rotation.y += 0.001;
    renderer.render(scene, camera);
}
animate();

import * as THREE from 'three';

// ==========================================
// 1. CONFIGURAÇÃO BASE DO AMBIENTE (ENGINE 3D)
// ==========================================
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020205); // Fundo noturno profundo

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 25, 35);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true; // Ativando cálculo de sombras reais
document.body.appendChild(renderer.domElement);

// O Chão da Cidade (A Grade Matrix)
const gridHelper = new THREE.GridHelper(80, 80, 0x00ff00, 0x113311);
scene.add(gridHelper);

// ==========================================
// 2. LUZES E CICLO DIA/NOITE
// ==========================================
const luzAmbiente = new THREE.AmbientLight(0xffffff, 0.3);
scene.add(luzAmbiente);

const sol = new THREE.DirectionalLight(0xffddaa, 1.5);
sol.castShadow = true;
scene.add(sol);

let tempoVirtual = 0; // Relógio da simulação

// ==========================================
// 3. CRIAÇÃO DOS MODELOS 3D BASE
// ==========================================
// Usina Central (O Coração do Smart Grid)
const geoUsina = new THREE.BoxGeometry(3, 8, 3);
const matUsina = new THREE.MeshStandardMaterial({ 
    color: 0x002244, emissive: 0x00aaff, emissiveIntensity: 0.8, roughness: 0.1, metalness: 0.9 
});
const usina = new THREE.Mesh(geoUsina, matUsina);
usina.position.set(0, 4, 0);
usina.castShadow = true;
scene.add(usina);

const luzUsina = new THREE.PointLight(0x00aaff, 10, 20);
luzUsina.position.set(0, 9, 0);
scene.add(luzUsina);

// ==========================================
// 4. ESTRUTURA DE DADOS E POVOAMENTO (A REDE)
// ==========================================
const nosDaRede = [];
const capacidadeMaximaUsina = 500; // kW

function criarNo(id, tipo, x, z, consumoBase, prioridade) {
    // Geometria
    const grupo = new THREE.Group();
    
    // Altura baseada no tipo (Hospitais são maiores, casas menores)
    const altura = tipo === 'Hospital' ? 3 : (tipo === 'Comercial' ? 4 : 1.5);
    const corpoGeo = new THREE.BoxGeometry(2, altura, 2);
    const corpoMat = new THREE.MeshStandardMaterial({ color: 0xa0a0a0, metalness: 0.8, roughness: 0.2 });
    const corpo = new THREE.Mesh(corpoGeo, corpoMat);
    corpo.position.y = altura / 2;
    corpo.castShadow = true;
    grupo.add(corpo);

    // Telhado (Painel Solar Emissivo)
    const telhadoGeo = new THREE.ConeGeometry(1.5, 1, 4);
    const telhadoMat = new THREE.MeshStandardMaterial({ color: 0x002244, emissive: 0xff5500, emissiveIntensity: 1.0 });
    const telhado = new THREE.Mesh(telhadoGeo, telhadoMat);
    telhado.position.y = altura + 0.5;
    telhado.rotation.y = Math.PI / 4;
    grupo.add(telhado);

    grupo.position.set(x, 0, z);
    scene.add(grupo);

    // Ocultando o objeto lógico de dados
    const dados = {
        id: id,
        tipo: tipo,
        prioridade: prioridade, // 1 (Máxima) a 3 (Baixa)
        consumoBase: consumoBase,
        consumoAtual: consumoBase,
        geracaoSolar: 0,
        status: "NORMAL", // NORMAL, ALERTA, CORTE
        malhaCorpo: corpoMat,
        malhaTelhado: telhadoMat
    };

    nosDaRede.push(dados);
}

// Povoando a cidade (Coordenadas X e Z)
criarNo("Hospital Central", "Hospital", -10, -10, 150, 1);
criarNo("Shopping Alpha", "Comercial", 10, -10, 120, 2);
criarNo("Bairro Norte", "Residencial", 0, -15, 80, 3);
criarNo("Bairro Sul", "Residencial", 0, 15, 90, 3);
criarNo("Bairro Leste", "Residencial", 15, 0, 85, 3);
criarNo("Bairro Oeste", "Residencial", -15, 0, 75, 3);

// ==========================================
// 5. INTERFACE DE TELEMETRIA (UI CYBERPUNK)
// ==========================================
// Injetando HTML direto pelo JavaScript para criar um Dashboard flutuante
const painelUI = document.createElement('div');
painelUI.style.position = 'absolute';
painelUI.style.top = '20px';
painelUI.style.left = '20px';
painelUI.style.color = '#00ff00';
painelUI.style.fontFamily = 'monospace';
painelUI.style.backgroundColor = 'rgba(0, 20, 0, 0.8)';
painelUI.style.padding = '20px';
painelUI.style.border = '1px solid #00ff00';
painelUI.style.borderRadius = '5px';
painelUI.style.pointerEvents = 'none'; // Não atrapalha o mouse
document.body.appendChild(painelUI);

// ==========================================
// 6. INTELIGÊNCIA ARTIFICIAL (SELF-HEALING) E LÓGICA
// ==========================================
function processarSmartGrid() {
    let demandaTotal = 0;
    let geracaoSolarTotal = 0;

    // 1. Atualizar Consumo Dinâmico e Geração Solar (Simulando a Física)
    const intensidadeSol = Math.max(0, Math.sin(tempoVirtual)); // De 0 (Noite) a 1 (Meio-dia)
    
    nosDaRede.forEach(no => {
        // O consumo varia levemente de forma caótica (ruído)
        const variacao = (Math.random() * 0.2 - 0.1); 
        no.consumoAtual = no.consumoBase * (1 + variacao);
        
        // Painéis geram energia se houver sol
        no.geracaoSolar = no.tipo === 'Hospital' ? 0 : (50 * intensidadeSol); 
        
        const cargaEfetiva = no.consumoAtual - no.geracaoSolar;
        
        demandaTotal += cargaEfetiva;
        geracaoSolarTotal += no.geracaoSolar;
    });

    // 2. Algoritmo de Decisão Ética (O Corte Inteligente)
    let falhaCritica = demandaTotal > capacidadeMaximaUsina;
    
    nosDaRede.forEach(no => {
        if (falhaCritica) {
            // A IA corta primeiro os residenciais (Prioridade 3) para salvar a rede
            if (no.prioridade === 3) {
                no.status = "CORTE";
                demandaTotal -= (no.consumoAtual - no.geracaoSolar); // Remove da carga da Usina
            } 
            // Se ainda assim faltar energia, coloca os comerciais em Alerta
            else if (no.prioridade === 2 && demandaTotal > capacidadeMaximaUsina) {
                 no.status = "ALERTA";
            }
            else {
                no.status = "NORMAL";
            }
        } else {
            // Rede estável
            no.status = "NORMAL";
        }

        // 3. Feedback Visual 3D baseado na decisão da IA
        if (no.status === "NORMAL") {
            no.malhaCorpo.color.setHex(0xa0a0a0);
            no.malhaTelhado.emissive.setHex(0xff5500); // Laranja Neon
        } else if (no.status === "ALERTA") {
            no.malhaCorpo.color.setHex(0xffff00); // Amarelo
            no.malhaTelhado.emissive.setHex(0xffff00);
        } else if (no.status === "CORTE") {
            no.malhaCorpo.color.setHex(0x111111); // Apagado
            no.malhaTelhado.emissive.setHex(0x000000); // Sem brilho
        }
    });

    // 4. Atualizar a Interface do Usuário
    let horaVirtual = Math.floor(((tempoVirtual % (Math.PI * 2)) / (Math.PI * 2)) * 24);
    let statusUsina = falhaCritica ? "<span style='color:red'>SOBRECARGA DETECTADA - IA ATIVADA</span>" : "ESTÁVEL";
    
    let html = `<h2>⚡ SMART GRID CONTROL CENTER</h2>`;
    html += `<b>Horário Virtual:</b> ${horaVirtual}h:00<br>`;
    html += `<b>Status da Usina:</b> ${statusUsina}<br>`;
    html += `<b>Capacidade Máxima:</b> ${capacidadeMaximaUsina.toFixed(1)} kW<br>`;
    html += `<b>Demanda da Cidade:</b> ${demandaTotal.toFixed(1)} kW<br>`;
    html += `<b>Geração Solar Distribuída:</b> ${geracaoSolarTotal.toFixed(1)} kW<br><br>`;
    html += `<h3>Monitoramento dos Nós:</h3>`;
    
    nosDaRede.forEach(no => {
        let corStatus = no.status === "NORMAL" ? "#00ff00" : (no.status === "ALERTA" ? "#ffff00" : "#ff0000");
        html += `<span style="color:${corStatus}">[${no.status}]</span> ${no.id} | Consumo: ${no.consumoAtual.toFixed(1)}kW | Solar: +${no.geracaoSolar.toFixed(1)}kW<br>`;
    });

    painelUI.innerHTML = html;
}

// ==========================================
// 7. LOOP DE RENDERIZAÇÃO E FÍSICA
// ==========================================
function animate() {
    requestAnimationFrame(animate);

    // O tempo passa rápido para vermos o ciclo do sol
    tempoVirtual += 0.005;

    // Movimentando o sol no céu virtual
    sol.position.x = Math.cos(tempoVirtual) * 40;
    sol.position.y = Math.sin(tempoVirtual) * 40;
    sol.position.z = Math.sin(tempoVirtual) * 20;

    // Rotação suave da usina para efeito visual
    usina.rotation.y += 0.002;
    gridHelper.rotation.y += 0.0005;

    // Acionando a Inteligência do Sistema
    processarSmartGrid();

    // Desenhando o quadro na tela
    renderer.render(scene, camera);
}

// Tratamento de Redimensionamento da Tela
window.addEventListener('resize', onWindowResize, false);
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Iniciar Simulação
animate();

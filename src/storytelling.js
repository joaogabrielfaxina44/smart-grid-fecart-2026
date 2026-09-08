export class StorytellingTour {
    constructor(camera, simulator, hudAlertContainer) {
        this.camera = camera;
        this.simulator = simulator;
        this.hudAlertContainer = hudAlertContainer;
        this.isActive = false;
        this.step = 0;
        this.timer = null;

        // Câmera posições (exemplo genérico para os bairros, com altura boa para ver o efeito)
        this.stops = [
            { pos: { x: -30, y: 35, z: 20 }, msg: "1. Agente de Horário de Pico entra em ação. As luzes acendem e a demanda residencial sobe rapidamente justificando o uso de redes inteligentes." },
            { pos: { x: 45, y: 25, z: -30 }, msg: "2. Geração Distribuída: Painéis solares começam a injetar energia limpa na rede, aliviando o estresse da Usina Central." },
            { pos: { x: 80, y: 40, z: 50 }, msg: "3. Sobrecarga detectada! O Agente de Resposta à Demanda atua cortando energia de partes da Indústria para proteger e priorizar o Hospital." },
            { pos: { x: 0, y: 50, z: -40 }, msg: "4. Uma tempestade rompe um cabo principal! O Agente Self-Healing calcula uma rota alternativa (Dijkstra) em milissegundos, isolando a falha." }
        ];
    }

    start() {
        if (this.isActive) return;
        this.isActive = true;
        this.step = 0;
        this.nextStep();
    }

    stop() {
        this.isActive = false;
        clearTimeout(this.timer);
        if (this.hudAlertContainer) {
            this.hudAlertContainer.innerHTML = '';
        }
    }

    nextStep() {
        if (!this.isActive || this.step >= this.stops.length) {
            this.stop();
            // Reset no fim
            document.getElementById('btn-reset')?.click();
            return;
        }

        const currentStop = this.stops[this.step];
        
        // Exibir Legenda
        if (this.hudAlertContainer) {
            this.hudAlertContainer.innerHTML = '';
            const dialog = document.createElement('div');
            dialog.className = 'hud-pill';
            dialog.style.backgroundColor = 'rgba(20, 20, 30, 0.9)';
            dialog.style.color = '#fff';
            dialog.style.padding = '15px';
            dialog.style.fontSize = '16px';
            dialog.style.maxWidth = '400px';
            dialog.style.textAlign = 'center';
            dialog.style.border = '1px solid #4da6ff';
            dialog.innerHTML = `<strong>Tour Guiada:</strong><br><br>${currentStop.msg}`;
            this.hudAlertContainer.appendChild(dialog);
        }

        // Voar Câmera (Isso deve integrar com a função smoothGlideTo do main.js)
        if (window.smoothGlideTo) {
            // Requer que a pos seja um THREE.Vector3
            window.smoothGlideTo(currentStop.pos);
        } else {
            // Fallback se smoothGlideTo não estiver exposto
            this.camera.position.set(currentStop.pos.x, currentStop.pos.y, currentStop.pos.z);
        }

        // Disparar Ações Específicas do Passo
        if (this.step === 0) {
            document.getElementById('btn-forcar-noite')?.click();
        } else if (this.step === 1) {
            // Volta pro dia pra ver o sol
            document.getElementById('btn-reset')?.click();
        } else if (this.step === 2) {
            document.getElementById('btn-sobrecarga')?.click();
        } else if (this.step === 3) {
            document.getElementById('btn-falha-usina')?.click();
        }

        this.step++;
        this.timer = setTimeout(() => this.nextStep(), 10000); // 10 segundos por parada
    }
}

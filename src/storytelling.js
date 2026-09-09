import * as THREE from 'three';
import { TOUR_SCRIPT } from './dialogs.js';

export class StorytellingTour {
    constructor(camera, simulator) {
        this.camera = camera;
        this.simulator = simulator;
        this.isActive = false;
        this.step = 0;
        this.typewriterInterval = null;
        this.isTyping = false;
        
        // UI Elements
        this.vnContainer = document.getElementById('vn-container');
        this.vnPortrait = document.getElementById('vn-portrait');
        this.vnName = document.getElementById('vn-name');
        this.vnText = document.getElementById('vn-text');
        this.btnNext = document.getElementById('vn-btn-next');
        
        this.minigameContainer = document.getElementById('minigame-container');
        this.mgBtnInd = document.getElementById('mg-btn-ind');
        this.mgBtnSol = document.getElementById('mg-btn-sol');
        this.mgBtnResolve = document.getElementById('mg-btn-resolve');
        
        this.btnNext?.addEventListener('click', () => {
            if (this.isTyping) {
                clearInterval(this.typewriterInterval);
                this.vnText.innerHTML = TOUR_SCRIPT[this.step].text;
                this.isTyping = false;
            } else {
                this.step++;
                this.playCurrentStep();
            }
        });

        this.mgState = { indCut: false, solOn: false };
        
        this.mgBtnInd?.addEventListener('click', () => {
            this.mgState.indCut = true;
            this.mgBtnInd.classList.add('mg-btn-clicked');
            this.mgBtnInd.innerText = 'CARGA CORTADA';
            this.mgBtnInd.disabled = true;
            this.checkMinigame();
        });
        
        this.mgBtnSol?.addEventListener('click', () => {
            this.mgState.solOn = true;
            this.mgBtnSol.classList.add('mg-btn-clicked');
            this.mgBtnSol.innerText = 'BATERIAS ATIVAS';
            this.mgBtnSol.disabled = true;
            this.checkMinigame();
        });
        
        this.mgBtnResolve?.addEventListener('click', () => {
            this.minigameContainer.classList.remove('active');
            this.step++;
            this.playCurrentStep();
        });
    }

    start() {
        if (this.isActive) return;
        this.isActive = true;
        this.step = 0;
        this.vnContainer.classList.add('active');
        this.playCurrentStep();
    }

    stop() {
        this.isActive = false;
        this.vnContainer.classList.remove('active');
        this.minigameContainer.classList.remove('active');
        clearInterval(this.typewriterInterval);
    }

    playCurrentStep() {
        if (!this.isActive || this.step >= TOUR_SCRIPT.length) {
            this.stop();
            document.getElementById('btn-reset')?.click();
            return;
        }

        const scriptData = TOUR_SCRIPT[this.step];
        
        // Update UI
        this.vnName.innerText = scriptData.speaker;
        
        // Character specific styling
        if (scriptData.speaker === 'Voltz') {
            this.vnName.className = 'vn-name voltz-name';
            this.vnContainer.className = 'vn-wrapper voltz-theme active';
        } else {
            this.vnName.className = 'vn-name beto-name';
            this.vnContainer.className = 'vn-wrapper beto-theme active';
        }
        
        this.vnPortrait.src = scriptData.portrait;
        
        // Typewriter effect
        this.isTyping = true;
        this.vnText.innerHTML = '';
        let charIndex = 0;
        clearInterval(this.typewriterInterval);
        
        this.typewriterInterval = setInterval(() => {
            this.vnText.innerHTML += scriptData.text.charAt(charIndex);
            charIndex++;
            if (charIndex >= scriptData.text.length) {
                clearInterval(this.typewriterInterval);
                this.isTyping = false;
            }
        }, 20); // Faster typing

        // Process Actions
        this.processAction(scriptData.action);
    }

    processAction(action) {
        if (!window.smoothGlideTo) return;
        
        // As posições são baseadas no mapa da maquete e nos tamanhos
        switch(action) {
            case 'look_center':
                document.getElementById('btn-reset')?.click(); // Limpa estado noturno
                window.smoothGlideTo(new THREE.Vector3(0, 40, 60), 0.3, 0);
                break;
            case 'look_center_zoom':
                window.smoothGlideTo(new THREE.Vector3(0, 20, 30), 0.2, 0);
                break;
            case 'look_residential':
                window.smoothGlideTo(new THREE.Vector3(25, 12, 10), -0.1, 0.4);
                break;
            case 'look_hospital':
                window.smoothGlideTo(new THREE.Vector3(-30, 15, -15), -0.2, -0.5);
                break;
            case 'look_commercial_top':
                window.smoothGlideTo(new THREE.Vector3(0, 35, 0), -1.5, 0); // Visão de cima
                break;
            case 'look_solar':
                window.smoothGlideTo(new THREE.Vector3(45, 12, -40), -0.1, -2.5); // Olhando pra fazenda solar
                break;
            case 'look_wind':
                window.smoothGlideTo(new THREE.Vector3(-45, 12, -40), -0.1, 2.5); // Olhando pra eólica
                break;
            case 'look_city_overview':
                window.smoothGlideTo(new THREE.Vector3(0, 60, 60), -0.6, 0); // Câmera no alto
                document.getElementById('btn-forcar-noite')?.click(); // Pra dar um efeito bonito da malha
                break;
            case 'break_plant':
                document.getElementById('btn-falha-usina')?.click();
                window.smoothGlideTo(new THREE.Vector3(0, 25, -20), -0.4, 0); // Foca no centro/subestação
                break;
            case 'shake_camera_hospital':
                window.smoothGlideTo(new THREE.Vector3(-30, 20, -5), -0.3, -0.3); // Foca no hospital em crise
                break;
            case 'start_minigame':
                this.vnContainer.classList.remove('active'); 
                this.minigameContainer.classList.add('active');
                
                this.mgState = { indCut: false, solOn: false };
                this.mgBtnInd.disabled = false;
                this.mgBtnInd.className = 'mg-btn mg-btn-danger';
                this.mgBtnInd.innerText = 'CORTAR CARGA';
                
                this.mgBtnSol.disabled = false;
                this.mgBtnSol.className = 'mg-btn mg-btn-solar';
                this.mgBtnSol.innerText = 'ATIVAR BATERIAS';
                
                this.mgBtnResolve.disabled = true;
                this.mgBtnResolve.className = 'mg-btn mg-btn-resolve disabled';
                break;
            case 'restore_power':
                this.vnContainer.classList.add('active');
                document.getElementById('btn-reset')?.click();
                window.smoothGlideTo(new THREE.Vector3(-30, 15, -15), -0.2, -0.5); // Foca no hospital feliz
                break;
            case 'end_tour':
                window.smoothGlideTo(new THREE.Vector3(0, 45, 55), -0.5, 0);
                break;
        }
    }

    checkMinigame() {
        if (this.mgState.indCut && this.mgState.solOn) {
            this.mgBtnResolve.disabled = false;
            this.mgBtnResolve.classList.remove('disabled');
            this.mgBtnResolve.classList.add('mg-btn-success');
        }
    }
}

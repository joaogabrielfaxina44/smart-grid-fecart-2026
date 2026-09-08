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
                // Skip typing
                clearInterval(this.typewriterInterval);
                this.vnText.innerHTML = TOUR_SCRIPT[this.step].text;
                this.isTyping = false;
            } else {
                this.step++;
                this.playCurrentStep();
            }
        });

        // Minigame State
        this.mgState = { indCut: false, solOn: false };
        
        this.mgBtnInd?.addEventListener('click', () => {
            this.mgState.indCut = true;
            this.mgBtnInd.style.background = '#444';
            this.mgBtnInd.innerText = 'CARGA CORTADA';
            this.mgBtnInd.disabled = true;
            this.checkMinigame();
        });
        
        this.mgBtnSol?.addEventListener('click', () => {
            this.mgState.solOn = true;
            this.mgBtnSol.style.background = '#444';
            this.mgBtnSol.innerText = 'BATERIAS ATIVAS';
            this.mgBtnSol.disabled = true;
            this.checkMinigame();
        });
        
        this.mgBtnResolve?.addEventListener('click', () => {
            this.minigameContainer.style.display = 'none';
            this.step++;
            this.playCurrentStep();
        });
    }

    start() {
        if (this.isActive) return;
        this.isActive = true;
        this.step = 0;
        this.vnContainer.style.display = 'flex';
        this.playCurrentStep();
    }

    stop() {
        this.isActive = false;
        this.vnContainer.style.display = 'none';
        this.minigameContainer.style.display = 'none';
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
        this.vnName.style.background = scriptData.speaker === 'Voltz' ? '#1d4ed8' : '#d97706';
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
        }, 30);

        // Process Actions
        this.processAction(scriptData.action);
    }

    processAction(action) {
        if (!window.smoothGlideTo) return;
        
        if (action === 'look_center') {
            document.getElementById('btn-reset')?.click();
            window.smoothGlideTo(new THREE.Vector3(0, 50, 40));
        } else if (action === 'look_city') {
            window.smoothGlideTo(new THREE.Vector3(45, 25, -30));
        } else if (action === 'look_solar') {
            window.smoothGlideTo(new THREE.Vector3(80, 40, 50));
        } else if (action === 'force_night') {
            document.getElementById('btn-forcar-noite')?.click();
        } else if (action === 'break_line') {
            document.getElementById('btn-falha-usina')?.click();
            window.smoothGlideTo(new THREE.Vector3(0, 60, 0));
        } else if (action === 'shake_camera') {
            // Optional: call VFX manager to shake if global
        } else if (action === 'start_minigame') {
            this.vnContainer.style.display = 'none'; // Esconde dialogo
            this.minigameContainer.style.display = 'block';
            
            // Reset minigame buttons
            this.mgState = { indCut: false, solOn: false };
            this.mgBtnInd.disabled = false;
            this.mgBtnInd.style.background = '#ff4444';
            this.mgBtnInd.innerText = 'CORTAR CARGA';
            
            this.mgBtnSol.disabled = false;
            this.mgBtnSol.style.background = '#eab308';
            this.mgBtnSol.innerText = 'ATIVAR BATERIAS';
            
            this.mgBtnResolve.disabled = true;
            this.mgBtnResolve.style.background = '#444';
            this.mgBtnResolve.style.color = '#888';
            this.mgBtnResolve.style.cursor = 'not-allowed';
        } else if (action === 'restore_power') {
            this.vnContainer.style.display = 'flex';
            document.getElementById('btn-reset')?.click();
            window.smoothGlideTo(new THREE.Vector3(20, 40, 30));
        } else if (action === 'end_tour') {
            // Final step, nothing special
        }
    }

    checkMinigame() {
        if (this.mgState.indCut && this.mgState.solOn) {
            this.mgBtnResolve.disabled = false;
            this.mgBtnResolve.style.background = '#22c55e'; // Green
            this.mgBtnResolve.style.color = '#fff';
            this.mgBtnResolve.style.cursor = 'pointer';
        }
    }
}

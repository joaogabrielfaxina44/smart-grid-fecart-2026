import * as THREE from 'three';

export const cityGroup = new THREE.Group();
cityGroup.name = 'Large Mixed Smart City';
cityGroup.matrixAutoUpdate = false;

export const powerGridObjects = [];
export const backendNodePositions = {};
export const windTurbines = [];

export const cityStats = {
    blocks: 0,
    houses: 0,
    midRises: 0,
    towers: 0,
    industrial: 0,
    parks: 0,
    hospitals: 0,
    trees: 0,
    cars: 0
};

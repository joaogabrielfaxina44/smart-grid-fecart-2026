import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';
import { readFile } from 'node:fs/promises';

const browser = await puppeteer.launch({
    executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true, args: ['--enable-webgl', '--ignore-certificate-errors', '--autoplay-policy=no-user-gesture-required']
});
try {
    const page = await browser.newPage();
    if (process.env.THREE_CACHE) {
        const module = await readFile(`${process.env.THREE_CACHE}/three.module.js`, 'utf8');
        const controls = await readFile(`${process.env.THREE_CACHE}/OrbitControls.js`, 'utf8');
        await page.setRequestInterception(true);
        page.on('request', request => {
            if (request.url().endsWith('/three.module.js')) void request.respond({ status: 200, contentType: 'application/javascript', headers: { 'Access-Control-Allow-Origin': '*' }, body: module });
            else if (request.url().endsWith('/controls/OrbitControls.js')) void request.respond({ status: 200, contentType: 'application/javascript', headers: { 'Access-Control-Allow-Origin': '*' }, body: controls });
            else void request.continue();
        });
    }
    await page.setViewport({ width: 1440, height: 900 });
    const errors = [];
    page.on('pageerror', error => { errors.push(error.message); console.error(error.message); });
    page.on('console', msg => { if (msg.type() === 'error') { errors.push(msg.text()); console.error(msg.text()); } });
    page.on('requestfailed', request => console.error('Request failed:', request.url(), request.failure()?.errorText));
    await page.goto(process.env.CITY_URL || 'http://127.0.0.1:8080', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction(() => window.smartCityStats && window.camera);
    await page.click('#finale-sound');
    const isolated = await page.evaluate(async () => {
        const THREE = await import('three');
        const { CityExplosion } = await import('/src/cityExplosion.js');
        const scene = new THREE.Scene();
        const geo = new THREE.BoxGeometry(8, 20, 8), mat = new THREE.MeshStandardMaterial();
        const near = new THREE.Mesh(geo, mat); near.position.set(10, 10, 0); scene.add(near);
        const far = new THREE.InstancedMesh(geo, mat, 1);
        far.setMatrixAt(0, new THREE.Matrix4().makeTranslation(220, 10, 0)); scene.add(far);
        const original = Array.from(far.instanceMatrix.array);
        const fx = new CityExplosion(scene), camera = new THREE.PerspectiveCamera();
        camera.position.set(350, 250, 400);
        const first = fx.trigger(), duplicate = fx.trigger();
        for (let i = 0; i < 60; i++) fx.update(1 / 60, camera);
        const wave = !near.visible && far.instanceMatrix.array[0] === 1;
        for (let i = 0; i < 2400; i++) fx.update(1 / 60, camera);
        const ruins = !near.visible && far.instanceMatrix.array[0] === 0;
        const settled = fx.fragments.every(f => f.settled && f.p.y >= 0);
        const finite = fx.debris.instanceMatrix.array.every(Number.isFinite);
        fx.reset();
        const restored = near.visible && original.every((v, i) => far.instanceMatrix.array[i] === v) && scene.children.length === 2;
        fx.trigger(); fx.update(0.5, camera); fx.reset();
        return { first, duplicate, wave, ruins, settled, finite, restored, replay: scene.children.length === 2 };
    });
    assert.deepEqual(isolated, { first: true, duplicate: false, wave: true, ruins: true, settled: true, finite: true, restored: true, replay: true });
    await page.screenshot({ path: 'scratch/finale-before.png' });
    await page.evaluate(async () => {
        const { cityGroup } = await import('/src/sceneState.js');
        window.finaleTestSnapshot = [];
        cityGroup.traverse(mesh => {
            if (mesh.isMesh) window.finaleTestSnapshot.push({ mesh, visible: mesh.visible,
                matrices: mesh.isInstancedMesh ? Array.from(mesh.instanceMatrix.array) : null });
        });
    });
    await page.keyboard.press('u');
    assert.equal(await page.evaluate(() => document.body.classList.contains('finale-active')), false, 'Typing in inputs must not detonate');
    await page.evaluate(() => document.activeElement.blur());
    await page.keyboard.press('u');
    await page.waitForFunction(() => document.body.classList.contains('finale-active'));
    await new Promise(resolve => setTimeout(resolve, 800));
    await page.screenshot({ path: 'scratch/finale-tribute.png' });
    await page.click('#btn-watch-finale');
    await new Promise(resolve => setTimeout(resolve, 2200));
    await page.screenshot({ path: 'scratch/finale-impact.png' });
    await new Promise(resolve => setTimeout(resolve, 7000));
    await page.screenshot({ path: 'scratch/finale-ruins.png' });
    assert.equal(await page.$eval('#btn-rebuild', el => el.hidden), false);
    await page.click('#btn-rebuild');
    assert.equal(await page.evaluate(() => document.body.classList.contains('finale-active')), false);
    assert.equal(await page.evaluate(() => window.finaleTestSnapshot.every(({ mesh, visible, matrices }) =>
        mesh.visible === visible && (!matrices || matrices.every((v, i) => mesh.instanceMatrix.array[i] === v)))), true, 'The real city restores its original visible geometry and instances');
    await page.click('#finale-sound');
    await page.click('#btn-finale');
    await new Promise(resolve => setTimeout(resolve, 500));
    await page.keyboard.press('Escape');
    await page.click('#btn-rebuild');
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction(() => window.camera);
    await page.click('#finale-sound');
    await page.click('#btn-finale');
    await new Promise(resolve => setTimeout(resolve, 300));
    assert.equal(await page.$eval('#finale-flash', el => el.style.opacity), '0');
    await page.setViewport({ width: 390, height: 844 });
    await page.screenshot({ path: 'scratch/finale-tribute-mobile.png' });
    await page.click('#btn-close-tribute');
    await page.click('#btn-tribute');
    await page.keyboard.press('Escape');
    await page.click('#btn-rebuild');
    assert.deepEqual(errors, [], 'No browser/runtime/shader errors');
    console.log('PASS: progressive destruction, gravity/settling, exact restoration, replay, keyboard/button controls, reduced motion and WebGL shaders.');
} finally { await browser.close(); }

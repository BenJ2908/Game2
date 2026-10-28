import { test, expect } from '@playwright/test';

test('arena renders, weapons work, and pause/restart preserve the game flow',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 // Headless Chromium does not reliably offer OS pointer lock. Emulate only the
 // browser lock API; game input, raycasts, rendering and simulation stay real.
 await page.addInitScript(()=>{let locked=null;Object.defineProperty(document,'pointerLockElement',{get:()=>locked});HTMLElement.prototype.requestPointerLock=function(){locked=this;document.dispatchEvent(new Event('pointerlockchange'));return Promise.resolve();};document.exitPointerLock=()=>{locked=null;document.dispatchEvent(new Event('pointerlockchange'));};});
 await page.goto('/');await expect(page.getByRole('heading',{name:'MOVE FAST. HIT HARD.'})).toBeVisible();
 await page.screenshot({path:'/tmp/velocity-menu.png'});
 await page.getByRole('button',{name:'ARENA BETRETEN'}).click();
 await expect(page.locator('#hud')).toBeVisible();await expect(page.locator('#wave')).toHaveText('01');
 await page.waitForTimeout(300);await page.screenshot({path:'/tmp/velocity-game.png'});
 await page.mouse.move(600,400);await page.mouse.down();await page.waitForTimeout(350);await page.mouse.up();
 const remaining=Number(await page.locator('#ammo').textContent());expect(remaining).toBeLessThan(30);expect(remaining).toBeGreaterThan(0);
 await page.keyboard.press('KeyR');await expect(page.locator('#reload-hint')).toHaveText('NACHLADEN …');await expect(page.locator('#ammo')).toHaveText('30',{timeout:20000});
 await page.keyboard.down('KeyW');await page.waitForTimeout(350);await page.keyboard.up('KeyW');
 await page.keyboard.press('Escape');await expect(page.locator('#pause')).toBeVisible();
 const hp=await page.locator('#health').textContent();await page.waitForTimeout(700);await expect(page.locator('#health')).toHaveText(hp);
 await page.getByRole('button',{name:'WEITERSPIELEN'}).click();await expect(page.locator('#pause')).toBeHidden();
 await page.keyboard.press('Escape');await page.getByRole('button',{name:'ZUM MENÜ'}).click();await expect(page.locator('#menu')).toBeVisible();
 await page.getByRole('button',{name:'ARENA BETRETEN'}).click();await expect(page.locator('#ammo')).toHaveText('30');await expect(page.locator('#kills')).toHaveText('00');
 expect(errors).toEqual([]);
});

test('desktop browser grants real pointer lock and releases it on pause',async({page})=>{
 await page.goto('/');
 await page.getByRole('button',{name:'ARENA BETRETEN'}).click();
 await expect.poll(()=>page.evaluate(()=>document.pointerLockElement?.id)).toBe('game');
 await page.mouse.move(20,0);
 await page.mouse.down();await page.waitForTimeout(300);await page.mouse.up();
 await expect.poll(async()=>Number(await page.locator('#ammo').textContent())).toBeLessThan(30);
 await page.keyboard.press('Escape');
 await expect(page.locator('#pause')).toBeVisible();
 await expect.poll(()=>page.evaluate(()=>document.pointerLockElement===null)).toBe(true);
});

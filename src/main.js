import * as THREE from 'three';
import './style.css';

const $ = id => document.getElementById(id);
let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas: $('game'), antialias: true }); }
catch { $('error').textContent = 'WebGL ist nicht verfügbar. Bitte öffne das Spiel in einem aktuellen Desktop-Browser mit Hardwarebeschleunigung.'; $('error').classList.remove('hidden'); $('start').disabled = true; throw new Error('WebGL unavailable'); }
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
const scene = new THREE.Scene();
scene.background = new THREE.Color('#829387');
scene.fog = new THREE.FogExp2('#829387', .019);
const camera = new THREE.PerspectiveCamera(76, innerWidth / innerHeight, .05, 150);
camera.rotation.order = 'YXZ';
scene.add(camera);
scene.add(new THREE.HemisphereLight(0xdbe9d1, 0x30352d, 2.2));
const sun = new THREE.DirectionalLight(0xffeed3, 3.8);
sun.position.set(-18, 35, 15); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, {left:-35,right:35,top:35,bottom:-35,near:.5,far:100});
sun.shadow.bias = -.0005; scene.add(sun);
const mats = {};
function material(color, metalness = 0, roughness = .8) { return new THREE.MeshStandardMaterial({ color, metalness, roughness }); }
mats.floor = material('#60675c'); mats.concrete = material('#929886'); mats.dark = material('#263b33', .45); mats.rust = material('#926248', .35); mats.lime = material('#c4f576', .15); mats.black = material('#151d1b', .5); mats.steel = material('#52645e', .7, .3);
function box(w,h,d,mat,x,y,z,parent=scene) { const mesh = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), mat); mesh.position.set(x,y,z); mesh.castShadow=true; mesh.receiveShadow=true; parent.add(mesh); return mesh; }
const obstacles = [];
function solid(w,h,d,mat,x,z) { const m=box(w,h,d,mat,x,h/2,z); obstacles.push({x,z,hw:w/2,hd:d/2}); return m; }
box(74,.5,74,mats.floor,0,-.25,0);
// Floor seams and tactical markings.
for(let i=-32;i<=32;i+=8){box(.035,.005,68,mats.dark,i,.005,0);box(68,.005,.035,mats.dark,0,.005,i);}
for(let i=-28;i<=28;i+=4){ box(1.7,.01,.12,mats.lime,i,.015,7); box(1.7,.01,.12,mats.lime,i,.015,-7); }
solid(72,8,1,mats.concrete,0,-36); solid(72,8,1,mats.concrete,0,36); solid(1,8,72,mats.concrete,-36,0); solid(1,8,72,mats.concrete,36,0);
for(let i=-32;i<=32;i+=8){box(.6,10,1.4,mats.dark,i,5,-35.5);box(.6,10,1.4,mats.dark,i,5,35.5);}
function container(x,z,angle,color){const g=new THREE.Group(); g.position.set(x,0,z);g.rotation.y=angle;scene.add(g);const mat=material(color,.45);box(5.2,3.6,10,mat,0,1.8,0,g);for(let i=-4.6;i<5;i+=.55){box(.09,3.3,.08,mats.steel,2.63,1.8,i,g);box(.09,3.3,.08,mats.steel,-2.63,1.8,i,g);}box(5.3,.12,10.1,mats.dark,0,3.62,0,g);const turn=Math.abs(Math.sin(angle))>.5;obstacles.push({x,z,hw:turn?5:2.6,hd:turn?2.6:5});return g;}
container(-12,-7,0,'#304d43');container(13,9,0,'#845e46');container(12,-18,Math.PI/2,'#40584b');container(-14,20,Math.PI/2,'#3f5044');
for(const [x,z] of [[-4,-17],[22,-5],[-23,7],[3,20],[25,23],[-26,-23]]){solid(3,2.4,3,mats.concrete,x,z);box(3.1,.15,3.1,mats.dark,x,2.4,z);box(.8,.08,3.15,mats.lime,x,2.51,z);}
// High industrial structures and overhead beams give the arena a readable silhouette.
for(const x of [-29,29])for(const z of [-26,0,26]){box(.8,13,.8,mats.dark,x,6.5,z);box(2,.3,2,mats.steel,x,12.9,z);}
for(const z of [-26,26]){box(59,.7,.8,mats.dark,0,13,z);for(let x=-28;x<29;x+=4){const beam=box(.2,3.5,.3,mats.steel,x,11.5,z);beam.rotation.z=.65;}}
function sign(text,x,y,z,rotation=0){const c=document.createElement('canvas');c.width=1024;c.height=256;const ctx=c.getContext('2d');ctx.fillStyle='#20392e';ctx.fillRect(0,0,1024,256);ctx.fillStyle='#c4f576';ctx.font='bold 105px Arial';ctx.textAlign='center';ctx.fillText(text,512,168);const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;const mesh=new THREE.Mesh(new THREE.PlaneGeometry(13,3.25),new THREE.MeshStandardMaterial({map:tex}));mesh.position.set(x,y,z);mesh.rotation.y=rotation;scene.add(mesh);}
sign('THE FOUNDRY',0,5.6,-35.4);sign('SECTOR  /  01',35.4,5.5,9,-Math.PI/2);
// Dust is visual only; no remote textures, assets or audio are required.
const dustGeo=new THREE.BufferGeometry();const dustPos=new Float32Array(300*3);for(let i=0;i<dustPos.length;i+=3){dustPos[i]=(Math.random()-.5)*70;dustPos[i+1]=Math.random()*12;dustPos[i+2]=(Math.random()-.5)*70;}dustGeo.setAttribute('position',new THREE.BufferAttribute(dustPos,3));scene.add(new THREE.Points(dustGeo,new THREE.PointsMaterial({color:'#d0d6b4',size:.035,transparent:true,opacity:.4})));

// Original procedural weapon model, attached to the camera.
const gun = new THREE.Group();camera.add(gun);
box(.14,.18,.65,mats.black,.24,-.24,-.52,gun);box(.17,.1,.4,mats.steel,.24,-.16,-.58,gun);box(.065,.065,.42,mats.black,.24,-.21,-1,gun);box(.19,.12,.23,mats.dark,.24,-.25,-.25,gun);const grip=box(.085,.24,.12,mats.black,.24,-.4,-.4,gun);grip.rotation.x=-.22;const mag=box(.08,.24,.15,mats.dark,.24,-.38,-.63,gun);mag.rotation.x=.15;box(.035,.055,.055,mats.lime,.24,-.09,-.66,gun);box(.27,.1,.19,mats.dark,.24,-.34,-.21,gun);box(.11,.12,.3,material('#555e4b'),.1,-.36,-.7,gun);
const muzzle=new THREE.PointLight('#ffcb69',0,6);muzzle.position.set(.24,-.21,-1.23);gun.add(muzzle);
const flash=new THREE.Mesh(new THREE.ConeGeometry(.095,.26,5),new THREE.MeshBasicMaterial({color:'#ffdf91',transparent:true,opacity:.95}));flash.rotation.x=-Math.PI/2;flash.position.copy(muzzle.position);gun.add(flash);flash.visible=false;
gun.visible=false;
let audio;
function sound(kind){if(!$('sound').checked)return;try{audio??=new (window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume();const now=audio.currentTime;const duration=kind==='shot'?.14:kind==='reload'?.18:kind==='hurt'?.16:.075;const gain=audio.createGain();gain.connect(audio.destination);gain.gain.setValueAtTime(kind==='shot'?.23:.095,now);gain.gain.exponentialRampToValueAtTime(.001,now+duration);if(kind==='shot'||kind==='hurt'||kind==='step'){const buffer=audio.createBuffer(1,Math.ceil(audio.sampleRate*duration),audio.sampleRate);const data=buffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;const src=audio.createBufferSource();src.buffer=buffer;const filter=audio.createBiquadFilter();filter.type='lowpass';filter.frequency.value=kind==='shot'?3500:kind==='step'?300:650;src.connect(filter);filter.connect(gain);src.start();}const osc=audio.createOscillator();osc.type=kind==='kill'?'triangle':'sine';osc.frequency.setValueAtTime(kind==='shot'?140:kind==='kill'?1100:kind==='hit'?750:kind==='reload'?300:90,now);osc.frequency.exponentialRampToValueAtTime(kind==='shot'?40:kind==='kill'?1700:120,now+duration);osc.connect(gain);osc.start();osc.stop(now+duration);}catch{/* Audio is optional; unsupported audio must not prevent play. */}}

const keys=new Set();let state='menu',yaw=0,pitch=0,health=100,ammo=30,kills=0,wave=0,best=0,reloading=0,shooting=false,aiming=false,shotCooldown=0,recoil=0,vy=0,grounded=true,elapsed=0,lastHurt=-10,nextWave=0,announceTime=0,hitTime=0,damageFlash=0,stepTime=0;
try{best=Number(localStorage.getItem('velocity-best'))||0;}catch{}
const bots=[], effects=[];const player=new THREE.Vector3(0,1.7,22);const ray=new THREE.Raycaster();const direction=new THREE.Vector3();const clock=new THREE.Clock();
function visible(id,show){$(id).classList.toggle('hidden',!show);}
function hud(){ $('health').textContent=Math.ceil(health);$('healthbar').style.width=`${Math.max(0,health)}%`;$('ammo').textContent=String(ammo).padStart(2,'0');$('kills').textContent=String(kills).padStart(2,'0');$('wave').textContent=String(wave).padStart(2,'0');$('best').textContent=String(best).padStart(2,'0');$('reload-hint').textContent=reloading?'NACHLADEN …':'R · NACHLADEN'; }
function announce(text){$('announcement').textContent=text;announceTime=2.3;}
function collides(x,z,r=.4){return obstacles.some(o=>Math.abs(x-o.x)<o.hw+r&&Math.abs(z-o.z)<o.hd+r);}
function move(pos,dx,dz,r=.4){if(!collides(pos.x+dx,pos.z,r))pos.x+=dx;if(!collides(pos.x,pos.z+dz,r))pos.z+=dz;}
function removeBot(b){scene.remove(b.group);b.group.traverse(o=>{if(o.isMesh)o.geometry.dispose();});}
function clearBots(){for(const b of bots)removeBot(b);bots.length=0;for(const e of effects){scene.remove(e.mesh);e.mesh.geometry.dispose();e.mesh.material.dispose();}effects.length=0;}
const spawnPoints=[[-27,-28],[27,-28],[-27,27],[27,27],[0,-27],[-28,0],[28,0],[0,29]];
function spawnWave(){wave++;const count=Math.min(3+wave,12);for(let i=0;i<count;i++){const p=spawnPoints[(i+wave)%spawnPoints.length];let x=p[0]+(Math.random()-.5)*3,z=p[1]+(Math.random()-.5)*3;if(Math.hypot(x-player.x,z-player.z)<10){x=-x;z=-z;}const group=new THREE.Group();group.position.set(x,0,z);scene.add(group);const body=box(.7,.85,.4,mats.rust,0,1.12,0,group);const head=box(.38,.36,.36,mats.black,0,1.77,0,group);box(.4,.09,.38,mats.lime,0,1.79,.025,group);const legs=[box(.23,.65,.27,mats.dark,-.2,.36,0,group),box(.23,.65,.27,mats.dark,.2,.36,0,group)];box(.15,.18,.7,mats.black,.38,1.18,.3,group);const bot={group,body,head,legs,hp:100,cooldown:1.3+Math.random(),phase:Math.random()*6,speed:1.5+Math.min(wave*.14,1.3)};group.traverse(o=>{if(o.isMesh)o.userData.bot=bot;});bots.push(bot);}announce(`WELLE ${String(wave).padStart(2,'0')}  /  ${count} ZIELE`);hud();}
function requestLock(){try{const result=$('game').requestPointerLock();result?.catch(()=>{announce('Klicken, um die Maus zu aktivieren');});}catch{announce('Klicken, um die Maus zu aktivieren');}}
function begin(){clearBots();player.set(0,1.7,22);yaw=0;pitch=0;health=100;ammo=30;kills=0;wave=0;elapsed=0;lastHurt=-10;reloading=0;shotCooldown=0;nextWave=0;vy=0;grounded=true;recoil=0;shooting=false;aiming=false;keys.clear();$('killfeed').textContent='';state='playing';document.body.classList.add('playing');visible('menu',false);visible('menu-footer',false);visible('pause',false);visible('end',false);visible('hud',true);gun.visible=true;sound('reload');spawnWave();requestLock();}
function resume(){state='playing';visible('pause',false);requestLock();}
function pause(){if(state!=='playing')return;state='paused';shooting=false;aiming=false;keys.clear();visible('pause',true);}
function finish(){state='dead';shooting=false;best=Math.max(best,kills);try{localStorage.setItem('velocity-best',String(best));}catch{}$('final-kills').textContent=kills;$('final-wave').textContent=wave;visible('end',true);document.exitPointerLock?.();sound('hurt');}
function reload(){if(state==='playing'&&!reloading&&ammo<30){reloading=1.45;sound('reload');hud();}}
$('start').onclick=begin;$('restart').onclick=begin;$('resume').onclick=resume;
$('back').onclick=()=>{state='menu';clearBots();gun.visible=false;document.body.classList.remove('playing','aiming');visible('pause',false);visible('hud',false);visible('menu',true);visible('menu-footer',true);};
document.addEventListener('pointerlockchange',()=>{if(!document.pointerLockElement)pause();});
document.addEventListener('mousemove',e=>{if(state==='playing'&&document.pointerLockElement){yaw-=e.movementX*.002*(aiming?.65:1);pitch=THREE.MathUtils.clamp(pitch-e.movementY*.002*(aiming?.65:1),-1.35,1.35);}});
document.addEventListener('keydown',e=>{if(['Space','ArrowUp','ArrowDown'].includes(e.code)&&state==='playing')e.preventDefault();keys.add(e.code);if(e.code==='KeyR')reload();if(e.code==='KeyM')$('sound').checked=!$('sound').checked;if(e.code==='Escape'&&state==='playing'){pause();document.exitPointerLock?.();}});
document.addEventListener('keyup',e=>keys.delete(e.code));
window.addEventListener('blur',()=>{if(state==='playing'){pause();document.exitPointerLock?.();}});
$('game').addEventListener('mousedown',e=>{if(state!=='playing')return;if(!document.pointerLockElement){requestLock();return;}if(e.button===0)shooting=true;if(e.button===2)aiming=true;});
document.addEventListener('mouseup',e=>{if(e.button===0)shooting=false;if(e.button===2)aiming=false;});document.addEventListener('contextmenu',e=>e.preventDefault());
function tracer(from,to,color){const geometry=new THREE.BufferGeometry().setFromPoints([from,to]);const mesh=new THREE.Line(geometry,new THREE.LineBasicMaterial({color,transparent:true,opacity:.8}));scene.add(mesh);effects.push({mesh,life:.07,max:.07});}
function sparks(pos,color){for(let i=0;i<5;i++){const mesh=new THREE.Mesh(new THREE.BoxGeometry(.045,.045,.045),new THREE.MeshBasicMaterial({color}));mesh.position.copy(pos);scene.add(mesh);effects.push({mesh,life:.25,max:.25,velocity:new THREE.Vector3((Math.random()-.5)*4,Math.random()*3,(Math.random()-.5)*4)});}}
function fire(){if(shotCooldown>0||reloading)return;if(ammo<=0){reload();return;}ammo--;shotCooldown=.095;recoil=Math.min(recoil+.035,.12);muzzle.intensity=4;flash.visible=true;flash.rotation.z=Math.random()*6;sound('shot');camera.getWorldDirection(direction);direction.x+=(Math.random()-.5)*(aiming?.002:.009);direction.y+=(Math.random()-.5)*(aiming?.002:.009);ray.set(camera.position,direction.normalize());const targets=[];scene.traverse(o=>{if(o.isMesh&&!o.userData.effect&&!o.isPoints&&!gun.getObjectById(o.id))targets.push(o);});const hit=ray.intersectObjects(targets,false)[0];const to=hit?hit.point:camera.position.clone().addScaledVector(direction,80);tracer(gun.localToWorld(new THREE.Vector3(.24,-.21,-1.23)),to,'#ffe5a3');if(hit){const b=hit.object.userData.bot;if(b){const headshot=hit.point.y-b.group.position.y>1.55;b.hp-=headshot?100:34;sparks(hit.point,'#c4f576');hitTime=.14;sound(b.hp<=0?'kill':'hit');if(b.hp<=0){removeBot(b);bots.splice(bots.indexOf(b),1);kills++;$('killfeed').textContent=`${headshot?'PRÄZISIONSTREFFER':'ELIMINIERT'}  +100`;$('killfeed').dataset.time=String(elapsed);if(!bots.length)nextWave=2.7;}}else sparks(hit.point,'#dfc29b');}hud();}
function update(dt){elapsed+=dt;shotCooldown=Math.max(0,shotCooldown-dt);recoil=THREE.MathUtils.damp(recoil,0,15,dt);muzzle.intensity=Math.max(0,muzzle.intensity-dt*70);flash.visible=muzzle.intensity>0;
if(reloading){reloading=Math.max(0,reloading-dt);if(!reloading){ammo=30;sound('reload');hud();}}
const forward=(keys.has('KeyW')?1:0)-(keys.has('KeyS')?1:0),side=(keys.has('KeyD')?1:0)-(keys.has('KeyA')?1:0);const moving=forward||side;const sprint=keys.has('ShiftLeft')&&forward>0&&!aiming&&!shooting;const speed=aiming?3.3:sprint?9:5.5;const len=Math.hypot(forward,side)||1;move(player,((side*Math.cos(yaw)-forward*Math.sin(yaw))/len)*speed*dt,((-forward*Math.cos(yaw)-side*Math.sin(yaw))/len)*speed*dt);
if(keys.has('Space')&&grounded){vy=6;grounded=false;}vy-=17*dt;player.y+=vy*dt;if(player.y<=1.7){player.y=1.7;vy=0;grounded=true;}
if(moving&&grounded){stepTime-=dt;if(stepTime<=0){sound('step');stepTime=sprint?.28:.42;}}else stepTime=0;
camera.position.copy(player);camera.position.y+=moving&&grounded?Math.sin(elapsed*(sprint?18:13))*.035:0;camera.rotation.set(pitch+recoil*.55,yaw,0,'YXZ');camera.fov=THREE.MathUtils.damp(camera.fov,aiming?55:sprint?84:76,12,dt);camera.updateProjectionMatrix();document.body.classList.toggle('aiming',aiming);
gun.position.x=THREE.MathUtils.damp(gun.position.x,aiming?-.24:0,14,dt);gun.position.y=THREE.MathUtils.damp(gun.position.y,aiming?.075:0,14,dt)+(moving?Math.sin(elapsed*13)*.0008:0);gun.position.z=recoil*.75;gun.rotation.x=reloading?Math.sin(reloading/1.45*Math.PI)*-.75:recoil;gun.rotation.z=reloading?-.4*Math.sin(reloading/1.45*Math.PI):0;
if(shooting&&!sprint)fire();
for(const b of bots){const p=b.group.position;const dist=Math.hypot(player.x-p.x,player.z-p.z);const angle=Math.atan2(player.x-p.x,player.z-p.z);b.group.rotation.y=angle;b.cooldown-=dt;if(dist>6){const strafe=Math.sin(elapsed+b.phase)*.55;move(p,(Math.sin(angle)+Math.cos(angle)*strafe)*b.speed*dt,(Math.cos(angle)-Math.sin(angle)*strafe)*b.speed*dt,.5);b.legs[0].rotation.x=Math.sin(elapsed*8+b.phase)*.45;b.legs[1].rotation.x=-b.legs[0].rotation.x;}
if(dist<38&&b.cooldown<=0){b.cooldown=1+Math.random()*.9;const origin=p.clone().add(new THREE.Vector3(0,1.35,0));const v=player.clone().sub(origin);ray.set(origin,v.clone().normalize());const walls=ray.intersectObjects(scene.children,false).filter(h=>!h.object.userData.bot&&h.distance<v.length());if(!walls.length){tracer(origin,player.clone().add(new THREE.Vector3((Math.random()-.5)*1.5,0,0)),'#ed8d5c');if(Math.random()<.65){health=Math.max(0,health-(7+Math.min(wave,6)));lastHurt=elapsed;damageFlash=.5;sound('hurt');hud();if(health<=0){finish();return;}}}}
}
if(health<100&&elapsed-lastHurt>4){health=Math.min(100,health+dt*13);hud();}if(nextWave>0){nextWave-=dt;if(nextWave<=0){health=Math.min(100,health+20);spawnWave();}}
if(announceTime>0){announceTime-=dt;if(announceTime<=0)$('announcement').textContent='';}if(elapsed-Number($('killfeed').dataset.time)>2.3)$('killfeed').textContent='';hitTime=Math.max(0,hitTime-dt);$('hitmarker').style.opacity=hitTime>0?1:0;damageFlash=Math.max(0,damageFlash-dt);$('damage').style.opacity=damageFlash;
for(let i=effects.length-1;i>=0;i--){const e=effects[i];e.life-=dt;if(e.velocity){e.mesh.position.addScaledVector(e.velocity,dt);e.velocity.y-=dt*9;}e.mesh.material.opacity=e.life/e.max;if(e.life<=0){scene.remove(e.mesh);e.mesh.geometry.dispose();e.mesh.material.dispose();effects.splice(i,1);}}
}
function animate(){requestAnimationFrame(animate);let dt=Math.min(clock.getDelta(),.25);if(state==='playing'){while(dt>0&&state==='playing'){const step=Math.min(dt,.025);update(step);dt-=step;}}else if(state==='menu'){const t=performance.now()*.00004;camera.position.set(22+Math.sin(t)*3,10,27);camera.lookAt(-3,1,-9);}renderer.render(scene,camera);}
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
animate();

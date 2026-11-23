import * as THREE from './assets/three/three.module.min.js';
import {OrbitControls} from './assets/three/OrbitControls.js';
const host=document.querySelector('#office3d'), labels=document.querySelector('#threeLabels');
let renderer,scene,camera,controls,visible=false,started=false,frame=0,lastFinancePending=0;
const points=[],floorY=.16;
function material(color,extra={}){return new THREE.MeshStandardMaterial({color,roughness:.72,...extra});}
function box(parent,w,h,d,x,y,z,color){const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),typeof color==='object'?color:material(color));o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
function sphere(parent,r,x,y,z,color,sx=1,sy=1,sz=1){const o=new THREE.Mesh(new THREE.SphereGeometry(r,16,12),material(color));o.position.set(x,y,z);o.scale.set(sx,sy,sz);o.castShadow=true;parent.add(o);return o;}
function cylinder(parent,rt,rb,h,x,y,z,color){const o=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,16),material(color));o.position.set(x,y,z);o.castShadow=true;parent.add(o);return o;}
function plant(x,z){cylinder(scene,.19,.14,.34,x,.32,z,0xc8ad89);for(let i=0;i<6;i++){let a=i*Math.PI/3;sphere(scene,.22,x+Math.cos(a)*.16,.72+(i%2)*.23,z+Math.sin(a)*.16,0x71805a,.8,1.7,.5);}}
function desk(id,name,x,z,color){const g=new THREE.Group();g.position.set(x,0,z);scene.add(g);
 box(g,2.5,.12,1.05,0,.96,0,0xcfa975);for(const dx of [-1.06,1.06])box(g,.08,.8,.86,dx,.52,0,0x3e4947);
 box(g,.84,.55,.055,0,1.4,-.23,0x283536);box(g,.75,.44,.012,0,1.4,-.196,0xc4e0d4);box(g,.06,.22,.06,0,1.08,-.23,0x455452);box(g,.35,.025,.2,0,1.025,-.23,0x455452);
 box(g,.54,.025,.19,0,1.035,.2,0xe7e7dc);box(g,.12,.035,.15,.45,1.04,.2,0xdddcd0);
 cylinder(g,.09,.07,.12,-.8,1.08,.12,0xf3eee0);box(g,.28,.04,.36,.84,1.04,.05,0x40594c);
 // Seated body: chair behind desk, knees under tabletop, hands at keyboard.
 box(g,.65,.12,.58,0,.62,.93,0x424e49);box(g,.65,.65,.12,0,.96,1.2,0x424e49);cylinder(g,.055,.055,.48,0,.36,.95,0x39433c);
 box(g,.62,.04,.06,0,.2,.95,0x3b453e);box(g,.06,.04,.6,0,.2,.95,0x3b453e);
 sphere(g,.27,0,1.02,.94,color,1,1.45,.65);sphere(g,.17,0,1.54,.91,0xc69b78,1,1.18,1);sphere(g,.18,0,1.62,.94,0x39322a,1,.65,1);
 for(const dx of [-.2,.2]){box(g,.16,.15,.55,dx,.69,.64,0x343e49);box(g,.14,.45,.14,dx,.43,.43,0x343e49);box(g,.17,.1,.3,dx,.21,.34,0x242c2a);const arm=box(g,.12,.14,.48,dx*1.4,1.08,.59,color);arm.rotation.x=-.18;sphere(g,.07,dx*1.4,1.04,.32,0xc69b78);}
 // Low glass partitions keep every seat visible from either side.
 const glass=material(0xc6d7d1,{transparent:true,opacity:.16,depthWrite:false});
 for(const dx of [-1.52,1.52]){box(g,.025,1.3,2.35,dx,.82,.36,glass);for(const dz of [-.82,1.53])box(g,.035,1.5,.035,dx,.91,dz,0x44524b);box(g,.035,.035,2.35,dx,1.66,.36,0x44524b);}
 const b=document.createElement('button');b.textContent=name;if(id==='COO')b.id='coordinatorRoom3d';else if(id==='GUARD')b.id='guardRoom3d';else b.dataset.team=id;b.setAttribute('aria-label',name+' masasını aç');labels.append(b);points.push({position:new THREE.Vector3(x,2.02,z+.4),button:b});return g;
}
function init(){
 scene=new THREE.Scene();scene.background=new THREE.Color(0xefebe4);
 camera=new THREE.PerspectiveCamera(38,1,.1,100);camera.position.set(13,13,16);
 renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;host.prepend(renderer.domElement);
 renderer.domElement.setAttribute('aria-label','OTOTR üç boyutlu ofis. Sürükleyerek döndürün veya üstteki yön düğmelerini kullanın.');
 controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,.5,0);controls.enableDamping=true;controls.minDistance=9;controls.maxDistance=32;controls.minPolarAngle=.25;controls.maxPolarAngle=Math.PI/2.12;controls.enablePan=false;controls.saveState();
 scene.add(new THREE.HemisphereLight(0xfff8ec,0x98a896,2.6));const sun=new THREE.DirectionalLight(0xffefd7,3);sun.position.set(-6,14,8);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-13,right:13,top:13,bottom:-13});sun.shadow.bias=-.0004;scene.add(sun);
 box(scene,13,.3,10,0,0,0,0xe7decb);box(scene,12.8,.035,9.8,0,floorY,0,0xc8a57c);
 for(let i=0;i<32;i++){box(scene,.012,.006,9.8,-6.25+i*.4,.182,0,0xb7946f);for(let j=0;j<4;j++)box(scene,.39,.006,.012,-6.05+i*.4,.183,-3.5+j*2.3+(i%2)*.8,0xb7946f);}
 // Rear architectural wall, timber centre and window bays.
 box(scene,13,2.85,.12,0,1.6,-4.95,0xe7e5da);box(scene,4,2.7,.16,0,1.6,-4.82,0xa6784e);
 for(let i=0;i<27;i++)box(scene,.025,2.7,.035,-1.94+i*.15,1.6,-4.72,0xc69c6b);
 for(const x of [-4.4,4.4]){box(scene,3.4,2.15,.05,x,1.83,-4.86,material(0xc1d3cf,{metalness:.2}));for(const dx of [-1.7,0,1.7])box(scene,.055,2.2,.09,x+dx,1.83,-4.79,0x53605b);box(scene,3.45,.045,.09,x,1.8,-4.79,0x53605b);}
 const tex=new THREE.TextureLoader().load('assets/ototr-official-logo.png',()=>renderOnce());tex.colorSpace=THREE.SRGBColorSpace;box(scene,3.15,1.1,.09,0,2.12,-4.65,0xf7f4ee);const sign=new THREE.Mesh(new THREE.PlaneGeometry(3.02,1.02),new THREE.MeshBasicMaterial({map:tex}));sign.position.set(0,2.12,-4.595);scene.add(sign);
 desk('FIN','Finans',-4.3,-1.5,0x52664e);desk('FRA','Franchise',0,-1.5,0xb5a082);desk('HR','İnsan Kaynakları',4.3,-1.5,0x86745a);
 desk('COM','Müşteri Şikayetleri',-4.3,2,0x374c61);desk('REV','Yorumlar',0,2,0x3a5663);desk('SALE','Saha Satış',4.3,2,0xa28b6e);
 // Compact SEO workstation faces into the central rear zone.
 const seo=desk('SEO','SEO & Web',-4.3,-3.9,0x58677a);seo.scale.set(.68,.85,.65);points.at(-1).position.set(-4.3,2,-3.5);
 const coo=desk('COO','Koordinatör',0,-3.9,0x354d49);coo.scale.set(.68,.85,.65);points.at(-1).position.set(0,2,-3.5);const guard=desk('GUARD','Bağımsız bekçi',4.3,-3.9,0x76684e);guard.scale.set(.68,.85,.65);points.at(-1).position.set(4.3,2,-3.5);document.querySelector('#coordinatorRoom3d').onclick=()=>document.querySelector('#coordinatorRoom').click();document.querySelector('#guardRoom3d').onclick=()=>document.querySelector('#guardRoom').click();
 plant(-6,-4.1);plant(6,-4.1);plant(-6,4.3);plant(6,4.3);
 const arrow=new THREE.ArrowHelper(new THREE.Vector3(-1,0,0),new THREE.Vector3(-.4,.24,-.7),3.4,0xb68d40,.35,.18);arrow.name='financeHandoff';arrow.visible=lastFinancePending>0;scene.add(arrow);
 new ResizeObserver(resize).observe(host);resize();started=true;animate();
}
function resize(){if(!renderer||!visible)return;const w=host.clientWidth,h=host.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.fov=camera.aspect<1?54:38;camera.updateProjectionMatrix();renderOnce();}
function renderOnce(){if(!renderer||!visible)return;renderer.render(scene,camera);for(const p of points){const v=p.position.clone().project(camera);p.button.style.left=((v.x+1)/2*host.clientWidth)+'px';p.button.style.top=((-v.y+1)/2*host.clientHeight)+'px';p.button.hidden=v.z>1||Math.abs(v.x)>1||Math.abs(v.y)>1;}}
function animate(){cancelAnimationFrame(frame);if(!visible||document.hidden)return;controls.update();renderOnce();frame=requestAnimationFrame(animate);}
function switchView(use3d){visible=use3d;host.hidden=!use3d;document.querySelector('#sceneViewport').hidden=use3d;document.querySelector('.scene-toolbar').hidden=use3d;document.querySelector('#view3d').setAttribute('aria-pressed',String(use3d));document.querySelector('#viewIllustrated').setAttribute('aria-pressed',String(!use3d));if(use3d){try{if(!started)init();resize();animate();}catch(e){document.querySelector('#threeError').textContent='Bu cihazda 3D başlatılamadı. Resimli ofis görünümünü kullanabilirsiniz.';}}else cancelAnimationFrame(frame);}
document.querySelector('#view3d').onclick=()=>switchView(true);document.querySelector('#viewIllustrated').onclick=()=>switchView(false);
function rotate(angle){if(!camera)return;const offset=camera.position.clone().sub(controls.target);offset.applyAxisAngle(new THREE.Vector3(0,1,0),angle);camera.position.copy(controls.target).add(offset);controls.update();}
document.querySelector('#rotateLeft').onclick=()=>rotate(-Math.PI/6);document.querySelector('#rotateRight').onclick=()=>rotate(Math.PI/6);document.querySelector('#threeReset').onclick=()=>controls?.reset();
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&visible)animate();else cancelAnimationFrame(frame);});
window.addEventListener('franchise-office-status',e=>{lastFinancePending=e.detail?.finance_pending||0;const arrow=scene?.getObjectByName('financeHandoff');if(arrow)arrow.visible=lastFinancePending>0;});


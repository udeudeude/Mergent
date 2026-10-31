import * as THREE from 'three';
import {descriptions,makeWorld} from './worlds.js';
const $=id=>document.getElementById(id);
const FACE_NORMALS=[new THREE.Vector3(0,0,1),new THREE.Vector3(1,0,0),new THREE.Vector3(0,0,-1),new THREE.Vector3(-1,0,0),new THREE.Vector3(0,1,0),new THREE.Vector3(0,-1,0)];
const FACE_POSES=[[.18,-.30],[.18,-Math.PI/2+.12],[.18,Math.PI-.30],[.18,Math.PI/2-.12],[Math.PI/2-.12,0],[-Math.PI/2+.12,0]];
const symbol=['☉','☁','♧','◷','◇','⌁'];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
let selected=0,breached=false,playing=false,audio=null,notificationTimer=0,lastTime=0,pictureBlob=null,preview=null;
let weird=.53;
try{weird=clamp(parseInt(localStorage.getItem('mergent-weird')||'53',10)/100,0,1)||.53}catch{}
const motion={x:.18,y:-.30,tx:.18,ty:-.30,t:0,shock:0};
const mobile=()=>innerWidth<850;
function ping(index,vol=.08){
 if(!playing)return;
 try{
  audio=audio||new(window.AudioContext||window.webkitAudioContext)();
  if(audio.state==='suspended')audio.resume();
  const t=audio.currentTime,osc=audio.createOscillator(),g=audio.createGain(),f=audio.createBiquadFilter();
  osc.type=['sine','triangle','sine','sawtooth','triangle','sine'][index];
  osc.frequency.setValueAtTime(155+index*72+Math.random()*85,t);
  osc.frequency.exponentialRampToValueAtTime(76+index*25,t+.23);
  f.type='lowpass';f.frequency.value=900;
  g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+.027);
  g.gain.exponentialRampToValueAtTime(.0001,t+.38);
  osc.connect(f);f.connect(g);g.connect(audio.destination);
  osc.start(t);osc.stop(t+.39);
 }catch(e){console.warn('No audio output',e)}
}
function notify(message){
 const n=$('toast');n.textContent=message;n.classList.add('on');
 clearTimeout(notificationTimer);
 notificationTimer=setTimeout(()=>n.classList.remove('on'),3500);
}
function updateUI(){
 const item=descriptions[selected];
 document.documentElement.style.setProperty('--accent',item.accent);
 $('caseNumber').textContent='CHAMBER '+String(selected+1).padStart(2,'0')+' / 06 · '+(breached?'BREACHED':'OPEN');
 $('specimenName').innerHTML=item.first+' <i>'+item.second+'</i>';
 $('specimenDescription').textContent=item.blurb;
 $('faceCaption').textContent=String(selected+1).padStart(2,'0')+' / '+item.short;
 $('condition').textContent=breached?'TWO WORLDS INTERSECT':'ONE OPEN FACE';
 $('status').textContent=breached?'CONTAINMENT BREACHED':'CHAMBER '+String(selected+1).padStart(2,'0')+' VISIBLE';
 [...$('faces').children].forEach((el,i)=>{el.classList.toggle('active',selected===i);el.setAttribute('aria-pressed',String(selected===i))});
}
function rotateToFace(index){
 const pose=FACE_POSES[index];motion.tx=pose[0];motion.ty=pose[1];
 while(motion.ty-motion.y>Math.PI)motion.ty-=2*Math.PI;
 while(motion.ty-motion.y< -Math.PI)motion.ty+=2*Math.PI;
 ping(index,.06);
}
function material(c,options={}){return new THREE.MeshStandardMaterial({color:c,metalness:.8,roughness:.27,...options})}
function box(w,h,d,mat,x=0,y=0,z=0){
 const obj=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);
 obj.position.set(x,y,z);return obj
}
function chamber(index){
 const side=1.58,half=side/2,border=.115;
 const normal=FACE_NORMALS[index],c=new THREE.Group();
 c.position.copy(normal).multiplyScalar(half);
 c.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),normal);
 const closed=new THREE.Group(),open=new THREE.Group();
 const metal=material(['#304353','#364153','#404056','#40374a','#424f43','#32495a'][index],{side:THREE.DoubleSide});
 const brass=material('#a8b8bd',{metalness:.93,roughness:.22,side:THREE.DoubleSide});
 closed.add(box(side,side,.045,metal,0,0,-.025));
 const sigil=new THREE.Mesh(new THREE.TorusGeometry(.45,.012,6,4),new THREE.MeshBasicMaterial({color:descriptions[index].accent,transparent:true,opacity:.46}));
 sigil.rotation.z=Math.PI/4;sigil.position.z=.017;closed.add(sigil);
 const centerSigil=new THREE.Mesh(new THREE.TorusGeometry(.085,.01,4,6),new THREE.MeshBasicMaterial({color:descriptions[index].accent}));
 centerSigil.position.z=.026;closed.add(centerSigil);
 for(const x of [-.64,.64])for(const y of [-.64,.64]){
  const stud=new THREE.Mesh(new THREE.SphereGeometry(.021,8,6),brass);stud.position.set(x,y,.025);closed.add(stud);
 }
 for(const y of [-half+border/2,half-border/2])open.add(box(side,border,.12,metal,0,y,0));
 for(const x of [-half+border/2,half-border/2])open.add(box(border,side-2*border,.12,metal,x,0,0));
 for(const x of [-half+border/2,half-border/2])for(const y of [-half+border/2,half-border/2])
  open.add(box(.12,.12,.14,brass,x,y,.045));
 const aperture=side-2*border;
 open.add(new THREE.Mesh(
  new THREE.PlaneGeometry(aperture,aperture),
  new THREE.MeshBasicMaterial({color:0x070e1a,side:THREE.DoubleSide,depthWrite:true})
 ));
 open.children[open.children.length-1].position.z=-1.38;
 const wall=material('#152435',{metalness:.15,roughness:.9,side:THREE.DoubleSide});
 for(const x of [-aperture/2,aperture/2])open.add(box(.025,aperture,.75,wall,x,0,-.43));
 for(const y of [-aperture/2,aperture/2])open.add(box(aperture,.025,.75,wall,0,y,-.43));
 const ring=new THREE.Mesh(new THREE.TorusGeometry(.48,.008,5,84),new THREE.MeshBasicMaterial({color:descriptions[index].accent,transparent:true,opacity:.26}));
 ring.position.z=-.72;open.add(ring);
 const holder=new THREE.Group();holder.scale.setScalar(1.17);holder.position.z=-.67;
 const specimen=makeWorld(index);holder.add(specimen);open.add(holder);
 const echoHolder=new THREE.Group();echoHolder.scale.setScalar(.62);echoHolder.position.set(.25,-.13,-.87);
 const echo=makeWorld((index+1)%6);echoHolder.add(echo);open.add(echoHolder);echoHolder.visible=false;
 const recursing=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(.4,.4,.4)),new THREE.LineBasicMaterial({color:descriptions[(index+1)%6].accent,transparent:true,opacity:.65}));
 recursing.position.set(-.22,.17,-1.05);recursing.visible=false;open.add(recursing);
 c.add(closed,open);
 return{group:c,open,closed,specimen,echo,echoHolder,recursing,ring};
}
function initialize(){
 const area=$('view'),renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));renderer.setClearColor(0x000000,0);
 renderer.outputEncoding=THREE.sRGBEncoding;renderer.toneMapping=THREE.ACESFilmicToneMapping;
 renderer.toneMappingExposure=1.34;area.appendChild(renderer.domElement);
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(39,1,.01,45);
 camera.position.set(0,0,4.65);
 scene.add(new THREE.HemisphereLight(0xe3efff,0x22293b,1.8));
 const key=new THREE.PointLight(0xffc39d,3.4,7);key.position.set(1.6,2.3,3);scene.add(key);
 const fill=new THREE.PointLight(0x88baff,2.0,6);fill.position.set(-1.8,-1.2,2);scene.add(fill);
 const stand=new THREE.Group(),cube=new THREE.Group();stand.add(cube);scene.add(stand);
 const rooms=FACE_NORMALS.map((_,i)=>{const r=chamber(i);cube.add(r.group);return r});
 const edges=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.66,1.66,1.66)),new THREE.LineBasicMaterial({color:0xa4b4ba,transparent:true,opacity:.75}));
 cube.add(edges);
 preview={renderer,scene,camera,stand,cube,rooms,active:-1};
 function resize(){
  const w=area.clientWidth,h=area.clientHeight;
  renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();
  stand.position.y=mobile()?.44:.16;stand.scale.setScalar(mobile()?1.01:1.25);
 }
 resize();window.addEventListener('resize',resize);
 const canvas=renderer.domElement;let down=null;
 canvas.addEventListener('pointerdown',e=>{
  down={id:e.pointerId,x:e.clientX,y:e.clientY,t:performance.now(),moved:false};
  canvas.setPointerCapture(e.pointerId);
 });
 canvas.addEventListener('pointermove',e=>{
  if(!down||e.pointerId!==down.id)return;
  const dx=e.clientX-down.x,dy=e.clientY-down.y;
  if(Math.abs(dx)+Math.abs(dy)>2)down.moved=true;
  motion.ty+=dx*.010;motion.tx=clamp(motion.tx+dy*.010,-1.67,1.67);
  down.x=e.clientX;down.y=e.clientY;
 });
 const end=e=>{if(!down||down.id!==e.pointerId)return;if(!down.moved&&performance.now()-down.t<380)disturb();down=null};
 canvas.addEventListener('pointerup',end);canvas.addEventListener('pointercancel',()=>down=null);
 canvas.addEventListener('wheel',e=>{e.preventDefault();motion.ty+=e.deltaY*.0025},{passive:false});
 const eye=new THREE.Vector3();
 renderer.setAnimationLoop(()=>{
  const now=performance.now()/1000,dt=lastTime?Math.min(.05,now-lastTime):.016;lastTime=now;
  motion.t+=dt;motion.shock*=.93;
  motion.x+=(motion.tx-motion.x)*.1;motion.y+=(motion.ty-motion.y)*.1;
  stand.rotation.set(motion.x,motion.y,0,'XYZ');
  stand.updateMatrixWorld(true);
  eye.copy(camera.position).sub(stand.position).normalize();
  let best=0,bestScore=-1e6;
  rooms.forEach((r,i)=>{
   const n=FACE_NORMALS[i].clone().transformDirection(stand.matrixWorld);
   const dot=n.dot(eye);
   if(dot>bestScore){bestScore=dot;best=i}
  });
  const previous=preview.active;
  if(previous!==-1){
   const previousScore=FACE_NORMALS[previous].clone().transformDirection(stand.matrixWorld).dot(eye);
   if(previousScore>bestScore-.033)best=previous;
  }
  if(best!==preview.active){
   preview.active=best;selected=best;
   rooms.forEach((r,i)=>{r.open.visible=i===best;r.closed.visible=i!==best});
   updateUI();ping(best,.046);
  }
  const r=rooms[preview.active];
  if(r){
   r.specimen.userData.tick(motion.t,weird,motion.shock);
   r.echoHolder.visible=breached;r.recursing.visible=breached;
   if(breached){
    r.echo.userData.tick(motion.t*1.1,weird,motion.shock);
    r.echoHolder.rotation.z+=dt*(.3+weird*.8);
    r.recursing.rotation.x+=dt*.32;r.recursing.rotation.y+=dt*.45;
    r.ring.material.opacity=.36+.23*Math.sin(motion.t*2.5);
   }else r.ring.material.opacity=.27;
  }
  cube.scale.setScalar(1+motion.shock*.025*Math.sin(now*37));
  renderer.render(scene,camera);
 });
}
function disturb(){
 motion.shock=1;motion.t+=2+weird*4;ping(selected,.12);
 const messages=['THE INTERIOR HAS REQUESTED AN EXTERIOR','A SMALLER CUBE HAS BEGUN TO DREAM',
 'UNAUTHORIZED REALITY DETECTED','THE BACK WALL REFUSES TO BE MEASURED',
 'THE CURATOR HAS BEEN REPLACED BY A WINDOW','THIS ROOM IS BIGGER WHEN NOBODY LOOKS'];
 notify(messages[Math.floor(Math.random()*messages.length)]);
}
function breach(){
 breached=!breached;
 $('breach').setAttribute('aria-pressed',String(breached));
 $('breach').textContent=breached?'↯ SEAL BREACH':'↯ BREACH';
 motion.shock=1;updateUI();ping((selected+1)%6,.14);
 notify(breached?'A neighboring chamber has entered this one.':'Reality appears to be holding.');
}
function collect(){
 if(!preview){notify('Unable to capture the current scene.');return}
 const image=preview.renderer.domElement;
 const card=document.createElement('canvas');card.width=1000;card.height=1270;
 const ctx=card.getContext('2d'),gradient=ctx.createLinearGradient(0,0,0,1270);
 gradient.addColorStop(0,'#1a2a3e');gradient.addColorStop(1,'#070c15');
 ctx.fillStyle=gradient;ctx.fillRect(0,0,1000,1270);
 // Crop around the upper-middle stage, where the cube is positioned.
 const square=Math.min(image.width,image.height),left=(image.width-square)/2;
 const top=clamp(image.height*.37-square/2,0,image.height-square);
 ctx.drawImage(image,left,top,square,square,60,150,880,880);
 ctx.strokeStyle='#ac9c89';ctx.lineWidth=2;ctx.strokeRect(56,147,888,886);
 ctx.textBaseline='top';
 ctx.font='26px monospace';ctx.fillStyle='#efb99d';ctx.fillText('MERGENT / COLLECTED IMPOSSIBILITY',60,62);
 const title=descriptions[selected].first+' '+descriptions[selected].second;
 ctx.fillStyle='#f5efeb';ctx.font=title.length>25?'45px Georgia,serif':'55px Georgia,serif';
 ctx.fillText(title,60,1071,890);
 ctx.fillStyle='#b4bfcc';ctx.font='22px monospace';
 ctx.fillText('CHAMBER '+String(selected+1).padStart(2,'0')+'   •   IMPROBABILITY '+Math.round(weird*100)+'%',60,1161);
 ctx.fillText(breached?'STATUS: BREACHED // TWO SPECIMENS':'STATUS: THE INTERIOR REMAINS UNRESOLVED',60,1200);
 const data=card.toDataURL('image/png');
 $('postcardPreview').src=data;$('saveImage').href=data;
 $('saveImage').download='mergent-chamber-'+String(selected+1).padStart(2,'0')+(breached?'-breach':'')+'.png';
 pictureBlob=null;card.toBlob(blob=>pictureBlob=blob,'image/png');
 $('postcardDialog').showModal();ping(selected,.11);
}
async function share(){
 if(!pictureBlob){notify('Image preparing. Use Save PNG.');return}
 const f=new File([pictureBlob],'mergent-encounter.png',{type:'image/png'});
 try{
  if(navigator.canShare?.({files:[f]}))await navigator.share({title:'Mergent: an impossible encounter',files:[f]});
  else $('saveImage').click();
 }catch(e){if(e.name!=='AbortError')notify('Sharing unavailable. Use Save PNG.')}
}
for(let i=0;i<6;i++){
 const b=document.createElement('button');b.className='face';b.textContent=symbol[i];
 b.title='Chamber '+(i+1)+': '+descriptions[i].first+' '+descriptions[i].second;
 b.setAttribute('aria-label',b.title);b.setAttribute('aria-pressed','false');
 b.addEventListener('click',()=>rotateToFace(i));$('faces').append(b);
}
$('improbability').value=Math.round(weird*100);$('improbabilityValue').value=Math.round(weird*100)+'%';
$('improbability').addEventListener('input',e=>{
 weird=Number(e.target.value)/100;$('improbabilityValue').value=e.target.value+'%';
 try{localStorage.setItem('mergent-weird',String(e.target.value))}catch{}
});
$('recenter').addEventListener('click',()=>rotateToFace(0));
$('disturb').addEventListener('click',disturb);
$('breach').addEventListener('click',breach);
$('postcard').addEventListener('click',collect);
$('shareImage').addEventListener('click',share);
$('sound').addEventListener('click',()=>{
 playing=!playing;$('sound').setAttribute('aria-pressed',String(playing));
 $('sound').innerHTML=playing?'♫ <span>SOUND ON</span>':'◌ <span>SOUND</span>';
 if(playing)ping(selected,.07);
});
$('about').addEventListener('click',()=>$('help').showModal());
for(const b of document.querySelectorAll('[data-close]'))b.addEventListener('click',() => $(b.dataset.close).close());
for(const d of document.querySelectorAll('dialog'))d.addEventListener('click',e=>{if(e.target===d)d.close()});
window.addEventListener('keydown',e=>{
 if(e.key==='ArrowRight'){e.preventDefault();rotateToFace((selected+1)%6)}
 if(e.key==='ArrowLeft'){e.preventDefault();rotateToFace((selected+5)%6)}
 if(e.key.toLowerCase()==='b'&&e.target.tagName!=='INPUT')breach();
 if(e.code==='Space'&&!['INPUT','BUTTON'].includes(document.activeElement.tagName)){e.preventDefault();disturb()}
});
updateUI();
try{initialize()}catch(e){console.error('Mergent startup error',e);notify('This browser needs WebGL to display Mergent.')}

import {descriptions} from './worlds.js';

const $=id=>document.getElementById(id);
const symbols=['☉','☁','♧','◷','◇','⌁'];
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));

let tracker=null,active=false,starting=false,setupBusy=false,face=-1;
let autoTask=null,targetReady=false,autoError=null;
let breached=false,playing=false,audio=null,pictureBlob=null,toaster=0,timeOffset=0,shockAt=0;
let weird=.53;
try{
 const saved=localStorage.getItem('mergent-weird');
 if(saved!==null){const n=Number(saved);if(Number.isFinite(n))weird=clamp(n/100,0,1)}
}catch{}

for(let i=0;i<6;i++){
 const indicator=document.createElement('span');
 indicator.className='face-indicator';
 indicator.textContent=symbols[i];
 indicator.title='Physical face '+(i+1)+': '+descriptions[i].first+' '+descriptions[i].second;
 indicator.setAttribute('aria-label',indicator.title);
 $('faces').append(indicator);
}

function toast(msg){
 const t=$('toast');t.textContent=msg;t.classList.add('visible');
 clearTimeout(toaster);
 toaster=setTimeout(()=>t.classList.remove('visible'),4300);
}
function status(message){$('status').textContent=message}
function updateUI(){
 const found=face>=0;
 const item=found?descriptions[face]:null;
 document.documentElement.style.setProperty('--accent',item?.accent||'#f6b48c');
 $('caseNumber').textContent=found?'PHYSICAL FACE '+String(face+1).padStart(2,'0')+' / 06':'AWAITING PHYSICAL CUBE';
 $('specimenName').innerHTML=found?item.first+' <i>'+item.second+'</i>':'Unobserved <i>Interior</i>';
 $('specimenDescription').textContent=found?item.blurb:'Show the camera a marked face of your MERGE Cube.';
 $('condition').textContent=found?(breached?'BREACHED':'RECOGNIZED'):'SEARCHING';
 $('instructions').textContent=found?'Turn the real cube to visit another chamber.':'Hold the cube steady in bright, diffuse light. Fill the on-screen guide.';
 [...$('faces').children].forEach((e,i)=>e.classList.toggle('active',found&&i===face));
 for(const id of ['disturb','breach','postcard'])$(id).disabled=!found;
 document.body.classList.toggle('cube-found',found);
}
function ping(which=.0,volume=.07){
 if(!playing)return;
 try{
  audio=audio||new(window.AudioContext||window.webkitAudioContext)();
  if(audio.state==='suspended')void audio.resume();
  const now=audio.currentTime,o=audio.createOscillator(),g=audio.createGain(),f=audio.createBiquadFilter();
  o.type=['sine','triangle','sine','sawtooth','triangle','sine'][which];
  o.frequency.setValueAtTime(160+which*65+Math.random()*100,now);
  o.frequency.exponentialRampToValueAtTime(72+which*22,now+.25);
  f.type='lowpass';f.frequency.value=800;
  g.gain.setValueAtTime(.0001,now);g.gain.exponentialRampToValueAtTime(volume,now+.025);
  g.gain.exponentialRampToValueAtTime(.0001,now+.35);
  o.connect(f);f.connect(g);g.connect(audio.destination);
  o.start(now);o.stop(now+.37);
 }catch(e){console.warn('Sound unavailable',e)}
}
function disturb(){
 if(face<0)return;
 shockAt=performance.now();
 timeOffset+=2+weird*5;
 ping(face,.13);
 toast(['THE INTERIOR HAS REQUESTED AN EXTERIOR','UNAUTHORIZED REALITY DETECTED',
 'THE BACK WALL HAS DISAPPEARED','THERE IS ANOTHER CUBE INSIDE THIS ONE',
 'THE CURATOR HAS BEEN REPLACED BY A WINDOW'][Math.floor(Math.random()*5)]);
}
function breach(){
 if(face<0)return;
 breached=!breached;
 $('breach').textContent=breached?'↯ SEAL BREACH':'↯ BREACH';
 $('breach').setAttribute('aria-pressed',String(breached));
 shockAt=performance.now();updateUI();
 ping((face+1)%6,.13);
 toast(breached?'Two chambers are sharing the same opening.':'Containment nominally restored.');
}
async function share(){
 if(!pictureBlob){toast('Image is still preparing. Select Save PNG.');return}
 const file=new File([pictureBlob],'mergent-encounter.png',{type:'image/png'});
 try{
  if(navigator.canShare?.({files:[file]}))await navigator.share({files:[file],title:'Mergent: a cube encounter'});
  else $('saveImage').click();
 }catch(e){if(e.name!=='AbortError')toast('Sharing unavailable. Use Save PNG.')}
}
function postcard(){
 if(face<0||!active){toast('Show the camera a cube face first.');return}
 const image=tracker?.snapshot();
 if(!image){toast('The camera is not ready for a postcard.');return}
 const canvas=document.createElement('canvas');canvas.width=1000;canvas.height=1280;
 const ctx=canvas.getContext('2d'),gradient=ctx.createLinearGradient(0,0,0,1280);
 gradient.addColorStop(0,'#17283b');gradient.addColorStop(1,'#060a12');
 ctx.fillStyle=gradient;ctx.fillRect(0,0,1000,1280);
 const size=Math.min(image.width,image.height);
 if(!size){toast('The camera frame is empty.');return}
 const x=(image.width-size)/2,y=(image.height-size)/2;
 ctx.drawImage(image,x,y,size,size,58,154,884,884);
 ctx.strokeStyle='#b6a998';ctx.lineWidth=2;ctx.strokeRect(55,151,890,890);
 ctx.fillStyle='#f4bd9a';ctx.font='26px monospace';ctx.textBaseline='top';
 ctx.fillText('MERGENT / FIELD EVIDENCE',58,63);
 const title=descriptions[face].first+' '+descriptions[face].second;
 ctx.fillStyle='#f3eee9';ctx.font=(title.length>25?'43':'55')+'px Georgia,serif';
 ctx.fillText(title,58,1083,900);
 ctx.fillStyle='#b9c5cd';ctx.font='21px monospace';
 ctx.fillText('PHYSICAL FACE '+String(face+1).padStart(2,'0')+' / IMPROBABILITY '+Math.round(weird*100)+'%',58,1172);
 ctx.fillText(breached?'CONTAINMENT STATUS: BREACHED':'CONTAINMENT STATUS: UNRESOLVED',58,1213);
 const data=canvas.toDataURL('image/png');
 $('postcardPreview').src=data;$('saveImage').href=data;
 $('saveImage').download='mergent-face-'+String(face+1).padStart(2,'0')+(breached?'-breach':'')+'.png';
 pictureBlob=null;canvas.toBlob(b=>pictureBlob=b,'image/png');
 $('postcardDialog').showModal();
 ping(face,.1);
}
async function getTracker(){
 if(tracker)return tracker;
 const {createTracker}=await import('./ar.js?v=7');
 tracker=createTracker({
  container:$('arView'),
  onStatus:msg=>{
   if(active||starting)status(msg);
   else $('setupStatus').textContent=msg;
   if(msg.startsWith('CUBE LOST')||msg.startsWith('LOOK FOR')){
    if(face!==-1){face=-1;updateUI()}
   }
  },
  onFace:i=>{face=i;updateUI();status('PHYSICAL FACE '+(i+1)+' / 6 RECOGNIZED');ping(i,.06)},
  getBreach:()=>breached,
  getWeird:()=>weird,
  getTime:()=>performance.now()/1000+timeOffset,
  getShock:()=>Math.max(0,1-(performance.now()-shockAt)/950)
 });
 return tracker;
}

// Load and compile the six official cube faces without any setup click.
// Camera access itself still requires the browser's permission prompt.
async function ensureTargets(force=false){
 if(autoTask&&!force)return autoTask;
 if(force)autoTask=null;
 const work=(async()=>{
  const t=await getTracker();
  if(!force&&await t.hasTargets()){
   targetReady=true;autoError=null;
   $('startCamera').textContent='▣ START CUBE CAMERA';
   if(!active)status('CUBE TRACKING READY');
   return true;
  }
  targetReady=false;status('LEARNING THE SIX FACES · 0%');
  $('startCamera').textContent='PREPARING CUBE TRACKER…';
  await t.prepareFromPDF(null,(percent,message)=>{
   const n=Math.round(percent);
   $('setupProgress').value=n;
   $('setupStatus').textContent=message;
   if(!active){status('LEARNING THE SIX FACES · '+n+'%');$('startCamera').textContent='PREPARING TRACKER · '+n+'%'}
  });
  targetReady=true;autoError=null;
  $('startCamera').textContent='▣ START CUBE CAMERA';
  if(!active)status('CUBE TRACKING READY');
  return true;
 })();
 autoTask=work.catch(e=>{
  autoError=e;targetReady=false;
  $('startCamera').textContent='▣ START CUBE CAMERA';
  status('AUTOMATIC SETUP UNAVAILABLE');
  $('setupStatus').textContent='Automatic setup failed: '+(e?.message||e)+'. Use IMPORT DOWNLOADED PDF if required.';
  console.warn('Automatic MERGE Cube tracking preparation failed',e);
  return false;
 });
 return autoTask;
}

function cameraUI(on){
 document.body.classList.toggle('camera-active',on);
 $('launchPanel').hidden=on;
 $('controls').hidden=!on;
 $('stopCamera').hidden=!on;
}
async function beginCamera(){
 if(starting||setupBusy||active)return;
 starting=true;
 $('startCamera').disabled=true;
 $('startCamera').textContent='PREPARING CAMERA…';
 try{
  const ready=await ensureTargets();
  if(!ready){$('setupDialog').showModal();return}
  const t=await getTracker();
  face=-1;updateUI();active=true;cameraUI(true);status('REQUESTING CAMERA PERMISSION');
  await t.start();
  if($('setupDialog').open)$('setupDialog').close();
 }catch(e){
  console.error('Camera start failed',e);
  active=false;face=-1;cameraUI(false);updateUI();
void ensureTargets();
  status('CAMERA UNAVAILABLE');
  toast('Camera error: '+(e?.message||e));
 }finally{
  starting=false;
  $('startCamera').disabled=false;
  $('startCamera').textContent='▣ START CUBE CAMERA';
 }
}
async function endCamera(){
 if(starting)return;
 starting=true;
 try{await tracker?.stop()}
 catch(e){console.warn('Stop camera',e)}
 active=false;face=-1;cameraUI(false);updateUI();status('PHYSICAL CUBE REQUIRED');
 starting=false;
}
async function setupFromPDF(file=null){
 if(setupBusy||starting)return;
 setupBusy=true;
 for(const id of ['setupPdf','setupFile','setupMind'])$(id).disabled=true;
 $('setupProgress').value=0;
 $('setupStatus').textContent='Reading MERGE face reference…';
 let success=false;
 try{
  const t=await getTracker();
  await t.prepareFromPDF(file,(pct,msg)=>{
   $('setupProgress').value=pct;$('setupStatus').textContent=msg;
  });
  success=true;
  targetReady=true;autoError=null;autoTask=Promise.resolve(true);
 }catch(e){
  console.error('Face calibration failed',e);
  $('setupStatus').textContent='Calibration error: '+(e?.message||e)+'. Try importing the PDF from Files instead.';
 }finally{
  setupBusy=false;
  for(const id of ['setupPdf','setupFile','setupMind'])$(id).disabled=false;
 }
 if(success)await beginCamera();
}
async function setupFromMind(file){
 if(setupBusy||starting)return;
 setupBusy=true;
 try{
  const t=await getTracker();
  await t.importMind(await file.arrayBuffer());
 }catch(e){
  $('setupStatus').textContent='Invalid targets: '+(e?.message||e);
  setupBusy=false;return;
 }
 targetReady=true;autoError=null;autoTask=Promise.resolve(true);
 setupBusy=false;await beginCamera();
}
async function rebuild(){
 $('help').close();
 if(active)await endCamera();
 toast('Rebuilding the six tracking faces automatically…');
 const ok=await ensureTargets(true);
 if(!ok)$('setupDialog').showModal();
}
$('startCamera').addEventListener('click',()=>void beginCamera());
$('stopCamera').addEventListener('click',()=>void endCamera());
$('setupPdf').addEventListener('click',()=>void setupFromPDF());
$('setupFile').addEventListener('click',()=>$('pdfFile').click());
$('pdfFile').addEventListener('change',e=>{
 const f=e.target.files?.[0];if(f)void setupFromPDF(f);e.target.value='';
});
$('setupMind').addEventListener('click',()=>$('mindFile').click());
$('mindFile').addEventListener('change',e=>{
 const f=e.target.files?.[0];if(f)void setupFromMind(f);e.target.value='';
});
$('recalibrate').addEventListener('click',()=>void rebuild());
$('disturb').addEventListener('click',disturb);
$('breach').addEventListener('click',breach);
$('postcard').addEventListener('click',postcard);
$('shareImage').addEventListener('click',()=>void share());
$('sound').addEventListener('click',()=>{
 playing=!playing;$('sound').setAttribute('aria-pressed',String(playing));
 $('sound').innerHTML=playing?'♫ <span>SOUND ON</span>':'◌ <span>SOUND</span>';
 if(playing)ping(Math.max(0,face),.07);
});
$('about').addEventListener('click',()=>$('help').showModal());
for(const b of document.querySelectorAll('[data-close]'))b.addEventListener('click',()=>$(b.dataset.close).close());
for(const d of document.querySelectorAll('dialog'))d.addEventListener('click',e=>{
 if(e.target===d)d.close();
});
$('improbability').value=Math.round(weird*100);
$('improbabilityValue').value=Math.round(weird*100)+'%';
$('improbability').addEventListener('input',e=>{
 weird=Number(e.target.value)/100;
 $('improbabilityValue').value=e.target.value+'%';
 try{localStorage.setItem('mergent-weird',e.target.value)}catch{}
});
window.addEventListener('pagehide',()=>{if(active)void endCamera()});
cameraUI(false);updateUI();

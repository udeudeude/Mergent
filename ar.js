import * as THREE from 'three';
import {MindARThree} from 'https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image-three.prod.js';
import {Compiler} from 'https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image.prod.js';
import {chamber,FACE_NORMALS} from './cube.js';

const PDF_URL='https://res.cloudinary.com/apsphysics/image/upload/merge-paper-cube_mizj2k.pdf';
const PDFJS='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs';
const PDF_WORKER='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs';
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const Z=new THREE.Vector3(0,0,1);
const DB='mergent-cube-tracker';
const KEY='standard-six-faces-v1';

function openDB(){
 return new Promise((resolve,reject)=>{
  const req=indexedDB.open(DB,1);
  req.onupgradeneeded=()=>req.result.createObjectStore('data');
  req.onsuccess=()=>resolve(req.result);
  req.onerror=()=>reject(req.error||new Error('Local storage unavailable'));
 });
}
async function getLocal(){
 try{
  const db=await openDB();
  const result=await new Promise((resolve,reject)=>{
   const req=db.transaction('data','readonly').objectStore('data').get(KEY);
   req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
  });
  db.close();
  return result?.buffer||null;
 }catch(e){console.warn('Could not open local tracking data',e);return null}
}
async function putLocal(buffer){
 try{
  const db=await openDB();
  await new Promise((resolve,reject)=>{
   const tx=db.transaction('data','readwrite');
   tx.objectStore('data').put({buffer,count:6,created:Date.now()},KEY);
   tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);
  });
  db.close();
 }catch(e){console.warn('Could not cache tracking data',e)}
}
async function pageToTargets(file,onProgress){
 const pdfjs=await import(PDFJS);
 pdfjs.GlobalWorkerOptions.workerSrc=PDF_WORKER;
 const source=file?{data:new Uint8Array(await file.arrayBuffer())}:{url:PDF_URL};
 let pdfDocument;
 try{pdfDocument=await pdfjs.getDocument(source).promise}
 catch(e){throw new Error('Official PDF could not be downloaded. Save it to Files, then use IMPORT PDF FROM FILES. '+(e?.message||e))}
 try{
  if(pdfDocument.numPages<1)throw new Error('PDF has no pages');
  const page=await pdfDocument.getPage(1);
  const viewport=page.getViewport({scale:2.6});
  const raster=document.createElement('canvas');
  raster.width=Math.ceil(viewport.width);
  raster.height=Math.ceil(viewport.height);
  await page.render({canvasContext:raster.getContext('2d',{alpha:false}),viewport}).promise;
  // Coordinates of the six printed, square faces on MERGE's 1088x1405
  // reference layout. Outer folds, labels, and assembly tabs are excluded.
  const W=1088,H=1405,S=273,pad=6;
  const origins=[[408,75],[136,348],[408,348],[680,348],[408,621],[408,894]];
  const targets=[];
  for(let i=0;i<origins.length;i++){
   const [x,y]=origins[i];
   const c=document.createElement('canvas');c.width=c.height=344;
   c.getContext('2d',{alpha:false}).drawImage(raster,
      (x+pad)/W*raster.width,(y+pad)/H*raster.height,
      (S-2*pad)/W*raster.width,(S-2*pad)/H*raster.height,
      0,0,344,344);
   const img=new Image();
   img.src=c.toDataURL('image/png');
   await img.decode();
   targets.push(img);
   onProgress(2+(i+1)*2,'Reading official cube face '+(i+1)+' / 6');
   await new Promise(resolve=>requestAnimationFrame(resolve));
  }
  raster.width=raster.height=0;
  return targets;
 }finally{await pdfDocument.destroy()}
}
export function createTracker({container,onStatus=()=>{},onFace=()=>{},getBreach=()=>false,getWeird=()=>.5,getTime=()=>0}){
 let compiled=null,engine=null,objectURL=null,activeFace=-1,rooms=null,wrapper=null,running=false;
 const status=msg=>onStatus(msg);
 async function hasTargets(){
  if(compiled)return true;
  compiled=await getLocal();
  return !!compiled;
 }
 async function prepareFromPDF(file,progress=()=>{}){
  if(running)throw new Error('Exit camera mode before preparing reference targets');
  progress(1,'Opening MERGE reference PDF…');
  const images=await pageToTargets(file,progress);
  progress(15,'Extracting visual features from the six cube faces…');
  const compiler=new Compiler();
  await compiler.compileImageTargets(images,p=>{
    const n=clamp(Number(p)||0,0,100);
    progress(Math.round(15+n*.83),'Compiling six markers… '+Math.round(n)+'%');
  });
  const output=await compiler.exportData();
  if(!output||output.byteLength<100)throw new Error('Empty tracking data produced');
  compiled=output;
  await putLocal(output);
  progress(100,'Six standard MERGE Cube faces are ready. Camera can now recognize them.');
 }
 async function importMind(buffer){
  const data=new Compiler().importData(buffer);
  if(!data||data.length!==6)throw new Error('This file must contain all six face targets');
  compiled=buffer;await putLocal(buffer);
 }
 function prepareCube(){
  const cube=new THREE.Group();
  rooms=FACE_NORMALS.map((_,i)=>{
    const room=chamber(i);
    room.open.visible=false;
    room.closed.visible=true;
    cube.add(room.group);
    return room;
  });
  const edges=new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(1.66,1.66,1.66)),
    new THREE.LineBasicMaterial({color:0xa8c0c9,transparent:true,opacity:.84}));
  cube.add(edges);
  wrapper=new THREE.Group();
  wrapper.scale.setScalar(1/1.58);
  // In MindAR, the detected planar face sits at z=0 in target units.
  // Move the CGI cube behind this plane so the virtual opening replaces
  // the printed face instead of floating in front of the physical cube.
  wrapper.position.z=-.5;
  wrapper.add(cube);
  return cube;
 }
 function exposeFace(index,cube){
  cube.quaternion.setFromUnitVectors(FACE_NORMALS[index],Z);
  rooms.forEach((r,i)=>{r.open.visible=i===index;r.closed.visible=i!==index});
 }
 async function start(){
  if(running)return;
  if(!await hasTargets())throw new Error('First prepare the six cube markers from the official PDF');
  if(!navigator.mediaDevices?.getUserMedia)throw new Error('Camera permission requires Safari/Chrome over HTTPS');
  objectURL=URL.createObjectURL(new Blob([compiled],{type:'application/octet-stream'}));
  const ar=new MindARThree({
   container,imageTargetSrc:objectURL,
   uiLoading:false,uiScanning:false,uiError:false,
   maxTrack:1,filterMinCF:.001,filterBeta:700,
   warmupTolerance:2,missTolerance:3
  });
  engine=ar;
  try{
   const {renderer,scene,camera}=ar;
   renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));
   scene.add(new THREE.HemisphereLight(0xe6f2ff,0x29394e,1.6));
   const light=new THREE.DirectionalLight(0xffd2a5,2.7);
   light.position.set(1,2,3);scene.add(light);
   const fill=new THREE.DirectionalLight(0x9abafa,1.4);
   fill.position.set(-2,-1,1);scene.add(fill);
   const cube=prepareCube();
   for(let i=0;i<6;i++){
    const anchor=ar.addAnchor(i);
    anchor.onTargetFound=()=>{
     activeFace=i;
     anchor.group.add(wrapper);
     exposeFace(i,cube);
     onFace(i);
     status('TRACKING FACE '+(i+1)+' / 6');
    };
    anchor.onTargetLost=()=>{
     if(activeFace===i){activeFace=-1;status('CUBE LOST · AIM AT A PRINTED FACE')}
    };
   }
   status('REQUESTING REAR CAMERA');
   await ar.start();
   running=true;
   status('LOOK FOR THE CUBE · TURN IT SLOWLY');
   renderer.setAnimationLoop(()=>{
    const i=activeFace;
    if(i>=0&&rooms){
     const t=getTime(),w=getWeird(),breach=getBreach();
     const r=rooms[i];
     r.specimen.userData.tick(t,w,0);
     r.echoHolder.visible=breach;r.recursing.visible=breach;
     if(breach){
      r.echo.userData.tick(t,w,0);
      r.echoHolder.rotation.z=t*.45;
      r.recursing.rotation.x=t*.30;
      r.recursing.rotation.y=t*.39;
     }
    }
    renderer.render(scene,camera);
   });
  }catch(e){
   try{ar.stop()}catch{}
   try{ar.renderer.dispose()}catch{}
   container.replaceChildren();
   engine=null;
   URL.revokeObjectURL(objectURL);objectURL=null;
   throw e;
  }
 }
 async function stop(){
  if(!engine)return;
  running=false;activeFace=-1;
  const ar=engine;engine=null;
  try{ar.renderer.setAnimationLoop(null)}catch{}
  try{ar.stop()}catch(e){console.warn('Camera stop',e)}
  try{ar.renderer.dispose()}catch{}
  try{ar.cssRenderer?.domElement?.remove()}catch{}
  try{
   rooms?.forEach(r=>r.group.traverse(obj=>{
     obj.geometry?.dispose?.();
     if(obj.material)(Array.isArray(obj.material)?obj.material:[obj.material]).forEach(m=>m.dispose?.());
   }));
  }catch{}
  rooms=null;wrapper=null;
  container.replaceChildren();
  if(objectURL){URL.revokeObjectURL(objectURL);objectURL=null}
  status('VIRTUAL PREVIEW');
 }
 function snapshot(){
  if(!engine?.video||!running)return null;
  const v=engine.video,gl=engine.renderer.domElement;
  const c=document.createElement('canvas');
  c.width=gl.width;c.height=gl.height;
  const ctx=c.getContext('2d');
  const scale=Math.max(c.width/v.videoWidth,c.height/v.videoHeight);
  const w=v.videoWidth*scale,h=v.videoHeight*scale;
  ctx.drawImage(v,(c.width-w)/2,(c.height-h)/2,w,h);
  try{engine.renderer.render(engine.scene,engine.camera);ctx.drawImage(gl,0,0,c.width,c.height)}
  catch(e){console.warn('AR overlay screenshot unavailable',e)}
  return c;
 }
 return{hasTargets,prepareFromPDF,importMind,start,stop,snapshot};
}

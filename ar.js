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
const KEY='standard-six-faces-v2';

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
  // Face target order follows the cube's rigid 3D orientation:
  // front (center), right, back (bottommost), left, top, bottom.
  // The original PDF is a net; keeping this order is essential for
  // estimating one continuous cube pose from adjacent visible faces.
  const origins=[[408,348],[680,348],[408,894],[136,348],[408,75],[408,621]];
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
export function createTracker({container,onStatus=()=>{},onFace=()=>{},getBreach=()=>false,getWeird=()=>.5,getTime=()=>0,getShock=()=>0}){
 let compiled=null,engine=null,objectURL=null,activeFace=-1,rooms=null,wrapper=null,running=false;
 const status=msg=>onStatus(msg);
 // The six target images occupy the faces of a single connected cube net.
 // These rotations map the upright, square PDF image axes into a common
 // cube coordinate frame, rather than independently facing each target.
 const X=new THREE.Vector3(1,0,0),Y=new THREE.Vector3(0,1,0);
 const faceRotations=[
  new THREE.Quaternion(),
  new THREE.Quaternion().setFromAxisAngle(Y,Math.PI/2),
  new THREE.Quaternion().setFromAxisAngle(X,Math.PI),
  new THREE.Quaternion().setFromAxisAngle(Y,-Math.PI/2),
  new THREE.Quaternion().setFromAxisAngle(X,-Math.PI/2),
  new THREE.Quaternion().setFromAxisAngle(X,Math.PI/2)
 ];
 const faceToCubeInverse=faceRotations.map((rotation,i)=>{
  const pose=new THREE.Matrix4().compose(FACE_NORMALS[i].clone().multiplyScalar(.5),rotation,new THREE.Vector3(1,1,1));
  return pose.invert();
 });
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
 let poseRoot=null,anchors=[],currentIndex=-1,poseInitialized=false;
 let lastDetection=0,lastStatus='';
 let measurementVersion=0,lastProcessedVersion=-1;
 let newestMeasurementAt=0,previousMeasurementAt=0;
 const tempPos=new THREE.Vector3(),tempQuat=new THREE.Quaternion(),tempScale=new THREE.Vector3();
 const trackedPos=new THREE.Vector3(),trackedQuat=new THREE.Quaternion(),trackedScale=new THREE.Vector3(1,1,1);
 const cameraForward=new THREE.Vector3(0,0,1);
 function announce(message){if(message!==lastStatus){lastStatus=message;status(message)}}
 function prepareCube(){
  const cube=new THREE.Group();
  rooms=FACE_NORMALS.map((_,i)=>{
   const r=chamber(i);r.open.visible=false;r.closed.visible=true;
   cube.add(r.group);return r;
  });
  const edges=new THREE.LineSegments(
   new THREE.EdgesGeometry(new THREE.BoxGeometry(1.66,1.66,1.66)),
   new THREE.LineBasicMaterial({color:0xa8c0c9,transparent:true,opacity:.84}));
  cube.add(edges);
  wrapper=new THREE.Group();
  wrapper.scale.setScalar(1/1.58);
  wrapper.add(cube);
  poseRoot=new THREE.Group();
  poseRoot.matrixAutoUpdate=false;
  poseRoot.visible=false;
  poseRoot.add(wrapper);
  return cube;
 }
 function frontFace(){
  // The face physically pointing toward the camera is the aperture.
  // Unlike switching image targets, its identity is derived from the
  // smoothed pose of the *whole* cube.
  let best=-1,bestScore=-Infinity;
  for(let i=0;i<6;i++){
   const outward=FACE_NORMALS[i].clone().applyQuaternion(trackedQuat);
   const score=outward.dot(cameraForward);
   if(score>bestScore){bestScore=score;best=i}
  }
  if(currentIndex>=0){
   const oldScore=FACE_NORMALS[currentIndex].clone().applyQuaternion(trackedQuat).dot(cameraForward);
   if(oldScore>bestScore-.045)return currentIndex;
  }
  return best;
 }
 function updateTrackedPose(){
  // MindAR updates target matrices asynchronously, often far less often
  // than requestAnimationFrame. Don't add another low-pass filter for each
  // duplicate frame: that made the object noticeably lag behind the camera.
  const now=performance.now();
  if(measurementVersion===lastProcessedVersion){
   if(poseInitialized&&now-lastDetection>220){
    poseRoot.visible=false;activeFace=-1;currentIndex=-1;
    announce('CUBE LOST · SHOW A MARKED FACE');
   }
   return;
  }
  lastProcessedVersion=measurementVersion;
  const candidates=[];
  for(let i=0;i<anchors.length;i++){
   const anchor=anchors[i];
   if(!anchor.visible||!anchor.group.visible)continue;
   const cubePose=anchor.group.matrix.clone().multiply(faceToCubeInverse[i]);
   const p=new THREE.Vector3(),q=new THREE.Quaternion(),sc=new THREE.Vector3();
   cubePose.decompose(p,q,sc);
   // Positive-Z points from the object toward the rear camera.
   const faceNormal=FACE_NORMALS[i].clone().applyQuaternion(q);
   const facing=faceNormal.z;
   if(!Number.isFinite(p.x)||!Number.isFinite(q.w)||facing<-.15)continue;
   candidates.push({i,p,q,sc,facing});
  }
  if(!candidates.length){
   if(poseInitialized&&now-lastDetection<190){
    poseRoot.visible=true;
    return;
   }
   poseRoot.visible=false;activeFace=-1;currentIndex=-1;
   announce('CUBE LOST · SHOW A MARKED FACE');
   return;
  }
  lastDetection=now;
  // Prefer the most frontal target, but accept adjacent faces too. The
  // relative geometry of the cube keeps the pose in a common frame.
  candidates.sort((a,b)=>b.facing-a.facing);
  const primary=candidates[0];
  tempPos.copy(primary.p);tempQuat.copy(primary.q);tempScale.copy(primary.sc);
  for(let j=1;j<candidates.length;j++){
   const other=candidates[j];
   const deviation=other.p.distanceTo(primary.p);
   const angular=other.q.angleTo(primary.q);
   // Exclude outliers instead of letting a misread face flip the cube.
   if(deviation>primary.sc.x*.24||angular>.42)continue;
   const weight=Math.min(.4,Math.max(.13,other.facing/(primary.facing+other.facing+1e-5)));
   tempPos.lerp(other.p,weight);tempQuat.slerp(other.q,weight);
   tempScale.lerp(other.sc,weight);
  }
  if(!poseInitialized){
   trackedPos.copy(tempPos);trackedQuat.copy(tempQuat);trackedScale.copy(tempScale);
   poseInitialized=true;
  }else{
   // MindAR already applies a One Euro motion filter. This lightweight,
   // sample-driven second stage suppresses tiny jitters without repeatedly
   // chasing the same old measurement. Large/fast changes nearly bypass it.
   const movement=trackedPos.distanceTo(tempPos)/Math.max(.01,tempScale.x);
   const turn=trackedQuat.angleTo(tempQuat);
   const alpha=(movement>.035||turn>.045)?.93:.78;
   trackedPos.lerp(tempPos,alpha);
   trackedQuat.slerp(tempQuat,alpha);
   trackedScale.lerp(tempScale,alpha);
  }
  poseRoot.matrix.compose(trackedPos,trackedQuat,trackedScale);
  poseRoot.matrixWorldNeedsUpdate=true;
  poseRoot.visible=true;
  const index=frontFace();
  if(index!==currentIndex){
   currentIndex=index;onFace(index);
   rooms.forEach((r,i)=>{r.open.visible=i===index;r.closed.visible=i!==index});
  }
  activeFace=index;
  announce('TRACKING CUBE · '+candidates.length+' FACE'+(candidates.length===1?'':'S')+' VISIBLE');
 }
 async function start(){
  if(running)return;
  if(!await hasTargets())throw new Error('Tracking data has not finished preparing');
  if(!navigator.mediaDevices?.getUserMedia)throw new Error('This browser needs HTTPS camera permission');
  objectURL=URL.createObjectURL(new Blob([compiled],{type:'application/octet-stream'}));
  const ar=new MindARThree({
   container,imageTargetSrc:objectURL,
   uiLoading:false,uiScanning:false,uiError:false,
   // Performance-first: with maxTrack=2 MindAR continually runs an
   // expensive full detector while one face is already being tracked.
   // One tracked face still determines the rigid cube's six-face pose.
   maxTrack:1,filterMinCF:.008,filterBeta:1200,
   warmupTolerance:1,missTolerance:2
  });
  engine=ar;
  try{
   const {renderer,scene,camera}=ar;
   // Reduce GPU fill-rate on high-DPI iPhones. Display resolution is
   // independent from MindAR's camera detector resolution.
   renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.4));
   scene.add(new THREE.HemisphereLight(0xe6f2ff,0x29394e,1.6));
   const key=new THREE.DirectionalLight(0xffd2a5,2.7);
   key.position.set(1,2,3);scene.add(key);
   const fill=new THREE.DirectionalLight(0x9abafa,1.4);
   fill.position.set(-2,-1,1);scene.add(fill);
   prepareCube();scene.add(poseRoot);
   anchors=[];
   measurementVersion=0;lastProcessedVersion=-1;
   for(let i=0;i<6;i++){
    const anchor=ar.addAnchor(i);
    anchors.push(anchor);
    anchor.onTargetFound=()=>{measurementVersion++};
    anchor.onTargetLost=()=>{measurementVersion++};
    anchor.onTargetUpdate=()=>{measurementVersion++};
   }
   poseInitialized=false;currentIndex=-1;activeFace=-1;
   announce('REQUESTING REAR CAMERA');
   await ar.start();
   running=true;
   announce('LOOK FOR THE CUBE · TURN IT SLOWLY');
   renderer.setAnimationLoop(()=>{
    updateTrackedPose();
    const i=activeFace;
    if(i>=0&&rooms){
     const t=getTime(),w=getWeird(),breach=getBreach();
     const r=rooms[i];
     r.specimen.userData.tick(t,w,getShock());
     r.echoHolder.visible=breach;r.recursing.visible=breach;
     if(breach){
      r.echo.userData.tick(t,w,getShock());
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
   container.replaceChildren();engine=null;
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
  try{rooms?.forEach(r=>r.group.traverse(obj=>{
   obj.geometry?.dispose?.();
   if(obj.material)(Array.isArray(obj.material)?obj.material:[obj.material]).forEach(m=>m.dispose?.());
  }))}catch{}
  rooms=null;wrapper=null;poseRoot=null;anchors=[];
  poseInitialized=false;currentIndex=-1;lastStatus='';measurementVersion=0;lastProcessedVersion=-1;
  container.replaceChildren();
  if(objectURL){URL.revokeObjectURL(objectURL);objectURL=null}
  status('CAMERA CLOSED');
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

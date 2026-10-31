import * as THREE from 'three';
import {descriptions,makeWorld} from './worlds.js';
export const FACE_NORMALS=[new THREE.Vector3(0,0,1),new THREE.Vector3(1,0,0),new THREE.Vector3(0,0,-1),new THREE.Vector3(-1,0,0),new THREE.Vector3(0,1,0),new THREE.Vector3(0,-1,0)];

function material(c,options={}){return new THREE.MeshStandardMaterial({color:c,metalness:.8,roughness:.27,...options})}
function box(w,h,d,mat,x=0,y=0,z=0){
 const obj=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);
 obj.position.set(x,y,z);return obj
}
export function chamber(index){
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

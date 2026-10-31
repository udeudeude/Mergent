import * as THREE from 'three';
export const descriptions = [
  {first:'The Pocket', second:'Orrery', short:'An astronomical instrument with unreliable physics.', blurb:'A solar system small enough to misplace. Its planets are reliably in the wrong places.', accent:'#f6b48c', type:'orrery'},
  {first:'The Upside-Down',second:'Weather',short:'A meteorological event that remembers tomorrow.',blurb:'A contained storm in which the rain falls upward and the thunder is always late.',accent:'#8fe3e9',type:'weather'},
  {first:'The Memory',second:'Orchard',short:'A tree that produces things you have forgotten.',blurb:'Its fruit is made of little lost afternoons. None are yours, and all are familiar.',accent:'#b4d994',type:'orchard'},
  {first:'The Escaped',second:'Hours',short:'Time keeps leaking out of its enclosure.',blurb:'An obsolete clockwork organism. Every revolution takes approximately never.',accent:'#ddabd7',type:'clock'},
  {first:'The Impossible',second:'Interior',short:'An opening into the outside of itself.',blurb:'Measurements suggest the inside is much larger than the outside, especially on Tuesdays.',accent:'#e7db9d',type:'geometry'},
  {first:'The Last',second:'Broadcast',short:'A receiver for signals that have not been sent.',blurb:'Every few seconds, it answers a question nobody has thought to ask.',accent:'#98adfc',type:'radio'}
];

const rand=(seed)=>()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296};
const mat=(color,opt={})=>new THREE.MeshStandardMaterial({color,roughness:.27,metalness:.55,emissive:color,emissiveIntensity:.10,...opt});
const glow=(color,o=.7)=>new THREE.MeshBasicMaterial({color,transparent:true,opacity:o,depthWrite:false});
const wire=(color,o=.66)=>new THREE.MeshBasicMaterial({color,wireframe:true,transparent:true,opacity:o});
const mesh=(geo,material,x=0,y=0,z=0)=>{const m=new THREE.Mesh(geo,material);m.position.set(x,y,z);return m};
function rod(g,a,b,r,col){const d=new THREE.Vector3().subVectors(b,a);const m=mesh(new THREE.CylinderGeometry(r,r,d.length(),8),col);m.position.copy(a).add(b).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.clone().normalize());g.add(m);return m}
function circ(radius,color,thick=.009){return mesh(new THREE.TorusGeometry(radius,thick,7,92),glow(color,.68))}
function stem(g,x,y,z,dx,dy,dz,r,col){return rod(g,new THREE.Vector3(x,y,z),new THREE.Vector3(dx,dy,dz),r,col)}
export function makeWorld(i){
 const d=descriptions[i],r=rand(8484+i*911),g=new THREE.Group(),p=new THREE.Group(),moving=[];g.userData={moving,t:0,burst:0};g.add(p);const base=mat('#253442',{metalness:.85,roughness:.22});
 const podium=mesh(new THREE.CylinderGeometry(.365,.39,.047,72),base,0,-.22,.035);podium.rotation.x=Math.PI/2;g.add(podium);
 const rim=circ(.382,d.accent,.008);rim.position.set(0,-.22,.062);rim.rotation.x=0;g.add(rim);
 const coreColor=mat(d.accent), faint=glow(d.accent,.65), thin=mat('#cad9d7');
 if(d.type==='orrery'){
   p.add(mesh(new THREE.IcosahedronGeometry(.10,2),mat('#f2bb80',{emissive:'#f2a05b',emissiveIntensity:.65}),0,0,.12));
   const rings=[.20,.29,.37];const planets=[];
   rings.forEach((rad,k)=>{const ring=circ(rad,d.accent,.005);ring.rotation.set(.24+(k*.2),.26*(k+1),0);ring.position.z=.12;p.add(ring);const m=mesh(new THREE.SphereGeometry(.031+k*.008,12,10),mat(['#c7e2df','#d8a3d9','#b3e5b4'][k]),rad,0,.12);p.add(m);planets.push({m,rad,spd:[1.3,-.8,.53][k],phase:k*2})});
   g.userData.animate=(t,w)=>{p.rotation.z=t*(.14+w*.23);planets.forEach(o=>{o.m.position.x=Math.cos(t*o.spd*(.6+w)+o.phase)*o.rad;o.m.position.y=Math.sin(t*o.spd*(.6+w)+o.phase)*o.rad;o.m.position.z=.12+Math.sin(t*o.spd+o.phase)*.07})};
 } else if(d.type==='weather'){
   const clouds=[];for(let j=0;j<11;j++){const c=mesh(new THREE.IcosahedronGeometry(.075+r()*.07,1),mat('#b3d4e2',{transparent:true,opacity:.76,roughness:.8,metalness:0}), (r()-.5)*.40,(r()-.5)*.13+.08,.10+r()*.10);p.add(c);clouds.push(c)}
   const drops=[];for(let j=0;j<65;j++){const a=mesh(new THREE.CylinderGeometry(.002,.002,.03+r()*.05,3),glow('#87d8ef',.58),(r()-.5)*.55,(r()-.5)*.66,.08+r()*.05);a.rotation.z=.2;p.add(a);drops.push({m:a,s:r()})}
   g.userData.animate=(t,w)=>{p.rotation.z=Math.sin(t*.2)*.22;clouds.forEach((c,j)=>c.position.y=.08+Math.sin(t*.9+j)*.015);drops.forEach(({m,s})=>{m.position.y=((m.position.y+.012*(.4+w*2+s))+.44)% .88-.44})};
 } else if(d.type==='orchard'){
   const trunk=mat('#af8c68',{roughness:.79,metalness:.05});stem(p,0,-.20,.10,0,.17,.10,.024,trunk);const fruits=[];
   for(let j=0;j<9;j++){const ang=j*Math.PI*2/9,rr=.11+r()*.11,xx=Math.sin(ang)*rr,yy=Math.cos(ang)*rr+.17;stem(p,0,-.02,.10,xx,yy,.10+r()*.1,.009,trunk);const leaf=mesh(new THREE.IcosahedronGeometry(.056+r()*.03,1),mat('#729d83',{roughness:.55,emissive:'#4d8a73',emissiveIntensity:.25}),xx,yy,.17);p.add(leaf);const fruit=mesh(new THREE.OctahedronGeometry(.026+r()*.015),mat(['#fff0bb','#d2d9fb','#e5afcd'][j%3],{emissiveIntensity:.48}),xx+.04,yy-.03,.18);p.add(fruit);fruits.push(fruit)}
   g.userData.animate=(t,w)=>{p.rotation.z=Math.sin(t*.42)*.08;fruits.forEach((f,j)=>{f.scale.setScalar(.8+(.3+w*.25)*(.5+.5*Math.sin(t*1.5+j)))})};
 } else if(d.type==='clock'){
   for(let j=0;j<4;j++){const radius=.12+j*.075,ring=circ(radius,d.accent,.006);ring.position.z=.09+j*.01;p.add(ring);for(let k=0;k<12;k++){const theta=k*Math.PI/6,bolt=mesh(new THREE.BoxGeometry(.015,.027,.01),coreColor,Math.sin(theta)*radius,Math.cos(theta)*radius,.1+j*.01);bolt.rotation.z=-theta;p.add(bolt)}}
   const hands=[];for(let j=0;j<3;j++){const hand=mesh(new THREE.BoxGeometry(.012,.18-j*.025,.016),mat(['#ffdec3','#ebaddd','#b4d2f9'][j]),0,.072,.17+j*.009);const pivot=new THREE.Group();pivot.add(hand);p.add(pivot);hands.push(pivot)}
   p.add(mesh(new THREE.SphereGeometry(.026),coreColor,0,0,.18));g.userData.animate=(t,w)=>{hands.forEach((h,j)=>{h.rotation.z=t*[.2,-.8,2.5][j]*(1+w*1.9)});p.rotation.y=Math.sin(t*.15)*.28};
 } else if(d.type==='geometry'){
   const nested=[];for(let j=0;j<7;j++){const s=.07+j*.043,ob=mesh(new THREE.OctahedronGeometry(s,0),wire(['#f8dba3','#84deda','#ecb4ed'][j%3],.82-j*.08),0,0,.04+j*.023);p.add(ob);nested.push(ob)}
   for(let j=0;j<3;j++){const tor=circ(.20+j*.07,d.accent,.004);tor.rotation.set(j*1.02,.6,0);p.add(tor)}
   g.userData.animate=(t,w)=>{nested.forEach((o,j)=>{o.rotation.x=t*(.19+w*.3)*(j%2?-1:1);o.rotation.y=t*(.25+w*.16)*(j%2?1:-1);o.scale.setScalar(.84+.1*Math.sin(t*.8+j))})};
 } else if(d.type==='radio'){
   const c=mat('#c7d9e8',{metalness:.87});stem(p,0,-.19,.09,0,.30,.17,.012,c);stem(p,-.15,-.19,.09,0,.30,.17,.005,c);stem(p,.15,-.19,.09,0,.30,.17,.005,c);for(let j=0;j<5;j++){const y=-.16+j*.09;stem(p,-.12+(j*.01),y,.10,.12-j*.01,y+.08,.11,.006,c);stem(p,.12-j*.01,y,.10,-.12+j*.01,y+.08,.11,.006,c)}
   p.add(mesh(new THREE.SphereGeometry(.023,12,8),mat('#e9f5fb',{emissive:'#95abfc',emissiveIntensity:.8}),0,.31,.17));const waves=[];for(let j=0;j<4;j++){const q=circ(.09+j*.055,d.accent,.006);q.position.set(0,.27,.13);p.add(q);waves.push(q)}
   g.userData.animate=(t,w)=>{waves.forEach((o,j)=>{const a=(t*.75*(.7+w)+j*.25)%1;o.scale.setScalar(.4+a*2.5);o.material.opacity=(1-a)*.55});p.rotation.y=Math.sin(t*.4)*.15};
 }
 const dots=[];for(let j=0;j<30;j++){const a=r()*Math.PI*2,rr=.11+r()*.38,z=.06+r()*.3;const dot=mesh(new THREE.SphereGeometry(.003+r()*.003,5,4),glow(d.accent,.32+r()*.33),Math.cos(a)*rr,Math.sin(a)*rr,z);g.add(dot);dots.push(dot)}
 const halo=circ(.45,d.accent,.004);halo.material.opacity=.17;halo.position.z=.01;g.add(halo);
 g.userData.tick=(t,w,shock)=>{if(g.userData.animate)g.userData.animate(t,w);dots.forEach((o,j)=>{o.position.z=.07+Math.sin(t*.58+j*2)*.10+Math.sin(j)*.09});g.scale.setScalar(1+.035*shock*Math.sin(t*33));};
 return g;
}



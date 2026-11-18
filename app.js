'use strict';
const $ = id => document.getElementById(id);
const canvas = $('map'), ctx = canvas.getContext('2d');
const demo = () => ({tee:{x:.48,y:.91}, green:{x:.55,y:.09}, fairways:[[{x:.32,y:.77},{x:.28,y:.64},{x:.32,y:.51},{x:.4,y:.4},{x:.43,y:.26},{x:.51,y:.18},{x:.64,y:.19},{x:.68,y:.32},{x:.63,y:.45},{x:.68,y:.57},{x:.63,y:.7},{x:.58,y:.78}]], hazards:[[{x:.21,y:.55},{x:.27,y:.51},{x:.31,y:.55},{x:.29,y:.66},{x:.23,y:.68},{x:.18,y:.63}],[{x:.64,y:.36},{x:.69,y:.31},{x:.75,y:.33},{x:.78,y:.4},{x:.73,y:.46},{x:.68,y:.44}],[{x:.41,y:.18},{x:.43,y:.13},{x:.48,y:.12},{x:.49,y:.17},{x:.46,y:.2}]]});
let hole = demo(), background = null, tool = null, draft = [], solution = null;
function path(points){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x*canvas.width,p.y*canvas.height):ctx.moveTo(p.x*canvas.width,p.y*canvas.height));ctx.closePath()}
function dot(p, color, radius){ctx.beginPath();ctx.arc(p.x*canvas.width,p.y*canvas.height,radius,0,Math.PI*2);ctx.fillStyle=color;ctx.fill()}
function render(){
 const w=canvas.width,h=canvas.height; ctx.clearRect(0,0,w,h);
 if(background){ctx.drawImage(background,0,0,w,h)} else {
  ctx.fillStyle='#42694b';ctx.fillRect(0,0,w,h);
  // Subtle alternating bands make the demo feel like an overhead course view.
  for(let i=-3;i<12;i++){ctx.fillStyle=i%2?'#466e4f':'#3e6549';ctx.beginPath();ctx.moveTo(i*120,0);ctx.lineTo(i*120+90,0);ctx.lineTo(i*120-170,h);ctx.lineTo(i*120-260,h);ctx.fill()}
  hole.fairways.forEach(p=>{path(p);ctx.fillStyle='#8cad71';ctx.fill()});
  ctx.beginPath();ctx.ellipse(hole.green.x*w,hole.green.y*h,48,29,-.2,0,Math.PI*2);ctx.fillStyle='#b4ca8e';ctx.fill();
  hole.hazards.forEach(p=>{path(p);ctx.fillStyle='#d7c99b';ctx.fill()});
 }
 // Draw user-defined zones over uploaded imagery so the classification is visible.
 if(background){hole.fairways.forEach(p=>{path(p);ctx.fillStyle='#a8d37855';ctx.fill();ctx.strokeStyle='#d1edb1';ctx.lineWidth=2;ctx.stroke()});hole.hazards.forEach(p=>{path(p);ctx.fillStyle='#df765b88';ctx.fill();ctx.strokeStyle='#ffb39e';ctx.lineWidth=2;ctx.stroke()})}
 if(draft.length){ctx.beginPath();draft.forEach((p,i)=>i?ctx.lineTo(p.x*w,p.y*h):ctx.moveTo(p.x*w,p.y*h));ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.setLineDash([5,5]);ctx.stroke();ctx.setLineDash([]);draft.forEach(p=>dot(p,'#fff',4))}
 if(solution){const {target,rx,ry}=solution;ctx.save();ctx.strokeStyle='#f1f5d6';ctx.lineWidth=2;ctx.setLineDash([8,7]);ctx.beginPath();ctx.moveTo(hole.tee.x*w,hole.tee.y*h);ctx.lineTo(target.x*w,target.y*h);ctx.stroke();ctx.setLineDash([]);ctx.beginPath();ctx.ellipse(target.x*w,target.y*h,rx*w,ry*h,0,0,Math.PI*2);ctx.fillStyle='#e3efa32d';ctx.fill();ctx.strokeStyle='#e4efb4';ctx.stroke();dot(target,'#f5f7dc',6);ctx.restore()}
 dot(hole.tee,'#fff',6);dot(hole.green,'#fff',5);
}
function inside(p, poly){let c=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if(((a.y>p.y)!==(b.y>p.y))&&(p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x))c=!c}return c}
function normalPair(){const u=Math.max(Math.random(),1e-10),v=Math.random();return [Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v),Math.sqrt(-2*Math.log(u))*Math.sin(2*Math.PI*v)]}
function simulate(){
 const carry=Number($('distance').value), spread=Number($('dispersion').value), length=Number($('length').value);
 if(!Number.isFinite(carry)||carry<50||carry>350||!Number.isFinite(spread)||spread<1||spread>100||!Number.isFinite(length)||length<100||length>700){$('error').textContent='Enter a carry of 50–350, dispersion of 1–100, and hole length of 100–700 yards.';return}
 if(!hole.fairways.length){$('error').textContent='Draw a fairway on the map before running the simulation.';return}
 const dx=hole.green.x-hole.tee.x,dy=hole.green.y-hole.tee.y, mapDistance=Math.hypot(dx,dy);
 if(mapDistance<.05){$('error').textContent='Place the tee and green farther apart.';return}
 $('error').textContent='';const ux=dx/mapDistance,uy=dy/mapDistance,px=-uy,py=ux, scale=mapDistance/length;
 const samples=Array.from({length:1000},normalPair);let best=null;
 // Use identical random samples for every candidate, making the comparison less noisy.
 for(let offset=-80;offset<=80;offset+=2){let total=0,fairway=0,hazard=0;const target={x:hole.tee.x+(ux*carry+px*offset)*scale,y:hole.tee.y+(uy*carry+py*offset)*scale};
  for(const [side,depth] of samples){const p={x:target.x+(px*side*spread+ux*depth*carry*.06)*scale,y:target.y+(py*side*spread+uy*depth*carry*.06)*scale};const inHazard=hole.hazards.some(poly=>inside(p,poly));const inFairway=hole.fairways.some(poly=>inside(p,poly));const remaining=Math.hypot(p.x-hole.green.x,p.y-hole.green.y)/scale;const isGreen=remaining<12;let remainingStrokes=isGreen?2:2+remaining/170; if(inHazard){remainingStrokes+=1;hazard++}else if(!inFairway&&!isGreen)remainingStrokes+=.3;else if(inFairway)fairway++;total+=1+remainingStrokes}
  const score=total/samples.length;if(!best||score<best.score)best={offset,target,score,fairway:fairway/10,hazard:hazard/10,rx:2*spread*scale,ry:2*spread*scale};
 }
 solution=best;$('empty').hidden=true;$('result').hidden=false;$('aim-number').textContent=Math.abs(best.offset)+' yd';$('aim-copy').textContent=best.offset===0?'Aim straight at the green from the tee.':`Aim ${Math.abs(best.offset)} yards ${best.offset>0?'right':'left'} of the direct tee-to-green line at your carry distance.`;$('score').textContent=best.score.toFixed(2);$('fairway-rate').textContent=best.fairway.toFixed(1)+'%';$('hazard-rate').textContent=best.hazard.toFixed(1)+'%';render();
}
function invalidate(){solution=null;$('result').hidden=true;$('empty').hidden=false;render()}
canvas.addEventListener('click',e=>{if(!tool)return;const r=canvas.getBoundingClientRect(),p={x:(e.clientX-r.left)/r.width,y:(e.clientY-r.top)/r.height};if(tool==='tee'||tool==='green'){hole[tool]=p;tool=null;updateTool()}else{draft.push(p);$('finish').hidden=draft.length<3}invalidate()});
function updateTool(){document.querySelectorAll('[data-tool]').forEach(b=>b.classList.toggle('active',b.dataset.tool===tool));$('tool-help').textContent=tool==='tee'||tool==='green'?`Click the map to place the ${tool}.`:tool?`Click at least 3 points around the ${tool}, then finish the shape.`:'Choose a tool, then click the map to edit the hole.';$('finish').hidden=draft.length<3}
document.querySelectorAll('[data-tool]').forEach(b=>b.addEventListener('click',()=>{tool=b.dataset.tool;draft=[];updateTool();render()}));
$('finish').addEventListener('click',()=>{if(draft.length<3)return;hole[tool==='fairway'?'fairways':'hazards'].push(draft);draft=[];tool=null;updateTool();invalidate()});
$('reset').addEventListener('click',()=>{hole=background?{tee:{x:.5,y:.9},green:{x:.5,y:.1},fairways:[],hazards:[]}:demo();draft=[];tool=null;updateTool();invalidate()});
$('image').addEventListener('change',e=>{const file=e.target.files[0];if(!file)return;const url=URL.createObjectURL(file),img=new Image();img.onload=()=>{background=img;URL.revokeObjectURL(url);hole={tee:{x:.5,y:.9},green:{x:.5,y:.1},fairways:[],hazards:[]};$('hole').value='custom';$('map-title').innerHTML='Your hole <span>/ Custom view</span>';$('tool-help').textContent='Place the tee and green, then draw the fairway and hazards.';invalidate()};img.onerror=()=>{URL.revokeObjectURL(url);$('error').textContent='Could not open that image. Try a JPG, PNG or WebP.'};img.src=url});
$('hole').addEventListener('change',()=>{if($('hole').value==='sample'){background=null;hole=demo();$('map-title').innerHTML='The Pines <span>/ Hole 04</span>';tool=null;draft=[];updateTool();invalidate()}else if(!background){$('hole').value='sample';$('error').textContent='Upload an image to create your own hole.'}});
$('simulate').addEventListener('click',simulate);['distance','dispersion','length','club'].forEach(id=>$(id).addEventListener('input',()=>{if(id==='length')$('yardage').innerHTML=`${Number($('length').value)||'—'} <small>YDS</small>`;invalidate()}));$('details-toggle').addEventListener('click',()=>$('how-it-works').scrollIntoView({behavior:'smooth'}));render();

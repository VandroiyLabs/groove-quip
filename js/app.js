const $=s=>document.querySelector(s);
const MODES={mel:['Melody',[2]],pia:['Piano',[2,-10]],drm:['Drums',[0]]};
const DUR=[[16,'Whole'],[8,'Half'],[4,'Quarter'],[2,'Eighth'],[1,'16th']];
const LN=[['Hi-hat',9,1,1],['Crash',10,1,1],['Ride',8,1,1],['Tom',7,0,0],['Snare',5,0,0],['Floor tom',3,0,0],['Kick',1,0,0]];
const TUN={g:{o:[-8,-3,2,7,11,16]},b:{o:[-20,-15,-10,-5]}};
const HINT={mel:'Tap the staff to place a note at the chosen length. Tap a note again to remove it.',pia:'Tap either staff. Notes of the same length at the same spot stack into chords.',drm:'Tap circles to place hits. Use ‹ › or tap a measure above to switch measures.'};
const TH={c:'Type a chord, then tap where it starts. Tap the same spot with the same chord to remove it.',d:'Draw with Apple Pencil. Fingers still scroll the page.',e:'Tap a pen mark to erase it.',r:'Tap to place a rest at the chosen length.'};
const fresh=()=>({title:'Untitled',author:'',mode:'mel',cur:0,n:4,d:4,acc:0,tool:'n',dinput:'grid',cv:'C',z:0,tab:'',kit:[0,4,6],D:{mel:[[]],pia:[[],[]],drm:[[]]},ch:{},ink:{}});
let S,G={},hist=[],DL=null;
try{S=JSON.parse(localStorage.getItem('ns1'))}catch(e){}
if(!S||!S.D)S=fresh();
if(S.mode=='cho')S.mode='mel';delete S.D.cho;
if(!S.kit){S.kit=[0,4,6];(S.D.drm[0]||[]).forEach(m=>m.forEach(e=>e[2]=[0,4,6][e[2]]))}
S.ch=S.ch||{};S.ink=S.ink||{};S.tab=S.tab||'';S.z=S.z||0;S.dinput=S.dinput||'grid';
for(const k in S.ch)if(typeof S.ch[k]=='string'){(S.ch.mel=S.ch.mel||{})[k]=S.ch[k];delete S.ch[k]}
const cc=()=>S.ch[S.mode]||(S.ch[S.mode]={}),INK=()=>S.ink[S.mode]||(S.ink[S.mode]=[]);
const semi=(n,a)=>[0,2,4,5,7,9,11][((n%7)+7)%7]+(a||0)+12*Math.floor(n/7);
const cand=e=>{const p=semi(e[2],e[3]);return TUN[S.tab].o.map((v,i)=>[p-v,i]).filter(q=>q[0]>=0&&q[0]<=22).sort((a,b)=>a[0]-b[0])};
const pick=e=>{const c=cand(e);return c.find(q=>q[1]==e[4])||c[0]};
(async()=>{try{DL=await window.claude?.use('downloads')}catch(e){}})();
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const ln=(a,b,c,d,w=1)=>`<path d="M${a} ${b}L${c} ${d}" stroke="#111" stroke-width="${w}"/>`;
const fit=()=>{for(const k in S.D)S.D[k].forEach(st=>{while(st.length<S.n)st.push([]);st.length=S.n})};
const sv=()=>{try{localStorage.setItem('ns1',JSON.stringify(S))}catch(e){}};
const push=()=>{hist.push(JSON.stringify(S));if(hist.length>40)hist.shift()};
const msg=t=>{$('#h').textContent=t};
function go(){fit();sv();ui();draw()}

function rests(ev){const o=Array(16).fill(0);ev.forEach(e=>{for(let i=e[0];i<e[0]+e[1];i++)o[i]=1});const r=[];let u=0;
 while(u<16){if(o[u]){u++;continue}let s=16;while(s>1&&(u%s||u+s>16||o.slice(u,u+s).some(x=>x)))s/=2;r.push([u,s]);u+=s}return r}

function note(x,y0,b,e){const[,d,n,a]=e,m=n-b,y=y0+40-m*5;let s='';
 for(let l=-2;l>=m;l-=2)s+=ln(x-9,y0+40-l*5,x+9,y0+40-l*5);
 for(let l=10;l<=m;l+=2)s+=ln(x-9,y0+40-l*5,x+9,y0+40-l*5);
 s+=`<ellipse cx="${x}" cy="${y}" rx="6" ry="4.5" transform="rotate(-20 ${x} ${y})" fill="${d>=8?'#fff':'#111'}" stroke="#111" stroke-width="1.4"/>`;
 if(a)s+=`<text x="${x-18}" y="${y+5}" font-size="16">${a>0?'♯':'♭'}</text>`;
 if(d<16){const up=m<4,f=up?1:-1,sx=x+(up?5.6:-5.6),ey=y+f*-33;s+=ln(sx,y,sx,ey,1.2);
  if(d<=2){s+=`<path d="M${sx} ${ey}c0 ${8*f} 9 ${10*f} 7 ${20*f}" stroke="#111" stroke-width="1.8" fill="none"/>`;
   if(d==1)s+=`<path d="M${sx} ${ey+7*f}c0 ${8*f} 9 ${10*f} 7 ${20*f}" stroke="#111" stroke-width="1.8" fill="none"/>`}}
 return s}

function rest(x,y0,d){return d==16?`<rect x="${x}" y="${y0+10}" width="14" height="5"/>`:d==8?`<rect x="${x}" y="${y0+15}" width="14" height="5"/>`:
 d==4?`<path d="M${x+2} ${y0+9}l8 8-8 8 8 8" stroke="#111" stroke-width="2.4" fill="none"/>`:
 `<path d="M${x+9} ${y0+14}L${x+2} ${y0+30}" stroke="#111" stroke-width="1.6"/><circle cx="${x+9}" cy="${y0+14}" r="3"/>`+(d==1?`<circle cx="${x+7}" cy="${y0+22}" r="3"/>`:'')}

function drums(ev,mx,y0,uw){let s='';const X=u=>mx+14+u*uw,durations={};
 [1,0].forEach(v=>{const us=[...new Set(ev.filter(e=>LN[e[2]][3]==v).map(e=>e[0]))].sort((a,b)=>a-b);
   for(let bt=0;bt<4;bt++){const g=us.filter(u=>u>>2==bt);g.forEach((u,i)=>durations[v+':'+u]=(g[i+1]??(bt+1)*4)-u)}});
 ev.forEach(([u,,l])=>{const[,m,xh,up]=LN[l],x=X(u),y=y0+40-m*5,d=durations[up+':'+u];
   if(m>=10)s+=ln(x-9,y,x+9,y);
   s+=xh?ln(x-4.5,y-4.5,x+4.5,y+4.5,1.6)+ln(x-4.5,y+4.5,x+4.5,y-4.5,1.6):`<ellipse cx="${x}" cy="${y}" rx="6" ry="4.5" transform="rotate(-20 ${x} ${y})"/>`;
   if(d==3)s+=`<circle cx="${x+10}" cy="${y-4}" r="1.8" fill="#111"/>`;
   const sx=x+(up?5.5:-5.5);s+=ln(sx,y,sx,up?y0-34:y0+68,1.1)});
 [1,0].forEach(v=>{const us=[...new Set(ev.filter(e=>LN[e[2]][3]==v).map(e=>e[0]))].sort((a,b)=>a-b);
   for(let bt=0;bt<4;bt++){const g=us.filter(u=>u>>2==bt);if(!g.length)continue;
    const ey=v?y0-34:y0+68,off=v?5.5:-5.5,ds=g.map((u,i)=>(g[i+1]??(bt+1)*4)-u);
    if(g.length>1){s+=ln(X(g[0])+off,ey,X(g[g.length-1])+off,ey,3);
      const linked=new Set();
      for(let i=0;i<g.length-1;i++)if(g[i+1]===g[i]+1){const by=ey+(v?5:-5);s+=ln(X(g[i])+off,by,X(g[i+1])+off,by,3);linked.add(i);linked.add(i+1)}
      ds.forEach((d,i)=>{if(d!=1||linked.has(i))return;const left=i==g.length-1||g[i+1]-g[i]>1,ex=X(g[i])+off+(left?-10:10),by=ey+(v?5:-5);s+=ln(left?ex:X(g[i])+off,by,left?X(g[i])+off:ex,by,3)})
    }else{const sx=X(g[0])+off,count=ds[0]==1?2:ds[0]<4?1:0;
      for(let i=1;i<=count;i++){const by=ey+(v?5:-5)*(i-1),ex=sx+(v?10:-10);s+=ln(v?sx:ex,by,v?ex:sx,by,3)}}
   }});
 return s}

function build(ex){
 const foc=!ex&&S.z,cw=ex?1200:($('#sc').clientWidth||600),per=foc?1:ex?4:cw<560?2:cw<900?3:4,mw=270,uw=(mw-30)/16;
 const tb=S.mode=='mel'&&S.tab,NT=tb?TUN[S.tab].o.length:0,SL=MODES[S.mode][1],ns=SL.length,sh=ns+(tb?1:0)>1?250:140,hy=56;
 const base=foc?S.cur:0,cnt=foc?1:S.n,rows=Math.ceil(cnt/per),W=90+per*mw,H=hy+rows*sh+10;
 if(!ex)G={W,per,mw,uw,sh,hy,ns,tb,base,cnt,rows};
 let o=`<rect width="${W}" height="${H}" fill="#fff"/><text x="${W/2}" y="34" font-size="24" font-weight="700" text-anchor="middle">${esc(S.title)}</text><text x="${W-12}" y="50" font-size="13" text-anchor="end" fill="#555">${esc(S.author)}</text>`;
 for(let si=0;si<rows;si++){
  const mc=Math.min(per,cnt-si*per),xe=80+mc*mw,Y=k=>hy+si*sh+50+k*100,bot=tb?Y(1)+(NT-1)*10:Y(ns-1)+40;
  o+=ln(20,Y(0),20,bot,1.5)+`<text x="24" y="${Y(0)-12}" font-size="10" fill="#888">${base+si*per+1}</text>`;
  SL.forEach((b,k)=>{
   for(let i=0;i<5;i++)o+=ln(20,Y(k)+i*10,xe,Y(k)+i*10,.8);
   if(S.mode=='drm')o+=`<rect x="30" y="${Y(k)+10}" width="5" height="20"/><rect x="39" y="${Y(k)+10}" width="5" height="20"/>`;
   else o+=k?`<text x="24" y="${Y(k)+20}" font-size="40">𝄢</text>`:`<text x="24" y="${Y(k)+34}" font-size="52">𝄞</text>`;
   if(si==0)o+=`<text x="68" y="${Y(k)+18}" font-size="22" font-weight="700" text-anchor="middle">4</text><text x="68" y="${Y(k)+38}" font-size="22" font-weight="700" text-anchor="middle">4</text>`;
   for(let j=0;j<mc;j++){const mi=base+si*per+j,mx=80+j*mw;
    o+=ln(mx+mw,Y(k),mx+mw,Y(k)+40,mi==S.n-1?3:1);
    if(S.mode=='drm'){if(!ex&&mi==S.cur)o+=`<rect x="${mx}" y="${Y(0)-38}" width="${mw}" height="112" fill="#3b82f6" opacity=".1"/>`;o+=drums(S.D.drm[0][mi],mx,Y(0),uw)}
    else{const ev=S.D[S.mode][k][mi];ev.forEach(e=>{o+=e[2]==null?rest(e[1]==16?mx+mw/2-7:mx+8+e[0]*uw,Y(k),e[1]):note(mx+14+e[0]*uw,Y(k),b,e)});
     rests(ev).forEach(([u,d])=>o+=rest(d==16?mx+mw/2-7:mx+8+u*uw,Y(k),d))}}});
  if(tb){const t=Y(1);for(let i=0;i<NT;i++)o+=ln(20,t+i*10,xe,t+i*10,.8);
   o+=['T','A','B'].map((c,i)=>`<text x="34" y="${t+(NT-1)*5-8+i*14}" font-size="14" font-weight="700" text-anchor="middle">${c}</text>`).join('');
   for(let j=0;j<mc;j++){const mi=base+si*per+j,mx=80+j*mw;o+=ln(mx+mw,t,mx+mw,t+(NT-1)*10,mi==S.n-1?3:1);
    S.D.mel[0][mi].forEach(e=>{if(e[2]==null)return;const q=pick(e);if(!q)return;const x=mx+14+e[0]*uw,y=t+(NT-1-q[1])*10;
     o+=`<rect x="${x-7}" y="${y-8}" width="14" height="16" fill="#fff"/><text x="${x}" y="${y+5}" font-size="14" font-weight="700" text-anchor="middle">${q[0]}</text>`})}}
  const ch=S.ch[S.mode]||{};
  for(const key in ch){const[a,u]=key.split(':').map(Number),r=a-base;
   if(r>=0&&r<cnt&&Math.floor(r/per)==si)o+=`<text x="${80+(r%per)*mw+8+u*uw}" y="${Y(0)-28}" font-size="24" font-weight="700" font-family="'Comic Sans MS','Comic Neue','Chalkboard SE','Marker Felt',cursive">${esc(ch[key])}</text>`}
  if(ns>1)o+=ln(xe,Y(0),xe,Y(1)+40,mi_end(si,per,cnt)?3:1)}
 (S.ink[S.mode]||[]).forEach(st=>{const r=st.m-base;if(r<0||r>=cnt)return;const mx=80+(r%per)*mw,sy=hy+Math.floor(r/per)*sh;
  o+=`<path d="M${st.p.map(q=>(mx+q[0]).toFixed(1)+' '+(sy+q[1]).toFixed(1)).join('L')}" fill="none" stroke="#c0392b" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`});
 return{s:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" ${ex?`width="${W}" height="${H}"`:''} font-family="'Noto Music','Apple Symbols','Segoe UI Symbol','Helvetica Neue',Arial,sans-serif">${o}</svg>`,W,H}}
const mi_end=(si,per,cnt)=>(si+1)*per>=cnt;
function draw(){$('#sc').innerHTML=build(false).s}

function ui(){
 $('#tabs').innerHTML=Object.entries(MODES).map(([k,v])=>`<button data-m="${k}" class="${S.mode==k?'on':''}">${v[0]}</button>`).join('');
 const dr=S.mode=='drm',md=S.tool=='n'||S.tool=='r';
 $('#pal').innerHTML=dr?'':DUR.map(([d,n])=>`<button data-d="${d}" class="${S.d==d&&md?'on':''}">${n}</button>`).join('')+[[0,'♮'],[1,'♯'],[-1,'♭']].map(([a,t])=>`<button data-a="${a}" class="${S.acc==a?'on':''}">${t}</button>`).join('');
 $('#tl').innerHTML=(dr?`<button data-x="dinput-grid" class="${S.dinput=='grid'?'on':''}">Grid</button><button data-x="dinput-pen" class="${S.dinput=='pen'?'on':''}">Pen</button>${S.dinput=='pen'?`<button data-t="e" class="${S.tool=='e'?'on':''}">Erase pen</button>`:''}`:[['n','Notes'],['r','Rest'],['c','Chords'],['d','Pen'],['e','Erase pen']].filter(([t])=>t!='r'||!dr).map(([t,n])=>`<button data-t="${t}" class="${S.tool==t?'on':''}">${n}</button>`).join(''))
  +(S.tool=='c'?`<input id="chord" value="${esc(S.cv||'')}" placeholder="Chord" oninput="S.cv=this.value;sv()" style="max-width:110px;min-width:80px">`:'')
  +(S.mode=='mel'?`<button data-x="tab">Tab: ${{'':'off',g:'guitar',b:'bass'}[S.tab]}</button>`:'')
  +`<button data-x="zoom" class="${S.z?'on':''}">Zoom: ${S.z?'measure':'all'}</button>`;
 const ev=S.D.drm[0][S.cur]||[],free=LN.map((l,i)=>i).filter(i=>!S.kit.includes(i));
 $('#g').innerHTML=dr&&S.dinput=='grid'?`<div class="r" style="padding:0 0 6px"><span style="color:var(--mu);font-size:13px">Measure ${S.cur+1} of ${S.n}</span><button data-x="prev">‹</button><button data-x="next">›</button>`
  +(free.length?`<select id="ap">${free.map(i=>`<option value="${i}">${LN[i][0]}</option>`).join('')}</select><button data-x="addk">+ Add to kit</button>`:'')+'</div>'
  +S.kit.map(l=>`<div class="gr"><b>${LN[l][0]}<button data-k="${l}" style="min-height:0;padding:0 6px;background:none;color:var(--mu)">×</button></b>`+Array.from({length:16},(_,u)=>`<button class="c${u&&u%4==0?' q':''}${ev.some(q=>q[0]==u&&q[2]==l)?' on':''}" data-g="${l},${u}"></button>`).join('')+'</div>').join(''):'';
 msg(TH[S.tool]||HINT[S.mode])}

const XY=e=>{const r=$('#sc svg').getBoundingClientRect(),k=G.W/r.width;return[(e.clientX-r.left)*k,(e.clientY-r.top)*k]};
const LOC=(x,y)=>{y-=G.hy;if(y<0||x<80)return;const si=Math.floor(y/G.sh),j=Math.floor((x-80)/G.mw),mi=G.base+si*G.per+j;if(si>=G.rows||j>=G.per||mi>=S.n)return;return{mi,yy:y-si*G.sh,mx:80+j*G.mw,sy:G.hy+si*G.sh}};
function tap(e){if(!$('#sc svg')||S.tool=='d')return;
 const[x,y]=XY(e);
 if(S.tool=='e'){const L=INK(),keep=L.filter(st=>{const r=st.m-G.base;if(r<0||r>=G.cnt)return true;const mx=80+(r%G.per)*G.mw,sy=G.hy+Math.floor(r/G.per)*G.sh;return!st.p.some(q=>Math.hypot(mx+q[0]-x,sy+q[1]-y)<14)});
  if(keep.length<L.length){push();S.ink[S.mode]=keep;go()}return}
 const l=LOC(x,y);if(!l)return;S.cur=l.mi;const{mx,yy}=l;
 if(S.tool=='c'){push();const uq=Math.max(0,Math.min(12,Math.round((x-mx-14)/G.uw/4)*4)),key=l.mi+':'+uq,t=(S.cv||'').trim(),C=cc();
  if(!t||C[key]==t)delete C[key];else C[key]=t;go();return}
 if(S.mode=='drm'){go();return}
 if(G.tb&&yy>120){const ev=S.D.mel[0][l.mi],u=(x-mx-14)/G.uw,q=ev.filter(z=>z[2]!=null).sort((a,b)=>Math.abs(a[0]-u)-Math.abs(b[0]-u))[0];
  if(q&&Math.abs(q[0]-u)<=1.5){const c=cand(q);if(c.length>1){push();q[4]=c[(c.indexOf(pick(q))+1)%c.length][1]}}go();return}
 const kk=G.ns>1&&yy>120?1:0,b=MODES[S.mode][1][kk],d=S.d;
 const n=S.tool=='r'?null:b+Math.max(-8,Math.min(16,Math.round((50+kk*100+40-yy)/5)));
 let u=Math.max(0,Math.min(15,Math.round((x-mx-14)/G.uw)));u-=u%d;if(u+d>16)u=16-d;
 push();let ev=S.D[S.mode][kk][l.mi];const i=ev.findIndex(q=>q[0]==u&&q[1]==d&&q[2]===n);
 if(i>=0)ev.splice(i,1);
 else{ev=ev.filter(q=>!(q[0]<u+d&&u<q[0]+q[1])||(q[0]==u&&q[1]==d&&q[2]!=null&&n!=null));ev.push([u,d,n,S.acc]);S.D[S.mode][kk][l.mi]=ev}
 go()}
const sc=$('#sc'),NS='http://www.w3.org/2000/svg';
let tapStart=null;
sc.addEventListener('pointerdown',e=>{if(S.tool!='d')tapStart={id:e.pointerId,x:e.clientX,y:e.clientY}});
sc.addEventListener('pointerup',e=>{const p=tapStart;tapStart=null;if(p&&p.id==e.pointerId&&Math.hypot(e.clientX-p.x,e.clientY-p.y)<10)tap(e)});
sc.addEventListener('pointercancel',e=>{if(tapStart&&tapStart.id==e.pointerId)tapStart=null});
let pen=null;
sc.addEventListener('pointerdown',e=>{if(S.tool!='d'||e.pointerType=='touch'||!$('#sc svg'))return;const[x,y]=XY(e),l=LOC(x,y);if(!l)return;
 e.preventDefault();sc.setPointerCapture(e.pointerId);pen={m:l.mi,mx:l.mx,sy:l.sy,p:[[+(x-l.mx).toFixed(1),+(y-l.sy).toFixed(1)]],el:document.createElementNS(NS,'path')};
 for(const[k,v]of Object.entries({fill:'none',stroke:'#c0392b','stroke-width':2.2,'stroke-linecap':'round'}))pen.el.setAttribute(k,v);$('#sc svg').appendChild(pen.el)});
sc.addEventListener('pointermove',e=>{if(!pen)return;const[x,y]=XY(e);pen.p.push([+(x-pen.mx).toFixed(1),+(y-pen.sy).toFixed(1)]);pen.el.setAttribute('d','M'+pen.p.map(q=>(pen.mx+q[0])+' '+(pen.sy+q[1])).join('L'))});
sc.addEventListener('pointerup',()=>{if(!pen)return;const t=pen;pen=null;if(t.p.length<2)t.p.push([t.p[0][0]+.1,t.p[0][1]]);push();INK().push({m:t.m,p:t.p});go()});
addEventListener('resize',draw);

document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const D=b.dataset;
 if(D.m){S.mode=D.m;S.cur=Math.min(S.cur,S.n-1);go()}
 else if(D.d){S.d=+D.d;if(S.tool!='r')S.tool='n';go()}
 else if(D.k){push();const l=+D.k;S.kit=S.kit.filter(x=>x!=l);S.D.drm[0]=S.D.drm[0].map(m=>m.filter(q=>q[2]!=l));go()}
 else if(D.a!==undefined){S.acc=+D.a;go()}
 else if(D.t){S.tool=D.t;go()}
 else if(D.g){push();const[l,u]=D.g.split(',').map(Number),ev=S.D.drm[0][S.cur],i=ev.findIndex(q=>q[0]==u&&q[2]==l);if(i>=0)ev.splice(i,1);else ev.push([u,1,l]);go()}
 else if(D.x)act(D.x)});

$('#ti').oninput=e=>{S.title=e.target.value;sv();draw()};
$('#au').oninput=e=>{S.author=e.target.value;sv();draw()};
$('#f').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{const o=JSON.parse(await f.text());if(!o.D)throw 0;push();S=o;$('#ti').value=S.title||'';$('#au').value=S.author||'';go()}catch(x){msg('That file is not a saved score.')}e.target.value=''};

async function out(name,data){try{if(DL)await DL.save({filename:name,data});else{const a=document.createElement('a');a.href=URL.createObjectURL(data instanceof Blob?data:new Blob([data]));a.download=name;a.click()}}catch(e){if(!e||e.code!='declined')msg('Could not save: '+((e&&e.message)||e))}}
async function cv(){const o=build(true),im=new Image();im.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(o.s);await im.decode();
 const c=document.createElement('canvas');c.width=o.W*2;c.height=o.H*2;const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);x.drawImage(im,0,0,c.width,c.height);return c}
async function pdf(){const c=await cv(),jb=await new Promise(r=>c.toBlob(r,'image/jpeg',.92)),jd=new Uint8Array(await jb.arrayBuffer());
 const pw=595,ph=Math.round(pw*c.height/c.width),en=new TextEncoder(),parts=[],off=[];let len=0;
 const add=b=>{parts.push(b);len+=b.length};
 const obj=(i,s,bin)=>{off[i]=len;add(en.encode(i+' 0 obj\n'+s+(bin?'\nstream\n':'\n')));if(bin){add(bin);add(en.encode('\nendstream\nendobj\n'))}else add(en.encode('endobj\n'))};
 add(en.encode('%PDF-1.4\n'));
 obj(1,'<</Type/Catalog/Pages 2 0 R>>');obj(2,'<</Type/Pages/Kids[3 0 R]/Count 1>>');
 obj(3,`<</Type/Page/Parent 2 0 R/MediaBox[0 0 ${pw} ${ph}]/Resources<</XObject<</I 5 0 R>>>>/Contents 4 0 R>>`);
 const cs=`q ${pw} 0 0 ${ph} 0 0 cm /I Do Q`;obj(4,`<</Length ${cs.length}>>`,en.encode(cs));
 obj(5,`<</Type/XObject/Subtype/Image/Width ${c.width}/Height ${c.height}/ColorSpace/DeviceRGB/BitsPerComponent 8/Filter/DCTDecode/Length ${jd.length}>>`,jd);
 const xr=len;let x='xref\n0 6\n0000000000 65535 f \n';for(let i=1;i<6;i++)x+=String(off[i]).padStart(10,'0')+' 00000 n \n';
 add(en.encode(x+`trailer<</Size 6/Root 1 0 R>>\nstartxref\n${xr}\n%%EOF`));return new Blob(parts,{type:'application/pdf'})}

async function act(x){const fn=(S.title||'score').replace(/[^\w-]+/g,'_');
 if(x=='add'){push();S.n++;go()}
 else if(x=='del'&&S.n>1){push();S.n--;S.cur=Math.min(S.cur,S.n-1);for(const m in S.ch)for(const k in S.ch[m])if(+k.split(':')[0]>=S.n)delete S.ch[m][k];for(const m in S.ink)S.ink[m]=S.ink[m].filter(t=>t.m<S.n);go()}
 else if(x=='undo'&&hist.length){S=JSON.parse(hist.pop());go()}
 else if(x=='clr'){push();S.D[S.mode]=S.D[S.mode].map(()=>[]);S.ch[S.mode]={};S.ink[S.mode]=[];go()}
 else if(x=='prev'){S.cur=Math.max(0,S.cur-1);go()}
 else if(x=='next'){S.cur=Math.min(S.n-1,S.cur+1);go()}
 else if(x=='zoom'){S.z=S.z?0:1;go()}
 else if(x=='dinput-grid'){S.dinput='grid';S.tool='n';go()}
 else if(x=='dinput-pen'){S.dinput='pen';S.tool='d';go()}
 else if(x=='tab'){S.tab=S.tab==''?'g':S.tab=='g'?'b':'';go()}
 else if(x=='addk'){push();S.kit.push(+$('#ap').value);S.kit.sort((a,b)=>a-b);go()}
 else if(x=='png'){const c=await cv();c.toBlob(b=>out(fn+'.png',b))}
 else if(x=='pdf')out(fn+'.pdf',await pdf());
 else if(x=='save')out(fn+'.json',JSON.stringify(S));
 else if(x=='open')$('#f').click()}

$('#ti').value=S.title;$('#au').value=S.author;go();

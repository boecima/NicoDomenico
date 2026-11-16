/* Service worker della pagina riservata: decifra al volo i file in app/ (AES-256-GCM) con la chiave ricavata dalla
   password nella pagina di accesso. I file possono essere scaricati una volta sul dispositivo (restano cifrati) per
   usare la pagina senza rete. La chiave resta su questo dispositivo finche' si preme "Esci". */
const VERSIONE='adf85cefbe61', DB='vigne-vecchie-chiave', ST='chiavi', CACHE='vigne-vecchie-'+VERSIONE;
let CHIAVE=null;
function idb(){ return new Promise((ok,ko)=>{ const r=indexedDB.open(DB,1); r.onupgradeneeded=()=>r.result.createObjectStore(ST); r.onsuccess=()=>ok(r.result); r.onerror=()=>ko(r.error); }); }
async function leggi(){ try{ const d=await idb(); return await new Promise(ok=>{ const q=d.transaction(ST).objectStore(ST).get(VERSIONE); q.onsuccess=()=>ok(q.result||null); q.onerror=()=>ok(null); }); }catch(e){ return null; } }
async function scrivi(k){ try{ const d=await idb(); await new Promise(ok=>{ const tx=d.transaction(ST,'readwrite'), s=tx.objectStore(ST); s.clear(); if(k) s.put(k,VERSIONE); tx.oncomplete=ok; tx.onerror=ok; }); }catch(e){} }
const BASE=self.registration.scope, APP=BASE+'app/', GUSCIO=[BASE,BASE+'chiave.json',BASE+'elenco.json'];
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil((async()=>{ const n=await caches.keys(); await Promise.all(n.filter(x=>x.startsWith('vigne-vecchie-')&&x!==CACHE).map(x=>caches.delete(x))); await self.clients.claim(); })()));
async function scarica(porta){
  const c=await caches.open(CACHE), dire=x=>{ try{ porta&&porta.postMessage(x); }catch(e){} };
  try{
    const el=await (await fetch(BASE+'elenco.json',{cache:'no-cache'})).json();
    const tutti=GUSCIO.concat(el.file.map(f=>APP+f+'.enc')); let fatti=0, saltati=0;
    const coda=tutti.slice();
    async function operaio(){ while(coda.length){ const u=coda.shift();
      try{ if(!(await c.match(u))||GUSCIO.indexOf(u)>=0){ const r=await fetch(u,{cache:'no-cache'}); if(!r.ok) throw 0; await c.put(u,r); } }
      catch(e){ saltati++; }
      fatti++; dire({tipo:'avanzamento',fatti:fatti,totale:tutti.length}); } }
    await Promise.all([operaio(),operaio(),operaio(),operaio()]);
    dire({tipo:'fine',ok:saltati===0,mancanti:saltati,totale:tutti.length});
  }catch(e){ dire({tipo:'fine',ok:false,errore:String(e&&e.message||e)}); }
}
async function quanti(){ try{ const c=await caches.open(CACHE); const el=await (await c.match(BASE+'elenco.json')); if(!el) return {pronta:false,n:0}; const j=await el.json(); const k=(await c.keys()).length; return {pronta:k>=j.file.length+GUSCIO.length,n:k}; }catch(e){ return {pronta:false,n:0}; } }
self.addEventListener('message',e=>{
  const d=e.data||{}, porta=e.ports&&e.ports[0], rispondi=x=>porta&&porta.postMessage(x);
  if(d.tipo==='chiave'){ CHIAVE=d.chiave; e.waitUntil(scrivi(d.chiave).then(()=>rispondi({ok:true}))); }
  else if(d.tipo==='esci'){ CHIAVE=null; e.waitUntil(Promise.all([scrivi(null),caches.delete(CACHE)]).then(()=>rispondi({ok:true}))); }
  else if(d.tipo==='stato'){ e.waitUntil(Promise.all([CHIAVE?Promise.resolve(CHIAVE):leggi(),quanti()]).then(r=>{ CHIAVE=r[0]; rispondi({chiave:!!r[0],pronta:r[1].pronta}); })); }
  else if(d.tipo==='scarica'){ e.waitUntil(scarica(porta)); }
});
const TIPI={html:'text/html; charset=utf-8',js:'text/javascript; charset=utf-8',json:'application/json; charset=utf-8',css:'text/css; charset=utf-8',
  png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp',svg:'image/svg+xml',pdf:'application/pdf',txt:'text/plain; charset=utf-8'};
self.addEventListener('fetch',e=>{
  const u=new URL(e.request.url);
  if(e.request.method!=='GET'||!u.href.startsWith(BASE)) return;
  if(u.href.startsWith(APP)&&!u.pathname.endsWith('.enc')){ e.respondWith(servi(e.request,u)); return; }
  const senza=u.origin+u.pathname;                                   // pagina di accesso e file di servizio: rete, poi copia salvata
  if(senza===BASE||senza===BASE+'index.html'||senza===BASE+'chiave.json'||senza===BASE+'elenco.json'){
    e.respondWith((async()=>{ const chiaveC=senza===BASE+'index.html'?BASE:senza;
      try{ const r=await fetch(e.request); if(r.ok){ const c=await caches.open(CACHE); if(await c.match(chiaveC)) c.put(chiaveC,r.clone()); } return r; }
      catch(err){ const c=await caches.open(CACHE), m=await c.match(chiaveC); if(m) return m; throw err; } })());
  }
});
async function cifrato(url){
  const c=await caches.open(CACHE), m=await c.match(url); if(m) return m;
  return fetch(url,{cache:'no-cache'});
}
async function servi(req,u){
  if(!CHIAVE) CHIAVE=await leggi();
  let p=u.pathname; if(p.endsWith('/')) p+='index.html';
  const pagina=req.mode==='navigate';
  if(!CHIAVE) return pagina?Response.redirect(BASE+'?dest='+encodeURIComponent(p),302):new Response('Accesso richiesto',{status:401});
  let r; try{ r=await cifrato(u.origin+p+'.enc'); }catch(err){ return new Response('Senza rete: file non ancora scaricato su questo dispositivo',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}}); }
  if(!r.ok) return new Response('Non trovato',{status:404});
  const b=new Uint8Array(await r.arrayBuffer());
  try{
    const chiaro=await crypto.subtle.decrypt({name:'AES-GCM',iv:b.slice(0,12)},CHIAVE,b.slice(12));
    const ext=(p.split('.').pop()||'').toLowerCase();
    return new Response(chiaro,{status:200,headers:{'Content-Type':TIPI[ext]||'application/octet-stream','Cache-Control':'no-store'}});
  }catch(err){ // la chiave non apre questo file: password cambiata, si torna alla pagina di accesso
    CHIAVE=null; await scrivi(null);
    return pagina?Response.redirect(BASE+'?scaduta=1',302):new Response('Chiave non valida',{status:403});
  }
}

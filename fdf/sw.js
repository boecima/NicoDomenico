/* Service worker del modello FDF protetto: decifra al volo i file in app/ (AES-256-GCM) con la chiave
   ricavata dalla password nella pagina di accesso. La chiave resta su questo dispositivo finche' si preme "Esci". */
const VERSIONE='c6a701271c3c', DB='fdf-chiave', ST='chiavi';
let CHIAVE=null;
function idb(){ return new Promise((ok,ko)=>{ const r=indexedDB.open(DB,1); r.onupgradeneeded=()=>r.result.createObjectStore(ST); r.onsuccess=()=>ok(r.result); r.onerror=()=>ko(r.error); }); }
async function leggi(){ try{ const d=await idb(); return await new Promise(ok=>{ const q=d.transaction(ST).objectStore(ST).get(VERSIONE); q.onsuccess=()=>ok(q.result||null); q.onerror=()=>ok(null); }); }catch(e){ return null; } }
async function scrivi(k){ try{ const d=await idb(); await new Promise(ok=>{ const tx=d.transaction(ST,'readwrite'), s=tx.objectStore(ST); s.clear(); if(k) s.put(k,VERSIONE); tx.oncomplete=ok; tx.onerror=ok; }); }catch(e){} }
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
self.addEventListener('message',e=>{
  const d=e.data||{}, porta=e.ports&&e.ports[0], rispondi=x=>porta&&porta.postMessage(x);
  if(d.tipo==='chiave'){ CHIAVE=d.chiave; e.waitUntil(scrivi(d.chiave).then(()=>rispondi({ok:true}))); }
  else if(d.tipo==='esci'){ CHIAVE=null; e.waitUntil(scrivi(null).then(()=>rispondi({ok:true}))); }
  else if(d.tipo==='stato'){ e.waitUntil((CHIAVE?Promise.resolve(CHIAVE):leggi()).then(k=>{ CHIAVE=k; rispondi({chiave:!!k}); })); }
});
const TIPI={html:'text/html; charset=utf-8',js:'text/javascript; charset=utf-8',json:'application/json; charset=utf-8',css:'text/css; charset=utf-8',
  png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp',svg:'image/svg+xml',pdf:'application/pdf',txt:'text/plain; charset=utf-8'};
const BASE=self.registration.scope, APP=BASE+'app/';
self.addEventListener('fetch',e=>{
  const u=new URL(e.request.url);
  if(e.request.method!=='GET'||!u.href.startsWith(APP)||u.pathname.endsWith('.enc')) return;   // tutto il resto passa com'e'
  e.respondWith(servi(e.request,u));
});
async function servi(req,u){
  if(!CHIAVE) CHIAVE=await leggi();
  let p=u.pathname; if(p.endsWith('/')) p+='index.html';
  const pagina=req.mode==='navigate';
  if(!CHIAVE) return pagina?Response.redirect(BASE+'?dest='+encodeURIComponent(p),302):new Response('Accesso richiesto',{status:401});
  const r=await fetch(u.origin+p+'.enc',{cache:'no-cache'});
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

/** C7: tour requests — honest scheduling, low friction, no fee. */
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
const CHROME='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'; const PORT=10040;
const chrome=spawn(CHROME,['--headless=new',`--remote-debugging-port=${PORT}`,'--disable-gpu','--hide-scrollbars','--no-first-run',`--user-data-dir=/tmp/cdp-c7-${Date.now()}`,'about:blank'],{stdio:'ignore'});
for(let i=0;i<60;i++){try{if((await fetch(`http://127.0.0.1:${PORT}/json/version`)).ok)break;}catch{} await sleep(250);}
let id=0;const pending=new Map();
const t=await(await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`,{method:'PUT'})).json();
const ws=new WebSocket(t.webSocketDebuggerUrl); await new Promise(r=>ws.addEventListener('open',r,{once:true}));
ws.addEventListener('message',e=>{const m=JSON.parse(e.data); if(m.id&&pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);if(m.error){p.reject(new Error(m.error.message));}else{p.resolve(m.result);}}});
const send=(me,pa={})=>new Promise((res,rej)=>{const n=++id;pending.set(n,{resolve:res,reject:rej});ws.send(JSON.stringify({id:n,method:me,params:pa}));});
const js=async x=>{const r=await send('Runtime.evaluate',{expression:x,returnByValue:true,awaitPromise:true}); if(r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text); return r.result.value;};
const go=async u=>{await send('Page.navigate',{url:u}); await sleep(1800);};
const text=()=>js(`document.body.innerText`);
const results=[]; const check=(l,p,d='')=>{results.push(p);console.log(`  [${p?'PASS':'FAIL'}] ${l}${d?'  — '+d:''}`)};

async function setF(vals) {
  await js(`(()=>{const f=document.querySelector('main form');
    const setVal=(el,v)=>{const proto = el.tagName==='SELECT'?HTMLSelectElement:(el.tagName==='TEXTAREA'?HTMLTextAreaElement:HTMLInputElement);
      Object.getOwnPropertyDescriptor(proto.prototype,'value').set.call(el,v);
      el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true}));};
    const set=(n,v,idx)=>{let els=f.elements[n]; if(!els) return;
      if (els.length!==undefined && !els.tagName) { const list=[...els];
        if (list[0] && list[0].type==='radio') { list.forEach(r=>{r.checked=r.value===v; r.dispatchEvent(new Event('change',{bubbles:true}));}); return; }
        setVal(list[idx||0], v); return; }
      setVal(els, v);};
    ${Object.entries(vals).map(([k,v])=>Array.isArray(v)?v.map((vv,i)=>`set(${JSON.stringify(k)},${JSON.stringify(vv)},${i});`).join(''):`set(${JSON.stringify(k)},${JSON.stringify(String(v))});`).join('')}
  })()`);
}
const submit = async () => { await js(`document.querySelector('main form').requestSubmit()`); await sleep(700); };

await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride',{width:390,height:900,deviceScaleFactor:2,mobile:true});

console.log('\nHONEST SCHEDULING');
await go('http://localhost:3210/schedule-tour');
const p = await text();
check('promises a confirmed time, not a held slot', /confirm a specific time within/i.test(p));
check('says so explicitly', /do not hold slots you cannot actually get/i.test(p));
check('states no fee and no application needed', /No fee.*no application/is.test(p));
check('offers a video walkthrough as a real option', /Video walkthrough/i.test(p));
check('and frames it as not a consolation', /not a consolation/i.test(p));
check('offers evening windows for people who work days', /Evening \(5pm–7pm\)/.test(p));
check('says why', /cannot view a home in the middle of a working day/i.test(p));
check('asks about access needs for the visit', /Step-free access, extra time, an interpreter/i.test(p));

console.log('\nCOMMITMENT IS CLEAR');
check('no charge to tour, ever', /no charge to tour a home, ever/i.test(p));
check('touring does not start an application', /touring does not start an application/i.test(p));
check('nobody works on commission', /works on commission/i.test(p));
check('anti-fraud: never a deposit at a viewing', /never ask you for a deposit or a holding fee at a viewing/i.test(p));

console.log('\nLOW FRICTION');
check('email OR phone is enough', /Either one is enough/i.test(p));
await setF({ name:'', email:'', phone:'' }); await submit();
check('missing contact is caught in-browser, no round trip', /either is fine/i.test(await text()));
check('and the name is flagged', /Tell us your name/i.test(await text()));

console.log('\nSUCCESSFUL REQUEST');
const today = await js(`[...document.querySelectorAll('[name=prefDate] option')][1].value`);
await setF({ name:'Dana Okafor', email:'dana@example.com', prefDate:[today], prefPart:['evening'] });
await submit();
const s = await text();
if (!/Request received/i.test(s)) {
  console.log('    debug — visible errors:', await js(`[...document.querySelectorAll('[role=alert], [class*=error]')].map(e=>e.innerText).join(' | ')`));
  console.log('    debug — prefDate values:', await js(`[...document.querySelectorAll('[name=prefDate]')].map(s=>s.value).join(',')`));
  console.log('    debug — name value:', await js(`document.querySelector('[name=name]')?.value`));
}
check('request is accepted', /Request received/i.test(s));
check('restates the response promise', /within.*4 hours/is.test(s));
check('reminds them nothing is charged', /Nothing is charged for a tour/i.test(s));
check('is honest that delivery is not wired up', /not yet delivered/i.test(s));

console.log('\nCONTEXT FROM A LISTING');
await go('http://localhost:3210/homes-for-rent');
const slug = await js(`document.querySelector('article a[href^="/homes-for-rent/"]')?.getAttribute('href')?.split('/').pop()`);
await go(`http://localhost:3210/schedule-tour?home=${slug}`);
const l = await text();
check('carries the home through from the listing', /Tour of/i.test(l), slug);
check('and shows which home', new RegExp(slug.split('-')[0]).test(l));

console.log('\nUNAVAILABLE HOME');
await go('http://localhost:3210/schedule-tour?home=not-a-real-home');
check('an unknown home does not break the page', await js(`!!document.querySelector('main form')`));

console.log('\nMOBILE');
check('no horizontal overflow at 390px', await js(`document.documentElement.scrollWidth <= window.innerWidth`));

const failed=results.filter(r=>!r).length;
console.log(`\n${results.length-failed}/${results.length} passed`);
ws.close(); chrome.kill();
process.exit(failed?1:0);

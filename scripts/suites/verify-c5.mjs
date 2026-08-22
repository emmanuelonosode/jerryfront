/** C5 acceptance: status without a password, exposing nothing sensitive. */
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
const CHROME='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'; const PORT=9985;
const chrome=spawn(CHROME,['--headless=new',`--remote-debugging-port=${PORT}`,'--disable-gpu','--hide-scrollbars','--no-first-run',`--user-data-dir=/tmp/cdp-c5-${Date.now()}`,'about:blank'],{stdio:'ignore'});
for(let i=0;i<60;i++){try{if((await fetch(`http://127.0.0.1:${PORT}/json/version`)).ok)break;}catch{} await sleep(250);}
let id=0;const pending=new Map();
const t=await(await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`,{method:'PUT'})).json();
const ws=new WebSocket(t.webSocketDebuggerUrl); await new Promise(r=>ws.addEventListener('open',r,{once:true}));
ws.addEventListener('message',e=>{const m=JSON.parse(e.data); if(m.id&&pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);if(m.error){p.reject(new Error(m.error.message));}else{p.resolve(m.result);}}});
const send=(me,pa={})=>new Promise((res,rej)=>{const n=++id;pending.set(n,{resolve:res,reject:rej});ws.send(JSON.stringify({id:n,method:me,params:pa}));});
const js=async x=>{const r=await send('Runtime.evaluate',{expression:x,returnByValue:true,awaitPromise:true}); if(r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text); return r.result.value;};
const go=async u=>{await send('Page.navigate',{url:u}); await sleep(1700);};
const text=()=>js(`document.body.innerText`);
const html=()=>js(`document.documentElement.outerHTML`);
const url=()=>js(`location.pathname`);
const results=[]; const check=(l,p,d='')=>{results.push(p);console.log(`  [${p?'PASS':'FAIL'}] ${l}${d?'  — '+d:''}`)};

async function setFields(vals) {
  await js(`(()=>{const f=document.querySelector('main form');
    const setVal=(el,v)=>{const proto = el.tagName==='SELECT'?HTMLSelectElement:(el.tagName==='TEXTAREA'?HTMLTextAreaElement:HTMLInputElement);
      Object.getOwnPropertyDescriptor(proto.prototype,'value').set.call(el,v);
      el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true}));};
    const set=(n,v,idx)=>{let els=f.elements[n]; if(!els) return;
      if (els.length!==undefined && !els.tagName) { const list=[...els];
        if (list[0] && (list[0].type==='radio'||list[0].type==='checkbox')) { list.forEach(r=>{ r.checked=r.value===v; r.dispatchEvent(new Event('change',{bubbles:true})); }); return; }
        setVal(list[idx||0], v); return; }
      if (els.type==='checkbox') { els.checked = v==='yes'; els.dispatchEvent(new Event('change',{bubbles:true})); return; }
      setVal(els, v);};
    ${Object.entries(vals).map(([k,v])=>Array.isArray(v)?v.map((vv,i)=>`set(${JSON.stringify(k)},${JSON.stringify(vv)},${i});`).join(''):`set(${JSON.stringify(k)},${JSON.stringify(String(v))});`).join('')}
  })()`);
}
const submit = async () => { await js(`document.querySelector('main form').submit()`); await sleep(2600); };

await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride',{width:390,height:900,deviceScaleFactor:2,mobile:true});
await send('Network.clearBrowserCookies');

console.log('\nNO APPLICATION');
await go('http://localhost:3210/apply/status');
check('an unknown link explains itself rather than erroring', /could not find an application/i.test(await text()));
check('and only offers to resend to the contact on file', /we can only send it there/i.test(await text()));

console.log('\nMID-APPLICATION');
await go('http://localhost:3210/apply/start');
await setFields({ firstName:'Dana', lastName:'Okafor', email:'dana@example.com', phone:'9015550143', dateOfBirth:'1990-04-12' }); await submit();
await go('http://localhost:3210/apply/status');
check('an unsubmitted application says so', /not finished/i.test(await text()));
check('and offers to resume', await js(`!![...document.querySelectorAll('a')].find(a=>/Continue my application/.test(a.textContent))`));

console.log('\nSUBMITTED, PAYMENT REPORTED');
await go('http://localhost:3210/apply/income');
await setFields({ incomeKind:['voucher'], incomeAmount:['1100'] }); await submit();
await setFields({ addressLine:['9 Old St'], addressCity:['Memphis'], addressState:['TN'], addressFrom:['2022'], hasPriorEviction:'yes' }); await submit();
await submit();
await setFields({ disclosures:'yes' }); await submit();
await setFields({ paymentMethod:'zelle', paymentReported:'yes' }); await submit();
check('reached confirmation', (await url()).endsWith('/confirmation'), await url());

await go('http://localhost:3210/apply/status');
const s = await text();
check('shows we are checking for the payment', /checking for your payment/i.test(s));
check('promises not to close it silently', /contact you rather than close your application/i.test(s));
check('NO deadline is shown before verification', !/Decision due by/i.test(s));
check('and explains when the clock starts', /starts when we confirm your payment/i.test(s));

console.log('\nEXPOSES NOTHING SENSITIVE');
const h = await html();
check('no date of birth anywhere in the markup', !/1990-04-12/.test(h), 'the whole reason this link needs no password');
// The phrase appears deliberately — "an ITIN is accepted in place of a Social
// Security number" is reassurance. What must not exist is the value or a field.
check('no SSN input field on the status page', await js(`
  ![...document.querySelectorAll('input')].some(i => /ssn|social/i.test(i.name || ''))`));
check('no screening report content is exposed', !/credit score|screening report result/i.test(s));
check('a payment reference IS shown, for support calls', /SRG-[A-Z0-9]{4}-[A-Z0-9]{4}/.test(s));

console.log('\nDOCUMENTS');
check('identity and income are requested', /Photo identification/i.test(s) && /Proof of income/i.test(s));
check('ITIN is accepted explicitly', /ITIN/.test(s));
check('the voucher holder is asked for the award letter', /Voucher award letter/i.test(s));
check('and for their caseworker contact', /caseworker/i.test(s));
check('eviction paperwork is requested but optional', /Anything about the prior filing/i.test(s) && /helps your case/i.test(s));
check('documents do not block the decision', /do not hold up your decision starting/i.test(s));
check('camera capture is enabled for phones', await js(`
  [...document.querySelectorAll('input[type=file]')].every(i=>i.getAttribute('capture')==='environment')`));
check('and HEIC is accepted — what an iPhone actually produces', await js(`
  [...document.querySelectorAll('input[type=file]')].every(i=>/heic/i.test(i.getAttribute('accept')||''))`));
check('storage gap is flagged, not faked', /TO CONFIRM/.test(s));

console.log('\nFRAUD WARNING CARRIES THROUGH');
check('repeats that we never ask for payment details by message', /never email or text you asking for payment details/i.test(s));

console.log('\nNO HORIZONTAL OVERFLOW ON A PHONE');
check('page fits 390px', await js(`document.documentElement.scrollWidth <= window.innerWidth`),
  await js(`document.documentElement.scrollWidth + ' vs ' + window.innerWidth`));

const failed=results.filter(r=>!r).length;
console.log(`\n${results.length-failed}/${results.length} passed`);
ws.close(); chrome.kill();
process.exit(failed?1:0);

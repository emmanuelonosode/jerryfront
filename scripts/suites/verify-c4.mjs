/** C4 acceptance: manual payment, honestly represented, and hard to mistake for a scam. */
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
const CHROME='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'; const PORT=9960;
const chrome=spawn(CHROME,['--headless=new',`--remote-debugging-port=${PORT}`,'--disable-gpu','--hide-scrollbars','--no-first-run',`--user-data-dir=/tmp/cdp-c4-${Date.now()}`,'about:blank'],{stdio:'ignore'});
for(let i=0;i<60;i++){try{if((await fetch(`http://127.0.0.1:${PORT}/json/version`)).ok)break;}catch{} await sleep(250);}
let id=0;const pending=new Map();
const t=await(await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`,{method:'PUT'})).json();
const ws=new WebSocket(t.webSocketDebuggerUrl); await new Promise(r=>ws.addEventListener('open',r,{once:true}));
ws.addEventListener('message',e=>{const m=JSON.parse(e.data); if(m.id&&pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);if(m.error){p.reject(new Error(m.error.message));}else{p.resolve(m.result);}}});
const send=(me,pa={})=>new Promise((res,rej)=>{const n=++id;pending.set(n,{resolve:res,reject:rej});ws.send(JSON.stringify({id:n,method:me,params:pa}));});
const js=async x=>{const r=await send('Runtime.evaluate',{expression:x,returnByValue:true,awaitPromise:true}); if(r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text); return r.result.value;};
const go=async u=>{await send('Page.navigate',{url:u}); await sleep(1700);};
const url=()=>js(`location.pathname`);
const text=()=>js(`document.body.innerText`);
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
await send('Emulation.setDeviceMetricsOverride',{width:900,height:1200,deviceScaleFactor:1,mobile:false});
await send('Network.clearBrowserCookies');

// Walk to payment.
await go('http://localhost:3210/apply/start');
await setFields({ firstName:'Dana', lastName:'Okafor', email:'dana@example.com', phone:'9015550143', dateOfBirth:'1990-04-12' }); await submit();
await setFields({ incomeKind:['employment'], incomeAmount:['4200'] }); await submit();
await setFields({ addressLine:['9 Old St'], addressCity:['Memphis'], addressState:['TN'], addressFrom:['2022'], hasPriorEviction:'no' }); await submit();
await submit(); // household: empty is valid
await setFields({ disclosures:'yes' }); await submit();
check('review -> payment', (await url()).endsWith('/payment'), await url());

console.log('\nANTI-FRAUD POSTURE — the reason this page is hard');
const p = await text();
check('states details appear ONLY on this page', /only on this page/i.test(p));
check('states we never send them by email, text, or phone', /never send them by email, text message, or over the phone/i.test(p));
check('states the amount never changes', /\$55/.test(p) && /different figure is not us/i.test(p));
check('irreversible rails carry an extra warning', /cannot be reversed by your bank/i.test(p));
check('sample details are labelled as not real', /placeholder destinations, not real accounts/i.test(p));
check('states no deposit before a signed lease', /never.*ask for a deposit.*before you have a signed lease/is.test(p));
check('gives a route to check a suspicious message', /call the number on our contact page/i.test(p));

console.log('\nPAYMENT MECHANICS');
check('a payment reference is issued', /SRG-[A-Z0-9]{4}-[A-Z0-9]{4}/.test(p));
check('explains what the reference is for', /match your money to your application/i.test(p));
check('every offered method shows the memo reference', /In the memo/i.test(p));

console.log('\nTHE CLOCK IS HONEST');
check('says the clock starts at VERIFICATION, not submission', /decision window starts when we confirm the payment/i.test(p));
check('says ticking the box is not confirmation of receipt', /does not confirm receipt/i.test(p));

console.log('\nSUBMISSION');
// Not choosing a method must be rejected — the fee cannot be attributed.
await setFields({ paymentReported:'yes' }); await submit();
check('a method must be chosen before submitting', (await url()).endsWith('/payment'), await url());
check('and it says which answer is missing', /Choose how you want to pay/i.test(await text()));

await setFields({ paymentMethod:'zelle', paymentReported:'yes', paymentReference:'CONF-99123' }); await submit();
check('payment -> confirmation', (await url()).endsWith('/confirmation'), await url());

const c = await text();
check('does NOT claim a deadline before payment is verified', !/by (Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)/.test(c));
check('says a person is checking for the payment', /a person checks the account/i.test(c));
check('promises the exact deadline once verified', /email you the exact deadline/i.test(c));
check('shows the reference back for support calls', /SRG-[A-Z0-9]{4}-[A-Z0-9]{4}/.test(c));
check('promises contact if the payment is not found', /we will contact you before doing anything else/i.test(c));
check('discloses FCRA rights on decline', /naming the agency and how to dispute/i.test(c));


const failed=results.filter(r=>!r).length;
console.log(`\n${results.length-failed}/${results.length} passed`);
ws.close(); chrome.kill();
process.exit(failed?1:0);

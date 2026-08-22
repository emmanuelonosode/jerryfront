/** C3 acceptance: the whole application, start to review, in one sitting. */
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
const CHROME='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'; const PORT=9930;
const chrome=spawn(CHROME,['--headless=new',`--remote-debugging-port=${PORT}`,'--disable-gpu','--hide-scrollbars','--no-first-run',`--user-data-dir=/tmp/cdp-c3-${Date.now()}`,'about:blank'],{stdio:'ignore'});
for(let i=0;i<60;i++){try{if((await fetch(`http://127.0.0.1:${PORT}/json/version`)).ok)break;}catch{} await sleep(250);}
let id=0;const pending=new Map();
const t=await(await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`,{method:'PUT'})).json();
const ws=new WebSocket(t.webSocketDebuggerUrl); await new Promise(r=>ws.addEventListener('open',r,{once:true}));
ws.addEventListener('message',e=>{const m=JSON.parse(e.data); if(m.id&&pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);if(m.error){p.reject(new Error(m.error.message));}else{p.resolve(m.result);}}});
const send=(me,pa={})=>new Promise((res,rej)=>{const n=++id;pending.set(n,{resolve:res,reject:rej});ws.send(JSON.stringify({id:n,method:me,params:pa}));});
const js=async x=>{const r=await send('Runtime.evaluate',{expression:x,returnByValue:true,awaitPromise:true}); if(r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text); return r.result.value;};
const go=async u=>{await send('Page.navigate',{url:u}); await sleep(1600);};
const url=()=>js(`location.pathname`);
const text=()=>js(`document.body.innerText`);
const results=[]; const check=(l,p,d='')=>{results.push(p);console.log(`  [${p?'PASS':'FAIL'}] ${l}${d?'  — '+d:''}`)};

async function setFields(vals) {
  await js(`(()=>{const f=document.querySelector('main form');
    const setVal=(el,v)=>{const proto = el.tagName==='SELECT'?HTMLSelectElement:(el.tagName==='TEXTAREA'?HTMLTextAreaElement:HTMLInputElement);
      Object.getOwnPropertyDescriptor(proto.prototype,'value').set.call(el,v);
      el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true}));};
    const set=(n,v,idx)=>{let els=f.elements[n]; if(!els) return;
      if (els instanceof RadioNodeList || (els.length!==undefined && !els.tagName)) {
        const list=[...els];
        if (list[0] && (list[0].type==='radio'||list[0].type==='checkbox')) { list.forEach(r=>{ r.checked = r.value===v; r.dispatchEvent(new Event('change',{bubbles:true})); }); return; }
        setVal(list[idx||0], v); return;
      }
      if (els.type==='checkbox') { els.checked = v==='yes'; els.dispatchEvent(new Event('change',{bubbles:true})); return; }
      setVal(els, v);};
    ${Object.entries(vals).map(([k,v])=>Array.isArray(v)?v.map((vv,i)=>`set(${JSON.stringify(k)},${JSON.stringify(vv)},${i});`).join(''):`set(${JSON.stringify(k)},${JSON.stringify(String(v))});`).join('')}
  })()`);
}
const submit = async () => { await js(`document.querySelector('main form').submit()`); await sleep(2600); };

await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride',{width:900,height:1200,deviceScaleFactor:1,mobile:false});
await send('Network.clearBrowserCookies');

console.log('\nWALKING THE WHOLE APPLICATION');
await go('http://localhost:3210/apply/start');
check('starts at details', (await url()).endsWith('/details'), await url());

await setFields({ firstName:'Dana', lastName:'Okafor', email:'dana@example.com', phone:'9015550143', dateOfBirth:'1990-04-12' });
await submit();
check('details -> income', (await url()).endsWith('/income'), await url());

await setFields({ incomeKind:['self-employment','voucher'], incomeAmount:['2600','1100'] });
await submit();
check('income -> history', (await url()).endsWith('/history'), await url());

console.log('\nHISTORY — the delicate one');
const h = await text();
check('the eviction question is asked plainly', /eviction ever been filed/i.test(h));
check('the consequence sits beside the question', /not an automatic decline/i.test(h));
check('filing vs judgment is explained inline', /filing is not the same as a judgment/i.test(h));
check('the explanation box is optional', /you are not required to explain a difficult year/i.test(h));

await setFields({ addressLine:['9 Old St'], addressCity:['Memphis'], addressState:['TN'], addressFrom:['2022'], hasPriorEviction:'yes', priorEvictionNote:'Job loss in 2021, paid in full.' });
await submit();
check('history -> household', (await url()).endsWith('/household'), await url());

console.log('\nHOUSEHOLD');
const hh = await text();
check('an empty household is a valid answer', /leave this page as it is and continue/i.test(hh));
check('assistance animals are a field, not a footnote', /This is an assistance animal/i.test(hh));
check('and are never charged', /Never charged a pet fee/i.test(hh));
await setFields({ petKind:['Dog'], petWeight:['40'], petAssistance:'yes' });
await submit();
check('household -> review', (await url()).endsWith('/review'), await url());

console.log('\nREVIEW — the last gate before money');
const r = await text();
check('shows the name back', /Dana Okafor/.test(r));
check('shows total income from all sources', /\$3,700/.test(r), 'self-employment + voucher');
check('surfaces the declared eviction honestly', /individual review/i.test(r));
check('notes the assistance animal exemption', /never charged a pet fee/i.test(r));
check('THE FEE IS SHOWN BEFORE THE PAYMENT STEP', /\$55/.test(r) && /before the payment step/i.test(r));
check('FCRA dispute rights are disclosed', /which agency supplied it and how to dispute/i.test(r));
check('every section has a Change link', await js(`[...document.querySelectorAll('a')].filter(a=>a.textContent.trim()==='Change').length >= 5`));

console.log('\nPAYMENT IS GATED ON REVIEW');
await go('http://localhost:3210/apply/payment');
check('payment unreachable until disclosures are accepted', !(await url()).endsWith('/payment'), await url());
await go('http://localhost:3210/apply/review');
await setFields({ disclosures:'yes' });
await submit();
check('accepting disclosures unlocks payment', (await url()).endsWith('/payment'), await url());

console.log('\nEDIT AND RETURN');
await go('http://localhost:3210/apply/income');
check('an earlier step is still reachable', (await url()).endsWith('/income'));
check('and still holds its saved values', await js(`
  [...document.querySelectorAll('[name=incomeAmount]')].some(i=>i.value==='2600')`));

const failed=results.filter(r=>!r).length;
console.log(`\n${results.length-failed}/${results.length} passed`);
ws.close(); chrome.kill();
process.exit(failed?1:0);

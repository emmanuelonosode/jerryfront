/** C2 acceptance: does a mid-application browser close resume with data intact? */
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
const CHROME='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'; const PORT=9870;
const chrome=spawn(CHROME,['--headless=new',`--remote-debugging-port=${PORT}`,'--disable-gpu','--hide-scrollbars','--no-first-run',`--user-data-dir=/tmp/cdp-shell-${Date.now()}`,'about:blank'],{stdio:'ignore'});
for(let i=0;i<60;i++){try{if((await fetch(`http://127.0.0.1:${PORT}/json/version`)).ok)break;}catch{} await sleep(250);}
let id=0;const pending=new Map();
const t=await(await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`,{method:'PUT'})).json();
const ws=new WebSocket(t.webSocketDebuggerUrl); await new Promise(r=>ws.addEventListener('open',r,{once:true}));
ws.addEventListener('message',e=>{const m=JSON.parse(e.data); if(m.id&&pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);if(m.error){p.reject(new Error(m.error.message));}else{p.resolve(m.result);}}});
const send=(m,p={})=>new Promise((res,rej)=>{const n=++id;pending.set(n,{resolve:res,reject:rej});ws.send(JSON.stringify({id:n,method:m,params:p}));});
const js=async x=>{const{result,exceptionDetails}=await send('Runtime.evaluate',{expression:x,returnByValue:true,awaitPromise:true}); if(exceptionDetails) throw new Error(exceptionDetails.exception?.description||exceptionDetails.text); return result.value;};
const go=async u=>{await send('Page.navigate',{url:u}); await sleep(1400);};
const url=()=>js(`location.pathname + location.search`);
const results=[]; const check=(l,p,d='')=>{results.push(p);console.log(`  [${p?'PASS':'FAIL'}] ${l}${d?'  — '+d:''}`)};

await send('Page.enable'); await send('Network.enable');
// Each run starts with no draft cookie. Without this the previous run's draft
// leaks in and every "empty draft" assertion silently tests the wrong thing.
await send('Network.clearBrowserCookies');
await send('Emulation.setDeviceMetricsOverride',{width:900,height:1200,deviceScaleFactor:1,mobile:false});

console.log('\nSTEP ROUTING');
await go('http://localhost:3210/apply/start');
check('entry route lands on the first named step', (await url()).includes('/apply/details'), await url());
check('progress trail renders', await js(`!!document.querySelector('nav[aria-label="Application progress"]')`));
check('shows step 1 of 6', await js(`/Step\\s*1\\s*of\\s*6/.test(document.querySelector('nav[aria-label="Application progress"]').textContent.replace(/\\s+/g,' '))`));
check('blank draft reads 0% complete', await js(`/0%/.test(document.querySelector('nav[aria-label="Application progress"]').textContent)`));

console.log('\nSKIP PROTECTION');
await go('http://localhost:3210/apply/payment');
check('cannot deep-link to payment with an empty draft', !(await url()).includes('/apply/payment'), `landed on ${await url()}`);
await go('http://localhost:3210/apply/household');
check('cannot skip past an unfinished step', !(await url()).includes('/apply/household'), `landed on ${await url()}`);

console.log('\nSAVE AND VALIDATE');
await go('http://localhost:3210/apply/start');
const fill = async (vals) => {
  await js(`(() => { const f=document.querySelector('main form');
    const set=(n,v)=>{const el=f.elements[n]; if(!el) return;
      const proto = el instanceof HTMLInputElement ? HTMLInputElement : HTMLSelectElement;
      Object.getOwnPropertyDescriptor(proto.prototype,'value').set.call(el,v);
      el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true}));};
    ${Object.entries(vals).map(([k,v])=>`set(${JSON.stringify(k)},${JSON.stringify(v)});`).join('')} })()`);
};
// LAYER 1 — the browser refuses to submit an incomplete form at all.
await fill({ firstName: 'Dana', lastName: 'Okafor' });
await js(`document.querySelector('main form').requestSubmit()`); await sleep(1500);
check('native validation blocks an incomplete submit', (await url()).includes('/apply/details'), await url());
check('and no round trip is wasted on it', await js(`
  !document.querySelector('main form').checkValidity()`));
check('the first invalid field is identified', await js(`
  document.querySelector('main form').querySelector(':invalid')?.name === 'email'`));

// LAYER 2 — the server backstop, for a request that skips the browser's
// checks: JavaScript disabled, an old browser, or a crafted POST.
// form.submit() bypasses constraint validation, which is exactly that case.
await js(`document.querySelector('main form').submit()`); await sleep(3500);
check('server-side validation catches it', (await url()).includes('/apply/details'), await url());
check('and renders the field error', await js(`/Enter an email address/.test(document.body.innerText)`));
check('marking the field invalid for assistive tech', await js(`
  document.querySelectorAll('[aria-invalid="true"]').length > 0`));
check('KEEPS what was already typed', await js(`document.querySelector('[name=firstName]').value === 'Dana'`), 'saving before validating');

// Complete it.
await fill({ firstName: 'Dana', lastName: 'Okafor', email: 'dana@example.com', phone: '9015550143', dateOfBirth: '1990-04-12' });
await js(`document.querySelector('main form').requestSubmit()`); await sleep(3000);
check('advances to the next named step', (await url()).includes('/apply/income'), await url());
check('progress moved to 20%', await js(`/20%/.test(document.querySelector('nav[aria-label="Application progress"]').textContent)`));

console.log('\nTHE CLOSED-BROWSER TEST');
// Simulate: navigate away entirely, then come back cold.
await go('http://localhost:3210/homes-for-rent');
await go('http://localhost:3210/apply/details');
check('returning shows the saved name', await js(`document.querySelector('[name=firstName]')?.value === 'Dana'`));
check('and the saved email', await js(`document.querySelector('[name=email]')?.value === 'dana@example.com'`));
check('and the saved date of birth', await js(`document.querySelector('[name=dateOfBirth]')?.value === '1990-04-12'`));
await go('http://localhost:3210/apply/nonsense-step');
check('an unknown step 404s', await js(`/404|not be found|Not Found/i.test(document.body.textContent)`));

console.log('\nSENSITIVE FIELDS EXPLAIN THEMSELVES');
await go('http://localhost:3210/apply/details');
check('date of birth states why it is needed', await js(`/screening report/.test(document.body.textContent)`));
check('and that it is never shown back', await js(`/never shown back to you/.test(document.body.textContent)`));

console.log('\nINCOME STEP OFFERS ALTERNATIVES');
await go('http://localhost:3210/apply/income');
check('self-employment is offered, not buried', await js(`
  [...document.querySelectorAll('option')].some(o => /Self-employment, contract, or gig/.test(o.textContent))`));
check('voucher income is offered as a source', await js(`
  [...document.querySelectorAll('option')].some(o => /housing voucher/i.test(o.textContent))`));
check('three source rows render by default', await js(`document.querySelectorAll('[name=incomeKind]').length === 3`));
check('states that 1099s replace pay stubs', await js(`/1099s.*in place of pay stubs/s.test(document.body.textContent)`));

const failed = results.filter(r=>!r).length;
console.log(`\n${results.length-failed}/${results.length} passed`);
ws.close(); chrome.kill();
process.exit(failed?1:0);

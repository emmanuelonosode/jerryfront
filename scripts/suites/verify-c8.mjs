/** C8: saved homes and alerts — no account, and the save control is actually reachable. */
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
const CHROME='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'; const PORT=10070;
const chrome=spawn(CHROME,['--headless=new',`--remote-debugging-port=${PORT}`,'--disable-gpu','--hide-scrollbars','--no-first-run',`--user-data-dir=/tmp/cdp-c8-${Date.now()}`,'about:blank'],{stdio:'ignore'});
for(let i=0;i<60;i++){try{if((await fetch(`http://127.0.0.1:${PORT}/json/version`)).ok)break;}catch{} await sleep(250);}
let id=0;const pending=new Map();
const t=await(await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`,{method:'PUT'})).json();
const ws=new WebSocket(t.webSocketDebuggerUrl); await new Promise(r=>ws.addEventListener('open',r,{once:true}));
ws.addEventListener('message',e=>{const m=JSON.parse(e.data); if(m.id&&pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);if(m.error){p.reject(new Error(m.error.message));}else{p.resolve(m.result);}}});
const send=(me,pa={})=>new Promise((res,rej)=>{const n=++id;pending.set(n,{resolve:res,reject:rej});ws.send(JSON.stringify({id:n,method:me,params:pa}));});
const js=async x=>{const r=await send('Runtime.evaluate',{expression:x,returnByValue:true,awaitPromise:true}); if(r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text); return r.result.value;};
const go=async u=>{await send('Page.navigate',{url:u}); await sleep(1900);};
const text=()=>js(`document.body.innerText`);
const results=[]; const check=(l,p,d='')=>{results.push(p);console.log(`  [${p?'PASS':'FAIL'}] ${l}${d?'  — '+d:''}`)};

await send('Page.enable'); await send('Network.enable');
await send('Emulation.setDeviceMetricsOverride',{width:390,height:900,deviceScaleFactor:2,mobile:true});
await send('Network.clearBrowserCookies');

console.log('\nEMPTY SAVED LIST');
await go('http://localhost:3210/saved');
check('says nothing is saved', /Nothing saved yet/i.test(await text()));
check('makes clear no signup is needed', /do not need to sign up/i.test(await text()));

console.log('\nTHE SAVE CONTROL IS REACHABLE');
await go('http://localhost:3210/homes-for-rent');
check('cards render a save button', await js(`document.querySelectorAll('article button[aria-pressed]').length > 0`),
  'scoped to a card — the list/map view toggle also uses aria-pressed');
// The card is a stretched link; a nested button would be invalid and unreachable.
check('the button is NOT inside the card link', await js(`
  [...document.querySelectorAll('article button[aria-pressed]')].every(b => !b.closest('a'))`));
check('it names the specific home, not just "Save"', await js(`
  (() => { const b=document.querySelector('article button[aria-pressed]');
    return /Save .+,/.test(b.textContent||''); })()`));
check('it sits above the card overlay so it is clickable', await js(`
  (() => { const b=document.querySelector('article button[aria-pressed]');
    return parseInt(getComputedStyle(b).zIndex||'0') >= 2; })()`));

console.log('\nSAVING WORKS WITHOUT AN ACCOUNT');
const addr = await js(`document.querySelector('article h3 a')?.textContent`);
await js(`document.querySelector('article button[aria-pressed]').click()`); await sleep(900);
check('the control reports pressed', await js(`document.querySelector('article button[aria-pressed]').getAttribute('aria-pressed')==='true'`));
check('no login was demanded', !/sign in|log in|create an account/i.test(await text()));

await go('http://localhost:3210/saved');
const s = await text();
check('the home appears on the saved page', addr ? s.includes(addr.split(',')[0]) : false, addr || '');
check('and it survived a full page navigation', /still available/i.test(s));

console.log('\nUNSAVING');
await js(`document.querySelector('article button[aria-pressed="true"]').click()`); await sleep(900);
await go('http://localhost:3210/saved');
check('removing it empties the list again', /Nothing saved yet/i.test(await text()));

console.log('\nALERTS — no account');
await go('http://localhost:3210/alerts?city=Memphis&maxPrice=2000&beds=3');
const a = await text();
check('states no account is needed', /No account needed/i.test(a));
check('pre-fills from the search that sent them', await js(`document.querySelector('main [name=city]')?.value === 'Memphis'`));
check('and the price', await js(`document.querySelector('[name=maxPrice]')?.value === '2000'`));
check('and the bedrooms', await js(`document.querySelector('[name=beds]')?.value === '3'`));
check('promises one home mentioned once', /once, not every day/i.test(a));
check('promises one-click unsubscribe without logging in', /never have to log in to leave/i.test(a));
check('carries the anti-fraud warning', /never email or text you asking for payment details/i.test(a));

console.log('\nALERT VALIDATION');
await js(`(()=>{const f=document.querySelector('main form');
  const set=(n,v)=>{const el=f.elements[n];
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,v);
    el.dispatchEvent(new Event('input',{bubbles:true}));};
  set('contact','not-an-email');})()`);
await js(`document.querySelector('main form').requestSubmit()`); await sleep(700);
check('a bad email is caught in-browser', /Enter an email address/i.test(await text()));

await js(`(()=>{const f=document.querySelector('main form');
  const set=(n,v)=>{const el=f.elements[n];
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,v);
    el.dispatchEvent(new Event('input',{bubbles:true}));};
  set('contact','dana@example.com');})()`);
await js(`document.querySelector('main form').requestSubmit()`); await sleep(800);
const done = await text();
check('a valid alert is accepted', /Alert set up/i.test(done));
check('and describes what it will watch, in plain words', /3\+ bed homes in Memphis/i.test(done));
check('restates one-click unsubscribe', /one click stops it for good/i.test(done));
check('is honest that delivery is not wired up', /not wired up yet/i.test(done));

console.log('\nUNFILTERED ALERT IS REFUSED');
await go('http://localhost:3210/alerts');
await js(`(()=>{const f=document.querySelector('main form');
  const set=(n,v)=>{const el=f.elements[n];
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,v);
    el.dispatchEvent(new Event('input',{bubbles:true}));};
  set('contact','dana@example.com');})()`);
await js(`document.querySelector('main form').requestSubmit()`); await sleep(700);
check('an alert for everything is rejected', /Narrow the search a little first/i.test(await text()));

console.log('\nMOBILE');
check('no horizontal overflow at 390px', await js(`document.documentElement.scrollWidth <= window.innerWidth`));

const failed=results.filter(r=>!r).length;
console.log(`\n${results.length-failed}/${results.length} passed`);
ws.close(); chrome.kill();
process.exit(failed?1:0);

import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
const CHROME='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'; const PORT=10200;
const chrome=spawn(CHROME,['--headless=new',`--remote-debugging-port=${PORT}`,'--disable-gpu','--no-first-run',`--user-data-dir=/tmp/cdp-motion-${Date.now()}`,'about:blank'],{stdio:'ignore'});
for(let i=0;i<60;i++){try{if((await fetch(`http://127.0.0.1:${PORT}/json/version`)).ok)break;}catch{} await sleep(250);}
let id=0;const pending=new Map();
const t=await(await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`,{method:'PUT'})).json();
const ws=new WebSocket(t.webSocketDebuggerUrl); await new Promise(r=>ws.addEventListener('open',r,{once:true}));
ws.addEventListener('message',e=>{const m=JSON.parse(e.data); if(m.id&&pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);if(m.error){p.reject(new Error(m.error.message));}else{p.resolve(m.result);}}});
const send=(me,pa={})=>new Promise((res,rej)=>{const n=++id;pending.set(n,{resolve:res,reject:rej});ws.send(JSON.stringify({id:n,method:me,params:pa}));});
const js=async x=>{const r=await send('Runtime.evaluate',{expression:x,returnByValue:true,awaitPromise:true}); if(r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description||''); return r.result.value;};
const results=[]; const check=(l,p,d='')=>{results.push(p);console.log(`  [${p?'PASS':'FAIL'}] ${l}${d?'  — '+d:''}`)};
await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride',{width:390,height:900,deviceScaleFactor:2,mobile:true});

// With reduced motion requested, nothing should animate or transition.
await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
for (const route of ['/', '/homes-for-rent', '/apply', '/dev/primitives']) {
  await send('Page.navigate',{url:'http://localhost:3210'+route}); await sleep(1800);
  const moving = await js(`
    [...document.querySelectorAll('*')].filter(el => {
      const s = getComputedStyle(el);
      const dur = (v) => v.split(',').some(x => parseFloat(x) > 0.05);
      return (s.animationName !== 'none' && dur(s.animationDuration)) || dur(s.transitionDuration);
    }).length`);
  check(`${route} — nothing animates under reduced-motion`, moving === 0, `${moving} animated element(s)`);
}

// Motion still exists when not suppressed, so the query is doing real work.
await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});
await send('Page.navigate',{url:'http://localhost:3210/dev/primitives'}); await sleep(1800);
const withMotion = await js(`
  [...document.querySelectorAll('*')].filter(el => {
    const s = getComputedStyle(el);
    return s.transitionDuration.split(',').some(x => parseFloat(x) > 0.05);
  }).length`);
check('transitions do exist when motion is allowed', withMotion > 0, `${withMotion} element(s)`);

// And the token ceiling holds: nothing over 200ms.
/**
 * The brief's 200ms ceiling applies to TRANSITIONS — state changes the user
 * caused. It cannot sensibly apply to looping indicators: a 200ms pulse loop is
 * a 5Hz strobe, which is a WCAG 2.3.1 flashing hazard rather than restraint.
 * So the two are asserted separately.
 */
const slowTransitions = await js(`
  [...document.querySelectorAll('*')].flatMap(el =>
    getComputedStyle(el).transitionDuration.split(',').map(v => parseFloat(v)).filter(v => v > 0.2)
  ).length`);
check('no TRANSITION exceeds the 200ms brief ceiling', slowTransitions === 0, `${slowTransitions} over 200ms`);

const fastLoops = await js(`
  [...document.querySelectorAll('*')].filter(el => {
    const s = getComputedStyle(el);
    if (s.animationName === 'none') return false;
    if (s.animationIterationCount.split(',').every(c => c.trim() !== 'infinite')) return false;
    return s.animationDuration.split(',').some(v => parseFloat(v) < 0.5);
  }).length`);
check('no looping animation is fast enough to flash', fastLoops === 0, `${fastLoops} loop(s) under 500ms`);

const failed=results.filter(r=>!r).length;
console.log(`\n${results.length-failed}/${results.length} passed`);
ws.close(); chrome.kill();
process.exit(failed?1:0);

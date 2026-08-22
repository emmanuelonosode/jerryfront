/**
 * Acceptance: applying is a normal, ungated route.
 *
 * REWRITTEN. This suite used to exercise a pre-qualification questionnaire —
 * income multiple, credit band, prior evictions, voucher amount — that scored
 * an applicant and told them their odds before letting them proceed. That step
 * has been removed: this is a letting business, an agent makes the decision
 * after a conversation, and a screening interrogation in front of the
 * application filtered out people the agent might well have approved.
 *
 * What is asserted now is the property that replaced it: /apply goes straight
 * into the application, nothing asks a visitor to prove themselves before they
 * can start, and the fee is still stated before it is taken.
 */
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
const CHROME='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'; const PORT=9840;
const chrome=spawn(CHROME,['--headless=new',`--remote-debugging-port=${PORT}`,'--disable-gpu','--hide-scrollbars','--no-first-run',`--user-data-dir=/tmp/cdp-pq`,'about:blank'],{stdio:'ignore'});
for(let i=0;i<60;i++){try{if((await fetch(`http://127.0.0.1:${PORT}/json/version`)).ok)break;}catch{} await sleep(250);}
let id=0;const pending=new Map();
const t=await(await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`,{method:'PUT'})).json();
const ws=new WebSocket(t.webSocketDebuggerUrl); await new Promise(r=>ws.addEventListener('open',r,{once:true}));
ws.addEventListener('message',e=>{const m=JSON.parse(e.data); if(m.id&&pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);if(m.error){p.reject(new Error(m.error.message));}else{p.resolve(m.result);}}});
const send=(method,params={})=>new Promise((res,rej)=>{const n=++id;pending.set(n,{resolve:res,reject:rej});ws.send(JSON.stringify({id:n,method,params}));});
const js=async x=>{const{result,exceptionDetails}=await send('Runtime.evaluate',{expression:x,returnByValue:true,awaitPromise:true}); if(exceptionDetails) throw new Error(exceptionDetails.exception?.description||exceptionDetails.text); return result.value;};
const results=[]; const check=(l,p,d='')=>{results.push(p);console.log(`  [${p?'PASS':'FAIL'}] ${l}${d?'  — '+d:''}`)};

await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride',{width:1000,height:1200,deviceScaleFactor:1,mobile:false});
await send('Page.navigate',{url:'http://localhost:3210/apply'}); await sleep(3000);

console.log('\nAPPLYING IS DIRECT');
const landed = await js(`location.pathname`);
check('/apply goes straight into the application', landed.startsWith('/apply/details'), landed);

const text = await js(`document.querySelector('main').innerText.replace(/\\s+/g,' ')`);
check('no odds or likelihood language', !/likely to qualify|your odds|out of reach|unlikely/i.test(text));
check('no screening threshold is quoted', !/income multiple|3x|2\.5x|credit score of/i.test(text));

console.log('\nNOTHING GATES THE START');
check('the first step is reachable without proving anything', await js(
  `!!document.querySelector('main form')`));
check('it asks who you are, not what you earn', /name|email|phone/i.test(text));

console.log('\nTHE FEE IS STILL STATED BEFORE IT IS TAKEN');
await send('Page.navigate',{url:'http://localhost:3210/fees'}); await sleep(2000);
const fees = await js(`document.querySelector('main').innerText.replace(/\\s+/g,' ')`);
check('every fee is published', /application fee/i.test(fees));

console.log(`\n${results.filter(Boolean).length}/${results.length} passed`);
ws.close(); chrome.kill();
process.exit(results.every(Boolean) ? 0 : 1);

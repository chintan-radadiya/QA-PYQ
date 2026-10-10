'use strict';
const $ = id => document.getElementById(id);
const STORAGE_KEY = 'cat_quant_studio_v3', LEGACY_KEY = 'arithmetic1_cat_practice_v1';
const writer = CatCore.uid();
let engine, page = '', routeId = '', saveTimer, toastTimer, lastTick = Date.now(), wasVisible = !document.hidden;
let persistedRevision = 0, storedRevision = 0, storageBlocked = false, recoveryRaw = null, pendingImport = null, priorFocus = null;
const ui = { filters:{topic:'All',pool:'All',search:'',difficulty:'All',kind:'All',type:'All',part:'All',skill:'All',year:'All',slot:'All'},
  setup:{mode:'learn',count:10,minutes:20,shuffle:true,balance:true},bankPage:0,extraFilters:false,revisionTab:'due',
  navHidden:matchMedia('(max-width:620px)').matches,solutions:new Set(),scratchOpen:false,calc:{value:'0',left:null,op:null,newEntry:true} };

function warning(message,actions='') { $('storageWarning').hidden=false;$('storageWarning').innerHTML=View.e(message)+actions; }
function init() {
  let data=CatCore.blank(), message='', needsInitialSave=false;
  try {
    const raw=localStorage.getItem(STORAGE_KEY);
    if(raw){try{const parsed=JSON.parse(raw);data=CatCore.validate(parsed,BANK);needsInitialSave=JSON.stringify(data)!==JSON.stringify(parsed.data||parsed);}catch(error){recoveryRaw=raw;storageBlocked=true;message='Saved progress could not be read. Your original data is preserved. Export it before restoring a valid backup.';}}
    else { needsInitialSave=true; const old=localStorage.getItem(LEGACY_KEY);if(old){data=CatCore.migrateLegacy(JSON.parse(old),BANK);message='Your earlier Arithmetic 1 progress was restored. Historical exposure is unknown, so those attempts are excluded from first-exposure accuracy.';} }
  } catch(error) {message='Browser storage is unavailable. You can practise, but export a backup before closing this page.';}
  engine=new CatCore.Engine(BANK,data); persistedRevision=data.revision;storedRevision=data.revision;
  document.documentElement.style.setProperty('--question-size',`${data.settings.font}px`);
  if(message)warning(message,recoveryRaw?View.button('export-recovery','Download original data','','small'):'');
  const expired=engine.checkDeadlines();if(expired.length)history.replaceState(null,'',`#results/${expired.at(-1).id}`);
  route();if(!storageBlocked){if(needsInitialSave)engine.touch();saveNow();}
}
function queueSave(){clearTimeout(saveTimer);saveTimer=setTimeout(saveNow,350);}
function saveNow(){
  clearTimeout(saveTimer);if(storageBlocked||engine.data.revision===persistedRevision)return;
  try {
    const current=localStorage.getItem(STORAGE_KEY);
    if(current){const parsed=JSON.parse(current);const revision=(parsed.data||parsed).revision||0;if(revision!==storedRevision&&parsed.writer!==writer){conflict();return;}}
    localStorage.setItem(STORAGE_KEY,JSON.stringify({app:'cat-quant-studio',writer,data:engine.data}));
    persistedRevision=storedRevision=engine.data.revision;
    $('saveStatus').textContent='Saved on this device · '+new Date().toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit'});
  }catch(error){$('saveStatus').textContent='Progress not saved';warning('Your browser could not save progress. Export a backup now to protect this session.',View.button('export','Export backup','','small'));}
}
function conflict(){storageBlocked=true;warning('Progress changed in another tab. This tab has stopped saving to prevent overwriting it. Export this tab if needed, then reload.',View.button('export','Export this tab','','small')+View.button('reload','Reload','','small'));}
function toast(text){clearTimeout(toastTimer);$('toast').textContent=text;$('toast').hidden=false;toastTimer=setTimeout(()=>$('toast').hidden=true,4500);}
function modal(title,body,actions=''){priorFocus=document.activeElement;$('dialogContent').innerHTML=`<h2 id="dialogTitle">${View.e(title)}</h2>${body}<div class="button-row">${actions||View.button('close-dialog','Close')}</div>`;if(!$('appDialog').open)$('appDialog').showModal();}
function closeModal(){if($('appDialog').open)$('appDialog').close();if(priorFocus?.isConnected)priorFocus.focus();}
function go(hash){if(location.hash.slice(1)===hash)route();else location.hash=hash;}
function accrue(){const now=Date.now(),s=engine?.active();if(s&&page==='test'&&wasVisible&&!storageBlocked){let dt=Math.max(0,(now-lastTick)/1000);if(s.deadline)dt=Math.min(dt,Math.max(0,(s.deadline-lastTick)/1000));if(dt<=15)engine.addTime(s,dt);}lastTick=now;wasVisible=!document.hidden;}
function checkExpiration(){const reports=engine.checkDeadlines();if(reports.length){saveNow();const r=reports.at(-1);closeModal();toast('Time is up. Your saved answers have been submitted.');go(`results/${r.id}`);return true;}return false;}
function route(){
  accrue();const [requested,arg='']=location.hash.slice(1).split('/');
  const exam=engine.liveExam();if(exam&&engine.expired(exam)){checkExpiration();return;}
  if(exam)engine.data.activeId=exam.id;
  if(exam&&requested!=='test'){location.hash='test';toast('The sectional is running. Use Exit options if you need to leave.');return;}
  const known=['dashboard','topics','concept','bank','random','question','exams','test','revision','sessions','results','analysis','settings','about'];
  page=known.includes(requested)?requested:'dashboard';routeId=arg;
  if(page==='question'){const q=engine.byId.get(arg);if(q&&(!q.reserve||engine.seen(q.id))){engine.p(q.id).seenAt ||= Date.now();engine.touch();}}
  if(page==='results'){const report=engine.data.reports.find(x=>x.id===arg)||(!arg?engine.data.reports.at(-1):null);if(report){for(const id of report.ids)engine.p(id).seenAt ||= Date.now();engine.touch();}}
  document.body.dataset.page=page;document.body.classList.remove('menu-open');document.querySelector('.mobile-menu').setAttribute('aria-expanded','false');
  document.querySelectorAll('.app-sidebar nav a').forEach(a=>{if(a.hash===`#${page}`)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
  document.title=`${({dashboard:'Today',topics:'Learning path',concept:'Concept guide',bank:'Question bank',random:'Practice setup',question:'Question',exams:'CAT sectionals',test:'Practice',revision:'Revision',sessions:'Sessions',results:'Results',analysis:'Analysis',settings:'Settings',about:'Sources'})[page]} · CAT Quant Studio`;
  render();window.scrollTo(0,0);$('main').focus({preventScroll:true});queueSave();lastTick=Date.now();
}
function render(){
  const output=page==='concept'?View.concept(Number(routeId)):page==='question'?View.question(routeId):page==='results'?View.report(routeId):page==='random'?View.setup():View[page]();
  $('main').innerHTML=output;updateClock();
}
function renderQuestion(keepScroll=false){const scroll=$('questionScroll')?.scrollTop||0,navScroll=document.querySelector('.palette')?.scrollTop||0;render();if(keepScroll&&$('questionScroll'))$('questionScroll').scrollTop=scroll;const palette=document.querySelector('.palette');if(palette){palette.scrollTop=navScroll;const current=palette.querySelector('[aria-current]');if(current&&(!keepScroll))current.scrollIntoView({block:'nearest'});}queueSave();}
function updateClock(){const s=engine?.active(),node=$('practiceClock');if(!s||!node)return;const seconds=s.mode==='learn'?s.responses[s.ids[s.index]].seconds:Math.max(0,(s.deadline-Date.now())/1000);node.textContent=View.time(seconds);$('clockBox')?.classList.toggle('urgent',s.mode!=='learn'&&seconds<300);}
function filteredBank(){const f=ui.filters;return BANK.filter(q=>{
  if(q.reserve)return false;const p=engine.p(q.id);
  return (f.topic==='All'||q.topic===f.topic)&&(f.difficulty==='All'||q.difficulty===f.difficulty)&&(f.kind==='All'||q.kind===f.kind)&&(f.type==='All'||q.type===f.type)&&(f.part==='All'||q.part===f.part)&&(f.skill==='All'||q.skills.includes(f.skill))&&(f.year==='All'||q.source.includes('CAT '+f.year))&&(f.slot==='All'||q.source.includes('Slot '+f.slot))&&(!f.search||q.searchText.includes(f.search.toLowerCase().trim()))&&
    (f.pool==='All'||f.pool==='unseen'&&!engine.seen(q.id)||f.pool==='revision'&&p.needsRevision||f.pool==='wrong'&&p.attempts.at(-1)?.result==='wrong'||f.pool==='slow'&&p.attempts.some(a=>a.seconds>q.targetSeconds*1.5)||f.pool==='uncertain'&&p.attempts.some(a=>['guess','unsure'].includes(a.confidence))||f.pool==='due'&&p.due&&p.due<=Date.now()||f.pool==='bookmarked'&&p.bookmarked||f.pool==='assisted'&&(p.exposedAt||p.attempts.some(a=>a.assisted)));
});}
function refreshResults(){if(page==='bank')$('bankResults').innerHTML=View.bankList();else if(page==='random'){const count=filteredBank().length;$('poolCount').textContent=`${count} questions match these filters. Existing sessions remain saved.`;$('setupCount').max=Math.max(1,count);if(Number($('setupCount').value)>count)$('setupCount').value=Math.max(1,count);$('startSetBtn').disabled=count===0;}}
function dailyPlan(){const pool=BANK.filter(q=>!q.reserve),count=Math.max(1,Math.min(20,Math.floor(engine.data.settings.minutes/3)));const due=pool.filter(q=>engine.p(q.id).due&&engine.p(q.id).due<=Date.now()).sort((a,b)=>engine.p(a.id).due-engine.p(b.id).due);
  const weak=CONCEPTS.map(c=>({topic:c.topic,...engine.stats(pool.filter(q=>q.topic===c.topic).map(q=>q.id))})).sort((a,b)=>b.revision-a.revision||(a.first??101)-(b.first??101))[0];
  const fresh=pool.filter(q=>!engine.seen(q.id)),focus=weak?.revision?fresh.filter(q=>q.topic===weak.topic).slice(0,Math.ceil(count/2)):[];
  const byTopic=CONCEPTS.map(c=>fresh.filter(q=>q.topic===c.topic)),balanced=[];
  while(byTopic.some(bucket=>bucket.length))for(const bucket of byTopic)if(bucket.length)balanced.push(bucket.shift());
  const remaining=[...due.slice(0,Math.ceil(count/2)),...focus,...balanced,...pool.filter(q=>engine.p(q.id).needsRevision),...pool];const ids=[...new Set(remaining.map(q=>q.id))].slice(0,count);
  return {ids,reason:due.length?`${Math.min(due.length,Math.ceil(count/2))} due reviews, followed by fresh practice. Leave a few minutes to explain your mistakes in your own words.`:weak?.revision?`Focus on ${weak.topic}: ${weak.revision} questions need attention. Try new applications, then revisit earlier mistakes when due.`:'Start with independent practice across the basics. Your plan adapts as you record attempts and delayed reviews.'};
}
function start(ids,mode='learn',options={}){accrue();const s=engine.start(ids,mode,options);ui.solutions.clear();ui.navHidden=matchMedia('(max-width:620px)').matches;lastTick=Date.now();saveNow();go('test');return s;}
function jump(index){const s=engine.active();if(!s)return;accrue();const r=s.responses[s.ids[s.index]];if(s.mode!=='learn'&&r.draft!==r.saved){toast('Your draft was not saved. Use Save & next to record it.');r.draft=r.saved;}engine.visit(s,index);if(matchMedia('(max-width:620px)').matches)ui.navHidden=true;renderQuestion();$('questionText')?.scrollIntoView({block:'nearest'});}
function advance(){const s=engine.active();if(s.index<s.ids.length-1)jump(s.index+1);else finishDialog(s);}
function finishDialog(s){const unanswered=Object.values(s.responses).filter(r=>!r.submitted).length,drafts=Object.values(s.responses).filter(r=>r.draft!==r.saved).length,early=s.mode==='exam'&&Date.now()<s.deadline;modal(early?'End this sectional early?':'Finish this session?',`<p>${unanswered} questions have no saved answer.${drafts?` ${drafts} drafts differ from saved responses and will not be scored.`:''}</p>${early?'<p>This report will be labelled as ended early, not a completed full-duration assessment.</p>':''}<p>Your report will preserve the saved answers. Later retries create separate attempts.</p>`,View.button('close-dialog','Keep practising')+View.button('confirm-finish','Finish & save report',`data-session="${View.e(s.id)}"`,'primary'));}
function download(name,value,type='application/json'){const blob=new Blob([typeof value==='string'?value:JSON.stringify(value,null,2)],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),5000);}
function backup(){accrue();saveNow();return {app:'cat-quant-studio',exportedAt:new Date().toISOString(),contentVersion:'2026-10-10.1',data:CatCore.clone(engine.data)};}
function calculatorKey(key){const c=ui.calc;if(key==='AC'){Object.assign(c,{value:'0',left:null,op:null,newEntry:true});}else if(key==='⌫'){c.value=c.value.length>1?c.value.slice(0,-1):'0';}else if(key==='±'){if(c.value!=='0')c.value=c.value.startsWith('-')?c.value.slice(1):'-'+c.value;}else if(['+','−','×','÷','='].includes(key)){const n=Number(c.value);if(c.op&&c.left!==null&&!c.newEntry){const v=c.op==='+'?c.left+n:c.op==='−'?c.left-n:c.op==='×'?c.left*n:n===0?NaN:c.left/n;c.value=Number.isFinite(v)?String(+v.toPrecision(12)):'Error';}c.left=Number(c.value);c.op=key==='='?null:key;c.newEntry=true;}else {if(c.newEntry||c.value==='Error'){c.value=key==='.'?'0.':key;c.newEntry=false;}else if(c.value.length<16&&!(key==='.'&&c.value.includes('.')))c.value=c.value==='0'&&key!=='.'?key:c.value+key;}$('calcDisplay').value=c.value;}
function reflection(id,attempt=''){const q=engine.byId.get(id);modal(`Reflection · ${id}`,View.notebook(q,attempt).replace('<details>','<details open>'),View.button('close-dialog','Close'));}
function readSetup(){ui.setup.mode=$('setupMode')?.value||ui.setup.mode;ui.setup.count=Number($('setupCount')?.value||ui.setup.count);ui.setup.minutes=Number($('setupMinutes')?.value||ui.setup.minutes);ui.setup.shuffle=$('setupShuffle')?.checked??ui.setup.shuffle;ui.setup.balance=$('setupBalance')?.checked??ui.setup.balance;}
async function action(name,el){
  if(storageBlocked&&!['export','reload','export-recovery','close-dialog','import','restore-import'].includes(name)){toast('Saving is paused. Export this tab or reload before continuing.');return;}
  if(!['reload','export','close-dialog','export-recovery'].includes(name)&&checkExpiration())return;
  const s=engine.active(),q=s?engine.byId.get(s.ids[s.index]):null,r=s?s.responses[q.id]:null;
  switch(name){
    case 'menu':document.body.classList.toggle('menu-open');el.setAttribute('aria-expanded',String(document.body.classList.contains('menu-open')));break;
    case 'close-dialog':closeModal();break;
    case 'reload':location.reload();break;
    case 'clear-filters':ui.filters={topic:'All',pool:'All',search:'',difficulty:'All',kind:'All',type:'All',part:'All',skill:'All',year:'All',slot:'All'};ui.bankPage=0;readSetup();render();break;
    case 'bank-prev':ui.bankPage--;refreshResults();break;
    case 'bank-next':ui.bankPage++;refreshResults();break;
    case 'practice-filtered':go('random');break;
    case 'topic-practice':ui.filters={...ui.filters,topic:el.dataset.topic,pool:'All',search:'',difficulty:'All',kind:'All',part:'All',skill:'All',type:'All',year:'All',slot:'All'};go('random');break;
    case 'start-set':{readSetup();const pool=filteredBank();let selected;if(ui.setup.shuffle)selected=engine.sample(pool,ui.setup.count,ui.setup.balance);else{if(!Number.isInteger(ui.setup.count)||ui.setup.count<1||ui.setup.count>pool.length)throw Error(`Choose between 1 and ${pool.length} questions.`);selected=pool.slice(0,ui.setup.count);}start(selected.map(q=>q.id),ui.setup.mode,{duration:ui.setup.minutes*60,title:ui.filters.topic==='All'?'Mixed QA practice':ui.filters.topic,mixed:ui.filters.topic==='All'});break;}
    case 'single':{closeModal();const question=engine.byId.get(el.dataset.id);if(!question)throw Error('Question unavailable.');if(question.reserve&&!engine.seen(question.id))throw Error('Start its reserved sectional first.');start([question.id],'learn',{title:`Review ${question.id} · ${question.topic}`});break;}
    case 'daily':{const plan=dailyPlan();start(plan.ids,'learn',{title:`Daily practice · ${new Date().toLocaleDateString()}`,mixed:true});break;}
    case 'diagnostic':{const pool=BANK.filter(q=>!q.reserve&&q.kind==='handout');const ids=CONCEPTS.map(c=>{const candidates=pool.filter(q=>q.topic===c.topic);return (candidates.find(q=>!engine.seen(q.id))||candidates[0]).id;});modal('Start a 10-minute PYQ diagnostic?',`<p>5 handout PYQs, one from each Arithmetic 1 topic. Feedback appears after completion. The timer keeps running if you leave.</p><p>This is an initial screening exercise, not a CAT score or mastery assessment.</p>`,View.button('close-dialog','Cancel')+View.button('start-diagnostic','Begin diagnostic','','primary'));ui.diagnosticIds=ids;break;}
    case 'start-diagnostic':closeModal();start(ui.diagnosticIds,'diagnostic',{title:'Arithmetic 1 PYQ diagnostic',duration:600,mixed:true});break;
    case 'resume':{const session=engine.data.sessions.find(x=>x.id===(el.dataset.session||engine.data.activeId)&&!x.finishedAt);if(!session){go('sessions');break;}if(engine.liveExam()&&engine.liveExam().id!==session.id)throw Error('Finish your running sectional first.');accrue();engine.data.activeId=session.id;engine.touch();go('test');break;}
    case 'previous':jump(s.index-1);break;
    case 'jump':closeModal();jump(Number(el.dataset.index));break;
    case 'next':advance();break;
    case 'submit':accrue();engine.save(s);renderQuestion(true);document.querySelector('.feedback')?.scrollIntoView({block:'nearest'});break;
    case 'save-next':case 'mark-next':accrue();engine.save(s,name==='mark-next');saveNow();if(s.index===s.ids.length-1){renderQuestion();toast('Answer saved. Review your palette or finish the session.');}else advance();break;
    case 'clear':accrue();engine.clear(s);renderQuestion();break;
    case 'hint':accrue();engine.assist(s,'hint');renderQuestion(true);document.querySelector('.hint:last-of-type')?.scrollIntoView({block:'nearest'});break;
    case 'reveal':accrue();if(r.revealed)r.revealed=false;else engine.assist(s,'solution');engine.touch();renderQuestion(true);document.querySelector('.solution')?.scrollIntoView({block:'nearest'});break;
    case 'coach':engine.assist(s,'hint');renderQuestion(true);modal('Approach coach',`<p>${View.e(q.hints[Math.max(0,r.hints-1)])}</p><p><strong>Explain to yourself:</strong> What quantity is fixed? Which base, rate or domain does the question use?</p><p class="caption">This is an authored guide tied to this question. Help used before submission marks the attempt as assisted.</p>`);break;
    case 'pause':if(s.mode!=='learn')break;accrue();s.paused=!s.paused;engine.touch();renderQuestion();break;
    case 'bookmark':{const p=engine.p(el.dataset.id);p.bookmarked=!p.bookmarked;p.updatedAt=Date.now();engine.touch();page==='test'?renderQuestion(true):render();break;}
    case 'toggle-navigator':ui.navHidden=!ui.navHidden;$('workspace').classList.toggle('nav-hidden',ui.navHidden);$('toggleNavigatorBtn').setAttribute('aria-expanded',String(!ui.navHidden));if(ui.navHidden)$('toggleNavigatorBtn').focus();break;
    case 'paper':modal('Question overview',`<p>Jumping to a question does not save the current draft.</p><div class="question-paper">${s.ids.map((id,i)=>View.button('jump',`<strong>${i+1}.</strong> ${View.e(engine.byId.get(id).question.replace(/\s*\(CAT \d{4}, Slot \d\)/g,''))}`,`data-index="${i}"`)).join('')}</div>`);break;
    case 'calculator':modal('Basic calculator',`<input id="calcDisplay" class="calc-display" aria-label="Calculator display" value="${View.e(ui.calc.value)}" readonly><div class="calc-keys">${['AC','±','⌫','÷','7','8','9','×','4','5','6','−','1','2','3','+','0','.','='].map(k=>View.button('calc-key',k,`data-key="${k}"`)).join('')}</div>`);break;
    case 'calc-key':calculatorKey(el.dataset.key);break;
    case 'key':{const k=el.dataset.key,old=String(r.draft??'');const value=k==='⌫'?old.slice(0,-1):k==='−'?(old.startsWith('-')?old.slice(1):'-'+old):old+k;engine.draft(s,value);$('textAnswer').value=value;break;}
    case 'leave-test':if(s.mode==='exam')finishDialog(s);else go('dashboard');break;
    case 'finish':finishDialog(s);break;
    case 'finish-session':{const x=engine.data.sessions.find(x=>x.id===el.dataset.session&&!x.finishedAt);if(x)finishDialog(x);break;}
    case 'confirm-finish':{accrue();const x=engine.data.sessions.find(x=>x.id===el.dataset.session);const report=engine.finish(x);closeModal();saveNow();go(`results/${report.id}`);break;}
    case 'preview-solution':case 'report-solution':{const id=el.dataset.id,question=engine.byId.get(id);engine.expose(id);ui.solutions.add(id);const node=name==='preview-solution'?$('previewSolution'):$(`solution-${id}`);node.innerHTML=View.solution(question);node.scrollIntoView({block:'nearest'});break;}
    case 'similar':{const original=engine.byId.get(el.dataset.id);const candidates=BANK.filter(x=>x.id!==original.id&&!x.reserve&&x.topic===original.topic);candidates.sort((a,b)=>Number(engine.seen(a.id))-Number(engine.seen(b.id))||Number(!a.skills.some(x=>original.skills.includes(x)))-Number(!b.skills.some(x=>original.skills.includes(x))));if(candidates.length)start([candidates[0].id],'learn',{title:`Transfer practice · ${original.topic}`});else toast('No related question is available.');break;}
    case 'save-note':{engine.annotate(el.dataset.id,el.dataset.attempt,$('noteError').value,$('personalNote').value);toast('Reflection saved.');break;}
    case 'reflect':reflection(el.dataset.id,el.dataset.attempt);break;
    case 'revision-tab':ui.revisionTab=el.dataset.tab;render();break;
    case 'revise-list':{const ids=BANK.filter(q=>(!q.reserve||engine.seen(q.id))&&(ui.revisionTab==='due'?engine.p(q.id).due&&engine.p(q.id).due<=Date.now():ui.revisionTab==='needs'?engine.p(q.id).needsRevision:ui.revisionTab==='notes'?engine.p(q.id).notes:engine.p(q.id).bookmarked)).map(q=>q.id);start(ids,'learn',{title:'Revision · '+ui.revisionTab,mixed:true});break;}
    case 'retry-report':{const report=engine.data.reports.find(x=>x.id===el.dataset.report);start(report.rows.filter(x=>x.result==='wrong').map(x=>x.id),'learn',{title:'Review mistakes · '+report.title,mixed:true});break;}
    case 'exam-instructions':{const preset='arithmetic',accommodation=$('examAccommodation').checked;let qs;if(preset==='arithmetic'){qs=[...engine.sample(BANK.filter(q=>q.kind==='handout'&&q.type==='MCQ'),14,true),...engine.sample(BANK.filter(q=>q.kind==='handout'&&q.type==='TITA'),8,true)];qs=engine.sample(qs,22);}else qs=BANK.filter(q=>q.reserve===preset);ui.examIds=qs.map(q=>q.id);ui.examPreset=preset;ui.examDuration=accommodation?3200:2400;engine.data.settings.accommodation=accommodation;engine.touch();modal('Before you begin',`<p><strong>${qs.length} questions · ${View.time(ui.examDuration)} · +3 / −1 MCQ; +3 / 0 TITA</strong></p><p>The timer starts on Begin and continues across tab changes and reloads. Use Save & next or Mark for review & next to save answers. A direct palette jump discards an unsaved change. Answers saved and marked for review are scored.</p><p>No hints, personal notes or worked solutions are available until the test ends. Use paper for rough work. You can change saved answers before completion.</p><p>${qs.filter(q=>engine.seen(q.id)).length} questions in this set have been seen before. ${preset==='arithmetic'?'This is an Arithmetic 1 module test.':'This is an Arithmetic 1 PYQ module test.'}</p>`,View.button('close-dialog','Not yet')+View.button('begin-exam','Begin sectional','','primary'));break;}
    case 'begin-exam':closeModal();start(ui.examIds,'exam',{title:'Arithmetic 1 PYQ module test',duration:ui.examDuration,preset:ui.examPreset,mixed:true});break;
    case 'export':download('cat-quant-progress.json',backup());toast('Backup download prepared.');break;
    case 'export-recovery':download('cat-quant-original-recovery.json',recoveryRaw);break;
    case 'file-backup':{const data=backup();if(!window.showSaveFilePicker){download('cat-quant-progress.json',data);toast('Downloaded a backup; this browser does not support linked file saving.');break;}try{const handle=await showSaveFilePicker({suggestedName:'cat-quant-progress.json',types:[{description:'Progress backup',accept:{'application/json':['.json']}}]});const stream=await handle.createWritable();await stream.write(JSON.stringify(data,null,2));await stream.close();toast('Backup file saved.');}catch(error){if(error.name!=='AbortError')throw error;}break;}
    case 'import':if(engine.liveExam())throw Error('Finish the active sectional before importing progress.');$('importFile').value='';$('importFile').click();break;
    case 'merge-import':case 'restore-import':{if(!pendingImport)break;if(engine.liveExam())throw Error('Finish the active sectional before importing.');const data=name==='merge-import'?CatCore.merge(engine.data,pendingImport):pendingImport;const valid=CatCore.validate(data,BANK);try{const raw=localStorage.getItem(STORAGE_KEY);if(raw){localStorage.setItem('cat_quant_before_import',raw);storedRevision=(JSON.parse(raw).data||JSON.parse(raw)).revision||0;}}catch(error){throw Error('Could not save a recovery copy. Export your current progress before retrying the import.');}engine=new CatCore.Engine(BANK,valid);engine.touch();persistedRevision=-1;storageBlocked=false;recoveryRaw=null;pendingImport=null;closeModal();$('storageWarning').hidden=true;saveNow();document.documentElement.style.setProperty('--question-size',`${valid.settings.font}px`);engine.checkDeadlines();go(engine.liveExam()?'test':'dashboard');toast('Progress imported. A pre-import recovery copy is stored in this browser.');break;}
    case 'export-report':{download('cat-quant-session-report.json',engine.data.reports.find(x=>x.id===el.dataset.report));break;}
    case 'reset':modal('Reset local progress?',`<p>This removes local attempts, notes and session reports. The question content remains available. Export a full backup before resetting.</p>`,View.button('export','Export backup')+View.button('close-dialog','Cancel')+View.button('confirm-reset','Reset local progress','','danger'));break;
    case 'confirm-reset':{if(engine.liveExam())throw Error('Finish the active sectional before resetting.');engine=new CatCore.Engine(BANK);engine.data.revision=storedRevision+1;engine.touch();ui.solutions.clear();closeModal();saveNow();go('dashboard');toast('Local progress reset.');break;}
    case 'report-issue':{modal(`Report an issue · ${el.dataset.id}`,`${View.select('issueCategory','Issue type',['Question wording','Answer key','Worked solution','Formatting','Other'],'Question wording')}<label class="field" style="margin-top:12px">What seems wrong?<textarea id="issueText" maxlength="3000" placeholder="Describe the issue and your reasoning."></textarea></label><p class="caption">Saved locally. Export the issue list from Settings to share it.</p>`,View.button('close-dialog','Cancel')+View.button('save-issue','Save issue',`data-id="${View.e(el.dataset.id)}"`,'primary'));break;}
    case 'save-issue':{const text=$('issueText').value.trim();if(!text)throw Error('Describe the issue before saving.');engine.data.issues.push({id:CatCore.uid(),questionId:el.dataset.id,category:$('issueCategory').value,text,at:Date.now(),resolved:false});engine.touch();closeModal();toast('Issue saved to your local content notebook.');break;}
    case 'export-issues':download('cat-quant-content-issues.json',{exportedAt:new Date().toISOString(),issues:engine.data.issues});break;
    case 'resolve-issue':{const issue=engine.data.issues.find(x=>x.id===el.dataset.issue);issue.resolved=!issue.resolved;engine.touch();render();break;}
  }
  queueSave();
}
document.addEventListener('click',event=>{const el=event.target.closest('[data-action]');if(!el||el.disabled)return;event.preventDefault();Promise.resolve(action(el.dataset.action,el)).catch(error=>toast(error.message||'Something went wrong. Your saved progress is preserved.'));});
document.querySelector('.skip-link').addEventListener('click',event=>{event.preventDefault();$('main').focus();});
let searchTimer;
document.addEventListener('input',event=>{
  const el=event.target;if(el.dataset.filter){ui.filters[el.dataset.filter]=el.value;ui.bankPage=0;clearTimeout(searchTimer);searchTimer=setTimeout(refreshResults,120);return;}
  if(storageBlocked)return;
  if(el.id==='personalNote'){const save=el.closest('details').querySelector('[data-action=save-note]');engine.annotate(save.dataset.id,save.dataset.attempt,$('noteError').value,el.value);queueSave();return;}
  const s=engine.active();if(page==='test'&&s){if(checkExpiration())return;if(el.id==='textAnswer')engine.draft(s,el.value);if(el.id==='scratchpad'){s.responses[s.ids[s.index]].note=el.value;engine.touch();}queueSave();}
  if(el.id==='questionFont')document.documentElement.style.setProperty('--question-size',`${el.value}px`);
});
document.addEventListener('change',event=>{const el=event.target;
  if(el.id==='noteError'&&!storageBlocked){const save=el.closest('details').querySelector('[data-action=save-note]');engine.annotate(save.dataset.id,save.dataset.attempt,el.value,$('personalNote').value);queueSave();return;}
  if(el.dataset.filter){ui.filters[el.dataset.filter]=el.value;ui.bankPage=0;if(el.dataset.filter==='topic'){ui.filters.skill='All';const skill=$('filterSkill');if(skill)skill.innerHTML=['All',...new Set(BANK.filter(q=>ui.filters.topic==='All'||q.topic===ui.filters.topic).flatMap(q=>q.skills))].map(x=>`<option>${View.e(x)}</option>`).join('');}refreshResults();return;}
  if(el.id==='setupMode'){ui.setup.mode=el.value;$('setupMinutes').disabled=el.value==='learn';return;}if(storageBlocked)return;const s=engine.active();if(s&&page==='test'){if(checkExpiration())return;if(el.name==='answer')engine.draft(s,Number(el.value));if(el.id==='confidence'){s.responses[s.ids[s.index]].confidence=el.value;engine.touch();}queueSave();}
});
document.addEventListener('toggle',event=>{if(event.target.classList?.contains('filter-extra'))ui.extraFilters=event.target.open;if(event.target.classList?.contains('scratch'))ui.scratchOpen=event.target.open;},true);
document.addEventListener('submit',event=>{if(event.target.id!=='settingsForm')return;event.preventDefault();try{const intervals=$('reviewIntervals').value.split(',').map(x=>Number(x.trim())),minutes=Number($('dailyMinutes').value),font=Number($('questionFont').value);if(intervals.length!==4||intervals.some((x,i)=>!Number.isInteger(x)||x<1||x>365||i>0&&x<=intervals[i-1]))throw Error('Enter four increasing whole-day intervals, from 1 to 365.');engine.data.settings={...engine.data.settings,minutes,font,intervals};engine.touch();saveNow();toast('Study preferences saved. Existing review dates stay unchanged; future reviews use the new intervals.');}catch(error){toast(error.message);}});
$('importFile').addEventListener('change',async event=>{const file=event.target.files[0];if(!file)return;try{if(file.size>20*1024*1024)throw Error('This backup exceeds the 20 MB import limit.');pendingImport=CatCore.validate(JSON.parse(await file.text()),BANK);const attempts=Object.values(pendingImport.progress).reduce((n,p)=>n+p.attempts.length,0);modal('Review your progress import',`<p>This backup contains ${attempts} attempts, ${pendingImport.sessions.length} sessions and ${pendingImport.reports.length} reports.</p><p>Merge keeps local settings and combines histories. Restore replaces this browser’s progress and settings. A recovery copy is saved before either action.</p>`,View.button('close-dialog','Cancel')+(!storageBlocked?View.button('merge-import','Merge histories','','primary'):'')+View.button('restore-import','Restore backup'));}catch(error){pendingImport=null;toast('Import rejected: '+error.message);}});
document.addEventListener('keydown',event=>{if(event.key==='Escape'){document.body.classList.remove('menu-open');document.querySelector('.mobile-menu').setAttribute('aria-expanded','false');}if($('appDialog').open&&$('calcDisplay')){const keyMap={'Enter':'=','Backspace':'?','Delete':'AC','*':'?','/':'?','-':'?'};const key=keyMap[event.key]??event.key;if(/^[0-9.+]$/.test(key)||['=','?','AC','?','?','?'].includes(key)){event.preventDefault();calculatorKey(key);}return;}if($('appDialog').open||event.target.closest('input,textarea,select,button,a')||page!=='test')return;if(event.key==='ArrowRight'){event.preventDefault();const s=engine.active();if(s&&s.index<s.ids.length-1)jump(s.index+1);}if(event.key==='ArrowLeft'){event.preventDefault();const s=engine.active();if(s&&s.index>0)jump(s.index-1);}if(event.key.toLowerCase()==='p'&&engine.active()?.mode==='learn')action('pause',document.body);});
window.addEventListener('hashchange',route);
window.addEventListener('pagehide',()=>{accrue();saveNow();});
document.addEventListener('visibilitychange',()=>{accrue();checkExpiration();saveNow();});
window.addEventListener('storage',event=>{if(event.key===STORAGE_KEY&&event.newValue){try{const incoming=JSON.parse(event.newValue);if(incoming.writer!==writer)conflict();}catch{conflict();}}});
setInterval(()=>{if(!engine||storageBlocked)return;accrue();if(checkExpiration())return;updateClock();},1000);
setInterval(()=>{if(engine)saveNow();},5000);
init();

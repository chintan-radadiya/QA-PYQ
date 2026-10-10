/* Pure practice engine. No DOM, network, or storage dependencies. */
(function (root) {
  'use strict';
  const VERSION = 3, DAY = 86400000;
  const clone = value => JSON.parse(JSON.stringify(value));
  const uid = () => globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  const numeric = value => {
    const s = String(value ?? '').trim();
    if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:\s*\/\s*[+-]?(?:\d+(?:\.\d*)?|\.\d+))?$/.test(s)) return null;
    const [a, b = 1] = s.split('/').map(Number), n = a / b;
    return Number.isFinite(n) ? n : null;
  };
  function grade(q, response) {
    if (response === null || response === undefined || response === '') return 'unanswered';
    if (q.answer === null || q.answer === undefined) return 'ungraded';
    if (q.type === 'MCQ') return response === q.answer ? 'correct' : 'wrong';
    const a = numeric(response), b = numeric(q.answer);
    return a !== null && b !== null && Math.abs(a - b) < 1e-8 ? 'correct' : 'wrong';
  }
  function blank() {
    return { version: VERSION, revision: 0, progress: {}, sessions: [], reports: [], activeId: null,
      settings: { minutes: 25, font: 17, intervals: [1, 3, 7, 14], accommodation: false }, issues: [], updatedAt: 0 };
  }
  function progress() { return { attempts: [], bookmarked: false, notes: '', error: '', exposedAt: null, seenAt: null,
    needsRevision: false, due: null, stage: 0, lastPassAt: null, updatedAt: 0 }; }
  function responseState() { return { draft: null, saved: null, submitted: false, assisted: false, hints: 0, revealed: false,
    confidence: 'sure', seconds: 0, visits: 0, visited: false, flagged: false, note: '', error: '', recorded: false, priorSeen: false }; }
  class Engine {
    constructor(questions, data = blank(), now = () => Date.now()) {
      this.questions = questions; this.byId = new Map(questions.map(q => [String(q.id), q])); this.data = data; this.now = now;
    }
    p(id) { return this.data.progress[id] ||= progress(); }
    touch() { this.data.updatedAt = this.now(); this.data.revision++; }
    active() { return this.data.sessions.find(s => s.id === this.data.activeId && !s.finishedAt) || null; }
    liveExam() { return this.data.sessions.find(s => s.mode === 'exam' && !s.finishedAt) || null; }
    seen(id) { const p = this.p(id); return !!(p.seenAt || p.exposedAt || p.attempts.length); }
    start(ids, mode = 'learn', options = {}) {
      if (this.liveExam()) throw Error('Finish your running sectional before starting another session.');
      if (!['learn', 'timed', 'exam', 'diagnostic'].includes(mode)) throw Error('Unknown practice mode.');
      ids = [...new Set(ids.map(String))];
      if (!ids.length || ids.some(id => !this.byId.has(id))) throw Error('Choose at least one available question.');
      const duration = Number(options.duration || (mode === 'exam' ? 2400 : 1200));
      if (mode !== 'learn' && (!Number.isFinite(duration) || duration < 60 || duration > 14400)) throw Error('Choose a duration between 1 and 240 minutes.');
      const now = this.now();
      const s = { id: uid(), title: String(options.title || 'Practice session').slice(0, 160), mode, ids, index: 0,
        createdAt: now, deadline: mode === 'learn' ? null : now + duration * 1000, duration: mode === 'learn' ? null : duration,
        responses: {}, order: [], paused: false, finishedAt: null, mixed: !!options.mixed, preset: options.preset || null };
      for (const id of ids) s.responses[id] = { ...responseState(), confidence: mode==='exam'?'unknown':'sure', priorSeen: this.seen(id) };
      this.data.sessions.push(s); this.data.activeId = s.id; this.visit(s, 0); this.touch(); return s;
    }
    visit(s, index) {
      if (s.finishedAt || !Number.isInteger(index) || index < 0 || index >= s.ids.length) return;
      s.index = index; const id = s.ids[index], r = s.responses[id];
      if(!r.visited && this.seen(id))r.priorSeen=true;
      r.visited = true; r.visits++;
      this.p(id).seenAt ||= this.now();
      s.order.push({ id, at: this.now(), elapsed: r.seconds }); this.touch();
    }
    draft(s, value) {
      if (s.finishedAt || this.expired(s)) return false;
      const q = this.byId.get(s.ids[s.index]), r = s.responses[q.id];
      if (s.mode === 'learn' && r.submitted) return false;
      if (q.type === 'MCQ' && value !== null && (!Number.isInteger(value) || value < 0 || value >= q.options.length)) return false;
      r.draft = value === null ? null : q.type === 'MCQ' ? value : String(value).slice(0, 80); this.touch(); return true;
    }
    save(s, flag = false) {
      if (s.finishedAt || this.expired(s)) return false;
      const id = s.ids[s.index], q = this.byId.get(id), r = s.responses[id];
      if (s.mode === 'learn' && r.submitted) return false;
      let value = r.draft;
      if (q.type !== 'MCQ' && value !== null && String(value).trim()) {
        if (numeric(value) === null) throw Error('Enter a number' + (s.mode === 'exam' ? ' using the keypad.' : ' or a fraction, without units or commas.'));
        if (s.mode === 'exam' && String(value).includes('/')) throw Error('Use a numeric answer in exam mode; fractions are available in learning practice.');
        value = String(value).trim();
      }
      if (value === '') value = null;
      if (s.mode === 'learn' && value === null) throw Error('Select an option or enter an answer before submitting.');
      r.saved = value; r.submitted = value !== null; r.flagged = flag;
      if (s.mode === 'learn') this.record(s, id);
      this.touch(); return true;
    }
    clear(s) {
      if (s.finishedAt || this.expired(s)) return;
      const r = s.responses[s.ids[s.index]];
      if (s.mode === 'learn' && r.submitted) {
        s.responses[s.ids[s.index]] = { ...responseState(), priorSeen: true, visited: true, visits: 1 };
      } else if(s.mode==='learn') { r.draft = null; r.saved = null; r.submitted = false; }
      else { r.draft=null; }
      this.touch();
    }
    assist(s, kind) {
      if (s.mode !== 'learn' || s.finishedAt) return;
      const id = s.ids[s.index], r = s.responses[id], p = this.p(id);
      p.exposedAt ||= this.now();
      if (!r.submitted) { r.assisted = true; p.needsRevision = true; p.due ||= this.now() + DAY; }
      if (kind === 'hint') r.hints = Math.min(3, r.hints + 1); else r.revealed = true;
      p.updatedAt = this.now(); this.touch();
    }
    expose(id) { const p = this.p(id); p.exposedAt ||= this.now(); p.updatedAt = this.now(); this.touch(); }
    addTime(s, seconds) {
      if (!s || s.finishedAt || (s.mode === 'learn' && s.paused)) return;
      const r = s.responses[s.ids[s.index]];
      if (s.mode === 'learn' && (r.submitted || r.revealed)) return;
      r.seconds += Math.max(0, Math.min(seconds, 60)); this.touch();
    }
    expired(s) { return !!s.deadline && this.now() >= s.deadline; }
    record(s, id) {
      const r = s.responses[id]; if (r.recorded || !r.submitted) return;
      const q = this.byId.get(id), p = this.p(id), now = this.now(), result = grade(q, r.saved);
      const attempt = { id: uid(), sessionId: s.id, at: now, response: r.saved, seconds: r.seconds, result,
        assisted: r.assisted, priorSeen: r.priorSeen, confidence: r.confidence, mode: s.mode,
        delayed: !!p.due && now >= p.due, error: r.error, note: r.note, hints: r.hints };
      p.attempts.push(attempt); r.recorded = true; r.attemptId = attempt.id;
      const reliable = result === 'correct' && !r.assisted && r.confidence === 'sure' && r.seconds <= q.targetSeconds * 1.5;
      if (!reliable) { p.needsRevision = true; p.stage = 0; p.due = now + this.data.settings.intervals[0] * DAY; }
      else if (!p.due || now >= p.due) {
        p.needsRevision = false; p.lastPassAt = now;
        p.stage = Math.min(p.stage + 1, this.data.settings.intervals.length);
        p.due = now + this.data.settings.intervals[Math.min(p.stage - 1, this.data.settings.intervals.length - 1)] * DAY;
      }
      p.updatedAt = now; this.touch();
    }
    finish(s, automatic = false) {
      if (s.finishedAt) return this.data.reports.find(x => x.id === s.id);
      for (const id of s.ids) {
        this.record(s, id);
        if(s.responses[id].flagged&&!s.responses[id].submitted){const p=this.p(id);p.needsRevision=true;p.due ||= this.now()+DAY;p.updatedAt=this.now();}
      }
      s.finishedAt = automatic && s.deadline ? Math.min(this.now(), s.deadline) : this.now();
      const report = clone(s); delete report.responses; report.automatic = automatic;
      report.earlyExit = s.mode==='exam' && !automatic && this.now()<s.deadline;
      report.rows = s.ids.map(id => { const r = s.responses[id], q = this.byId.get(id); return {
        id, ...clone(r), result: grade(q, r.saved), points: grade(q, r.saved) === 'correct' ? 3 : grade(q, r.saved) === 'wrong' && q.type === 'MCQ' ? -1 : 0
      }; });
      report.score = report.rows.reduce((a, r) => a + r.points, 0);
      this.data.reports.push(report); if (this.data.activeId === s.id) this.data.activeId = null;
      this.touch(); return report;
    }
    checkDeadlines() { const out = []; for (const s of this.data.sessions) if (!s.finishedAt && this.expired(s)) out.push(this.finish(s, true)); return out; }
    annotate(id, attemptId, error, note) {
      const p = this.p(id); p.error = error; p.notes = String(note).slice(0, 6000); p.updatedAt = this.now();
      const a = p.attempts.find(x => x.id === attemptId); if (a) { a.error = error; a.note = p.notes; }
      this.touch();
    }
    stats(ids = this.questions.map(q => q.id)) {
      const all = ids.flatMap(id => this.p(id).attempts);
      const first = ids.map(id => this.p(id).attempts[0]).filter(Boolean).filter(a => !a.assisted && !a.priorSeen);
      const delayed = all.filter(a => a.delayed && !a.assisted);
      const retries = ids.flatMap(id => this.p(id).attempts.slice(1));
      const accuracy = xs => xs.length ? Math.round(100 * xs.filter(a => a.result === 'correct').length / xs.length) : null;
      return { answered: ids.filter(id => this.p(id).attempts.length).length, first: accuracy(first), firstN: first.length,
        retry: accuracy(retries), retryN: retries.length, delayed: accuracy(delayed), delayedN: delayed.length,
        due: ids.filter(id => this.p(id).due && this.p(id).due <= this.now()).length,
        revision: ids.filter(id => this.p(id).needsRevision).length, assisted: all.filter(a => a.assisted).length,
        total: all.length, seconds: all.reduce((n, a) => n + a.seconds, 0) };
    }
    sample(pool, count, balanced = false, random = Math.random) {
      const shuffle = xs => { xs = [...xs]; for (let i = xs.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [xs[i], xs[j]] = [xs[j], xs[i]]; } return xs; };
      if (!Number.isInteger(count) || count < 1 || count > pool.length) throw Error(`Choose between 1 and ${pool.length} questions.`);
      if (!balanced) return shuffle(pool).slice(0, count);
      const groups = new Map(); for (const q of shuffle(pool)) { const k = q.topic; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(q); }
      const selected = [], buckets = [...groups.values()];
      while (selected.length < count) for (const bucket of buckets) if (bucket.length && selected.length < count) selected.push(bucket.pop());
      return shuffle(selected);
    }
  }
  function migrateLegacy(old, questions) {
    const data = blank(), byNumber = new Map(questions.map(q => [q.number, q]));
    const rows = old.progress || Object.entries(old.state || {}).map(([number, s]) => ({ number: Number(number), ...s }));
    for (const row of rows) {
      const q = byNumber.get(row.number); if (!q) continue;
      const p = progress(); p.bookmarked = !!row.bookmarked; p.seenAt = row.visited ? 1 : null;
      p.exposedAt = row.revealed || row.answer_revealed ? 1 : null;
      p.attempts = (row.history || []).map((a, i) => ({ id: `legacy-${q.id}-${i}`, sessionId: 'legacy', at: Date.parse(a.at) || 1,
        response: q.type === 'MCQ' ? a.response : a.text, result: a.result, seconds: Number(a.seconds) || 0,
        assisted: !!a.revealed, priorSeen: true, confidence: 'unknown', mode: 'legacy', delayed: false, error: '', note: '' }));
      const value = q.type === 'MCQ' ? (row.response?.option ? row.response.option.charCodeAt(0) - 65 : row.response) : row.text || row.response;
      if ((row.submitted || ['correct', 'wrong'].includes(row.result)) && !p.attempts.length) p.attempts.push({ id: `legacy-${q.id}-current`, at: 1,
        sessionId: 'legacy', response: value, result: grade(q, value), seconds: row.seconds || row.time_seconds || 0, assisted: !!p.exposedAt,
        priorSeen: true, confidence: 'unknown', mode: 'legacy', delayed: false, error: '', note: '' });
      p.needsRevision = !!p.exposedAt || p.attempts.at(-1)?.result === 'wrong'; p.due = p.needsRevision ? 1 : null;
      data.progress[q.id] = p;
    }
    if (old.state) {
      const ids = (old.practiceIds || [old.currentId || 1]).map(n => byNumber.get(n)?.id).filter(Boolean);
      if (ids.length) {
        const e = new Engine(questions, data); const s = e.start(ids, 'learn', { title: 'Restored Arithmetic 1 practice' });
        for (const id of ids) { const q = e.byId.get(id), v = old.state[q.number]; if (!v) continue;
          Object.assign(s.responses[id], { draft: q.type === 'MCQ' ? v.response : v.text || null,
            saved: v.submitted ? q.type === 'MCQ' ? v.response : v.text : null, submitted: !!v.submitted,
            recorded: !!v.submitted, visited: !!v.visited, seconds: Number(v.seconds) || 0, assisted: !!v.revealed, revealed: !!v.revealed, priorSeen: true });
        }
        s.index = Math.max(0, ids.indexOf(byNumber.get(old.currentId)?.id)); s.paused = !!old.paused;
      }
    }
    return data;
  }
  function removeRetiredQuestions(data) {
    const retired = id => /^(?:O[1-4]-(?:[1-9]|1\d|2[0-2])|A(?:[1-9]|1\d|2[0-4])|F(?:[1-9]|1[0-3]))$/.test(id);
    data = clone(data);
    for (const id of Object.keys(data.progress)) if (retired(id)) delete data.progress[id];
    const removedSessions = new Set();
    for (const s of data.sessions) {
      if (!Array.isArray(s.ids)) continue;
      const current = s.ids[s.index], oldLength = s.ids.length;
      s.ids = s.ids.filter(id => !retired(id));
      if (!s.ids.length) { removedSessions.add(s.id); continue; }
      if (s.ids.length === oldLength) continue;
      s.index = Math.max(0, s.ids.indexOf(current));
      for (const id of Object.keys(s.responses || {})) if (retired(id)) delete s.responses[id];
      if (Array.isArray(s.order)) s.order = s.order.filter(x => !retired(x.id));
      s.title = `${s.title.slice(0, 120)} (PYQs retained)`;
    }
    data.sessions = data.sessions.filter(s => !removedSessions.has(s.id));
    data.reports = data.reports.filter(r => !removedSessions.has(r.id));
    for (const r of data.reports) {
      if (!Array.isArray(r.ids) || !r.ids.some(retired)) continue;
      r.ids = r.ids.filter(id => !retired(id));
      if (Array.isArray(r.rows)) { r.rows = r.rows.filter(x => !retired(x.id)); r.score = r.rows.reduce((sum, x) => sum + x.points, 0); }
      if (Array.isArray(r.order)) r.order = r.order.filter(x => !retired(x.id));
      if (r.responses) for (const id of Object.keys(r.responses)) if (retired(id)) delete r.responses[id];
      r.title = `${r.title.slice(0, 120)} (PYQs retained)`;
    }
    if (removedSessions.has(data.activeId)) data.activeId = null;
    if (Array.isArray(data.issues)) data.issues = data.issues.filter(x => !retired(x.questionId));
    return data;
  }
  function validate(input, questions) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw Error('This file is not a progress backup.');
    let data = input.data || input;
    if (!data.version && (data.state || Array.isArray(data.progress))) data = migrateLegacy(data, questions);
    if (data.version !== VERSION || !data.progress || !Array.isArray(data.sessions) || !Array.isArray(data.reports)) throw Error('Unsupported or incomplete progress backup.');
    data = removeRetiredQuestions(data);
    const known = new Map(questions.map(q => [q.id, q]));
    const isNum = x => typeof x === 'number' && Number.isFinite(x) && x >= 0;
    const isText = (x, max = 6000) => typeof x === 'string' && x.length <= max;
    if (!data.settings || !Array.isArray(data.settings.intervals) || data.settings.intervals.length !== 4 || data.settings.intervals.some((x,i) => !Number.isInteger(x) || x < 1 || x > 365 || i > 0 && x <= data.settings.intervals[i-1])) throw Error('Invalid review schedule.');
    if (!Number.isInteger(data.settings.font) || data.settings.font < 14 || data.settings.font > 24 || !isNum(data.settings.minutes) || data.settings.minutes < 5 || data.settings.minutes > 180) throw Error('Invalid study settings.');
    for (const [id, p] of Object.entries(data.progress)) {
      if (!known.has(id)) throw Error(`Unknown question ${id}; use the same application content version.`);
      if (!Array.isArray(p.attempts) || !isText(p.notes) || !isText(p.error, 100) || !isNum(p.stage) || (p.due !== null && !isNum(p.due))) throw Error('Invalid question progress.');
      const attempts = new Set();
      for (const a of p.attempts) {
        const q=known.get(id), validAnswer=q.type==='MCQ'?Number.isInteger(a.response)&&a.response>=0&&a.response<q.options.length:isText(a.response,80);
        if (!isText(a.id,120) || attempts.has(a.id) || !validAnswer || !isNum(a.at) || !isNum(a.seconds) || !['correct', 'wrong', 'ungraded'].includes(a.result) || !isText(a.note || '') || !isText(a.error || '',100)) throw Error('Invalid attempt history.');
        attempts.add(a.id);
      }
    }
    const ids = new Set();
    for (const s of data.sessions) {
      if (!isText(s.id, 120) || ids.has(s.id) || !isText(s.title, 160) || !['learn', 'timed', 'exam', 'diagnostic'].includes(s.mode)) throw Error('Invalid session.'); ids.add(s.id);
      if (!Array.isArray(s.ids) || !s.ids.length || s.ids.length > questions.length || new Set(s.ids).size !== s.ids.length || s.ids.some(id => !known.has(id)) || !s.responses || !Array.isArray(s.order)) throw Error('Invalid session questions.');
      if (!Number.isInteger(s.index) || s.index < 0 || s.index >= s.ids.length || !isNum(s.createdAt) || (s.finishedAt !== null && !isNum(s.finishedAt)) || (s.deadline !== null && (!isNum(s.deadline) || s.deadline <= s.createdAt)) || (s.mode !== 'learn' && !s.deadline)) throw Error('Invalid session timing.');
      for (const id of s.ids) { const r = s.responses[id], q = known.get(id);
        const validResponse = v => v === null || (q.type === 'MCQ' ? Number.isInteger(v) && v >= 0 && v < q.options.length : isText(v, 80));
        if (!r || !isNum(r.seconds) || !Number.isInteger(r.visits) || r.visits<0 || !Number.isInteger(r.hints) || r.hints<0 || r.hints>3 || !validResponse(r.draft) || !validResponse(r.saved) || !isText(r.note || '') || !['sure','unsure','guess','unknown'].includes(r.confidence)) throw Error('Invalid saved response.');
      }
      if(s.order.some(x=>!s.ids.includes(x.id)||!isNum(x.at)||!isNum(x.elapsed)))throw Error('Invalid visit history.');
    }
    if (data.sessions.filter(s => s.mode === 'exam' && !s.finishedAt).length > 1) throw Error('More than one running exam in this backup.');
    const reportIds=new Set();
    for (const r of data.reports) {
      const session=data.sessions.find(s=>s.id===r.id);
      if (!ids.has(r.id) || reportIds.has(r.id) || !isText(r.title,160) || !Array.isArray(r.ids) || r.ids.join('|')!==session.ids.join('|') || !Array.isArray(r.rows) || r.rows.length !== r.ids.length || !Array.isArray(r.order) || !isNum(r.finishedAt) || !Number.isFinite(r.score) || r.rows.some((x,i) => x.id!==r.ids[i] || !isNum(x.seconds) || !Number.isInteger(x.visits) || x.visits<0 || ![-1,0,3].includes(x.points) || !['correct', 'wrong', 'unanswered', 'ungraded'].includes(x.result))) throw Error('Invalid session report.');
      if(r.order.some(x=>!r.ids.includes(x.id)||!isNum(x.at)||!isNum(x.elapsed)))throw Error('Invalid report visit history.');
      reportIds.add(r.id);
    }
    if(!Array.isArray(data.issues)||data.issues.some(i=>!isText(i.id,120)||!known.has(i.questionId)||!isText(i.category,100)||!isText(i.text,3000)||!isNum(i.at)))throw Error('Invalid issue notebook.');
    if(!isNum(data.revision)||!isNum(data.updatedAt))throw Error('Invalid backup revision.');
    if (data.activeId !== null && !ids.has(data.activeId)) throw Error('Invalid active session.');
    return clone(data);
  }
  function merge(current, incoming) {
    const out = clone(current);
    for (const [id, p] of Object.entries(incoming.progress)) {
      const local = out.progress[id]; if (!local) { out.progress[id] = clone(p); continue; }
      const newest = (p.updatedAt || 0) > (local.updatedAt || 0) ? p : local;
      const attempts = [...new Map([...local.attempts, ...p.attempts].map(a => [a.id, a])).values()].sort((a, b) => a.at - b.at);
      out.progress[id] = { ...clone(newest), attempts, exposedAt: local.exposedAt || p.exposedAt, seenAt: local.seenAt || p.seenAt };
    }
    for (const key of ['sessions', 'reports']) {
      const map = new Map(out[key].map(s => [s.id, s]));
      for (const s of incoming[key]) if (!map.has(s.id) || key === 'sessions' && !map.get(s.id).finishedAt && s.finishedAt) map.set(s.id, clone(s));
      out[key] = [...map.values()];
    }
    if (out.sessions.filter(s => s.mode === 'exam' && !s.finishedAt).length > 1) throw Error('Finish the running sectional before merging another active exam.');
    out.issues = [...new Map([...(out.issues || []), ...(incoming.issues || [])].map(i => [i.id, i])).values()];
    out.updatedAt = Date.now(); out.revision++; return out;
  }
  const api = { VERSION, DAY, Engine, blank, progress, responseState, numeric, grade, validate, migrateLegacy, merge, clone, uid };
  if (typeof module !== 'undefined') module.exports = api;
  root.CatCore = api;
})(globalThis);

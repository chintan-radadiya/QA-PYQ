/* Only the 123 PYQs supplied in the Arithmetic 1 handout. */
const BANK = QUESTIONS.map(q => ({ ...q,
  question: q.number === 79 ? q.question.split(' 44 more CAT questions')[0] : q.question,
  ...HANDOUT_LEARNING.get(q.number), kind:'handout', reserve:null, family:`handout-${q.number}`,
  verification:'Handout-labelled PYQ; answer key cross-checked against the supplied PDF' })).map(q => ({
    ...q, area: CONCEPTS.find(c=>c.topic===q.topic)?.area || 'Arithmetic',
    targetSeconds: {Foundation:90,Easy:120,Moderate:180,Hard:240}[q.difficulty],
    searchText: `${q.id} ${q.number} ${q.question} ${q.topic} ${q.skills.join(' ')} ${q.source}`.toLowerCase()
  }));
const TOPICS = CONCEPTS.map(c=>c.topic);

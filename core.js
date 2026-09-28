import { COUNTRIES } from './countries.js';
export const BY_CODE = new Map(COUNTRIES.map(c => [c.code, c]));
export const STORAGE_KEY = 'flagbook.v1';
export function normalize(value) {
  return value.normalize('NFC').toLocaleLowerCase('en').trim().replace(/\s+/g, ' ').replace(/[‘’]/g, "'");
}
export function isCorrect(country, answer) {
  return [country.name, ...country.aliases].some(name => normalize(name) === normalize(answer));
}
export function shuffled(codes, previous, random = Math.random) {
  const deck = [...codes];
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  if (deck.length > 1 && deck[0] === previous) [deck[0], deck[1]] = [deck[1], deck[0]];
  return deck;
}
export function summarize(events) {
  const questions = new Map();
  const perCountry = new Map();
  let correct = 0, wrong = 0, reveals = 0, streak = 0, best = 0;
  for (const e of events) {
    if (e.type === 'reveal') reveals++;
    else if (isCorrect(BY_CODE.get(e.code), e.answer)) correct++;
    else wrong++;
    if (!questions.has(e.question)) questions.set(e.question, []);
    questions.get(e.question).push(e);
  }
  let firstTry = 0;
  for (const items of questions.values()) {
    const first = items[0];
    const clean = first.type === 'guess' && isCorrect(BY_CODE.get(first.code), first.answer);
    const named = items.some(e => e.type === 'guess' && isCorrect(BY_CODE.get(e.code), e.answer));
    if (clean) { firstTry++; streak++; best = Math.max(best, streak); } else streak = 0;
    const stat = perCountry.get(first.code) || { code: first.code, seen: 0, missed: 0, firstTry: 0, named: 0 };
    stat.seen++; stat.missed += +!clean; stat.firstTry += +clean; stat.named += +named;
    perCountry.set(first.code, stat);
  }
  return { correct, wrong, reveals, firstTry, seen: questions.size, streak, best,
    accuracy: questions.size ? Math.round(firstTry / questions.size * 100) : null,
    named: [...perCountry.values()].filter(c => c.named).length, perCountry,
    missed: [...perCountry.values()].filter(c => c.missed).sort((a,b) => b.missed-a.missed || b.missed/b.seen-a.missed/a.seen || BY_CODE.get(a.code).name.localeCompare(BY_CODE.get(b.code).name)) };
}
export function validateEvents(events) {
  if (!Array.isArray(events) || events.length > 200000) throw new Error('Invalid or oversized attempt history.');
  const ids = new Set(), questions = new Map();
  for (const e of events) {
    if (!e || typeof e.id !== 'string' || !e.id || e.id.length > 100 || ids.has(e.id) || !BY_CODE.has(e.code) || typeof e.question !== 'string' || !e.question || e.question.length > 100 || !['guess','reveal'].includes(e.type) || typeof e.at !== 'string' || !Number.isFinite(Date.parse(e.at)) || typeof e.answer !== 'string' || e.answer.length > 160 || (e.type === 'guess' && !e.answer.trim())) throw new Error('Invalid attempt history.');
    ids.add(e.id);
    const prior = questions.get(e.question);
    if (prior && (prior.code !== e.code || prior.closed)) throw new Error('Invalid question history.');
    questions.set(e.question, {code: e.code, closed: e.type === 'reveal' || isCorrect(BY_CODE.get(e.code), e.answer)});
  }
  return events;
}
export function parseBackup(text) {
  const data = JSON.parse(text);
  if (data.version !== 1) throw new Error('This is not a supported Flagbook backup.');
  return validateEvents(data.events);
}

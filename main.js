import { reactToAnswer } from './aquarium.js';

const elements = {
  sentence: document.querySelector('#sentence'),
  options: document.querySelector('#options'),
  status: document.querySelector('#status'),
  translation: document.querySelector('#translation'),
  score: document.querySelector('#score'),
  correctCount: document.querySelector('#correct-count'),
  totalCount: document.querySelector('#total-count')
};

let current = null;
let answered = false;
let correctCount = 0;

function validateSentences(data) {
  if (!Array.isArray(data)) return [];
  return data.filter((item, index) => {
    const valid = item && typeof item.sentence === 'string' &&
      (item.sentence.match(/___/g) || []).length === 1 &&
      typeof item.translation === 'string' && Array.isArray(item.options) &&
      item.options.length >= 3 && item.options.length <= 5 &&
      item.options.filter(option => option && option.correct === true).length === 1 &&
      item.options.every(option => typeof option.word === 'string' && typeof option.explanation === 'string');
    if (!valid) console.error(`Skipping invalid sentence at index ${index}: it needs one ___, 3–5 options, and exactly one valid option.`, item);
    return valid;
  });
}

function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

class QuizQueue {
  constructor(items) { this.items = items; this.queue = []; this.refill(); }
  refill() { this.queue.push(...shuffle(this.items)); }
  next() { if (!this.queue.length) this.refill(); return this.queue.shift(); }
  requeue(item) {
    // Insert after 3–5 upcoming questions, avoiding an immediate repeat.
    const position = Math.min(this.queue.length, 3 + Math.floor(Math.random() * 3));
    this.queue.splice(position, 0, item);
  }
}

let quiz;

function sentenceMarkup(sentence, chosenWord = '', result = '') {
  const [before, after] = sentence.split('___');
  const slotWidth = current
    ? Math.max(3, ...current.options.map(option => [...option.word].length)) + 1
    : 3;
  const slotStyle = `style="--slot-width: ${slotWidth}ch"`;
  const blank = chosenWord
    ? `<span class="answer-word ${result}" ${slotStyle}>${chosenWord}</span>`
    : `<span class="blank" aria-label="blank" ${slotStyle}>&nbsp;</span>`;
  elements.sentence.innerHTML = `${before}${blank}${after}`;
}

function renderQuestion() {
  current = quiz.next();
  answered = false;
  sentenceMarkup(current.sentence);
  elements.options.replaceChildren();
  elements.status.replaceChildren();
  elements.translation.textContent = '';
  elements.translation.hidden = true;

  shuffle(current.options).forEach((option, index) => {
    const button = document.createElement('button');
    button.className = 'option';
    button.type = 'button';
    button.dataset.index = index;
    button.dataset.word = option.word;
    button.innerHTML = `<span class="shortcut" aria-hidden="true">${index + 1}</span>${option.word}`;
    button.setAttribute('aria-label', `Option ${index + 1}: ${option.word}`);
    button.addEventListener('click', () => answer(option, button));
    elements.options.append(button);
  });
}

function answer(selected, selectedButton) {
  if (answered) return;
  answered = true;
  const correctOption = current.options.find(option => option.correct);
  const isCorrect = selected.correct;
  if (isCorrect) {
    correctCount += 1;
    elements.correctCount.textContent = correctCount;
  }
  sentenceMarkup(current.sentence, selected.word, isCorrect ? 'correct' : 'wrong');

  [...elements.options.children].forEach(button => {
    button.disabled = true;
    const option = current.options.find(item => item.word === button.dataset.word);
    if (option?.correct) button.classList.add('is-correct');
  });
  if (!isCorrect) selectedButton.classList.add('is-wrong');

  const chosen = document.createElement('p');
  chosen.textContent = selected.explanation;
  elements.status.append(chosen);
  if (!isCorrect) {
    const correct = document.createElement('p');
    correct.textContent = `Correct answer: ${correctOption.word}. ${correctOption.explanation}`;
    elements.status.append(correct);
    quiz.requeue(current);
  }
  reactToAnswer(isCorrect);
  elements.translation.textContent = current.translation;
  elements.translation.hidden = false;
}

function continueGame() {
  if (!answered) return;
  renderQuestion();
}

document.addEventListener('click', event => {
  if (answered && !event.target.closest('#options, #sentence, #translation, #status')) continueGame();
});

window.addEventListener('keydown', event => {
  if (event.key === 'Enter' || event.key === ' ') {
    if (answered) { event.preventDefault(); continueGame(); }
    return;
  }
  const index = Number(event.key) - 1;
  const button = elements.options.children[index];
  if (!answered && Number.isInteger(index) && button) button.click();
});
async function start() {
  try {
    const response = await fetch('sentences.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const sentences = validateSentences(await response.json());
    if (!sentences.length) throw new Error('No valid sentences found.');
    elements.totalCount.textContent = sentences.length;
    elements.score.hidden = false;
    quiz = new QuizQueue(sentences);
    renderQuestion();
  } catch (error) {
    console.error('Could not load the quiz:', error);
    elements.sentence.textContent = 'Unable to load the quiz.';
    elements.status.textContent = location.protocol === 'file:'
      ? 'Browsers block this game’s local JSON and modules. Start the local server as described in README, then reopen the page.'
      : 'Check that sentences.json is beside index.html, then reload the page.';
  }
}

start();

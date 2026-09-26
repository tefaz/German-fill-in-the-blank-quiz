import * as aquarium from './aquarium.js';
import * as starfield from './starfield.js';

const toggle = document.querySelector('#effects-toggle');
const toggleLabel = toggle.querySelector('.effects-toggle-label');
const aquariumCanvas = document.querySelector('#aquarium');
const starfieldCanvas = document.querySelector('#starfield');
let starsEnabled = false;

toggle.addEventListener('click', () => {
  starsEnabled = !starsEnabled;
  document.documentElement.dataset.mode = starsEnabled ? 'starfield' : 'aquarium';
  aquariumCanvas.hidden = starsEnabled;
  starfieldCanvas.hidden = !starsEnabled;
  aquarium.setEnabled(!starsEnabled);
  starfield.setEnabled(starsEnabled);
  toggleLabel.textContent = starsEnabled ? 'Starfield' : 'Aquarium';
  toggle.setAttribute('aria-pressed', String(starsEnabled));
  toggle.title = starsEnabled ? 'Switch to aquarium' : 'Switch to starfield';
});

export function reactToAnswer(correct) {
  if (starsEnabled) {
    if (correct) starfield.pulse();
    else starfield.softDim();
  } else aquarium.reactToAnswer(correct);
}

export function reactToContinue() {
  if (starsEnabled) starfield.pulse();
}

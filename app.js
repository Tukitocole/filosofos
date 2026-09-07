const state = { character: null, faces: {} };
const face = document.querySelector('#face');
const scene = document.querySelector('#scene');
const map = document.querySelector('#game-map');
const spriteLayer = document.querySelector('#sprites');
const nameTitle = document.querySelector('#character-name');
const hoverMessage = document.querySelector('#hover-message');
const conversation = document.querySelector('#conversation');
const form = document.querySelector('#question-form');
const question = document.querySelector('#question');
const sendButton = document.querySelector('#send');

function addMessage(kind, text) {
  const message = document.createElement('article');
  message.className = `message ${kind}`;
  const label = kind === 'user' ? 'VOS' : (state.character || 'SISTEMA').toUpperCase();
  message.innerHTML = `<strong>${label}</strong><p></p>`;
  message.querySelector('p').textContent = text;
  conversation.append(message);
  conversation.scrollTop = conversation.scrollHeight;
}

function selectCharacter(character) {
  state.character = character;
  nameTitle.textContent = character;
  face.src = state.faces[character] || 'assets/socrates.png';
  face.alt = `Retrato de ${character}`;
  hoverMessage.textContent = `Hablando con ${character}.`;
  conversation.innerHTML = '';
  addMessage('assistant', `Hola. Soy ${character}. ¿Qué te gustaría preguntarme?`);
  question.disabled = false;
  sendButton.disabled = false;
  question.placeholder = `Preguntale algo a ${character}…`;
  question.focus();
}

function addArea(coords, character) {
  const area = document.createElement('area');
  area.shape = 'rect';
  area.coords = coords;
  area.href = '#conversacion';
  area.alt = character;
  area.addEventListener('mouseenter', () => { hoverMessage.textContent = `Hablar con ${character}`; });
  area.addEventListener('focus', () => { hoverMessage.textContent = `Hablar con ${character}`; });
  area.addEventListener('mouseleave', () => {
    hoverMessage.textContent = state.character ? `Hablando con ${state.character}.` : 'Pasá el mouse sobre un personaje.';
  });
  area.addEventListener('click', (event) => {
    event.preventDefault();
    selectCharacter(character);
  });
  map.append(area);
}

function addSprite(coords, character) {
  const [x1, , x2, y2] = coords.split(',').map(Number);
  const WIDTH = 180;
  const HEIGHT = 240;
  const img = document.createElement('img');
  img.className = 'character-sprite';
  img.src = state.faces[character] || 'assets/socrates.png';
  img.alt = '';
  img.style.left = `${Math.round((x1 + x2) / 2 - WIDTH / 2)}px`;
  img.style.top = `${y2 - HEIGHT}px`;
  img.style.width = `${WIDTH}px`;
  img.style.height = `${HEIGHT}px`;
  spriteLayer.append(img);
}

async function loadGame() {
  const requested = new URLSearchParams(window.location.search).get('config') || 'config.json';
  const configName = requested.split('/').pop();
  if (!configName || !configName.endsWith('.json')) throw new Error('El archivo de configuración debe ser un JSON.');
  const response = await fetch(configName);
  if (!response.ok) throw new Error('No se encontró el archivo de configuración.');
  const config = await response.json();
  scene.src = config.escenario;
  state.faces = config.rostros || {};
  for (const areaHtml of config.areasPersonajes || []) {
    const found = areaHtml.match(/coords="([0-9]+,[0-9]+,[0-9]+,[0-9]+)"[^>]*alt="([^"]+)"/u);
    if (found) {
      addArea(found[1], found[2]);
      addSprite(found[1], found[2]);
    }
  }
  hoverMessage.textContent = 'Pasá el mouse sobre un personaje.';
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const text = question.value.trim();
  if (!text || !state.character) return;
  addMessage('user', text);
  question.value = '';
  question.disabled = true;
  sendButton.disabled = true;
  sendButton.textContent = 'Pensando…';
  const prompt = `Respondé como ${state.character}, un personaje histórico real. Respondé en español, en primera persona, de forma muy breve (máximo 70 palabras), clara y coherente con sus ideas históricamente documentadas. No digas que sos una IA ni inventes hechos. Pregunta del visitante: ${text}`;
  try {
    const response = await fetch('/api', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'No se pudo obtener la respuesta.');
    addMessage('assistant', data.response);
  } catch (error) {
    addMessage('error', error.message || 'Ocurrió un error al consultar la API.');
  } finally {
    question.disabled = false;
    sendButton.disabled = false;
    sendButton.textContent = 'Preguntar';
    question.focus();
  }
});

loadGame().catch((error) => {
  hoverMessage.textContent = 'No se pudo cargar el escenario.';
  addMessage('error', error.message);
});

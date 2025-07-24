let blowCount = 0;
let startTime = null;
let blows = [];
let pileHeight = 0;
let surfaceHeight = 0;
let logData = [];
let micMode = false;
let micStream, audioContext, analyser, dataArray;

const canvas = document.getElementById('pileVisual');
const ctx = canvas.getContext('2d');

function startLogging() {
  pileHeight = parseFloat(document.getElementById('pileHeight').value);
  if (isNaN(pileHeight) || pileHeight <= 0) {
    alert('Enter a valid pile height.');
    return;
  }

  surfaceHeight = pileHeight;
  document.getElementById('surfaceHeight').textContent = surfaceHeight.toFixed(2);
  document.getElementById('setup').style.display = 'none';
  document.getElementById('logger').style.display = 'block';
  blowCount = 0;
  startTime = null;
  blows = [];
  logData = [];

  const mode = document.querySelector('input[name="mode"]:checked').value;
  micMode = mode === 'mic';
  document.getElementById('tapButton').style.display = micMode ? 'none' : 'inline-block';

  initPileCanvas();

  if (micMode) startMicDetection();
}

function recordBlow() {
  const now = Date.now();
  if (!startTime) startTime = now;
  blowCount++;
  blows.push(now);
  document.getElementById('blowCount').textContent = blowCount;

  const elapsedMin = (now - startTime) / 60000;
  const bpm = blowCount / elapsedMin;
  document.getElementById('bpm').textContent = bpm.toFixed(1);

  updateBPFandVisual();

  logData.push({ blow: blowCount, time: new Date(now).toISOString(), height: surfaceHeight });
}

function markHeight() {
  alert('Tap or swipe on the pile bar below to set the current surface height.');
}

function updateBPFandVisual() {
  const penetration = pileHeight - surfaceHeight;
  const bpf = penetration > 0 ? blowCount / penetration : 0;
  document.getElementById('bpf').textContent = bpf.toFixed(1);

  drawHorizontalPile();
}

// ----------- Canvas drawing and interaction -----------

function drawHorizontalPile() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const barStartX = 20;
  const barEndX = canvas.width - 20;
  const barY = canvas.height / 2;
  const barHeight = 20;
  const totalLength = pileHeight;

  // Draw gray background bar
  ctx.fillStyle = '#ccc';
  ctx.fillRect(barStartX, barY - barHeight / 2, barEndX - barStartX, barHeight);

  // Draw driven portion in green
  const drivenLength = totalLength - surfaceHeight;
  const drivenPixels = ((drivenLength / totalLength) * (barEndX - barStartX));
  ctx.fillStyle = '#0a0';
  ctx.fillRect(barStartX, barY - barHeight / 2, drivenPixels, barHeight);

  // Draw tick marks and labels every 5 ft
  ctx.fillStyle = '#000';
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'center';
  const tickSpacing = 5;
  const numTicks = Math.floor(totalLength / tickSpacing);

  for (let i = 0; i <= numTicks; i++) {
    const x = barStartX + (i * tickSpacing / totalLength) * (barEndX - barStartX);
    ctx.beginPath();
    ctx.moveTo(x, barY - barHeight / 2);
    ctx.lineTo(x, barY - barHeight / 2 - 8);
    ctx.stroke();

    ctx.fillText(`${i * tickSpacing} ft`, x, barY - barHeight / 2 - 12);
  }
}

function onPileClick(event) {
  const rect = canvas.getBoundingClientRect();
  const clickX = (event.touches ? event.touches[0].clientX : event.clientX) - rect.left;
  const barStartX = 20;
  const barEndX = canvas.width - 20;
  const totalLength = pileHeight;

  if (clickX < barStartX || clickX > barEndX) return;

  const relativeX = clickX - barStartX;
  const newHeight = totalLength - ((relativeX / (barEndX - barStartX)) * totalLength);

  // Snap to nearest foot (change to 5 if you want 5 ft increments)
  const snappedHeight = Math.round(newHeight);

  if (snappedHeight >= 0 && snappedHeight <= totalLength && snappedHeight < surfaceHeight) {
    surfaceHeight = snappedHeight;
    document.getElementById('surfaceHeight').textContent = surfaceHeight.toFixed(2);
    updateBPFandVisual();
  }
}

function initPileCanvas() {
  canvas.width = 300;
  canvas.height = 80;
  drawHorizontalPile();
}

// Add event listeners for click and touch
canvas.addEventListener('click', onPileClick);
canvas.addEventListener('touchstart', e => {
  e.preventDefault();
  onPileClick(e);
});

// ----------- Audio mode logic -----------

let lastBlowTime = 0;
function startMicDetection() {
  navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
    micStream = stream;
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioContext.createMediaStreamSource(stream);
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    dataArray = new Uint8Array(analyser.frequencyBinCount);
    source.connect(analyser);
    listenForBlows();
  }).catch(err => {
    alert("Microphone access denied or error.");
    console.error(err);
  });
}

function listenForBlows() {
  analyser.getByteTimeDomainData(dataArray);
  let peak = 0;
  for (let i = 0; i < dataArray.length; i++) {
    const val = Math.abs(dataArray[i] - 128);
    if (val > peak) peak = val;
  }

  const now = Date.now();
  const timeSinceLastBlow = now - lastBlowTime;
  const dB = 20 * Math.log10(peak / 128);

  // Adjust threshold (dB > -5 is approximate, tweak based on your testing)
  if (dB > -5 && timeSinceLastBlow > 1000) {
    lastBlowTime = now;
    recordBlow();
  }

  requestAnimationFrame(listenForBlows);
}

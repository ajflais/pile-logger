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
canvas.width = 300;
canvas.height = 120;  // taller for tick buttons

let viewStart = 0;       // The first foot shown in the view window
const viewWidth = 10;    // Show 10 feet width at a time

let tickPositions = [];  // store clickable tick buttons {x, y, radius, foot}

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
  viewStart = 0;

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
  alert('Tap one of the blue foot circles below the pile bar to set the current surface height.');
}

function updateBPFandVisual() {
  const penetration = pileHeight - surfaceHeight;
  const bpf = penetration > 0 ? blowCount / penetration : 0;
  document.getElementById('bpf').textContent = bpf.toFixed(1);

  drawHorizontalPile();
}

function drawHorizontalPile() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const barStartX = 20;
  const barEndX = canvas.width - 20;
  const barY = 30;        // bar near top
  const barHeight = 20;

  // Draw gray bar
  ctx.fillStyle = '#ccc';
  ctx.fillRect(barStartX, barY - barHeight / 2, barEndX - barStartX, barHeight);

  // Draw green driven portion
  const windowEnd = viewStart + viewWidth;
  const visiblePenetrationStart = Math.max(viewStart, pileHeight - surfaceHeight);
  const visiblePenetrationEnd = Math.min(windowEnd, pileHeight);
  let drivenPixels = 0;
  if (visiblePenetrationEnd > visiblePenetrationStart) {
    const visiblePenetration = visiblePenetrationEnd - visiblePenetrationStart;
    drivenPixels = (visiblePenetration / viewWidth) * (barEndX - barStartX);
  }
  const drivenStartPx = ((visiblePenetrationStart - viewStart) / viewWidth) * (barEndX - barStartX) + barStartX;

  ctx.fillStyle = '#0a0';
  ctx.fillRect(drivenStartPx, barY - barHeight / 2, drivenPixels, barHeight);

  // Draw ticks every 1 ft, as circles below bar (y=70)
  ctx.fillStyle = '#000';
  ctx.font = '14px sans-serif';
  ctx.textAlign = 'center';

  tickPositions = [];
  const tickSpacingFeet = 1;
  const numTicks = Math.floor(viewWidth / tickSpacingFeet);

  for (let i = 0; i <= numTicks; i++) {
    const footMark = viewStart + i * tickSpacingFeet;
    const x = barStartX + (i * tickSpacingFeet / viewWidth) * (barEndX - barStartX);

    // Draw tick line
    ctx.beginPath();
    ctx.moveTo(x, barY + barHeight / 2);
    ctx.lineTo(x, barY + barHeight / 2 + 10);
    ctx.stroke();

    // Draw clickable circle (button) below tick line
    const circleY = barY + barHeight / 2 + 25;
    const radius = 8;
    ctx.beginPath();
    ctx.fillStyle = '#007bff';
    ctx.arc(x, circleY, radius, 0, Math.PI * 2);
    ctx.fill();

    // Draw foot label inside circle
    ctx.fillStyle = 'white';
    ctx.fillText(`${Math.round(footMark)}`, x, circleY + 5);

    tickPositions.push({ x, y: circleY, radius, foot: footMark });
  }
}

function onPileClick(event) {
  const rect = canvas.getBoundingClientRect();
  const clickX = (event.touches ? event.touches[0].clientX : event.clientX) - rect.left;
  const clickY = (event.touches ? event.touches[0].clientY : event.clientY) - rect.top;

  // Check if clicked on any tick circle button
  for (let tick of tickPositions) {
    const dx = clickX - tick.x;
    const dy = clickY - tick.y;
    if (dx * dx + dy * dy <= tick.radius * tick.radius) {
      let newSurfaceHeight = pileHeight - tick.foot;
      if (newSurfaceHeight < 0) newSurfaceHeight = 0;
      if (newSurfaceHeight > pileHeight) newSurfaceHeight = pileHeight;

      if (newSurfaceHeight !== surfaceHeight) {
        surfaceHeight = newSurfaceHeight;
        document.getElementById('surfaceHeight').textContent = surfaceHeight.toFixed(2);
        updateBPFandVisual();
      }
      return;
    }
  }
  // Ignore clicks outside tick buttons to prevent accidental height changes
}

let isDragging = false;
let dragStartX = 0;
let dragStartView = 0;

canvas.addEventListener('mousedown', e => {
  isDragging = true;
  dragStartX = e.clientX;
  dragStartView = viewStart;
});
canvas.addEventListener('touchstart', e => {
  isDragging = true;
  dragStartX = e.touches[0].clientX;
  dragStartView = viewStart;
});
canvas.addEventListener('mouseup', e => { isDragging = false; });
canvas.addEventListener('touchend', e => { isDragging = false; });
canvas.addEventListener('mouseleave', e => { isDragging = false; });
canvas.addEventListener('touchcancel', e => { isDragging = false; });

canvas.addEventListener('mousemove', e => {
  if (!isDragging) return;
  const deltaX = e.clientX - dragStartX;
  handleDrag(deltaX);
});
canvas.addEventListener('touchmove', e => {
  if (!isDragging) return;
  const deltaX = e.touches[0].clientX - dragStartX;
  handleDrag(deltaX);
});

function handleDrag(deltaX) {
  const barWidth = canvas.width - 40; // 20 px padding each side
  const feetPerPixel = viewWidth / barWidth;
  let newViewStart = dragStartView - deltaX * feetPerPixel;
  if (newViewStart < 0) newViewStart = 0;
  if (newViewStart > pileHeight - viewWidth) newViewStart = pileHeight - viewWidth;
  viewStart = newViewStart;
  drawHorizontalPile();
}

// Export CSV
function exportLog() {
  if (logData.length === 0) {
    alert("No data to export.");
    return;
  }

  if (!confirm("Export pile driving log CSV now?")) {
    return;
  }

  let csvContent = "data:text/csv;charset=utf-8,Blow,Time,SurfaceHeight(ft)\n";
  logData.forEach(row => {
    csvContent += `${row.blow},${row.time},${row.height}\n`;
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `pile_log_${new Date().toISOString().slice(0,10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function initPileCanvas() {
  canvas.width = 300;
  canvas.height = 120;
  drawHorizontalPile();
}

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

  // Adjust threshold to suit your recorded range (~90-120dB)
  if (dB > -5 && timeSinceLastBlow > 1000) {
    lastBlowTime = now;
    recordBlow();
  }

  requestAnimationFrame(listenForBlows);
}

// Setup event listeners for pile canvas interaction
canvas.addEventListener('click', onPileClick);
canvas.addEventListener('touchstart', e => {
  e.preventDefault();
  onPileClick(e);
});

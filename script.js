let blowCount = 0;
let startTime = null;
let blows = [];
let pileHeight = 0;
let surfaceHeight = 0;
let logData = [];
let footLogData = [];
let micMode = false;
let micStream, audioContext, analyser, dataArray;

const canvas = document.getElementById('pileVisual');
const ctx = canvas.getContext('2d');
canvas.width = 300;
canvas.height = 120;

let viewStart = 0;
const viewWidth = 10;
let tickPositions = [];

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
  footLogData = [];
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

  logData.push({ blow: blowCount, time: formatDateTime(now), height: surfaceHeight });
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
  const barY = 30;
  const barHeight = 20;

  ctx.fillStyle = '#ccc';
  ctx.fillRect(barStartX, barY - barHeight / 2, barEndX - barStartX, barHeight);

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

  ctx.fillStyle = '#000';
  ctx.font = '14px sans-serif';
  ctx.textAlign = 'center';
  tickPositions = [];

  const tickSpacingFeet = 1;
  const numTicks = Math.floor(viewWidth / tickSpacingFeet);
  for (let i = 0; i <= numTicks; i++) {
    const footMark = viewStart + i * tickSpacingFeet;
    const x = barStartX + (i * tickSpacingFeet / viewWidth) * (barEndX - barStartX);

    ctx.beginPath();
    ctx.moveTo(x, barY + barHeight / 2);
    ctx.lineTo(x, barY + barHeight / 2 + 10);
    ctx.stroke();

    const circleY = barY + barHeight / 2 + 25;
    const radius = 8;
    ctx.beginPath();
    ctx.fillStyle = '#007bff';
    ctx.arc(x, circleY, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'white';
    ctx.fillText(`${Math.round(footMark)}`, x, circleY + 5);

    tickPositions.push({ x, y: circleY, radius, foot: footMark });
  }
}

function onPileClick(event) {
  const rect = canvas.getBoundingClientRect();
  const clickX = (event.touches ? event.touches[0].clientX : event.clientX) - rect.left;
  const clickY = (event.touches ? event.touches[0].clientY : event.clientY) - rect.top;

  for (let tick of tickPositions) {
    const dx = clickX - tick.x;
    const dy = clickY - tick.y;
    if (dx * dx + dy * dy <= tick.radius * tick.radius) {
      let newSurfaceHeight = pileHeight - Math.round(tick.foot);
      newSurfaceHeight = Math.max(0, Math.min(pileHeight, newSurfaceHeight));

      if (newSurfaceHeight !== surfaceHeight) {
        const now = Date.now();
        const elapsedMin = startTime ? (now - startTime) / 60000 : 0;
        const bpm = elapsedMin > 0 ? blowCount / elapsedMin : 0;
        const penetration = pileHeight - newSurfaceHeight;
        const bpf = penetration > 0 ? blowCount / penetration : 0;

        const entry = {
          blow: blowCount,
          time: formatDateTime(now),
          height: newSurfaceHeight,
          bpm: bpm.toFixed(1),
          bpf: bpf.toFixed(1)
        };

        footLogData.push(entry);

        const tableBody = document.getElementById('footTableBody');
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${entry.blow}</td>
          <td>${entry.time}</td>
          <td>${Math.round(entry.height)}</td>
          <td>${entry.bpm}</td>
          <td>${entry.bpf}</td>
        `;
        tableBody.insertBefore(row, tableBody.firstChild);

        surfaceHeight = newSurfaceHeight;
        document.getElementById('surfaceHeight').textContent = surfaceHeight.toFixed(2);
        updateBPFandVisual();
      }
      return;
    }
  }
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
canvas.addEventListener('mouseup', () => isDragging = false);
canvas.addEventListener('touchend', () => isDragging = false);
canvas.addEventListener('mouseleave', () => isDragging = false);
canvas.addEventListener('touchcancel', () => isDragging = false);
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
  const barWidth = canvas.width - 40;
  const feetPerPixel = viewWidth / barWidth;
  let newViewStart = dragStartView - deltaX * feetPerPixel;
  newViewStart = Math.max(0, Math.min(pileHeight - viewWidth, newViewStart));
  viewStart = newViewStart;
  drawHorizontalPile();
}

function exportLog() {
  if (footLogData.length === 0) {
    alert("No data to export.");
    return;
  }

  if (!confirm("Export pile driving log CSV now?")) return;

  let csvContent = "data:text/csv;charset=utf-8,Blow,Time,SurfaceHeight(ft),BPM,BPF\n";
  footLogData.forEach(row => {
    csvContent += `${row.blow},${row.time},${row.height},${row.bpm},${row.bpf}\n`;
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

  if (dB > -5 && timeSinceLastBlow > 1000) {
    lastBlowTime = now;
    recordBlow();
  }

  requestAnimationFrame(listenForBlows);
}

function formatDateTime(timestamp) {
  const date = new Date(timestamp);
  const options = {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  };
  return date.toLocaleString(undefined, options);
}

canvas.addEventListener('click', onPileClick);
canvas.addEventListener('touchstart', e => {
  e.preventDefault();
  onPileClick(e);
});

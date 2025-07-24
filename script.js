let blowCount = 0;
let startTime = null;
let blows = [];
let pileHeight = 0;
let surfaceHeight = 0;
let logData = [];
let micMode = false;
let micStream, audioContext, analyser, dataArray;

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
  updateVisual();

  const mode = document.querySelector('input[name="mode"]:checked').value;
  micMode = mode === 'mic';
  document.getElementById('tapButton').style.display = micMode ? 'none' : 'inline-block';

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

  const penetration = pileHeight - surfaceHeight;
  const bpf = penetration > 0 ? blowCount / penetration : 0;
  document.getElementById('bpf').textContent = bpf.toFixed(1);

  logData.push({ blow: blowCount, time: new Date(now).toISOString(), height: surfaceHeight });
}

function markHeight() {
  const newHeight = prompt('Enter current surface height (ft):');
  const h = parseFloat(newHeight);
  if (!isNaN(h) && h < surfaceHeight) {
    surfaceHeight = h;
    document.getElementById('surfaceHeight').textContent = surfaceHeight.toFixed(2);
    updateVisual();
  } else {
    alert('Invalid or higher than previous height.');
  }
}

function updateVisual() {
  const canvas = document.getElementById('pileVisual');
  const ctx = canvas.getContext('2d');
  const fullHeight = 250;
  const drivenHeight = ((pileHeight - surfaceHeight) / pileHeight) * fullHeight;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#ccc';
  ctx.fillRect(80, 0, 40, fullHeight);
  ctx.fillStyle = '#0a0';
  ctx.fillRect(80, fullHeight - drivenHeight, 40, drivenHeight);
}

function exportLog() {
  let csv = "Blow,Time,Surface Height\n";
  logData.forEach(row => {
    csv += `${row.blow},${row.time},${row.height}\n`;
  });
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  saveAs(blob, "pile_log.csv");
}

// Audio Mode Logic
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

  // Tune this based on test recordings
  if (dB > -5 && timeSinceLastBlow > 1000) {
    lastBlowTime = now;
    recordBlow();
  }

  requestAnimationFrame(listenForBlows);
}

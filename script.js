let mode = null;
let blowCount = 0;
let logData = [];
let pileHeight = 100;
let surfaceHeight = 100;
let blowTimes = [];
let pixelsPerFoot = 10;
let offsetX = 0;

const canvas = document.getElementById("pileCanvas");
const ctx = canvas.getContext("2d");

function setMode(selectedMode) {
  mode = selectedMode;
  document.getElementById("modeDisplay").textContent = mode;
}

function startLogging() {
  blowCount = 0;
  logData = [];
  blowTimes = [];

  pileHeight = parseInt(document.getElementById("pileHeightInput").value);
  surfaceHeight = pileHeight;

  document.getElementById("blowCount").textContent = blowCount;
  document.getElementById("surfaceHeight").textContent = surfaceHeight;

  redrawPile();

  if (mode === "manual") {
    canvas.addEventListener("click", handleCanvasClick);
  }

  if (mode === "audio") {
    setupMic();
  }
}

function redrawPile() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const visibleFeet = canvas.width / pixelsPerFoot;

  const startFoot = Math.floor(offsetX / pixelsPerFoot);
  const endFoot = startFoot + Math.floor(visibleFeet);

  for (let i = startFoot; i <= endFoot; i++) {
    const x = i * pixelsPerFoot - offsetX;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 100);
    ctx.strokeStyle = i === (pileHeight - surfaceHeight) ? "red" : "#000";
    ctx.stroke();

    // Draw label box
    ctx.fillStyle = "#fff";
    ctx.fillRect(x - 10, 40, 20, 20);

    ctx.fillStyle = "black";
    ctx.font = "12px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(i, x, 55);
  }
}

function handleCanvasClick(event) {
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left + offsetX;

  const newDriven = Math.round(x / pixelsPerFoot);
  surfaceHeight = Math.max(0, pileHeight - newDriven);
  surfaceHeight = Math.round(surfaceHeight);

  document.getElementById("surfaceHeight").textContent = surfaceHeight;

  const time = new Date().toLocaleTimeString();
  logData.push({ blow: blowCount + " (manual height)", time, height: surfaceHeight });

  redrawPile();
}

canvas.addEventListener("touchstart", handleSwipeStart);
canvas.addEventListener("touchmove", handleSwipeMove);
let swipeStartX = null;

function handleSwipeStart(e) {
  swipeStartX = e.touches[0].clientX;
}

function handleSwipeMove(e) {
  if (swipeStartX === null) return;
  const dx = e.touches[0].clientX - swipeStartX;
  offsetX -= dx;
  offsetX = Math.max(0, offsetX);
  swipeStartX = e.touches[0].clientX;
  redrawPile();
}

function logBlow() {
  blowCount++;
  document.getElementById("blowCount").textContent = blowCount;

  const time = new Date();
  blowTimes.push(time);
  updateBPM();

  logData.push({
    blow: blowCount,
    time: time.toLocaleTimeString(),
    height: surfaceHeight
  });
}

function updateBPM() {
  const now = new Date();
  blowTimes = blowTimes.filter(t => (now - t) <= 60000);
  const bpm = blowTimes.length;
  document.getElementById("bpm").textContent = bpm;
}

function setupMic() {
  navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const mic = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    mic.connect(analyser);

    const data = new Uint8Array(analyser.frequencyBinCount);

    function detect() {
      analyser.getByteFrequencyData(data);
      const volume = Math.max(...data);

      if (volume > 90) {
        const now = Date.now();
        if (!detect.last || now - detect.last > 1000) {
          detect.last = now;
          logBlow();
        }
      }
      requestAnimationFrame(detect);
    }

    detect();
  });
}

function exportCSV() {
  if (logData.length === 0) {
    alert("No data to export.");
    return;
  }

  let csv = "Blow #,Time,Height (ft)\n";
  logData.forEach(row => {
    csv += `${row.blow},${row.time},${Math.round(row.height)}\n`;
  });

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  saveAs(blob, "pile_log.csv");
}

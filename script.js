let pileHeight = 0;
let surfaceHeight = 0;
let blowCount = 0;
let logData = [];

let startTime;
let lastBlowTime;
let audioContext;
let mic;
let processor;
let animationFrame;

let offsetX = 0;
let pixelsPerFoot = 10;

const canvas = document.getElementById("pileCanvas");
const ctx = canvas.getContext("2d");

function startManualLogging() {
  pileHeight = parseInt(document.getElementById("pileHeight").value);
  if (!pileHeight || pileHeight <= 0) return alert("Enter valid pile height");

  surfaceHeight = pileHeight;
  blowCount = 0;
  logData = [];
  document.getElementById("manualControls").style.display = "block";
  document.getElementById("autoControls").style.display = "none";
  document.getElementById("surfaceHeight").textContent = surfaceHeight;

  canvas.addEventListener("click", handleCanvasClick);
  redrawPile();
}

function recordManualBlow() {
  if (surfaceHeight <= 0) return alert("Pile already at or below ground.");
  surfaceHeight = Math.max(0, surfaceHeight - 1);
  blowCount++;
  const time = new Date().toLocaleTimeString();
  logData.push({ blow: blowCount, time, height: surfaceHeight });
  document.getElementById("surfaceHeight").textContent = surfaceHeight;
  redrawPile();
}

function startAutoLogging() {
  pileHeight = parseInt(document.getElementById("pileHeight").value);
  if (!pileHeight || pileHeight <= 0) return alert("Enter valid pile height");

  surfaceHeight = pileHeight;
  blowCount = 0;
  logData = [];
  startTime = Date.now();
  lastBlowTime = 0;

  document.getElementById("manualControls").style.display = "none";
  document.getElementById("autoControls").style.display = "block";
  document.getElementById("surfaceHeight").textContent = surfaceHeight;

  navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
    audioContext = new AudioContext();
    mic = audioContext.createMediaStreamSource(stream);
    processor = audioContext.createScriptProcessor(1024, 1, 1);
    mic.connect(processor);
    processor.connect(audioContext.destination);
    processor.onaudioprocess = detectBlow;
  });

  canvas.addEventListener("click", handleCanvasClick);
  redrawPile();
}

function stopAutoLogging() {
  if (processor) processor.disconnect();
  if (mic) mic.disconnect();
  if (audioContext) audioContext.close();

  canvas.removeEventListener("click", handleCanvasClick);
}

function detectBlow(e) {
  const input = e.inputBuffer.getChannelData(0);
  let max = 0;
  for (let i = 0; i < input.length; i++) {
    max = Math.max(max, Math.abs(input[i]));
  }

  const now = Date.now();
  const secondsSinceLast = (now - lastBlowTime) / 1000;

  if (max > 0.3 && secondsSinceLast > 0.7) {
    lastBlowTime = now;
    blowCount++;
    surfaceHeight = Math.max(0, surfaceHeight - 1);
    const time = new Date().toLocaleTimeString();
    logData.push({ blow: blowCount, time, height: surfaceHeight });

    document.getElementById("autoBlowCount").textContent = blowCount;
    document.getElementById("surfaceHeight").textContent = surfaceHeight;

    const elapsedSeconds = (now - startTime) / 1000;
    const bpm = Math.round((blowCount / elapsedSeconds) * 60);
    document.getElementById("bpm").textContent = bpm;

    redrawPile();
  }
}

function handleCanvasClick(event) {
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left + offsetX;
  const newDriven = Math.max(0, Math.min(pileHeight, Math.round(x / pixelsPerFoot)));
  surfaceHeight = pileHeight - newDriven;

  // Round to nearest whole foot
  surfaceHeight = Math.round(surfaceHeight);

  document.getElementById("surfaceHeight").textContent = surfaceHeight;

  // Log it as a manual entry
  const time = new Date().toLocaleTimeString();
  logData.push({ blow: blowCount + " (manual height)", time, height: surfaceHeight });
  redrawPile();
}

canvas.addEventListener("touchstart", handleTouchStart, false);
canvas.addEventListener("touchmove", handleTouchMove, false);
let touchStartX = 0;

function handleTouchStart(e) {
  touchStartX = e.touches[0].clientX;
}

function handleTouchMove(e) {
  const deltaX = e.touches[0].clientX - touchStartX;
  offsetX = Math.max(0, offsetX - deltaX);
  touchStartX = e.touches[0].clientX;
  redrawPile();
}

function redrawPile() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const visibleFeet = canvas.width / pixelsPerFoot;
  const startFoot = Math.floor(offsetX / pixelsPerFoot);
  const endFoot = startFoot + visibleFeet;

  for (let i = startFoot; i <= endFoot; i++) {
    const x = i * pixelsPerFoot - offsetX;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.strokeStyle = i % 5 === 0 ? "#000" : "#ccc";
    ctx.stroke();

    if (i % 1 === 0) {
      ctx.fillStyle = "#000";
      ctx.fillText(i, x + 2, 15);
    }
  }

  const driven = pileHeight - surfaceHeight;
  ctx.fillStyle = "#88f";
  ctx.fillRect(0 - offsetX, 30, driven * pixelsPerFoot, 40);
}

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
    csvContent += `${row.blow},${row.time},${Math.round(row.height)}\n`;
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  const pileId = document.getElementById("pileId").value || "pile";
  link.setAttribute("download", `${pileId}_log.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

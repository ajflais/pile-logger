let blowData = [];
let startTime;
let interval;
let blowCount = 0;
let pileLength = 100;
let currentHeight = null;
let canvas, ctx;
let scrollX = 0;
let dragging = false;
let dragStartX = 0;
let startScrollX = 0;

function startLogging() {
  const pileName = document.getElementById("pileName").value;
  const initialHeight = parseInt(document.getElementById("initialHeight").value);

  if (!pileName || isNaN(initialHeight)) {
    alert("Please enter both pile name and initial height.");
    return;
  }

  document.getElementById("loggingSection").style.display = "block";
  document.getElementById("currentHeight").textContent = "—";
  blowData = [];
  blowCount = 0;
  startTime = new Date();
  document.getElementById("blowCount").textContent = "0";
  document.getElementById("bpm").textContent = "0";

  currentHeight = null;
  pileLength = initialHeight;

  canvas = document.getElementById("pileCanvas");
  ctx = canvas.getContext("2d");
  drawPile();

  canvas.addEventListener("mousedown", startDrag);
  canvas.addEventListener("mousemove", duringDrag);
  canvas.addEventListener("mouseup", endDrag);
  canvas.addEventListener("touchstart", startDrag);
  canvas.addEventListener("touchmove", duringDrag);
  canvas.addEventListener("touchend", endDrag);
  canvas.addEventListener("click", handleTap);

  if (interval) clearInterval(interval);
  interval = setInterval(updateBPM, 1000);
}

function markBlow() {
  const now = new Date();
  blowData.push({ time: now.toISOString(), height: currentHeight });
  blowCount++;
  document.getElementById("blowCount").textContent = blowCount.toString();
}

function updateBPM() {
  const now = new Date();
  const oneMinuteAgo = new Date(now - 60000);
  const recentBlows = blowData.filter(b => new Date(b.time) > oneMinuteAgo);
  document.getElementById("bpm").textContent = recentBlows.length.toString();
}

function stopLogging() {
  clearInterval(interval);
  const pileName = document.getElementById("pileName").value;
  let csv = "Pile Name,Time,Height (ft)\n";
  blowData.forEach(b => {
    csv += `${pileName},${b.time},${b.height || ""}\n`;
  });
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  saveAs(blob, `${pileName}_log.csv`);
}

function markBearing() {
  alert("Bearing reached. You can stop logging.");
}

function drawPile() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const ftWidth = 60;
  const visibleFt = Math.ceil(canvas.width / ftWidth);
  const startFt = Math.floor(scrollX / ftWidth);
  const endFt = startFt + visibleFt;

  for (let i = startFt; i <= endFt; i++) {
    const x = i * ftWidth - scrollX;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.strokeStyle = "gray";
    ctx.stroke();

    ctx.fillStyle = "black";
    ctx.fillText(pileLength - i + " ft", x + 2, 20);

    // Highlight if selected
    if (pileLength - i === currentHeight) {
      ctx.fillStyle = "red";
      ctx.fillRect(x, 30, ftWidth, canvas.height - 30);
    }
  }
}

function handleTap(e) {
  const rect = canvas.getBoundingClientRect();
  const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left + scrollX;
  const ftWidth = 60;
  const clickedFt = Math.floor(x / ftWidth);
  currentHeight = Math.round(pileLength - clickedFt);
  document.getElementById("currentHeight").textContent = currentHeight;
  drawPile();
}

function startDrag(e) {
  dragging = true;
  dragStartX = e.touches ? e.touches[0].clientX : e.clientX;
  startScrollX = scrollX;
}

function duringDrag(e) {
  if (!dragging) return;
  const currentX = e.touches ? e.touches[0].clientX : e.clientX;
  const dx = dragStartX - currentX;
  scrollX = Math.max(0, startScrollX + dx);
  drawPile();
}

function endDrag() {
  dragging = false;
}

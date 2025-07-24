let blowCount = 0;
let pileHeight = 80;
let surfaceHeight = pileHeight;
let startTime = null;
let footLogData = [];

document.addEventListener('DOMContentLoaded', () => {
  drawTicks();
  updateDisplay();
});

function drawTicks() {
  const container = document.getElementById('pileContainer');
  for (let i = 0; i <= pileHeight; i++) {
    const tick = document.createElement('div');
    tick.classList.add('tick');
    tick.style.top = `${(i / pileHeight) * 100}%`;

    const label = document.createElement('div');
    label.classList.add('tick-label');
    const footVal = pileHeight - i;
    label.textContent = footVal;
    label.style.top = `${(i / pileHeight) * 100}%`;
    label.onclick = () => onPileClick(footVal);

    container.appendChild(tick);
    container.appendChild(label);
  }
}

function onPileClick(footVal) {
  if (footVal !== surfaceHeight) {
    const now = Date.now();
    const elapsedMin = startTime ? (now - startTime) / 60000 : 0;
    const bpm = elapsedMin > 0 ? blowCount / elapsedMin : 0;

    const penetration = pileHeight - footVal;
    const bpf = penetration > 0 ? blowCount / penetration : 0;

    surfaceHeight = footVal;
    updateDisplay();

    const row = {
      blow: blowCount,
      time: new Date(now).toLocaleTimeString(),
      height: footVal,
      bpm: bpm.toFixed(1),
      bpf: bpf.toFixed(1)
    };

    footLogData.push(row);
    addTableRow(row);
  }
}

function recordBlow() {
  blowCount++;
  if (!startTime) {
    startTime = Date.now();
  }
  updateDisplay();
}

function updateDisplay() {
  document.getElementById('blowCount').textContent = blowCount;
  document.getElementById('surfaceHeight').textContent = surfaceHeight.toFixed(2);

  const penetration = pileHeight - surfaceHeight;
  const bpf = penetration > 0 ? blowCount / penetration : 0;
  document.getElementById('bpf').textContent = bpf.toFixed(1);
}

function addTableRow(data) {
  const tableBody = document.getElementById('footTableBody');
  const row = document.createElement('tr');
  row.innerHTML = `
    <td>${data.blow}</td>
    <td>${data.time}</td>
    <td>${data.height}</td>
    <td>${data.bpm}</td>
    <td>${data.bpf}</td>
  `;
  tableBody.appendChild(row);
}

function exportLog() {
  if (footLogData.length === 0) {
    alert("No data to export.");
    return;
  }

  let csvContent = "data:text/csv;charset=utf-8,Blow,Time,SurfaceHeight,BPM,BPF\n";
  footLogData.forEach(row => {
    csvContent += `${row.blow},${row.time},${row.height},${row.bpm},${row.bpf}\n`;
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", "pile_log.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

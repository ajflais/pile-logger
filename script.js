let blowCount = 0;
let pileHeight = 80;
let surfaceHeight = pileHeight;
let startTime = null;
let footLogData = [];

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('surfaceHeight').textContent = surfaceHeight.toFixed(2);
  drawTicks();
});

function drawTicks() {
  const container = document.getElementById('tickContainer');
  for (let i = pileHeight; i >= 0; i--) {
    const tick = document.createElement('div');
    tick.classList.add('tick');
    tick.style.top = `${((pileHeight - i) / pileHeight) * 100}%`;

    const label = document.createElement('span');
    label.textContent = i;
    label.onclick = () => onPileClick(i);

    tick.appendChild(label);
    container.appendChild(tick);
  }
}

function markHeight() {
  alert('Tap one of the blue foot circles below the pile bar to set the current surface height.');
}

function onPileClick(clickedValue) {
  const newSurfaceHeight = Math.round(clickedValue);

  if (newSurfaceHeight !== surfaceHeight) {
    const now = Date.now();

    const elapsedMin = startTime ? (now - startTime) / 60000 : 0;
    const bpm = elapsedMin > 0 ? blowCount / elapsedMin : 0;

    const penetration = pileHeight - newSurfaceHeight;
    const bpf = penetration > 0 ? blowCount / penetration : 0;

    const formattedTime = formatTime(new Date(now));

    const entry = {
      blow: blowCount,
      time: formattedTime,
      height: newSurfaceHeight,
      bpm: bpm.toFixed(1),
      bpf: bpf.toFixed(1)
    };

    footLogData.push(entry);

    surfaceHeight = newSurfaceHeight;
    document.getElementById('surfaceHeight').textContent = surfaceHeight.toFixed(2);
    updateBPFandVisual();

    // Add new row to top of table
    const tableBody = document.getElementById('footTableBody');
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${entry.blow}</td>
      <td>${entry.time}</td>
      <td>${entry.height}</td>
      <td>${entry.bpm}</td>
      <td>${entry.bpf}</td>
    `;
    tableBody.insertBefore(row, tableBody.firstChild);
  }
}

function recordBlow() {
  blowCount++;
  document.getElementById('blowCount').textContent = blowCount;

  if (!startTime) {
    startTime = Date.now();
  }

  updateBPFandVisual();
}

function updateBPFandVisual() {
  const penetration = pileHeight - surfaceHeight;
  const bpf = penetration > 0 ? blowCount / penetration : 0;
  document.getElementById('bpf').textContent = bpf.toFixed(1);
}

function exportLog() {
  if (footLogData.length === 0) {
    alert("No data to export.");
    return;
  }

  if (!confirm("Export pile driving log CSV now?")) {
    return;
  }

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

function formatTime(date) {
  const options = {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  };
  return new Intl.DateTimeFormat('en-US', options).format(date);
}

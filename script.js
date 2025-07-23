let blowTimes = []; 
let mediaStream = null;
let audioContext, processor, mic;
let threshold = 0.25;
let running = false;

document.getElementById('pileForm').addEventListener('submit', startRecording);
document.getElementById('stopBtn').addEventListener('click', stopRecording);
document.getElementById('exportBtn').addEventListener('click', exportCSV);

function startRecording(e) {
  e.preventDefault();
  blowTimes = [];
  running = true;
  document.getElementById('pileForm').style.display = 'none';
  document.getElementById('recordingUI').style.display = 'block';

  navigator.mediaDevices.getUserMedia({ audio: true })
    .then(stream => {
      mediaStream = stream;
      audioContext = new AudioContext();
      mic = audioContext.createMediaStreamSource(stream);
      processor = audioContext.createScriptProcessor(2048, 1, 1);

      mic.connect(processor);
      processor.connect(audioContext.destination);

      processor.onaudioprocess = e => {
        let input = e.inputBuffer.getChannelData(0);
        let peak = Math.max(...input.map(Math.abs));
        let now = Date.now();
        if (peak > threshold) {
          if (blowTimes.length === 0 || (now - blowTimes[blowTimes.length - 1]) > 300) {
            blowTimes.push(now);
            updateDisplay();
          }
        }
      };
    });
}

function stopRecording() {
  running = false;
  mediaStream.getTracks().forEach(track => track.stop());
  processor.disconnect();
  mic.disconnect();
}

function updateDisplay() {
  document.getElementById('blowCount').textContent = blowTimes.length;

  if (blowTimes.length >= 2) {
    let intervals = [];
    for (let i = 1; i < blowTimes.length; i++) {
      intervals.push((blowTimes[i] - blowTimes[i - 1]) / 1000);
    }
    let avg = intervals.reduce((a, b) => a + b) / intervals.length;
    let bpm = 60 / avg;
    document.getElementById('bpm').textContent = bpm.toFixed(1);
  }

  let penetration = (blowTimes.length * (1 / 12)).toFixed(2);
  document.getElementById('penetration').textContent = penetration;
}

function exportCSV() {
  let pileId = document.getElementById('pileId').value;
  let pileType = document.getElementById('pileType').value;
  let startTime = new Date(blowTimes[0]).toLocaleString();
  let endTime = new Date(blowTimes[blowTimes.length - 1]).toLocaleString();
  let rows = [
    ['Pile ID', pileId],
    ['Pile Type', pileType],
    ['Start Time', startTime],
    ['End Time', endTime],
    ['Total Blows', blowTimes.length],
    ['Penetration (ft)', (blowTimes.length * (1 / 12)).toFixed(2)],
    [],
    ['Blow #', 'Time (ms)']
  ];

  blowTimes.forEach((time, i) => {
    rows.push([i + 1, time]);
  });

  let csv = rows.map(r => r.join(',')).join('\n');
  let blob = new Blob([csv], { type: 'text/csv' });
  saveAs(blob, `${pileId || 'pile'}_log.csv`);
}

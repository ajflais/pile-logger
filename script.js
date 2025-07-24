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
        const bpfVal = penetration > 0 ? blowCount / penetration : 0;

        let recentBPM = '';
        let recentBPF = '';
        if (footLogData.length > 0) {
          const last = footLogData[0];
          const lastTime = new Date(last.time).getTime();
          const deltaMin = (now - lastTime) / 60000;
          const deltaBlows = blowCount - last.blow;
          const deltaFeet = Math.abs(last.height - newSurfaceHeight);
          recentBPM = deltaMin > 0 ? (deltaBlows / deltaMin).toFixed(1) : '0.0';
          recentBPF = deltaFeet > 0 ? (deltaBlows / deltaFeet).toFixed(1) : '0.0';
        } else {
          recentBPM = bpm.toFixed(1);
          recentBPF = bpfVal.toFixed(1);
        }

        const entry = {
          blow: blowCount,
          time: formatDateTime(now),
          height: newSurfaceHeight,
          bpm: bpm.toFixed(1),
          bpf: bpfVal.toFixed(1),
          recentBPM,
          recentBPF
        };

        footLogData.unshift(entry);

        const tableBody = document.getElementById('footTableBody');
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${pileName}</td>
          <td>${entry.blow}</td>
          <td>${entry.time}</td>
          <td>${Math.round(entry.height)}</td>
          <td>${entry.bpm}</td>
          <td>${entry.bpf}</td>
          <td>${entry.recentBPM}</td>
          <td>${entry.recentBPF}</td>
        `;
        tableBody.insertBefore(row, tableBody.firstChild);

        surfaceHeight = newSurfaceHeight;
        document.getElementById('surfaceHeight').textContent = Math.round(surfaceHeight);
        updateBPFandVisual();
      }
      return;
    }
  }
}

function exportLog() {
  if (footLogData.length === 0) {
    alert("No data to export.");
    return;
  }

  if (!confirm("Export pile driving log CSV now?")) return;

  let csvContent = "data:text/csv;charset=utf-8,PileName,Blow,Time,SurfaceHeight(ft),BPM,BPF,RecentBPM,RecentBPF\n";
  footLogData.forEach(row => {
    csvContent += `${pileName},${row.blow},${row.time},${Math.round(row.height)},${row.bpm},${row.bpf},${row.recentBPM},${row.recentBPF}\n`;
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `pile_log_${new Date().toISOString().slice(0,10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

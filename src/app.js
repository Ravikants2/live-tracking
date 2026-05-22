document.addEventListener('DOMContentLoaded',()=>{
  const tabs = Array.from(document.querySelectorAll('.tab'))
  const panels = Array.from(document.querySelectorAll('.panel'))

  function activate(name){
    tabs.forEach(t=>{
      const is = t.dataset.tab===name
      t.classList.toggle('active', is)
      t.setAttribute('aria-selected', String(is))
    })
    panels.forEach(p=>{
      const shown = p.id===name
      p.classList.toggle('active', shown)
      if(shown){ p.removeAttribute('hidden') } else { p.setAttribute('hidden','') }
    })
  }

  tabs.forEach(t=>t.addEventListener('click',()=>activate(t.dataset.tab)))

  // Keyboard support
  let idx = 0
  document.querySelector('.tabs').addEventListener('keydown', (e)=>{
    const key = e.key
    if(key==='ArrowRight' || key==='ArrowLeft'){
      e.preventDefault()
      idx = tabs.findIndex(t=>t.classList.contains('active'))
      idx = (key==='ArrowRight') ? (idx+1)%tabs.length : (idx-1+tabs.length)%tabs.length
      tabs[idx].focus(); tabs[idx].click()
    }
  })

  // simple upload handler (placeholder)
  const form = document.getElementById('uploadForm')
  if(form){
    form.addEventListener('submit', (e)=>{
      e.preventDefault()
      const f = document.getElementById('fileInput')
      const result = document.getElementById('uploadResult')
      result.innerHTML = ''
      if(!(f && f.files && f.files.length>0)){
        result.innerHTML = '<div style="color:#f88">Please pick a file to upload.</div>'
        return
      }
      const file = f.files[0]
      if(!file.name.toLowerCase().endsWith('.csv')){
        result.innerHTML = '<div style="color:#f88">Please upload a CSV file (you can save Excel as CSV).</div>'
        return
      }
      const reader = new FileReader()
      reader.onload = (ev)=>{
        const text = ev.target.result
        const rows = parseCSV(text)
        if(rows.length===0){ result.innerHTML = '<div style="color:#f88">File appears empty.</div>'; return }
        const header = rows[0].map(h=>h.trim())
        const required = ['Zone','State','City','TC Type','TC Code','TC Name','Candidate count']
        const missing = required.filter(r=> !header.includes(r))
        if(missing.length>0){
          result.innerHTML = `<div style="color:#f88">Missing columns: ${missing.join(', ')}</div>`
          return
        }
        // build preview table (up to 20 rows)
        const previewRows = rows.slice(0,21) // header + 20
        let html = '<div style="margin-bottom:8px;color:var(--muted)">Preview (first 20 rows):</div>'
        html += '<table class="users-table"><thead><tr>' + previewRows[0].map(h=>`<th>${escapeHtml(h)}</th>`).join('') + '</tr></thead><tbody>'
        for(let i=1;i<previewRows.length;i++){
          html += '<tr>' + previewRows[i].map(c=>`<td>${escapeHtml(c)}</td>`).join('') + '</tr>'
        }
        html += '</tbody></table>'
        // add send button
        html += '<div style="margin-top:10px"><button id="sendUpload" class="btn">Send to server</button></div>'
        result.innerHTML = html
        // attach handler to send parsed rows as JSON to /upload
        document.getElementById('sendUpload').addEventListener('click', async ()=>{
          try{
            const objRows = rows.slice(1).map(r=>{
              const o = {}
              for(let i=0;i<header.length;i++) o[header[i]] = r[i]
              return o
            })
            const res = await fetch('/upload',{ method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(objRows) })
            const j = await res.json()
            result.innerHTML = result.innerHTML + `<div style="margin-top:8px;color:var(--muted)">Server response: ${escapeHtml(JSON.stringify(j))}</div>`
          }catch(err){ result.innerHTML = result.innerHTML + `<div style="color:#f88">Send failed: ${escapeHtml(String(err))}</div>` }
        })
      }
      reader.readAsText(file)
    })
  }

  function parseCSV(text){
    // basic CSV parser handling quoted fields
    const rows = []
    let cur = ''
    let row = []
    let inQuotes = false
    for(let i=0;i<text.length;i++){
      const ch = text[i]
      if(ch === '"'){
        if(inQuotes && text[i+1] === '"'){ cur += '"'; i++; continue }
        inQuotes = !inQuotes
        continue
      }
      if(ch === ',' && !inQuotes){ row.push(cur); cur = ''; continue }
      if((ch === '\n' || ch === '\r') && !inQuotes){
        if(cur !== '' || row.length>0){ row.push(cur); rows.push(row); row = []; cur = '' }
        // handle \r\n
        if(ch === '\r' && text[i+1] === '\n') i++
        continue
      }
      cur += ch
    }
    if(cur !== '' || row.length>0){ row.push(cur); rows.push(row) }
    // trim possible empty last line
    if(rows.length>0 && rows[rows.length-1].length===1 && rows[rows.length-1][0].trim()==='') rows.pop()
    return rows
  }

  function escapeHtml(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') }
  
  // connect to server-sent events for live updates
  if(typeof EventSource !== 'undefined'){
    const es = new EventSource('/events')
    es.onmessage = (ev)=>{
      try{
        const d = JSON.parse(ev.data)
        // update dashboard cards (assumes order: iON Live streaming, Active Venues, Alerts)
        const vals = document.querySelectorAll('.card .card-value')
        if(vals.length>=3){
          vals[0].textContent = d.liveStreams
          vals[1].textContent = d.activeVenues
          vals[2].textContent = d.alerts
        }
        // optional: log streams
        console.debug('live update', d)
      }catch(err){ console.error('SSE parse', err) }
    }
    es.onerror = (e)=>{ console.warn('EventSource error', e) }
  }
})

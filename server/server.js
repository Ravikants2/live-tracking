const http = require('http')
const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '..')
const clients = []

function sendSSE(res, data){
  try{ res.write(`data: ${JSON.stringify(data)}\n\n`) }catch(e){/*ignore*/}
}

const server = http.createServer((req,res)=>{
  if(req.url === '/events'){
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin':'*'
    })
    res.write('\n')
    clients.push(res)
    req.on('close', ()=>{
      const i = clients.indexOf(res); if(i!==-1) clients.splice(i,1)
    })
    return
  }

  if(req.method === 'POST' && req.url === '/upload'){
    // accept JSON payload from frontend (array of rows)
    let body = ''
    req.on('data', chunk=> body += chunk)
    req.on('end', ()=>{
      try{
        const data = JSON.parse(body)
        const uploadsDir = path.join(root, 'uploads')
        if(!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir)
        const fname = path.join(uploadsDir, `upload-${Date.now()}.json`)
        fs.writeFileSync(fname, JSON.stringify(data, null, 2))
        res.writeHead(200, {'Content-Type':'application/json'})
        res.end(JSON.stringify({ status:'ok', saved: fname }))
      }catch(err){
        res.writeHead(400, {'Content-Type':'application/json'})
        res.end(JSON.stringify({ status:'error', message: String(err) }))
      }
    })
    return
  }

  // serve static files from project root
  const urlPath = req.url === '/' ? '/index.html' : req.url
  const filePath = path.join(root, urlPath)
  fs.readFile(filePath, (err,data)=>{
    if(err){ res.writeHead(404); res.end('Not found'); return }
    const ext = path.extname(filePath).toLowerCase()
    const map = {'.html':'text/html','.css':'text/css','.js':'application/javascript','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml'}
    res.writeHead(200, {'Content-Type': map[ext]||'application/octet-stream'})
    res.end(data)
  })
})

// simulate live data and broadcast to connected SSE clients
let tick = 0
setInterval(()=>{
  tick++
  const liveStreams = Math.max(0, 2 + Math.round(Math.sin(tick/3) + (Math.random()*2 - 0.5)))
  const activeVenues = Math.max(0, 1 + Math.round(Math.cos(tick/5)))
  const alerts = Math.random() > 0.8 ? Math.floor(Math.random()*3) : 0
  const streams = [
    {id:1, venue:'Main Hall', status: Math.random()>0.3 ? 'live' : 'idle'},
    {id:2, venue:'Side Stage', status: Math.random()>0.6 ? 'live' : 'idle'},
  ]
  const payload = { liveStreams, activeVenues, alerts, streams, ts: Date.now() }
  clients.forEach(c=> sendSSE(c,payload))
}, 3000)

const port = process.env.PORT || 3000
server.listen(port, ()=> console.log(`Dev server running at http://localhost:${port}`))

const $ = (s) => document.querySelector(s);
let project = { repository: 'farriiig/proxypulse-mvp', generated_branch: 'generated' };
let toastTimer;

async function getJSON(path){
  const sep = path.includes('?') ? '&' : '?';
  const response = await fetch(`${path}${sep}v=${Date.now()}`, { cache: 'no-store' });
  if(!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.json();
}
function esc(v=''){return String(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
function fmtTime(iso){if(!iso)return '—';try{return new Intl.DateTimeFormat(undefined,{dateStyle:'medium',timeStyle:'short'}).format(new Date(iso));}catch{return iso;}}
function badge(status){return `<span class="status status-${String(status||'').toLowerCase()}">${esc(status||'—')}</span>`;}
function fmtMs(v){return v==null?'—':`${Math.round(Number(v))} ms`;}
function showToast(message){const t=$('#toast');t.textContent=message;t.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),1800);}
async function copyText(text){try{await navigator.clipboard.writeText(text);showToast('Copied to clipboard');}catch{showToast('Copy failed');}}

function renderProtocols(protocols={}){
  const entries = Object.entries(protocols).sort((a,b)=>b[1]-a[1]);
  const max = Math.max(1,...entries.map(x=>x[1]));
  $('#protocols').innerHTML = entries.length ? entries.map(([name,count])=>`<div><div class="bar-meta"><span>${esc(name.toUpperCase())}</span><span>${count}</span></div><div class="bar"><i style="width:${Math.max(2,count/max*100)}%"></i></div></div>`).join('') : '<div class="empty">No protocol data.</div>';
}

function renderHealth(statuses={}){
  const preferred=['HEALTHY','STABLE','RECOVERED','NEW','DEGRADING','WEAK','OFFLINE'];
  const keys=[...preferred.filter(k=>k in statuses),...Object.keys(statuses).filter(k=>!preferred.includes(k))];
  $('#health').innerHTML = keys.length ? keys.map(k=>`<div class="health-item"><div>${badge(k)}</div><strong>${statuses[k]}</strong></div>`).join('') : '<div class="empty">No health data.</div>';
}

function renderSubscriptions(manifest={}){
  const order=['best100','stable','fast','gaming','healthy','reality','online','all','vless','vmess','trojan','ss','hysteria2','tuic'];
  const names=[...order.filter(n=>manifest[n]),...Object.keys(manifest).filter(n=>!order.includes(n))];
  $('#subscriptions').innerHTML = names.length ? names.map(name=>{
    const item=manifest[name]||{};
    const path=item.path||`subscriptions/${name}.txt`;
    const url=new URL(path,window.location.href).href;
    // Both clients accept the public subscription URL through their custom URI schemes.
    const incyUrl=`incy://import/${url}`;
    const happUrl=`happ://add/${url}`;
    return `<div class="endpoint">
      <div class="endpoint-main"><strong>${esc(name)}</strong><span>${Number(item.count||0)} nodes</span></div>
      <div class="endpoint-actions">
        <a class="app-import app-incy" href="${esc(incyUrl)}" title="Import this subscription into Incy" aria-label="Add ${esc(name)} subscription to Incy">Incy</a>
        <a class="app-import app-happ" href="${esc(happUrl)}" title="Import this subscription into Happ" aria-label="Add ${esc(name)} subscription to Happ">Happ</a>
        <button type="button" data-copy="${esc(url)}">Copy</button>
        <a href="${esc(path)}" target="_blank" rel="noreferrer">Open</a>
      </div>
    </div>`;
  }).join('') : '<div class="empty">No subscription output yet.</div>';
  document.querySelectorAll('[data-copy]').forEach(btn=>btn.addEventListener('click',()=>copyText(btn.dataset.copy)));
}

async function load(){
  $('#notice').className='notice loading';
  $('#notice').textContent='Loading the latest snapshot…';
  try{
    const [stats,proj]=await Promise.all([
      getJSON('./data/stats.json'),getJSON('./data/project.json')
    ]);
    project=proj||project;
    $('#discovered').textContent=stats.discovered_nodes??'—';
    $('#scanned').textContent=stats.scanned_nodes??'—';
    $('#online').textContent=stats.online_nodes??'—';
    $('#onlineRate').textContent=`${Number(stats.online_rate||0).toFixed(1)}% of scanned`;
    $('#latency').textContent=stats.avg_latency_ms?`${Math.round(stats.avg_latency_ms)} ms`:'—';
    $('#avgScore').textContent=Number(stats.avg_score||0).toFixed(1);
    $('#reality').textContent=stats.reality_nodes??0;
    $('#lastUpdate').textContent=fmtTime(stats.generated_at);
    renderSubscriptions(stats.subscriptions||{});renderProtocols(stats.protocols||{});renderHealth(stats.statuses||{});

    const repo=`https://github.com/${project.repository}`;
    $('#repoLink').href=repo;$('#actionsLink').href=`${repo}/actions`;
    $('#notice').className='notice ok';
    $('#notice').textContent=`Live snapshot · ${stats.test_level||'TCP pre-check'}`;
  }catch(err){
    $('#notice').className='notice bad';
    $('#notice').textContent=`Could not load snapshot: ${err.message}. Run the GitHub workflow once.`;
  }
}

$('#refreshBtn').addEventListener('click',load);
load();

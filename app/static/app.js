const $ = (s) => document.querySelector(s);
let allNodes = [];
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

function renderNodes(){
  const q = ($('#search')?.value||'').trim().toLowerCase();
  const protocol = $('#protocolFilter')?.value||'';
  const status = $('#statusFilter')?.value||'';
  const filtered = allNodes
    .filter(n=>!protocol||n.protocol===protocol)
    .filter(n=>!status||n.status===status)
    .filter(n=>!q||`${n.protocol} ${n.host} ${n.port} ${n.security||''} ${n.transport||''} ${n.name||''}`.toLowerCase().includes(q));
  const rows = filtered.slice(0,150);
  $('#nodeCountLabel').textContent = `${filtered.length} matching · showing ${rows.length}`;
  $('#nodes').innerHTML = rows.length ? rows.map(n=>`<tr>
    <td><span class="proto">${esc(n.protocol)}</span></td>
    <td><code>${esc(n.host)}:${n.port}</code><div class="node-name" title="${esc(n.name||'')}">${esc(n.name||'')}</div></td>
    <td>${esc(n.security||'—')}<div class="source-meta risk-${String(n.config_risk||'low').toLowerCase()}">${esc(n.config_risk||'LOW')} config risk</div></td>
    <td>${badge(n.status)}</td>
    <td class="num">${fmtMs(n.latency_ms)}</td>
    <td class="num">${fmtMs(n.jitter_ms)}</td>
    <td class="num">${Number(n.uptime||0).toFixed(1)}%</td>
    <td class="num score-strong">${Number(n.score||0).toFixed(1)}</td>
    <td class="num">${Number(n.gaming_score||0).toFixed(1)}</td>
  </tr>`).join('') : '<tr><td colspan="9" class="empty">No matching nodes.</td></tr>';
}

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
    return `<div class="endpoint"><div class="endpoint-main"><strong>${esc(name)}</strong><span>${Number(item.count||0)} nodes</span></div><div class="endpoint-actions"><button type="button" data-copy="${esc(url)}">Copy</button><a href="${esc(path)}" target="_blank" rel="noreferrer">Open</a></div></div>`;
  }).join('') : '<div class="empty">No subscription output yet.</div>';
  document.querySelectorAll('[data-copy]').forEach(btn=>btn.addEventListener('click',()=>copyText(btn.dataset.copy)));
}

function renderSources(sources=[]){
  const sorted=[...sources].sort((a,b)=>Number(b.reputation||0)-Number(a.reputation||0));
  $('#sources').innerHTML = sorted.length ? sorted.map(s=>`<div class="source"><div class="source-main"><span class="dot ${s.status==='ok'?'dot-ok':'dot-bad'}"></span><div style="min-width:0"><div class="url" title="${esc(s.url)}">${esc(s.url)}</div><div class="source-meta">${s.status==='ok'?`${s.valid} valid · ${Math.round(s.fetch_ms||0)} ms`:`${esc(s.error||'Fetch failed')}`}</div></div></div><div class="source-score"><strong>${Number(s.reputation||0).toFixed(1)}</strong><span>reputation</span></div></div>`).join('') : '<div class="empty">No sources configured.</div>';
}

async function load(){
  $('#notice').className='notice loading';
  $('#notice').textContent='Loading the latest snapshot…';
  try{
    const [stats,nodes,sources,proj]=await Promise.all([
      getJSON('./data/stats.json'),getJSON('./data/nodes.json'),getJSON('./data/sources.json'),getJSON('./data/project.json')
    ]);
    project=proj||project;allNodes=Array.isArray(nodes)?nodes:[];
    $('#discovered').textContent=stats.discovered_nodes??'—';
    $('#scanned').textContent=stats.scanned_nodes??'—';
    $('#online').textContent=stats.online_nodes??'—';
    $('#onlineRate').textContent=`${Number(stats.online_rate||0).toFixed(1)}% of scanned`;
    $('#latency').textContent=stats.avg_latency_ms?`${Math.round(stats.avg_latency_ms)} ms`:'—';
    $('#avgScore').textContent=Number(stats.avg_score||0).toFixed(1);
    $('#reality').textContent=stats.reality_nodes??0;
    $('#lastUpdate').textContent=fmtTime(stats.generated_at);
    renderSubscriptions(stats.subscriptions||{});renderProtocols(stats.protocols||{});renderHealth(stats.statuses||{});renderSources(sources||[]);

    const protocols=[...new Set(allNodes.map(n=>n.protocol).filter(Boolean))].sort();
    $('#protocolFilter').innerHTML='<option value="">All protocols</option>'+protocols.map(p=>`<option value="${esc(p)}">${esc(p.toUpperCase())}</option>`).join('');
    const statuses=[...new Set(allNodes.map(n=>n.status).filter(Boolean))].sort();
    $('#statusFilter').innerHTML='<option value="">All states</option>'+statuses.map(s=>`<option value="${esc(s)}">${esc(s)}</option>`).join('');
    renderNodes();

    const repo=`https://github.com/${project.repository}`;
    $('#repoLink').href=repo;$('#actionsLink').href=`${repo}/actions`;$('#sourcesEditLink').href=`${repo}/edit/main/settings/sources.txt`;
    $('#notice').className='notice ok';
    $('#notice').textContent=`Live snapshot · ${stats.test_level||'TCP pre-check'} · ${stats.source_ok||0}/${stats.source_count||0} sources online`;
  }catch(err){
    $('#notice').className='notice bad';
    $('#notice').textContent=`Could not load snapshot: ${err.message}. Run the GitHub workflow once.`;
  }
}

$('#refreshBtn').addEventListener('click',load);
$('#search').addEventListener('input',renderNodes);
$('#protocolFilter').addEventListener('change',renderNodes);
$('#statusFilter').addEventListener('change',renderNodes);
load();

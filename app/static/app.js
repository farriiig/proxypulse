const $ = (s) => document.querySelector(s);
let project = { repository: 'farriiig/proxypulse-mvp', generated_branch: 'generated' };
let toastTimer;
let regionNames;
let latestStats = null;
let currentCountryManifest = {};
let currentProfileManifest = {};
let activeProfile = 'balanced';
const FAVORITES_KEY = 'proxypulse-country-favorites-v1';
try{if(typeof Intl.DisplayNames==='function')regionNames=new Intl.DisplayNames([navigator.language||'en'],{type:'region'});}catch{}

async function getJSON(path){
  const sep = path.includes('?') ? '&' : '?';
  const response = await fetch(`${path}${sep}v=${Date.now()}`, { cache: 'no-store' });
  if(!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.json();
}
async function getJSONOptional(path,fallback){try{return await getJSON(path);}catch{return fallback;}}
function esc(v=''){return String(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
function fmtTime(iso){if(!iso)return '—';try{return new Intl.DateTimeFormat(undefined,{dateStyle:'medium',timeStyle:'short'}).format(new Date(iso));}catch{return iso;}}
function badge(status){return `<span class="status status-${String(status||'').toLowerCase()}">${esc(status||'—')}</span>`;}
function showToast(message){const t=$('#toast');t.textContent=message;t.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),1800);}
async function copyText(text){try{await navigator.clipboard.writeText(text);showToast('Copied to clipboard');}catch{showToast('Copy failed');}}
function setNotice(kind,message){const root=$('#notice');root.className=`notice ${kind}`;$('#noticeText').textContent=message;}

function relativeAge(iso){
  if(!iso)return 'unknown';
  const ms=Math.max(0,Date.now()-new Date(iso).getTime());
  const minutes=Math.floor(ms/60000);
  if(minutes<1)return 'just now';
  if(minutes<60)return `${minutes}m ago`;
  const hours=Math.floor(minutes/60);
  if(hours<48)return `${hours}h ago`;
  return `${Math.floor(hours/24)}d ago`;
}
function updateFreshness(iso){
  const badge=$('#freshnessBadge');
  if(!iso){badge.className='freshness freshness-stale';badge.textContent='No timestamp';return;}
  const ageMinutes=Math.max(0,(Date.now()-new Date(iso).getTime())/60000);
  let state='fresh',label='Fresh';
  if(ageMinutes>=180){state='stale';label='Stale';}
  else if(ageMinutes>=90){state='delayed';label='Delayed';}
  badge.className=`freshness freshness-${state}`;
  badge.textContent=`${label} · ${relativeAge(iso)}`;
}


function iranStatusLabel(status='unknown'){
  return ({healthy:'سالم',degraded:'افت کیفیت',incident:'اختلال',down:'قطع',unknown:'نامشخص'})[String(status).toLowerCase()]||'نامشخص';
}
function clampPercent(value){
  const n=Number(value);return Number.isFinite(n)?Math.max(0,Math.min(100,n)):null;
}
function renderIranInternet(data={}){
  const root=$('#iran-internet');
  if(!root)return;
  const available=Boolean(data&&data.available);
  root.classList.toggle('iran-status-unavailable',!available);
  const state=available?String(data.status||'unknown').toLowerCase():'unknown';
  const dot=$('#iranOverallDot');
  dot.className=`iran-state-dot state-${['healthy','degraded','incident','down'].includes(state)?state:'unknown'}`;
  $('#iranOverall').textContent=available?iranStatusLabel(state):'داده در دسترس نیست';
  $('#iranOverallHint').textContent=available?'خلاصه وضعیت مسیرهای پایش‌شده':'لینک Covered.ir برای بررسی مستقیم در دسترس است';

  const domestic=clampPercent(data?.domestic_healthy_percent);
  const international=clampPercent(data?.international_healthy_percent);
  $('#iranDomesticPercent').textContent=domestic===null?'—':`${domestic}% سالم`;
  $('#iranInternationalPercent').textContent=international===null?'—':`${international}% سالم`;
  $('#iranDomesticBar').style.width=`${domestic??0}%`;
  $('#iranInternationalBar').style.width=`${international??0}%`;
  $('#iranDomesticRoutes').textContent=Number.isFinite(Number(data?.domestic_routes))?`${Number(data.domestic_routes)} مسیر پایش‌شده`:'— مسیر پایش‌شده';
  $('#iranInternationalRoutes').textContent=Number.isFinite(Number(data?.international_routes))?`${Number(data.international_routes)} مسیر پایش‌شده`:'— مسیر پایش‌شده';
  $('#iranIncidents').textContent=Number.isFinite(Number(data?.active_incidents))?String(Number(data.active_incidents)):'—';
  $('#iranMeasured').textContent=data?.last_measured_irst?`آخرین اندازه‌گیری Covered: ${data.last_measured_irst} IRST`:'آخرین اندازه‌گیری: —';
  $('#iranSnapshotAge').textContent=data?.fetched_at?`Snapshot دریافت‌شده ${relativeAge(data.fetched_at)}`:'Snapshot در این اجرا دریافت نشد';
}


const PROFILE_META={
  balanced:{label:'Balanced',icon:'⚖',desc:'Best overall mix of verified status, survival, score and latency.'},
  speed:{label:'Speed',icon:'⚡',desc:'Prioritizes the lowest current TCP latency, then score and verified status.'},
  gaming:{label:'Gaming',icon:'🎮',desc:'Prioritizes Gaming Score, low latency and low rolling jitter.'},
  streaming:{label:'Streaming',icon:'▶',desc:'Prioritizes verified tunnels, survival, uptime and stable jitter.'},
  stability:{label:'Stability',icon:'🛡',desc:'Prioritizes configs that keep surviving across repeated hourly scans.'},
};

function renderSmartProfiles(manifest={}){
  currentProfileManifest=manifest||{};
  const root=$('#profileButtons');
  root.innerHTML=Object.entries(PROFILE_META).map(([key,meta])=>`<button type="button" class="profile-button ${key===activeProfile?'active':''}" data-profile="${key}" role="tab" aria-selected="${key===activeProfile?'true':'false'}"><span>${meta.icon}</span><strong>${meta.label}</strong></button>`).join('');
  renderActiveProfile();
}
function renderActiveProfile(){
  const meta=PROFILE_META[activeProfile]||PROFILE_META.balanced;
  const item=currentProfileManifest[`profile-${activeProfile}`]||{};
  const root=$('#profileResult');
  if(!item.path){root.innerHTML='<div class="empty">Profile output is not available in this snapshot yet.</div>';return;}
  root.innerHTML=`<div class="profile-result-copy"><span class="profile-result-icon">${meta.icon}</span><div><strong>${esc(meta.label)} profile</strong><p>${esc(meta.desc)}</p><small>${Number(item.count||0)} configs · ASN/country diversity guard · refreshed hourly</small></div></div>${subscriptionActions(item,`${meta.label} smart profile`)}`;
}

function renderConnectionIntelligence(stats={}){
  const tested=Number(stats.egress_tested_nodes||0),verified=Number(stats.egress_verified_nodes||0);
  $('#tunnelSuccess').textContent=`${Number(stats.egress_success_rate||0).toFixed(1)}%`;
  $('#tunnelSuccessMeta').textContent=`${verified}/${tested} end-to-end verified`;
  $('#survivalScore').textContent=`${Number(stats.median_survival_score||0).toFixed(1)}`;
  $('#asnDiversity').textContent=String(Number(stats.asn_diversity_count||0));
  $('#asnDiversityMeta').textContent=`${Number(stats.asn_enriched_nodes||0)} verified nodes enriched`;
  $('#rotationCount').textContent=String(Number(stats.subscriptions?.rotating?.count||0));
  const reasons=Object.entries(stats.egress_failure_reasons||{});
  const total=reasons.reduce((sum,[,count])=>sum+Number(count||0),0);
  $('#failureTotal').textContent=total?`${total} failed checks`:'No failed checks';
  const labels={CONFIG_UNSUPPORTED:'Config unsupported',TUNNEL_START_FAILED:'Tunnel start',EGRESS_TIMEOUT:'Timeout',TLS_HANDSHAKE:'TLS / handshake',AUTH_FAILED:'Authentication',DNS_FAILED:'DNS',INVALID_EGRESS_RESPONSE:'Invalid egress response',RUNTIME_MISSING:'Runtime missing',REQUEST_FAILED:'Request failed',OTHER:'Other',UNKNOWN:'Unknown'};
  $('#failureReasons').innerHTML=reasons.length?reasons.map(([key,count])=>`<div class="failure-chip"><span>${esc(labels[key]||key.replaceAll('_',' '))}</span><strong>${Number(count||0)}</strong></div>`).join(''):'<div class="failure-ok">✓ No tunnel failures recorded in this run</div>';
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

function subscriptionActions(item={},label='subscription'){
  const path=item.path||'';
  const url=new URL(path,window.location.href).href;
  const incyUrl=`incy://import/${url}`;
  const happUrl=`happ://add/${url}`;
  const qr=item.qr_path ? `<button type="button" class="qr-action" data-qr="${esc(item.qr_path)}" data-qr-title="${esc(label)}">QR</button>` : '';
  return `<div class="endpoint-actions">
    <a class="app-import app-incy" href="${esc(incyUrl)}" title="Import this ${esc(label)} into Incy" aria-label="Add ${esc(label)} to Incy">Incy</a>
    <a class="app-import app-happ" href="${esc(happUrl)}" title="Import this ${esc(label)} into Happ" aria-label="Add ${esc(label)} to Happ">Happ</a>
    ${qr}
    <button type="button" data-copy="${esc(url)}">Copy</button>
    <a href="${esc(path)}" target="_blank" rel="noreferrer">Open</a>
  </div>`;
}

function renderRecommended(item){
  const root=$('#recommended');
  if(!item){root.innerHTML='';return;}
  const normalized={...item,path:item.path||'subscriptions/recommended.txt'};
  root.innerHTML=`<div class="recommended-card">
    <div class="recommended-copy">
      <span class="recommended-kicker">⭐ SMART PICK</span>
      <strong>Recommended</strong>
      <p>Best current mix of verified status, score, uptime, jitter and latency.</p>
      <span>${Number(item.count||0)} nodes · hard-capped at 100</span>
    </div>
    ${subscriptionActions(normalized,'recommended subscription')}
  </div>`;
}

function renderSubscriptions(manifest={}){
  renderRecommended(manifest.recommended);
  const order=['rotating','verified','best100','stable','fast','gaming','healthy','reality','online','all','vless','vmess','trojan','ss','hysteria2','tuic'];
  const names=[...order.filter(n=>manifest[n]),...Object.keys(manifest).filter(n=>n!=='recommended'&&!n.startsWith('profile-')&&!order.includes(n))];
  const root=$('#subscriptions');
  root.innerHTML = names.length ? names.map(name=>{
    const item=manifest[name]||{};
    const normalized={...item,path:item.path||`subscriptions/${name}.txt`};
    return `<div class="endpoint">
      <div class="endpoint-main"><strong>${esc(name)}</strong><span>${Number(item.count||0)} nodes</span></div>
      ${subscriptionActions(normalized,`${name} subscription`)}
    </div>`;
  }).join('') : '<div class="empty">No subscription output yet.</div>';
}

function flagEmoji(code=''){
  const value=String(code).toUpperCase();
  if(!/^[A-Z]{2}$/.test(value)) return '🌐';
  return String.fromCodePoint(...[...value].map(c=>127397+c.charCodeAt(0)));
}
function countryName(code=''){
  const value=String(code).toUpperCase();
  try{return regionNames?.of(value)||value;}catch{return value;}
}
function loadFavorites(){try{return new Set(JSON.parse(localStorage.getItem(FAVORITES_KEY)||'[]').map(x=>String(x).toLowerCase()));}catch{return new Set();}}
function saveFavorites(set){try{localStorage.setItem(FAVORITES_KEY,JSON.stringify([...set]));}catch{}}

function renderCountries(manifest={}){
  currentCountryManifest=manifest||{};
  const root=$('#countries');
  const favorites=loadFavorites();
  const entries=Object.entries(manifest).sort((a,b)=>{
    const af=favorites.has(a[0].toLowerCase())?1:0,bf=favorites.has(b[0].toLowerCase())?1:0;
    return bf-af||Number(b[1]?.count||0)-Number(a[1]?.count||0)||a[0].localeCompare(b[0]);
  });
  root.innerHTML = entries.length ? entries.map(([key,item])=>{
    const code=String(item.code||key).toUpperCase();
    const normalized={...item,path:item.path||`subscriptions/countries/${key}.txt`};
    const name=countryName(code);
    const favorite=favorites.has(key.toLowerCase());
    return `<div class="endpoint country-endpoint ${favorite?'country-favorite':''}">
      <div class="country-main">
        <div class="country-title-row">
          <button class="favorite-button" type="button" data-favorite-country="${esc(key)}" aria-pressed="${favorite?'true':'false'}" title="${favorite?'Remove from favorites':'Add to favorites'}">${favorite?'★':'☆'}</button>
          <span class="country-flag" aria-hidden="true">${flagEmoji(code)}</span>
          <div class="country-title-copy">
            <div class="country-title"><strong>${esc(name)}</strong><span class="country-code">${esc(code)}</span></div>
            <span class="country-count">${Number(item.count||0)} end-to-end verified nodes${Number(item.asn_count||0)?` · ${Number(item.asn_count)} ASNs`:''}</span>
          </div>
        </div>
      </div>
      <div class="country-actions-wrap">${subscriptionActions(normalized,`${name} country subscription`)}</div>
    </div>`;
  }).join('') : '<div class="empty">No country subscriptions yet. They appear only after a config passes the end-to-end tunnel and final-IP check.</div>';
}

function sparkline(values=[]){
  const nums=values.map(Number).filter(Number.isFinite);
  if(!nums.length)return '<div class="spark-empty">No history yet</div>';
  const width=320,height=76,pad=5;
  const min=Math.min(...nums),max=Math.max(...nums),span=Math.max(1,max-min);
  const points=nums.map((v,i)=>{
    const x=nums.length===1?width/2:pad+(i/(nums.length-1))*(width-pad*2);
    const y=height-pad-((v-min)/span)*(height-pad*2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  return `<svg class="sparkline" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-hidden="true"><polyline points="${points}" /></svg>`;
}
function renderHistory(history=[]){
  const root=$('#historyGrid');
  const recent=(Array.isArray(history)?history:[]).slice(-24);
  const defs=[
    ['online','Online nodes',v=>`${Math.round(v)}`],
    ['avg_latency_ms','Avg latency',v=>`${Math.round(v)} ms`],
    ['verified','Verified',v=>`${Math.round(v)}`],
    ['tunnel_success_rate','Tunnel success',v=>`${Number(v).toFixed(1)}%`],
    ['survival_score','Survival score',v=>`${Number(v).toFixed(1)}`],
    ['countries','Countries',v=>`${Math.round(v)}`],
  ];
  root.innerHTML=defs.map(([field,label,format])=>{
    const values=recent.map(x=>Number(x?.[field])).filter(Number.isFinite);
    const current=values.length?values[values.length-1]:0;
    return `<article class="history-card"><div class="history-card-head"><span>${esc(label)}</span><strong>${format(current)}</strong></div>${sparkline(values)}<small>${values.length} hourly samples</small></article>`;
  }).join('');
}

function openQr(path,title){
  const modal=$('#qrModal');
  $('#qrTitle').textContent=title||'Subscription QR';
  $('#qrImage').src=new URL(path,window.location.href).href;
  modal.classList.add('show');
  modal.setAttribute('aria-hidden','false');
  document.body.classList.add('modal-open');
}
function closeQr(){
  const modal=$('#qrModal');
  modal.classList.remove('show');
  modal.setAttribute('aria-hidden','true');
  $('#qrImage').removeAttribute('src');
  document.body.classList.remove('modal-open');
}

async function load(){
  setNotice('loading','Loading the latest snapshot…');
  try{
    const [stats,proj,history,iranInternet]=await Promise.all([
      getJSON('./data/stats.json'),
      getJSON('./data/project.json'),
      getJSONOptional('./data/history.json',[]),
      getJSONOptional('./data/iran_internet.json',{available:false,status:'unknown'})
    ]);
    latestStats=stats;
    project=proj||project;
    $('#discovered').textContent=stats.discovered_nodes??'—';
    $('#scanned').textContent=stats.scanned_nodes??'—';
    $('#online').textContent=stats.online_nodes??'—';
    $('#onlineRate').textContent=`${Number(stats.online_rate||0).toFixed(1)}% of scanned`;
    $('#latency').textContent=stats.avg_latency_ms?`${Math.round(stats.avg_latency_ms)} ms`:'—';
    $('#avgScore').textContent=Number(stats.avg_score||0).toFixed(1);
    $('#reality').textContent=stats.reality_nodes??0;
    $('#lastUpdate').textContent=fmtTime(stats.generated_at);
    updateFreshness(stats.generated_at);
    renderSmartProfiles(stats.subscriptions||{});
    renderSubscriptions(stats.subscriptions||{});
    renderCountries(stats.country_subscriptions||{});
    renderConnectionIntelligence(stats);
    renderIranInternet(iranInternet);
    renderHistory(history);
    renderProtocols(stats.protocols||{});
    renderHealth(stats.statuses||{});

    const tested=Number(stats.egress_tested_nodes||0);
    const verified=Number(stats.egress_verified_nodes||0);
    const geolocated=Number(stats.egress_geolocated_nodes||0);
    const countries=Number(stats.egress_country_count||0);
    $('#egressSummary').textContent=stats.egress_runtime_available
      ? `${verified}/${tested} tunnel verified · ${geolocated} geolocated · ${countries} countries`
      : 'End-to-end runtime unavailable in this snapshot';

    const repo=`https://github.com/${project.repository}`;
    $('#repoLink').href=repo;$('#actionsLink').href=`${repo}/actions`;
    setNotice('ok',`Live snapshot · ${stats.test_level||'TCP pre-check'}`);
  }catch(err){
    setNotice('bad',`Could not load snapshot: ${err.message}. Run the GitHub workflow once.`);
    updateFreshness(null);
  }
}

document.addEventListener('click',(event)=>{
  const copy=event.target.closest('[data-copy]');
  if(copy){copyText(copy.dataset.copy||'');return;}
  const profile=event.target.closest('[data-profile]');
  if(profile){activeProfile=String(profile.dataset.profile||'balanced');renderSmartProfiles(currentProfileManifest);return;}
  const favorite=event.target.closest('[data-favorite-country]');
  if(favorite){
    const key=String(favorite.dataset.favoriteCountry||'').toLowerCase();
    const favorites=loadFavorites();
    if(favorites.has(key)){favorites.delete(key);showToast('Removed from favorites');}else{favorites.add(key);showToast('Country pinned to favorites');}
    saveFavorites(favorites);renderCountries(currentCountryManifest);return;
  }
  const qr=event.target.closest('[data-qr]');
  if(qr){openQr(qr.dataset.qr,qr.dataset.qrTitle||'Subscription QR');return;}
  if(event.target.closest('[data-close-qr]')){closeQr();}
});
document.addEventListener('keydown',(event)=>{if(event.key==='Escape')closeQr();});
$('#refreshBtn').addEventListener('click',load);
setInterval(()=>{if(latestStats)updateFreshness(latestStats.generated_at);},60000);
load();

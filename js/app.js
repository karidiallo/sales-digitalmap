
const { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } = window.DM_CONFIG;

if (!SUPABASE_URL || SUPABASE_URL.includes("WSTAW_TUTAJ") ||
    !SUPABASE_PUBLISHABLE_KEY || SUPABASE_PUBLISHABLE_KEY.includes("WSTAW_TUTAJ")) {
  alert("Najpierw uzupełnij js/config.js danymi z Supabase.");
}

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

let currentUser = null;
let leads = [];
let activities = [];
let followFilter = "all";

const stageLabels = {
  NEW_SIGNAL: "NOWY SYGNAŁ",
  RESEARCHED: "SPRAWDZONY",
  READY: "GOTOWY DO KONTAKTU",
  CONTACTED: "KONTAKT",
  CONVERSATION: "ROZMOWA",
  DIAGNOSED: "ZDIAGNOZOWANY",
  PROPOSAL: "PROPOZYCJA",
  DECISION: "DECYZJA",
  CLIENT: "KLIENT",
  CLOSED: "ZAMKNIĘTY"
};

const XP = {
  lead_created: 3,
  research_done: 5,
  first_touch: 10,
  follow_up: 15,
  reply_handled: 20,
  qualified: 30,
  offer_sent: 35,
  won: 100
};

const levelThresholds = [0,100,250,450,700,1000,1400,1900,2500,3250,4100,5000];

function money(v){
  return new Intl.NumberFormat("pl-PL", {style:"currency",currency:"PLN",maximumFractionDigits:0}).format(Number(v||0));
}

function toast(msg){
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(()=>t.classList.remove("show"),1300);
}

function getLevel(xp){
  let level = 1;
  for(let i=1;i<levelThresholds.length;i++){
    if(xp >= levelThresholds[i]) level = i+1;
    else break;
  }
  const currentFloor = levelThresholds[Math.max(0,level-1)] || 0;
  const nextGoal = levelThresholds[level] || (currentFloor + 1000);
  return {level,currentFloor,nextGoal};
}

function getTodayStart(){
  const d = new Date(); d.setHours(0,0,0,0); return d;
}
function getTodayEnd(){
  const d = new Date(); d.setHours(23,59,59,999); return d;
}
function followKind(lead){
  if(!lead.follow_up_at) return "none";
  const d = new Date(lead.follow_up_at);
  const now = new Date();
  if(d < getTodayStart()) return "overdue";
  if(d <= getTodayEnd()) return "today";
  return "upcoming";
}

function userXP(){
  return activities.reduce((s,a)=>s+Number(a.xp||0),0);
}
function xpToday(){
  const start = getTodayStart();
  return activities
    .filter(a=>new Date(a.created_at)>=start)
    .reduce((s,a)=>s+Number(a.xp||0),0);
}
function currentStreak(){
  const days = [...new Set(activities.map(a => new Date(a.created_at).toISOString().slice(0,10)))].sort().reverse();
  if(!days.length) return 0;
  let streak=0;
  let cursor = new Date();
  cursor.setHours(0,0,0,0);
  for(let i=0;i<365;i++){
    const key = cursor.toISOString().slice(0,10);
    if(days.includes(key)) streak++;
    else if(i===0) {}
    else break;
    cursor.setDate(cursor.getDate()-1);
  }
  return streak;
}

async function logActivity(type, leadId=null, note=null){
  await sb.from("activities").insert({
    user_id: currentUser.id,
    lead_id: leadId,
    type,
    xp: XP[type] ?? 0,
    note
  });
}

async function loadData(){
  const [lr, ar] = await Promise.all([
    sb.from("leads").select("*").order("created_at",{ascending:false}),
    sb.from("activities").select("*").order("created_at",{ascending:false})
  ]);
  if(lr.error) console.error(lr.error);
  if(ar.error) console.error(ar.error);
  leads = lr.data || [];
  activities = ar.data || [];
  renderAll();
}

function renderAll(){
  renderMetrics();
  renderFocus();
  renderTodayQueue();
  renderFollowups();
  renderLeads();
  renderJourney();
  renderProgress();
}

function renderMetrics(){
  const xp = userXP();
  const level = getLevel(xp);
  const pct = Math.max(0, Math.min(100, ((xp-level.currentFloor)/(level.nextGoal-level.currentFloor))*100 || 0));
  const streak = currentStreak();

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const wonThisMonth = leads.filter(l=>l.won_at && new Date(l.won_at)>=monthStart);
  const rev = wonThisMonth.reduce((s,l)=>s+Number(l.won_value||0),0);
  const active = leads.filter(l=>!["CLIENT","CLOSED"].includes(l.stage));
  const activeValue = active.reduce((s,l)=>s+Number(l.estimated_value||0),0);
  const decisions = leads.filter(l=>l.stage==="DECISION").length;
  const won = leads.filter(l=>l.stage==="CLIENT").length;
  const avg = wonThisMonth.length ? rev/wonThisMonth.length : 0;
  const overdue = leads.filter(l=>followKind(l)==="overdue").length;

  sideLevel.textContent = level.level;
  levelMain.textContent = level.level;
  progressLevelCard.textContent = `Level ${level.level}`;
  progressLevel.textContent = level.level;
  sideXp.style.width = pct+"%";
  mainXp.style.width = pct+"%";
  sideXpText.textContent = `${xp} XP`;
  mainXpText.textContent = `${xp} XP`;
  sideXpGoal.textContent = `${level.nextGoal} XP`;
  mainXpGoal.textContent = `${level.nextGoal} XP`;
  levelSub.textContent = `${xp} / ${level.nextGoal} XP`;
  xpToday.textContent = xpToday();
  streakValue.textContent = streak;
  currentStreak.textContent = `${streak} days`;
  progressStreak.textContent = streak;
  revenueMonth.textContent = money(rev);
  revenueBig.textContent = money(rev);
  activePipeline.textContent = money(activeValue);
  decisionCount.textContent = decisions;
  avgOrder.textContent = money(avg);
  overdueCount.textContent = overdue;
  salesWon.textContent = won;
  progressWon.textContent = won;
  leadsTotal.textContent = leads.length;
  progressXP.textContent = xp;
  followupBadge.textContent = leads.filter(l=>["overdue","today"].includes(followKind(l))).length;
}

function priorityScore(l){
  let s = 0;
  const fk = followKind(l);
  if(fk==="overdue") s += 100;
  if(fk==="today") s += 70;
  if(l.stage==="DECISION") s += 50;
  if(l.stage==="CONVERSATION") s += 40;
  s += Math.min(Number(l.estimated_value||0)/50, 20);
  return s;
}

function renderFocus(){
  const items = [...leads]
    .filter(l=>l.next_action && ["overdue","today"].includes(followKind(l)))
    .sort((a,b)=>priorityScore(b)-priorityScore(a))
    .slice(0,4);

  focusCount.textContent = items.length;
  focusList.innerHTML = items.length ? items.map((l,i)=>`
    <div class="quest">
      <div class="qdot">${String(i+1).padStart(2,"0")}</div>
      <div><b>${escapeHtml(l.company)} — ${escapeHtml(l.next_action)}</b><small>${followLabel(l)}</small></div>
      <div class="qxp">+15 XP</div>
      <button class="qbtn" onclick="completeFollowup('${l.id}')">Done</button>
    </div>
  `).join("") : `<div class="smallmuted">Brak pilnych ruchów. Możesz dodać nowe leady.</div>`;
}

function renderTodayQueue(){
  const items = leads
    .filter(l=>l.next_action && followKind(l)==="today")
    .sort((a,b)=>new Date(a.follow_up_at)-new Date(b.follow_up_at));

  todayQueue.innerHTML = items.length ? `
    <table>
      <thead><tr><th>Firma</th><th>Next action</th><th>Termin</th><th></th></tr></thead>
      <tbody>${items.map(l=>`
        <tr>
          <td><b>${escapeHtml(l.company)}</b></td>
          <td>${escapeHtml(l.next_action||"")}</td>
          <td class="date today">${formatDate(l.follow_up_at)}</td>
          <td><button class="btn small" onclick="completeFollowup('${l.id}')">Done</button></td>
        </tr>`).join("")}
      </tbody>
    </table>` : `<div class="smallmuted">Nic więcej na dziś.</div>`;
}

function renderFollowups(){
  let items = leads.filter(l=>l.next_action && l.follow_up_at);
  if(followFilter!=="all") items = items.filter(l=>followKind(l)===followFilter);
  items.sort((a,b)=>new Date(a.follow_up_at)-new Date(b.follow_up_at));

  followupList.innerHTML = items.length ? items.map(l=>`
    <div class="followup ${followKind(l)==="overdue"?"overdue":""}" data-kind="${followKind(l)}">
      <div><div class="date ${followKind(l)}">${followKind(l).toUpperCase()}</div><div class="smallmuted">${formatDate(l.follow_up_at)}</div></div>
      <div><div class="company">${escapeHtml(l.company)}</div><div class="smallmuted">${escapeHtml(l.product||stageLabels[l.stage]||l.stage)}</div></div>
      <div><div class="company">${escapeHtml(l.next_action||"")}</div><div class="smallmuted">${escapeHtml(l.signal||"")}</div></div>
      <div><b style="color:var(--accent)">+15 XP</b></div>
      <div class="quick">
        <button class="btn small" onclick="completeFollowup('${l.id}')">Done</button>
        <button class="btn small" onclick="snoozeLead('${l.id}',1)">Jutro</button>
        <button class="btn small" onclick="snoozeLead('${l.id}',2)">+2 dni</button>
      </div>
    </div>
  `).join("") : `<div class="smallmuted">Brak follow-upów w tym filtrze.</div>`;
}

function renderLeads(){
  leadTableWrap.innerHTML = leads.length ? `
    <table>
      <thead><tr><th>Firma</th><th>Branża</th><th>Etap</th><th>WWW / IG</th><th>Next action</th><th>Follow-up</th></tr></thead>
      <tbody>${leads.map(l=>`
        <tr>
          <td><b>${escapeHtml(l.company)}</b></td>
          <td>${escapeHtml(l.industry||"—")}</td>
          <td>${escapeHtml(stageLabels[l.stage]||l.stage)}</td>
          <td>${linkCell(l)}</td>
          <td>${escapeHtml(l.next_action||"—")}</td>
          <td>${l.follow_up_at?formatDate(l.follow_up_at):"—"}</td>
        </tr>`).join("")}
      </tbody>
    </table>` : `<div class="smallmuted">Brak leadów. Dodaj pierwszy.</div>`;
}

function renderJourney(){
  const stages = ["RESEARCHED","READY","CONTACTED","CONVERSATION","DIAGNOSED","PROPOSAL","DECISION","CLIENT"];
  journeyBoard.innerHTML = stages.map(stage=>`
    <div class="col">
      <h4>${stageLabels[stage]}</h4>
      ${leads.filter(l=>l.stage===stage).map(l=>`
        <div class="lead-card">
          <b>${escapeHtml(l.company)}</b>
          <small>${escapeHtml(l.next_action||"Brak next action")}</small>
        </div>`).join("") || `<div class="smallmuted">—</div>`}
    </div>
  `).join("");
}

function renderProgress(){
  const xp = userXP();
  const lvl = getLevel(xp);
  progressLevel.textContent = lvl.level;
  progressXP.textContent = xp;
  progressStreak.textContent = currentStreak();
  progressWon.textContent = leads.filter(l=>l.stage==="CLIENT").length;
}

function formatDate(v){
  return new Intl.DateTimeFormat("pl-PL",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"}).format(new Date(v));
}
function followLabel(l){
  const k=followKind(l);
  return `${k==="overdue"?"OVERDUE":k==="today"?"DZISIAJ":"UPCOMING"} · ${l.follow_up_at?formatDate(l.follow_up_at):""}`;
}
function linkCell(l){
  const parts=[];
  if(l.website_url) parts.push(`<a href="${escapeAttr(normalizeUrl(l.website_url))}" target="_blank">WWW</a>`);
  if(l.instagram_url) parts.push(`<a href="${escapeAttr(normalizeInstagram(l.instagram_url))}" target="_blank">IG</a>`);
  return parts.join(" · ") || "—";
}
function normalizeUrl(v){ return /^https?:\/\//i.test(v)?v:`https://${v}`; }
function normalizeInstagram(v){
  if(/^https?:\/\//i.test(v)) return v;
  const h=v.replace(/^@/,"").trim();
  return `https://instagram.com/${h}`;
}
function escapeHtml(s=""){ return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));}
function escapeAttr(s=""){ return escapeHtml(s); }

async function completeFollowup(id){
  const lead = leads.find(l=>l.id===id);
  if(!lead) return;
  const { error } = await sb.from("leads").update({
    next_action: null,
    follow_up_at: null,
    updated_at: new Date().toISOString()
  }).eq("id",id);

  if(error){ toast("Błąd zapisu"); return; }
  await logActivity("follow_up", id, lead.next_action);
  toast("+15 XP · follow-up done");
  await loadData();
}

async function snoozeLead(id, days){
  const d = new Date();
  d.setDate(d.getDate()+days);
  d.setHours(10,0,0,0);
  const {error}=await sb.from("leads").update({
    follow_up_at:d.toISOString(),
    updated_at:new Date().toISOString()
  }).eq("id",id);
  if(error){toast("Błąd zapisu");return;}
  toast(`Przełożono +${days}d`);
  await loadData();
}

async function saveLead(){
  const company = leadCompany.value.trim();
  if(!company){toast("Podaj firmę");return;}

  const follow = leadFollowUp.value ? new Date(leadFollowUp.value).toISOString() : null;

  const {data,error}=await sb.from("leads").insert({
    user_id:currentUser.id,
    company,
    industry:leadIndustry.value || null,
    website_url:leadWebsite.value.trim() || null,
    instagram_url:leadInstagram.value.trim() || null,
    signal:leadSignal.value.trim() || null,
    stage:leadStage.value,
    product:leadProduct.value || null,
    estimated_value:Number(leadValue.value||0),
    next_action:leadNextAction.value.trim() || null,
    follow_up_at:follow
  }).select().single();

  if(error){console.error(error);toast("Błąd zapisu");return;}
  await logActivity("lead_created", data.id, "Lead created");
  closeDrawerFn();
  clearLeadForm();
  toast("Lead zapisany");
  await loadData();
}

function clearLeadForm(){
  ["leadCompany","leadWebsite","leadInstagram","leadSignal","leadValue","leadNextAction","leadFollowUp"].forEach(id=>document.getElementById(id).value="");
  leadIndustry.value="";
  leadStage.value="NEW_SIGNAL";
  leadProduct.value="";
}

function openDrawerFn(){leadDrawer.classList.add("open");backdrop.classList.add("show")}
function closeDrawerFn(){leadDrawer.classList.remove("open");backdrop.classList.remove("show")}

function showView(id){
  document.querySelectorAll(".view").forEach(v=>v.classList.toggle("active",v.id===id));
  document.querySelectorAll("nav button").forEach(b=>b.classList.toggle("active",b.dataset.view===id));
}

document.querySelectorAll("nav button").forEach(b=>b.addEventListener("click",()=>showView(b.dataset.view)));
document.querySelectorAll("[data-go]").forEach(b=>b.addEventListener("click",()=>showView(b.dataset.go)));
document.querySelectorAll(".addLeadBtn").forEach(b=>b.addEventListener("click",openDrawerFn));
closeDrawer.addEventListener("click",closeDrawerFn);
backdrop.addEventListener("click",closeDrawerFn);
saveLeadBtn.addEventListener("click",saveLead);

document.querySelectorAll(".filterBtn").forEach(btn=>{
  btn.addEventListener("click",()=>{
    followFilter=btn.dataset.filter;
    document.querySelectorAll(".filterBtn").forEach(x=>x.classList.remove("primary"));
    btn.classList.add("primary");
    renderFollowups();
  });
});

loginBtn.addEventListener("click", async ()=>{
  authError.textContent="";
  const {data,error}=await sb.auth.signInWithPassword({
    email:email.value.trim(),
    password:password.value
  });
  if(error){authError.textContent=error.message;return;}
  currentUser=data.user;
  authScreen.classList.add("hidden");
  appShell.classList.remove("hidden");
  await loadData();
});

logoutBtn.addEventListener("click", async ()=>{
  await sb.auth.signOut();
  currentUser=null;
  appShell.classList.add("hidden");
  authScreen.classList.remove("hidden");
});

async function boot(){
  const {data:{session}} = await sb.auth.getSession();
  if(session?.user){
    currentUser=session.user;
    authScreen.classList.add("hidden");
    appShell.classList.remove("hidden");
    await loadData();
  }else{
    authScreen.classList.remove("hidden");
    appShell.classList.add("hidden");
  }
}
boot();

window.completeFollowup=completeFollowup;
window.snoozeLead=snoozeLead;

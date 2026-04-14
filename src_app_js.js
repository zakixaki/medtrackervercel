import { useState, useEffect } from "react";

const PILL_COLORS = ["#7F77DD","#1D9E75","#D85A30","#D4537E","#378ADD","#BA7517","#639922","#E24B4A"];
const BG = "#1a1a18", CARD = "#242422", SURFACE = "#2c2c2a", TEXT = "#f0ede8", MUTED = "#888780", BORDER = "rgba(255,255,255,0.08)";

const STORAGE_KEY = "medtracker_meds_v1";

const DEFAULT_MEDS = [
  { id: 1, name: "Metformin", totalPills: 90, pillsLeft: 34, times: ["08:00","20:00"], color: "#7F77DD", taken: {} },
  { id: 2, name: "Lisinopril", totalPills: 30, pillsLeft: 12, times: ["09:00"], color: "#1D9E75", taken: {} },
  { id: 3, name: "Atorvastatin", totalPills: 30, pillsLeft: 5, times: ["21:00"], color: "#D85A30", taken: {} },
];

const today = () => new Date().toISOString().split("T")[0];
const fmtTime = t => { const [h,m]=t.split(":"); const hh=+h; return `${hh%12||12}:${m} ${hh<12?"AM":"PM"}`; };
const daysLeft = med => med.times.length > 0 ? Math.floor(med.pillsLeft / med.times.length) : 999;

function loadMeds() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : DEFAULT_MEDS;
  } catch { return DEFAULT_MEDS; }
}

function saveMeds(meds) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(meds)); } catch {}
}

function DonutChart({ pct, color, size=80, strokeWidth=10, children }) {
  const r = (size - strokeWidth) / 2, circ = 2 * Math.PI * r, dash = circ * Math.min(pct, 1);
  const cx = size/2, cy = size/2;
  return (
    <div style={{ position:"relative", width:size, height:size, flexShrink:0 }}>
      <svg width={size} height={size} style={{ transform:"rotate(-90deg)" }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={strokeWidth} />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          style={{ transition:"stroke-dasharray 0.6s cubic-bezier(.4,0,.2,1)" }} />
      </svg>
      <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
        {children}
      </div>
    </div>
  );
}

function MiniBarChart({ med }) {
  const days = Array.from({ length:7 }, (_,i) => {
    const d = new Date(); d.setDate(d.getDate() - (6-i));
    const key = d.toISOString().split("T")[0];
    const taken = (med.taken?.[key] || []).length;
    return { pct: med.times.length > 0 ? taken/med.times.length : 0, isToday: i===6 };
  });
  return (
    <div style={{ display:"flex", alignItems:"flex-end", gap:3, height:32 }}>
      {days.map((d,i) => (
        <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center" }}>
          <div style={{ width:"100%", height:Math.max(4, d.pct*28), borderRadius:3,
            background: d.isToday ? med.color : d.pct > 0 ? med.color+"99" : "rgba(255,255,255,0.08)",
            transition:"height 0.4s" }} />
        </div>
      ))}
    </div>
  );
}

function StatPill({ label, value, color }) {
  return (
    <div style={{ flex:1, background:SURFACE, borderRadius:10, padding:"8px 6px", textAlign:"center" }}>
      <div style={{ fontSize:20, fontWeight:600, color: color || TEXT }}>{value}</div>
      <div style={{ fontSize:10, color:MUTED, marginTop:1 }}>{label}</div>
    </div>
  );
}

function MedCard({ med, onUpdate, onDelete, onTake }) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ ...med });
  const days = daysLeft(med);
  const pct = med.totalPills > 0 ? med.pillsLeft/med.totalPills : 0;
  const statusColor = pct <= 0.2 ? "#E24B4A" : pct <= 0.4 ? "#BA7517" : med.color;
  const todayKey = today();
  const takenToday = t => med.taken?.[todayKey]?.includes(t);
  const doneTodayCount = (med.taken?.[todayKey] || []).length;

  return (
    <div style={{ background:CARD, border:`1.5px solid ${med.color}30`, borderRadius:20, marginBottom:14, overflow:"hidden", boxShadow:`0 2px 12px ${med.color}18` }}>
      <div style={{ padding:"16px 16px 12px", cursor:"pointer" }} onClick={() => !editing && setExpanded(e => !e)}>
        <div style={{ display:"flex", alignItems:"center", gap:14 }}>
          <DonutChart pct={pct} color={statusColor} size={72} strokeWidth={8}>
            <span style={{ fontSize:15, fontWeight:600, color:statusColor }}>{Math.round(pct*100)}%</span>
          </DonutChart>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:4 }}>
              <span style={{ fontWeight:600, fontSize:17, color:TEXT }}>{med.name}</span>
              <span style={{ fontSize:11, color:MUTED }}>{expanded ? "▲" : "▼"}</span>
            </div>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:6 }}>
              <span style={{ fontSize:12, background:med.color+"25", color:med.color, padding:"2px 8px", borderRadius:99, fontWeight:500 }}>{med.pillsLeft} pills left</span>
              <span style={{ fontSize:12, background:statusColor+"25", color:statusColor, padding:"2px 8px", borderRadius:99, fontWeight:500 }}>{days < 999 ? `~${days}d supply` : "—"}</span>
            </div>
            <div style={{ fontSize:12, color:MUTED }}>Today: {doneTodayCount}/{med.times.length} doses taken</div>
          </div>
        </div>
      </div>

      {expanded && !editing && (
        <div style={{ borderTop:`1px solid ${BORDER}`, padding:"14px 16px" }}>
          <div style={{ marginBottom:14 }}>
            <p style={{ fontSize:11, fontWeight:600, color:MUTED, margin:"0 0 8px", letterSpacing:"0.06em" }}>7-DAY ADHERENCE</p>
            <MiniBarChart med={med} />
            <div style={{ display:"flex", justifyContent:"space-between", marginTop:4 }}>
              {["M","T","W","T","F","S","S"].map((d,i) => <span key={i} style={{ flex:1, textAlign:"center", fontSize:10, color:MUTED }}>{d}</span>)}
            </div>
          </div>
          <div style={{ marginBottom:14 }}>
            <p style={{ fontSize:11, fontWeight:600, color:MUTED, margin:"0 0 8px", letterSpacing:"0.06em" }}>SUPPLY</p>
            <div style={{ display:"flex", gap:8 }}>
              <StatPill label="remaining" value={med.pillsLeft} color={statusColor} />
              <StatPill label="taken total" value={med.totalPills - med.pillsLeft} />
              <StatPill label="days left" value={days < 999 ? days : "∞"} color={days <= 7 ? statusColor : TEXT} />
            </div>
          </div>
          <div style={{ marginBottom:14 }}>
            <p style={{ fontSize:11, fontWeight:600, color:MUTED, margin:"0 0 8px", letterSpacing:"0.06em" }}>DOSE TIMES</p>
            <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
              {med.times.map((t,i) => (
                <button key={i} onClick={() => onTake(med.id, t)} style={{
                  padding:"8px 16px", borderRadius:99, fontSize:14, fontWeight:500, cursor:"pointer",
                  border:`1.5px solid ${takenToday(t) ? med.color : med.color+"50"}`,
                  background: takenToday(t) ? med.color : "transparent",
                  color: takenToday(t) ? "#fff" : med.color, transition:"all 0.2s"
                }}>{takenToday(t) ? "✓ " : ""}{fmtTime(t)}</button>
              ))}
            </div>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={() => { setForm({...med}); setEditing(true); }} style={{ flex:1, padding:"9px", borderRadius:10, border:`1px solid ${med.color}60`, background:med.color+"20", color:med.color, cursor:"pointer", fontSize:13, fontWeight:500 }}>Edit</button>
            <button onClick={() => onDelete(med.id)} style={{ flex:1, padding:"9px", borderRadius:10, border:"1px solid #E24B4A50", background:"#E24B4A15", color:"#E24B4A", cursor:"pointer", fontSize:13, fontWeight:500 }}>Remove</button>
          </div>
        </div>
      )}

      {editing && (
        <div style={{ borderTop:`1px solid ${BORDER}`, padding:"14px 16px" }}>
          {[["Name","name","text"],["Total pills","totalPills","number"],["Pills left","pillsLeft","number"]].map(([label,key,type]) => (
            <div key={key} style={{ marginBottom:10 }}>
              <label style={{ fontSize:12, color:MUTED, display:"block", marginBottom:4, fontWeight:500 }}>{label.toUpperCase()}</label>
              <input type={type} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: type==="number" ? +e.target.value : e.target.value }))}
                style={{ width:"100%", boxSizing:"border-box", background:SURFACE, color:TEXT, border:`1px solid ${BORDER}`, borderRadius:8, padding:"8px 10px" }} />
            </div>
          ))}
          <div style={{ marginBottom:10 }}>
            <label style={{ fontSize:12, color:MUTED, display:"block", marginBottom:4, fontWeight:500 }}>DOSE TIMES</label>
            {form.times.map((t,i) => (
              <div key={i} style={{ display:"flex", gap:8, marginBottom:6 }}>
                <input type="time" value={t} onChange={e => setForm(f => ({ ...f, times: f.times.map((x,idx) => idx===i ? e.target.value : x) }))}
                  style={{ flex:1, background:SURFACE, color:TEXT, border:`1px solid ${BORDER}`, borderRadius:8, padding:"8px 10px" }} />
                <button onClick={() => setForm(f => ({ ...f, times: f.times.filter((_,idx) => idx!==i) }))}
                  style={{ padding:"0 10px", borderRadius:8, border:"1px solid #E24B4A50", background:"#E24B4A15", color:"#E24B4A", cursor:"pointer" }}>×</button>
              </div>
            ))}
            <button onClick={() => setForm(f => ({ ...f, times:[...f.times,"08:00"] }))}
              style={{ fontSize:13, color:med.color, background:"transparent", border:"none", cursor:"pointer", padding:0, fontWeight:500 }}>+ Add time</button>
          </div>
          <div style={{ marginBottom:12 }}>
            <label style={{ fontSize:12, color:MUTED, display:"block", marginBottom:6, fontWeight:500 }}>COLOR</label>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              {PILL_COLORS.map(c => (
                <div key={c} onClick={() => setForm(f => ({ ...f, color:c }))} style={{ width:28, height:28, borderRadius:"50%", background:c, cursor:"pointer", outline: form.color===c ? `3px solid ${c}` : "none", outlineOffset:2 }} />
              ))}
            </div>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={() => { onUpdate({...form}); setEditing(false); }} style={{ flex:1, padding:"9px", borderRadius:10, border:"none", background:med.color, color:"#fff", cursor:"pointer", fontSize:13, fontWeight:500 }}>Save</button>
            <button onClick={() => setEditing(false)} style={{ flex:1, padding:"9px", borderRadius:10, border:`1px solid ${BORDER}`, background:"transparent", color:TEXT, cursor:"pointer", fontSize:13 }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

function AddMedForm({ onAdd, onCancel }) {
  const [form, setForm] = useState({ name:"", totalPills:30, pillsLeft:30, times:["08:00"], color:PILL_COLORS[0] });
  return (
    <div style={{ background:CARD, border:`1.5px solid ${form.color}`, borderRadius:20, padding:"16px", marginBottom:14 }}>
      <p style={{ fontWeight:600, fontSize:16, margin:"0 0 12px", color:form.color }}>New medicine</p>
      {[["Medicine name","name","text"],["Total pills in bottle","totalPills","number"],["Pills currently left","pillsLeft","number"]].map(([label,key,type]) => (
        <div key={key} style={{ marginBottom:10 }}>
          <label style={{ fontSize:12, color:MUTED, display:"block", marginBottom:4, fontWeight:500 }}>{label.toUpperCase()}</label>
          <input type={type} value={form[key]} placeholder={label}
            onChange={e => setForm(f => ({ ...f, [key]: type==="number" ? +e.target.value : e.target.value }))}
            style={{ width:"100%", boxSizing:"border-box", background:SURFACE, color:TEXT, border:`1px solid ${BORDER}`, borderRadius:8, padding:"8px 10px" }} />
        </div>
      ))}
      <div style={{ marginBottom:10 }}>
        <label style={{ fontSize:12, color:MUTED, display:"block", marginBottom:4, fontWeight:500 }}>DOSE TIMES</label>
        {form.times.map((t,i) => (
          <div key={i} style={{ display:"flex", gap:8, marginBottom:6 }}>
            <input type="time" value={t} onChange={e => setForm(f => ({ ...f, times: f.times.map((x,idx) => idx===i ? e.target.value : x) }))}
              style={{ flex:1, background:SURFACE, color:TEXT, border:`1px solid ${BORDER}`, borderRadius:8, padding:"8px 10px" }} />
            {form.times.length > 1 && <button onClick={() => setForm(f => ({ ...f, times: f.times.filter((_,idx) => idx!==i) }))}
              style={{ padding:"0 10px", borderRadius:8, border:"1px solid #E24B4A50", background:"#E24B4A15", color:"#E24B4A", cursor:"pointer" }}>×</button>}
          </div>
        ))}
        <button onClick={() => setForm(f => ({ ...f, times:[...f.times,"08:00"] }))}
          style={{ fontSize:13, color:form.color, background:"transparent", border:"none", cursor:"pointer", padding:0, fontWeight:500 }}>+ Add time</button>
      </div>
      <div style={{ marginBottom:14 }}>
        <label style={{ fontSize:12, color:MUTED, display:"block", marginBottom:6, fontWeight:500 }}>COLOR</label>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          {PILL_COLORS.map(c => (
            <div key={c} onClick={() => setForm(f => ({ ...f, color:c }))} style={{ width:28, height:28, borderRadius:"50%", background:c, cursor:"pointer", outline: form.color===c ? `3px solid ${c}` : "none", outlineOffset:2 }} />
          ))}
        </div>
      </div>
      <div style={{ display:"flex", gap:8 }}>
        <button onClick={() => { if(form.name) onAdd({ ...form, id:Date.now(), taken:{} }); }}
          style={{ flex:1, padding:"10px", borderRadius:10, border:"none", background:form.color, color:"#fff", cursor:"pointer", fontSize:14, fontWeight:500 }}>Add</button>
        <button onClick={onCancel} style={{ flex:1, padding:"10px", borderRadius:10, border:`1px solid ${BORDER}`, background:"transparent", color:TEXT, cursor:"pointer", fontSize:14 }}>Cancel</button>
      </div>
    </div>
  );
}

function OverviewDonut({ meds }) {
  const total = meds.reduce((s,m) => s + m.totalPills, 0);
  if (!total) return null;
  const size=140, sw=18, r=(size-sw)/2, circ=2*Math.PI*r;
  let offset=0;
  const segments = meds.map(m => { const frac=m.totalPills/total; const seg={frac,offset,color:m.color}; offset+=frac; return seg; });
  return (
    <div style={{ display:"flex", alignItems:"center", gap:20, padding:"16px", background:CARD, borderRadius:16, marginBottom:16 }}>
      <div style={{ position:"relative", width:size, height:size, flexShrink:0 }}>
        <svg width={size} height={size} style={{ transform:"rotate(-90deg)" }}>
          {segments.map((seg,i) => {
            const dash = circ*seg.frac - 2;
            return <circle key={i} cx={size/2} cy={size/2} r={r} fill="none" stroke={seg.color} strokeWidth={sw}
              strokeDasharray={`${dash} ${circ-dash}`} strokeDashoffset={-circ*seg.offset} strokeLinecap="round" />;
          })}
        </svg>
        <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
          <span style={{ fontSize:22, fontWeight:600, color:TEXT }}>{meds.length}</span>
          <span style={{ fontSize:11, color:MUTED }}>meds</span>
        </div>
      </div>
      <div style={{ flex:1 }}>
        <p style={{ fontSize:13, fontWeight:600, margin:"0 0 8px", color:TEXT }}>Medicine overview</p>
        {meds.map(m => (
          <div key={m.id} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
            <div style={{ width:10, height:10, borderRadius:"50%", background:m.color, flexShrink:0 }} />
            <span style={{ fontSize:13, flex:1, color:TEXT }}>{m.name}</span>
            <span style={{ fontSize:12, color: m.pillsLeft/m.totalPills <= 0.2 ? "#E24B4A" : MUTED }}>{m.pillsLeft}/{m.totalPills}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TodayWidget({ meds, onTake }) {
  const todayKey = today();
  const allDoses = meds.flatMap(m => m.times.map(t => ({ med:m, time:t, taken: m.taken?.[todayKey]?.includes(t) })));
  allDoses.sort((a,b) => a.time.localeCompare(b.time));
  const done = allDoses.filter(d => d.taken).length;
  const pct = allDoses.length > 0 ? done/allDoses.length : 0;
  return (
    <div style={{ marginBottom:16 }}>
      <div style={{ display:"flex", alignItems:"center", gap:16, padding:"16px", background:CARD, borderRadius:16, marginBottom:10 }}>
        <DonutChart pct={pct} color="#7F77DD" size={70} strokeWidth={8}>
          <span style={{ fontSize:14, fontWeight:600, color:"#7F77DD" }}>{Math.round(pct*100)}%</span>
        </DonutChart>
        <div>
          <p style={{ margin:"0 0 2px", fontWeight:600, fontSize:16, color:TEXT }}>Today's progress</p>
          <p style={{ margin:0, fontSize:13, color:MUTED }}>{done} of {allDoses.length} doses taken</p>
          <p style={{ margin:"4px 0 0", fontSize:12, color:MUTED }}>{new Date().toLocaleDateString("en-US",{ weekday:"long", month:"long", day:"numeric" })}</p>
        </div>
      </div>
      {allDoses.map((d,i) => (
        <div key={i} onClick={() => onTake(d.med.id, d.time)} style={{
          display:"flex", alignItems:"center", gap:12, padding:"12px 14px",
          background: d.taken ? d.med.color+"18" : CARD,
          border:`1.5px solid ${d.taken ? d.med.color+"50" : BORDER}`,
          borderRadius:14, marginBottom:8, cursor:"pointer", transition:"all 0.2s"
        }}>
          <div style={{ width:36, height:36, borderRadius:"50%", background: d.taken ? d.med.color : d.med.color+"25", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, transition:"all 0.2s" }}>
            {d.taken ? <span style={{ color:"#fff", fontWeight:700, fontSize:14 }}>✓</span> : <span style={{ fontSize:16 }}>💊</span>}
          </div>
          <div style={{ flex:1 }}>
            <p style={{ margin:0, fontWeight:500, fontSize:15, color: d.taken ? MUTED : TEXT, textDecoration: d.taken ? "line-through" : "none" }}>{d.med.name}</p>
            <p style={{ margin:0, fontSize:12, color:MUTED }}>{fmtTime(d.time)}</p>
          </div>
          <div style={{ fontSize:12, fontWeight:500, color: d.taken ? d.med.color : MUTED }}>{d.taken ? "taken" : "tap to mark"}</div>
        </div>
      ))}
      {meds.some(m => daysLeft(m) <= 7) && (
        <div style={{ padding:"12px 14px", background:"#BA751718", border:"1.5px solid #BA751740", borderRadius:14, marginTop:4 }}>
          <p style={{ margin:"0 0 4px", fontSize:13, fontWeight:600, color:"#BA7517" }}>Refill soon</p>
          {meds.filter(m => daysLeft(m) <= 7).map(m => (
            <p key={m.id} style={{ margin:"2px 0 0", fontSize:12, color:"#BA7517" }}>{m.name} — {daysLeft(m)} day{daysLeft(m)!==1?"s":""} left</p>
          ))}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [meds, setMeds] = useState(() => loadMeds());
  const [adding, setAdding] = useState(false);
  const [tab, setTab] = useState("today");

  useEffect(() => { saveMeds(meds); }, [meds]);

  const updateMed = u => setMeds(ms => ms.map(m => m.id===u.id ? u : m));
  const deleteMed = id => setMeds(ms => ms.filter(m => m.id!==id));
  const addMed = med => { setMeds(ms => [...ms, med]); setAdding(false); };
  const takeDose = (medId, time) => {
    const key = today();
    setMeds(ms => ms.map(m => {
      if(m.id!==medId) return m;
      const dayTaken = m.taken?.[key] || [];
      const already = dayTaken.includes(time);
      return { ...m, pillsLeft: already ? m.pillsLeft+1 : Math.max(0,m.pillsLeft-1), taken:{ ...m.taken, [key]: already ? dayTaken.filter(t=>t!==time) : [...dayTaken,time] } };
    }));
  };

  const TAB = (active) => ({
    flex:1, padding:"8px", borderRadius:10, border:"none", fontWeight: active ? 600 : 400,
    background: active ? "#3a3a38" : "transparent",
    color: active ? "#7F77DD" : MUTED,
    cursor:"pointer", fontSize:14, transition:"all 0.2s"
  });

  return (
    <div style={{ maxWidth:390, margin:"0 auto", paddingBottom:24, background:BG, minHeight:"100vh" }}>
      <div style={{ padding:"20px 16px 0" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
          <div>
            <h1 style={{ fontSize:24, fontWeight:700, margin:0, background:"linear-gradient(135deg, #7F77DD, #1D9E75)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>MedTracker</h1>
            <p style={{ fontSize:13, color:MUTED, margin:"2px 0 0" }}>{new Date().toLocaleDateString("en-US",{ weekday:"long", month:"short", day:"numeric" })}</p>
          </div>
          <div style={{ width:44, height:44, borderRadius:"50%", background:"#7F77DD20", border:"1px solid #7F77DD30", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>💊</div>
        </div>
        <div style={{ display:"flex", background:SURFACE, borderRadius:12, padding:4, marginBottom:16 }}>
          <button style={TAB(tab==="today")} onClick={() => setTab("today")}>Today</button>
          <button style={TAB(tab==="meds")} onClick={() => setTab("meds")}>Medicines</button>
          <button style={TAB(tab==="overview")} onClick={() => setTab("overview")}>Overview</button>
        </div>
      </div>

      <div style={{ padding:"0 16px" }}>
        {tab==="today" && <TodayWidget meds={meds} onTake={takeDose} />}

        {tab==="meds" && (
          <>
            {adding && <AddMedForm onAdd={addMed} onCancel={() => setAdding(false)} />}
            {meds.map(m => <MedCard key={m.id} med={m} onUpdate={updateMed} onDelete={deleteMed} onTake={takeDose} />)}
            {!adding && (
              <button onClick={() => setAdding(true)} style={{ width:"100%", padding:"13px", borderRadius:14, border:"1.5px dashed #7F77DD50", background:"#7F77DD0a", color:"#7F77DD", cursor:"pointer", fontSize:15, fontWeight:600 }}>
                + Add medicine
              </button>
            )}
          </>
        )}

        {tab==="overview" && (
          <>
            <OverviewDonut meds={meds} />
            {meds.map(m => {
              const pct = m.totalPills > 0 ? m.pillsLeft/m.totalPills : 0;
              const days = daysLeft(m);
              const statusColor = pct <= 0.2 ? "#E24B4A" : pct <= 0.4 ? "#BA7517" : m.color;
              return (
                <div key={m.id} style={{ background:CARD, border:`1.5px solid ${m.color}30`, borderRadius:16, padding:"14px 16px", marginBottom:12 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:12 }}>
                    <DonutChart pct={pct} color={statusColor} size={64} strokeWidth={7}>
                      <span style={{ fontSize:13, fontWeight:600, color:statusColor }}>{Math.round(pct*100)}%</span>
                    </DonutChart>
                    <div>
                      <p style={{ margin:"0 0 4px", fontWeight:600, fontSize:16, color:TEXT }}>{m.name}</p>
                      <p style={{ margin:0, fontSize:12, color:MUTED }}>{m.times.length}x daily · {m.times.map(fmtTime).join(", ")}</p>
                    </div>
                  </div>
                  <div style={{ display:"flex", gap:8, marginBottom:10 }}>
                    <StatPill label="remaining" value={m.pillsLeft} color={statusColor} />
                    <StatPill label="total" value={m.totalPills} />
                    <StatPill label="days left" value={days < 999 ? days : "∞"} color={days <= 7 ? statusColor : TEXT} />
                  </div>
                  <p style={{ fontSize:11, fontWeight:600, color:MUTED, margin:"0 0 6px", letterSpacing:"0.06em" }}>7-DAY ADHERENCE</p>
                  <MiniBarChart med={m} />
                  <div style={{ display:"flex", justifyContent:"space-between", marginTop:4 }}>
                    {["M","T","W","T","F","S","S"].map((d,i) => <span key={i} style={{ flex:1, textAlign:"center", fontSize:10, color:MUTED }}>{d}</span>)}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}

import { useState, useEffect, useCallback } from "react";

const API_BASE = "https://powerwatch-backend-afqp.onrender.com";

// ── Design tokens ─────────────────────────────────────────────────────────────
// Brand: deep navy base + electric orange accent (power/energy)
const D = {
  base:     "#060810",
  surface:  "#0C0F1A",
  card:     "#111827",
  raised:   "#162033",
  border:   "#1C2A3E",
  borderHi: "#263D5A",

  orange:   "#FF6B2B",
  orangeHi: "#FF8A55",
  orangeDim:"#FF6B2B22",
  orangeBorder:"rgba(255,107,43,0.3)",

  green:    "#00C896",
  greenBg:  "rgba(0,200,150,0.1)",
  greenBorder:"rgba(0,200,150,0.25)",
  red:      "#FF4D4D",
  redBg:    "rgba(255,77,77,0.1)",
  redBorder:"rgba(255,77,77,0.25)",
  amber:    "#FFB800",

  t1: "#F0F4FF",
  t2: "#8899BB",
  t3: "#3D526E",
  t4: "#1E2F45",
};
const L = {
  base:     "#EEF2F9",
  surface:  "#FFFFFF",
  card:     "#F7FAFF",
  raised:   "#EBF0F8",
  border:   "#D8E2F0",
  borderHi: "#B8C8E0",

  orange:   "#E85A1A",
  orangeHi: "#CC4A10",
  orangeDim:"rgba(232,90,26,0.08)",
  orangeBorder:"rgba(232,90,26,0.25)",

  green:    "#00A87A",
  greenBg:  "rgba(0,168,122,0.08)",
  greenBorder:"rgba(0,168,122,0.25)",
  red:      "#E03535",
  redBg:    "rgba(224,53,53,0.08)",
  redBorder:"rgba(224,53,53,0.25)",
  amber:    "#B45309",

  t1: "#0A1628",
  t2: "#3A5070",
  t3: "#7A94B4",
  t4: "#B8CCDF",
};

const getT = (dk) => dk ? D : L;

const LOCS = [
  { id:"agbowo", name:"Agbowo", short:"AGW", color:"#FF6B2B", glow:"rgba(255,107,43,0.2)" },
  { id:"orogun", name:"Orogun", short:"ORG", color:"#7C6CF5", glow:"rgba(124,108,245,0.2)" },
  { id:"barika", name:"Barika", short:"BRK", color:"#00C896", glow:"rgba(0,200,150,0.2)"  },
];

const SURVEY_QS=[
  {id:"location",type:"choice",q:"Which area do you live in?",required:true,opts:["Agbowo","Orogun","Barika"]},
  {id:"hours",type:"scale",q:"Average hours of electricity per day?",required:true,min:0,max:24,unit:"hrs"},
  {id:"surprised",type:"choice",q:"How often does a power outage catch you off guard?",required:true,opts:["Never","Rarely (1–2×/month)","Sometimes (weekly)","Often","Almost always"]},
  {id:"lost",type:"scale",q:"Productive hours lost per week due to outages?",required:true,min:0,max:20,unit:"hrs"},
  {id:"confidence",type:"rating",q:"How confident are you at planning around power availability?",required:true,low:"Not at all",high:"Very confident"},
  {id:"aware",type:"choice",q:"Do you know of any tool that tracks power in your area?",required:true,opts:["Yes, I use one","Heard of one","No, nothing exists","Not sure"]},
  {id:"coping",type:"multi",q:"How do you cope with outages?",required:false,opts:["Charge devices early","Use a generator","Go to campus","Candles / fuel lamp","Mobile data only","No strategy"]},
  {id:"impact",type:"text",q:"How do outages affect your studies?",required:false,placeholder:"e.g. Can't charge my laptop, deadlines get delayed..."},
];

async function fetchStatus(){const r=await fetch(API_BASE+"/api/status/all");if(!r.ok)throw 0;return r.json();}
async function fetchWeekly(){const r=await fetch(API_BASE+"/api/reports/daily/all?days=7");if(!r.ok)throw 0;const d=await r.json();const days=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];return d.map(x=>({...x,day:days[new Date(x.date).getDay()]}));}
async function fetchMonthly(){const r=await fetch(API_BASE+"/api/reports/monthly/all?year="+new Date().getFullYear());if(!r.ok)throw 0;return r.json();}
async function fetchCommunity(){const r=await fetch(API_BASE+"/api/community/summary/all");if(!r.ok)throw 0;return r.json();}
async function postReport(l,a){const r=await fetch(API_BASE+"/api/community/report",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({location:l,accurate:a})});if(!r.ok)throw 0;}

function timeAgo(iso){if(!iso)return"—";const m=Math.floor((Date.now()-new Date(iso))/60000);if(m<1)return"just now";if(m<60)return m+"m ago";return Math.floor(m/60)+"h ago";}
function outageDur(d){if(!d||d.status!=="OFF"||!d.last_updated)return null;const m=Math.floor((Date.now()-new Date(d.last_updated))/60000);if(m<60)return m+"m";const h=Math.floor(m/60),r=m%60;return r?h+"h "+r+"m":h+"h";}
function getPred(weekly,id){if(!weekly||weekly.length<3)return null;const avg=weekly.reduce((s,d)=>s+(d[id]||0),0)/weekly.length;const trend=(weekly[weekly.length-1][id]||0)-(weekly[0][id]||0);const best=weekly.reduce((b,d)=>(d[id]||0)>(b[id]||0)?d:b,weekly[0]);const worst=weekly.reduce((b,d)=>(d[id]||0)<(b[id]||0)?d:b,weekly[0]);return{avg:avg.toFixed(1),trend,best:best.day,worst:worst.day,label:trend>1?"↑ Improving":trend<-1?"↓ Declining":"→ Stable"};}

// ── Logo ──────────────────────────────────────────────────────────────────────
function Logo({size=32}){
  return(
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="15" fill="rgba(255,107,43,0.15)" stroke="rgba(255,107,43,0.4)" strokeWidth="1"/>
      <path d="M18 4L7 18h9l-2 10 12-14h-9l1-10z" fill="#FF6B2B"/>
    </svg>
  );
}

// ── Bar chart ─────────────────────────────────────────────────────────────────
function BarChart({data,color,locId,T}){
  const [hov,setHov]=useState(null);
  if(!data?.length)return<div style={{height:"80px",background:T.raised,borderRadius:"8px"}}/>;
  const max=Math.max(...data.map(d=>d[locId]||0),1);
  return(
    <div style={{display:"flex",gap:"5px",alignItems:"flex-end",height:"80px"}}>
      {data.map((d,i)=>(
        <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:"3px",height:"100%",justifyContent:"flex-end",position:"relative",cursor:"pointer"}} onMouseEnter={()=>setHov(i)} onMouseLeave={()=>setHov(null)}>
          {hov===i&&<div style={{position:"absolute",top:"-24px",background:color,borderRadius:"5px",padding:"2px 7px",fontSize:"10px",color:"#fff",fontWeight:700,whiteSpace:"nowrap"}}>{(d[locId]||0).toFixed(1)}h</div>}
          <div style={{width:"100%",borderRadius:"3px 3px 0 0",height:Math.max(((d[locId]||0)/max*64),2)+"px",background:hov===i?color:color+"44",transition:"all 0.15s"}}/>
          <span style={{fontSize:"9px",color:T.t3}}>{(d.day||"")[0]}</span>
        </div>
      ))}
    </div>
  );
}

// ── Line chart ────────────────────────────────────────────────────────────────
function LineChart({data,color,locId,T}){
  const [hov,setHov]=useState(null);
  if(!data?.length)return<div style={{height:"60px",background:T.raised,borderRadius:"8px"}}/>;
  const max=Math.max(...data.map(d=>d[locId]||0),1);
  const W=300,H=60;
  const pts=data.map((d,i)=>[(i/(data.length-1))*(W-16)+8,H-((d[locId]||0)/max)*(H-10)-5]);
  const path=pts.map(([x,y],i)=>(i===0?"M":"L")+x+","+y).join(" ");
  return(
    <svg viewBox={"0 0 "+W+" "+(H+16)} style={{width:"100%"}}>
      <defs>
        <linearGradient id={"g"+locId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <path d={path+" L"+pts[pts.length-1][0]+","+H+" L"+pts[0][0]+","+H+" Z"} fill={"url(#g"+locId+")"}/>
      <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      {pts.map(([x,y],i)=>(
        <g key={i}>
          <circle cx={x} cy={y} r="8" fill="transparent" onMouseEnter={()=>setHov(i)} onMouseLeave={()=>setHov(null)} style={{cursor:"pointer"}}/>
          <circle cx={x} cy={y} r={hov===i?4:2.5} fill={color}/>
          {hov===i&&<g><rect x={x-18} y={y-22} width="36" height="15" rx="4" fill={T.raised}/><text x={x} y={y-11} textAnchor="middle" fontSize="9" fill={color} fontWeight="700">{(data[i][locId]||0).toFixed(0)}h</text></g>}
        </g>
      ))}
      {data.map((d,i)=><text key={i} x={pts[i][0]} y={H+13} textAnchor="middle" fontSize="8" fill={T.t3}>{d.month_name?d.month_name[0]:""}</text>)}
    </svg>
  );
}

// ── Community report ──────────────────────────────────────────────────────────
function CommunityBtn({locId,community,onDone,T}){
  const [voted,setVoted]=useState(null);
  const [busy,setBusy]=useState(false);
  const stats=community?.[locId];
  const vote=async(a)=>{if(voted||busy)return;setBusy(true);try{await postReport(locId,a);setVoted(a);if(onDone)onDone();}catch{}finally{setBusy(false);}};
  return(
    <div style={{padding:"14px 16px",background:T.raised,borderRadius:"14px",border:"1px solid "+T.border,marginTop:"14px"}}>
      <div style={{fontSize:"11px",fontWeight:600,color:T.t3,textTransform:"uppercase",letterSpacing:"1px",marginBottom:"10px"}}>Is this reading accurate?</div>
      {voted!==null
        ?<div style={{fontSize:"13px",color:T.green,fontWeight:600}}>✓ Thanks for your feedback!</div>
        :<div style={{display:"flex",gap:"8px"}}>
          <button onClick={()=>vote(true)} disabled={busy} style={{flex:1,padding:"10px",borderRadius:"10px",border:"1px solid "+T.greenBorder,background:T.greenBg,color:T.green,fontSize:"13px",fontWeight:600,cursor:"pointer"}}>👍 Yes, accurate</button>
          <button onClick={()=>vote(false)} disabled={busy} style={{flex:1,padding:"10px",borderRadius:"10px",border:"1px solid "+T.redBorder,background:T.redBg,color:T.red,fontSize:"13px",fontWeight:600,cursor:"pointer"}}>👎 Not accurate</button>
        </div>
      }
      {stats?.total>0&&<div style={{marginTop:"8px",fontSize:"11px",color:T.t3}}>{stats.total} report{stats.total>1?"s":""} · <span style={{color:stats.trust_score>=60?T.green:T.red,fontWeight:600}}>{stats.trust_score}% say accurate</span></div>}
    </div>
  );
}

// ── Drawer ────────────────────────────────────────────────────────────────────
function Drawer({loc,live,weekly,monthly,community,onClose,onReport,dark}){
  const T=getT(dark);
  const d=live?.[loc.id];
  const on=d?.status==="ON";
  const dur=outageDur(d);
  const avg=weekly?.length?(weekly.reduce((s,w)=>s+(w[loc.id]||0),0)/weekly.length).toFixed(1):null;
  return(
    <div style={{position:"fixed",inset:0,zIndex:300,display:"flex",alignItems:"flex-end"}} onClick={onClose}>
      <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.8)",backdropFilter:"blur(10px)"}}/>
      <div style={{position:"relative",width:"100%",maxWidth:"480px",margin:"0 auto",background:T.surface,borderRadius:"24px 24px 0 0",padding:"0 20px 52px",animation:"slideUp 0.3s cubic-bezier(0.16,1,0.3,1)",maxHeight:"92vh",overflowY:"auto",border:"1px solid "+T.border,borderBottom:"none"}} onClick={e=>e.stopPropagation()}>

        {/* Drag handle */}
        <div style={{display:"flex",justifyContent:"center",padding:"14px 0 20px"}}>
          <div style={{width:"40px",height:"4px",background:T.border,borderRadius:"4px"}}/>
        </div>

        {/* Location header with gradient accent */}
        <div style={{background:"linear-gradient(135deg,"+loc.color+"18,"+loc.color+"05)",borderRadius:"16px",padding:"20px",border:"1px solid "+loc.color+"33",marginBottom:"20px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
            <div>
              <div style={{fontSize:"11px",color:T.t3,letterSpacing:"2px",textTransform:"uppercase",marginBottom:"6px"}}>Location</div>
              <div style={{fontSize:"32px",fontWeight:800,color:loc.color,letterSpacing:"-1px",lineHeight:1,fontFamily:"'Outfit',sans-serif"}}>{loc.name}</div>
              <div style={{fontSize:"12px",color:T.t2,marginTop:"6px"}}>University of Ibadan · Off-campus</div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{display:"inline-block",padding:"8px 14px",borderRadius:"10px",background:on?T.greenBg:T.redBg,border:"1px solid "+(on?T.greenBorder:T.redBorder),color:on?T.green:T.red,fontSize:"13px",fontWeight:700,marginBottom:"4px"}}>
                {on?"⚡ Online":"🔌 Offline"}
              </div>
              {!on&&dur&&<div style={{fontSize:"11px",color:T.red,fontWeight:600,textAlign:"right"}}>Off for {dur}</div>}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px",marginBottom:"14px"}}>
          {[["Status",on?"ONLINE":"OFFLINE",on?T.green:T.red],["7-Day Avg",avg?avg+"h/day":"—",T.t1],["Last Ping",d?.last_updated?timeAgo(d.last_updated):"—",T.t2],["Outage Time",!on&&dur?dur:"—",T.red]].map(([k,v,c])=>(
            <div key={k} style={{background:T.raised,borderRadius:"14px",padding:"14px 16px",border:"1px solid "+T.border}}>
              <div style={{fontSize:"10px",fontWeight:600,color:T.t3,textTransform:"uppercase",letterSpacing:"1px",marginBottom:"8px"}}>{k}</div>
              <div style={{fontSize:"22px",fontWeight:800,color:c,lineHeight:1,fontFamily:"'Outfit',sans-serif"}}>{v}</div>
            </div>
          ))}
        </div>

        {/* Community */}
        <CommunityBtn locId={loc.id} community={community} onDone={onReport} T={T}/>

        {/* Charts */}
        <div style={{background:T.raised,borderRadius:"14px",padding:"18px",marginTop:"14px",marginBottom:"10px",border:"1px solid "+T.border}}>
          <div style={{fontSize:"11px",fontWeight:600,color:T.t3,textTransform:"uppercase",letterSpacing:"1px",marginBottom:"14px"}}>This Week</div>
          <BarChart data={weekly} color={loc.color} locId={loc.id} T={T}/>
        </div>
        <div style={{background:T.raised,borderRadius:"14px",padding:"18px",border:"1px solid "+T.border}}>
          <div style={{fontSize:"11px",fontWeight:600,color:T.t3,textTransform:"uppercase",letterSpacing:"1px",marginBottom:"10px"}}>Monthly Trend</div>
          <LineChart data={monthly} color={loc.color} locId={loc.id} T={T}/>
        </div>
        <p style={{textAlign:"center",marginTop:"14px",fontSize:"11px",color:T.t4}}>Auto-refreshes every 30 seconds</p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
//  HOME PAGE
// ═══════════════════════════════════════════
function HomePage({setTab,live,dark}){
  const T=getT(dark);
  const onCount=live?LOCS.filter(l=>live[l.id]?.status==="ON").length:null;

  return(
    <div style={{paddingBottom:"100px"}}>

      {/* Hero — gradient bg */}
      <div style={{background:"linear-gradient(160deg,#0D1A2E 0%,#060810 60%)",padding:"80px 24px 40px",position:"relative",overflow:"hidden"}}>
        {/* Background glow blobs */}
        <div style={{position:"absolute",top:"-60px",right:"-60px",width:"280px",height:"280px",borderRadius:"50%",background:"radial-gradient(circle,rgba(255,107,43,0.12) 0%,transparent 70%)",pointerEvents:"none"}}/>
        <div style={{position:"absolute",bottom:"-40px",left:"-40px",width:"200px",height:"200px",borderRadius:"50%",background:"radial-gradient(circle,rgba(124,108,245,0.1) 0%,transparent 70%)",pointerEvents:"none"}}/>

        {/* Live badge */}
        <div style={{display:"inline-flex",alignItems:"center",gap:"7px",background:"rgba(0,200,150,0.12)",border:"1px solid rgba(0,200,150,0.3)",borderRadius:"20px",padding:"5px 14px",marginBottom:"24px"}}>
          <div style={{width:"7px",height:"7px",borderRadius:"50%",background:D.green,animation:"glow 2s infinite"}}/>
          <span style={{fontSize:"12px",fontWeight:600,color:D.green}}>
            {onCount!==null?onCount+" of 3 locations live":"Live monitoring"}
          </span>
        </div>

        {/* Headline */}
        <h1 style={{fontFamily:"'Outfit',sans-serif",fontSize:"44px",fontWeight:800,color:"#F0F4FF",lineHeight:1.05,letterSpacing:"-2px",marginBottom:"16px"}}>
          Know before<br/>
          <span style={{color:"#FF6B2B"}}>the lights<br/>go out.</span>
        </h1>
        <p style={{fontSize:"15px",color:"#6680AA",lineHeight:1.7,marginBottom:"32px",maxWidth:"340px"}}>
          Real-time power tracking for off-campus students at the University of Ibadan.
        </p>

        {/* Primary CTA */}
        <button onClick={()=>setTab("dashboard")} style={{display:"flex",alignItems:"center",gap:"10px",padding:"15px 24px",borderRadius:"14px",background:"linear-gradient(135deg,#FF6B2B,#E85010)",border:"none",color:"#fff",fontSize:"15px",fontWeight:700,cursor:"pointer",fontFamily:"'Outfit',sans-serif",letterSpacing:"-0.2px",boxShadow:"0 8px 24px rgba(255,107,43,0.35)",marginBottom:"12px"}}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="currentColor"/></svg>
          Check Power Status
          <span style={{marginLeft:"auto",opacity:0.8}}>→</span>
        </button>
        <button onClick={()=>setTab("survey")} style={{display:"block",width:"100%",padding:"14px 24px",borderRadius:"14px",background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.12)",color:"rgba(240,244,255,0.7)",fontSize:"14px",fontWeight:500,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>
          Take the Research Survey
        </button>
      </div>

      {/* Live status strip */}
      <div style={{margin:"0 16px",marginTop:"-20px",background:D.card,borderRadius:"18px",border:"1px solid "+D.border,overflow:"hidden",boxShadow:"0 20px 40px rgba(0,0,0,0.4)"}}>
        <div style={{padding:"14px 18px",borderBottom:"1px solid "+D.border,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <span style={{fontSize:"11px",fontWeight:700,color:D.t3,textTransform:"uppercase",letterSpacing:"1.5px"}}>Live Now</span>
          <span style={{fontSize:"10px",color:D.t3}}>Updated every 5 min</span>
        </div>
        {LOCS.map((loc,i)=>{
          const d=live?.[loc.id];const on=d?.status==="ON";const dur=outageDur(d);
          return(
            <div key={loc.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"16px 18px",borderBottom:i<LOCS.length-1?"1px solid "+D.border:"none",cursor:"pointer"}} onClick={()=>setTab("dashboard")}>
              <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
                <div style={{width:"38px",height:"38px",borderRadius:"10px",background:loc.color+"18",border:"1px solid "+loc.color+"33",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"16px"}}>
                  {on?"⚡":"🔌"}
                </div>
                <div>
                  <div style={{fontSize:"15px",fontWeight:700,color:D.t1,fontFamily:"'Outfit',sans-serif"}}>{loc.name}</div>
                  <div style={{fontSize:"11px",color:D.t3,marginTop:"1px"}}>{!live?"—":!on&&dur?"Offline for "+dur:"Live · "+timeAgo(d?.last_updated)}</div>
                </div>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
                <div style={{padding:"5px 12px",borderRadius:"20px",background:on?D.greenBg:D.redBg,border:"1px solid "+(on?D.greenBorder:D.redBorder),fontSize:"12px",fontWeight:700,color:on?D.green:D.red}}>
                  {!live?"—":on?"ON":"OFF"}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Features */}
      <div style={{padding:"32px 16px 0"}}>
        <div style={{fontSize:"11px",fontWeight:700,color:D.t3,textTransform:"uppercase",letterSpacing:"2px",marginBottom:"16px",paddingLeft:"4px"}}>Why PowerWatch</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px"}}>
          {[{e:"⚡",t:"Real-time",d:"IoT sensors every 5 min"},{e:"📊",t:"Historical",d:"Daily, weekly trends"},{e:"🔮",t:"Predictive",d:"See patterns & plan"},{e:"🗳️",t:"Community",d:"Student-verified data"}].map(({e,t,d})=>(
            <div key={t} style={{background:D.card,borderRadius:"16px",padding:"18px 16px",border:"1px solid "+D.border}}>
              <div style={{fontSize:"24px",marginBottom:"10px"}}>{e}</div>
              <div style={{fontSize:"14px",fontWeight:700,color:D.t1,fontFamily:"'Outfit',sans-serif",marginBottom:"4px"}}>{t}</div>
              <div style={{fontSize:"12px",color:D.t3,lineHeight:1.5}}>{d}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div style={{margin:"24px 16px 0",background:"linear-gradient(135deg,rgba(255,107,43,0.1),rgba(124,108,245,0.05))",borderRadius:"18px",padding:"24px",border:"1px solid rgba(255,107,43,0.2)"}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"20px"}}>
          {[["3","Locations"],["5 min","Refresh rate"],["60+","Surveyed"],["Free","Always"]].map(([v,l])=>(
            <div key={l}>
              <div style={{fontFamily:"'Outfit',sans-serif",fontSize:"32px",fontWeight:800,color:"#FF6B2B",letterSpacing:"-1px",lineHeight:1}}>{v}</div>
              <div style={{fontSize:"13px",color:D.t2,marginTop:"4px"}}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* About */}
      <div style={{margin:"24px 16px 0",padding:"20px",borderRadius:"16px",border:"1px solid "+D.border,background:D.card}}>
        <div style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"12px"}}>
          <Logo size={28}/><span style={{fontFamily:"'Outfit',sans-serif",fontSize:"15px",fontWeight:700,color:D.t1}}>About PowerWatch</span>
        </div>
        <p style={{fontSize:"13px",color:D.t2,lineHeight:1.7,marginBottom:"10px"}}>A student-led initiative under The Fort Institute's FLDC — Cohort 6. Built to solve a daily problem for thousands of off-campus students at UI.</p>
        <p style={{fontSize:"11px",color:D.t3}}>Adeoye Fortune · C62372 · Sub-Fort 30 · Technology & Innovation</p>
        <p style={{fontSize:"10px",color:D.t4,marginTop:"4px"}}>A Student-Led Capstone Initiative under The Fort Institute's FLDC</p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
//  DASHBOARD PAGE
// ═══════════════════════════════════════════
function DashboardPage({live,weekly,monthly,community,loading,error,dark,onReport}){
  const T=getT(dark);
  const [selected,setSelected]=useState(null);
  const [alertOff,setAlertOff]=useState(false);
  const off=live?LOCS.filter(l=>live[l.id]?.status==="OFF"):[];
  const onCount=live?LOCS.filter(l=>live[l.id]?.status==="ON").length:0;
  const now=new Date();
  const time=now.toLocaleTimeString("en-NG",{hour:"2-digit",minute:"2-digit"});

  return(
    <div style={{padding:"80px 16px 100px",fontFamily:"'DM Sans',sans-serif"}}>

      {/* Dashboard header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"20px"}}>
        <div>
          <div style={{fontSize:"11px",fontWeight:600,color:T.t3,letterSpacing:"1px",textTransform:"uppercase",marginBottom:"4px"}}>
            {now.toLocaleDateString("en-NG",{weekday:"short",day:"numeric",month:"short"})}
          </div>
          <h1 style={{fontFamily:"'Outfit',sans-serif",fontSize:"28px",fontWeight:800,color:T.t1,letterSpacing:"-0.5px",lineHeight:1}}>Power Status</h1>
        </div>
        <div style={{textAlign:"right"}}>
          <div style={{fontFamily:"'Outfit',sans-serif",fontSize:"26px",fontWeight:800,color:T.t1,lineHeight:1}}>{time}</div>
          <div style={{fontSize:"10px",fontWeight:700,marginTop:"3px",color:loading?T.amber:error?T.red:T.green}}>
            ● {loading?"Syncing":error?"Offline":"Live"}
          </div>
        </div>
      </div>

      {/* Big status summary */}
      <div style={{background:"linear-gradient(135deg,"+( dark?"#0D1D30,#0A1525":"#E8F0FF,#F0F4FF")+")",borderRadius:"20px",padding:"20px 24px",border:"1px solid "+(dark?D.border:L.border),marginBottom:"16px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div>
          <div style={{fontFamily:"'Outfit',sans-serif",fontSize:"48px",fontWeight:800,color:T.orange,lineHeight:1,letterSpacing:"-2px"}}>{live?onCount:"-"}<span style={{fontSize:"18px",color:T.t3,fontWeight:500}}>/3</span></div>
          <div style={{fontSize:"13px",color:T.t2,marginTop:"4px"}}>locations with power</div>
        </div>
        <div style={{textAlign:"right"}}>
          {LOCS.map(loc=>{
            const on=live?.[loc.id]?.status==="ON";
            return(
              <div key={loc.id} style={{display:"flex",alignItems:"center",gap:"7px",justifyContent:"flex-end",marginBottom:"4px"}}>
                <span style={{fontSize:"12px",color:T.t2}}>{loc.name}</span>
                <div style={{width:"8px",height:"8px",borderRadius:"50%",background:on?T.green:T.t4,flexShrink:0,animation:on?"glow 2s infinite":"none"}}/>
              </div>
            );
          })}
        </div>
      </div>

      {/* Outage alert */}
      {!alertOff&&off.length>0&&(
        <div style={{background:T.redBg,border:"1px solid "+T.redBorder,borderRadius:"14px",padding:"13px 16px",display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"14px"}}>
          <div>
            <div style={{fontSize:"13px",fontWeight:700,color:T.red,marginBottom:"3px"}}>⚠️ Outage detected</div>
            <div style={{fontSize:"12px",color:T.t2}}>{off.map(l=>l.name).join(" & ")} — no power right now</div>
          </div>
          <button onClick={()=>setAlertOff(true)} style={{background:"none",border:"none",color:T.t3,cursor:"pointer",fontSize:"20px",lineHeight:1,padding:"0 0 0 10px"}}>×</button>
        </div>
      )}

      {/* Location cards */}
      <div style={{display:"flex",flexDirection:"column",gap:"10px",marginBottom:"16px"}}>
        {LOCS.map((loc,i)=>{
          const d=live?.[loc.id];const on=d?.status==="ON";const dur=outageDur(d);
          return(
            <div key={loc.id} onClick={()=>!loading&&setSelected(loc)}
              style={{background:T.card,borderRadius:"18px",padding:"18px",border:"1px solid "+(on?loc.color+"33":T.border),cursor:loading?"default":"pointer",transition:"all 0.18s",animation:"fadeUp "+(0.05+i*0.06)+"s ease both",boxShadow:on?"0 4px 20px "+loc.glow:"none"}}
              onMouseEnter={e=>{e.currentTarget.style.background=T.raised;}} onMouseLeave={e=>{e.currentTarget.style.background=T.card;}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <div style={{display:"flex",alignItems:"center",gap:"14px"}}>
                  {/* Animated icon */}
                  <div style={{width:"52px",height:"52px",borderRadius:"14px",background:on?"linear-gradient(135deg,"+loc.color+"22,"+loc.color+"08)":T.raised,border:"1px solid "+(on?loc.color+"44":T.border),display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,position:"relative"}}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                      {on?<path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill={loc.color}/>
                         :<path d="M18.36 6.64a9 9 0 1 1-12.73 0M12 2v10" stroke={T.t4} strokeWidth="1.5" strokeLinecap="round"/>}
                    </svg>
                    {on&&<div style={{position:"absolute",top:"6px",right:"6px",width:"7px",height:"7px",borderRadius:"50%",background:T.green,animation:"glow 2s infinite"}}/>}
                  </div>
                  <div>
                    <div style={{fontFamily:"'Outfit',sans-serif",fontSize:"18px",fontWeight:700,color:T.t1,marginBottom:"2px"}}>{loc.name}</div>
                    <div style={{fontSize:"11px",color:T.t3}}>
                      {loading?"Loading..."
                       :!on&&dur?<span style={{color:T.red,fontWeight:600}}>Offline · {dur}</span>
                       :d?.last_updated?"Updated "+timeAgo(d.last_updated)
                       :"Waiting for sensor"}
                    </div>
                  </div>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontFamily:"'Outfit',sans-serif",fontSize:"20px",fontWeight:800,color:on?loc.color:T.t4,lineHeight:1}}>
                      {loading?"·":on?"ON":"OFF"}
                    </div>
                  </div>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke={T.t4} strokeWidth="2" strokeLinecap="round"/></svg>
                </div>
              </div>
              {/* Progress bar when on */}
              {on&&weekly&&(()=>{
                const avg=weekly.reduce((s,d)=>s+(d[loc.id]||0),0)/weekly.length;
                return(
                  <div style={{marginTop:"12px"}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:"5px"}}>
                      <span style={{fontSize:"10px",color:T.t3}}>7-day avg</span>
                      <span style={{fontSize:"10px",fontWeight:600,color:loc.color}}>{avg.toFixed(1)}h/day</span>
                    </div>
                    <div style={{height:"3px",background:T.border,borderRadius:"3px",overflow:"hidden"}}>
                      <div style={{width:Math.min((avg/24)*100,100)+"%",height:"100%",background:loc.color,borderRadius:"3px",transition:"width 1s ease"}}/>
                    </div>
                  </div>
                );
              })()}
            </div>
          );
        })}
      </div>

      {/* Daily Digest */}
      {weekly?.length>=2&&(()=>{
        const y=weekly[weekly.length-2];
        const date=y.date?new Date(y.date).toLocaleDateString("en-NG",{weekday:"short",month:"short",day:"numeric"}):"Yesterday";
        return(
          <div style={{background:T.card,borderRadius:"18px",padding:"18px",border:"1px solid "+T.border,marginBottom:"14px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"14px"}}>
              <div>
                <div style={{fontSize:"11px",fontWeight:600,color:T.t3,textTransform:"uppercase",letterSpacing:"1px",marginBottom:"2px"}}>Daily Digest</div>
                <div style={{fontFamily:"'Outfit',sans-serif",fontSize:"15px",fontWeight:700,color:T.t1}}>{date}</div>
              </div>
              <span style={{fontSize:"22px"}}>📋</span>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"8px"}}>
              {LOCS.map(loc=>{
                const h=parseFloat((y[loc.id]||0).toFixed(1));
                const qc=h>=16?T.green:h>=10?T.amber:T.red;
                const ql=h>=16?"Great":h>=10?"Okay":"Poor";
                return(
                  <div key={loc.id} style={{background:T.raised,borderRadius:"12px",padding:"12px 10px",textAlign:"center",border:"1px solid "+T.border}}>
                    <div style={{fontSize:"10px",color:T.t3,marginBottom:"5px"}}>{loc.name}</div>
                    <div style={{fontFamily:"'Outfit',sans-serif",fontSize:"22px",fontWeight:800,color:loc.color,lineHeight:1,marginBottom:"3px"}}>{h}h</div>
                    <div style={{fontSize:"9px",fontWeight:700,color:qc,textTransform:"uppercase",letterSpacing:"0.5px"}}>{ql}</div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Predictor */}
      {weekly&&weekly.length>=3&&(
        <div style={{background:T.card,borderRadius:"18px",padding:"18px",border:"1px solid "+T.border,marginBottom:"14px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"16px"}}>
            <div>
              <div style={{fontSize:"11px",fontWeight:600,color:T.t3,textTransform:"uppercase",letterSpacing:"1px",marginBottom:"2px"}}>Power Predictor</div>
              <div style={{fontFamily:"'Outfit',sans-serif",fontSize:"15px",fontWeight:700,color:T.t1}}>Based on last 7 days</div>
            </div>
            <span style={{fontSize:"22px"}}>🔮</span>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:"10px"}}>
            {LOCS.map(loc=>{
              const p=getPred(weekly,loc.id);if(!p)return null;
              const tc=p.trend>1?T.green:p.trend<-1?T.red:T.t3;
              return(
                <div key={loc.id} style={{background:T.raised,borderRadius:"12px",padding:"14px",border:"1px solid "+T.border}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"10px"}}>
                    <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
                      <div style={{width:"8px",height:"8px",borderRadius:"50%",background:loc.color}}/>
                      <span style={{fontFamily:"'Outfit',sans-serif",fontSize:"15px",fontWeight:700,color:T.t1}}>{loc.name}</span>
                    </div>
                    <span style={{fontSize:"11px",fontWeight:700,color:tc}}>{p.label}</span>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"8px",marginBottom:"10px"}}>
                    {[["Avg",p.avg+"h",loc.color],["Best",p.best,T.green],["Worst",p.worst,T.red]].map(([l,v,c])=>(
                      <div key={l} style={{textAlign:"center"}}>
                        <div style={{fontFamily:"'Outfit',sans-serif",fontSize:"16px",fontWeight:800,color:c,lineHeight:1}}>{v}</div>
                        <div style={{fontSize:"9px",color:T.t3,marginTop:"3px",textTransform:"uppercase",letterSpacing:"0.5px"}}>{l}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{background:T.overlay||T.base,borderRadius:"8px",padding:"9px 12px",fontSize:"12px",color:T.t2,lineHeight:1.55}}>
                    💡 About <strong style={{color:loc.color}}>{p.avg} hrs</strong> today.{" "}{p.trend>1?"Supply improving — good time to charge all devices.":p.trend<-1?"Supply declining — charge early.":"Supply stable this week."}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <p style={{textAlign:"center",fontSize:"11px",color:T.t4,marginTop:"8px"}}>Tap a card for full details · Refreshes every 30s</p>

      {selected&&<Drawer loc={selected} live={live} weekly={weekly} monthly={monthly} community={community} onClose={()=>setSelected(null)} onReport={onReport} dark={dark}/>}
    </div>
  );
}

// ═══════════════════════════════════════════
//  SURVEY PAGE
// ═══════════════════════════════════════════
function SurveyPage({dark}){
  const T=getT(dark);
  const [step,setStep]=useState(-1);
  const [ans,setAns]=useState({});
  const [done,setDone]=useState(false);
  const total=SURVEY_QS.length;
  const q=SURVEY_QS[step];
  const canNext=()=>{if(step<0)return true;if(!q?.required)return true;const v=ans[q.id];if(v===undefined||v===null||v==="")return false;if(Array.isArray(v)&&!v.length)return false;return true;};
  const next=()=>{if(!canNext())return;if(step>=total-1){setDone(true);return;}setStep(s=>s+1);};
  const set=v=>setAns(a=>({...a,[q.id]:v}));
  const pct=step<0?0:Math.round(((step+1)/total)*100);

  if(done)return(
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",padding:"80px 24px",background:T.base}}>
      <div style={{textAlign:"center",maxWidth:"360px",animation:"fadeUp 0.5s ease"}}>
        <div style={{width:"72px",height:"72px",borderRadius:"20px",background:T.greenBg,border:"1px solid "+T.greenBorder,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 22px",fontSize:"32px"}}>✓</div>
        <h2 style={{fontFamily:"'Outfit',sans-serif",fontSize:"28px",fontWeight:800,color:T.t1,marginBottom:"12px",letterSpacing:"-0.5px"}}>Response recorded!</h2>
        <p style={{fontSize:"15px",color:T.t2,lineHeight:1.7,marginBottom:"28px"}}>Thank you. Your data helps us build a better power tracker for students across Agbowo, Orogun and Barika.</p>
        <button onClick={()=>{setStep(-1);setAns({});setDone(false);}} style={{background:T.raised,border:"1px solid "+T.border,borderRadius:"12px",padding:"13px 24px",color:T.t2,fontSize:"14px",cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>Submit another →</button>
      </div>
    </div>
  );

  return(
    <div style={{minHeight:"100vh",padding:"80px 20px 100px",maxWidth:"480px",margin:"0 auto",fontFamily:"'DM Sans',sans-serif"}}>
      {step>=0&&(
        <div style={{marginBottom:"28px"}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:"8px"}}>
            <span style={{fontSize:"12px",color:T.t3}}>Question {step+1} of {total}</span>
            <span style={{fontSize:"12px",fontWeight:700,color:T.orange}}>{pct}%</span>
          </div>
          <div style={{height:"4px",background:T.border,borderRadius:"4px",overflow:"hidden"}}>
            <div style={{width:pct+"%",height:"100%",background:"linear-gradient(90deg,"+T.orange+","+T.orangeHi+")",borderRadius:"4px",transition:"width 0.4s ease"}}/>
          </div>
        </div>
      )}

      {step===-1?(
        <div style={{animation:"fadeUp 0.4s ease"}}>
          {/* Survey hero */}
          <div style={{background:"linear-gradient(135deg,"+(dark?"#0D1D30,#060810":"#E8F0FF,#F0F4FF")+")",borderRadius:"20px",padding:"28px 24px",border:"1px solid "+T.border,marginBottom:"24px",position:"relative",overflow:"hidden"}}>
            <div style={{position:"absolute",top:"-30px",right:"-30px",width:"120px",height:"120px",borderRadius:"50%",background:"radial-gradient(circle,rgba(255,107,43,0.15) 0%,transparent 70%)"}}/>
            <div style={{fontSize:"36px",marginBottom:"14px"}}>📋</div>
            <h1 style={{fontFamily:"'Outfit',sans-serif",fontSize:"26px",fontWeight:800,color:T.t1,letterSpacing:"-0.5px",lineHeight:1.2,marginBottom:"10px"}}>Help us understand the problem</h1>
            <p style={{fontSize:"14px",color:T.t2,lineHeight:1.65}}>Under 3 minutes. Your responses shape PowerWatch and help prove its impact.</p>
          </div>
          <div style={{background:T.card,borderRadius:"16px",overflow:"hidden",border:"1px solid "+T.border,marginBottom:"24px"}}>
            {[["🔒","Anonymous","No personal data collected"],["⏱","~3 minutes",total+" questions total"],["📊","Research only","FLDC Capstone · University of Ibadan"]].map(([ic,t,s],i,arr)=>(
              <div key={t} style={{display:"flex",alignItems:"center",gap:"14px",padding:"15px 18px",borderBottom:i<arr.length-1?"1px solid "+T.border:"none"}}>
                <span style={{fontSize:"20px",width:"28px",textAlign:"center"}}>{ic}</span>
                <div><div style={{fontSize:"14px",fontWeight:600,color:T.t1}}>{t}</div><div style={{fontSize:"12px",color:T.t3,marginTop:"1px"}}>{s}</div></div>
              </div>
            ))}
          </div>
          <button onClick={next} style={{width:"100%",padding:"17px",borderRadius:"14px",background:"linear-gradient(135deg,"+T.orange+","+T.orangeHi+")",border:"none",color:"#fff",fontSize:"16px",fontWeight:700,cursor:"pointer",fontFamily:"'Outfit',sans-serif",letterSpacing:"-0.2px",boxShadow:"0 8px 24px rgba(255,107,43,0.3)"}}>
            Start Survey →
          </button>
        </div>
      ):(
        <div key={step} style={{animation:"fadeUp 0.3s ease"}}>
          <div style={{marginBottom:"8px"}}>
            <span style={{display:"inline-block",background:q.required?T.orangeDim:T.raised,border:"1px solid "+(q.required?T.orangeBorder:T.border),borderRadius:"20px",padding:"4px 12px",fontSize:"11px",fontWeight:600,color:q.required?T.orange:T.t3,letterSpacing:"0.5px"}}>{q.required?"Required":"Optional"}</span>
          </div>
          <h2 style={{fontFamily:"'Outfit',sans-serif",fontSize:"22px",fontWeight:700,color:T.t1,lineHeight:1.3,letterSpacing:"-0.3px",marginBottom:"26px"}}>{q.q}</h2>

          {q.type==="choice"&&<div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
            {q.opts.map(o=>{const s=ans[q.id]===o;return(
              <button key={o} onClick={()=>set(o)} style={{padding:"15px 16px",borderRadius:"13px",textAlign:"left",background:s?T.orangeDim:T.card,border:"1px solid "+(s?T.orange:T.border),color:s?T.orange:T.t1,fontSize:"14px",fontWeight:s?600:400,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",transition:"all 0.12s",display:"flex",alignItems:"center",gap:"12px"}}>
                <div style={{width:"20px",height:"20px",borderRadius:"50%",border:"2px solid "+(s?T.orange:T.t4),background:s?T.orange:"transparent",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
                  {s&&<div style={{width:"7px",height:"7px",borderRadius:"50%",background:"#fff"}}/>}
                </div>{o}
              </button>
            );})}
          </div>}

          {q.type==="scale"&&<div>
            <div style={{background:T.card,borderRadius:"16px",padding:"24px",textAlign:"center",marginBottom:"20px",border:"1px solid "+T.border}}>
              <span style={{fontFamily:"'Outfit',sans-serif",fontSize:"60px",fontWeight:800,color:T.orange,lineHeight:1}}>{ans[q.id]??Math.round(q.max/2)}</span>
              <span style={{fontSize:"18px",color:T.t3,marginLeft:"8px"}}>{q.unit}</span>
            </div>
            <input type="range" min={q.min} max={q.max} step="1" value={ans[q.id]??Math.round(q.max/2)} onChange={e=>set(parseInt(e.target.value))} style={{width:"100%",cursor:"pointer"}}/>
            <div style={{display:"flex",justifyContent:"space-between",marginTop:"6px"}}>
              <span style={{fontSize:"11px",color:T.t4}}>{q.min} {q.unit}</span>
              <span style={{fontSize:"11px",color:T.t4}}>{q.max} {q.unit}+</span>
            </div>
          </div>}

          {q.type==="rating"&&<div>
            <div style={{display:"flex",gap:"8px",justifyContent:"center",marginBottom:"12px"}}>
              {[1,2,3,4,5].map(n=>{const s=ans[q.id]===n;return(
                <button key={n} onClick={()=>set(n)} style={{width:"56px",height:"56px",borderRadius:"14px",border:"1px solid "+(s?T.orange:T.border),background:s?"linear-gradient(135deg,"+T.orange+","+T.orangeHi+")":T.card,color:s?"#fff":T.t1,fontFamily:"'Outfit',sans-serif",fontSize:"20px",fontWeight:700,cursor:"pointer",transition:"all 0.12s"}}>{n}</button>
              );})}
            </div>
            <div style={{display:"flex",justifyContent:"space-between"}}>
              <span style={{fontSize:"11px",color:T.t3}}>{q.low}</span>
              <span style={{fontSize:"11px",color:T.t3}}>{q.high}</span>
            </div>
          </div>}

          {q.type==="multi"&&<div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
            {q.opts.map(o=>{
              const c=(ans[q.id]||[]).includes(o);
              const toggle=()=>{const p=ans[q.id]||[];set(c?p.filter(v=>v!==o):[...p,o]);};
              return(
                <button key={o} onClick={toggle} style={{padding:"13px 16px",borderRadius:"13px",textAlign:"left",background:c?T.orangeDim:T.card,border:"1px solid "+(c?T.orange:T.border),color:c?T.orange:T.t1,fontSize:"14px",fontWeight:c?600:400,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",transition:"all 0.12s",display:"flex",alignItems:"center",gap:"12px"}}>
                  <div style={{width:"20px",height:"20px",borderRadius:"6px",border:"2px solid "+(c?T.orange:T.t4),background:c?T.orange:"transparent",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"12px",color:"#fff"}}>{c&&"✓"}</div>{o}
                </button>
              );
            })}
          </div>}

          {q.type==="text"&&<textarea value={ans[q.id]||""} onChange={e=>set(e.target.value)} placeholder={q.placeholder} rows={4} style={{width:"100%",background:T.card,border:"1px solid "+T.border,borderRadius:"13px",color:T.t1,fontSize:"14px",padding:"14px 16px",fontFamily:"'DM Sans',sans-serif",resize:"vertical",outline:"none",lineHeight:1.65,transition:"border-color 0.15s"}} onFocus={e=>e.target.style.borderColor=T.orange} onBlur={e=>e.target.style.borderColor=T.border}/>}

          <div style={{display:"flex",gap:"10px",marginTop:"26px"}}>
            <button onClick={()=>setStep(s=>Math.max(-1,s-1))} style={{padding:"14px 18px",borderRadius:"12px",background:T.raised,border:"1px solid "+T.border,color:T.t2,fontSize:"14px",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",transition:"all 0.12s"}} onMouseEnter={e=>e.currentTarget.style.color=T.t1} onMouseLeave={e=>e.currentTarget.style.color=T.t2}>← Back</button>
            <button onClick={next} disabled={!canNext()} style={{flex:1,padding:"15px",borderRadius:"12px",background:canNext()?"linear-gradient(135deg,"+T.orange+","+T.orangeHi+")":T.raised,border:"1px solid "+(canNext()?T.orange:T.border),color:canNext()?"#fff":T.t4,fontSize:"15px",fontWeight:700,cursor:canNext()?"pointer":"not-allowed",fontFamily:"'Outfit',sans-serif",letterSpacing:"-0.2px",boxShadow:canNext()?"0 6px 20px rgba(255,107,43,0.25)":"none",transition:"all 0.15s"}}>
              {step>=total-1?"Submit ✓":"Continue →"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════
//  BOTTOM TAB BAR (the app feel)
// ═══════════════════════════════════════════
function TabBar({tab,setTab,dark}){
  const T=getT(dark);
  const TABS=[
    {id:"home",   label:"Home",      icon:(a)=><svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke={a?"#FF6B2B":T.t3} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill={a?"rgba(255,107,43,0.15)":"none"}/><polyline points="9,22 9,12 15,12 15,22" stroke={a?"#FF6B2B":T.t3} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>},
    {id:"dashboard",label:"Status",  icon:(a)=><svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill={a?"#FF6B2B":"none"} stroke={a?"#FF6B2B":T.t3} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>},
    {id:"survey", label:"Survey",    icon:(a)=><svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="5" y="2" width="14" height="20" rx="2" stroke={a?"#FF6B2B":T.t3} strokeWidth="1.5" fill={a?"rgba(255,107,43,0.15)":"none"}/><line x1="9" y1="7" x2="15" y2="7" stroke={a?"#FF6B2B":T.t3} strokeWidth="1.5" strokeLinecap="round"/><line x1="9" y1="11" x2="15" y2="11" stroke={a?"#FF6B2B":T.t3} strokeWidth="1.5" strokeLinecap="round"/><line x1="9" y1="15" x2="12" y2="15" stroke={a?"#FF6B2B":T.t3} strokeWidth="1.5" strokeLinecap="round"/></svg>},
  ];
  return(
    <div style={{position:"fixed",bottom:0,left:0,right:0,zIndex:100,background:dark?"rgba(6,8,16,0.97)":"rgba(255,255,255,0.97)",backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)",borderTop:"1px solid "+T.border,paddingBottom:"env(safe-area-inset-bottom,8px)"}}>
      <div style={{display:"flex",maxWidth:"480px",margin:"0 auto"}}>
        {TABS.map(({id,label,icon})=>{
          const active=tab===id;
          return(
            <button key={id} onClick={()=>setTab(id)} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:"3px",padding:"10px 0 8px",background:"none",border:"none",cursor:"pointer",transition:"all 0.15s"}}>
              {icon(active)}
              <span style={{fontSize:"10px",fontWeight:active?700:400,color:active?"#FF6B2B":T.t3,fontFamily:"'DM Sans',sans-serif",letterSpacing:"0.3px"}}>{label}</span>
              {active&&<div style={{width:"4px",height:"4px",borderRadius:"50%",background:"#FF6B2B",marginTop:"1px"}}/>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
//  TOP HEADER
// ═══════════════════════════════════════════
function TopBar({tab,dark,setDark}){
  const T=getT(dark);
  const titles={home:"PowerWatch",dashboard:"Power Status",survey:"Survey"};
  return(
    <div style={{position:"fixed",top:0,left:0,right:0,zIndex:100,background:dark?"rgba(6,8,16,0.97)":"rgba(255,255,255,0.97)",backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)",borderBottom:"1px solid "+T.border,height:"58px",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 18px",maxWidth:"100%"}}>
      <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
        <Logo size={28}/>
        <span style={{fontFamily:"'Outfit',sans-serif",fontSize:"17px",fontWeight:800,color:T.t1,letterSpacing:"-0.3px"}}>{titles[tab]}</span>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
        {tab==="dashboard"&&<div style={{fontSize:"10px",fontWeight:700,color:D.green,display:"flex",alignItems:"center",gap:"5px"}}><div style={{width:"6px",height:"6px",borderRadius:"50%",background:D.green,animation:"glow 2s infinite"}}/>LIVE</div>}
        <button onClick={()=>setDark(d=>!d)} style={{width:"36px",height:"36px",borderRadius:"10px",border:"1px solid "+T.border,background:T.raised,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"15px"}}>
          {dark?"☀️":"🌙"}
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
//  ROOT
// ═══════════════════════════════════════════
export default function App(){
  const hash=window.location.hash.replace("#","");
  const [tab,setTab]=useState(hash==="survey"?"survey":hash==="dashboard"?"dashboard":"home");
  const [dark,setDark]=useState(true);
  const [live,setLive]=useState(null);
  const [weekly,setWeekly]=useState(null);
  const [monthly,setMonthly]=useState(null);
  const [community,setCommunity]=useState(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState(false);

  const navigate=t=>{window.location.hash=t==="home"?"":t;setTab(t);};

  const refresh=useCallback(async()=>{
    try{const d=await fetchStatus();setLive(d);setError(false);}
    catch{setError(true);}
    finally{setLoading(false);}
  },[]);

  const refreshCommunity=useCallback(async()=>{
    try{setCommunity(await fetchCommunity());}catch{}
  },[]);

  useEffect(()=>{
    refresh();
    fetchWeekly().then(setWeekly).catch(()=>{});
    fetchMonthly().then(setMonthly).catch(()=>{});
    refreshCommunity();
  },[]);

  useEffect(()=>{const t=setInterval(refresh,30000);return()=>clearInterval(t);},[refresh]);
  useEffect(()=>{const t=setInterval(refreshCommunity,60000);return()=>clearInterval(t);},[refreshCommunity]);

  const T=getT(dark);

  return(
    <div style={{minHeight:"100vh",background:T.base,color:T.t1,transition:"background 0.3s"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&display=swap');
        @keyframes glow    {0%,100%{opacity:1;box-shadow:0 0 0 0 currentColor}50%{opacity:0.6;box-shadow:0 0 8px 2px currentColor}}
        @keyframes slideUp {from{transform:translateY(100%)}to{transform:translateY(0)}}
        @keyframes fadeUp  {from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        *{box-sizing:border-box;margin:0;padding:0;}
        body{font-family:'DM Sans',system-ui,sans-serif;-webkit-font-smoothing:antialiased;}
        input[type=range]{-webkit-appearance:none;width:100%;height:5px;background:${T.border};border-radius:4px;outline:none;}
        input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:24px;height:24px;border-radius:50%;background:${T.orange};cursor:pointer;border:3px solid ${T.surface};}
        ::-webkit-scrollbar{width:3px;}
        ::-webkit-scrollbar-thumb{background:${T.border};border-radius:4px;}
        button:focus{outline:none;}
      `}</style>

      <TopBar tab={tab} dark={dark} setDark={setDark}/>

      <div style={{maxWidth:"480px",margin:"0 auto"}}>
        {tab==="home"&&<HomePage setTab={navigate} live={live} dark={dark}/>}
        {tab==="dashboard"&&<DashboardPage live={live} weekly={weekly} monthly={monthly} community={community} loading={loading} error={error} dark={dark} onReport={refreshCommunity}/>}
        {tab==="survey"&&<SurveyPage dark={dark}/>}
      </div>

      <TabBar tab={tab} setTab={navigate} dark={dark}/>
    </div>
  );
}
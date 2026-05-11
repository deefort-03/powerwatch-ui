import { useState, useEffect, useCallback } from "react";

const API_BASE = "https://powerwatch-backend-afqp.onrender.com";

// ── Design Tokens ─────────────────────────────────────────────────────────────
const LIGHT = {
  base:"#F5F7FA", surface:"#FFFFFF", card:"#FFFFFF", raised:"#F0F3F7",
  border:"#E2E8F0", borderHi:"#CBD5E1",
  orange:"#E8501A", orangeHi:"#CC4010", orangeLo:"rgba(232,80,26,0.08)", orangeBd:"rgba(232,80,26,0.25)",
  green:"#059669", greenBg:"rgba(5,150,105,0.08)", greenBd:"rgba(5,150,105,0.25)",
  red:"#DC2626", redBg:"rgba(220,38,38,0.08)", redBd:"rgba(220,38,38,0.25)",
  amber:"#B45309",
  t1:"#0F172A", t2:"#334155", t3:"#64748B", t4:"#94A3B8",
};
const DARK = {
  base:"#07090F", surface:"#0C0F1A", card:"#111827", raised:"#162033",
  border:"#1C2A3E", borderHi:"#263D5A",
  orange:"#FF6B2B", orangeHi:"#FF8A55", orangeLo:"rgba(255,107,43,0.10)", orangeBd:"rgba(255,107,43,0.28)",
  green:"#10B981", greenBg:"rgba(16,185,129,0.10)", greenBd:"rgba(16,185,129,0.28)",
  red:"#EF4444", redBg:"rgba(239,68,68,0.10)", redBd:"rgba(239,68,68,0.28)",
  amber:"#F59E0B",
  t1:"#F0F4FF", t2:"#94A3B8", t3:"#475569", t4:"#1E293B",
};
const getT = (dk) => dk ? DARK : LIGHT;

const LOCS = [
  { id:"agbowo", name:"Agbowo", color:"#E8501A", glow:"rgba(232,80,26,0.12)" },
  { id:"orogun", name:"Orogun", color:"#7C6CF5", glow:"rgba(124,108,245,0.12)" },
  { id:"barika", name:"Barika", color:"#059669", glow:"rgba(5,150,105,0.12)" },
];

const SURVEY_QS = [
  {id:"location",type:"choice",q:"Which area do you live in?",required:true,opts:["Agbowo","Orogun","Barika"]},
  {id:"hours",type:"scale",q:"On average, how many hours of electricity do you get per day?",required:true,min:0,max:24,unit:"hrs"},
  {id:"surprised",type:"choice",q:"How often does a power outage catch you off guard?",required:true,opts:["Never","Rarely (1–2x/month)","Sometimes (weekly)","Often (several times/week)","Almost always"]},
  {id:"lost",type:"scale",q:"How many productive hours do you lose per week due to outages?",required:true,min:0,max:20,unit:"hrs"},
  {id:"confidence",type:"rating",q:"How confident are you at planning your day around power availability?",required:true,low:"Not at all",high:"Very confident"},
  {id:"aware",type:"choice",q:"Are you aware of any platform that tracks power availability in your area?",required:true,opts:["Yes, I use one","Heard of one but don't use it","No, nothing like that exists","Not sure"]},
  {id:"coping",type:"multi",q:"How do you currently cope with power outages?",required:false,opts:["Charge devices in advance","Use a generator","Go to campus for power","Candles or fuel lamp","Mobile data only","No strategy"]},
  {id:"impact",type:"text",q:"In your own words, how do power outages affect your studies or daily life?",required:false,placeholder:"e.g. I waste transport money going to check if there is light..."},
];

// ── API ───────────────────────────────────────────────────────────────────────
async function fetchStatus(){const r=await fetch(API_BASE+"/api/status/all");if(!r.ok)throw 0;return r.json();}
async function fetchWeekly(){const r=await fetch(API_BASE+"/api/reports/daily/all?days=7");if(!r.ok)throw 0;const d=await r.json();const days=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];return d.map(x=>({...x,day:days[new Date(x.date).getDay()]}));}
async function fetchMonthly(){const r=await fetch(API_BASE+"/api/reports/monthly/all?year="+new Date().getFullYear());if(!r.ok)throw 0;return r.json();}
async function fetchCommunity(){const r=await fetch(API_BASE+"/api/community/summary/all");if(!r.ok)throw 0;return r.json();}
async function postReport(l,a){await fetch(API_BASE+"/api/community/report",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({location:l,accurate:a})});}

function timeAgo(iso){if(!iso)return"—";const m=Math.floor((Date.now()-new Date(iso))/60000);if(m<1)return"just now";if(m<60)return m+"m ago";return Math.floor(m/60)+"h ago";}
function outageDur(d){if(!d||d.status!=="OFF"||!d.last_updated)return null;const m=Math.floor((Date.now()-new Date(d.last_updated))/60000);if(m<60)return m+"m";const h=Math.floor(m/60),r=m%60;return r?h+"h "+r+"m":h+"h";}
function getPred(weekly,id){if(!weekly||weekly.length<3)return null;const avg=weekly.reduce((s,d)=>s+(d[id]||0),0)/weekly.length;const trend=(weekly[weekly.length-1][id]||0)-(weekly[0][id]||0);const best=weekly.reduce((b,d)=>(d[id]||0)>(b[id]||0)?d:b,weekly[0]);const worst=weekly.reduce((b,d)=>(d[id]||0)<(b[id]||0)?d:b,weekly[0]);return{avg:avg.toFixed(1),trend,best:best.day,worst:worst.day,label:trend>1?"Improving":trend<-1?"Declining":"Stable"};}

// ── Logo ──────────────────────────────────────────────────────────────────────
function Logo({size=30,dark}){
  const color = dark ? "#FF6B2B" : "#E8501A";
  return(
    <svg width={size} height={size} viewBox="0 0 30 30" fill="none">
      <circle cx="15" cy="15" r="14" fill={color+"18"} stroke={color+"44"} strokeWidth="1"/>
      <circle cx="15" cy="7" r="2.5" fill={color}/>
      <circle cx="22" cy="11" r="2.5" fill={color} opacity="0.7"/>
      <circle cx="22" cy="19" r="2.5" fill={color} opacity="0.5"/>
      <circle cx="15" cy="23" r="2.5" fill={color} opacity="0.7"/>
      <circle cx="8" cy="19" r="2.5" fill={color} opacity="0.5"/>
      <circle cx="8" cy="11" r="2.5" fill={color} opacity="0.7"/>
      <line x1="15" y1="7" x2="22" y2="11" stroke={color} strokeWidth="1" opacity="0.3"/>
      <line x1="22" y1="11" x2="22" y2="19" stroke={color} strokeWidth="1" opacity="0.3"/>
      <line x1="22" y1="19" x2="15" y2="23" stroke={color} strokeWidth="1" opacity="0.3"/>
      <line x1="15" y1="23" x2="8" y2="19" stroke={color} strokeWidth="1" opacity="0.3"/>
      <line x1="8" y1="19" x2="8" y2="11" stroke={color} strokeWidth="1" opacity="0.3"/>
      <line x1="8" y1="11" x2="15" y2="7" stroke={color} strokeWidth="1" opacity="0.3"/>
    </svg>
  );
}

// ── Status dot ────────────────────────────────────────────────────────────────
function StatusDot({on,size=10}){
  const color = on ? "#059669" : "#DC2626";
  return(
    <span style={{display:"inline-flex",alignItems:"center",gap:"6px"}}>
      <span style={{width:size,height:size,borderRadius:"50%",background:color,display:"inline-block",flexShrink:0,animation:on?"pulse 2.5s infinite":"none",boxShadow:on?"0 0 0 0 "+color:"none"}}/>
    </span>
  );
}

// ── Status pill ───────────────────────────────────────────────────────────────
function StatusPill({on,T}){
  return(
    <span style={{display:"inline-flex",alignItems:"center",gap:"6px",padding:"5px 12px",borderRadius:"20px",background:on?T.greenBg:T.redBg,border:"1px solid "+(on?T.greenBd:T.redBd)}}>
      <span style={{width:"7px",height:"7px",borderRadius:"50%",background:on?T.green:T.red,flexShrink:0,animation:on?"pulse 2.5s infinite":"none"}}/>
      <span style={{fontSize:"12px",fontWeight:700,color:on?T.green:T.red,fontFamily:"'DM Sans',sans-serif",letterSpacing:"0.2px"}}>{on?"Online":"Offline"}</span>
    </span>
  );
}

// ── Charts ────────────────────────────────────────────────────────────────────
function BarChart({data,color,locId,T}){
  const [hov,setHov]=useState(null);
  if(!data?.length)return<div style={{height:"80px",background:T.raised,borderRadius:"8px"}}/>;
  const max=Math.max(...data.map(d=>d[locId]||0),1);
  return(
    <div style={{display:"flex",gap:"5px",alignItems:"flex-end",height:"80px"}}>
      {data.map((d,i)=>(
        <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:"3px",height:"100%",justifyContent:"flex-end",position:"relative",cursor:"pointer"}} onMouseEnter={()=>setHov(i)} onMouseLeave={()=>setHov(null)}>
          {hov===i&&<div style={{position:"absolute",top:"-24px",background:T.t1,borderRadius:"5px",padding:"2px 7px",fontSize:"10px",color:T.surface,fontWeight:700,whiteSpace:"nowrap",fontFamily:"'DM Sans',sans-serif"}}>{(d[locId]||0).toFixed(1)}h</div>}
          <div style={{width:"100%",borderRadius:"3px 3px 0 0",height:Math.max(((d[locId]||0)/max*64),2)+"px",background:hov===i?color:color+"55",transition:"all 0.15s"}}/>
          <span style={{fontSize:"9px",color:T.t3,fontFamily:"'DM Sans',sans-serif"}}>{(d.day||"")[0]}</span>
        </div>
      ))}
    </div>
  );
}

function LineChart({data,color,locId,T}){
  const [hov,setHov]=useState(null);
  if(!data?.length)return<div style={{height:"60px",background:T.raised,borderRadius:"8px"}}/>;
  const max=Math.max(...data.map(d=>d[locId]||0),1);
  const W=300,H=60;
  const pts=data.map((d,i)=>[(i/(data.length-1))*(W-16)+8,H-((d[locId]||0)/max)*(H-10)-5]);
  const path=pts.map(([x,y],i)=>(i===0?"M":"L")+x+","+y).join(" ");
  return(
    <svg viewBox={"0 0 "+W+" "+(H+16)} style={{width:"100%"}}>
      <defs><linearGradient id={"g"+locId} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.15"/><stop offset="100%" stopColor={color} stopOpacity="0"/></linearGradient></defs>
      <path d={path+" L"+pts[pts.length-1][0]+","+H+" L"+pts[0][0]+","+H+" Z"} fill={"url(#g"+locId+")"}/>
      <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      {pts.map(([x,y],i)=>(
        <g key={i}>
          <circle cx={x} cy={y} r="8" fill="transparent" onMouseEnter={()=>setHov(i)} onMouseLeave={()=>setHov(null)} style={{cursor:"pointer"}}/>
          <circle cx={x} cy={y} r={hov===i?4:2.5} fill={color}/>
          {hov===i&&<g><rect x={x-18} y={y-22} width="36" height="15" rx="4" fill={T.t1}/><text x={x} y={y-11} textAnchor="middle" fontSize="9" fill={T.surface} fontWeight="700">{(data[i][locId]||0).toFixed(0)}h</text></g>}
        </g>
      ))}
      {data.map((d,i)=><text key={i} x={pts[i][0]} y={H+13} textAnchor="middle" fontSize="8" fill={T.t4}>{d.month_name?d.month_name[0]:""}</text>)}
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
    <div style={{padding:"16px",background:T.raised,borderRadius:"12px",border:"1px solid "+T.border}}>
      <p style={{fontSize:"12px",fontWeight:600,color:T.t3,textTransform:"uppercase",letterSpacing:"1px",marginBottom:"10px",fontFamily:"'DM Sans',sans-serif"}}>Is this reading accurate?</p>
      {voted!==null
        ?<p style={{fontSize:"13px",color:T.green,fontWeight:600,fontFamily:"'DM Sans',sans-serif"}}>Thank you for your feedback.</p>
        :<div style={{display:"flex",gap:"8px"}}>
          <button onClick={()=>vote(true)} disabled={busy} style={{flex:1,padding:"10px",borderRadius:"8px",border:"1px solid "+T.greenBd,background:T.greenBg,color:T.green,fontSize:"13px",fontWeight:600,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>Yes, accurate</button>
          <button onClick={()=>vote(false)} disabled={busy} style={{flex:1,padding:"10px",borderRadius:"8px",border:"1px solid "+T.redBd,background:T.redBg,color:T.red,fontSize:"13px",fontWeight:600,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>Not accurate</button>
        </div>
      }
      {stats?.total>0&&<p style={{marginTop:"8px",fontSize:"11px",color:T.t3,fontFamily:"'DM Sans',sans-serif"}}>{stats.total} report{stats.total>1?"s":""} · <span style={{color:stats.trust_score>=60?T.green:T.red,fontWeight:600}}>{stats.trust_score}% verified</span></p>}
    </div>
  );
}

// ── Predictor ─────────────────────────────────────────────────────────────────
function PredictorCard({weekly,T}){
  const [locId,setLocId]=useState(LOCS[0].id);
  const loc=LOCS.find(l=>l.id===locId);
  const p=getPred(weekly,locId);
  const tc=p?.trend>1?T.green:p?.trend<-1?T.red:T.t3;
  return(
    <div style={{background:T.card,borderRadius:"16px",padding:"20px",border:"1px solid "+T.border,marginBottom:"12px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"16px"}}>
        <div>
          <p style={{fontSize:"11px",fontWeight:600,color:T.t3,textTransform:"uppercase",letterSpacing:"1px",marginBottom:"3px",fontFamily:"'DM Sans',sans-serif"}}>Power Forecast</p>
          <p style={{fontFamily:"'Outfit',sans-serif",fontSize:"15px",fontWeight:700,color:T.t1}}>Based on last 7 days</p>
        </div>
      </div>
      <div style={{position:"relative",marginBottom:"14px"}}>
        <select value={locId} onChange={e=>setLocId(e.target.value)} style={{width:"100%",padding:"10px 36px 10px 14px",borderRadius:"10px",background:T.raised,border:"1px solid "+T.border,color:T.t1,fontSize:"14px",fontWeight:600,fontFamily:"'DM Sans',sans-serif",cursor:"pointer",outline:"none",appearance:"none",WebkitAppearance:"none"}}>
          {LOCS.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
        <div style={{position:"absolute",right:"12px",top:"50%",transform:"translateY(-50%)",pointerEvents:"none"}}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke={T.t3} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
      </div>
      {p?(
        <>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"14px"}}>
            <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
              <span style={{width:"8px",height:"8px",borderRadius:"50%",background:loc.color,display:"inline-block"}}/>
              <span style={{fontFamily:"'Outfit',sans-serif",fontSize:"14px",fontWeight:700,color:T.t1}}>{loc.name}</span>
            </div>
            <span style={{fontSize:"11px",fontWeight:600,color:tc,fontFamily:"'DM Sans',sans-serif"}}>{p.trend>1?"↑ "+p.label:p.trend<-1?"↓ "+p.label:"→ "+p.label}</span>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"8px",marginBottom:"14px"}}>
            {[["Daily Avg",p.avg+"h",loc.color],["Best Day",p.best,T.green],["Worst Day",p.worst,T.red]].map(([l,v,c])=>(
              <div key={l} style={{background:T.raised,borderRadius:"10px",padding:"12px 8px",textAlign:"center",border:"1px solid "+T.border}}>
                <p style={{fontFamily:"'Outfit',sans-serif",fontSize:"18px",fontWeight:800,color:c,lineHeight:1,marginBottom:"4px"}}>{v}</p>
                <p style={{fontSize:"9px",color:T.t3,textTransform:"uppercase",letterSpacing:"0.5px",fontFamily:"'DM Sans',sans-serif"}}>{l}</p>
              </div>
            ))}
          </div>
          <div style={{background:T.raised,borderRadius:"10px",padding:"12px 14px",fontSize:"13px",color:T.t2,lineHeight:1.6,border:"1px solid "+T.border,fontFamily:"'DM Sans',sans-serif"}}>
            Expect about <strong style={{color:loc.color}}>{p.avg} hrs</strong> of power today in {loc.name}. {p.trend>1?"Supply has been improving — a good time to charge your devices.":p.trend<-1?"Supply has been declining — charge your devices as early as possible.":"Supply has been stable this week."}
          </div>
          <p style={{marginTop:"8px",fontSize:"10px",color:T.t4,textAlign:"center",fontFamily:"'DM Sans',sans-serif"}}>Based on 7-day statistical analysis · Not a guarantee</p>
        </>
      ):<p style={{fontSize:"13px",color:T.t3,textAlign:"center",padding:"12px",fontFamily:"'DM Sans',sans-serif"}}>Not enough data yet. Check back in a few days.</p>}
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
      <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.5)",backdropFilter:"blur(6px)"}}/>
      <div style={{position:"relative",width:"100%",maxWidth:"480px",margin:"0 auto",background:T.surface,borderRadius:"20px 20px 0 0",padding:"0 20px 48px",animation:"slideUp 0.3s cubic-bezier(0.16,1,0.3,1)",maxHeight:"92vh",overflowY:"auto",border:"1px solid "+T.border,borderBottom:"none"}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"center",padding:"12px 0 18px"}}>
          <div style={{width:"36px",height:"4px",background:T.border,borderRadius:"4px"}}/>
        </div>

        {/* Header */}
        <div style={{marginBottom:"20px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"8px"}}>
            <div>
              <p style={{fontSize:"11px",color:T.t3,letterSpacing:"1.5px",textTransform:"uppercase",marginBottom:"5px",fontFamily:"'DM Sans',sans-serif"}}>Location</p>
              <h2 style={{fontSize:"28px",fontWeight:800,color:loc.color,letterSpacing:"-0.5px",fontFamily:"'Outfit',sans-serif"}}>{loc.name}</h2>
              <p style={{fontSize:"12px",color:T.t3,marginTop:"4px",fontFamily:"'DM Sans',sans-serif"}}>University of Ibadan · Off-campus</p>
            </div>
            <div style={{textAlign:"right"}}>
              <StatusPill on={on} T={T}/>
              {!on&&dur&&<p style={{fontSize:"11px",color:T.red,fontWeight:600,marginTop:"5px",fontFamily:"'DM Sans',sans-serif"}}>Offline for {dur}</p>}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px",marginBottom:"14px"}}>
          {[["Status",on?"Online":"Offline",on?T.green:T.red],["7-Day Avg",avg?avg+"h/day":"—",T.t1],["Last Reading",d?.last_updated?timeAgo(d.last_updated):"—",T.t2],["Offline Duration",!on&&dur?dur:"—",T.red]].map(([k,v,c])=>(
            <div key={k} style={{background:T.raised,borderRadius:"12px",padding:"14px 16px",border:"1px solid "+T.border}}>
              <p style={{fontSize:"10px",fontWeight:600,color:T.t3,textTransform:"uppercase",letterSpacing:"1px",marginBottom:"8px",fontFamily:"'DM Sans',sans-serif"}}>{k}</p>
              <p style={{fontSize:"20px",fontWeight:800,color:c,lineHeight:1,fontFamily:"'Outfit',sans-serif"}}>{v}</p>
            </div>
          ))}
        </div>

        {/* Community */}
        <CommunityBtn locId={loc.id} community={community} onDone={onReport} T={T}/>

        {/* Charts */}
        <div style={{background:T.raised,borderRadius:"12px",padding:"16px",marginTop:"12px",marginBottom:"10px",border:"1px solid "+T.border}}>
          <p style={{fontSize:"11px",fontWeight:600,color:T.t3,textTransform:"uppercase",letterSpacing:"1px",marginBottom:"12px",fontFamily:"'DM Sans',sans-serif"}}>This Week</p>
          <BarChart data={weekly} color={loc.color} locId={loc.id} T={T}/>
        </div>
        <div style={{background:T.raised,borderRadius:"12px",padding:"16px",border:"1px solid "+T.border}}>
          <p style={{fontSize:"11px",fontWeight:600,color:T.t3,textTransform:"uppercase",letterSpacing:"1px",marginBottom:"10px",fontFamily:"'DM Sans',sans-serif"}}>Monthly Trend</p>
          <LineChart data={monthly} color={loc.color} locId={loc.id} T={T}/>
        </div>
        <p style={{textAlign:"center",marginTop:"12px",fontSize:"11px",color:T.t4,fontFamily:"'DM Sans',sans-serif"}}>Data refreshes every 30 seconds</p>
      </div>
    </div>
  );
}

// ── Top bar ───────────────────────────────────────────────────────────────────
function TopBar({tab,dark,setDark}){
  const T=getT(dark);
  const titles={home:"Smart Streets",dashboard:"Grid Monitor",survey:"Community Survey"};
  return(
    <div style={{position:"fixed",top:0,left:0,right:0,zIndex:100,background:dark?"rgba(7,9,15,0.96)":"rgba(245,247,250,0.96)",backdropFilter:"blur(20px)",borderBottom:"1px solid "+T.border,height:"56px",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 18px"}}>
      <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
        <Logo size={26} dark={dark}/>
        <span style={{fontFamily:"'Outfit',sans-serif",fontSize:"16px",fontWeight:800,color:T.t1,letterSpacing:"-0.3px"}}>{titles[tab]}</span>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
        {tab==="dashboard"&&(
          <div style={{display:"flex",alignItems:"center",gap:"5px"}}>
            <span style={{width:"6px",height:"6px",borderRadius:"50%",background:T.green,display:"inline-block",animation:"pulse 2s infinite"}}/>
            <span style={{fontSize:"10px",fontWeight:700,color:T.green,fontFamily:"'DM Sans',sans-serif",letterSpacing:"0.5px"}}>LIVE</span>
          </div>
        )}
        <button onClick={()=>setDark(d=>!d)} style={{width:"34px",height:"34px",borderRadius:"8px",border:"1px solid "+T.border,background:T.raised,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"14px"}}>
          {dark?"☀️":"🌙"}
        </button>
      </div>
    </div>
  );
}

// ── Bottom tab bar ────────────────────────────────────────────────────────────
function TabBar({tab,setTab,dark}){
  const T=getT(dark);
  const accent = dark ? "#FF6B2B" : "#E8501A";
  const TABS=[
    {id:"home",label:"Home",icon:(a)=>(
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke={a?accent:T.t3} strokeWidth="2" fill={a?accent+"18":"none"}/>
        <polyline points="9,22 9,12 15,12 15,22" stroke={a?accent:T.t3} strokeWidth="2"/>
      </svg>
    )},
    {id:"dashboard",label:"Monitor",icon:(a)=>(
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <rect x="2" y="3" width="20" height="14" rx="2" stroke={a?accent:T.t3} strokeWidth="2" fill={a?accent+"18":"none"}/>
        <line x1="8" y1="21" x2="16" y2="21" stroke={a?accent:T.t3} strokeWidth="2" strokeLinecap="round"/>
        <line x1="12" y1="17" x2="12" y2="21" stroke={a?accent:T.t3} strokeWidth="2" strokeLinecap="round"/>
      </svg>
    )},
    {id:"survey",label:"Survey",icon:(a)=>(
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M9 11l3 3L22 4" stroke={a?accent:T.t3} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" stroke={a?accent:T.t3} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill={a?accent+"18":"none"}/>
      </svg>
    )},
  ];
  return(
    <div style={{position:"fixed",bottom:0,left:0,right:0,zIndex:100,background:dark?"rgba(7,9,15,0.97)":"rgba(245,247,250,0.97)",backdropFilter:"blur(20px)",borderTop:"1px solid "+T.border,paddingBottom:"env(safe-area-inset-bottom,8px)"}}>
      <div style={{display:"flex",maxWidth:"480px",margin:"0 auto"}}>
        {TABS.map(({id,label,icon})=>{
          const active=tab===id;
          return(
            <button key={id} onClick={()=>setTab(id)} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:"3px",padding:"10px 0 8px",background:"none",border:"none",cursor:"pointer"}}>
              {icon(active)}
              <span style={{fontSize:"10px",fontWeight:active?700:400,color:active?accent:T.t3,fontFamily:"'DM Sans',sans-serif"}}>{label}</span>
              {active&&<span style={{width:"3px",height:"3px",borderRadius:"50%",background:accent,display:"inline-block"}}/>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
//  HOME PAGE
// ══════════════════════════════════════════════
function HomePage({setTab,live,dark}){
  const T=getT(dark);
  const accent = dark ? "#FF6B2B" : "#E8501A";
  const onCount=live?LOCS.filter(l=>live[l.id]?.status==="ON").length:null;

  return(
    <div style={{paddingBottom:"100px",fontFamily:"'DM Sans',sans-serif"}}>

      {/* Hero */}
      <div style={{padding:"80px 24px 40px",background:dark?"linear-gradient(160deg,#0E1B30,#07090F)":T.base,position:"relative",overflow:"hidden"}}>
        {/* Subtle background circle */}
        <div style={{position:"absolute",top:"-100px",right:"-80px",width:"300px",height:"300px",borderRadius:"50%",background:"radial-gradient(circle,"+accent+"12 0%,transparent 70%)",pointerEvents:"none"}}/>

        {/* Live indicator */}
        <div style={{display:"inline-flex",alignItems:"center",gap:"7px",background:T.greenBg,border:"1px solid "+T.greenBd,borderRadius:"20px",padding:"5px 13px",marginBottom:"24px"}}>
          <span style={{width:"6px",height:"6px",borderRadius:"50%",background:T.green,display:"inline-block",animation:"pulse 2s infinite"}}/>
          <span style={{fontSize:"12px",fontWeight:600,color:T.green,fontFamily:"'DM Sans',sans-serif"}}>
            {onCount!==null?onCount+" of 3 locations monitored live":"Connecting to grid..."}
          </span>
        </div>

        <h1 style={{fontFamily:"'Outfit',sans-serif",fontSize:"40px",fontWeight:800,color:dark?"#F0F4FF":T.t1,lineHeight:1.08,letterSpacing:"-1.5px",marginBottom:"16px"}}>
          Stop Guessing<br/>
          <span style={{color:accent}}>Know when the<br/>lights are on</span>
        </h1>

        <p style={{fontSize:"15px",color:T.t2,lineHeight:1.8,marginBottom:"32px",maxWidth:"340px"}}>
          Real-time electricity tracking for off-campus students and residents along UI environs. Plan your time better ultimately making you smarter.
        </p>

        <div style={{display:"flex",flexDirection:"column",gap:"10px"}}>
          <button onClick={()=>setTab("dashboard")} style={{width:"100%",padding:"16px",borderRadius:"12px",background:"linear-gradient(135deg,"+accent+","+T.orangeHi+")",border:"none",color:"#fff",fontSize:"15px",fontWeight:700,cursor:"pointer",fontFamily:"'Outfit',sans-serif",letterSpacing:"-0.2px",boxShadow:"0 6px 20px "+accent+"33"}}>
            View Grid Status
          </button>
          <button onClick={()=>setTab("survey")} style={{width:"100%",padding:"15px",borderRadius:"12px",background:"transparent",border:"1px solid "+T.border,color:T.t2,fontSize:"14px",fontWeight:500,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",transition:"all 0.15s"}} onMouseEnter={e=>{e.currentTarget.style.borderColor=T.borderHi;e.currentTarget.style.color=T.t1;}} onMouseLeave={e=>{e.currentTarget.style.borderColor=T.border;e.currentTarget.style.color=T.t2;}}>
            Take the Research Survey
          </button>
        </div>
      </div>

      {/* Live status strip */}
      <div style={{margin:"20px 16px 0",background:T.surface,borderRadius:"16px",border:"1px solid "+T.border,overflow:"hidden"}}>
        <div style={{padding:"13px 18px",borderBottom:"1px solid "+T.border,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <span style={{fontSize:"11px",fontWeight:700,color:T.t3,textTransform:"uppercase",letterSpacing:"1.5px",fontFamily:"'DM Sans',sans-serif"}}>Live Grid Status</span>
          <span style={{fontSize:"10px",color:T.t3,fontFamily:"'DM Sans',sans-serif"}}>Updates every minute</span>
        </div>
        {LOCS.map((loc,i)=>{
          const d=live?.[loc.id];const on=d?.status==="ON";const dur=outageDur(d);
          return(
            <div key={loc.id} onClick={()=>setTab("dashboard")} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"15px 18px",borderBottom:i<LOCS.length-1?"1px solid "+T.border:"none",cursor:"pointer",transition:"background 0.15s"}} onMouseEnter={e=>e.currentTarget.style.background=T.raised} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
                <StatusDot on={on} size={10}/>
                <div>
                  <p style={{fontFamily:"'Outfit',sans-serif",fontSize:"15px",fontWeight:600,color:T.t1}}>{loc.name}</p>
                  <p style={{fontSize:"11px",color:T.t3,marginTop:"1px",fontFamily:"'DM Sans',sans-serif"}}>{!live?"—":!on&&dur?"Offline for "+dur:d?.last_updated?"Updated "+timeAgo(d.last_updated):"Awaiting sensor"}</p>
                </div>
              </div>
              <StatusPill on={!!live&&on} T={T}/>
            </div>
          );
        })}
      </div>

      {/* What we do */}
      <div style={{padding:"28px 16px 0"}}>
        <p style={{fontSize:"11px",fontWeight:700,color:T.t3,textTransform:"uppercase",letterSpacing:"2px",marginBottom:"16px",fontFamily:"'DM Sans',sans-serif"}}>What Smart Streets Does</p>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px",alignItems:"stretch"}}>
          {[
            {t:"Real-Time Monitoring",d:"Sensors report electricity status every minute, so you always know what's happening before you leave."},
            {t:"Historical Analytics",d:"Monthly reliability scores and total uptime hours per location, powered by our data backend."},
            {t:"Predictive Insights",d:"We analyse historical patterns to forecast the most likely windows for grid power at each location."},
            {t:"Community Verified",d:"Students confirm sensor readings, adding a human layer of trust to every data point we publish."},
          ].map(({t,d})=>(
            <div key={t} style={{background:T.surface,borderRadius:"14px",padding:"18px 16px",border:"1px solid "+T.border,display:"flex",flexDirection:"column",gap:"8px"}}>
              <div style={{width:"6px",height:"6px",borderRadius:"50%",background:accent,marginBottom:"2px"}}/>
              <p style={{fontFamily:"'Outfit',sans-serif",fontSize:"13px",fontWeight:700,color:T.t1}}>{t}</p>
              <p style={{fontSize:"12px",color:T.t2,lineHeight:1.6,flex:1,fontFamily:"'DM Sans',sans-serif"}}>{d}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div style={{margin:"20px 16px 0",padding:"24px",borderRadius:"16px",border:"1px solid "+T.border,background:T.surface}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"20px"}}>
          {[["3","Locations covered"],["1 min","Sensor frequency"],["60+","Students surveyed"],["Free","Always"]].map(([v,l])=>(
            <div key={l}>
              <p style={{fontFamily:"'Outfit',sans-serif",fontSize:"32px",fontWeight:800,color:accent,letterSpacing:"-1.5px",lineHeight:1}}>{v}</p>
              <p style={{fontSize:"13px",color:T.t2,marginTop:"5px",fontFamily:"'DM Sans',sans-serif"}}>{l}</p>
            </div>
          ))}
        </div>
      </div>

      {/* About */}
      <div style={{margin:"20px 16px 0",padding:"22px",borderRadius:"16px",border:"1px solid "+T.border,background:T.surface}}>
        <div style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"14px"}}>
          <Logo size={24} dark={dark}/>
          <div>
            <p style={{fontFamily:"'Outfit',sans-serif",fontSize:"15px",fontWeight:800,color:T.t1}}>About Smart Streets</p>
            <p style={{fontSize:"11px",color:T.t3,fontFamily:"'DM Sans',sans-serif"}}>An automated urban data initiative</p>
          </div>
        </div>
        <p style={{fontSize:"14px",color:T.t2,lineHeight:1.8,marginBottom:"14px",fontFamily:"'DM Sans',sans-serif"}}>
          Smart Streets is a community-centered project. Utilizes sensors to monitor electricity status across UI environs enabling students and residents to be smarter in their daily activities.
        </p>
        <p style={{fontSize:"14px",color:T.t2,lineHeight:1.8,marginBottom:"16px",fontFamily:"'DM Sans',sans-serif"}}>
The goal is to provide you with an electricity tracking platform in several locations accessible to anyone, anywhere, ultimately making you smarter.
        </p>
        <div style={{paddingTop:"14px",borderTop:"1px solid "+T.border}}>
          <p style={{fontSize:"12px",color:T.t3,marginBottom:"3px",fontFamily:"'DM Sans',sans-serif"}}></p>
          <p style={{fontSize:"12px",color:T.t3,fontFamily:"'DM Sans',sans-serif"}}></p>
          <p style={{fontSize:"11px",color:T.t4,marginTop:"6px",fontFamily:"'DM Sans',sans-serif"}}></p>
        </div>
      </div>

    </div>
  );
}

// ══════════════════════════════════════════════
//  DASHBOARD PAGE
// ══════════════════════════════════════════════
function DashboardPage({live,weekly,monthly,community,loading,error,dark,onReport}){
  const T=getT(dark);
  const accent = dark ? "#FF6B2B" : "#E8501A";
  const [selected,setSelected]=useState(null);
  const [alertOff,setAlertOff]=useState(false);
  const off=live?LOCS.filter(l=>live[l.id]?.status==="OFF"):[];
  const onCount=live?LOCS.filter(l=>live[l.id]?.status==="ON").length:0;
  const now=new Date();
  const time=now.toLocaleTimeString("en-NG",{hour:"2-digit",minute:"2-digit"});
  const date=now.toLocaleDateString("en-NG",{weekday:"long",day:"numeric",month:"long"});

  return(
    <div style={{padding:"70px 16px 100px",fontFamily:"'DM Sans',sans-serif"}}>

      {/* Header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"20px"}}>
        <div>
          <p style={{fontSize:"11px",fontWeight:600,color:T.t3,letterSpacing:"0.5px",marginBottom:"4px",fontFamily:"'DM Sans',sans-serif"}}>{date}</p>
          <h1 style={{fontFamily:"'Outfit',sans-serif",fontSize:"26px",fontWeight:800,color:T.t1,letterSpacing:"-0.5px",lineHeight:1}}>Grid Monitor</h1>
          <p style={{fontSize:"12px",color:T.t3,marginTop:"4px",fontFamily:"'DM Sans',sans-serif"}}></p>
        </div>
        <div style={{textAlign:"right"}}>
          <p style={{fontFamily:"'Outfit',sans-serif",fontSize:"24px",fontWeight:800,color:T.t1,lineHeight:1}}>{time}</p>
          <p style={{fontSize:"10px",fontWeight:600,marginTop:"3px",color:loading?T.amber:error?T.red:T.green,fontFamily:"'DM Sans',sans-serif"}}>
            {loading?"Syncing...":error?"Connection error":"Live"}
          </p>
        </div>
      </div>

      {/* Summary card */}
      <div style={{background:T.surface,borderRadius:"16px",padding:"20px 22px",border:"1px solid "+T.border,marginBottom:"14px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div>
          <p style={{fontFamily:"'Outfit',sans-serif",fontSize:"48px",fontWeight:800,color:accent,lineHeight:1,letterSpacing:"-2px"}}>
            {live?onCount:"–"}<span style={{fontSize:"18px",color:T.t3,fontWeight:500}}>/3</span>
          </p>
          <p style={{fontSize:"13px",color:T.t2,marginTop:"5px",fontFamily:"'DM Sans',sans-serif"}}>locations with power right now</p>
        </div>
        <div style={{textAlign:"right"}}>
          {LOCS.map(loc=>{
            const on=live?.[loc.id]?.status==="ON";
            return(
              <div key={loc.id} style={{display:"flex",alignItems:"center",gap:"8px",justifyContent:"flex-end",marginBottom:"7px"}}>
                <span style={{fontSize:"13px",color:T.t2,fontFamily:"'DM Sans',sans-serif"}}>{loc.name}</span>
                <StatusDot on={!!live&&on} size={9}/>
              </div>
            );
          })}
        </div>
      </div>

      {/* Alert */}
      {!alertOff&&off.length>0&&(
        <div style={{background:T.redBg,border:"1px solid "+T.redBd,borderRadius:"12px",padding:"13px 16px",display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"14px"}}>
          <div>
            <p style={{fontSize:"13px",fontWeight:700,color:T.red,marginBottom:"3px",fontFamily:"'DM Sans',sans-serif"}}>Power outage detected</p>
            <p style={{fontSize:"12px",color:T.t2,fontFamily:"'DM Sans',sans-serif"}}>{off.map(l=>l.name).join(" and ")} — no power right now</p>
          </div>
          <button onClick={()=>setAlertOff(true)} style={{background:"none",border:"none",color:T.t3,cursor:"pointer",fontSize:"18px",lineHeight:1,padding:"0 0 0 10px"}}>×</button>
        </div>
      )}

      {/* Location cards */}
      <div style={{display:"flex",flexDirection:"column",gap:"10px",marginBottom:"14px"}}>
        {LOCS.map((loc,i)=>{
          const d=live?.[loc.id];const on=d?.status==="ON";const dur=outageDur(d);
          return(
            <div key={loc.id} onClick={()=>!loading&&setSelected(loc)}
              style={{background:T.surface,borderRadius:"16px",padding:"18px",border:"1px solid "+(on?loc.color+"33":T.border),cursor:loading?"default":"pointer",transition:"all 0.18s",boxShadow:on?"0 2px 16px "+loc.glow:"none"}}
              onMouseEnter={e=>{if(!loading)e.currentTarget.style.background=T.raised;}} onMouseLeave={e=>{e.currentTarget.style.background=T.surface;}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <div style={{display:"flex",alignItems:"center",gap:"14px"}}>
                  {/* Status indicator */}
                  <div style={{width:"48px",height:"48px",borderRadius:"12px",background:on?loc.color+"12":T.raised,border:"1px solid "+(on?loc.color+"33":T.border),display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    <StatusDot on={on} size={12}/>
                  </div>
                  <div>
                    <p style={{fontFamily:"'Outfit',sans-serif",fontSize:"17px",fontWeight:700,color:T.t1,marginBottom:"3px"}}>{loc.name}</p>
                    <p style={{fontSize:"11px",color:T.t3,fontFamily:"'DM Sans',sans-serif"}}>
                      {loading?"Loading..."
                       :!on&&dur?<span style={{color:T.red,fontWeight:600}}>Offline · {dur}</span>
                       :d?.last_updated?"Updated "+timeAgo(d.last_updated)
                       :"Awaiting sensor"}
                    </p>
                  </div>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
                  <StatusPill on={!!live&&on} T={T}/>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke={T.t4} strokeWidth="2" strokeLinecap="round"/></svg>
                </div>
              </div>
              {/* Progress bar for online locations */}
              {on&&weekly&&(()=>{
                const avg=weekly.reduce((s,d)=>s+(d[loc.id]||0),0)/weekly.length;
                return(
                  <div style={{marginTop:"14px",paddingTop:"14px",borderTop:"1px solid "+T.border}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:"6px"}}>
                      <span style={{fontSize:"11px",color:T.t3,fontFamily:"'DM Sans',sans-serif"}}>7-day average</span>
                      <span style={{fontSize:"11px",fontWeight:700,color:loc.color,fontFamily:"'DM Sans',sans-serif"}}>{avg.toFixed(1)}h / day</span>
                    </div>
                    <div style={{height:"4px",background:T.border,borderRadius:"4px",overflow:"hidden"}}>
                      <div style={{width:Math.min((avg/24)*100,100)+"%",height:"100%",background:loc.color,borderRadius:"4px",transition:"width 1s ease"}}/>
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
        const ds=y.date?new Date(y.date).toLocaleDateString("en-NG",{weekday:"short",month:"short",day:"numeric"}):"Yesterday";
        return(
          <div style={{background:T.surface,borderRadius:"16px",padding:"18px",border:"1px solid "+T.border,marginBottom:"12px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"14px"}}>
              <div>
                <p style={{fontSize:"11px",fontWeight:600,color:T.t3,textTransform:"uppercase",letterSpacing:"1px",marginBottom:"2px",fontFamily:"'DM Sans',sans-serif"}}>Yesterday's Summary</p>
                <p style={{fontFamily:"'Outfit',sans-serif",fontSize:"15px",fontWeight:700,color:T.t1}}>{ds}</p>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"8px"}}>
              {LOCS.map(loc=>{
                const h=parseFloat((y[loc.id]||0).toFixed(1));
                const qc=h>=16?T.green:h>=10?T.amber:T.red;
                const ql=h>=16?"Reliable":h>=10?"Moderate":"Poor";
                return(
                  <div key={loc.id} style={{background:T.raised,borderRadius:"10px",padding:"12px 10px",textAlign:"center",border:"1px solid "+T.border}}>
                    <p style={{fontSize:"10px",color:T.t3,marginBottom:"5px",fontFamily:"'DM Sans',sans-serif"}}>{loc.name}</p>
                    <p style={{fontFamily:"'Outfit',sans-serif",fontSize:"20px",fontWeight:800,color:loc.color,lineHeight:1,marginBottom:"3px"}}>{h}h</p>
                    <p style={{fontSize:"9px",fontWeight:700,color:qc,textTransform:"uppercase",letterSpacing:"0.5px",fontFamily:"'DM Sans',sans-serif"}}>{ql}</p>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Predictor */}
      {weekly&&weekly.length>=3&&<PredictorCard weekly={weekly} T={T}/>}

      {/* Weekly summary */}
      <div style={{background:T.surface,borderRadius:"16px",padding:"18px",border:"1px solid "+T.border}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"16px"}}>
          <p style={{fontFamily:"'Outfit',sans-serif",fontSize:"15px",fontWeight:700,color:T.t1}}>This week</p>
          <p style={{fontSize:"11px",color:T.t3,fontFamily:"'DM Sans',sans-serif"}}>avg. hours per day</p>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:"14px"}}>
          {LOCS.map(loc=>{
            const avg=weekly?.length?weekly.reduce((s,d)=>s+(d[loc.id]||0),0)/weekly.length:0;
            return(
              <div key={loc.id}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:"7px"}}>
                  <span style={{fontSize:"13px",color:T.t2,fontFamily:"'DM Sans',sans-serif"}}>{loc.name}</span>
                  <span style={{fontFamily:"'Outfit',sans-serif",fontSize:"13px",fontWeight:700,color:loc.color}}>{avg.toFixed(1)}h</span>
                </div>
                <div style={{height:"4px",background:T.raised,borderRadius:"4px",overflow:"hidden"}}>
                  <div style={{width:Math.min((avg/24)*100,100)+"%",height:"100%",background:loc.color,borderRadius:"4px",transition:"width 1.2s ease"}}/>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <p style={{textAlign:"center",fontSize:"11px",color:T.t4,marginTop:"12px",fontFamily:"'DM Sans',sans-serif"}}>Tap any location card for full details</p>

      {selected&&<Drawer loc={selected} live={live} weekly={weekly} monthly={monthly} community={community} onClose={()=>setSelected(null)} onReport={onReport} dark={dark}/>}
    </div>
  );
}

// ══════════════════════════════════════════════
//  SURVEY PAGE
// ══════════════════════════════════════════════
function SurveyPage({dark}){
  const T=getT(dark);
  const accent = dark ? "#FF6B2B" : "#E8501A";
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
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",padding:"80px 24px",background:T.base,fontFamily:"'DM Sans',sans-serif"}}>
      <div style={{textAlign:"center",maxWidth:"340px"}}>
        <div style={{width:"64px",height:"64px",borderRadius:"16px",background:T.greenBg,border:"1px solid "+T.greenBd,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 20px"}}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke={T.green} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
        <h2 style={{fontFamily:"'Outfit',sans-serif",fontSize:"26px",fontWeight:800,color:T.t1,marginBottom:"10px",letterSpacing:"-0.3px"}}>Response recorded</h2>
        <p style={{fontSize:"14px",color:T.t2,lineHeight:1.7,marginBottom:"24px"}}>Thank you for contributing to this research. Your input helps us build a better grid tracker for students across Agbowo, Orogun and Barika.</p>
        <button onClick={()=>{setStep(-1);setAns({});setDone(false);}} style={{background:T.raised,border:"1px solid "+T.border,borderRadius:"10px",padding:"12px 22px",color:T.t2,fontSize:"13px",cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>Submit another response</button>
      </div>
    </div>
  );

  return(
    <div style={{minHeight:"100vh",padding:"70px 20px 100px",maxWidth:"480px",margin:"0 auto",fontFamily:"'DM Sans',sans-serif"}}>

      {/* Progress */}
      {step>=0&&(
        <div style={{marginBottom:"28px"}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:"8px"}}>
            <span style={{fontSize:"12px",color:T.t3}}>Question {step+1} of {total}</span>
            <span style={{fontSize:"12px",fontWeight:700,color:accent}}>{pct}%</span>
          </div>
          <div style={{height:"3px",background:T.border,borderRadius:"3px",overflow:"hidden"}}>
            <div style={{width:pct+"%",height:"100%",background:accent,borderRadius:"3px",transition:"width 0.4s ease"}}/>
          </div>
        </div>
      )}

      {step===-1?(
        <div>
          <div style={{marginBottom:"28px"}}>
            <span style={{display:"inline-block",background:T.orangeLo,border:"1px solid "+T.orangeBd,borderRadius:"20px",padding:"4px 12px",fontSize:"11px",fontWeight:600,color:accent,marginBottom:"20px",fontFamily:"'DM Sans',sans-serif"}}>Community Research Survey</span>
            <h1 style={{fontFamily:"'Outfit',sans-serif",fontSize:"28px",fontWeight:800,color:T.t1,letterSpacing:"-0.5px",lineHeight:1.2,marginBottom:"12px"}}>Help us understand the problem</h1>
            <p style={{fontSize:"14px",color:T.t2,lineHeight:1.7}}>Under 3 minutes. Your responses shape Smart Streets and help us demonstrate real-world impact.</p>
          </div>
          <div style={{background:T.surface,borderRadius:"14px",overflow:"hidden",border:"1px solid "+T.border,marginBottom:"24px"}}>
            {[["Anonymous","No personal data is collected"],["3 minutes",total+" questions total"],["Research only","FLDC Capstone · University of Ibadan"]].map(([t,s],i,arr)=>(
              <div key={t} style={{display:"flex",alignItems:"center",gap:"14px",padding:"14px 18px",borderBottom:i<arr.length-1?"1px solid "+T.border:"none"}}>
                <div style={{width:"6px",height:"6px",borderRadius:"50%",background:accent,flexShrink:0}}/>
                <div>
                  <p style={{fontSize:"13px",fontWeight:600,color:T.t1}}>{t}</p>
                  <p style={{fontSize:"11px",color:T.t3,marginTop:"1px"}}>{s}</p>
                </div>
              </div>
            ))}
          </div>
          <button onClick={next} style={{width:"100%",padding:"16px",borderRadius:"12px",background:"linear-gradient(135deg,"+accent+","+T.orangeHi+")",border:"none",color:"#fff",fontSize:"15px",fontWeight:700,cursor:"pointer",fontFamily:"'Outfit',sans-serif",letterSpacing:"-0.2px",boxShadow:"0 6px 20px "+accent+"30"}}>
            Begin Survey
          </button>
        </div>
      ):(
        <div key={step}>
          <div style={{marginBottom:"10px"}}>
            <span style={{display:"inline-block",background:q.required?T.orangeLo:T.raised,border:"1px solid "+(q.required?T.orangeBd:T.border),borderRadius:"20px",padding:"3px 11px",fontSize:"11px",fontWeight:600,color:q.required?accent:T.t3}}>{q.required?"Required":"Optional"}</span>
          </div>
          <h2 style={{fontFamily:"'Outfit',sans-serif",fontSize:"20px",fontWeight:700,color:T.t1,lineHeight:1.35,letterSpacing:"-0.2px",marginBottom:"24px"}}>{q.q}</h2>

          {q.type==="choice"&&<div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
            {q.opts.map(o=>{const s=ans[q.id]===o;return(
              <button key={o} onClick={()=>set(o)} style={{padding:"14px 16px",borderRadius:"11px",textAlign:"left",background:s?T.orangeLo:T.surface,border:"1px solid "+(s?accent:T.border),color:s?accent:T.t1,fontSize:"14px",fontWeight:s?600:400,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",transition:"all 0.12s",display:"flex",alignItems:"center",gap:"12px"}}>
                <div style={{width:"18px",height:"18px",borderRadius:"50%",border:"2px solid "+(s?accent:T.t4),background:s?accent:"transparent",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
                  {s&&<div style={{width:"6px",height:"6px",borderRadius:"50%",background:"#fff"}}/>}
                </div>{o}
              </button>
            );})}
          </div>}

          {q.type==="scale"&&<div>
            <div style={{background:T.surface,borderRadius:"14px",padding:"24px",textAlign:"center",marginBottom:"20px",border:"1px solid "+T.border}}>
              <span style={{fontFamily:"'Outfit',sans-serif",fontSize:"56px",fontWeight:800,color:accent,lineHeight:1}}>{ans[q.id]??Math.round(q.max/2)}</span>
              <span style={{fontSize:"16px",color:T.t3,marginLeft:"8px",fontFamily:"'DM Sans',sans-serif"}}>{q.unit}</span>
            </div>
            <input type="range" min={q.min} max={q.max} step="1" value={ans[q.id]??Math.round(q.max/2)} onChange={e=>set(parseInt(e.target.value))} style={{width:"100%",cursor:"pointer"}}/>
            <div style={{display:"flex",justifyContent:"space-between",marginTop:"6px"}}>
              <span style={{fontSize:"11px",color:T.t4,fontFamily:"'DM Sans',sans-serif"}}>{q.min} {q.unit}</span>
              <span style={{fontSize:"11px",color:T.t4,fontFamily:"'DM Sans',sans-serif"}}>{q.max} {q.unit}+</span>
            </div>
          </div>}

          {q.type==="rating"&&<div>
            <div style={{display:"flex",gap:"8px",justifyContent:"center",marginBottom:"12px"}}>
              {[1,2,3,4,5].map(n=>{const s=ans[q.id]===n;return(
                <button key={n} onClick={()=>set(n)} style={{width:"54px",height:"54px",borderRadius:"12px",border:"1px solid "+(s?accent:T.border),background:s?"linear-gradient(135deg,"+accent+","+T.orangeHi+")":T.surface,color:s?"#fff":T.t1,fontFamily:"'Outfit',sans-serif",fontSize:"18px",fontWeight:700,cursor:"pointer",transition:"all 0.12s"}}>{n}</button>
              );})}
            </div>
            <div style={{display:"flex",justifyContent:"space-between"}}>
              <span style={{fontSize:"11px",color:T.t3,fontFamily:"'DM Sans',sans-serif"}}>{q.low}</span>
              <span style={{fontSize:"11px",color:T.t3,fontFamily:"'DM Sans',sans-serif"}}>{q.high}</span>
            </div>
          </div>}

          {q.type==="multi"&&<div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
            {q.opts.map(o=>{
              const c=(ans[q.id]||[]).includes(o);
              const toggle=()=>{const p=ans[q.id]||[];set(c?p.filter(v=>v!==o):[...p,o]);};
              return(
                <button key={o} onClick={toggle} style={{padding:"13px 16px",borderRadius:"11px",textAlign:"left",background:c?T.orangeLo:T.surface,border:"1px solid "+(c?accent:T.border),color:c?accent:T.t1,fontSize:"14px",fontWeight:c?600:400,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",transition:"all 0.12s",display:"flex",alignItems:"center",gap:"12px"}}>
                  <div style={{width:"18px",height:"18px",borderRadius:"5px",border:"2px solid "+(c?accent:T.t4),background:c?accent:"transparent",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"11px",color:"#fff"}}>{c&&"✓"}</div>{o}
                </button>
              );
            })}
          </div>}

          {q.type==="text"&&<textarea value={ans[q.id]||""} onChange={e=>set(e.target.value)} placeholder={q.placeholder} rows={4} style={{width:"100%",background:T.surface,border:"1px solid "+T.border,borderRadius:"11px",color:T.t1,fontSize:"14px",padding:"13px 15px",fontFamily:"'DM Sans',sans-serif",resize:"vertical",outline:"none",lineHeight:1.65,transition:"border-color 0.15s"}} onFocus={e=>e.target.style.borderColor=accent} onBlur={e=>e.target.style.borderColor=T.border}/>}

          <div style={{display:"flex",gap:"10px",marginTop:"24px"}}>
            <button onClick={()=>setStep(s=>Math.max(-1,s-1))} style={{padding:"13px 18px",borderRadius:"10px",background:T.raised,border:"1px solid "+T.border,color:T.t2,fontSize:"14px",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",transition:"all 0.12s"}} onMouseEnter={e=>e.currentTarget.style.color=T.t1} onMouseLeave={e=>e.currentTarget.style.color=T.t2}>Back</button>
            <button onClick={next} disabled={!canNext()} style={{flex:1,padding:"14px",borderRadius:"10px",background:canNext()?"linear-gradient(135deg,"+accent+","+T.orangeHi+")":T.raised,border:"1px solid "+(canNext()?accent:T.border),color:canNext()?"#fff":T.t4,fontSize:"14px",fontWeight:700,cursor:canNext()?"pointer":"not-allowed",fontFamily:"'Outfit',sans-serif",letterSpacing:"-0.1px",transition:"all 0.15s",boxShadow:canNext()?"0 4px 14px "+accent+"28":"none"}}>
              {step>=total-1?"Submit":"Continue"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════
//  ROOT
// ══════════════════════════════════════════════
export default function App(){
  const hash=window.location.hash.replace("#","");
  const [tab,setTab]=useState(hash==="survey"?"survey":hash==="dashboard"?"dashboard":"home");
  const [dark,setDark]=useState(false); // Light mode default
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
  const accent = dark ? "#FF6B2B" : "#E8501A";

  return(
    <div style={{minHeight:"100vh",background:T.base,color:T.t1,transition:"background 0.3s,color 0.3s"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&display=swap');
        @keyframes pulse   {0%,100%{opacity:1}50%{opacity:0.4}}
        @keyframes slideUp {from{transform:translateY(100%)}to{transform:translateY(0)}}
        *{box-sizing:border-box;margin:0;padding:0;}
        body{font-family:'DM Sans',system-ui,sans-serif;-webkit-font-smoothing:antialiased;}
        input[type=range]{-webkit-appearance:none;width:100%;height:4px;background:${T.border};border-radius:4px;outline:none;}
        input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:22px;height:22px;border-radius:50%;background:${accent};cursor:pointer;border:3px solid ${T.surface};box-shadow:0 1px 4px rgba(0,0,0,0.15);}
        ::-webkit-scrollbar{width:3px;}
        ::-webkit-scrollbar-thumb{background:${T.border};border-radius:4px;}
        button:focus,select:focus{outline:none;}
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
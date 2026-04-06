import { useState, useEffect, useCallback } from "react";

const API_BASE = "https://powerwatch-backend-afqp.onrender.com";

// ═══════════════════════════════════════════════════════════════════════
//  DESIGN SYSTEM
//  60% bg (neutral) · 30% surface (cards) · 10% accent (blue)
//  Font: Outfit (headings, 700/800) + DM Sans (body, 400/500)
//  Contrast: WCAG AA minimum 4.5:1 for all text
//  No pure black (#000) or pure white (#fff) — use tinted near-blacks/whites
// ═══════════════════════════════════════════════════════════════════════

const DARK = {
  // 60% — base backgrounds (blue-tinted dark, not pure black)
  base:    "#07090F",   // page bg
  surface: "#0D1117",   // card bg
  raised:  "#131A24",   // elevated card
  overlay: "#1A2333",   // hover states

  // Borders
  border:  "#1E2D3D",
  borderHi:"#2A3F55",

  // Accent — 10% usage only
  blue:    "#4E8EF7",
  blueSoft:"#7AADFF",
  blueBg:  "rgba(78,142,247,0.10)",
  blueBorder:"rgba(78,142,247,0.25)",

  // Semantic
  green:   "#2EC4A0",
  greenBg: "rgba(46,196,160,0.10)",
  greenBorder:"rgba(46,196,160,0.25)",
  red:     "#F06565",
  redBg:   "rgba(240,101,101,0.10)",
  redBorder:"rgba(240,101,101,0.25)",
  amber:   "#F5C242",
  amberBg: "rgba(245,194,66,0.10)",

  // Typography — 4 levels, tinted not pure white
  t1: "#E8EDF5",   // headings — near white with blue tint
  t2: "#8B9BB4",   // body — medium contrast
  t3: "#4D6180",   // muted — labels, captions
  t4: "#253347",   // faint — dividers, placeholders
};

const LIGHT = {
  base:    "#F2F5FA",
  surface: "#FFFFFF",
  raised:  "#EBF0F8",
  overlay: "#DDE5F0",

  border:  "#D4DCE9",
  borderHi:"#B8C4D6",

  blue:    "#2563EB",
  blueSoft:"#1D4ED8",
  blueBg:  "rgba(37,99,235,0.08)",
  blueBorder:"rgba(37,99,235,0.25)",

  green:   "#0D9E7E",
  greenBg: "rgba(13,158,126,0.08)",
  greenBorder:"rgba(13,158,126,0.25)",
  red:     "#D03030",
  redBg:   "rgba(208,48,48,0.08)",
  redBorder:"rgba(208,48,48,0.25)",
  amber:   "#B45309",
  amberBg: "rgba(180,83,9,0.08)",

  t1: "#0C1626",   // near black with blue tint — NOT pure #000
  t2: "#344965",
  t3: "#627A99",
  t4: "#A0B2C8",
};

const getT = (dark) => dark ? DARK : LIGHT;

// Location config
const LOCS = [
  { id:"agbowo", name:"Agbowo", color:"#4E8EF7", bg:"rgba(78,142,247,0.08)",  border:"rgba(78,142,247,0.20)"  },
  { id:"orogun", name:"Orogun", color:"#9B72F5", bg:"rgba(155,114,245,0.08)", border:"rgba(155,114,245,0.20)" },
  { id:"barika", name:"Barika", color:"#2EC4A0", bg:"rgba(46,196,160,0.08)",  border:"rgba(46,196,160,0.20)"  },
];

const SURVEY_QS = [
  {id:"location", type:"choice", q:"Which area do you live in?", required:true,  opts:["Agbowo","Orogun","Barika"]},
  {id:"hours",    type:"scale",  q:"Average hours of electricity per day?", required:true, min:0, max:24, unit:"hrs"},
  {id:"surprised",type:"choice", q:"How often does a power outage catch you off guard?", required:true, opts:["Never","Rarely (1–2×/month)","Sometimes (weekly)","Often (several times/week)","Almost always"]},
  {id:"lost",     type:"scale",  q:"Productive hours lost per week due to outages?", required:true, min:0, max:20, unit:"hrs"},
  {id:"confidence",type:"rating",q:"How confident are you at planning around power availability?", required:true, low:"Not at all", high:"Very confident"},
  {id:"aware",    type:"choice", q:"Are you aware of any tool that tracks power in your area?", required:true, opts:["Yes, I use one","Heard of one but don't use it","No, nothing like that exists","Not sure"]},
  {id:"coping",   type:"multi",  q:"How do you cope with outages? (select all that apply)", required:false, opts:["Charge devices in advance","Use a generator","Go to campus for power","Candles / fuel lamp","Mobile data only","No strategy at all"]},
  {id:"impact",   type:"text",   q:"In your own words — how do outages affect your studies?", required:false, placeholder:"e.g. I can't charge my laptop, my deadlines get delayed..."},
];

// ── API ───────────────────────────────────────────────────────────────────────
async function fetchStatus(){const r=await fetch(API_BASE+"/api/status/all");if(!r.ok)throw new Error();return r.json();}
async function fetchWeekly(){const r=await fetch(API_BASE+"/api/reports/daily/all?days=7");if(!r.ok)throw new Error();const d=await r.json();const days=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];return d.map(x=>({...x,day:days[new Date(x.date).getDay()]}));}
async function fetchMonthly(){const r=await fetch(API_BASE+"/api/reports/monthly/all?year="+new Date().getFullYear());if(!r.ok)throw new Error();return r.json();}
async function fetchCommunity(){const r=await fetch(API_BASE+"/api/community/summary/all");if(!r.ok)throw new Error();return r.json();}
async function postReport(location,accurate){const r=await fetch(API_BASE+"/api/community/report",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({location,accurate})});if(!r.ok)throw new Error();return r.json();}

function timeAgo(iso){if(!iso)return"—";const m=Math.floor((Date.now()-new Date(iso))/60000);if(m<1)return"just now";if(m<60)return m+"m ago";return Math.floor(m/60)+"h ago";}
function outageDuration(d){if(!d||d.status!=="OFF"||!d.last_updated)return null;const m=Math.floor((Date.now()-new Date(d.last_updated))/60000);if(m<60)return m+"m";const h=Math.floor(m/60),r=m%60;return r?h+"h "+r+"m":h+"h";}
function getPrediction(weekly,id){if(!weekly||weekly.length<3)return null;const avg=weekly.reduce((s,d)=>s+(d[id]||0),0)/weekly.length;const trend=(weekly[weekly.length-1][id]||0)-(weekly[0][id]||0);const best=weekly.reduce((b,d)=>(d[id]||0)>(b[id]||0)?d:b,weekly[0]);const worst=weekly.reduce((b,d)=>(d[id]||0)<(b[id]||0)?d:b,weekly[0]);return{avg:avg.toFixed(1),trend,best:best.day,worst:worst.day,label:trend>1?"↑ Improving":trend<-1?"↓ Declining":"→ Stable"};}

// ── Shared components ─────────────────────────────────────────────────────────
function Logo({size=30}){
  return(
    <svg width={size} height={size} viewBox="0 0 30 30" fill="none">
      <rect width="30" height="30" rx="8" fill="rgba(78,142,247,0.12)" stroke="rgba(78,142,247,0.3)" strokeWidth="1"/>
      <circle cx="15" cy="15" r="4" fill="#4E8EF7"/>
      {[0,60,120,180,240,300].map((a,i)=>{const r=a*Math.PI/180;return<line key={i} x1={15+Math.cos(r)*5.5} y1={15+Math.sin(r)*5.5} x2={15+Math.cos(r)*10.5} y2={15+Math.sin(r)*10.5} stroke="#4E8EF7" strokeWidth="1.5" strokeLinecap="round" opacity={i%2===0?1:0.35}/>;})}</svg>
  );
}

function Chip({label,color,bg,border}){
  return<span style={{display:"inline-flex",alignItems:"center",gap:"5px",background:bg,border:"1px solid "+border,borderRadius:"20px",padding:"4px 10px",fontSize:"11px",fontWeight:600,color,letterSpacing:"0.2px"}}>{label}</span>;
}

function NavBar({page,setPage,dark,setDark}){
  const T=getT(dark);
  return(
    <nav style={{position:"fixed",top:0,left:0,right:0,zIndex:200,background:dark?"rgba(7,9,15,0.94)":"rgba(242,245,250,0.94)",backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)",borderBottom:"1px solid "+T.border,height:"58px",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 18px"}}>
      {/* Brand */}
      <div style={{display:"flex",alignItems:"center",gap:"10px",cursor:"pointer"}} onClick={()=>setPage("home")}>
        <Logo/>
        <div>
          <div style={{fontSize:"15px",fontWeight:800,color:T.t1,letterSpacing:"-0.4px",fontFamily:"'Outfit',sans-serif",lineHeight:1.1}}>PowerWatch</div>
          <div style={{fontSize:"9px",color:T.t3,letterSpacing:"1px",lineHeight:1}}>UNIVERSITY OF IBADAN</div>
        </div>
      </div>
      {/* Nav links + toggle */}
      <div style={{display:"flex",alignItems:"center",gap:"2px"}}>
        {[["home","Home"],["dashboard","App"],["survey","Survey"]].map(([id,label])=>(
          <button key={id} onClick={()=>setPage(id)} style={{padding:"7px 12px",borderRadius:"8px",border:"none",background:page===id?T.blueBg:"transparent",color:page===id?T.blue:T.t3,fontSize:"13px",fontWeight:page===id?600:400,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",transition:"all 0.15s"}}>{label}</button>
        ))}
        <button onClick={()=>setDark(d=>!d)} style={{marginLeft:"8px",width:"36px",height:"36px",borderRadius:"9px",border:"1px solid "+T.border,background:T.surface,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"15px",flexShrink:0,transition:"all 0.2s"}}>
          {dark?"☀️":"🌙"}
        </button>
      </div>
    </nav>
  );
}

// ── Bar chart ─────────────────────────────────────────────────────────────────
function BarChart({data,color,locId,T}){
  const [hov,setHov]=useState(null);
  if(!data?.length)return<div style={{height:"80px",background:T.overlay,borderRadius:"8px"}}/>;
  const max=Math.max(...data.map(d=>d[locId]||0),1);
  return(
    <div style={{display:"flex",gap:"5px",alignItems:"flex-end",height:"80px"}}>
      {data.map((d,i)=>(
        <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:"3px",height:"100%",justifyContent:"flex-end",position:"relative",cursor:"pointer"}} onMouseEnter={()=>setHov(i)} onMouseLeave={()=>setHov(null)}>
          {hov===i&&<div style={{position:"absolute",top:"-24px",background:color,borderRadius:"5px",padding:"2px 7px",fontSize:"10px",color:"#fff",fontWeight:700,whiteSpace:"nowrap",fontFamily:"'DM Sans',sans-serif"}}>{(d[locId]||0).toFixed(1)}h</div>}
          <div style={{width:"100%",borderRadius:"4px 4px 0 0",height:Math.max(((d[locId]||0)/max*64),2)+"px",background:hov===i?color:color+"55",transition:"all 0.15s"}}/>
          <span style={{fontSize:"9px",color:T.t4,fontFamily:"'DM Sans',sans-serif"}}>{(d.day||"")[0]}</span>
        </div>
      ))}
    </div>
  );
}

// ── Line chart ────────────────────────────────────────────────────────────────
function LineChart({data,color,locId,T}){
  const [hov,setHov]=useState(null);
  if(!data?.length)return<div style={{height:"60px",background:T.overlay,borderRadius:"8px"}}/>;
  const max=Math.max(...data.map(d=>d[locId]||0),1);
  const W=300,H=60;
  const pts=data.map((d,i)=>[(i/(data.length-1))*(W-16)+8,H-((d[locId]||0)/max)*(H-10)-5]);
  const path=pts.map(([x,y],i)=>(i===0?"M":"L")+x+","+y).join(" ");
  const area=path+" L"+pts[pts.length-1][0]+","+H+" L"+pts[0][0]+","+H+" Z";
  return(
    <svg viewBox={"0 0 "+W+" "+(H+16)} style={{width:"100%"}}>
      <defs><linearGradient id={"g"+locId} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.2"/><stop offset="100%" stopColor={color} stopOpacity="0"/></linearGradient></defs>
      <path d={area} fill={"url(#g"+locId+")"}/>
      <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      {pts.map(([x,y],i)=>(
        <g key={i}>
          <circle cx={x} cy={y} r="8" fill="transparent" onMouseEnter={()=>setHov(i)} onMouseLeave={()=>setHov(null)} style={{cursor:"pointer"}}/>
          <circle cx={x} cy={y} r={hov===i?4:2.5} fill={color}/>
          {hov===i&&<g><rect x={x-18} y={y-22} width="36" height="15" rx="4" fill={T.overlay}/><text x={x} y={y-11} textAnchor="middle" fontSize="9" fill={color} fontFamily="'DM Sans',sans-serif" fontWeight="700">{(data[i][locId]||0).toFixed(0)}h</text></g>}
        </g>
      ))}
      {data.map((d,i)=><text key={i} x={pts[i][0]} y={H+13} textAnchor="middle" fontSize="8" fill={T.t4} fontFamily="'DM Sans',sans-serif">{d.month_name?d.month_name[0]:""}</text>)}
    </svg>
  );
}

// ── Daily Digest ──────────────────────────────────────────────────────────────
function DailyDigest({weekly,T}){
  if(!weekly?.length)return null;
  const y=weekly.length>=2?weekly[weekly.length-2]:weekly[weekly.length-1];
  if(!y)return null;
  const date=y.date?new Date(y.date).toLocaleDateString("en-NG",{weekday:"short",month:"short",day:"numeric"}):"Yesterday";
  return(
    <div style={{background:T.surface,borderRadius:"16px",padding:"18px 20px",border:"1px solid "+T.border,marginBottom:"12px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"14px"}}>
        <div>
          <div style={{fontSize:"11px",fontWeight:600,color:T.t3,textTransform:"uppercase",letterSpacing:"1px",fontFamily:"'DM Sans',sans-serif",marginBottom:"2px"}}>Daily Digest</div>
          <div style={{fontSize:"15px",fontWeight:700,color:T.t1,fontFamily:"'Outfit',sans-serif"}}>{date}</div>
        </div>
        <span style={{fontSize:"22px"}}>📋</span>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"8px"}}>
        {LOCS.map(loc=>{
          const h=parseFloat((y[loc.id]||0).toFixed(1));
          const quality=h>=16?"Great":h>=10?"Okay":"Poor";
          const qc=h>=16?T.green:h>=10?T.amber:T.red;
          return(
            <div key={loc.id} style={{background:T.raised,borderRadius:"12px",padding:"12px 10px",textAlign:"center",border:"1px solid "+T.border}}>
              <div style={{fontSize:"10px",color:T.t3,fontFamily:"'DM Sans',sans-serif",marginBottom:"5px"}}>{loc.name}</div>
              <div style={{fontSize:"22px",fontWeight:800,color:loc.color,lineHeight:1,fontFamily:"'Outfit',sans-serif",marginBottom:"3px"}}>{h}h</div>
              <div style={{fontSize:"9px",fontWeight:700,color:qc,textTransform:"uppercase",letterSpacing:"0.5px",fontFamily:"'DM Sans',sans-serif"}}>{quality}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Predictor ─────────────────────────────────────────────────────────────────
function Predictor({weekly,T}){
  if(!weekly||weekly.length<3)return null;
  return(
    <div style={{background:T.surface,borderRadius:"16px",padding:"18px 20px",border:"1px solid "+T.border,marginBottom:"12px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"16px"}}>
        <div>
          <div style={{fontSize:"11px",fontWeight:600,color:T.t3,textTransform:"uppercase",letterSpacing:"1px",fontFamily:"'DM Sans',sans-serif",marginBottom:"2px"}}>Power Predictor</div>
          <div style={{fontSize:"15px",fontWeight:700,color:T.t1,fontFamily:"'Outfit',sans-serif"}}>Based on last 7 days</div>
        </div>
        <span style={{fontSize:"22px"}}>🔮</span>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:"10px"}}>
        {LOCS.map(loc=>{
          const p=getPrediction(weekly,loc.id);if(!p)return null;
          const tc=p.trend>1?T.green:p.trend<-1?T.red:T.t3;
          return(
            <div key={loc.id} style={{background:T.raised,borderRadius:"12px",padding:"14px 16px",border:"1px solid "+T.border}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"10px"}}>
                <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
                  <div style={{width:"8px",height:"8px",borderRadius:"50%",background:loc.color}}/>
                  <span style={{fontSize:"14px",fontWeight:700,color:T.t1,fontFamily:"'Outfit',sans-serif"}}>{loc.name}</span>
                </div>
                <span style={{fontSize:"11px",fontWeight:700,color:tc,fontFamily:"'DM Sans',sans-serif"}}>{p.label}</span>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"8px",marginBottom:"10px"}}>
                {[["Daily avg",p.avg+"h",loc.color],["Best day",p.best,T.green],["Worst day",p.worst,T.red]].map(([l,v,c])=>(
                  <div key={l} style={{textAlign:"center"}}>
                    <div style={{fontSize:"16px",fontWeight:800,color:c,fontFamily:"'Outfit',sans-serif",lineHeight:1}}>{v}</div>
                    <div style={{fontSize:"9px",color:T.t3,marginTop:"3px",textTransform:"uppercase",letterSpacing:"0.5px",fontFamily:"'DM Sans',sans-serif"}}>{l}</div>
                  </div>
                ))}
              </div>
              <div style={{background:T.overlay,borderRadius:"8px",padding:"9px 12px",fontSize:"12px",color:T.t2,lineHeight:1.55,fontFamily:"'DM Sans',sans-serif"}}>
                💡 Expect about <strong style={{color:loc.color}}>{p.avg} hrs</strong> today.{" "}
                {p.trend>1?"Supply has been improving — good time to charge all devices.":p.trend<-1?"Supply declining — charge devices early in the day.":"Supply has been stable this week."}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Community report ──────────────────────────────────────────────────────────
function CommunityReport({locId,community,onDone,T}){
  const [voted,setVoted]=useState(null);
  const [loading,setLoading]=useState(false);
  const stats=community?.[locId];
  const vote=async(accurate)=>{
    if(voted||loading)return;
    setLoading(true);
    try{await postReport(locId,accurate);setVoted(accurate);if(onDone)onDone();}
    catch{}
    finally{setLoading(false);}
  };
  return(
    <div style={{marginTop:"14px",padding:"14px 16px",background:T.raised,borderRadius:"12px",border:"1px solid "+T.border}}>
      <div style={{fontSize:"11px",fontWeight:600,color:T.t3,textTransform:"uppercase",letterSpacing:"1px",marginBottom:"10px",fontFamily:"'DM Sans',sans-serif"}}>Is this reading accurate?</div>
      {voted!==null
        ?<div style={{fontSize:"13px",color:T.green,fontWeight:600,fontFamily:"'DM Sans',sans-serif"}}>✓ Thanks for your report!</div>
        :<div style={{display:"flex",gap:"8px"}}>
          <button onClick={()=>vote(true)} disabled={loading} style={{flex:1,padding:"9px",borderRadius:"9px",border:"1px solid "+T.greenBorder,background:T.greenBg,color:T.green,fontSize:"13px",fontWeight:600,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",transition:"all 0.15s"}}>👍 Yes</button>
          <button onClick={()=>vote(false)} disabled={loading} style={{flex:1,padding:"9px",borderRadius:"9px",border:"1px solid "+T.redBorder,background:T.redBg,color:T.red,fontSize:"13px",fontWeight:600,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",transition:"all 0.15s"}}>👎 No</button>
        </div>
      }
      {stats?.total>0&&<div style={{marginTop:"8px",fontSize:"11px",color:T.t3,fontFamily:"'DM Sans',sans-serif"}}>{stats.total} report{stats.total>1?"s":""} · <span style={{color:stats.trust_score>=60?T.green:T.red,fontWeight:600}}>{stats.trust_score}% say accurate</span></div>}
    </div>
  );
}

// ── Drawer ────────────────────────────────────────────────────────────────────
function Drawer({loc,live,weekly,monthly,community,onClose,onReport,dark=true}){
  const T=getT(dark);
  const d=live?.[loc.id];
  const on=d?.status==="ON";
  const dur=outageDuration(d);
  const avg=weekly?.length?(weekly.reduce((s,w)=>s+(w[loc.id]||0),0)/weekly.length).toFixed(1):null;
  return(
    <div style={{position:"fixed",inset:0,zIndex:300,display:"flex",alignItems:"flex-end"}} onClick={onClose}>
      <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.7)",backdropFilter:"blur(8px)"}}/>
      <div style={{position:"relative",width:"100%",maxWidth:"480px",margin:"0 auto",background:T.surface,borderRadius:"24px 24px 0 0",border:"1px solid "+T.border,borderBottom:"none",padding:"0 20px 48px",animation:"drawerUp 0.3s cubic-bezier(0.16,1,0.3,1)",maxHeight:"92vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
        {/* Handle */}
        <div style={{display:"flex",justifyContent:"center",padding:"14px 0 22px"}}>
          <div style={{width:"36px",height:"4px",background:T.border,borderRadius:"4px"}}/>
        </div>
        {/* Header */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"22px"}}>
          <div>
            <div style={{fontSize:"11px",fontWeight:600,color:T.t3,letterSpacing:"1.5px",textTransform:"uppercase",fontFamily:"'DM Sans',sans-serif",marginBottom:"5px"}}>Location Details</div>
            <div style={{fontSize:"30px",fontWeight:800,color:loc.color,letterSpacing:"-0.5px",lineHeight:1,fontFamily:"'Outfit',sans-serif"}}>{loc.name}</div>
            <div style={{fontSize:"13px",color:T.t3,marginTop:"5px",fontFamily:"'DM Sans',sans-serif"}}>University of Ibadan · Off-campus</div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{padding:"8px 16px",borderRadius:"10px",background:on?T.greenBg:T.redBg,border:"1px solid "+(on?T.greenBorder:T.redBorder),color:on?T.green:T.red,fontSize:"13px",fontWeight:700,fontFamily:"'DM Sans',sans-serif",marginBottom:"4px"}}>
              {on?"⚡ Online":"🔌 Offline"}
            </div>
            {!on&&dur&&<div style={{fontSize:"11px",color:T.red,fontWeight:600,fontFamily:"'DM Sans',sans-serif"}}>Off for {dur}</div>}
          </div>
        </div>

        {/* Stats grid */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px",marginBottom:"14px"}}>
          {[["Status",on?"ONLINE":"OFFLINE",on?T.green:T.red],["7-Day Avg",avg?avg+"h/day":"—",T.t1],["Last Ping",d?.last_updated?timeAgo(d.last_updated):"—",T.t2],["Outage",!on&&dur?dur:"—",T.red]].map(([k,v,c])=>(
            <div key={k} style={{background:T.raised,borderRadius:"13px",padding:"14px 16px",border:"1px solid "+T.border}}>
              <div style={{fontSize:"10px",fontWeight:600,color:T.t3,textTransform:"uppercase",letterSpacing:"1px",fontFamily:"'DM Sans',sans-serif",marginBottom:"8px"}}>{k}</div>
              <div style={{fontSize:"20px",fontWeight:800,color:c,lineHeight:1,fontFamily:"'Outfit',sans-serif"}}>{v}</div>
            </div>
          ))}
        </div>

        {/* Community report */}
        <CommunityReport locId={loc.id} community={community} onDone={onReport} T={T}/>

        {/* Charts */}
        <div style={{background:T.raised,borderRadius:"14px",padding:"18px",marginBottom:"10px",border:"1px solid "+T.border,marginTop:"14px"}}>
          <div style={{fontSize:"11px",fontWeight:600,color:T.t3,textTransform:"uppercase",letterSpacing:"1px",fontFamily:"'DM Sans',sans-serif",marginBottom:"14px"}}>This Week</div>
          <BarChart data={weekly} color={loc.color} locId={loc.id} T={T}/>
        </div>
        <div style={{background:T.raised,borderRadius:"14px",padding:"18px",border:"1px solid "+T.border}}>
          <div style={{fontSize:"11px",fontWeight:600,color:T.t3,textTransform:"uppercase",letterSpacing:"1px",fontFamily:"'DM Sans',sans-serif",marginBottom:"10px"}}>Monthly Trend</div>
          <LineChart data={monthly} color={loc.color} locId={loc.id} T={T}/>
        </div>
        <p style={{textAlign:"center",marginTop:"16px",fontSize:"11px",color:T.t4,fontFamily:"'DM Sans',sans-serif"}}>Refreshes every 30 seconds</p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  LANDING PAGE
// ═══════════════════════════════════════════════════════════════════════
function LandingPage({setPage,live,dark=true}){
  const T=getT(dark);
  const onCount=live?LOCS.filter(l=>live[l.id]?.status==="ON").length:null;

  return(
    <div style={{fontFamily:"'DM Sans',sans-serif"}}>

      {/* Hero */}
      <section style={{padding:"96px 24px 56px",maxWidth:"480px",margin:"0 auto"}}>

        {/* Status badge */}
        <div style={{display:"inline-flex",alignItems:"center",gap:"7px",background:T.blueBg,border:"1px solid "+T.blueBorder,borderRadius:"20px",padding:"6px 14px",marginBottom:"28px"}}>
          <div style={{width:"7px",height:"7px",borderRadius:"50%",background:T.green,flexShrink:0,animation:"pulse 2s infinite"}}/>
          <span style={{fontSize:"12px",fontWeight:600,color:T.blue}}>{onCount!==null?onCount+"/3 locations live":"Monitoring active"}</span>
        </div>

        {/* Headline — Outfit for impact */}
        <h1 style={{fontFamily:"'Outfit',sans-serif",fontSize:"42px",fontWeight:800,color:T.t1,lineHeight:1.08,letterSpacing:"-1.5px",marginBottom:"18px"}}>
          Know before<br/>
          <span style={{color:T.blue}}>the lights go out.</span>
        </h1>

        {/* Subtext — DM Sans for readability */}
        <p style={{fontSize:"16px",color:T.t2,lineHeight:1.75,marginBottom:"36px",maxWidth:"380px"}}>
          Real-time power availability tracking for off-campus students at the University of Ibadan — Agbowo, Orogun & Barika.
        </p>

        {/* CTAs */}
        <div style={{display:"flex",flexDirection:"column",gap:"10px",marginBottom:"52px"}}>
          <button onClick={()=>setPage("dashboard")} style={{padding:"16px 24px",borderRadius:"12px",background:T.blue,border:"none",color:"#fff",fontSize:"15px",fontWeight:700,cursor:"pointer",fontFamily:"'Outfit',sans-serif",letterSpacing:"-0.2px",transition:"opacity 0.15s"}} onMouseEnter={e=>e.currentTarget.style.opacity="0.88"} onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
            Check Power Status →
          </button>
          <button onClick={()=>setPage("survey")} style={{padding:"15px 24px",borderRadius:"12px",background:"transparent",border:"1px solid "+T.border,color:T.t2,fontSize:"15px",fontWeight:500,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",transition:"all 0.15s"}} onMouseEnter={e=>{e.currentTarget.style.borderColor=T.borderHi;e.currentTarget.style.color=T.t1;}} onMouseLeave={e=>{e.currentTarget.style.borderColor=T.border;e.currentTarget.style.color=T.t2;}}>
            Take the Research Survey
          </button>
        </div>

        {/* Live preview */}
        <div style={{background:T.surface,borderRadius:"18px",border:"1px solid "+T.border,overflow:"hidden",marginBottom:"52px"}}>
          <div style={{padding:"14px 18px 12px",borderBottom:"1px solid "+T.border}}>
            <span style={{fontSize:"11px",fontWeight:600,color:T.t3,textTransform:"uppercase",letterSpacing:"1.5px"}}>Live Status</span>
          </div>
          {LOCS.map((loc,i)=>{
            const d=live?.[loc.id];const on=d?.status==="ON";const dur=outageDuration(d);
            return(
              <div key={loc.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 18px",borderBottom:i<LOCS.length-1?"1px solid "+T.border:"none"}}>
                <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
                  <div style={{width:"10px",height:"10px",borderRadius:"50%",background:on?T.green:T.t4,animation:on?"pulse 2.5s infinite":"none",flexShrink:0}}/>
                  <span style={{fontSize:"15px",fontWeight:600,color:T.t1,fontFamily:"'Outfit',sans-serif"}}>{loc.name}</span>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:"13px",fontWeight:700,color:on?T.green:T.t3}}>{!live?"—":on?"Power ON":"Power OFF"}</div>
                  {!on&&dur&&<div style={{fontSize:"10px",color:T.red,marginTop:"1px"}}>Off for {dur}</div>}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Features */}
      <section style={{padding:"0 24px 56px",maxWidth:"480px",margin:"0 auto"}}>
        <div style={{fontSize:"11px",fontWeight:600,color:T.t3,textTransform:"uppercase",letterSpacing:"2px",marginBottom:"20px"}}>Features</div>
        <div style={{display:"flex",flexDirection:"column",gap:"10px"}}>
          {[
            {icon:"⚡",title:"Real-time monitoring",desc:"IoT sensors report every 5 minutes. See exactly what's happening right now."},
            {icon:"📊",title:"Historical data",desc:"Daily digests, weekly trends, and monthly summaries to help you plan."},
            {icon:"🔮",title:"Power predictions",desc:"We analyse patterns to predict your best and worst power windows."},
            {icon:"🗳️",title:"Community verification",desc:"Students confirm readings — so you know the data is trustworthy."},
          ].map(({icon,title,desc})=>(
            <div key={title} style={{background:T.surface,borderRadius:"14px",padding:"18px 20px",border:"1px solid "+T.border,display:"flex",gap:"16px",alignItems:"flex-start"}}>
              <div style={{width:"40px",height:"40px",borderRadius:"10px",background:T.raised,border:"1px solid "+T.border,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"18px",flexShrink:0}}>{icon}</div>
              <div>
                <div style={{fontSize:"15px",fontWeight:700,color:T.t1,fontFamily:"'Outfit',sans-serif",marginBottom:"5px"}}>{title}</div>
                <div style={{fontSize:"13px",color:T.t2,lineHeight:1.65}}>{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Stats */}
      <section style={{padding:"0 24px 56px",maxWidth:"480px",margin:"0 auto"}}>
        <div style={{background:T.blueBg,border:"1px solid "+T.blueBorder,borderRadius:"20px",padding:"28px 24px"}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"24px"}}>
            {[["3","Locations tracked"],["5 min","Sensor interval"],["60+","Students surveyed"],["Free","Always & forever"]].map(([v,l])=>(
              <div key={l}>
                <div style={{fontSize:"32px",fontWeight:800,color:T.blue,letterSpacing:"-1px",lineHeight:1,fontFamily:"'Outfit',sans-serif"}}>{v}</div>
                <div style={{fontSize:"13px",color:T.t2,marginTop:"5px",fontFamily:"'DM Sans',sans-serif"}}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About */}
      <section style={{padding:"0 24px 84px",maxWidth:"480px",margin:"0 auto"}}>
        <div style={{borderTop:"1px solid "+T.border,paddingTop:"28px"}}>
          <div style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"14px"}}>
            <Logo size={26}/>
            <span style={{fontSize:"15px",fontWeight:700,color:T.t1,fontFamily:"'Outfit',sans-serif"}}>About this project</span>
          </div>
          <p style={{fontSize:"14px",color:T.t2,lineHeight:1.75,marginBottom:"12px"}}>PowerWatch UI is a student-led initiative under The Fort Institute's Foundational Leadership Development Course — Cohort 6. Built to solve a real daily problem for thousands of off-campus students at the University of Ibadan.</p>
          <p style={{fontSize:"12px",color:T.t3}}>Sector: Technology & Innovation · Adeoye Fortune (C62372) · Sub-Fort 30</p>
          <p style={{fontSize:"11px",color:T.t4,marginTop:"6px"}}>A Student-Led Capstone Initiative under The Fort Institute's FLDC</p>
        </div>
      </section>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  DASHBOARD PAGE
// ═══════════════════════════════════════════════════════════════════════
function DashboardPage({live,weekly,monthly,community,loading,error,dark=true,onReport}){
  const T=getT(dark);
  const [selected,setSelected]=useState(null);
  const [alertOff,setAlertOff]=useState(false);
  const off=live?LOCS.filter(l=>live[l.id]?.status==="OFF"):[];
  const now=new Date();
  const time=now.toLocaleTimeString("en-NG",{hour:"2-digit",minute:"2-digit"});
  const date=now.toLocaleDateString("en-NG",{weekday:"short",month:"short",day:"numeric"});

  return(
    <div style={{padding:"74px 20px 44px",maxWidth:"480px",margin:"0 auto",fontFamily:"'DM Sans',sans-serif"}}>

      {/* Page header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"22px"}}>
        <div>
          <div style={{fontSize:"11px",fontWeight:600,color:T.t3,letterSpacing:"1px",textTransform:"uppercase",marginBottom:"4px"}}>{date}</div>
          <h1 style={{fontFamily:"'Outfit',sans-serif",fontSize:"28px",fontWeight:800,color:T.t1,letterSpacing:"-0.5px",lineHeight:1}}>Power Status</h1>
          <p style={{fontSize:"12px",color:T.t3,marginTop:"5px"}}>Agbowo · Orogun · Barika</p>
        </div>
        <div style={{textAlign:"right"}}>
          <div style={{fontFamily:"'Outfit',sans-serif",fontSize:"24px",fontWeight:700,color:T.t1}}>{time}</div>
          <div style={{fontSize:"10px",fontWeight:700,marginTop:"3px",color:loading?T.amber:error?T.red:T.green}}>
            {loading?"● Syncing":error?"● Offline":"● Live"}
          </div>
        </div>
      </div>

      {/* Outage alert */}
      {!alertOff&&off.length>0&&(
        <div style={{background:T.redBg,border:"1px solid "+T.redBorder,borderRadius:"13px",padding:"13px 16px",display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"14px"}}>
          <div>
            <div style={{fontSize:"13px",fontWeight:700,color:T.red,marginBottom:"3px"}}>⚠️ Outage detected</div>
            <div style={{fontSize:"12px",color:T.t2}}>{off.map(l=>l.name).join(" & ")} — no power right now</div>
          </div>
          <button onClick={()=>setAlertOff(true)} style={{background:"none",border:"none",color:T.t3,cursor:"pointer",fontSize:"18px",padding:"0 0 0 12px",lineHeight:1}}>×</button>
        </div>
      )}

      {/* Daily digest */}
      <DailyDigest weekly={weekly} T={T}/>

      {/* Location cards */}
      <div style={{display:"flex",flexDirection:"column",gap:"10px",marginBottom:"14px"}}>
        {LOCS.map((loc,i)=>{
          const d=live?.[loc.id];const on=d?.status==="ON";const dur=outageDuration(d);
          return(
            <div key={loc.id} onClick={()=>!loading&&setSelected(loc)}
              style={{background:T.surface,borderRadius:"16px",padding:"18px",border:"1px solid "+(on?loc.border:T.border),cursor:loading?"default":"pointer",display:"flex",alignItems:"center",justifyContent:"space-between",transition:"all 0.18s",animation:"fadeCard "+(0.05+i*0.07)+"s ease both"}}
              onMouseEnter={e=>{if(!loading)e.currentTarget.style.background=T.raised;}} onMouseLeave={e=>e.currentTarget.style.background=T.surface}>
              <div style={{display:"flex",alignItems:"center",gap:"14px"}}>
                {/* Icon box */}
                <div style={{width:"50px",height:"50px",borderRadius:"13px",background:on?loc.bg:T.raised,border:"1px solid "+(on?loc.border:T.border),display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,position:"relative"}}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    {on?<path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill={loc.color}/>:<><circle cx="12" cy="12" r="9" stroke={T.t4} strokeWidth="1.5"/><line x1="12" y1="7" x2="12" y2="13" stroke={T.t4} strokeWidth="1.5" strokeLinecap="round"/></>}
                  </svg>
                  {on&&<div style={{position:"absolute",top:"6px",right:"6px",width:"6px",height:"6px",borderRadius:"50%",background:T.green,animation:"pulse 2s infinite"}}/>}
                </div>
                {/* Text */}
                <div>
                  <div style={{fontFamily:"'Outfit',sans-serif",fontSize:"17px",fontWeight:700,color:T.t1,marginBottom:"3px"}}>{loc.name}</div>
                  <div style={{fontSize:"11px",color:T.t3}}>
                    {loading?"Fetching data...":!on&&dur?<span style={{color:T.red,fontWeight:600}}>Offline for {dur}</span>:d?.last_updated?"Updated "+timeAgo(d.last_updated):"Waiting for sensor"}
                  </div>
                </div>
              </div>
              {/* Status badge */}
              <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
                <div style={{textAlign:"right"}}>
                  <div style={{fontFamily:"'Outfit',sans-serif",fontSize:"17px",fontWeight:800,color:on?loc.color:T.t3}}>{loading?"—":on?"ON":"OFF"}</div>
                  <div style={{fontSize:"10px",color:T.t3,marginTop:"1px"}}>{d?.source??"—"}</div>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke={T.t4} strokeWidth="2" strokeLinecap="round"/></svg>
              </div>
            </div>
          );
        })}
      </div>

      {/* Predictor */}
      <Predictor weekly={weekly} T={T}/>

      {/* Weekly summary */}
      <div style={{background:T.surface,borderRadius:"16px",padding:"20px",border:"1px solid "+T.border}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"18px"}}>
          <div style={{fontFamily:"'Outfit',sans-serif",fontSize:"15px",fontWeight:700,color:T.t1}}>This week</div>
          <div style={{fontSize:"11px",color:T.t3,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.5px"}}>avg hrs / day</div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:"15px"}}>
          {LOCS.map(loc=>{
            const avg=weekly?.length?weekly.reduce((s,d)=>s+(d[loc.id]||0),0)/weekly.length:0;
            return(
              <div key={loc.id}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:"7px"}}>
                  <span style={{fontSize:"14px",color:T.t2,fontWeight:500}}>{loc.name}</span>
                  <span style={{fontFamily:"'Outfit',sans-serif",fontSize:"14px",fontWeight:700,color:loc.color}}>{avg.toFixed(1)}h</span>
                </div>
                <div style={{height:"5px",background:T.raised,borderRadius:"5px",overflow:"hidden"}}>
                  <div style={{width:Math.min((avg/24)*100,100)+"%",height:"100%",background:loc.color,borderRadius:"5px",transition:"width 1.2s cubic-bezier(.16,1,.3,1)"}}/>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <p style={{textAlign:"center",fontSize:"11px",color:T.t4,marginTop:"14px"}}>Tap any card for detailed stats · Auto-refreshes every 30s</p>

      {selected&&<Drawer loc={selected} live={live} weekly={weekly} monthly={monthly} community={community} onClose={()=>setSelected(null)} onReport={onReport} dark={dark}/>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  SURVEY PAGE
// ═══════════════════════════════════════════════════════════════════════
function SurveyPage({dark=true}){
  const T=getT(dark);
  const [step,setStep]=useState(-1);
  const [answers,setAnswers]=useState({});
  const [done,setDone]=useState(false);
  const total=SURVEY_QS.length;
  const q=SURVEY_QS[step];
  const canNext=()=>{if(step===-1)return true;if(!q?.required)return true;const v=answers[q.id];if(v===undefined||v===null||v==="")return false;if(Array.isArray(v)&&v.length===0)return false;return true;};
  const next=()=>{if(!canNext())return;if(step>=total-1){setDone(true);return;}setStep(s=>s+1);};
  const set=v=>setAnswers(a=>({...a,[q.id]:v}));
  const pct=step<0?0:Math.round(((step+1)/total)*100);

  if(done)return(
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",padding:"80px 24px",fontFamily:"'DM Sans',sans-serif"}}>
      <div style={{textAlign:"center",maxWidth:"380px",animation:"fadeCard 0.5s ease"}}>
        <div style={{width:"68px",height:"68px",borderRadius:"18px",background:T.greenBg,border:"1px solid "+T.greenBorder,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 22px",fontSize:"30px"}}>✓</div>
        <h2 style={{fontFamily:"'Outfit',sans-serif",fontSize:"26px",fontWeight:800,color:T.t1,marginBottom:"12px",letterSpacing:"-0.3px"}}>Response recorded</h2>
        <p style={{fontSize:"15px",color:T.t2,lineHeight:1.7,marginBottom:"28px"}}>Thank you. Your data helps us build a better power tracker for students across Agbowo, Orogun and Barika.</p>
        <button onClick={()=>{setStep(-1);setAnswers({});setDone(false);}} style={{background:T.raised,border:"1px solid "+T.border,borderRadius:"10px",padding:"12px 24px",color:T.t2,fontSize:"13px",cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>Submit another response</button>
      </div>
    </div>
  );

  return(
    <div style={{minHeight:"100vh",padding:"74px 20px 44px",maxWidth:"480px",margin:"0 auto",fontFamily:"'DM Sans',sans-serif"}}>

      {/* Progress bar */}
      {step>=0&&(
        <div style={{marginBottom:"30px"}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:"8px"}}>
            <span style={{fontSize:"12px",color:T.t3}}>Question {step+1} of {total}</span>
            <span style={{fontSize:"12px",fontWeight:700,color:T.blue}}>{pct}%</span>
          </div>
          <div style={{height:"4px",background:T.border,borderRadius:"4px",overflow:"hidden"}}>
            <div style={{width:pct+"%",height:"100%",background:T.blue,borderRadius:"4px",transition:"width 0.4s ease"}}/>
          </div>
        </div>
      )}

      {step===-1?(
        <div style={{animation:"fadeCard 0.4s ease"}}>
          <Chip label="Baseline Survey" color={T.blue} bg={T.blueBg} border={T.blueBorder}/>
          <h1 style={{fontFamily:"'Outfit',sans-serif",fontSize:"30px",fontWeight:800,color:T.t1,letterSpacing:"-0.5px",lineHeight:1.2,marginTop:"18px",marginBottom:"14px"}}>Help us understand the problem</h1>
          <p style={{fontSize:"15px",color:T.t2,lineHeight:1.7,marginBottom:"28px"}}>Under 3 minutes. Your responses help measure how power outages affect students — before and after PowerWatch launches.</p>
          <div style={{background:T.surface,borderRadius:"14px",overflow:"hidden",border:"1px solid "+T.border,marginBottom:"28px"}}>
            {[["🔒","Anonymous","No personal data collected"],["⏱","~3 minutes",total+" questions"],["📊","Research only","FLDC Capstone · University of Ibadan"]].map(([icon,t,s],i,arr)=>(
              <div key={t} style={{display:"flex",alignItems:"center",gap:"14px",padding:"14px 18px",borderBottom:i<arr.length-1?"1px solid "+T.border:"none"}}>
                <span style={{fontSize:"18px",width:"24px",textAlign:"center"}}>{icon}</span>
                <div>
                  <div style={{fontSize:"14px",fontWeight:600,color:T.t1}}>{t}</div>
                  <div style={{fontSize:"12px",color:T.t3,marginTop:"1px"}}>{s}</div>
                </div>
              </div>
            ))}
          </div>
          <button onClick={next} style={{width:"100%",padding:"16px",borderRadius:"12px",background:T.blue,border:"none",color:"#fff",fontSize:"16px",fontWeight:700,cursor:"pointer",fontFamily:"'Outfit',sans-serif",letterSpacing:"-0.2px"}}>
            Start Survey →
          </button>
        </div>
      ):(
        <div key={step} style={{animation:"fadeCard 0.3s ease"}}>
          <div style={{marginBottom:"10px"}}>
            <Chip label={q.required?"Required":"Optional"} color={q.required?T.blue:T.t3} bg={q.required?T.blueBg:T.raised} border={q.required?T.blueBorder:T.border}/>
          </div>
          <h2 style={{fontFamily:"'Outfit',sans-serif",fontSize:"21px",fontWeight:700,color:T.t1,lineHeight:1.35,letterSpacing:"-0.2px",marginBottom:"26px"}}>{q.q}</h2>

          {q.type==="choice"&&<div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
            {q.opts.map(o=>{const s=answers[q.id]===o;return(
              <button key={o} onClick={()=>set(o)} style={{padding:"14px 16px",borderRadius:"12px",textAlign:"left",background:s?T.blueBg:T.surface,border:"1px solid "+(s?T.blue:T.border),color:s?T.blue:T.t1,fontSize:"14px",fontWeight:s?600:400,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",transition:"all 0.12s",display:"flex",alignItems:"center",gap:"12px"}}>
                <div style={{width:"18px",height:"18px",borderRadius:"50%",border:"2px solid "+(s?T.blue:T.t4),background:s?T.blue:"transparent",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
                  {s&&<div style={{width:"6px",height:"6px",borderRadius:"50%",background:"#fff"}}/>}
                </div>{o}
              </button>
            );})}
          </div>}

          {q.type==="scale"&&<div>
            <div style={{background:T.surface,borderRadius:"14px",padding:"24px",textAlign:"center",marginBottom:"20px",border:"1px solid "+T.border}}>
              <span style={{fontFamily:"'Outfit',sans-serif",fontSize:"56px",fontWeight:800,color:T.blue,lineHeight:1}}>{answers[q.id]??Math.round(q.max/2)}</span>
              <span style={{fontSize:"18px",color:T.t3,marginLeft:"8px",fontFamily:"'DM Sans',sans-serif"}}>{q.unit}</span>
            </div>
            <input type="range" min={q.min} max={q.max} step="1" value={answers[q.id]??Math.round(q.max/2)} onChange={e=>set(parseInt(e.target.value))} style={{width:"100%",accentColor:T.blue,cursor:"pointer"}}/>
            <div style={{display:"flex",justifyContent:"space-between",marginTop:"6px"}}>
              <span style={{fontSize:"11px",color:T.t4}}>{q.min} {q.unit}</span>
              <span style={{fontSize:"11px",color:T.t4}}>{q.max} {q.unit}+</span>
            </div>
          </div>}

          {q.type==="rating"&&<div>
            <div style={{display:"flex",gap:"8px",justifyContent:"center",marginBottom:"12px"}}>
              {[1,2,3,4,5].map(n=>{const s=answers[q.id]===n;return(
                <button key={n} onClick={()=>set(n)} style={{width:"56px",height:"56px",borderRadius:"13px",border:"1px solid "+(s?T.blue:T.border),background:s?T.blue:T.surface,color:s?"#fff":T.t1,fontFamily:"'Outfit',sans-serif",fontSize:"20px",fontWeight:700,cursor:"pointer",transition:"all 0.12s"}}>{n}</button>
              );})}
            </div>
            <div style={{display:"flex",justifyContent:"space-between"}}>
              <span style={{fontSize:"11px",color:T.t3}}>{q.low}</span>
              <span style={{fontSize:"11px",color:T.t3}}>{q.high}</span>
            </div>
          </div>}

          {q.type==="multi"&&<div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
            {q.opts.map(o=>{
              const c=(answers[q.id]||[]).includes(o);
              const toggle=()=>{const p=answers[q.id]||[];set(c?p.filter(v=>v!==o):[...p,o]);};
              return(
                <button key={o} onClick={toggle} style={{padding:"13px 16px",borderRadius:"12px",textAlign:"left",background:c?T.blueBg:T.surface,border:"1px solid "+(c?T.blue:T.border),color:c?T.blue:T.t1,fontSize:"14px",fontWeight:c?600:400,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",transition:"all 0.12s",display:"flex",alignItems:"center",gap:"12px"}}>
                  <div style={{width:"18px",height:"18px",borderRadius:"5px",border:"2px solid "+(c?T.blue:T.t4),background:c?T.blue:"transparent",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"11px",color:"#fff"}}>{c&&"✓"}</div>{o}
                </button>
              );
            })}
          </div>}

          {q.type==="text"&&<textarea value={answers[q.id]||""} onChange={e=>set(e.target.value)} placeholder={q.placeholder} rows={4} style={{width:"100%",background:T.surface,border:"1px solid "+T.border,borderRadius:"12px",color:T.t1,fontSize:"14px",padding:"14px 16px",fontFamily:"'DM Sans',sans-serif",resize:"vertical",outline:"none",lineHeight:1.65,transition:"border-color 0.15s"}} onFocus={e=>e.target.style.borderColor=T.blue} onBlur={e=>e.target.style.borderColor=T.border}/>}

          <div style={{display:"flex",gap:"10px",marginTop:"26px"}}>
            <button onClick={()=>setStep(s=>Math.max(-1,s-1))} style={{padding:"14px 18px",borderRadius:"11px",background:T.surface,border:"1px solid "+T.border,color:T.t2,fontSize:"14px",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",transition:"all 0.12s"}} onMouseEnter={e=>e.currentTarget.style.color=T.t1} onMouseLeave={e=>e.currentTarget.style.color=T.t2}>← Back</button>
            <button onClick={next} disabled={!canNext()} style={{flex:1,padding:"14px",borderRadius:"11px",background:canNext()?T.blue:T.raised,border:"1px solid "+(canNext()?T.blue:T.border),color:canNext()?"#fff":T.t4,fontSize:"15px",fontWeight:700,cursor:canNext()?"pointer":"not-allowed",fontFamily:"'Outfit',sans-serif",letterSpacing:"-0.2px",transition:"all 0.15s"}}>
              {step>=total-1?"Submit ✓":"Continue →"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  ROOT
// ═══════════════════════════════════════════════════════════════════════
export default function App(){
  const hash=window.location.hash.replace("#","");
  const [page,setPage]=useState(hash==="survey"?"survey":hash==="dashboard"?"dashboard":"home");
  const [dark,setDark]=useState(true);
  const [live,setLive]=useState(null);
  const [weekly,setWeekly]=useState(null);
  const [monthly,setMonthly]=useState(null);
  const [community,setCommunity]=useState(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState(false);

  const navigate=p=>{window.location.hash=p==="home"?"":p;setPage(p);};

  const refresh=useCallback(async()=>{
    try{const d=await fetchStatus();setLive(d);setError(false);}
    catch{setError(true);}
    finally{setLoading(false);}
  },[]);

  const refreshCommunity=useCallback(async()=>{
    try{const d=await fetchCommunity();setCommunity(d);}catch{}
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
    <div style={{minHeight:"100vh",background:T.base,color:T.t1,transition:"background 0.3s,color 0.3s"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&display=swap');
        @keyframes pulse    {0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.5;transform:scale(1.15)}}
        @keyframes drawerUp {from{transform:translateY(100%)}to{transform:translateY(0)}}
        @keyframes fadeCard {from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        *{box-sizing:border-box;margin:0;padding:0;}
        body{font-family:'DM Sans',system-ui,sans-serif;}
        input[type=range]{-webkit-appearance:none;width:100%;height:5px;background:${T.border};border-radius:4px;outline:none;}
        input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:22px;height:22px;border-radius:50%;background:${T.blue};cursor:pointer;border:3px solid ${T.surface};}
        ::-webkit-scrollbar{width:3px;}
        ::-webkit-scrollbar-thumb{background:${T.border};border-radius:4px;}
        button:focus{outline:none;}
      `}</style>
      <NavBar page={page} setPage={navigate} dark={dark} setDark={setDark}/>
      {page==="home"&&<LandingPage setPage={navigate} live={live} dark={dark}/>}
      {page==="dashboard"&&<DashboardPage live={live} weekly={weekly} monthly={monthly} community={community} loading={loading} error={error} dark={dark} onReport={refreshCommunity}/>}
      {page==="survey"&&<SurveyPage dark={dark}/>}
    </div>
  );
}

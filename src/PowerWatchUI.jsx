import { useState, useEffect, useCallback } from "react";

const API_BASE = "https://powerwatch-backend-afqp.onrender.com";

const DARK = {
  base:"#06080F", surface:"#0C0F1A", card:"#111827", raised:"#162033",
  border:"#1C2A3E", borderHi:"#263D5A",
  orange:"#FF6B2B", orangeHi:"#FF8A55", orangeLo:"rgba(255,107,43,0.12)", orangeBd:"rgba(255,107,43,0.3)",
  green:"#00C896", greenBg:"rgba(0,200,150,0.1)", greenBd:"rgba(0,200,150,0.28)",
  red:"#FF4D4D", redBg:"rgba(255,77,77,0.1)", redBd:"rgba(255,77,77,0.28)",
  amber:"#FFB800",
  t1:"#F0F4FF", t2:"#8899BB", t3:"#3D526E", t4:"#1E2F45",
};
const LIGHT = {
  base:"#F0F4FA", surface:"#FFFFFF", card:"#F7FAFF", raised:"#EBF0F8",
  border:"#D8E2F0", borderHi:"#B8C8E0",
  orange:"#E85A1A", orangeHi:"#CC4A10", orangeLo:"rgba(232,90,26,0.08)", orangeBd:"rgba(232,90,26,0.3)",
  green:"#00A87A", greenBg:"rgba(0,168,122,0.08)", greenBd:"rgba(0,168,122,0.28)",
  red:"#E03535", redBg:"rgba(224,53,53,0.08)", redBd:"rgba(224,53,53,0.28)",
  amber:"#B45309",
  t1:"#0A1628", t2:"#2E4060", t3:"#6B84A0", t4:"#A8BDD0",
};
const getT = (dk) => dk ? DARK : LIGHT;

const LOCS = [
  { id:"agbowo", name:"Agbowo", color:"#FF6B2B", glow:"rgba(255,107,43,0.18)" },
  { id:"orogun", name:"Orogun", color:"#7C6CF5", glow:"rgba(124,108,245,0.18)" },
  { id:"barika", name:"Barika", color:"#00C896", glow:"rgba(0,200,150,0.18)" },
];

const SURVEY_QS = [
  {id:"location",type:"choice",q:"Which area do you live in?",required:true,opts:["Agbowo","Orogun","Barika"]},
  {id:"hours",type:"scale",q:"On average, how many hours of electricity do you get per day?",required:true,min:0,max:24,unit:"hrs"},
  {id:"surprised",type:"choice",q:"How often does a power outage catch you off guard?",required:true,opts:["Never","Rarely (1-2x/month)","Sometimes (weekly)","Often (several times/week)","Almost always"]},
  {id:"lost",type:"scale",q:"How many productive hours do you lose per week due to outages?",required:true,min:0,max:20,unit:"hrs"},
  {id:"confidence",type:"rating",q:"How confident are you at planning your day around power availability?",required:true,low:"Not at all",high:"Very confident"},
  {id:"aware",type:"choice",q:"Are you aware of any platform that tracks power availability in your area?",required:true,opts:["Yes, I use one","Heard of one but don't use it","No, nothing like that exists","Not sure"]},
  {id:"coping",type:"multi",q:"How do you currently cope with power outages? (Select all that apply)",required:false,opts:["Charge devices in advance","Use a generator","Go to campus for power","Candles / fuel lamp","Mobile data only","No strategy"]},
  {id:"impact",type:"text",q:"In your own words, how do power outages affect your studies or daily life?",required:false,placeholder:"e.g. I waste transport money going to check if there is light..."},
];

async function fetchStatus(){const r=await fetch(API_BASE+"/api/status/all");if(!r.ok)throw 0;return r.json();}
async function fetchWeekly(){const r=await fetch(API_BASE+"/api/reports/daily/all?days=7");if(!r.ok)throw 0;const d=await r.json();const days=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];return d.map(x=>({...x,day:days[new Date(x.date).getDay()]}));}
async function fetchMonthly(){const r=await fetch(API_BASE+"/api/reports/monthly/all?year="+new Date().getFullYear());if(!r.ok)throw 0;return r.json();}
async function fetchCommunity(){const r=await fetch(API_BASE+"/api/community/summary/all");if(!r.ok)throw 0;return r.json();}
async function postReport(l,a){await fetch(API_BASE+"/api/community/report",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({location:l,accurate:a})});}

function timeAgo(iso){if(!iso)return"—";const m=Math.floor((Date.now()-new Date(iso))/60000);if(m<1)return"just now";if(m<60)return m+"m ago";return Math.floor(m/60)+"h ago";}
function outageDur(d){if(!d||d.status!=="OFF"||!d.last_updated)return null;const m=Math.floor((Date.now()-new Date(d.last_updated))/60000);if(m<60)return m+"m";const h=Math.floor(m/60),r=m%60;return r?h+"h "+r+"m":h+"h";}
function getPred(weekly,id){if(!weekly||weekly.length<3)return null;const avg=weekly.reduce((s,d)=>s+(d[id]||0),0)/weekly.length;const trend=(weekly[weekly.length-1][id]||0)-(weekly[0][id]||0);const best=weekly.reduce((b,d)=>(d[id]||0)>(b[id]||0)?d:b,weekly[0]);const worst=weekly.reduce((b,d)=>(d[id]||0)<(b[id]||0)?d:b,weekly[0]);return{avg:avg.toFixed(1),trend,best:best.day,worst:worst.day,label:trend>1?"Improving":trend<-1?"Declining":"Stable"};}

function Logo({size=32}){
  return(
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="15" fill="rgba(255,107,43,0.12)" stroke="rgba(255,107,43,0.35)" strokeWidth="1"/>
      <path d="M18 4L7 18h9l-2 10 12-14h-9l1-10z" fill="#FF6B2B"/>
    </svg>
  );
}

function BarChart({data,color,locId,T}){
  const [hov,setHov]=useState(null);
  if(!data?.length)return <div style={{height:"80px",background:T.raised,borderRadius:"8px"}}/>;
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

function LineChart({data,color,locId,T}){
  const [hov,setHov]=useState(null);
  if(!data?.length)return <div style={{height:"60px",background:T.raised,borderRadius:"8px"}}/>;
  const max=Math.max(...data.map(d=>d[locId]||0),1);
  const W=300,H=60;
  const pts=data.map((d,i)=>[(i/(data.length-1))*(W-16)+8,H-((d[locId]||0)/max)*(H-10)-5]);
  const path=pts.map(([x,y],i)=>(i===0?"M":"L")+x+","+y).join(" ");
  return(
    <svg viewBox={"0 0 "+W+" "+(H+16)} style={{width:"100%"}}>
      <defs><linearGradient id={"g"+locId} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.2"/><stop offset="100%" stopColor={color} stopOpacity="0"/></linearGradient></defs>
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

function CommunityBtn({locId,community,onDone,T}){
  const [voted,setVoted]=useState(null);
  const [busy,setBusy]=useState(false);
  const stats=community?.[locId];
  const vote=async(a)=>{if(voted||busy)return;setBusy(true);try{await postReport(locId,a);setVoted(a);if(onDone)onDone();}catch{}finally{setBusy(false);}};
  return(
    <div style={{padding:"14px 16px",background:T.raised,borderRadius:"14px",border:"1px solid "+T.border,marginTop:"14px"}}>
      <div style={{fontSize:"11px",fontWeight:600,color:T.t3,textTransform:"uppercase",letterSpacing:"1px",marginBottom:"10px",fontFamily:"'DM Sans',sans-serif"}}>Is this reading accurate?</div>
      {voted!==null
        ?<div style={{fontSize:"13px",color:T.green,fontWeight:600}}>Thanks for your feedback!</div>
        :<div style={{display:"flex",gap:"8px"}}>
          <button onClick={()=>vote(true)} disabled={busy} style={{flex:1,padding:"10px",borderRadius:"10px",border:"1px solid "+T.greenBd,background:T.greenBg,color:T.green,fontSize:"13px",fontWeight:600,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>Yes, accurate</button>
          <button onClick={()=>vote(false)} disabled={busy} style={{flex:1,padding:"10px",borderRadius:"10px",border:"1px solid "+T.redBd,background:T.redBg,color:T.red,fontSize:"13px",fontWeight:600,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>Not accurate</button>
        </div>
      }
      {stats?.total>0&&<div style={{marginTop:"8px",fontSize:"11px",color:T.t3,fontFamily:"'DM Sans',sans-serif"}}>{stats.total} report{stats.total>1?"s":""} · <span style={{color:stats.trust_score>=60?T.green:T.red,fontWeight:600}}>{stats.trust_score}% say accurate</span></div>}
    </div>
  );
}

function PredictorCard({weekly,T}){
  const [locId,setLocId]=useState(LOCS[0].id);
  const loc=LOCS.find(l=>l.id===locId);
  const p=getPred(weekly,locId);
  const tc=p?.trend>1?T.green:p?.trend<-1?T.red:T.t3;
  return(
    <div style={{background:T.card,borderRadius:"18px",padding:"18px",border:"1px solid "+T.border,marginBottom:"14px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"16px"}}>
        <div>
          <div style={{fontSize:"11px",fontWeight:600,color:T.t3,textTransform:"uppercase",letterSpacing:"1px",marginBottom:"2px",fontFamily:"'DM Sans',sans-serif"}}>Power Predictor</div>
          <div style={{fontFamily:"'Outfit',sans-serif",fontSize:"15px",fontWeight:700,color:T.t1}}>Forecast window</div>
        </div>
        <span style={{fontSize:"22px"}}>🔮</span>
      </div>
      <div style={{position:"relative",marginBottom:"16px"}}>
        <select value={locId} onChange={e=>setLocId(e.target.value)} style={{width:"100%",padding:"11px 36px 11px 16px",borderRadius:"12px",background:T.raised,border:"1px solid "+T.border,color:T.t1,fontSize:"14px",fontWeight:600,fontFamily:"'DM Sans',sans-serif",cursor:"pointer",outline:"none",appearance:"none",WebkitAppearance:"none"}}>
          {LOCS.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
        <div style={{position:"absolute",right:"14px",top:"50%",transform:"translateY(-50%)",pointerEvents:"none"}}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke={T.t3} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
      </div>
      {p?(
        <>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"14px"}}>
            <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
              <div style={{width:"10px",height:"10px",borderRadius:"50%",background:loc.color}}/>
              <span style={{fontFamily:"'Outfit',sans-serif",fontSize:"15px",fontWeight:700,color:T.t1}}>{loc.name}</span>
            </div>
            <span style={{fontSize:"12px",fontWeight:700,color:tc,background:tc+"22",padding:"4px 10px",borderRadius:"20px",border:"1px solid "+tc+"44",fontFamily:"'DM Sans',sans-serif"}}>{p.trend>1?"↑ "+p.label:p.trend<-1?"↓ "+p.label:"→ "+p.label}</span>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"8px",marginBottom:"14px"}}>
            {[["Daily avg",p.avg+"h",loc.color],["Best day",p.best,T.green],["Worst day",p.worst,T.red]].map(([l,v,c])=>(
              <div key={l} style={{background:T.raised,borderRadius:"10px",padding:"12px 8px",textAlign:"center",border:"1px solid "+T.border}}>
                <div style={{fontFamily:"'Outfit',sans-serif",fontSize:"18px",fontWeight:800,color:c,lineHeight:1,marginBottom:"4px"}}>{v}</div>
                <div style={{fontSize:"9px",color:T.t3,textTransform:"uppercase",letterSpacing:"0.5px",fontFamily:"'DM Sans',sans-serif"}}>{l}</div>
              </div>
            ))}
          </div>
          <div style={{background:T.raised,borderRadius:"10px",padding:"12px 14px",fontSize:"13px",color:T.t2,lineHeight:1.6,border:"1px solid "+T.border,fontFamily:"'DM Sans',sans-serif"}}>
            Expect about <strong style={{color:loc.color}}>{p.avg} hrs</strong> of grid power today in {loc.name}. {p.trend>1?"Supply trending upward — good time to charge all devices.":p.trend<-1?"Supply declining this week — charge your devices early.":"Grid supply has been stable this week."}
          </div>
          <div style={{marginTop:"8px",fontSize:"10px",color:T.t4,textAlign:"center",fontFamily:"'DM Sans',sans-serif"}}>Based on 7-day statistical analysis · Not a guarantee</div>
        </>
      ):<div style={{fontSize:"13px",color:T.t3,textAlign:"center",padding:"12px",fontFamily:"'DM Sans',sans-serif"}}>Not enough data yet — check back after a few days</div>}
    </div>
  );
}

function Drawer({loc,live,weekly,monthly,community,onClose,onReport,dark}){
  const T=getT(dark);
  const d=live?.[loc.id];
  const on=d?.status==="ON";
  const dur=outageDur(d);
  const avg=weekly?.length?(weekly.reduce((s,w)=>s+(w[loc.id]||0),0)/weekly.length).toFixed(1):null;
  return(
    <div style={{position:"fixed",inset:0,zIndex:300,display:"flex",alignItems:"flex-end"}} onClick={onClose}>
      <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.82)",backdropFilter:"blur(10px)"}}/>
      <div style={{position:"relative",width:"100%",maxWidth:"480px",margin:"0 auto",background:T.surface,borderRadius:"24px 24px 0 0",padding:"0 20px 52px",animation:"slideUp 0.3s cubic-bezier(0.16,1,0.3,1)",maxHeight:"92vh",overflowY:"auto",border:"1px solid "+T.border,borderBottom:"none"}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"center",padding:"14px 0 20px"}}>
          <div style={{width:"40px",height:"4px",background:T.border,borderRadius:"4px"}}/>
        </div>
        <div style={{background:"linear-gradient(135deg,"+loc.color+"18,"+loc.color+"05)",borderRadius:"16px",padding:"20px",border:"1px solid "+loc.color+"33",marginBottom:"20px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
            <div>
              <div style={{fontSize:"11px",color:T.t3,letterSpacing:"2px",textTransform:"uppercase",marginBottom:"6px",fontFamily:"'DM Sans',sans-serif"}}>Location</div>
              <div style={{fontSize:"32px",fontWeight:800,color:loc.color,letterSpacing:"-1px",lineHeight:1,fontFamily:"'Outfit',sans-serif"}}>{loc.name}</div>
              <div style={{fontSize:"12px",color:T.t2,marginTop:"6px",fontFamily:"'DM Sans',sans-serif"}}>University of Ibadan · Off-campus</div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{display:"inline-block",padding:"8px 14px",borderRadius:"10px",background:on?T.greenBg:T.redBg,border:"1px solid "+(on?T.greenBd:T.redBd),color:on?T.green:T.red,fontSize:"13px",fontWeight:700,fontFamily:"'DM Sans',sans-serif",marginBottom:"4px"}}>
                {on?"Power ON":"Power OFF"}
              </div>
              {!on&&dur&&<div style={{fontSize:"11px",color:T.red,fontWeight:600,fontFamily:"'DM Sans',sans-serif"}}>Off for {dur}</div>}
            </div>
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px",marginBottom:"14px"}}>
          {[["Status",on?"ONLINE":"OFFLINE",on?T.green:T.red],["7-Day Avg",avg?avg+"h/day":"—",T.t1],["Last Ping",d?.last_updated?timeAgo(d.last_updated):"—",T.t2],["Outage Time",!on&&dur?dur:"—",T.red]].map(([k,v,c])=>(
            <div key={k} style={{background:T.raised,borderRadius:"14px",padding:"14px 16px",border:"1px solid "+T.border}}>
              <div style={{fontSize:"10px",fontWeight:600,color:T.t3,textTransform:"uppercase",letterSpacing:"1px",marginBottom:"8px",fontFamily:"'DM Sans',sans-serif"}}>{k}</div>
              <div style={{fontSize:"22px",fontWeight:800,color:c,lineHeight:1,fontFamily:"'Outfit',sans-serif"}}>{v}</div>
            </div>
          ))}
        </div>
        <CommunityBtn locId={loc.id} community={community} onDone={onReport} T={T}/>
        <div style={{background:T.raised,borderRadius:"14px",padding:"18px",marginTop:"14px",marginBottom:"10px",border:"1px solid "+T.border}}>
          <div style={{fontSize:"11px",fontWeight:600,color:T.t3,textTransform:"uppercase",letterSpacing:"1px",marginBottom:"14px",fontFamily:"'DM Sans',sans-serif"}}>This Week</div>
          <BarChart data={weekly} color={loc.color} locId={loc.id} T={T}/>
        </div>
        <div style={{background:T.raised,borderRadius:"14px",padding:"18px",border:"1px solid "+T.border}}>
          <div style={{fontSize:"11px",fontWeight:600,color:T.t3,textTransform:"uppercase",letterSpacing:"1px",marginBottom:"10px",fontFamily:"'DM Sans',sans-serif"}}>Monthly Trend</div>
          <LineChart data={monthly} color={loc.color} locId={loc.id} T={T}/>
        </div>
        <p style={{textAlign:"center",marginTop:"14px",fontSize:"11px",color:T.t4,fontFamily:"'DM Sans',sans-serif"}}>Auto-refreshes every 30 seconds</p>
      </div>
    </div>
  );
}

function TopBar({tab,dark,setDark}){
  const T=getT(dark);
  const titles={home:"PowerWatch",dashboard:"Power Status",survey:"Survey"};
  return(
    <div style={{position:"fixed",top:0,left:0,right:0,zIndex:100,background:dark?"rgba(6,8,15,0.96)":"rgba(240,244,250,0.96)",backdropFilter:"blur(20px)",borderBottom:"1px solid "+T.border,height:"58px",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 18px"}}>
      <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
        <Logo size={28}/>
        <span style={{fontFamily:"'Outfit',sans-serif",fontSize:"17px",fontWeight:800,color:T.t1,letterSpacing:"-0.3px"}}>{titles[tab]}</span>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
        {tab==="dashboard"&&<div style={{fontSize:"10px",fontWeight:700,color:"#00C896",display:"flex",alignItems:"center",gap:"5px",fontFamily:"'DM Sans',sans-serif"}}><div style={{width:"6px",height:"6px",borderRadius:"50%",background:"#00C896",animation:"pulse 2s infinite"}}/>LIVE</div>}
        <button onClick={()=>setDark(d=>!d)} style={{width:"36px",height:"36px",borderRadius:"10px",border:"1px solid "+T.border,background:T.raised,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"15px"}}>
          {dark?"☀️":"🌙"}
        </button>
      </div>
    </div>
  );
}

function TabBar({tab,setTab,dark}){
  const T=getT(dark);
  const TABS=[
    {id:"home",label:"Home",icon:(a)=>(
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke={a?"#FF6B2B":T.t3} strokeWidth="2" fill={a?"rgba(255,107,43,0.12)":"none"}/>
        <polyline points="9,22 9,12 15,12 15,22" stroke={a?"#FF6B2B":T.t3} strokeWidth="2"/>
      </svg>
    )},
    {id:"dashboard",label:"Status",icon:(a)=>(
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill={a?"#FF6B2B":"none"} stroke={a?"#FF6B2B":T.t3} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    )},
    {id:"survey",label:"Survey",icon:(a)=>(
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <rect x="5" y="2" width="14" height="20" rx="2" stroke={a?"#FF6B2B":T.t3} strokeWidth="1.5" fill={a?"rgba(255,107,43,0.12)":"none"}/>
        <line x1="9" y1="7" x2="15" y2="7" stroke={a?"#FF6B2B":T.t3} strokeWidth="1.5" strokeLinecap="round"/>
        <line x1="9" y1="11" x2="15" y2="11" stroke={a?"#FF6B2B":T.t3} strokeWidth="1.5" strokeLinecap="round"/>
        <line x1="9" y1="15" x2="12" y2="15" stroke={a?"#FF6B2B":T.t3} strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    )},
  ];
  return(
    <div style={{position:"fixed",bottom:0,left:0,right:0,zIndex:100,background:dark?"rgba(6,8,15,0.97)":"rgba(240,244,250,0.97)",backdropFilter:"blur(20px)",borderTop:"1px solid "+T.border,paddingBottom:"env(safe-area-inset-bottom,8px)"}}>
      <div style={{display:"flex",maxWidth:"480px",margin:"0 auto"}}>
        {TABS.map(({id,label,icon})=>{
          const active=tab===id;
          return(
            <button key={id} onClick={()=>setTab(id)} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:"3px",padding:"10px 0 8px",background:"none",border:"none",cursor:"pointer",transition:"all 0.15s"}}>
              {icon(active)}
              <span style={{fontSize:"10px",fontWeight:active?700:400,color:active?"#FF6B2B":T.t3,fontFamily:"'DM Sans',sans-serif"}}>{label}</span>
              {active&&<div style={{width:"4px",height:"4px",borderRadius:"50%",background:"#FF6B2B"}}/>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function HomePage({setTab,live,dark}){
  const T=getT(dark);
  const onCount=live?LOCS.filter(l=>live[l.id]?.status==="ON").length:null;
  return(
    <div style={{paddingBottom:"100px",fontFamily:"'DM Sans',sans-serif"}}>

      {/* Hero */}
      <div style={{background:dark?"linear-gradient(160deg,#0E1B30 0%,#06080F 55%)":"linear-gradient(160deg,#E2EAF8 0%,#F0F4FA 55%)",padding:"80px 24px 44px",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",top:"-80px",right:"-80px",width:"320px",height:"320px",borderRadius:"50%",background:"radial-gradient(circle,rgba(255,107,43,0.1) 0%,transparent 70%)",pointerEvents:"none"}}/>
        <div style={{position:"absolute",bottom:"-60px",left:"-60px",width:"240px",height:"240px",borderRadius:"50%",background:"radial-gradient(circle,rgba(124,108,245,0.08) 0%,transparent 70%)",pointerEvents:"none"}}/>

        <div style={{display:"inline-flex",alignItems:"center",gap:"8px",background:"rgba(0,200,150,0.1)",border:"1px solid rgba(0,200,150,0.3)",borderRadius:"20px",padding:"6px 14px",marginBottom:"28px"}}>
          <div style={{width:"7px",height:"7px",borderRadius:"50%",background:"#00C896",animation:"pulse 2s infinite",flexShrink:0}}/>
          <span style={{fontSize:"12px",fontWeight:600,color:"#00C896",fontFamily:"'DM Sans',sans-serif"}}>
            {onCount!==null?onCount+" of 3 locations online · Real-time":"Connecting to sensors..."}
          </span>
        </div>

        <h1 style={{fontFamily:"'Outfit',sans-serif",fontSize:"42px",fontWeight:800,color:dark?"#F0F4FF":T.t1,lineHeight:1.05,letterSpacing:"-2px",marginBottom:"16px"}}>
          Stop guessing<br/>
          <span style={{color:"#FF6B2B"}}>Know when the<br/>lights are on</span>
        </h1>

        <p style={{fontSize:"16px",color:T.t2,lineHeight:1.75,marginBottom:"36px",maxWidth:"360px",fontFamily:"'DM Sans',sans-serif"}}>
          Real-time power tracking for selected off-campus locations. Save your transport money and optimize your study time.
        </p>

        <div style={{display:"flex",flexDirection:"column",gap:"12px",marginBottom:"44px"}}>
          <button onClick={()=>setTab("dashboard")} style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"center",gap:"10px",padding:"17px 24px",borderRadius:"14px",background:"linear-gradient(135deg,#FF6B2B,#E85010)",border:"none",color:"#fff",fontSize:"16px",fontWeight:700,cursor:"pointer",fontFamily:"'Outfit',sans-serif",letterSpacing:"-0.2px",boxShadow:"0 8px 28px rgba(255,107,43,0.38)"}}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="currentColor"/></svg>
            Check Power Status
          </button>
          <button onClick={()=>setTab("survey")} style={{width:"100%",padding:"16px 24px",borderRadius:"14px",background:"transparent",border:"1px solid "+(dark?"rgba(255,255,255,0.12)":T.border),color:dark?"rgba(240,244,255,0.65)":T.t2,fontSize:"15px",fontWeight:500,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",transition:"all 0.15s"}}>
            Take the Research Survey
          </button>
        </div>
      </div>

      {/* Live status */}
      <div style={{margin:"24px 16px 0",background:T.card,borderRadius:"20px",border:"1px solid "+T.border,overflow:"hidden"}}>
        <div style={{padding:"14px 18px",borderBottom:"1px solid "+T.border,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <span style={{fontSize:"11px",fontWeight:700,color:T.t3,textTransform:"uppercase",letterSpacing:"1.5px",fontFamily:"'DM Sans',sans-serif"}}>Live Now</span>
          <span style={{fontSize:"10px",color:T.t3,fontFamily:"'DM Sans',sans-serif"}}>Sensors update every minute</span>
        </div>
        {LOCS.map((loc,i)=>{
          const d=live?.[loc.id];const on=d?.status==="ON";const dur=outageDur(d);
          return(
            <div key={loc.id} onClick={()=>setTab("dashboard")} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"16px 18px",borderBottom:i<LOCS.length-1?"1px solid "+T.border:"none",cursor:"pointer",transition:"background 0.15s"}} onMouseEnter={e=>e.currentTarget.style.background=T.raised} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
                <div style={{width:"40px",height:"40px",borderRadius:"11px",background:on?loc.color+"18":T.raised,border:"1px solid "+(on?loc.color+"44":T.border),display:"flex",alignItems:"center",justifyContent:"center",fontSize:"18px",flexShrink:0}}>
                  {on?"⚡":"🔌"}
                </div>
                <div>
                  <div style={{fontFamily:"'Outfit',sans-serif",fontSize:"15px",fontWeight:700,color:T.t1}}>{loc.name}</div>
                  <div style={{fontSize:"11px",color:T.t3,marginTop:"1px",fontFamily:"'DM Sans',sans-serif"}}>{!live?"—":!on&&dur?"Offline for "+dur:d?.last_updated?"Live · "+timeAgo(d.last_updated):"Awaiting sensor"}</div>
                </div>
              </div>
              <div style={{padding:"5px 14px",borderRadius:"20px",background:on?T.greenBg:T.redBg,border:"1px solid "+(on?T.greenBd:T.redBd),fontSize:"12px",fontWeight:700,color:on?T.green:T.red,fontFamily:"'DM Sans',sans-serif"}}>
                {!live?"—":on?"ON":"OFF"}
              </div>
            </div>
          );
        })}
      </div>

      {/* Features */}
      <div style={{padding:"32px 16px 0"}}>
        <div style={{fontSize:"11px",fontWeight:700,color:T.t3,textTransform:"uppercase",letterSpacing:"2px",marginBottom:"16px",fontFamily:"'DM Sans',sans-serif"}}>What We Do</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px",alignItems:"stretch"}}>
          {[
            {e:"⚡",t:"Real-Time Status",d:"Sensors plugged into grid-only sockets pick up electricity signals, sending automated pulses to our servers."},
            {e:"📊",t:"Historical Analytics",d:"Analysis of electricity uptime to generate monthly reliability scores and total uptime hours per location."},
            {e:"🔮",t:"Predictive Windows",d:"Leveraging historical data trends to forecast the highest-probability windows for grid power."},
            {e:"🤝",t:"Community Driven",d:"Built for UI students to reduce unnecessary transit, enhance security, and keep the off-campus community connected."},
          ].map(({e,t,d})=>(
            <div key={t} style={{background:T.card,borderRadius:"18px",padding:"20px 16px",border:"1px solid "+T.border,display:"flex",flexDirection:"column",gap:"10px"}}>
              <div style={{width:"44px",height:"44px",borderRadius:"12px",background:T.raised,border:"1px solid "+T.border,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"20px",flexShrink:0}}>{e}</div>
              <div style={{fontFamily:"'Outfit',sans-serif",fontSize:"14px",fontWeight:700,color:T.t1}}>{t}</div>
              <div style={{fontSize:"12px",color:T.t2,lineHeight:1.6,flex:1,fontFamily:"'DM Sans',sans-serif"}}>{d}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div style={{margin:"24px 16px 0",background:dark?"linear-gradient(135deg,rgba(255,107,43,0.1),rgba(124,108,245,0.05))":"linear-gradient(135deg,rgba(255,107,43,0.07),rgba(124,108,245,0.03))",borderRadius:"20px",padding:"28px 24px",border:"1px solid rgba(255,107,43,0.2)"}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"24px"}}>
          {[["3","Locations tracked"],["1 min","Sensor interval"],["60+","Students surveyed"],["Free","Always"]].map(([v,l])=>(
            <div key={l}>
              <div style={{fontFamily:"'Outfit',sans-serif",fontSize:"34px",fontWeight:800,color:"#FF6B2B",letterSpacing:"-1.5px",lineHeight:1}}>{v}</div>
              <div style={{fontSize:"13px",color:T.t2,marginTop:"5px",fontFamily:"'DM Sans',sans-serif"}}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* About */}
      <div style={{margin:"24px 16px 0",padding:"24px",borderRadius:"20px",border:"1px solid "+T.border,background:T.card}}>
        <div style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"16px"}}>
          <Logo size={28}/>
          <div>
            <div style={{fontFamily:"'Outfit',sans-serif",fontSize:"16px",fontWeight:800,color:T.t1}}>About PowerWatch</div>
            <div style={{fontSize:"11px",color:T.t3,marginTop:"1px",fontFamily:"'DM Sans',sans-serif"}}>An automated urban data initiative</div>
          </div>
        </div>
        <p style={{fontSize:"14px",color:T.t2,lineHeight:1.8,marginBottom:"14px",fontFamily:"'DM Sans',sans-serif"}}>
          PowerWatch is an automated urban data initiative developed as a capstone project for the Fort Leadership Development Course (FLDC). This platform utilises sensors to eliminate the commuter's gamble faced by thousands of off-campus students around the University of Ibadan.
        </p>
        <p style={{fontSize:"14px",color:T.t2,lineHeight:1.8,marginBottom:"16px",fontFamily:"'DM Sans',sans-serif"}}>
          By bridging the gap between raw grid data and the student community, our mission is to provide transparent, real-time electricity intelligence so you can study smarter, transit safely, and maximise your time.
        </p>
        <div style={{paddingTop:"14px",borderTop:"1px solid "+T.border}}>
          <div style={{fontSize:"12px",color:T.t3,marginBottom:"3px",fontFamily:"'DM Sans',sans-serif"}}>Sector: Technology & Innovation · FLDC Cohort 6</div>
          <div style={{fontSize:"12px",color:T.t3,fontFamily:"'DM Sans',sans-serif"}}>Adeoye Fortune · C62372 · Sub-Fort 30 · University of Ibadan</div>
          <div style={{fontSize:"11px",color:T.t4,marginTop:"6px",fontFamily:"'DM Sans',sans-serif"}}>A Student-Led Capstone Initiative under The Fort Institute's FLDC</div>
        </div>
      </div>

    </div>
  );
}

function DashboardPage({live,weekly,monthly,community,loading,error,dark,onReport}){
  const T=getT(dark);
  const [selected,setSelected]=useState(null);
  const [alertOff,setAlertOff]=useState(false);
  const off=live?LOCS.filter(l=>live[l.id]?.status==="OFF"):[];
  const onCount=live?LOCS.filter(l=>live[l.id]?.status==="ON").length:0;
  const now=new Date();
  const time=now.toLocaleTimeString("en-NG",{hour:"2-digit",minute:"2-digit"});
  const date=now.toLocaleDateString("en-NG",{weekday:"short",day:"numeric",month:"short"});

  return(
    <div style={{padding:"74px 16px 100px",fontFamily:"'DM Sans',sans-serif"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"20px"}}>
        <div>
          <div style={{fontSize:"11px",fontWeight:600,color:T.t3,letterSpacing:"1px",textTransform:"uppercase",marginBottom:"4px"}}>{date}</div>
          <h1 style={{fontFamily:"'Outfit',sans-serif",fontSize:"28px",fontWeight:800,color:T.t1,letterSpacing:"-0.5px",lineHeight:1}}>Power Status</h1>
          <p style={{fontSize:"12px",color:T.t3,marginTop:"4px"}}>Agbowo · Orogun · Barika</p>
        </div>
        <div style={{textAlign:"right"}}>
          <div style={{fontFamily:"'Outfit',sans-serif",fontSize:"26px",fontWeight:800,color:T.t1,lineHeight:1}}>{time}</div>
          <div style={{fontSize:"10px",fontWeight:700,marginTop:"3px",color:loading?T.amber:error?T.red:T.green}}>
            {loading?"Syncing...":error?"Offline":"Live"}
          </div>
        </div>
      </div>

      <div style={{background:dark?"linear-gradient(135deg,#0E1D32,#0A1525)":"linear-gradient(135deg,#E8F0FF,#F0F4FF)",borderRadius:"20px",padding:"22px 24px",border:"1px solid "+(dark?DARK.border:LIGHT.border),marginBottom:"16px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div>
          <div style={{fontFamily:"'Outfit',sans-serif",fontSize:"52px",fontWeight:800,color:T.orange,lineHeight:1,letterSpacing:"-2px"}}>
            {live?onCount:"–"}<span style={{fontSize:"20px",color:T.t3,fontWeight:500}}>/3</span>
          </div>
          <div style={{fontSize:"13px",color:T.t2,marginTop:"5px"}}>locations with power right now</div>
        </div>
        <div style={{textAlign:"right"}}>
          {LOCS.map(loc=>{
            const on=live?.[loc.id]?.status==="ON";
            return(
              <div key={loc.id} style={{display:"flex",alignItems:"center",gap:"8px",justifyContent:"flex-end",marginBottom:"6px"}}>
                <span style={{fontSize:"13px",color:T.t2,fontWeight:500}}>{loc.name}</span>
                <div style={{width:"9px",height:"9px",borderRadius:"50%",background:on?T.green:T.t4,flexShrink:0,animation:on?"pulse 2.5s infinite":"none"}}/>
              </div>
            );
          })}
        </div>
      </div>

      {!alertOff&&off.length>0&&(
        <div style={{background:T.redBg,border:"1px solid "+T.redBd,borderRadius:"14px",padding:"13px 16px",display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"14px"}}>
          <div>
            <div style={{fontSize:"13px",fontWeight:700,color:T.red,marginBottom:"3px"}}>Outage detected</div>
            <div style={{fontSize:"12px",color:T.t2}}>{off.map(l=>l.name).join(" & ")} — no power right now</div>
          </div>
          <button onClick={()=>setAlertOff(true)} style={{background:"none",border:"none",color:T.t3,cursor:"pointer",fontSize:"20px",lineHeight:1,padding:"0 0 0 10px"}}>x</button>
        </div>
      )}

      <div style={{display:"flex",flexDirection:"column",gap:"10px",marginBottom:"16px"}}>
        {LOCS.map((loc,i)=>{
          const d=live?.[loc.id];const on=d?.status==="ON";const dur=outageDur(d);
          return(
            <div key={loc.id} onClick={()=>!loading&&setSelected(loc)}
              style={{background:T.card,borderRadius:"18px",padding:"18px",border:"1px solid "+(on?loc.color+"33":T.border),cursor:loading?"default":"pointer",transition:"all 0.18s",animation:"fadeUp "+(0.05+i*0.06)+"s ease both",boxShadow:on?"0 4px 24px "+loc.glow:"none"}}
              onMouseEnter={e=>{if(!loading)e.currentTarget.style.background=T.raised;}} onMouseLeave={e=>{e.currentTarget.style.background=T.card;}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <div style={{display:"flex",alignItems:"center",gap:"14px"}}>
                  <div style={{width:"52px",height:"52px",borderRadius:"14px",background:on?"linear-gradient(135deg,"+loc.color+"22,"+loc.color+"08)":T.raised,border:"1px solid "+(on?loc.color+"44":T.border),display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,position:"relative"}}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                      {on?<path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill={loc.color}/>
                         :<path d="M18.36 6.64a9 9 0 1 1-12.73 0M12 2v10" stroke={T.t4} strokeWidth="1.5" strokeLinecap="round"/>}
                    </svg>
                    {on&&<div style={{position:"absolute",top:"6px",right:"6px",width:"7px",height:"7px",borderRadius:"50%",background:T.green,animation:"pulse 2s infinite"}}/>}
                  </div>
                  <div>
                    <div style={{fontFamily:"'Outfit',sans-serif",fontSize:"18px",fontWeight:700,color:T.t1,marginBottom:"3px"}}>{loc.name}</div>
                    <div style={{fontSize:"11px",color:T.t3}}>
                      {loading?"Loading..."
                       :!on&&dur?<span style={{color:T.red,fontWeight:600}}>Offline · {dur}</span>
                       :d?.last_updated?"Updated "+timeAgo(d.last_updated)
                       :"Awaiting sensor"}
                    </div>
                  </div>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontFamily:"'Outfit',sans-serif",fontSize:"20px",fontWeight:800,color:on?loc.color:T.t4,lineHeight:1}}>{loading?"–":on?"ON":"OFF"}</div>
                    <div style={{fontSize:"9px",color:T.t3,marginTop:"2px"}}>{d?.source??"—"}</div>
                  </div>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke={T.t4} strokeWidth="2" strokeLinecap="round"/></svg>
                </div>
              </div>
              {on&&weekly&&(()=>{
                const avg=weekly.reduce((s,d)=>s+(d[loc.id]||0),0)/weekly.length;
                return(
                  <div style={{marginTop:"14px"}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:"6px"}}>
                      <span style={{fontSize:"10px",color:T.t3}}>7-day average</span>
                      <span style={{fontSize:"10px",fontWeight:700,color:loc.color}}>{avg.toFixed(1)}h/day</span>
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

      {weekly?.length>=2&&(()=>{
        const y=weekly[weekly.length-2];
        const dateStr=y.date?new Date(y.date).toLocaleDateString("en-NG",{weekday:"short",month:"short",day:"numeric"}):"Yesterday";
        return(
          <div style={{background:T.card,borderRadius:"18px",padding:"18px",border:"1px solid "+T.border,marginBottom:"14px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"14px"}}>
              <div>
                <div style={{fontSize:"11px",fontWeight:600,color:T.t3,textTransform:"uppercase",letterSpacing:"1px",marginBottom:"2px",fontFamily:"'DM Sans',sans-serif"}}>Daily Digest</div>
                <div style={{fontFamily:"'Outfit',sans-serif",fontSize:"15px",fontWeight:700,color:T.t1}}>{dateStr}</div>
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
                    <div style={{fontSize:"10px",color:T.t3,marginBottom:"5px",fontFamily:"'DM Sans',sans-serif"}}>{loc.name}</div>
                    <div style={{fontFamily:"'Outfit',sans-serif",fontSize:"22px",fontWeight:800,color:loc.color,lineHeight:1,marginBottom:"3px"}}>{h}h</div>
                    <div style={{fontSize:"9px",fontWeight:700,color:qc,textTransform:"uppercase",letterSpacing:"0.5px",fontFamily:"'DM Sans',sans-serif"}}>{ql}</div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {weekly&&weekly.length>=3&&<PredictorCard weekly={weekly} T={T}/>}

      <div style={{background:T.card,borderRadius:"18px",padding:"20px",border:"1px solid "+T.border}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"18px"}}>
          <div style={{fontFamily:"'Outfit',sans-serif",fontSize:"15px",fontWeight:700,color:T.t1}}>This week</div>
          <div style={{fontSize:"11px",color:T.t3,fontWeight:500,fontFamily:"'DM Sans',sans-serif"}}>avg hrs / day</div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:"15px"}}>
          {LOCS.map(loc=>{
            const avg=weekly?.length?weekly.reduce((s,d)=>s+(d[loc.id]||0),0)/weekly.length:0;
            return(
              <div key={loc.id}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:"7px"}}>
                  <span style={{fontSize:"14px",color:T.t2,fontWeight:500,fontFamily:"'DM Sans',sans-serif"}}>{loc.name}</span>
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
      <p style={{textAlign:"center",fontSize:"11px",color:T.t4,marginTop:"12px",fontFamily:"'DM Sans',sans-serif"}}>Tap any card for full details · Refreshes every 30s</p>
      {selected&&<Drawer loc={selected} live={live} weekly={weekly} monthly={monthly} community={community} onClose={()=>setSelected(null)} onReport={onReport} dark={dark}/>}
    </div>
  );
}

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
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",padding:"80px 24px",background:T.base,fontFamily:"'DM Sans',sans-serif"}}>
      <div style={{textAlign:"center",maxWidth:"360px",animation:"fadeUp 0.5s ease"}}>
        <div style={{width:"72px",height:"72px",borderRadius:"20px",background:T.greenBg,border:"1px solid "+T.greenBd,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 22px",fontSize:"32px"}}>✓</div>
        <h2 style={{fontFamily:"'Outfit',sans-serif",fontSize:"28px",fontWeight:800,color:T.t1,marginBottom:"12px",letterSpacing:"-0.5px"}}>Response recorded!</h2>
        <p style={{fontSize:"15px",color:T.t2,lineHeight:1.7,marginBottom:"28px"}}>Thank you. Your data helps us build a better power tracker for students across Agbowo, Orogun and Barika.</p>
        <button onClick={()=>{setStep(-1);setAns({});setDone(false);}} style={{background:T.raised,border:"1px solid "+T.border,borderRadius:"12px",padding:"13px 24px",color:T.t2,fontSize:"14px",cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>Submit another response</button>
      </div>
    </div>
  );

  return(
    <div style={{minHeight:"100vh",padding:"74px 20px 100px",maxWidth:"480px",margin:"0 auto",fontFamily:"'DM Sans',sans-serif"}}>
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
          <div style={{background:dark?"linear-gradient(135deg,#0E1D32,#06080F)":"linear-gradient(135deg,#E8F0FF,#F0F4FA)",borderRadius:"20px",padding:"28px 24px",border:"1px solid "+T.border,marginBottom:"24px",position:"relative",overflow:"hidden"}}>
            <div style={{position:"absolute",top:"-30px",right:"-30px",width:"120px",height:"120px",borderRadius:"50%",background:"radial-gradient(circle,rgba(255,107,43,0.15) 0%,transparent 70%)",pointerEvents:"none"}}/>
            <div style={{fontSize:"36px",marginBottom:"14px"}}>📋</div>
            <h1 style={{fontFamily:"'Outfit',sans-serif",fontSize:"26px",fontWeight:800,color:T.t1,letterSpacing:"-0.5px",lineHeight:1.2,marginBottom:"10px"}}>Help us understand the problem</h1>
            <p style={{fontSize:"14px",color:T.t2,lineHeight:1.65}}>Under 3 minutes. Your responses shape PowerWatch and help us prove its real-world impact.</p>
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
            Start Survey
          </button>
        </div>
      ):(
        <div key={step} style={{animation:"fadeUp 0.3s ease"}}>
          <div style={{marginBottom:"10px"}}>
            <span style={{display:"inline-block",background:q.required?T.orangeLo:T.raised,border:"1px solid "+(q.required?T.orangeBd:T.border),borderRadius:"20px",padding:"4px 12px",fontSize:"11px",fontWeight:600,color:q.required?T.orange:T.t3,fontFamily:"'DM Sans',sans-serif"}}>{q.required?"Required":"Optional"}</span>
          </div>
          <h2 style={{fontFamily:"'Outfit',sans-serif",fontSize:"22px",fontWeight:700,color:T.t1,lineHeight:1.3,letterSpacing:"-0.3px",marginBottom:"26px"}}>{q.q}</h2>

          {q.type==="choice"&&<div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
            {q.opts.map(o=>{const s=ans[q.id]===o;return(
              <button key={o} onClick={()=>set(o)} style={{padding:"15px 16px",borderRadius:"13px",textAlign:"left",background:s?T.orangeLo:T.card,border:"1px solid "+(s?T.orange:T.border),color:s?T.orange:T.t1,fontSize:"14px",fontWeight:s?600:400,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",transition:"all 0.12s",display:"flex",alignItems:"center",gap:"12px"}}>
                <div style={{width:"20px",height:"20px",borderRadius:"50%",border:"2px solid "+(s?T.orange:T.t4),background:s?T.orange:"transparent",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
                  {s&&<div style={{width:"7px",height:"7px",borderRadius:"50%",background:"#fff"}}/>}
                </div>{o}
              </button>
            );})}
          </div>}

          {q.type==="scale"&&<div>
            <div style={{background:T.card,borderRadius:"16px",padding:"24px",textAlign:"center",marginBottom:"20px",border:"1px solid "+T.border}}>
              <span style={{fontFamily:"'Outfit',sans-serif",fontSize:"60px",fontWeight:800,color:T.orange,lineHeight:1}}>{ans[q.id]??Math.round(q.max/2)}</span>
              <span style={{fontSize:"18px",color:T.t3,marginLeft:"8px",fontFamily:"'DM Sans',sans-serif"}}>{q.unit}</span>
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
                <button key={n} onClick={()=>set(n)} style={{width:"56px",height:"56px",borderRadius:"14px",border:"1px solid "+(s?T.orange:T.border),background:s?"linear-gradient(135deg,"+T.orange+","+T.orangeHi+")":T.card,color:s?"#fff":T.t1,fontFamily:"'Outfit',sans-serif",fontSize:"20px",fontWeight:700,cursor:"pointer",transition:"all 0.12s"}}>{n}</button>
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
                <button key={o} onClick={toggle} style={{padding:"13px 16px",borderRadius:"13px",textAlign:"left",background:c?T.orangeLo:T.card,border:"1px solid "+(c?T.orange:T.border),color:c?T.orange:T.t1,fontSize:"14px",fontWeight:c?600:400,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",transition:"all 0.12s",display:"flex",alignItems:"center",gap:"12px"}}>
                  <div style={{width:"20px",height:"20px",borderRadius:"6px",border:"2px solid "+(c?T.orange:T.t4),background:c?T.orange:"transparent",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"12px",color:"#fff"}}>{c&&"✓"}</div>{o}
                </button>
              );
            })}
          </div>}

          {q.type==="text"&&<textarea value={ans[q.id]||""} onChange={e=>set(e.target.value)} placeholder={q.placeholder} rows={4} style={{width:"100%",background:T.card,border:"1px solid "+T.border,borderRadius:"13px",color:T.t1,fontSize:"14px",padding:"14px 16px",fontFamily:"'DM Sans',sans-serif",resize:"vertical",outline:"none",lineHeight:1.65,transition:"border-color 0.15s"}} onFocus={e=>e.target.style.borderColor=T.orange} onBlur={e=>e.target.style.borderColor=T.border}/>}

          <div style={{display:"flex",gap:"10px",marginTop:"26px"}}>
            <button onClick={()=>setStep(s=>Math.max(-1,s-1))} style={{padding:"14px 18px",borderRadius:"12px",background:T.raised,border:"1px solid "+T.border,color:T.t2,fontSize:"14px",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",transition:"all 0.12s"}} onMouseEnter={e=>e.currentTarget.style.color=T.t1} onMouseLeave={e=>e.currentTarget.style.color=T.t2}>Back</button>
            <button onClick={next} disabled={!canNext()} style={{flex:1,padding:"15px",borderRadius:"12px",background:canNext()?"linear-gradient(135deg,"+T.orange+","+T.orangeHi+")":T.raised,border:"1px solid "+(canNext()?T.orange:T.border),color:canNext()?"#fff":T.t4,fontSize:"15px",fontWeight:700,cursor:canNext()?"pointer":"not-allowed",fontFamily:"'Outfit',sans-serif",letterSpacing:"-0.2px",boxShadow:canNext()?"0 6px 20px rgba(255,107,43,0.25)":"none",transition:"all 0.15s"}}>
              {step>=total-1?"Submit":"Continue"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

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
        @keyframes pulse   {0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.5;transform:scale(1.2)}}
        @keyframes slideUp {from{transform:translateY(100%)}to{transform:translateY(0)}}
        @keyframes fadeUp  {from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        *{box-sizing:border-box;margin:0;padding:0;}
        body{font-family:'DM Sans',system-ui,sans-serif;-webkit-font-smoothing:antialiased;}
        input[type=range]{-webkit-appearance:none;width:100%;height:5px;background:${T.border};border-radius:4px;outline:none;}
        input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:24px;height:24px;border-radius:50%;background:${T.orange};cursor:pointer;border:3px solid ${T.surface};}
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
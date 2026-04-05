import { useState, useEffect, useCallback } from "react";

const API_BASE = "https://powerwatch-backend-afqp.onrender.com";

const DARK={bg0:"#04060d",bg1:"#080c17",bg2:"#0d1220",bg3:"#121929",border:"#1a2235",borderHi:"#243047",blue:"#3B82F6",blueHi:"#60A5FA",blueBg:"rgba(59,130,246,0.08)",green:"#10B981",greenBg:"rgba(16,185,129,0.08)",red:"#EF4444",redBg:"rgba(239,68,68,0.08)",amber:"#F59E0B",text0:"#F8FAFC",text1:"#94A3B8",text2:"#64748b",text3:"#cbd5e1"};
const LIGHT={bg0:"#f8fafc",bg1:"#f1f5f9",bg2:"#ffffff",bg3:"#f8fafc",border:"#e2e8f0",borderHi:"#cbd5e1",blue:"#2563EB",blueHi:"#1d4ed8",blueBg:"rgba(37,99,235,0.08)",green:"#059669",greenBg:"rgba(5,150,105,0.08)",red:"#DC2626",redBg:"rgba(220,38,38,0.08)",amber:"#D97706",text0:"#0f172a",text1:"#334155",text2:"#64748b",text3:"#94a3b8"};
const getT=(dark)=>dark?DARK:LIGHT;
const T=DARK;

const LOCS = [
  {id:"agbowo",name:"Agbowo",short:"AGW",color:"#3B82F6",bg:"rgba(59,130,246,0.08)",border:"rgba(59,130,246,0.2)"},
  {id:"orogun",name:"Orogun",short:"ORG",color:"#8B5CF6",bg:"rgba(139,92,246,0.08)",border:"rgba(139,92,246,0.2)"},
  {id:"barika",name:"Barika",short:"BRK",color:"#06B6D4",bg:"rgba(6,182,212,0.08)",border:"rgba(6,182,212,0.2)"},
];

const SURVEY_QS = [
  {id:"location",type:"choice",q:"Which area do you live in?",required:true,opts:["Agbowo","Orogun","Barika"]},
  {id:"hours",type:"scale",q:"Average hours of electricity per day?",required:true,min:0,max:24,unit:"hours"},
  {id:"surprised",type:"choice",q:"How often does an outage catch you off guard?",required:true,opts:["Never","Rarely (1–2×/month)","Sometimes (weekly)","Often (several times/week)","Almost always"]},
  {id:"lost",type:"scale",q:"Productive hours lost per week due to outages?",required:true,min:0,max:20,unit:"hours"},
  {id:"confidence",type:"rating",q:"How confident are you planning around power availability?",required:true,low:"Not at all",high:"Very confident"},
  {id:"aware",type:"choice",q:"Do you know of any tool that tracks power in your area?",required:true,opts:["Yes, I use one","Heard of one but don't use it","No, nothing like that exists","Not sure"]},
  {id:"coping",type:"multi",q:"How do you cope with outages? (all that apply)",required:false,opts:["Charge devices in advance","Use a generator","Go to campus for power","Use candles/fuel lamp","Mobile data only","No strategy"]},
  {id:"impact",type:"text",q:"In your own words, how do outages affect your studies?",required:false,placeholder:"e.g. I can't charge my laptop, deadlines get delayed..."},
];

async function fetchStatus(){const r=await fetch(API_BASE+"/api/status/all");if(!r.ok)throw new Error();return r.json();}
async function fetchWeekly(){const r=await fetch(API_BASE+"/api/reports/daily/all?days=7");if(!r.ok)throw new Error();const data=await r.json();const days=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];return data.map(d=>({...d,day:days[new Date(d.date).getDay()]}));}
async function fetchMonthly(){const r=await fetch(API_BASE+"/api/reports/monthly/all?year="+new Date().getFullYear());if(!r.ok)throw new Error();return r.json();}
function timeAgo(iso){if(!iso)return"—";const m=Math.floor((Date.now()-new Date(iso))/60000);if(m<1)return"just now";if(m<60)return m+"m ago";return Math.floor(m/60)+"h ago";}

function Logo({size=28}){
  return(
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <rect width="28" height="28" rx="7" fill={T.blueBg} stroke={T.border} strokeWidth="1"/>
      <circle cx="14" cy="14" r="3.5" fill={T.blue}/>
      {[0,60,120,180,240,300].map((a,i)=>{
        const rad=a*Math.PI/180;
        return <line key={i} x1={14+Math.cos(rad)*5} y1={14+Math.sin(rad)*5} x2={14+Math.cos(rad)*9.5} y2={14+Math.sin(rad)*9.5} stroke={T.blue} strokeWidth="1.5" strokeLinecap="round" opacity={i%2===0?0.9:0.3}/>;
      })}
    </svg>
  );
}

function NavBar({page,setPage,dark,setDark}){
  return(
    <nav style={{position:"fixed",top:0,left:0,right:0,zIndex:200,background:dark?"rgba(4,6,13,0.92)":"rgba(255,255,255,0.92)",backdropFilter:"blur(20px)",borderBottom:"1px solid "+(dark?T.border:"#e2e8f0"),padding:"0 16px",height:"56px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
      <div style={{display:"flex",alignItems:"center",gap:"9px",cursor:"pointer"}} onClick={()=>setPage("home")}>
        <Logo/>
        <span style={{fontSize:"15px",fontWeight:700,color:dark?T.text0:"#0f172a",letterSpacing:"-0.3px"}}>PowerWatch</span>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:"4px"}}>
        {[["home","Home"],["dashboard","App"],["survey","Survey"]].map(([id,label])=>(
          <button key={id} onClick={()=>setPage(id)} style={{padding:"6px 10px",borderRadius:"8px",border:"1px solid "+(page===id?T.blue+"44":"transparent"),background:page===id?T.blueBg:"transparent",color:page===id?T.blueHi:dark?T.text2:"#64748b",fontSize:"13px",fontWeight:page===id?600:400,cursor:"pointer",transition:"all 0.15s"}}>{label}</button>
        ))}
        <button onClick={()=>setDark(d=>!d)} style={{marginLeft:"6px",width:"34px",height:"34px",borderRadius:"8px",border:"1px solid "+(dark?T.border:"#e2e8f0"),background:dark?"#0d1220":"#f1f5f9",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"15px",transition:"all 0.2s",flexShrink:0}} title="Toggle theme">
          {dark?"☀️":"🌙"}
        </button>
      </div>
    </nav>
  );
}

function BarChart({data,color,locId}){
  const [hov,setHov]=useState(null);
  if(!data?.length)return <div style={{height:"72px",background:T.bg0,borderRadius:"6px"}}/>;
  const max=Math.max(...data.map(d=>d[locId]||0),1);
  return(
    <div style={{display:"flex",gap:"6px",alignItems:"flex-end",height:"72px"}}>
      {data.map((d,i)=>(
        <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:"4px",height:"100%",justifyContent:"flex-end",position:"relative",cursor:"pointer"}} onMouseEnter={()=>setHov(i)} onMouseLeave={()=>setHov(null)}>
          {hov===i&&<div style={{position:"absolute",top:"-26px",background:color,borderRadius:"5px",padding:"3px 7px",fontSize:"10px",color:"#000",fontWeight:700,whiteSpace:"nowrap"}}>{(d[locId]||0).toFixed(1)}h</div>}
          <div style={{width:"100%",borderRadius:"3px 3px 0 0",height:((d[locId]||0)/max*58)+"px",background:hov===i?color:color+"44",transition:"all 0.15s"}}/>
          <span style={{fontSize:"9px",color:T.text3,fontFamily:"monospace"}}>{(d.day||"")[0]}</span>
        </div>
      ))}
    </div>
  );
}

function LineChart({data,color,locId}){
  const [hov,setHov]=useState(null);
  if(!data?.length)return <div style={{height:"56px",background:T.bg0,borderRadius:"6px"}}/>;
  const max=Math.max(...data.map(d=>d[locId]||0),1);
  const W=300,H=56;
  const pts=data.map((d,i)=>[(i/(data.length-1))*(W-16)+8,H-((d[locId]||0)/max)*(H-10)-5]);
  const path=pts.map(([x,y],i)=>(i===0?"M":"L")+x+","+y).join(" ");
  const area=path+" L"+pts[pts.length-1][0]+","+H+" L"+pts[0][0]+","+H+" Z";
  return(
    <svg viewBox={"0 0 "+W+" "+(H+16)} style={{width:"100%"}}>
      <defs><linearGradient id={"g"+locId} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.25"/><stop offset="100%" stopColor={color} stopOpacity="0"/></linearGradient></defs>
      <path d={area} fill={"url(#g"+locId+")"}/>
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      {pts.map(([x,y],i)=>(
        <g key={i}>
          <circle cx={x} cy={y} r="8" fill="transparent" onMouseEnter={()=>setHov(i)} onMouseLeave={()=>setHov(null)} style={{cursor:"pointer"}}/>
          <circle cx={x} cy={y} r={hov===i?3.5:2} fill={color}/>
          {hov===i&&<g><rect x={x-18} y={y-20} width="36" height="14" rx="3" fill={T.bg0}/><text x={x} y={y-10} textAnchor="middle" fontSize="8" fill={color} fontFamily="monospace">{(data[i][locId]||0).toFixed(0)}h</text></g>}
        </g>
      ))}
      {data.map((d,i)=><text key={i} x={pts[i][0]} y={H+14} textAnchor="middle" fontSize="8" fill={T.text3} fontFamily="monospace">{d.month_name?d.month_name[0]:""}</text>)}
    </svg>
  );
}

function Drawer({loc,live,weekly,monthly,onClose,dark=true}){
  const T=getT(dark);
  const d=live?.[loc.id];
  const on=d?.status==="ON";
  const avg=weekly?.length?(weekly.reduce((s,w)=>s+(w[loc.id]||0),0)/weekly.length).toFixed(1):null;
  return(
    <div style={{position:"fixed",inset:0,zIndex:300,display:"flex",alignItems:"flex-end"}} onClick={onClose}>
      <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.75)",backdropFilter:"blur(8px)"}}/>
      <div style={{position:"relative",width:"100%",maxWidth:"480px",margin:"0 auto",background:T.bg1,borderRadius:"24px 24px 0 0",border:"1px solid "+loc.border,borderBottom:"none",padding:"0 20px 44px",animation:"drawerUp 0.32s cubic-bezier(0.16,1,0.3,1)",maxHeight:"90vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"center",padding:"14px 0 20px"}}><div style={{width:"36px",height:"4px",background:T.border,borderRadius:"4px"}}/></div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"24px"}}>
          <div>
            <div style={{fontSize:"11px",color:T.text2,letterSpacing:"2px",textTransform:"uppercase",marginBottom:"4px"}}>Location</div>
            <div style={{fontSize:"28px",fontWeight:800,color:loc.color,letterSpacing:"-0.5px",lineHeight:1}}>{loc.name}</div>
            <div style={{fontSize:"12px",color:T.text2,marginTop:"4px"}}>University of Ibadan · Off-campus</div>
          </div>
          <div style={{padding:"8px 16px",borderRadius:"10px",background:on?T.greenBg:T.redBg,border:"1px solid "+(on?"rgba(16,185,129,0.25)":"rgba(239,68,68,0.25)"),color:on?T.green:T.red,fontSize:"13px",fontWeight:700}}>{on?"⚡ Online":"🔌 Offline"}</div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px",marginBottom:"16px"}}>
          {[["Status",on?"ON":"OFF",loc.color],["7-day avg",avg?avg+"h/day":"—",T.text0],["Last ping",d?.last_updated?timeAgo(d.last_updated):"—",T.text0],["Source",d?.source??"—",T.text1]].map(([k,v,c])=>(
            <div key={k} style={{background:T.bg0,borderRadius:"12px",padding:"14px 16px",border:"1px solid "+T.border}}>
              <div style={{fontSize:"10px",color:T.text2,textTransform:"uppercase",letterSpacing:"1.5px",marginBottom:"8px"}}>{k}</div>
              <div style={{fontSize:"20px",fontWeight:700,color:c,lineHeight:1}}>{v}</div>
            </div>
          ))}
        </div>
        <div style={{background:T.bg0,borderRadius:"14px",padding:"18px",marginBottom:"10px",border:"1px solid "+T.border}}>
          <div style={{fontSize:"10px",color:T.text2,textTransform:"uppercase",letterSpacing:"1.5px",marginBottom:"14px"}}>This week</div>
          <BarChart data={weekly} color={loc.color} locId={loc.id}/>
        </div>
        <div style={{background:T.bg0,borderRadius:"14px",padding:"18px",border:"1px solid "+T.border}}>
          <div style={{fontSize:"10px",color:T.text2,textTransform:"uppercase",letterSpacing:"1.5px",marginBottom:"10px"}}>Monthly trend</div>
          <LineChart data={monthly} color={loc.color} locId={loc.id}/>
        </div>
        <p style={{textAlign:"center",marginTop:"16px",fontSize:"11px",color:T.text3}}>Auto-refreshes every 30 seconds</p>
      </div>
    </div>
  );
}

function LandingPage({setPage,live,dark=true}){
  const T=getT(dark);
  const onCount=live?LOCS.filter(l=>live[l.id]?.status==="ON").length:null;
  return(
    <div>
      <section style={{padding:"100px 24px 60px",maxWidth:"480px",margin:"0 auto"}}>
        <div style={{display:"inline-flex",alignItems:"center",gap:"8px",background:T.blueBg,border:"1px solid "+T.blue+"44",borderRadius:"20px",padding:"6px 14px",marginBottom:"28px"}}>
          <div style={{width:"6px",height:"6px",borderRadius:"50%",background:T.green,animation:"blink 2s infinite"}}/>
          <span style={{fontSize:"12px",color:T.blueHi,fontWeight:500}}>{onCount!==null?onCount+"/3 locations online":"Live monitoring active"}</span>
        </div>
        <h1 style={{fontSize:"40px",fontWeight:800,color:T.text0,lineHeight:1.1,letterSpacing:"-1px",marginBottom:"16px"}}>
          Know before<br/><span style={{color:T.blue}}>the lights go out.</span>
        </h1>
        <p style={{fontSize:"16px",color:T.text1,lineHeight:1.7,marginBottom:"32px"}}>Real-time power availability for off-campus students in Agbowo, Orogun and Barika — University of Ibadan.</p>
        <div style={{display:"flex",flexDirection:"column",gap:"10px",marginBottom:"48px"}}>
          <button onClick={()=>setPage("dashboard")} style={{width:"100%",padding:"16px",borderRadius:"12px",background:T.blue,border:"none",color:"#fff",fontSize:"15px",fontWeight:700,cursor:"pointer"}} onMouseEnter={e=>e.currentTarget.style.opacity="0.9"} onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
            Check Power Status →
          </button>
          <button onClick={()=>setPage("survey")} style={{width:"100%",padding:"16px",borderRadius:"12px",background:"transparent",border:"1px solid "+T.border,color:T.text1,fontSize:"15px",fontWeight:500,cursor:"pointer",transition:"all 0.15s"}} onMouseEnter={e=>{e.currentTarget.style.borderColor=T.borderHi;e.currentTarget.style.color=T.text0}} onMouseLeave={e=>{e.currentTarget.style.borderColor=T.border;e.currentTarget.style.color=T.text1}}>
            Take the Survey
          </button>
        </div>
        <div style={{background:T.bg2,borderRadius:"16px",padding:"16px",border:"1px solid "+T.border,marginBottom:"48px"}}>
          <div style={{fontSize:"11px",color:T.text2,textTransform:"uppercase",letterSpacing:"1.5px",marginBottom:"12px"}}>Live right now</div>
          {LOCS.map(loc=>{
            const d=live?.[loc.id];const on=d?.status==="ON";
            return(
              <div key={loc.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"9px 0",borderBottom:"1px solid "+T.border+"66"}}>
                <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
                  <div style={{width:"8px",height:"8px",borderRadius:"50%",background:on?T.green:T.text3,animation:on?"blink 2.5s infinite":"none",flexShrink:0}}/>
                  <span style={{fontSize:"14px",color:T.text0,fontWeight:500}}>{loc.name}</span>
                </div>
                <span style={{fontSize:"13px",fontWeight:700,color:on?T.green:T.text2}}>{!live?"—":on?"Power ON":"Power OFF"}</span>
              </div>
            );
          })}
        </div>
      </section>

      <section style={{padding:"0 24px 60px",maxWidth:"480px",margin:"0 auto"}}>
        <div style={{fontSize:"11px",color:T.text2,textTransform:"uppercase",letterSpacing:"2px",marginBottom:"20px"}}>Why PowerWatch</div>
        <div style={{display:"flex",flexDirection:"column",gap:"12px"}}>
          {[{icon:"⚡",title:"Real-time updates",desc:"IoT sensors report every 5 minutes. No guessing — just live data."},{icon:"📊",title:"Historical trends",desc:"See daily, weekly and monthly patterns to plan smarter."},{icon:"🔔",title:"Instant alerts",desc:"Know the moment an outage hits your area before it disrupts your day."}].map(({icon,title,desc})=>(
            <div key={title} style={{background:T.bg2,borderRadius:"14px",padding:"18px 20px",border:"1px solid "+T.border,display:"flex",gap:"16px",alignItems:"flex-start"}}>
              <div style={{fontSize:"20px",flexShrink:0,marginTop:"2px"}}>{icon}</div>
              <div><div style={{fontSize:"15px",fontWeight:700,color:T.text0,marginBottom:"4px"}}>{title}</div><div style={{fontSize:"13px",color:T.text1,lineHeight:1.6}}>{desc}</div></div>
            </div>
          ))}
        </div>
      </section>

      <section style={{padding:"0 24px 60px",maxWidth:"480px",margin:"0 auto"}}>
        <div style={{background:"linear-gradient(135deg,rgba(59,130,246,0.1),rgba(6,182,212,0.05))",borderRadius:"20px",padding:"28px",border:"1px solid "+T.blue+"33"}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"20px"}}>
            {[["3","Locations covered"],["5 min","Update frequency"],["60+","Students surveyed"],["Free","Always"]].map(([v,l])=>(
              <div key={l}><div style={{fontSize:"30px",fontWeight:800,color:T.blue,letterSpacing:"-1px",lineHeight:1}}>{v}</div><div style={{fontSize:"12px",color:T.text1,marginTop:"4px"}}>{l}</div></div>
            ))}
          </div>
        </div>
      </section>

      <section style={{padding:"0 24px 80px",maxWidth:"480px",margin:"0 auto"}}>
        <div style={{borderTop:"1px solid "+T.border,paddingTop:"28px"}}>
          <div style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"12px"}}><Logo size={24}/><span style={{fontSize:"14px",fontWeight:700,color:T.text0}}>About this project</span></div>
          <p style={{fontSize:"13px",color:T.text1,lineHeight:1.7,marginBottom:"12px"}}>PowerWatch UI is a student-led initiative under The Fort Institute's Foundational Leadership Development Course (FLDC) — Cohort 6. Built to solve a real problem faced by thousands of off-campus students at the University of Ibadan.</p>
          <p style={{fontSize:"12px",color:T.text2}}>Sector: Technology & Innovation · Adeoye Fortune (C62372) · Sub-Fort 30</p>
          <p style={{fontSize:"11px",color:T.text3,marginTop:"8px"}}>A Student-Led Capstone Initiative under The Fort Institute's FLDC</p>
        </div>
      </section>
    </div>
  );
}

function DashboardPage({live,weekly,monthly,loading,error,dark=true}){
  const T=getT(dark);
  const [selected,setSelected]=useState(null);
  const [alertOff,setAlertOff]=useState(false);
  const offLocs=live?LOCS.filter(l=>live[l.id]?.status==="OFF"):[];
  const now=new Date();
  const timeStr=now.toLocaleTimeString("en-NG",{hour:"2-digit",minute:"2-digit"});
  const dateStr=now.toLocaleDateString("en-NG",{weekday:"short",month:"short",day:"numeric"});
  return(
    <div style={{padding:"76px 20px 40px",maxWidth:"480px",margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"24px"}}>
        <div>
          <div style={{fontSize:"11px",color:T.text2,letterSpacing:"1px",textTransform:"uppercase",marginBottom:"4px"}}>{dateStr}</div>
          <h1 style={{fontSize:"26px",fontWeight:800,color:T.text0,letterSpacing:"-0.5px",lineHeight:1}}>Power Status</h1>
          <p style={{fontSize:"12px",color:T.text2,marginTop:"4px"}}>Agbowo · Orogun · Barika</p>
        </div>
        <div style={{textAlign:"right"}}>
          <div style={{fontSize:"22px",fontWeight:700,color:T.text0,fontFamily:"monospace"}}>{timeStr}</div>
          <div style={{fontSize:"10px",color:loading?T.amber:error?T.red:T.green,marginTop:"2px",fontWeight:600}}>{loading?"● Syncing...":error?"● Offline":"● Live"}</div>
        </div>
      </div>

      {!alertOff&&offLocs.length>0&&(
        <div style={{background:T.redBg,border:"1px solid rgba(239,68,68,0.25)",borderRadius:"12px",padding:"12px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"16px"}}>
          <div>
            <div style={{fontSize:"12px",fontWeight:700,color:T.red,marginBottom:"2px"}}>Outage detected</div>
            <div style={{fontSize:"12px",color:T.text1}}>{offLocs.map(l=>l.name).join(" & ")} — no power right now</div>
          </div>
          <button onClick={()=>setAlertOff(true)} style={{background:"none",border:"none",color:T.text2,cursor:"pointer",fontSize:"18px",padding:"0 0 0 12px"}}>×</button>
        </div>
      )}

      <div style={{display:"flex",flexDirection:"column",gap:"10px",marginBottom:"20px"}}>
        {LOCS.map((loc,i)=>{
          const d=live?.[loc.id];const on=d?.status==="ON";
          return(
            <div key={loc.id} onClick={()=>!loading&&setSelected(loc)}
              style={{background:T.bg2,borderRadius:"16px",padding:"18px",border:"1px solid "+(on?loc.border:T.border),cursor:loading?"default":"pointer",display:"flex",alignItems:"center",justifyContent:"space-between",transition:"all 0.18s",animation:"fadeCard "+(0.1+i*0.08)+"s ease both"}}
              onMouseEnter={e=>{if(!loading)e.currentTarget.style.background=T.bg3;}} onMouseLeave={e=>{e.currentTarget.style.background=T.bg2;}}>
              <div style={{display:"flex",alignItems:"center",gap:"14px"}}>
                <div style={{width:"48px",height:"48px",borderRadius:"12px",background:on?loc.bg:T.bg0,border:"1px solid "+(on?loc.border:T.border),display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,position:"relative"}}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    {on?<path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill={loc.color}/>:<><circle cx="12" cy="12" r="9" stroke={T.text3} strokeWidth="1.5"/><line x1="12" y1="7" x2="12" y2="13" stroke={T.text3} strokeWidth="1.5" strokeLinecap="round"/></>}
                  </svg>
                  {on&&<div style={{position:"absolute",top:"4px",right:"4px",width:"6px",height:"6px",borderRadius:"50%",background:T.green,animation:"blink 2s infinite"}}/>}
                </div>
                <div>
                  <div style={{fontSize:"16px",fontWeight:700,color:T.text0,marginBottom:"2px"}}>{loc.name}</div>
                  <div style={{fontSize:"11px",color:T.text2}}>{loading?"Fetching data...":d?.last_updated?"Updated "+timeAgo(d.last_updated):"Waiting for sensor"}</div>
                </div>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:"17px",fontWeight:800,color:on?loc.color:T.text2}}>{loading?"—":on?"ON":"OFF"}</div>
                  <div style={{fontSize:"9px",color:T.text2,marginTop:"2px"}}>{d?.source??"—"}</div>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke={T.text3} strokeWidth="2" strokeLinecap="round"/></svg>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{background:T.bg2,borderRadius:"16px",padding:"20px",border:"1px solid "+T.border}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"16px"}}>
          <div style={{fontSize:"13px",fontWeight:600,color:T.text0}}>This week</div>
          <div style={{fontSize:"11px",color:T.text2}}>avg hrs / day</div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:"14px"}}>
          {LOCS.map(loc=>{
            const avg=weekly?.length?weekly.reduce((s,d)=>s+(d[loc.id]||0),0)/weekly.length:0;
            return(
              <div key={loc.id}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:"7px"}}>
                  <span style={{fontSize:"13px",color:T.text1}}>{loc.name}</span>
                  <span style={{fontSize:"13px",fontWeight:700,color:loc.color}}>{avg.toFixed(1)}h</span>
                </div>
                <div style={{height:"4px",background:T.bg0,borderRadius:"4px",overflow:"hidden"}}>
                  <div style={{width:Math.min((avg/24)*100,100)+"%",height:"100%",background:loc.color,borderRadius:"4px",transition:"width 1s cubic-bezier(.16,1,.3,1)"}}/>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <p style={{textAlign:"center",fontSize:"11px",color:T.text3,marginTop:"12px"}}>Tap any card for detailed stats · Auto-refreshes every 30s</p>
      {selected&&<Drawer loc={selected} live={live} weekly={weekly} monthly={monthly} onClose={()=>setSelected(null)} dark={dark}/>}
    </div>
  );
}

function SurveyPage({dark=true}){
  const T=getT(dark);
  const [step,setStep]=useState(-1);
  const [answers,setAnswers]=useState({});
  const [done,setDone]=useState(false);
  const total=SURVEY_QS.length;
  const q=SURVEY_QS[step];
  const canNext=()=>{if(step===-1)return true;if(!q?.required)return true;const v=answers[q.id];if(v===undefined||v===null||v==="")return false;if(Array.isArray(v)&&v.length===0)return false;return true;};
  const next=()=>{if(!canNext())return;if(step>=total-1){setDone(true);return;}setStep(s=>s+1);};
  const set=val=>setAnswers(a=>({...a,[q.id]:val}));
  const pct=step<0?0:Math.round(((step+1)/total)*100);

  if(done)return(
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",padding:"80px 24px 40px"}}>
      <div style={{textAlign:"center",maxWidth:"400px",animation:"fadeCard 0.5s ease"}}>
        <div style={{width:"64px",height:"64px",borderRadius:"16px",background:T.greenBg,border:"1px solid rgba(16,185,129,0.25)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 20px",fontSize:"28px"}}>✓</div>
        <h2 style={{fontSize:"24px",fontWeight:800,color:T.text0,marginBottom:"10px",letterSpacing:"-0.3px"}}>Response recorded</h2>
        <p style={{fontSize:"14px",color:T.text1,lineHeight:1.7,marginBottom:"28px"}}>Thank you for contributing to this research. Your data helps improve power planning for students across Agbowo, Orogun and Barika.</p>
        <button onClick={()=>{setStep(-1);setAnswers({});setDone(false);}} style={{background:T.bg2,border:"1px solid "+T.border,borderRadius:"10px",padding:"12px 24px",color:T.text1,fontSize:"13px",cursor:"pointer"}}>Submit another response</button>
      </div>
    </div>
  );

  return(
    <div style={{minHeight:"100vh",padding:"72px 20px 40px",maxWidth:"480px",margin:"0 auto"}}>
      {step>=0&&(
        <div style={{marginBottom:"28px"}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:"8px"}}>
            <span style={{fontSize:"12px",color:T.text2}}>Question {step+1} of {total}</span>
            <span style={{fontSize:"12px",fontWeight:700,color:T.blue}}>{pct}%</span>
          </div>
          <div style={{height:"3px",background:T.border,borderRadius:"3px",overflow:"hidden"}}>
            <div style={{width:pct+"%",height:"100%",background:T.blue,borderRadius:"3px",transition:"width 0.4s ease"}}/>
          </div>
        </div>
      )}

      {step===-1?(
        <div style={{animation:"fadeCard 0.4s ease"}}>
          <div style={{display:"inline-block",background:T.blueBg,border:"1px solid "+T.blue+"44",borderRadius:"8px",padding:"4px 12px",fontSize:"11px",color:T.blueHi,fontWeight:600,letterSpacing:"1px",textTransform:"uppercase",marginBottom:"20px"}}>Baseline Survey</div>
          <h1 style={{fontSize:"28px",fontWeight:800,color:T.text0,letterSpacing:"-0.5px",lineHeight:1.2,marginBottom:"14px"}}>Help us understand the problem</h1>
          <p style={{fontSize:"14px",color:T.text1,lineHeight:1.7,marginBottom:"28px"}}>This short survey (under 3 minutes) collects data to measure how power outages affect students.</p>
          <div style={{background:T.bg2,borderRadius:"14px",padding:"4px 16px",border:"1px solid "+T.border,marginBottom:"28px"}}>
            {[["🔒","Anonymous","No personal data collected"],["⏱","3 minutes",total+" quick questions"],["📊","Research only","FLDC Capstone Project"]].map(([icon,t,s])=>(
              <div key={t} style={{display:"flex",alignItems:"center",gap:"12px",padding:"13px 0",borderBottom:"1px solid "+T.border+"55"}}>
                <span style={{fontSize:"16px"}}>{icon}</span>
                <div><div style={{fontSize:"13px",fontWeight:600,color:T.text0}}>{t}</div><div style={{fontSize:"11px",color:T.text2}}>{s}</div></div>
              </div>
            ))}
          </div>
          <button onClick={next} style={{width:"100%",padding:"16px",borderRadius:"12px",background:T.blue,border:"none",color:"#fff",fontSize:"15px",fontWeight:700,cursor:"pointer"}}>Start Survey →</button>
        </div>
      ):(
        <div key={step} style={{animation:"fadeCard 0.3s ease"}}>
          <div style={{fontSize:"11px",color:q.required?T.blue:T.text2,textTransform:"uppercase",letterSpacing:"1px",fontWeight:600,marginBottom:"10px"}}>{q.required?"Required":"Optional"}</div>
          <h2 style={{fontSize:"19px",fontWeight:700,color:T.text0,lineHeight:1.4,letterSpacing:"-0.2px",marginBottom:"24px"}}>{q.q}</h2>

          {q.type==="choice"&&(
            <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
              {q.opts.map(opt=>{const sel=answers[q.id]===opt;return(
                <button key={opt} onClick={()=>set(opt)} style={{padding:"14px 16px",borderRadius:"12px",textAlign:"left",background:sel?T.blueBg:T.bg2,border:"1px solid "+(sel?T.blue:T.border),color:sel?T.blueHi:T.text1,fontSize:"14px",fontWeight:sel?600:400,cursor:"pointer",transition:"all 0.12s",display:"flex",alignItems:"center",gap:"12px"}}>
                  <div style={{width:"18px",height:"18px",borderRadius:"50%",border:"2px solid "+(sel?T.blue:T.text3),background:sel?T.blue:"transparent",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
                    {sel&&<div style={{width:"6px",height:"6px",borderRadius:"50%",background:"#fff"}}/>}
                  </div>{opt}
                </button>
              );})}
            </div>
          )}

          {q.type==="scale"&&(
            <div>
              <div style={{background:T.bg0,borderRadius:"14px",padding:"20px",textAlign:"center",marginBottom:"20px",border:"1px solid "+T.border}}>
                <span style={{fontSize:"52px",fontWeight:800,color:T.blue,lineHeight:1}}>{answers[q.id]??Math.round(q.max/2)}</span>
                <span style={{fontSize:"16px",color:T.text2,marginLeft:"8px"}}>{q.unit}</span>
              </div>
              <input type="range" min={q.min} max={q.max} step="1" value={answers[q.id]??Math.round(q.max/2)} onChange={e=>set(parseInt(e.target.value))} style={{width:"100%",accentColor:T.blue,cursor:"pointer"}}/>
              <div style={{display:"flex",justifyContent:"space-between",marginTop:"6px"}}>
                <span style={{fontSize:"11px",color:T.text3}}>{q.min} {q.unit}</span>
                <span style={{fontSize:"11px",color:T.text3}}>{q.max} {q.unit}+</span>
              </div>
            </div>
          )}

          {q.type==="rating"&&(
            <div>
              <div style={{display:"flex",gap:"8px",justifyContent:"center",marginBottom:"10px"}}>
                {[1,2,3,4,5].map(n=>{const sel=answers[q.id]===n;return(
                  <button key={n} onClick={()=>set(n)} style={{width:"54px",height:"54px",borderRadius:"12px",border:"1px solid "+(sel?T.blue:T.border),background:sel?T.blue:T.bg2,color:sel?"#fff":T.text1,fontSize:"18px",fontWeight:700,cursor:"pointer",transition:"all 0.12s"}}>{n}</button>
                );})}
              </div>
              <div style={{display:"flex",justifyContent:"space-between"}}>
                <span style={{fontSize:"11px",color:T.text2}}>{q.low}</span>
                <span style={{fontSize:"11px",color:T.text2}}>{q.high}</span>
              </div>
            </div>
          )}

          {q.type==="multi"&&(
            <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
              {q.opts.map(opt=>{
                const checked=(answers[q.id]||[]).includes(opt);
                const toggle=()=>{const prev=answers[q.id]||[];set(checked?prev.filter(v=>v!==opt):[...prev,opt]);};
                return(
                  <button key={opt} onClick={toggle} style={{padding:"13px 16px",borderRadius:"12px",textAlign:"left",background:checked?T.blueBg:T.bg2,border:"1px solid "+(checked?T.blue:T.border),color:checked?T.blueHi:T.text1,fontSize:"14px",fontWeight:checked?600:400,cursor:"pointer",transition:"all 0.12s",display:"flex",alignItems:"center",gap:"12px"}}>
                    <div style={{width:"18px",height:"18px",borderRadius:"5px",border:"2px solid "+(checked?T.blue:T.text3),background:checked?T.blue:"transparent",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"11px",color:"#fff"}}>{checked?"✓":""}</div>{opt}
                  </button>
                );
              })}
            </div>
          )}

          {q.type==="text"&&(
            <textarea value={answers[q.id]||""} onChange={e=>set(e.target.value)} placeholder={q.placeholder} rows={4}
              style={{width:"100%",background:T.bg2,border:"1px solid "+T.border,borderRadius:"12px",color:T.text0,fontSize:"14px",padding:"14px 16px",fontFamily:"inherit",resize:"vertical",outline:"none",lineHeight:1.6,transition:"border-color 0.15s"}}
              onFocus={e=>e.target.style.borderColor=T.blue} onBlur={e=>e.target.style.borderColor=T.border}/>
          )}

          <div style={{display:"flex",gap:"10px",marginTop:"24px"}}>
            <button onClick={()=>setStep(s=>Math.max(-1,s-1))} style={{padding:"14px 18px",borderRadius:"10px",background:T.bg2,border:"1px solid "+T.border,color:T.text2,fontSize:"14px",cursor:"pointer",transition:"all 0.12s"}}
              onMouseEnter={e=>e.currentTarget.style.color=T.text0} onMouseLeave={e=>e.currentTarget.style.color=T.text2}>← Back</button>
            <button onClick={next} disabled={!canNext()} style={{flex:1,padding:"14px",borderRadius:"10px",background:canNext()?T.blue:T.bg2,border:"1px solid "+(canNext()?T.blue:T.border),color:canNext()?"#fff":T.text3,fontSize:"14px",fontWeight:700,cursor:canNext()?"pointer":"not-allowed",transition:"all 0.15s"}}>
              {step>=total-1?"Submit ✓":"Continue →"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App(){
  const hash=window.location.hash.replace("#","");
  const [page,setPage]=useState(hash==="survey"?"survey":hash==="dashboard"?"dashboard":"home");
  const [dark,setDark]=useState(true);
  const [live,setLive]=useState(null);
  const [weekly,setWeekly]=useState(null);
  const [monthly,setMonthly]=useState(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState(false);

  const navigate=p=>{window.location.hash=p==="home"?"":p;setPage(p);};

  const refresh=useCallback(async()=>{
    try{const data=await fetchStatus();setLive(data);setError(false);}
    catch{setError(true);}
    finally{setLoading(false);}
  },[]);

  useEffect(()=>{
    refresh();
    fetchWeekly().then(setWeekly).catch(()=>{});
    fetchMonthly().then(setMonthly).catch(()=>{});
  },[]);

  useEffect(()=>{const t=setInterval(refresh,30000);return()=>clearInterval(t);},[refresh]);

  return(
    <div style={{minHeight:"100vh",background:dark?T.bg1:"#f1f5f9",color:dark?T.text0:"#0f172a",fontFamily:"'Plus Jakarta Sans',system-ui,sans-serif",transition:"background 0.3s,color 0.3s"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        @keyframes blink    {0%,100%{opacity:1}50%{opacity:0.3}}
        @keyframes drawerUp {from{transform:translateY(100%)}to{transform:translateY(0)}}
        @keyframes fadeCard {from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        *{box-sizing:border-box;margin:0;padding:0;}
        input[type=range]{-webkit-appearance:none;width:100%;height:5px;background:${dark?DARK.border:LIGHT.border};border-radius:4px;outline:none;}
        input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:22px;height:22px;border-radius:50%;background:${dark?DARK.blue:LIGHT.blue};cursor:pointer;border:3px solid ${dark?DARK.bg1:LIGHT.bg1};}
        ::-webkit-scrollbar{width:3px;}
        ::-webkit-scrollbar-thumb{background:${dark?DARK.border:LIGHT.border};border-radius:4px;}
      `}</style>
      <NavBar page={page} setPage={navigate} dark={dark} setDark={setDark}/>
      {page==="home"&&<LandingPage setPage={navigate} live={live} dark={dark}/>}
      {page==="dashboard"&&<DashboardPage live={live} weekly={weekly} monthly={monthly} loading={loading} error={error} dark={dark}/>}
      {page==="survey"&&<SurveyPage dark={dark}/>}
    </div>
  );
}
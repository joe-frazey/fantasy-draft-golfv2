import React, { useEffect, useMemo, useRef, useState } from "react";

// ===== utils =====
const g = (o, p, d) => p.split(".").reduce((x, k) => (x && x[k] !== undefined ? x[k] : d), o);
const nk = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
const lbl = (n) => (n === 0 ? "E" : n > 0 ? `+${n}` : String(n));
const pPar = (v) => { const s = String(v ?? "").trim().toUpperCase(); if (s === "" || s === "E") return 0; const m = s.match(/^[+-]?\d+/); return m ? parseInt(m[0], 10) : Number.POSITIVE_INFINITY; };
const looksTime = (s) => /\d{1,2}:\d{2}\s*(AM|PM)/i.test(String(s||""));
const teeFrom = (s) => { const m = String(s||"").toUpperCase().match(/(\d{1,2}:\d{2}\s*(AM|PM))/); return m ? m[1].replace(/\s+/g,' ') : String(s||""); };
const statusFor = (p) => { const t = String(p?.thru||"").trim(); const fin = t.toUpperCase()==="F" || (/^\d+$/.test(t) && +t>=18) || (p?.r4 && String(p.r4).trim()); if (fin) return "FINISHED"; return /^\d+$/.test(t) ? `THRU ${t}` : ""; };
const todayVal = (p) => {
  const r = String(p?.today || "").trim().toUpperCase();
  if (!r || looksTime(r)) return null;
  // Treat anything starting with E (E, E THRU 15, etc.) as even par today
  if (r.startsWith("E")) return 0;
  // Only accept explicitly signed numbers (avoid grabbing digits from R3, THRU 15, T22, etc.)
  const m = r.match(/[+-]\d+/);
  return m ? parseInt(m[0], 10) : null;
};
const roundToPar = (v) => { const n = pPar(v); return Number.isFinite(n) ? n : 0; };
const totalFromRounds = (p) => { if (!p) return Number.POSITIVE_INFINITY; const A=[p.r1,p.r2,p.r3,p.r4]; if (A.every(x=>!String(x||"").trim())) return Number.POSITIVE_INFINITY; return A.map(roundToPar).reduce((a,b)=>a+b,0); };

// shared UI helpers
const StatusNode = ({p}) => { const td=String(p?.today||"").trim(), th=String(p?.thru||"").trim(); if(looksTime(td)||looksTime(th)) return (
  <span className="inline-flex items-center gap-1 whitespace-nowrap px-2 py-0.5 rounded-full text-xs font-semibold bg-sky-500/15 text-sky-300 border border-sky-700/40">
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 align-[-2px]"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
    {teeFrom(td||th)}
  </span>
); const lab=statusFor(p); return lab? <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap ${lab.toUpperCase().includes('FIN')? 'bg-emerald-600/15 text-emerald-300 border border-emerald-700/40':'bg-indigo-500/15 text-indigo-300 border border-indigo-700/40'}`}>{lab}</span> : <span className="text-slate-400 text-xs">—</span>; };

// ===== UI: Score badge =====
const ScoreBadge = ({ value }) => {
  const n = Number.isFinite(value) ? value : pPar(value);
  const lab = Number.isFinite(n) ? lbl(n) : String(value ?? '—');
  const cls = Number.isFinite(n)
    ? (n < 0
        ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-700/40'
        : n > 0
          ? 'bg-rose-500/15 text-rose-300 border border-rose-700/40'
          : 'bg-slate-500/20 text-slate-200 border border-slate-500/30')
    : 'bg-slate-700/40 text-slate-300 border border-slate-700';
  return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>{lab}</span>;
};

// ===== data =====
const ENDPOINTS = [
  "https://site.web.api.espn.com/apis/site/v2/sports/golf/leaderboard?league=pga",
  "https://site.api.espn.com/apis/site/v2/sports/golf/pga/scoreboard",
];
const TEAMS = {
  MJC:["Tommy Fleetwood","Russell Henley"], Blanch:["Rory McIlroy","J.J. Spaun"], Wales:["Sungjae Im","Harris English"],
  Pannell:["Justin Thomas","Cameron Young"], Tim:["Collin Morikawa","Sam Burns"], Burton:["Patrick Cantlay","Corey Conners"],
  Ryan:["Robert MacIntyre","Keegan Bradley"], Frazey:["Ben Griffin","Maverick McNealy"], Carl:["Hideki Matsuyama","Akshay Bhatia"],
  Blake:["Shane Lowry","Ludvig Aberg"], Goldy:["Justin Rose","Sepp Straka"], Kamp:["Viktor Hovland","Brian Harman"],
};
const findTeamOf = (name)=>{const id=nk(name); for (const [t,[a,b]] of Object.entries(TEAMS)) if (nk(a)===id||nk(b)===id) return t; return null; };

// ===== hooks =====
function useInterval(cb, delay, enabled) { const ref=useRef(()=>{}); useEffect(()=>{ref.current=cb;},[cb]); useEffect(()=>{ if(!enabled||delay==null) return; const id=setInterval(()=>ref.current(),delay); return()=>clearInterval(id);},[delay,enabled]); }

// ===== normalizers =====
function normL(js){ const e=g(js,"leaderboard.players")||g(js,"athletes")||g(js,"players")||[]; if(!e?.length) return null; return e.map((p,i)=>{ const name=g(p,"athlete.displayName")||g(p,"displayName")||g(p,"name")||g(p,"athlete.shortName")||""; const pos=g(p,"position.displayValue")||g(p,"status.position.displayValue")||g(p,"rank.displayValue")||g(p,"pos")||""; const to=g(p,"score.displayValue")||g(p,"totalToPar.displayValue")||g(p,"score")||g(p,"toPar")||""; const today=g(p,"today.displayValue")||g(p,"today")||""; const thru=g(p,"thru.displayValue")||g(p,"thru")||""; const lines=g(p,"linescores")||g(p,"rounds")||[]; const r=[0,1,2,3].map(ii=>{const v=g(lines[ii]||{},"displayValue")??g(lines[ii]||{},"value"); return typeof v==="number"?String(v):v||""}); const tot=r.map(x=>(+x||0)).reduce((a,b)=>a+b,0); return {key:`L-${i}-${name}`,position:pos,name,toPar:to,today,thru,r1:r[0],r2:r[1],r3:r[2],r4:r[3],total:tot>0?String(tot):""}; }); }
function normS(js){ const comp=g(js,"events.0.competitions.0"), players=g(comp,"competitors")||[]; if(!players?.length) return null; return players.map((c,i)=>{ const name=g(c,"athlete.displayName")||g(c,"athlete.shortName")||g(c,"displayName")||g(c,"name")||""; const pos=g(c,"status.position.displayValue")||g(c,"curatedRank.current")||g(c,"rank.current")||g(c,"pos")||""; const to=g(c,"score.displayValue")||g(c,"score")||g(c,"status.displayValue")||""; const detail=g(c,"status.detail")||g(c,"today.displayValue")||""; const hole=g(c,"thru.displayValue")||g(c,"status.hole")||""; let thru=hole; const up=String(detail).toUpperCase(); if(!hole && (up.includes("AM")||up.includes("PM")) && up.includes(":")) thru=detail; const lines=g(c,"linescores")||[]; const r=[0,1,2,3].map(ii=>{const v=g(lines[ii]||{},"displayValue")??g(lines[ii]||{},"value"); return typeof v==="number"?String(v):v||""}); const tot=r.map(x=>(+x||0)).reduce((a,b)=>a+b,0); return {key:`S-${i}-${name}`,position:typeof pos==="number"?`T${pos}`:String(pos),name,toPar:typeof to==="number"?(to>0?`+${to}`:`${to}`):String(to),today:detail,thru:String(thru),r1:r[0],r2:r[1],r3:r[2],r4:r[3],total:tot>0?String(tot):""}; }); }

// ===== app =====
export default function App(){
  const [rows,setRows]=useState([]),[err,setErr]=useState(""),[ts,setTs]=useState(null),[auto,setAuto]=useState(true),[ms,setMs]=useState(30000);
  const prev=useRef({}),[blip,setBlip]=useState({}),[ticker,setTicker]=useState([]),[tickerKey,setTickerKey]=useState(0);
  const [compact,setCompact]=useState(()=>{try{return JSON.parse(localStorage.getItem("compact")||"false");}catch{return false;}});
  const [w,setW]=useState(typeof window!=='undefined'?window.innerWidth:1200),isCompact=compact||w<900;
  const [announceStack,setAnnounceStack]=useState([]),announceTimers=useRef(new Map());
  const [muted,setMuted]=useState(()=>{try{return JSON.parse(localStorage.getItem("muted")||"false");}catch{return false;}}),audioCtxRef=useRef(null),lastSoundRef=useRef(0);
  const blipColor=(n,f)=>blip[nk(n)+":"+f]||null; const blipStyle=(n,f)=>{const c=blipColor(n,f); if(!c) return; return {animation:`${c==='green'?'blip-green':'blip-red'} 1200ms ease-out`}};

  // sounds
  const ensureAudio=async()=>{try{const AC=window.AudioContext||window.webkitAudioContext; if(!AC) return null; if(!audioCtxRef.current) audioCtxRef.current=new AC(); if(audioCtxRef.current.state==='suspended') await audioCtxRef.current.resume(); return audioCtxRef.current;}catch{return null;}};
  const playSfx=async(kind)=>{ if(muted) return; const ctx=await ensureAudio(); if(!ctx) return; const now=Date.now(); if(now-(lastSoundRef.current||0)<100){} else lastSoundRef.current=now; const play=(f,t,d,type='sine',g=0.05)=>{const o=ctx.createOscillator();o.type=type;o.frequency.setValueAtTime(f,t);const gg=ctx.createGain();gg.gain.setValueAtTime(0.0001,t);gg.gain.exponentialRampToValueAtTime(g,t+0.02);gg.gain.exponentialRampToValueAtTime(0.0001,t+d);o.connect(gg).connect(ctx.destination);o.start(t);o.stop(t+d);}; const t0=ctx.currentTime+0.01; ({birdie:[523.25,659.25,783.99],eagle:[392.0,523.25,659.25,783.99],bogey:[196.0,164.81],double:[233.08,196.0,174.61],finish:[659.25,987.77],tee:[739.99]})[kind]?.forEach((f,i)=>play(f,t0+0.06*i,kind==='eagle'?0.8:kind==='tee'?0.25:0.6,kind==='bogey'?'sawtooth':kind==='double'?'square':kind==='eagle'?'triangle':'sine',0.055)); };

  const fetchData=async()=>{
    setErr("");
    try{
      const results=await Promise.allSettled(ENDPOINTS.map(u=>fetch(u,{headers:{Accept:"application/json"}}).then(r=>{if(!r.ok) throw new Error('bad'); return r.json();})));
      const datasets=[]; for (const r of results) if(r.status==='fulfilled'){ const d=normL(r.value)||normS(r.value); if(d?.length) datasets.push(d); }
      if(!datasets.length) throw new Error('no data');
      const choose=(a,b)=>{ if(!a) return b; if(!b) return a; const aF=(statusFor(a)||"").includes('FIN'), bF=(statusFor(b)||"").includes('FIN'); if(aF!==bF) return aF?a:b; const n=(x)=>(/^\d+$/.test(String(x.thru||""))?+x.thru:-1); if(n(a)!==n(b)) return n(a)>n(b)?a:b; const k=nk(a.name||b.name||""),p=prev.current[k]; if(p){ const pTo=pPar(p.toPar),pTv=todayVal(p),aTv=todayVal(a),bTv=todayVal(b),aTo=pPar(a.toPar),bTo=pPar(b.toPar); const fit=(to,tv)=>([pTo,pTv,tv,to].every(Number.isFinite))?Math.abs(to-(pTo+(tv-pTv))):99; const fA=fit(aTo,aTv),fB=fit(bTo,bTv); if(fA!==fB) return fA<fB?a:b; } const cnt=x=>[x.r1,x.r2,x.r3,x.r4].filter(Boolean).length; if(cnt(a)!==cnt(b)) return cnt(a)>cnt(b)?a:b; return a; };
      const map=new Map(); for(const ds of datasets){ for(const row of ds){ const k=nk(row.name); map.set(k,choose(map.get(k),row)); }}
      let data=[...map.values()].sort((a,b)=>{ const pa=(String(a.position).match(/\d+/)||[9999])[0], pb=(String(b.position).match(/\d+/)||[9999])[0]; if(pa!=pb) return pa-pb; const na=+(String(a.toPar).replace('E','0')), nb=+(String(b.toPar).replace('E','0')); return (isNaN(na)?0:na)-(isNaN(nb)?0:nb); });

      const nbp={}, msgs=[], bigs=[], nextPrev=prev.current||{};
      for (const r0 of data){ const k=nk(r0.name), p0=nextPrev[k]; if(p0){ const o=pPar(p0.toPar), n=pPar(r0.toPar); if(Number.isFinite(o)&&Number.isFinite(n)&&o!==n) nbp[`${k}:toPar`]=n<o?'green':'red'; const os=statusFor(p0), ns=statusFor(r0), ot=todayVal(p0), nt=todayVal(r0); if(Number.isFinite(ot)&&Number.isFinite(nt)&&ot!==nt){ nbp[`${k}:today`]=nt<ot?'green':'red'; const d=nt-ot; let text=null, kind=null; if(d<=-2){text=`🦅 ${r0.name} eagle — Today ${lbl(nt)}`; kind='eagle';} else if(d===-1){text=`🐦 ${r0.name} birdie — Today ${lbl(nt)}`; kind='birdie';} else if(d===1){text=`☁️ ${r0.name} bogey — Today ${lbl(nt)}`; kind='bogey';} else if(d>=2){text=`💥 ${r0.name} double — Today ${lbl(nt)}`; kind='double';} if(text){ msgs.push({id:`${Date.now()}-${k}-t`,text}); bigs.push({id:`${Date.now()}-${k}-b`,kind,player:r0.name,today:nt,team:findTeamOf(r0.name)}); playSfx(kind); } }
        if(os!==ns){ if((ns||"").toUpperCase().includes('FIN')){ msgs.push({id:`${Date.now()}-${k}-f`,text:`🏁 ${r0.name} finished (${r0.toPar||'E'})`}); playSfx('finish'); }
          const wasT=looksTime(p0.today), nowT=looksTime(r0.today); if(!wasT&&nowT){ msgs.push({id:`${Date.now()}-${k}-tee`,text:`🕒 ${r0.name} tees off ${teeFrom(r0.today)}`}); playSfx('tee'); } }
      } nextPrev[k]={toPar:r0.toPar,thru:r0.thru,today:r0.today}; }
      if(msgs.length) setTicker(prev=>{ const seen=new Set(prev.map(m=>m.text)); const uniq=[]; for(const m of msgs) if(!seen.has(m.text)){ uniq.push(m); seen.add(m.text);} const next=[...uniq.reverse(),...prev]; return next.slice(0,10); });
      if(bigs.length) bigs.forEach(pushAnnounce);
      prev.current=nextPrev; setBlip(nbp); if(Object.keys(nbp).length) setTimeout(()=>setBlip({}),1200);
      setRows(data); setTs(new Date());
    }catch{ setErr("Couldn't load leaderboard from ESPN endpoints. Try again shortly."); }
  };

  useEffect(()=>{fetchData();},[]); useInterval(()=>fetchData(),ms,auto);
  const tsText=useMemo(()=> ts? ts.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit",second:"2-digit"}):"—",[ts]);
  useEffect(()=>{try{localStorage.setItem("compact",JSON.stringify(compact));}catch{}},[compact]);
  useEffect(()=>{try{localStorage.setItem("muted",JSON.stringify(muted));}catch{}},[muted]);
  useEffect(()=>{ const on=()=>setW(window.innerWidth); window.addEventListener('resize',on); return()=>window.removeEventListener('resize',on); },[]);
  useEffect(()=>{ const resume=async()=>{ if(muted) return; try{await ensureAudio();}catch{}}; window.addEventListener('pointerdown',resume); return()=>window.removeEventListener('pointerdown',resume); },[muted]);

  // announcements (stacked, 10s, dismissable)
  const removeAnnounce=(id)=>{ setAnnounceStack(p=>p.filter(x=>x.id!==id)); const m=announceTimers.current; if(m?.has(id)){ clearTimeout(m.get(id)); m.delete(id);} };
  const clearAllAnnouncements=()=>{ setAnnounceStack([]); for(const t of announceTimers.current.values()) clearTimeout(t); announceTimers.current.clear(); };
  function pushAnnounce(item){ const now=Date.now(), top={...item, ttl:10000, animKey:now}; setAnnounceStack(prev=>{ const upd=prev.map((o,i)=>({...o,ttl:12000,animKey:now+i+1})); const next=[top,...upd].slice(0,5); if(announceTimers.current.has(top.id)) clearTimeout(announceTimers.current.get(top.id)); announceTimers.current.set(top.id,setTimeout(()=>removeAnnounce(top.id),top.ttl)); for(const o of upd){ if(announceTimers.current.has(o.id)) clearTimeout(announceTimers.current.get(o.id)); announceTimers.current.set(o.id,setTimeout(()=>removeAnnounce(o.id),o.ttl)); } return next; }); }
  useEffect(()=>()=>{ for(const t of announceTimers.current.values()) clearTimeout(t); announceTimers.current.clear(); },[]);
  useEffect(()=>{ const on=(e)=>{ if(e.key==='Escape') clearAllAnnouncements(); }; window.addEventListener('keydown',on); return()=>window.removeEventListener('keydown',on); },[]);

  const findBy=(name)=>{ const id=nk(name); for(const r of rows) if(nk(r.name)===id) return r; return null; };
  const teams=useMemo(()=>{ const L=[]; for(const [t,[g1,g2]] of Object.entries(TEAMS)){ const p1=findBy(g1)||{name:g1}, p2=findBy(g2)||{name:g2}; const s1=totalFromRounds(p1), s2=totalFromRounds(p2), sum=(Number.isFinite(s1)&&Number.isFinite(s2))?s1+s2:Number.POSITIVE_INFINITY; L.push({team:t,p1:{...p1},p2:{...p2},sum}); } L.sort((a,b)=>a.sum-b.sum); let last=null,base=0; return L.map((t,i)=>{ if(i===0){last=t.sum;base=1;t.pos="1";} else if(t.sum===last){t.pos="T"+base;} else {last=t.sum;base=i+1;t.pos=String(i+1);} return t; }); },[rows]);

  const rowsFull=useMemo(()=>teams.map((t,i)=> (
    <tr key={t.team} className={(i%2?"bg-slate-900/40":"bg-slate-900/20")+( (blipColor(t.p1.name,'toPar')==='red'||blipColor(t.p1.name,'today')==='red'||blipColor(t.p2.name,'toPar')==='red'||blipColor(t.p2.name,'today')==='red')?" rowPulseRed": (blipColor(t.p1.name,'toPar')==='green'||blipColor(t.p1.name,'today')==='green'||blipColor(t.p2.name,'toPar')==='green'||blipColor(t.p2.name,'today')==='green')?" rowPulseGreen":"") }>
      <td className="px-3 py-2 whitespace-nowrap sticky left-0 bg-inherit"><span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold border ${t.pos==="1"?"bg-amber-400/20 text-amber-300 border-amber-500/40":t.pos==="2"?"bg-slate-300/20 text-slate-200 border-slate-400/40":t.pos==="3"?"bg-orange-400/20 text-orange-300 border-orange-500/40":"bg-slate-700/40 text-slate-300 border-slate-700"}`}>{t.pos}</span></td>
      <td className="px-3 py-2 font-semibold whitespace-nowrap sticky left-12 bg-inherit">{t.team}</td>
      {/* G1 */}
      <td className="px-3 py-2 whitespace-nowrap"><span className="hover:text-sky-300 nameClip">{t.p1.name}</span></td>
      <td className={`px-3 py-2 ${blipColor(t.p1.name,'toPar')?'flipScore':''}`} style={blipStyle(t.p1.name,'toPar')}><span className="score-badge"><ScoreBadge value={totalFromRounds(t.p1)} /></span></td>
      <td className="px-3 py-2" style={blipStyle(t.p1.name,'today')}>
        <div className="relative inline-block">
          <ScoreBadge value={todayVal(t.p1) ?? "—"} />
          {blipColor(t.p1.name,'today')==='green' && (<span className="cele cele-birdie">🎉</span>)}
          {blipColor(t.p1.name,'today')==='red' && (<span className="cele cele-bogey">☁️</span>)}
        </div>
      </td>
      <td className="px-3 py-2 whitespace-nowrap"><div className="wStatus text-right"><div className="wStatus text-right"><StatusNode p={t.p1}/></div></div></td>
      {/* G2 */}
      <td className="px-3 py-2 whitespace-nowrap"><span className="hover:text-sky-300 nameClip">{t.p2.name}</span></td>
      <td className={`px-3 py-2 ${blipColor(t.p2.name,'toPar')?'flipScore':''}`} style={blipStyle(t.p2.name,'toPar')}><span className="score-badge"><ScoreBadge value={totalFromRounds(t.p2)} /></span></td>
      <td className="px-3 py-2" style={blipStyle(t.p2.name,'today')}>
        <div className="relative inline-block">
          <ScoreBadge value={todayVal(t.p2) ?? "—"} />
          {blipColor(t.p2.name,'today')==='green' && (<span className="cele cele-birdie">🎉</span>)}
          {blipColor(t.p2.name,'today')==='red' && (<span className="cele cele-bogey">☁️</span>)}
        </div>
      </td>
      <td className="px-3 py-2 whitespace-nowrap"><div className="wStatus text-right"><div className="wStatus text-right"><StatusNode p={t.p2}/></div></div></td>
      <td className="px-3 py-2 font-semibold"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${Number.isFinite(t.sum)? (t.sum<0? 'bg-emerald-500/15 text-emerald-300 border border-emerald-700/40': t.sum>0? 'bg-rose-500/15 text-rose-300 border border-rose-700/40':'bg-slate-500/20 text-slate-200 border border-slate-500/30') : 'bg-slate-700/40 text-slate-300 border border-slate-700'}`}>{Number.isFinite(t.sum)?lbl(t.sum):'—'}</span></td>
    </tr>
  )),[teams,blip]);

  const rowsCompact=useMemo(()=>teams.map((t,i)=> (
    <tr key={t.team+"-c"} className={(i%2?"bg-slate-900/40":"bg-slate-900/20")+( (blipColor(t.p1.name,'toPar')==='red'||blipColor(t.p1.name,'today')==='red'||blipColor(t.p2.name,'toPar')==='red'||blipColor(t.p2.name,'today')==='red')?" rowPulseRed": (blipColor(t.p1.name,'toPar')==='green'||blipColor(t.p1.name,'today')==='green'||blipColor(t.p2.name,'toPar')==='green'||blipColor(t.p2.name,'today')==='green')?" rowPulseGreen":"") }>
      <td className="px-3 py-2 whitespace-nowrap sticky left-0 bg-inherit"><span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold border ${t.pos==="1"?"bg-amber-400/20 text-amber-300 border-amber-500/40":t.pos==="2"?"bg-slate-300/20 text-slate-200 border-slate-400/40":t.pos==="3"?"bg-orange-400/20 text-orange-300 border-orange-500/40":"bg-slate-700/40 text-slate-300 border-slate-700"}`}>{t.pos}</span></td>
      <td className="px-3 py-2 font-semibold whitespace-nowrap sticky left-12 bg-inherit">{t.team}</td>
      {/* Stacked players in one column */}
      <td className="px-3 py-1 playersColumn">
        <div className="flex flex-col gap-0.5">
          {/* Golfer 1 */}
          <div className="flex items-center justify-between gap-2 leading-tight" style={blipStyle(t.p1.name,'toPar')}>
            <span className="nameClip hover:text-sky-300">{t.p1.name}</span>
            <div className="flex items-center gap-2 metrics">
              <span className={`wScore ${blipColor(t.p1.name,'toPar')?'flipScore':''}`}><ScoreBadge value={totalFromRounds(t.p1)} /></span>
              <span className="wToday" style={blipStyle(t.p1.name,'today')}><ScoreBadge value={todayVal(t.p1) ?? '—'} /></span>
              <StatusNode p={t.p1}/>
            </div>
          </div>
          {/* Golfer 2 */}
          <div className="flex items-center justify-between gap-2 leading-tight" style={blipStyle(t.p2.name,'toPar')}>
            <span className="nameClip hover:text-sky-300">{t.p2.name}</span>
            <div className="flex items-center gap-2 metrics">
              <span className={`wScore ${blipColor(t.p2.name,'toPar')?'flipScore':''}`}><ScoreBadge value={totalFromRounds(t.p2)} /></span>
              <span className="wToday" style={blipStyle(t.p2.name,'today')}><ScoreBadge value={todayVal(t.p2) ?? '—'} /></span>
              <StatusNode p={t.p2}/>
            </div>
          </div>
        </div>
      </td>
      {/* Team total in its own tight column */}
      <td className="px-3 py-2 font-semibold whitespace-nowrap text-right w-px"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${Number.isFinite(t.sum)? (t.sum<0? 'bg-emerald-500/15 text-emerald-300 border border-emerald-700/40': t.sum>0? 'bg-rose-500/15 text-rose-300 border border-rose-700/40':'bg-slate-500/20 text-slate-200 border border-slate-500/30') : 'bg-slate-700/40 text-slate-300 border-slate-700'}`}>{Number.isFinite(t.sum)?lbl(t.sum):'—'}</span></td>
    </tr>
  )),[teams,blip]);

  const tickerText=useMemo(()=> (ticker.length? ticker.map(m=>m.text).join("   •   ") : "Updates will appear here as play begins."),[ticker]);
  useEffect(()=>{ setTickerKey(k=>k+1); },[tickerText]);

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 p-6">
      <div className={`mx-auto max-w-6xl mainWrap ${announceStack.length? 'blurActive':''}`}>
        <style>{`
          @keyframes blip-green{from{background-color:rgba(16,185,129,.25)}to{background:transparent}}@keyframes blip-red{from{background-color:rgba(244,63,94,.25)}to{background:transparent}}
          @keyframes flipY{0%{transform:perspective(600px) rotateX(0)}45%{transform:perspective(600px) rotateX(180deg)}100%{transform:perspective(600px) rotateX(0)}} .flipScore .score-badge{display:inline-block;animation:flipY .32s ease-out}
          @keyframes rowPulseGreen{0%{background:rgba(16,185,129,.08)}100%{background:transparent}}@keyframes rowPulseRed{0%{background:rgba(244,63,94,.08)}100%{background:transparent}} .rowPulseGreen{animation:rowPulseGreen .9s ease-out}.rowPulseRed{animation:rowPulseRed .9s ease-out}
          .cele{position:absolute;left:50%;transform:translateX(-50%);pointer-events:none}@keyframes celeBirdie{0%{opacity:0;transform:translate(-50%,4px) scale(.9)}30%{opacity:1;transform:translate(-50%,-6px) scale(1.1)}100%{opacity:0;transform:translate(-50%,-16px) scale(1)}}@keyframes celeBogey{0%{opacity:0;transform:translate(-50%,0) scale(1)}20%{opacity:.9}100%{opacity:0;transform:translate(-50%,-10px) scale(.95)}} .cele-birdie{animation:celeBirdie .9s ease-out}.cele-bogey{animation:celeBogey .9s ease-out}
          .tickerShell{position:sticky;bottom:0}.tickerBar{background:rgba(2,6,23,.9);border-top:1px solid rgba(30,41,59,.7)}.tickerViewport{overflow:hidden;height:40px}.tickerTrack{display:inline-block;white-space:nowrap;padding-right:3rem}@keyframes tickerMove{from{transform:translateX(100%)}to{transform:translateX(-100%)}}.tickerAnim{display:inline-block;white-space:nowrap;will-change:transform;animation:tickerMove 35s linear 1 both}.tickerPause:hover .tickerAnim{animation-play-state:paused}
          .mainWrap{transition:filter .22s ease}.blurActive{filter:blur(5px) brightness(.9)}.announceOverlay{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:auto;z-index:60}.announceStack{display:flex;flex-direction:column;gap:12px;align-items:center}
          .announce{position:relative;--c:56,189,248;color:#e2e8f0;padding:28px 36px;border-radius:24px;border:1px solid rgba(var(--c),.6);box-shadow:0 10px 40px rgba(var(--c),.35),inset 0 0 60px rgba(var(--c),.08);background:radial-gradient(60% 60% at 50% 50%,rgba(var(--c),.22),rgba(2,6,23,.95) 70%);animation:announcePop .3s cubic-bezier(.2,.8,.2,1),announceFade var(--fadeDur,9700ms) ease-out .3s forwards;backdrop-filter:blur(1px) saturate(120%)}
          .announce .big{font-size:clamp(36px,6vw,84px);font-weight:900;letter-spacing:.02em;text-shadow:0 2px 0 rgba(0,0,0,.3),0 0 24px rgba(var(--c),.5);line-height:1}.announce .small{margin-top:6px;font-size:clamp(14px,2.2vw,20px);opacity:.95}.announce .emoji{font-size:clamp(48px,8vw,96px);margin-right:14px;filter:drop-shadow(0 6px 10px rgba(0,0,0,.5));animation:wobble .9s ease-out}
          @keyframes announcePop{0%{transform:scale(.7);opacity:0}40%{transform:scale(1.06);opacity:1}100%{transform:scale(1);opacity:1}}@keyframes announceFade{to{opacity:0}}@keyframes wobble{0%{transform:rotate(-10deg) scale(.9)}50%{transform:rotate(8deg) scale(1.05)}100%{transform:rotate(0) scale(1)}}.announce.birdie{--c:16,185,129}.announce.eagle{--c:234,179,8}.announce.bogey{--c:244,63,94}.announce.double{--c:220,38,38}
          .announce .progressWrap{margin-top:10px;height:4px;border-radius:9999px;background:rgba(148,163,184,.25);overflow:hidden}.announce .progressBar{height:100%;background:rgba(var(--c),.85);transform-origin:left;animation:progressShrink linear forwards}@keyframes progressShrink{from{transform:scaleX(1)}to{transform:scaleX(0)}}
          .announce .closeBtn{position:absolute;top:8px;right:10px;width:28px;height:28px;border-radius:9999px;border:1px solid rgba(148,163,184,.35);background:rgba(2,6,23,.6);color:#e2e8f0;font-size:18px;line-height:24px;display:grid;place-items:center;cursor:pointer}.announce .closeBtn:hover{background:rgba(2,6,23,.8)}
          @media (max-width:640px){ .nameClip{max-width:110px;display:inline-block;overflow:hidden;text-overflow:ellipsis;vertical-align:bottom} table.min-w-full th, table.min-w-full td{padding:6px 8px;font-size:12px} .tickerViewport{height:36px} .tickerAnim{animation-duration:28s} .mainWrap{padding-bottom:48px} th.sticky.left-12, td.sticky.left-12{position:static!important;left:auto!important} }
          .scrollMask{-webkit-mask-image:linear-gradient(to right,transparent 0,black 16px,black calc(100% - 16px),transparent 100%);mask-image:linear-gradient(to right,transparent 0,black 16px,black calc(100% - 16px),transparent 100%);overscroll-behavior-x:contain}
          /* compact table tightening */
          .tbl-compact th, .tbl-compact td{padding:6px 8px}
          .tbl-compact thead th{padding-top:8px;padding-bottom:8px}
          .tbl-compact .playersColumn{padding-top:4px;padding-bottom:4px}
          .tbl-compact .nameClip{max-width:180px}
          .tbl-compact .playersColumn .flex{gap:6px}
          /* compact column titles + fixed widths to align with badges */
          .tbl-compact .compactHead{display:flex;justify-content:space-between;align-items:center}
          .tbl-compact .compactHead .labels{display:flex;gap:10px;color:#94a3b8;font-size:11px}
          .tbl-compact .wScore,.tbl-compact .wScoreLabel{width:46px;text-align:right;display:inline-flex;justify-content:flex-end}
          .tbl-compact .wToday,.tbl-compact .wTodayLabel{width:46px;text-align:right;display:inline-flex;justify-content:flex-end}
          .tbl-compact .wStatus,.tbl-compact .wStatusLabel{width:76px;text-align:right;display:inline-flex;justify-content:flex-end;white-space:nowrap}
        `}</style>

        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-6">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-teal-300 to-sky-400">Fantasy Draft Order — Live</h1>
            <p className="text-sm text-slate-400">Powered by ESPN • Last updated: {tsText}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={fetchData} className="px-4 py-2 rounded-2xl shadow-sm border border-slate-700 bg-slate-900 hover:bg-slate-800 active:scale-[.98]" aria-label="Refresh">⟳ Refresh</button>
            <div className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-slate-900 border border-slate-700 shadow-sm">
              <span className="text-xs uppercase tracking-wide text-slate-400">Auto</span>
              <button onClick={()=>setAuto(v=>!v)} className={`px-3 py-1 rounded-xl text-sm font-medium border ${auto?"bg-emerald-600/20 text-emerald-300 border-emerald-700/40":"bg-slate-800 text-slate-300 border-slate-700"}`}>{auto?"On":"Off"}</button>
              <select value={ms} onChange={(e)=>setMs(+e.target.value)} className="ml-2 text-sm border border-slate-700 rounded-xl px-2 py-1 bg-slate-900 text-slate-200" aria-label="Interval"><option value={15000}>15s</option><option value={30000}>30s</option><option value={60000}>60s</option><option value={120000}>2m</option></select>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-slate-900 border border-slate-700 shadow-sm">
              <span className="text-xs uppercase tracking-wide text-slate-400">View</span>
              <button onClick={()=>setCompact(v=>!v)} className={`px-3 py-1 rounded-xl text-sm font-medium border ${(compact||w<900)?"bg-sky-600/20 text-sky-300 border-sky-700/40":"bg-slate-800 text-slate-300 border-slate-700"}`}>{(compact||w<900)?"Compact":"Full"}</button>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-slate-900 border border-slate-700 shadow-sm">
              <span className="text-xs uppercase tracking-wide text-slate-400">Sound</span>
              <button onClick={()=>setMuted(m=>!m)} className={`px-3 py-1 rounded-xl text-sm font-medium border ${!muted?"bg-emerald-600/20 text-emerald-300 border-emerald-700/40":"bg-slate-800 text-slate-300 border-slate-700"}`}>{muted?"Muted 🔇":"On 🔊"}</button>
            </div>
          </div>
        </header>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-sm mb-6">
          <div className="px-4 py-3 text-sm font-semibold text-slate-300 bg-slate-800/70 border-b border-slate-800">Live Leaderboard — Lowest sum wins</div>
          <div className="overflow-auto scrollMask">
            <table className={"min-w-full text-sm "+(isCompact?"tbl-compact":"")}>
              <thead className="bg-slate-800/50">
                {isCompact ? (
                  <tr className="text-left text-slate-300">
                    <th className="px-3 py-2 sticky left-0 bg-slate-800/50">Pos</th>
                    <th className="px-3 py-2 sticky left-12 bg-slate-800/50">Team</th>
                    <th className="px-3 py-2">
                    <div className="compactHead">
                      <span>Players</span>
                      <div className="labels">
                        <span className="wScoreLabel">Score</span>
                        <span className="wTodayLabel">Today</span>
                        <span className="wStatusLabel">Status</span>
                      </div>
                    </div>
                    </th>
                    <th className="px-3 py-2">Team</th>
                  </tr>
                ) : (
                  <tr className="text-left text-slate-300">
                    <th className="px-3 py-2 sticky left-0 bg-slate-800/50">Pos</th>
                    <th className="px-3 py-2 sticky left-12 bg-slate-800/50">Team</th>
                    <th className="px-3 py-2">Golfer 1</th>
                    <th className="px-3 py-2">Score</th>
                    <th className="px-3 py-2">Today</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Golfer 2</th>
                    <th className="px-3 py-2">Score</th>
                    <th className="px-3 py-2">Today</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Team</th>
                  </tr>
                )}
              </thead>
              <tbody>{isCompact ? rowsCompact : rowsFull}</tbody>
            </table>
          </div>
        </div>

        {err && (<div className="text-rose-300/90 text-sm px-4 py-3 border border-rose-900/40 bg-rose-950/30 rounded-xl">{err}</div>)}

        <footer className="tickerShell mt-4">
          <div className="tickerBar rounded-t-xl px-4 py-2 tickerPause">
            <div className="tickerViewport"><div key={tickerKey} className="tickerAnim"><span className="tickerTrack text-slate-300">{tickerText}</span></div></div>
            <div className="text-[10px] text-slate-500 mt-1">Hover to pause · Newest first</div>
          </div>
        </footer>
      </div>

      {announceStack.length>0 && (
        <div className="announceOverlay" onClick={clearAllAnnouncements} role="presentation">
          <div className="announceStack" onClick={(e)=>e.stopPropagation()}>
            {announceStack.map(a=> (
              <div key={a.id+'-'+(a.animKey||0)} className={`announce ${a.kind}`} style={{['--fadeDur']:`${(a.ttl||10000)-300}ms`}}>
                <button className="closeBtn" onClick={()=>removeAnnounce(a.id)} aria-label="Dismiss">×</button>
                <div className="progressWrap"><div className="progressBar" style={{animationDuration:(a.ttl||10000)+'ms'}}/></div>
                <div style={{display:'flex',alignItems:'center',gap:12}}>
                  <div className="emoji">{a.kind==='eagle'?'🦅':a.kind==='birdie'?'🐦':a.kind==='double'?'💥':'☁️'}</div>
                  <div>
                    <div className="big">{a.kind==='eagle'?'EAGLE!':a.kind==='birdie'?'BIRDIE!':a.kind==='double'?'DOUBLE!':'BOGEY!'}</div>
                    <div className="small">{a.player} · Today {lbl(a.today)}{a.team?` · ${a.team}`:''}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ===== self-tests =====
(function(){try{ if(typeof window!=="undefined"&&!window.__fantasyLeaderboardTestsRan){ window.__fantasyLeaderboardTestsRan=true; const T=[
  ["pPar('E')===0", pPar('E')===0], ["pPar('-7')===-7", pPar('-7')===-7], ["pPar('+3')===3", pPar('+3')===3], ["lbl(0)=='E'", lbl(0)==='E'], ["lbl(5)=='+5'", lbl(5)==='+5'],
  ["looksTime('3:05 PM')", looksTime('3:05 PM')===true], ["looksTime('10:00 am')", looksTime('10:00 am')===true], ["teeFrom('Tee 3:10 PM')", teeFrom('Tee 3:10 PM').includes('3:10')], ["statusFor F", statusFor({thru:'F'})==='FINISHED'],
  ["todayVal +2", todayVal({today:'+2'})===2], ["todayVal E", todayVal({today:'E'})===0], ["todayVal 'E THRU 15' == 0", todayVal({today:'E THRU 15'})===0], ["todayVal 'R3: +2 (T22)' == 2", todayVal({today:'R3: +2 (T22)'})===2], ["totalFromRounds == +3", totalFromRounds({r1:'-1',r2:'-1',r3:'+5',r4:''})===3], ["sumLabel 1", totalFromRounds({r1:'-1',r2:'E',r3:'+2',r4:''})===1],
  ["ScoreBadge defined", typeof ScoreBadge==='function']
]; const results=T.map(([n,ok])=>`${ok?'✅':'❌'} ${n}`).join('\n'); console.log('Fantasy Leaderboard self-tests:\n'+results); }}catch{}})();

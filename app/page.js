"use client";
import { useState, useCallback, useRef, useEffect } from "react";

const T = {
  bg:"#08090e",card:"#10111a",cardHover:"#161724",border:"#1c1d30",
  text:"#dcdff0",dim:"#555775",accent:"#818cf8",accentBg:"rgba(129,140,248,0.1)",
  green:"#4ade80",greenBg:"rgba(74,222,128,0.08)",
  red:"#fb7185",redBg:"rgba(251,113,133,0.08)",
  amber:"#fbbf24",amberBg:"rgba(251,191,36,0.08)",
  blue:"#60a5fa",blueBg:"rgba(96,165,250,0.08)",
  purple:"#c084fc",purpleBg:"rgba(192,132,252,0.08)",
  doordash:"#FF3008",ubereats:"#06C167",
};

const CATS=["Advertising & Promotion","Bank Charges & Fees","Business Meals & Entertainment","Car & Truck Expenses","Contractors & Freelancers","Education & Training","Equipment & Hardware","Insurance","Interest & Penalties","Legal & Professional Services","Office Supplies & Software","Rent & Lease","Repairs & Maintenance","Shipping & Delivery","Subscriptions & Memberships","Taxes & Licenses","Telephone & Internet","Travel & Lodging","Utilities","Wages & Salaries","Other / Uncategorized"];

const TY=2025, TYS=`${TY}-01-01`, TYE=`${TY}-12-31`, THR_DEF=75;
const SRC={creditcard:{label:"Credit Card",icon:"💳",color:T.accent},doordash:{label:"DoorDash",icon:"🔴",color:T.doordash},ubereats:{label:"Uber Eats",icon:"🟢",color:T.ubereats},uber:{label:"Uber Rides",icon:"🚗",color:"#aaa"}};
const PHASES=[{k:"parse",l:"Parsing",i:"📄"},{k:"dedup",l:"Dedup",i:"🔄"},{k:"desc",l:"Descriptions",i:"✍️"},{k:"cat",l:"Categorizing",i:"🤖"},{k:"wave",l:"Wave Check",i:"🌊"},{k:"done",l:"Done",i:"✅"}];
const COFFEE=/starbucks|dunkin|peet|philz|blue\s*bottle|coffee|cafe|latte|espresso|dutch\s*bros/i;
const OFFICE=/amazon|staples|office\s*depot|best\s*buy|adobe|microsoft|google|dropbox|zoom|slack|notion|figma|canva|github|atlassian|1password/i;

// ─── Helpers ──────────────────────────────────────
function nd(s){try{const d=new Date(s);return isNaN(d)?s:d.toISOString().split("T")[0]}catch{return s}}
function inTY(s){const d=nd(s);return d>=TYS&&d<=TYE}
function fd(s){try{const d=new Date(s);if(isNaN(d))return s;return`${d.getMonth()+1}/${d.getDate()}/${String(d.getFullYear()).slice(2)}`}catch{return s}}
function mt(s){try{const h=new Date(s).getHours();return h<11?"breakfast":h<15?"lunch":"dinner"}catch{return"meal"}}
function cl(l){const r=[];let c="",q=false;for(const ch of l){if(ch==='"')q=!q;else if(ch===','&&!q){r.push(c.trim());c=""}else c+=ch}r.push(c.trim());return r}

// ─── Parsers ──────────────────────────────────────
function parseCC(t){const ls=t.trim().split("\n");if(ls.length<2)return[];const h=ls[0].split(",").map(s=>s.replace(/"/g,"").trim().toLowerCase());const di=h.findIndex(x=>/date/.test(x)),desc=h.findIndex(x=>/desc|narr|merchant|memo|detail|name/.test(x)),ai=h.findIndex(x=>/amount|debit|charge|total/.test(x));if(di===-1||ai===-1)return[];return ls.slice(1).map(l=>{const c=cl(l);const raw=(c[ai]||"").replace(/[^0-9.\-]/g,"");const date=c[di]?.trim()||"";if(!inTY(date))return null;const m=c[desc>=0?desc:di+1]?.trim()||"Unknown";return{date,description:m,rawMerchant:m,amount:Math.abs(parseFloat(raw)||0),source:"creditcard"}}).filter(t=>t&&t.amount>0)}

function parseDD(t){const ls=t.trim().split("\n");if(ls.length<2)return[];const h=ls[0].split(",").map(s=>s.replace(/"/g,"").trim().toLowerCase());const di=h.findIndex(x=>/date|order.*date|created/.test(x)),st=h.findIndex(x=>/store|restaurant|merchant/.test(x)),to=h.findIndex(x=>/total|amount|subtotal|charge/.test(x)),oi=h.findIndex(x=>/order.*id|id/.test(x)),it=h.findIndex(x=>/items|order.*items|description/.test(x));return ls.slice(1).map(l=>{const c=cl(l);const raw=(c[to>=0?to:0]||"").replace(/[^0-9.\-]/g,"");const amt=Math.abs(parseFloat(raw)||0);const date=c[di>=0?di:0]?.trim()||"";if(!amt||!inTY(date))return null;const r=c[st>=0?st:1]?.trim()||"restaurant";return{date,restaurant:r,rawDescription:`DoorDash — ${r}`,description:"",amount:amt,source:"doordash",orderId:c[oi>=0?oi:0]?.trim(),items:c[it>=0?it:-1]?.trim()||null}}).filter(Boolean)}

function parseUber(t,isEats=false){const ls=t.trim().split("\n");if(ls.length<2)return[];const h=ls[0].split(",").map(s=>s.replace(/"/g,"").trim().toLowerCase());const di=h.findIndex(x=>/date|request.*time|begin/.test(x)),to=h.findIndex(x=>/total|fare|amount|price/.test(x)),ti=h.findIndex(x=>/trip.*id|order.*id|id/.test(x));
if(isEats){let ri=h.findIndex(x=>/^(restaurant|store|merchant)/.test(x));if(ri===-1){const ci=h.findIndex(x=>/city|region|market|area/.test(x));ri=ci!==1?1:2}return ls.slice(1).map(l=>{const c=cl(l);const raw=(c[to>=0?to:0]||"").replace(/[^0-9.\-]/g,"");const amt=Math.abs(parseFloat(raw)||0);const date=c[di>=0?di:0]?.trim()||"";if(!amt||!inTY(date))return null;let r=c[ri]?.trim()||"";if(!r||/^(los angeles|new york|san francisco|chicago|houston|phoenix|dallas|austin|seattle|portland|denver|miami|atlanta|boston|detroit)$/i.test(r)){for(let ci2=0;ci2<c.length;ci2++){if(ci2===di||ci2===(to>=0?to:0)||ci2===ti)continue;const v=c[ci2]?.trim()||"";if(v&&v.length>2&&!/^\d/.test(v)&&!/^(los angeles|new york|san francisco|chicago|houston|phoenix|dallas|austin|seattle|portland|denver|miami|atlanta|boston|detroit)$/i.test(v)&&!/^\d{4}-/.test(v)){r=v;break}}}if(!r)r="restaurant";return{date,restaurant:r,rawDescription:`Uber Eats — ${r}`,description:"",amount:amt,source:"ubereats",orderId:c[ti>=0?ti:0]?.trim()}}).filter(Boolean)}
else{const pi=h.findIndex(x=>/pickup|begin.*addr|from|start.*addr|origin/.test(x)),dri=h.findIndex(x=>/dropoff|end.*addr|destination|to|drop/.test(x)),ci=h.findIndex(x=>/city|region|market/.test(x));return ls.slice(1).map(l=>{const c=cl(l);const raw=(c[to>=0?to:0]||"").replace(/[^0-9.\-]/g,"");const amt=Math.abs(parseFloat(raw)||0);const date=c[di>=0?di:0]?.trim()||"";if(!amt||!inTY(date))return null;const pu=c[pi>=0?pi:1]?.trim()||c[ci>=0?ci:1]?.trim()||"office";const dr=c[dri>=0?dri:2]?.trim()||"meeting";return{date,pickup:pu,dropoff:dr,rawDescription:`Uber — ${pu} → ${dr}`,description:"",amount:amt,source:"uber",orderId:c[ti>=0?ti:0]?.trim()}}).filter(Boolean)}}

// ─── Description generator ────────────────────────
function genDesc(t){
  if(t.source==="doordash"||t.source==="ubereats"){const r=t.restaurant||"restaurant";const p=t.source==="doordash"?"DoorDash":"Uber Eats";if(t.amount<15){if(COFFEE.test(r))return`Coffee at ${r} (${p})`;return`Snack at ${r} (${p})`}return`Business ${mt(t.date)} at ${r} (${p}) to discuss ongoing projects`}
  if(t.source==="uber")return`Uber ride: ${t.pickup||"office"} → ${t.dropoff||"meeting location"}, for meetings related to Sun or various other projects`;
  const m=t.rawMerchant||t.description||"";if(OFFICE.test(m)&&t.amount<500)return`Office supplies — ${m}`;if(COFFEE.test(m)&&t.amount<15)return`Coffee — ${m}`;return m;
}

// ─── Local pre-categorization ─────────────────────
function localCat(t){
  const d=(t.rawDescription||t.description||t.rawMerchant||"").toLowerCase();
  if(t.source==="doordash"||t.source==="ubereats")return{category:"Business Meals & Entertainment",confidence:95};
  if(t.source==="uber")return{category:"Car & Truck Expenses",confidence:92};
  if(COFFEE.test(d)&&t.amount<15)return{category:"Business Meals & Entertainment",confidence:90};
  if(OFFICE.test(d))return{category:"Office Supplies & Software",confidence:t.amount<200?90:85};
  if(/at&t|verizon|t-mobile|comcast|spectrum|xfinity|internet|phone|cellular/i.test(d))return{category:"Telephone & Internet",confidence:90};
  if(/insurance|geico|state\s*farm|allstate/i.test(d))return{category:"Insurance",confidence:88};
  if(/hotel|marriott|hilton|hyatt|airbnb/i.test(d))return{category:"Travel & Lodging",confidence:90};
  if(/fedex|ups|usps|shipping|postage/i.test(d))return{category:"Shipping & Delivery",confidence:92};
  return null;
}

// ─── AI categorize via server-side route ──────────
async function aiCat(items,apiKey){
  const prompt=`Bookkeeping: categorize expenses for tax year ${TY}. Categories: ${CATS.join(", ")}
Rules: Office supply merchants → "Office Supplies & Software". Food delivery → "Business Meals & Entertainment". Uber rides → "Car & Truck Expenses". Software subs → "Office Supplies & Software".
Return ONLY JSON array: [{"index":0,"category":"...","confidence":85}]
${items.map((t,i)=>`${i}. "${t.rawDescription||t.description}" $${t.amount.toFixed(2)}`).join("\n")}`;
  try{
    const r=await fetch("/api/categorize",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({anthropicKey:apiKey,prompt})});
    const d=await r.json();const txt=d.content?.map(b=>b.text||"").join("")||"";
    return JSON.parse(txt.replace(/```json|```/g,"").trim());
  }catch(e){console.error("AI:",e);return null}
}

async function aiCatParallel(items,bs,apiKey,onProg){
  const res=new Array(items.length).fill(null);let done=0;const batches=[];
  for(let i=0;i<items.length;i+=bs)batches.push({s:i,b:items.slice(i,i+bs)});
  let bi=0;
  async function w(){while(bi<batches.length){const{s,b}=batches[bi++];const cats=await aiCat(b,apiKey);if(cats)cats.forEach(c=>{if(c.index+s<items.length)res[c.index+s]=c});done+=b.length;onProg(done)}}
  await Promise.all(Array.from({length:Math.min(2,batches.length)},()=>w()));
  return res;
}

// ─── Receipt search via server routes ─────────────
function buildQ(t){
  const d=nd(t.date);
  if(t.source==="doordash")return`from:no-reply@doordash.com subject:receipt after:${d}`;
  if(t.source==="ubereats")return`from:uber.us@uber.com subject:"your order" OR subject:receipt after:${d}`;
  if(t.source==="uber")return`from:uber.us@uber.com subject:trip after:${d}`;
  return`subject:receipt $${t.amount.toFixed(2)} after:${d}`;
}

async function findReceipt(t,gTok,oTok){
  if(gTok){
    try{
      const r=await fetch("/api/gmail",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token:gTok,query:buildQ(t)})});
      const d=await r.json();if(d.found)return d;
    }catch(e){console.error("Gmail route:",e)}
  }
  if(oTok){
    const d2=nd(t.date);let q="";
    if(t.source==="doordash")q=`from:no-reply@doordash.com AND subject:receipt AND received>=${d2}`;
    else if(t.source==="ubereats"||t.source==="uber")q=`from:uber.us@uber.com AND (subject:receipt OR subject:trip) AND received>=${d2}`;
    else q=`subject:receipt AND body:${t.amount.toFixed(2)} AND received>=${d2}`;
    try{
      const r=await fetch("/api/outlook",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token:oTok,query:q})});
      const d3=await r.json();if(d3.found)return d3;
    }catch(e){console.error("Outlook route:",e)}
  }
  return{found:false};
}

// ─── Wave via server route ────────────────────────
async function fetchWave(tok,biz){
  const q=`query($b:ID!,$p:Int!,$ps:Int!){business(id:$b){transactions(page:$p,pageSize:$ps,sortDirection:DESC){pageInfo{currentPage totalPages}edges{node{id date description amount{value}account{name}}}}}}`;
  const all=[];let p=1,tp=1;
  while(p<=tp&&p<=10){
    const r=await fetch("/api/wave",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token:tok,query:q,variables:{b:biz,p,ps:100}})});
    const d=await r.json();const td=d?.data?.business?.transactions;if(!td)break;
    tp=td.pageInfo.totalPages;
    for(const e of(td.edges||[])){const n=e.node;const dt=nd(n.date);if(dt>=TYS&&dt<=TYE)all.push({waveId:n.id,date:n.date,description:n.description||"",amount:Math.abs(parseFloat(n.amount?.value)||0),account:n.account?.name||"",hasReceipt:(n.description||"").includes("[receipt]")})}
    p++;
  }
  return all;
}

function mergeWave(imp,wave){const u=new Set();return imp.map(t=>{if(t.status==="duplicate")return t;const td=nd(t.date);for(let i=0;i<wave.length;i++){if(u.has(i))continue;if(Math.abs(t.amount-wave[i].amount)<.03&&Math.abs((new Date(td)-new Date(nd(wave[i].date)))/864e5)<=1){u.add(i);return{...t,status:"in_wave",waveMatch:wave[i],waveId:wave[i].waveId,waveHasReceipt:wave[i].hasReceipt}}}return t})}
function crossDedup(a){const pl=a.filter(t=>t.source!=="creditcard"),cc=a.filter(t=>t.source==="creditcard"),m=new Set(),r=[...pl.map(t=>({...t,matchedCC:false}))];for(const c of cc){const cd=nd(c.date);let f=false;for(let i=0;i<pl.length;i++){if(m.has(i))continue;if(Math.abs(c.amount-pl[i].amount)<.02&&Math.abs((new Date(cd)-new Date(nd(pl[i].date)))/864e5)<=1){m.add(i);r[i].matchedCC=true;r[i].ccDescription=c.description;f=true;break}}if(!f)r.push({...c,matchedCC:false})}return r}
function intDedup(ts){const s=new Set();return ts.map(t=>{const k=`${nd(t.date)}|${t.amount.toFixed(2)}|${t.source}|${(t.rawDescription||t.description||"").slice(0,20).toLowerCase()}`;if(s.has(k))return{...t,isDuplicate:true};s.add(k);return{...t,isDuplicate:false}})}

// ─── UI Components ────────────────────────────────
function B({children,bg,color}){return <span style={{background:bg,color,padding:"2px 8px",borderRadius:5,fontSize:10,fontWeight:700,letterSpacing:.5,textTransform:"uppercase",whiteSpace:"nowrap"}}>{children}</span>}
function SB({source}){const m=SRC[source]||SRC.creditcard;return <B bg={`${m.color}18`} color={m.color}>{m.icon} {m.label}</B>}
function StB({status}){const m={pending:[T.amberBg,T.amber,"Pending"],approved:[T.greenBg,T.green,"OK"],duplicate:[T.redBg,T.red,"Dupe"],in_wave:[T.purpleBg,T.purple,"Wave"],skipped:[`${T.dim}20`,T.dim,"Skip"],pushed:[T.blueBg,T.blue,"Synced"]};const[bg,c,l]=m[status]||m.pending;return <B bg={bg} color={c}>{l}</B>}
function Cf({v}){const c=v>=80?T.green:v>=50?T.amber:T.red;return <span style={{fontSize:11,color:c,display:"inline-flex",alignItems:"center",gap:2}}><span style={{width:5,height:5,borderRadius:"50%",background:c}}/>{v}%</span>}

function PP({p}){if(!p)return null;return(
  <div style={{background:T.card,border:`1px solid ${T.accent}30`,borderRadius:14,padding:22,marginBottom:22}}>
    <div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}><span style={{fontWeight:700,fontSize:14}}>Importing — TY{TY}</span><span style={{fontSize:20,fontWeight:800,color:T.accent}}>{p.pct}%</span></div>
    <div style={{height:7,background:T.bg,borderRadius:4,overflow:"hidden",marginBottom:16}}><div style={{height:"100%",width:`${p.pct}%`,background:`linear-gradient(90deg,${T.accent},${T.purple})`,borderRadius:4,transition:"width .3s"}}/></div>
    <div style={{display:"flex",gap:3,marginBottom:14}}>{PHASES.map((ph,i)=>{const a=i===p.phase,d=i<p.phase;return <div key={ph.k} style={{flex:1,textAlign:"center"}}><div style={{height:3,borderRadius:2,background:d?T.green:a?T.accent:`${T.dim}30`,marginBottom:5}}/><div style={{fontSize:12,opacity:d||a?1:.25}}>{d?"✓":ph.i}</div><div style={{fontSize:8,fontWeight:a?700:400,color:d?T.green:a?T.accent:T.dim}}>{ph.l}</div></div>})}</div>
    <div style={{background:T.bg,borderRadius:8,padding:"10px 12px",display:"flex",alignItems:"center",gap:10}}>
      <div style={{width:16,height:16,border:`2px solid ${T.accent}`,borderTopColor:"transparent",borderRadius:"50%",animation:"sp .7s linear infinite",flexShrink:0}}/>
      <div style={{flex:1}}><div style={{fontSize:12,fontWeight:600}}>{PHASES[p.phase]?.i} {PHASES[p.phase]?.l}{p.total>0&&<span style={{color:T.dim,fontWeight:400,marginLeft:6}}>{p.cur}/{p.total}</span>}</div>{p.detail&&<div style={{fontSize:10,color:T.dim,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.detail}</div>}</div>
    </div>
    {p.log?.length>0&&<div style={{marginTop:8,maxHeight:64,overflowY:"auto"}}>{p.log.slice(-3).map((e,i)=> <div key={i} style={{fontSize:10,color:T.dim,display:"flex",gap:4}}><span style={{color:e.c||T.dim}}>●</span>{e.t}</div>)}</div>}
    <style>{`@keyframes sp{to{transform:rotate(360deg)}}`}</style>
  </div>
)}

function IC({icon,title,sub,color,desc,onFile,isActive,children}){const ref=useRef();return <div style={{background:T.card,border:`1px solid ${isActive?color:T.border}`,borderRadius:14,padding:20,position:"relative",overflow:"hidden"}}>{isActive&&<div style={{position:"absolute",top:0,left:0,right:0,height:2,background:color}}/>}<div style={{display:"flex",alignItems:"center",gap:9,marginBottom:8}}><span style={{fontSize:20}}>{icon}</span><div><div style={{fontWeight:700,fontSize:13}}>{title}</div><div style={{fontSize:10,color:T.dim}}>{sub}</div></div></div><p style={{fontSize:11,color:T.dim,lineHeight:1.6,marginBottom:12}}>{desc}</p>{children}<button onClick={()=>ref.current?.click()} style={{...bt(),width:"100%",background:`${color}15`,color,borderColor:`${color}30`}}>📁 Upload CSV</button><input ref={ref} type="file" accept=".csv" style={{display:"none"}} onChange={e=>onFile(e.target.files[0])}/></div>}

// ═══════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════
export default function Home(){
  const[page,setPage]=useState("import");
  const[txns,setTxns]=useState([]);
  const[proc,setProc]=useState(false);
  const[prog,setProg]=useState(null);
  const[wTok,setWTok]=useState("");const[bId,setBId]=useState("");
  const[gTok,setGTok]=useState("");const[oTok,setOTok]=useState("");
  const[apiKey,setApiKey]=useState("");
  const[gClientId,setGClientId]=useState("");const[oClientId,setOClientId]=useState("");
  const[modal,setModal]=useState(null);
  const[filt,setFilt]=useState("all");
  const[imp,setImp]=useState(new Set());
  const[thresh,setThresh]=useState(THR_DEF);
  const[wStat,setWStat]=useState("idle");const[wEx,setWEx]=useState([]);
  const[rProg,setRProg]=useState(null);

  // Listen for OAuth postMessage from popup
  useEffect(()=>{
    const handler=(e)=>{
      if(e.data?.type==="oauth_token"){
        if(e.data.provider==="gmail")setGTok(e.data.token);
        else if(e.data.provider==="outlook")setOTok(e.data.token);
      }
    };
    window.addEventListener("message",handler);
    return()=>window.removeEventListener("message",handler);
  },[]);

  const connectGmail=()=>{
    if(!gClientId){alert("Enter Gmail OAuth Client ID first");return}
    const redirect=`${window.location.origin}/api/auth`;
    const scope="https://www.googleapis.com/auth/gmail.readonly";
    window.open(`https://accounts.google.com/o/oauth2/v2/auth?client_id=${gClientId}&redirect_uri=${encodeURIComponent(redirect)}&response_type=token&scope=${encodeURIComponent(scope)}&state=gmail&prompt=consent`,"_blank","width=500,height=600");
  };

  const connectOutlook=()=>{
    if(!oClientId){alert("Enter Azure App Client ID first");return}
    const redirect=`${window.location.origin}/api/auth`;
    const scope="https://graph.microsoft.com/Mail.Read";
    window.open(`https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${oClientId}&redirect_uri=${encodeURIComponent(redirect)}&response_type=token&scope=${encodeURIComponent(scope)}&state=outlook&prompt=consent`,"_blank","width=500,height=600");
  };

  const ts=()=>new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit",second:"2-digit"});

  // ─── Import ─────────────────────────────────────
  const importSrc=useCallback(async(file,source)=>{
    if(!file)return;setProc(true);
    const log=[];const al=(t,c)=>{log.push({t,c,ts:ts()})};
    const sp=(phase,cur,total,detail,pct)=>setProg({phase,cur:cur||0,total:total||0,detail:detail||"",pct:Math.min(100,Math.round(pct)),log:[...log]});

    al(`Reading ${file.name}`,T.accent);sp(0,0,0,"Reading...",2);
    const text=await file.text();const lc=text.trim().split("\n").length-1;
    let parsed=[];
    if(source==="creditcard")parsed=parseCC(text);else if(source==="doordash")parsed=parseDD(text);
    else if(source==="ubereats")parsed=parseUber(text,true);else if(source==="uber")parsed=parseUber(text,false);
    const sk=lc-parsed.length;
    al(`${parsed.length} in TY${TY}${sk>0?`, ${sk} skipped`:""}`,T.green);sp(0,parsed.length,lc,`${parsed.length} for ${TY}`,10);
    if(!parsed.length){al("No transactions",T.red);setTimeout(()=>{setProc(false);setProg(null)},2500);return}
    await new Promise(r=>setTimeout(r,100));

    sp(1,0,parsed.length,"Dedup...",12);
    const all2=[...txns.filter(t=>t.status!=="in_wave"),...parsed.map((t,i)=>({...t,id:`${source}-${i}-${Date.now()}`,category:null,confidence:null,status:"pending"}))];
    const deduped=crossDedup(all2);const final=intDedup(deduped).map(t=>({...t,id:t.id||`m-${Math.random().toString(36).slice(2)}`,status:t.isDuplicate?"duplicate":(t.status||"pending")}));
    al(`${final.filter(t=>t.isDuplicate).length} dupes`,T.amber);sp(1,parsed.length,parsed.length,"Done",20);

    sp(2,0,final.length,"Generating...",22);
    final.filter(t=>!t.description&&t.status!=="duplicate").forEach(t=>{t.description=genDesc(t)});
    sp(2,final.length,final.length,"Done",28);

    sp(3,0,0,"Pre-categorizing...",30);
    const needAI=[];
    for(const t of final){if(t.status==="duplicate")continue;const lc2=localCat(t);if(lc2){t.category=lc2.category;t.confidence=lc2.confidence}else needAI.push(t)}
    const lCount=final.filter(t=>t.category).length;
    al(`${lCount} local, ${needAI.length} AI`,T.green);sp(3,lCount,lCount+needAI.length,`${needAI.length} for AI`,35);

    if(needAI.length>0&&apiKey){
      const res=await aiCatParallel(needAI,40,apiKey,(d)=>{sp(3,lCount+d,lCount+needAI.length,`AI: ${d}/${needAI.length}`,35+(d/needAI.length)*40)});
      res.forEach((r,i)=>{if(r&&needAI[i]){const idx=final.findIndex(t=>t.id===needAI[i].id);if(idx!==-1){final[idx].category=r.category;final[idx].confidence=r.confidence}}});
    } else if(needAI.length>0){al("No API key — AI skipped",T.amber)}
    sp(3,lCount+needAI.length,lCount+needAI.length,"Done",75);

    let result=final.map(t=>({...t,category:t.category||"Other / Uncategorized",description:t.description||genDesc(t),status:t.status==="duplicate"?"duplicate":(t.confidence>=80?"approved":t.status),needsReceipt:t.amount>=thresh&&t.status!=="duplicate"}));
    if(wEx.length>0){sp(4,0,wEx.length,"Merging...",80);result=mergeWave(result,wEx);sp(4,wEx.length,wEx.length,"Done",90)}
    else sp(4,0,0,"Skip",90);
    sp(5,result.length,result.length,"✅",100);
    setTxns(result);setImp(p=>new Set([...p,source]));
    await new Promise(r=>setTimeout(r,500));setProc(false);setProg(null);setPage("review");
  },[txns,thresh,wEx,apiKey]);

  const findAll=useCallback(async()=>{
    if(!gTok&&!oTok){alert("Connect Gmail or Outlook first");return}
    const miss=txns.filter(t=>t.needsReceipt&&!t.receiptFound&&!t.waveHasReceipt&&t.status!=="duplicate");
    setRProg({done:0,total:miss.length});
    for(let i=0;i<miss.length;i++){
      const r=await findReceipt(miss[i],gTok,oTok);
      if(r.found)setTxns(p=>p.map(t=>t.id===miss[i].id?{...t,receiptFound:true,receiptLink:r.link,receiptSubject:r.subject,receiptProvider:r.provider}:t));
      setRProg({done:i+1,total:miss.length});
    }
    setRProg(null);
  },[txns,gTok,oTok]);

  const findOne=useCallback(async(id)=>{
    if(!gTok&&!oTok){alert("Connect email first");return}
    const t=txns.find(x=>x.id===id);if(!t)return;
    const r=await findReceipt(t,gTok,oTok);
    if(r.found)setTxns(p=>p.map(x=>x.id===id?{...x,receiptFound:true,receiptLink:r.link,receiptSubject:r.subject,receiptProvider:r.provider}:x));
    else alert("No receipt found");
  },[txns,gTok,oTok]);

  const runWave=useCallback(async()=>{
    if(!wTok||!bId)return;setWStat("checking");
    try{const ts2=await fetchWave(wTok,bId);setWEx(ts2);if(txns.length>0)setTxns(mergeWave(txns,ts2));setWStat("done")}catch{setWStat("error")}
  },[wTok,bId,txns]);

  const fil=txns.filter(t=>{if(filt==="all")return true;if(filt==="large")return t.amount>=thresh;if(filt==="dup")return t.status==="duplicate";if(filt==="wave")return t.status==="in_wave";if(filt==="norec")return t.needsReceipt&&!t.receiptFound&&!t.waveHasReceipt;return t.source===filt});
  const C={all:txns.length,ok:txns.filter(t=>t.status==="approved").length,pend:txns.filter(t=>t.status==="pending").length,dup:txns.filter(t=>t.status==="duplicate").length,wave:txns.filter(t=>t.status==="in_wave").length,norec:txns.filter(t=>t.needsReceipt&&!t.receiptFound&&!t.waveHasReceipt&&t.status!=="duplicate").length};
  const okAmt=txns.filter(t=>t.status==="approved").reduce((s,t)=>s+t.amount,0);
  const toggle=id=>setTxns(p=>p.map(t=>t.id===id&&t.status!=="duplicate"?{...t,status:t.status==="approved"?"pending":"approved"}:t));
  const setCat=(id,c)=>setTxns(p=>p.map(t=>t.id===id?{...t,category:c}:t));

  return (
    <div style={{minHeight:"100vh",background:T.bg,color:T.text,fontFamily:"'Outfit','DM Sans',system-ui,sans-serif"}}>
      <style>{`*{box-sizing:border-box;margin:0}::-webkit-scrollbar{width:5px}::-webkit-scrollbar-thumb{background:${T.border};border-radius:3px}select{appearance:none}`}</style>

      <header style={{background:T.card,borderBottom:`1px solid ${T.border}`,padding:"12px 22px",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:50}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:32,height:32,borderRadius:8,background:`linear-gradient(135deg,${T.accent},#c084fc)`,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,fontSize:15,color:"#fff"}}>W</div>
          <span style={{fontWeight:800,fontSize:14}}>Wave Expense Bot</span>
          <span style={{fontSize:9,color:T.dim,background:T.accentBg,padding:"2px 6px",borderRadius:4}}>TY{TY}</span>
          {gTok&&<span style={{fontSize:9,color:T.green,background:T.greenBg,padding:"2px 6px",borderRadius:4}}>📧 Gmail</span>}
          {oTok&&<span style={{fontSize:9,color:T.blue,background:T.blueBg,padding:"2px 6px",borderRadius:4}}>📧 Outlook</span>}
        </div>
        <nav style={{display:"flex",gap:5}}>{[["import","📥 Import"],["review","📋 Review"],["push","🚀 Push"],["settings","⚙ Settings"]].map(([k,l])=> <button key={k} onClick={()=>!proc&&setPage(k)} style={{...bt(),background:page===k?T.accentBg:"transparent",color:page===k?T.accent:T.dim}}>{l}</button>)}</nav>
      </header>

      <main style={{maxWidth:1140,margin:"0 auto",padding:"24px 18px"}}>
        {page==="import"&&<>
          <div style={{textAlign:"center",marginBottom:28}}>
            <h1 style={{fontSize:24,fontWeight:900}}>Import — <span style={{background:`linear-gradient(135deg,${T.accent},#c084fc)`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>Tax Year {TY}</span></h1>
            <p style={{color:T.dim,fontSize:12,marginTop:5}}>Only {TY} transactions. Smart descriptions. Local + AI categorization. Gmail + Outlook receipt search.</p>
          </div>
          <PP p={prog}/>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(250px,1fr))",gap:14,opacity:proc?.3:1,pointerEvents:proc?"none":"auto"}}>
            <IC icon="💳" title="Credit Card" sub="CSV from bank" color={T.accent} desc="Office supply merchants auto-detected. Coffee shops → snack." onFile={f=>importSrc(f,"creditcard")} isActive={imp.has("creditcard")}/>
            <IC icon="🔴" title="DoorDash" sub="Order history" color={T.doordash} desc='"Business dinner at [restaurant]" — <$15 = snack/coffee' onFile={f=>importSrc(f,"doordash")} isActive={imp.has("doordash")}/>
            <IC icon="🟢" title="Uber Eats" sub="Data export" color={T.ubereats} desc="Restaurant name extracted. Smart meal descriptions." onFile={f=>importSrc(f,"ubereats")} isActive={imp.has("ubereats")}/>
            <IC icon="🚗" title="Uber Rides" sub="Trip history" color="#888" desc="Pickup → dropoff with business meeting purpose." onFile={f=>importSrc(f,"uber")} isActive={imp.has("uber")}/>
          </div>
          {imp.size>0&&!proc&&<div style={{marginTop:18,background:T.card,borderRadius:10,border:`1px solid ${T.border}`,padding:"12px 16px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div style={{display:"flex",gap:5}}>{[...imp].map(s=> <B key={s} bg={`${SRC[s].color}18`} color={SRC[s].color}>{SRC[s].icon} {SRC[s].label}</B>)}</div>
            <button onClick={()=>setPage("review")} style={{...bt(),background:T.accent,color:"#fff"}}>Review {txns.length} →</button>
          </div>}
        </>}

        {page==="review"&&<>
          <div style={{display:"flex",gap:7,marginBottom:16,flexWrap:"wrap"}}>
            {[["Total",C.all,T.text],["Approved",C.ok,T.green],["Pending",C.pend,T.amber],["Wave",C.wave,T.purple],["Dupes",C.dup,T.red],["No Receipt",C.norec,T.red]].map(([l,c,color])=> <div key={l} style={{flex:1,minWidth:85,padding:"10px 12px",background:T.card,borderRadius:9,border:`1px solid ${T.border}`}}><div style={{fontSize:9,color:T.dim,textTransform:"uppercase"}}>{l}</div><div style={{fontSize:18,fontWeight:800,color}}>{c}</div></div>)}
          </div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12,flexWrap:"wrap",gap:8}}>
            <div style={{display:"flex",gap:3,flexWrap:"wrap"}}>{[["all","All"],["creditcard","💳"],["doordash","🔴"],["ubereats","🟢"],["uber","🚗"],["wave","🌊"],["norec","📎!"],["large","💰"],["dup","🔄"]].map(([k,l])=> <button key={k} onClick={()=>setFilt(k)} style={{...bt(),fontSize:10,padding:"4px 8px",background:filt===k?T.accentBg:"transparent",color:filt===k?T.accent:T.dim}}>{l}</button>)}</div>
            <div style={{display:"flex",gap:5}}>
              {C.norec>0&&<button onClick={findAll} style={{...bt(),background:T.amberBg,color:T.amber,borderColor:`${T.amber}30`}}>{rProg?`📧 ${rProg.done}/${rProg.total}`:`📧 Find ${C.norec} Receipts`}</button>}
              <button onClick={()=>setTxns(p=>p.map(t=>t.status==="pending"?{...t,status:"approved"}:t))} style={{...bt(),background:T.greenBg,color:T.green}}>✓ All</button>
              <button onClick={()=>setPage("push")} style={{...bt(),background:C.ok?T.accent:T.border,color:C.ok?"#fff":T.dim}}>🚀 {C.ok}</button>
            </div>
          </div>
          <div style={{background:T.card,borderRadius:11,border:`1px solid ${T.border}`,overflow:"hidden"}}>
            <div style={{display:"grid",gridTemplateColumns:"60px 58px 1fr 150px 68px 40px 48px 36px",padding:"8px 12px",fontSize:9,fontWeight:700,color:T.dim,textTransform:"uppercase",background:T.cardHover}}>
              <span>Src</span><span>Date</span><span>Description</span><span>Category</span><span style={{textAlign:"right"}}>Amt</span><span style={{textAlign:"center"}}>AI</span><span style={{textAlign:"center"}}>St</span><span></span>
            </div>
            <div style={{maxHeight:420,overflowY:"auto"}}>
              {!fil.length&&<div style={{padding:36,textAlign:"center",color:T.dim}}>No results</div>}
              {fil.map(t=> <div key={t.id} onClick={()=>toggle(t.id)} style={{display:"grid",gridTemplateColumns:"60px 58px 1fr 150px 68px 40px 48px 36px",padding:"7px 12px",alignItems:"center",fontSize:11,cursor:t.status!=="duplicate"?"pointer":"default",borderTop:`1px solid ${T.border}`,opacity:t.status==="duplicate"?.2:t.status==="in_wave"?.55:1,background:t.status==="approved"?T.greenBg:t.status==="in_wave"?T.purpleBg:"transparent"}}>
                <span><SB source={t.source}/></span>
                <span style={{color:T.dim,fontSize:10}}>{fd(t.date)}</span>
                <span style={{fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",paddingRight:6}}>{t.description}{t.receiptFound&&<span style={{marginLeft:3,fontSize:8,color:T.green}}>📧✓</span>}{t.needsReceipt&&!t.receiptFound&&!t.waveHasReceipt&&<span style={{marginLeft:3,fontSize:8,color:T.red}}>📎!</span>}</span>
                <span><select value={t.category||""} onClick={e=>e.stopPropagation()} onChange={e=>setCat(t.id,e.target.value)} style={{background:T.bg,color:T.text,border:`1px solid ${T.border}`,borderRadius:4,padding:"2px 4px",fontSize:10,width:"100%",outline:"none"}}>{CATS.map(c=> <option key={c}>{c}</option>)}</select></span>
                <span style={{textAlign:"right",fontWeight:600,color:t.amount>=thresh?T.amber:T.text}}>${t.amount.toFixed(2)}</span>
                <span style={{textAlign:"center"}}>{t.confidence!=null&&<Cf v={t.confidence}/>}</span>
                <span style={{textAlign:"center"}}><StB status={t.status}/></span>
                <span><button onClick={e=>{e.stopPropagation();setModal(t)}} style={{background:"none",border:"none",cursor:"pointer",fontSize:11}}>🔍</button></span>
              </div>)}
            </div>
          </div>
        </>}

        {page==="push"&&<div style={{maxWidth:580,margin:"20px auto"}}>
          <h2 style={{fontSize:18,fontWeight:800,marginBottom:16,textAlign:"center"}}>🚀 Push — TY{TY}</h2>
          {!wTok||!bId?<div style={{textAlign:"center",padding:20,background:T.card,borderRadius:10,border:`1px solid ${T.border}`}}><button onClick={()=>setPage("settings")} style={{...bt(),background:T.accent,color:"#fff"}}>⚙ Configure Wave</button></div>:<>
            {wStat!=="done"&&<button onClick={runWave} style={{...bt(),width:"100%",marginBottom:12,background:T.purpleBg,color:T.purple,padding:10}}>🌊 {wStat==="checking"?"Checking...":"Check & Merge Wave"}</button>}
            <div style={{background:T.card,borderRadius:10,border:`1px solid ${T.border}`,padding:12,maxHeight:280,overflowY:"auto"}}>
              {txns.filter(t=>t.status==="approved").map(t=> <div key={t.id} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:`1px solid ${T.border}`,fontSize:11}}><span style={{display:"flex",alignItems:"center",gap:5}}><SB source={t.source}/><span style={{maxWidth:230,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.description}</span></span><span style={{fontWeight:600}}>${t.amount.toFixed(2)}</span></div>)}
            </div>
            <div style={{display:"flex",gap:7,marginTop:12}}><button onClick={()=>setPage("review")} style={{...bt(),flex:1}}>←</button><button style={{...bt(),flex:2,background:T.green,color:"#000",fontWeight:700}}>🚀 Push {C.ok} + Merge {C.wave}</button></div>
          </>}
        </div>}

        {page==="settings"&&<div style={{maxWidth:500,margin:"28px auto"}}>
          <h2 style={{fontSize:18,fontWeight:800,marginBottom:16}}>⚙ Settings</h2>
          <div style={{background:T.card,borderRadius:14,border:`1px solid ${T.border}`,padding:22}}>
            <Sc t="Anthropic API Key"><In l="API Key" type="password" v={apiKey} set={setApiKey} ph="sk-ant-... (for AI categorization)"/></Sc>
            <Sc t="Wave API"><In l="Token" type="password" v={wTok} set={setWTok} ph="Wave Full Access token"/><In l="Business ID" v={bId} set={setBId} ph="Business ID from Wave URL"/></Sc>
            <Sc t="📧 Gmail Receipt Search">
              <In l="OAuth Client ID" v={gClientId} set={setGClientId} ph="Google Cloud OAuth client ID"/>
              {gClientId&&!gTok&&<button onClick={connectGmail} style={{...bt(),width:"100%",marginBottom:8,background:`${T.green}15`,color:T.green}}>🔗 Connect Gmail</button>}
              {gTok&&<div style={{background:T.greenBg,borderRadius:6,padding:8,fontSize:11,color:T.green,marginBottom:8}}>✅ Gmail connected</div>}
              <In l="Or paste token" type="password" v={gTok} set={setGTok} ph="From OAuth Playground"/>
            </Sc>
            <Sc t="📧 Outlook Receipt Search">
              <In l="Azure App Client ID" v={oClientId} set={setOClientId} ph="Azure AD client ID"/>
              {oClientId&&!oTok&&<button onClick={connectOutlook} style={{...bt(),width:"100%",marginBottom:8,background:`${T.blue}15`,color:T.blue}}>🔗 Connect Outlook</button>}
              {oTok&&<div style={{background:T.blueBg,borderRadius:6,padding:8,fontSize:11,color:T.blue,marginBottom:8}}>✅ Outlook connected</div>}
              <In l="Or paste token" type="password" v={oTok} set={setOTok} ph="From Azure"/>
            </Sc>
            <Sc t="Receipt Threshold"><div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:11,color:T.dim}}>≥ $</span><input type="number" value={thresh} onChange={e=>setThresh(Number(e.target.value)||75)} style={{...iSt(),width:65,textAlign:"center"}}/></div></Sc>
            <button onClick={()=>setPage(txns.length?"review":"import")} style={{...bt(),width:"100%",marginTop:12,background:T.accent,color:"#fff"}}>Save</button>
          </div>
        </div>}
      </main>

      {modal&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.7)",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(4px)"}} onClick={()=>setModal(null)}>
        <div onClick={e=>e.stopPropagation()} style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:14,padding:24,maxWidth:500,width:"90%",maxHeight:"80vh",overflowY:"auto"}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:14}}><h3 style={{fontSize:14,fontWeight:700,margin:0}}>Details</h3><button onClick={()=>setModal(null)} style={{...bt(),padding:"3px 8px"}}>✕</button></div>
          <div style={{display:"grid",gap:7,fontSize:12}}>
            <DR l="Date">{fd(modal.date)}</DR>
            <DR l="Description"><span style={{color:T.green}}>{modal.description}</span></DR>
            <DR l="Amount" b>${modal.amount.toFixed(2)}</DR>
            <DR l="Source"><SB source={modal.source}/></DR>
            <DR l="Category">{modal.category}</DR>
            {modal.restaurant&&<DR l="Restaurant">{modal.restaurant}</DR>}
            {modal.pickup&&<DR l="Route">{modal.pickup} → {modal.dropoff}</DR>}
            <DR l="Receipt">{modal.receiptFound? <a href={modal.receiptLink} target="_blank" rel="noreferrer" style={{color:T.green,textDecoration:"underline"}}>📧 {modal.receiptProvider}: {modal.receiptSubject}</a>:modal.waveHasReceipt? <B bg={T.greenBg} color={T.green}>In Wave</B>:modal.amount>=thresh? <div style={{display:"flex",gap:6}}><B bg={T.redBg} color={T.red}>Missing</B><button onClick={()=>findOne(modal.id)} style={{...bt(),padding:"2px 6px",fontSize:9,background:T.amberBg,color:T.amber}}>🔍 Search</button></div>:<span style={{color:T.dim}}>Not required</span>}</DR>
          </div>
        </div>
      </div>}
    </div>
  );
}

function DR({l,b,children}){return <div style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:`1px solid ${T.border}`,gap:10}}><span style={{color:T.dim,flexShrink:0}}>{l}</span><span style={{fontWeight:b?600:400,textAlign:"right"}}>{children}</span></div>}
function bt(){return{padding:"6px 12px",borderRadius:6,border:`1px solid ${T.border}`,color:T.text,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit",background:T.card}}
function iSt(){return{width:"100%",padding:"7px 9px",background:T.bg,border:`1px solid ${T.border}`,borderRadius:6,color:T.text,fontSize:12,outline:"none",fontFamily:"inherit"}}
function In({l,v,set,...p}){return <label style={{display:"block",marginBottom:10}}><div style={{fontSize:9,fontWeight:600,color:T.dim,textTransform:"uppercase",letterSpacing:.6,marginBottom:3}}>{l}</div><input value={v} onChange={e=>set(e.target.value)} style={iSt()} {...p}/></label>}
function Sc({t,children}){return <div style={{marginBottom:16}}><div style={{fontSize:9,fontWeight:700,color:T.accent,textTransform:"uppercase",letterSpacing:.7,marginBottom:7,paddingBottom:4,borderBottom:`1px solid ${T.border}`}}>{t}</div>{children}</div>}

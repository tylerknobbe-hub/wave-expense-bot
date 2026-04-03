"use client";
import { useState, useCallback, useRef, useEffect, useMemo } from "react";

const APP_VERSION="v3.0";
const T={bg:"#08090e",card:"#10111a",cardHover:"#161724",border:"#1c1d30",text:"#dcdff0",dim:"#555775",accent:"#818cf8",accentBg:"rgba(129,140,248,0.1)",green:"#4ade80",greenBg:"rgba(74,222,128,0.08)",red:"#fb7185",redBg:"rgba(251,113,133,0.08)",amber:"#fbbf24",amberBg:"rgba(251,191,36,0.08)",blue:"#60a5fa",blueBg:"rgba(96,165,250,0.08)",purple:"#c084fc",purpleBg:"rgba(192,132,252,0.08)",doordash:"#FF3008",ubereats:"#06C167",dateText:"#b0b4cc",cyan:"#22d3ee",cyanBg:"rgba(34,211,238,0.08)"};
const CATS=["Business Meals & Entertainment","Car & Truck Expenses","Travel & Lodging","Office Supplies & Software","Subscriptions & Memberships","Telephone & Internet","Shipping & Delivery","Insurance","Rent & Lease","Utilities","Wages & Salaries","Education & Training","Equipment & Hardware","Advertising & Promotion","Bank Charges & Fees","Contractors & Freelancers","Interest & Penalties","Legal & Professional Services","Repairs & Maintenance","Taxes & Licenses","Other / Uncategorized"];
const MONTHS=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const TY=2025,TYS=`${TY}-01-01`,TYE=`${TY}-12-31`,THR_DEF=0;

// ─── HARDCODED WAVE ACCOUNTS ──────────────────────
const BIZ_ID="QnVzaW5lc3M6Y2NkZjZhYjQtZDEzZi00NjRlLWE2M2QtZTMzZDU0YjI3YWE4";
const BIZ_URL_ID="ccdf6ab4-d13f-464e-a63d-e33d54b27aa8";
const RECEIPT_EMAIL="tpk@wavereceipts.com";
const WAVE_ANCHORS=[
  {id:"QWNjb3VudDoyMzE1NzQxMzkyNDgxMTM0Nzg4O0J1c2luZXNzOmNjZGY2YWI0LWQxM2YtNDY0ZS1hNjNkLWUzM2Q1NGIyN2FhOA==",name:"American Express",type:"Credit Card"},
  {id:"QWNjb3VudDoxOTA0NTg0MzQ5NTg4NzYwNzc1O0J1c2luZXNzOmNjZGY2YWI0LWQxM2YtNDY0ZS1hNjNkLWUzM2Q1NGIyN2FhOA==",name:"Chase Business Checking",type:"Cash & Bank"},
  {id:"QWNjb3VudDoxODU5NjMwMzQ4NjY5OTIxNjQ0O0J1c2luZXNzOmNjZGY2YWI0LWQxM2YtNDY0ZS1hNjNkLWUzM2Q1NGIyN2FhOA==",name:"Cash on Hand",type:"Cash & Bank"},
];
const WAVE_EXPENSES=[
  {id:"QWNjb3VudDoxODc0MjA2ODMxMjEyMDc5NjE3O0J1c2luZXNzOmNjZGY2YWI0LWQxM2YtNDY0ZS1hNjNkLWUzM2Q1NGIyN2FhOA==",name:"Business Meals"},
  {id:"QWNjb3VudDoxODU5NjM4NzQwNTU3ODY3Njg3O0J1c2luZXNzOmNjZGY2YWI0LWQxM2YtNDY0ZS1hNjNkLWUzM2Q1NGIyN2FhOA==",name:"Transportation"},
  {id:"QWNjb3VudDoxOTA0NTg3MDgzNzYzMjYzOTc5O0J1c2luZXNzOmNjZGY2YWI0LWQxM2YtNDY0ZS1hNjNkLWUzM2Q1NGIyN2FhOA==",name:"Travel"},
  {id:"QWNjb3VudDoxOTA0NTg5MDQ3MTI1MzU1NTExO0J1c2luZXNzOmNjZGY2YWI0LWQxM2YtNDY0ZS1hNjNkLWUzM2Q1NGIyN2FhOA==",name:"Office Expenses"},
  {id:"QWNjb3VudDoxOTA0NTgxMjI5NjMwNTY0ODk0O0J1c2luZXNzOmNjZGY2YWI0LWQxM2YtNDY0ZS1hNjNkLWUzM2Q1NGIyN2FhOA==",name:"Technology"},
  {id:"QWNjb3VudDoxODc0MjA2NzYzODE4MDAyOTQzO0J1c2luZXNzOmNjZGY2YWI0LWQxM2YtNDY0ZS1hNjNkLWUzM2Q1NGIyN2FhOA==",name:"Supplies"},
  {id:"QWNjb3VudDoxODc0MzA2NzA2MDM3NjQ3MzcxO0J1c2luZXNzOmNjZGY2YWI0LWQxM2YtNDY0ZS1hNjNkLWUzM2Q1NGIyN2FhOA==",name:"Internet & Mobile Device"},
  {id:"QWNjb3VudDoxOTA0NTkzODIzNDk4MDg3MDA0O0J1c2luZXNzOmNjZGY2YWI0LWQxM2YtNDY0ZS1hNjNkLWUzM2Q1NGIyN2FhOA==",name:"Educational Expenses"},
  {id:"QWNjb3VudDoxOTA0NTgzNTUyMzUyMjM0MzI1O0J1c2luZXNzOmNjZGY2YWI0LWQxM2YtNDY0ZS1hNjNkLWUzM2Q1NGIyN2FhOA==",name:"Health & Wellness R&D"},
  {id:"QWNjb3VudDoyMzQzOTI5MzY3MTE1MTgwMzU3O0J1c2luZXNzOmNjZGY2YWI0LWQxM2YtNDY0ZS1hNjNkLWUzM2Q1NGIyN2FhOA==",name:"Individual 401K"},
  {id:"QWNjb3VudDoyMzQzOTM3MDI5MTI3MTIxMzcwO0J1c2luZXNzOmNjZGY2YWI0LWQxM2YtNDY0ZS1hNjNkLWUzM2Q1NGIyN2FhOA==",name:"Rent Expenses"},
  {id:"QWNjb3VudDoyMjA5OTk1MTU3NzY2NTE1MDE4O0J1c2luZXNzOmNjZGY2YWI0LWQxM2YtNDY0ZS1hNjNkLWUzM2Q1NGIyN2FhOA==",name:"Utilities"},
  {id:"QWNjb3VudDoyMjA5OTkyMDg2Mzk1MTM2NzkzO0J1c2luZXNzOmNjZGY2YWI0LWQxM2YtNDY0ZS1hNjNkLWUzM2Q1NGIyN2FhOA==",name:"Work Support (Upwork)"},
  {id:"QWNjb3VudDoxODU5NjMwMzQ5MDA1NDY1OTc4O0J1c2luZXNzOmNjZGY2YWI0LWQxM2YtNDY0ZS1hNjNkLWUzM2Q1NGIyN2FhOA==",name:"Uncategorized Expense"},
  {id:"QWNjb3VudDoxOTU1NDY5MTIzODc4MjM0ODU3O0J1c2luZXNzOmNjZGY2YWI0LWQxM2YtNDY0ZS1hNjNkLWUzM2Q1NGIyN2FhOA==",name:"Accounting Services"},
];
const SRC={creditcard:{label:"Credit Card",icon:"💳",color:T.accent},doordash:{label:"DoorDash",icon:"🔴",color:T.doordash},ubereats:{label:"Uber Eats",icon:"🟢",color:T.ubereats},uber:{label:"Uber Rides",icon:"🚗",color:"#aaa"},copilot:{label:"Copilot",icon:"📊",color:T.cyan}};
const COFFEE=/starbucks|dunkin|peet|philz|blue\s*bottle|coffee|cafe|latte|espresso|dutch\s*bros|republik coffee/i;
const OFFICE=/amazon|staples|office\s*depot|best\s*buy|adobe|microsoft|google|dropbox|zoom|slack|notion|figma|canva|github|atlassian|1password|typeform|wave pro|openai|claude\.ai/i;

// ─── Helpers ──────────────────────────────────────
function nd(s){try{const d=new Date(s);return isNaN(d)?s:d.toISOString().split("T")[0]}catch{return s}}
function inTY(s){const d=nd(s);return d>=TYS&&d<=TYE}
function fd(s){try{const d=new Date(s);if(isNaN(d))return s;return`${d.getMonth()+1}/${d.getDate()}/${String(d.getFullYear()).slice(2)}`}catch{return s}}
// Meal timing: Uber Eats CSV "Request_Time_Local" has Z suffix but IS local time. Don't convert.
function mt(s){try{const parts=s.match(/T(\d{2}):/);if(!parts)return"meal";const h=parseInt(parts[1]);return h<11?"breakfast":h<15?"lunch":"dinner"}catch{return"meal"}}
function cl(l){const r=[];let c="",q=false;for(const ch of l){if(ch==='"')q=!q;else if(ch===','&&!q){r.push(c.trim());c=""}else c+=ch}r.push(c.trim());return r}
function dayBefore(d){const dt=new Date(d);dt.setDate(dt.getDate()-1);return dt.toISOString().split("T")[0]}
function dayAfter(d){const dt=new Date(d);dt.setDate(dt.getDate()+2);return dt.toISOString().split("T")[0]}
function stripQ(s){return(s||"").replace(/^"|"$/g,"").trim()}

// Wave category mapping from our categories
function waveExpenseId(cat){const m={"Business Meals & Entertainment":WAVE_EXPENSES[0].id,"Car & Truck Expenses":WAVE_EXPENSES[1].id,"Travel & Lodging":WAVE_EXPENSES[2].id,"Office Supplies & Software":WAVE_EXPENSES[3].id,"Telephone & Internet":WAVE_EXPENSES[6].id,"Subscriptions & Memberships":WAVE_EXPENSES[4].id,"Rent & Lease":WAVE_EXPENSES[10].id,"Utilities":WAVE_EXPENSES[11].id,"Wages & Salaries":WAVE_EXPENSES[12].id,"Education & Training":WAVE_EXPENSES[7].id};return m[cat]||WAVE_EXPENSES[13].id}
// Short description for Wave description field
function waveDesc(t){if(t.source==="ubereats")return`Uber Eats | ${t.restaurant||"order"}`;if(t.source==="doordash")return`DoorDash | ${t.restaurant||"order"}`;if(t.source==="uber")return`Uber Ride | ${t.pickup||"trip"}`;return(t.rawMerchant||t.description||"Expense").split(" — ")[0].split(" to discuss")[0].slice(0,100)}

// ─── Parsers ──────────────────────────────────────
function parseCC(t){const ls=t.trim().split("\n");if(ls.length<2)return[];const h=ls[0].split(",").map(s=>s.replace(/"/g,"").trim().toLowerCase());const di=h.findIndex(x=>/date/.test(x)),desc=h.findIndex(x=>/desc|narr|merchant|memo|detail|name/.test(x)),ai=h.findIndex(x=>/amount|debit|charge|total/.test(x));if(di===-1||ai===-1)return[];return ls.slice(1).map(l=>{const c=cl(l);const raw=(c[ai]||"").replace(/[^0-9.\-]/g,"");const date=c[di]?.trim()||"";if(!inTY(date))return null;const m=c[desc>=0?desc:di+1]?.trim()||"Unknown";return{date,description:m,rawMerchant:m,amount:Math.abs(parseFloat(raw)||0),source:"creditcard"}}).filter(t=>t&&t.amount>0)}
function parseDD(t){const ls=t.trim().split("\n");if(ls.length<2)return[];const h=ls[0].split(",").map(s=>s.replace(/"/g,"").trim().toLowerCase());const di=h.findIndex(x=>/date|order.*date|created/.test(x)),st=h.findIndex(x=>/store|restaurant|merchant/.test(x)),to=h.findIndex(x=>/total|amount|subtotal|charge/.test(x));return ls.slice(1).map(l=>{const c=cl(l);const raw=(c[to>=0?to:0]||"").replace(/[^0-9.\-]/g,"");const amt=Math.abs(parseFloat(raw)||0);const date=c[di>=0?di:0]?.trim()||"";if(!amt||!inTY(date))return null;const r=c[st>=0?st:1]?.trim()||"restaurant";return{date,restaurant:r,rawDescription:`DoorDash — ${r}`,description:"",amount:amt,source:"doordash"}}).filter(Boolean)}
function parseUber(text,isEats=false){const lines=text.trim().split("\n");if(lines.length<2)return[];const h=lines[0].split(",").map(s=>s.replace(/"/g,"").trim().toLowerCase());const di=h.findIndex(x=>/date|request.*time|begin/.test(x));if(isEats){let restI=h.findIndex(x=>/^restaurant/.test(x));if(restI===-1)restI=h.findIndex(x=>/store|merchant/.test(x));if(restI===-1){const ci=h.findIndex(x=>/city|region|market|area/.test(x));restI=ci!==1?1:2}let opI=h.findIndex(x=>/^order.*(price|total)/.test(x));if(opI===-1)opI=h.findIndex(x=>/total|fare/.test(x));if(opI===-1)opI=h.findIndex(x=>/amount|price/.test(x));const inI=h.findIndex(x=>/^item.*(name|desc)/.test(x));const iqI=h.findIndex(x=>/item.*quant/.test(x));const raw=lines.slice(1).map(l=>{const c=cl(l);const date=c[di>=0?di:0]?.trim()||"";if(!inTY(date))return null;const r=c[restI]?.trim()||"";const op=Math.abs(parseFloat((c[opI]||"").replace(/[^0-9.\-]/g,""))||0);if(!op)return null;const iN=inI>=0?(c[inI]?.trim()||""):"";const iQ=iqI>=0?parseInt(c[iqI])||1:1;return{date,restaurant:r,orderPrice:op,itemName:iN,itemQty:iQ}}).filter(Boolean);const om=new Map();for(const r of raw){const k=`${r.date}|${r.restaurant}|${r.orderPrice}`;if(!om.has(k))om.set(k,{date:r.date,restaurant:r.restaurant,amount:r.orderPrice,items:[]});if(r.itemName){const o=om.get(k);o.items.push(`${r.itemQty>1?r.itemQty+"x ":""}${r.itemName}`)}}return Array.from(om.values()).map(o=>({date:o.date,restaurant:o.restaurant||"restaurant",rawDescription:`Uber Eats — ${o.restaurant||"restaurant"}`,description:"",amount:o.amount,source:"ubereats",items:o.items.length?o.items.join(", "):null}))}else{const tot=h.findIndex(x=>/total|fare/.test(x));const prI=tot>=0?tot:h.findIndex(x=>/amount|price/.test(x));const piI=h.findIndex(x=>/pickup|begin.*addr|from|start.*addr|origin/.test(x));const drI=h.findIndex(x=>/dropoff|end.*addr|destination|drop/.test(x));const ciI=h.findIndex(x=>/city|region|market/.test(x));return lines.slice(1).map(l=>{const c=cl(l);const raw2=(c[prI>=0?prI:0]||"").replace(/[^0-9.\-]/g,"");const amt=Math.abs(parseFloat(raw2)||0);const date=c[di>=0?di:0]?.trim()||"";if(!amt||!inTY(date))return null;let pu=piI>=0?c[piI]?.trim():"";let dr=drI>=0?c[drI]?.trim():"";if(!pu||/^\d{4}-/.test(pu))pu=ciI>=0?c[ciI]?.trim()||"office":"office";if(!dr||/^\d{4}-/.test(dr))dr="meeting";return{date,pickup:pu,dropoff:dr,rawDescription:`Uber — ${pu} → ${dr}`,description:"",amount:amt,source:"uber"}}).filter(Boolean)}}

// ─── Descriptions & Categorization ────────────────
function genDesc(t){if(t.source==="doordash"||t.source==="ubereats"){const r=t.restaurant||"restaurant";const p=t.source==="doordash"?"DoorDash":"Uber Eats";if(t.amount<15){if(COFFEE.test(r))return`Coffee at ${r} (${p})`;return`Snack at ${r} (${p})`}return`Business ${mt(t.date)} at ${r} (${p}) to discuss ongoing projects`}if(t.source==="uber")return`Uber ride: ${t.pickup||"office"} → ${t.dropoff||"meeting"}, for meetings related to Sun or various other projects`;const m=t.rawMerchant||t.description||"";if(OFFICE.test(m)&&t.amount<500)return`Office supplies — ${m}`;if(COFFEE.test(m)&&t.amount<15)return`Coffee — ${m}`;return m}
function localCat(t){const d=(t.rawDescription||t.description||t.rawMerchant||"").toLowerCase();if(t.source==="doordash"||t.source==="ubereats")return{category:"Business Meals & Entertainment",confidence:95};if(t.source==="uber")return{category:"Car & Truck Expenses",confidence:92};if(COFFEE.test(d)&&t.amount<15)return{category:"Business Meals & Entertainment",confidence:90};if(OFFICE.test(d))return{category:"Office Supplies & Software",confidence:t.amount<200?90:85};if(/at&t|verizon|t-mobile|comcast|spectrum|xfinity|internet|phone|cellular/i.test(d))return{category:"Telephone & Internet",confidence:90};if(/insurance|geico|state\s*farm|allstate/i.test(d))return{category:"Insurance",confidence:88};if(/hotel|marriott|hilton|hyatt|airbnb/i.test(d))return{category:"Travel & Lodging",confidence:90};if(/fedex|ups|usps|shipping|postage/i.test(d))return{category:"Shipping & Delivery",confidence:92};return null}

// ─── AI ───────────────────────────────────────────
async function aiCat(items,apiKey){const prompt=`Bookkeeping: categorize for TY${TY}. Categories: ${CATS.join(", ")}\nReturn ONLY JSON array: [{"index":0,"category":"...","confidence":85}]\n${items.map((t,i)=>`${i}. "${t.rawDescription||t.description}" $${t.amount.toFixed(2)}`).join("\n")}`;try{const r=await fetch("/api/categorize",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({anthropicKey:apiKey,prompt})});const d=await r.json();const txt=d.content?.map(b=>b.text||"").join("")||"";return JSON.parse(txt.replace(/```json|```/g,"").trim())}catch(e){return null}}
async function aiCatP(items,bs,apiKey,onP){const res=new Array(items.length).fill(null);let done=0;const batches=[];for(let i=0;i<items.length;i+=bs)batches.push({s:i,b:items.slice(i,i+bs)});let bi=0;async function w(){while(bi<batches.length){const{s,b}=batches[bi++];const cats=await aiCat(b,apiKey);if(cats)cats.forEach(c=>{if(c.index+s<items.length)res[c.index+s]=c});done+=b.length;onP(done)}}await Promise.all(Array.from({length:Math.min(2,batches.length)},()=>w()));return res}

// ─── Receipt Search ───────────────────────────────
function buildQ(t){const d=nd(t.date);const bef=dayAfter(d);const aft=dayBefore(d);if(t.source==="ubereats"||/uber eats|ubereats/i.test(t.rawMerchant||"")){const r=(t.restaurant||t.rawMerchant||"").split("(")[0].trim().split(" ").slice(0,2).join(" ");return`from:uber subject:order ${r} after:${aft} before:${bef}`}if(t.source==="uber"||/^uber(?! eats)/i.test(t.rawMerchant||""))return`from:uber subject:trip after:${aft} before:${bef}`;if(t.source==="doordash"||/doordash/i.test(t.rawMerchant||"")){const r=(t.restaurant||t.rawMerchant||"").replace(/dd \*doordash\s*/i,"").split(" ").slice(0,2).join(" ");return`from:doordash ${r} after:${aft} before:${bef}`}return`receipt ${(t.rawMerchant||t.description||"").split(" ").slice(0,2).join(" ")} after:${aft} before:${bef}`}
function buildQB(t){const d=nd(t.date);const bef=dayAfter(d);const aft=dayBefore(d);if(t.source==="ubereats"||/uber eats/i.test(t.rawMerchant||""))return`from:uber after:${aft} before:${bef}`;if(t.source==="uber"||/^uber/i.test(t.rawMerchant||""))return`from:uber trip after:${aft} before:${bef}`;if(t.source==="doordash"||/doordash/i.test(t.rawMerchant||""))return`from:doordash after:${aft} before:${bef}`;return`receipt after:${aft} before:${bef}`}
async function findReceipt(t,gTok,oTok){if(gTok){try{const r=await fetch("/api/gmail",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token:gTok,query:buildQ(t)})});const d=await r.json();if(d.found)return d}catch(e){}try{const r=await fetch("/api/gmail",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token:gTok,query:buildQB(t)})});const d=await r.json();if(d.found)return d}catch(e){}}if(oTok){const d2=nd(t.date);const q=(/uber/i.test(t.rawMerchant||""))?`from:uber AND (subject:receipt OR subject:trip) AND received>=${dayBefore(d2)}`:(t.source==="doordash"||/doordash/i.test(t.rawMerchant||""))?`from:doordash AND received>=${dayBefore(d2)}`:`subject:receipt AND received>=${dayBefore(d2)}`;try{const r=await fetch("/api/outlook",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token:oTok,query:q})});const d3=await r.json();if(d3.found)return d3}catch(e){}}return{found:false}}

// ─── Dedup ────────────────────────────────────────
function crossDedup(a){const pl=a.filter(t=>t.source!=="creditcard"&&t.source!=="copilot"),cc=a.filter(t=>t.source==="creditcard"||t.source==="copilot"),m=new Set(),r=[...pl.map(t=>({...t,matchedCC:false}))];for(const c of cc){const cd=nd(c.date);let f=false;for(let i=0;i<pl.length;i++){if(m.has(i))continue;const amtDiff=Math.abs(c.amount-pl[i].amount);const amtPct=amtDiff/Math.max(c.amount,pl[i].amount,1);const dateOk=Math.abs((new Date(cd)-new Date(nd(pl[i].date)))/864e5)<=1;if(dateOk&&(amtDiff<0.02||amtPct<0.15)){m.add(i);r[i].matchedCC=true;r[i].ccDescription=c.description;if(c.amount>pl[i].amount){r[i].csvAmount=pl[i].amount;r[i].amount=c.amount}f=true;break}}if(!f)r.push({...c,matchedCC:false})}return r}
function intDedup(ts){const s=new Set();return ts.map(t=>{const k=`${nd(t.date)}|${t.amount.toFixed(2)}|${t.source}|${(t.rawDescription||t.description||"").slice(0,20).toLowerCase()}`;if(s.has(k))return{...t,isDuplicate:true};s.add(k);return{...t,isDuplicate:false}})}

// ─── UI Components ────────────────────────────────
function Bd({children,bg,color}){return <span style={{background:bg,color,padding:"2px 8px",borderRadius:5,fontSize:10,fontWeight:700,letterSpacing:.5,textTransform:"uppercase",whiteSpace:"nowrap"}}>{children}</span>}
function SB({source}){const m=SRC[source]||SRC.creditcard;const short={creditcard:"CC",doordash:"DD",ubereats:"UE",uber:"UR",copilot:"CP"};return <Bd bg={`${m.color}18`} color={m.color}>{m.icon}{short[source]||""}</Bd>}
function StB({status}){const m={pending:[T.amberBg,T.amber,"Pending"],approved:[T.greenBg,T.green,"OK"],duplicate:[T.redBg,T.red,"Dupe"],in_wave:[T.purpleBg,T.purple,"Wave"],pushed:[T.blueBg,T.blue,"Synced"]};const[bg,c,l]=m[status]||m.pending;return <Bd bg={bg} color={c}>{l}</Bd>}
function Cf({v}){const c=v>=80?T.green:v>=50?T.amber:T.red;return <span style={{fontSize:11,color:c,display:"inline-flex",alignItems:"center",gap:2}}><span style={{width:5,height:5,borderRadius:"50%",background:c}}/>{v}%</span>}
function SH({label,field,sort,setSort}){const a=sort.field===field;return <span onClick={()=>setSort({field,dir:a&&sort.dir==="asc"?"desc":"asc"})} style={{cursor:"pointer",userSelect:"none",display:"inline-flex",alignItems:"center",gap:2}}>{label}<span style={{fontSize:7,color:a?T.accent:T.dim}}>{a?(sort.dir==="asc"?"▲":"▼"):"⇅"}</span></span>}
function IC({icon,title,sub,color,desc,onFile,isActive}){const ref=useRef();return <div style={{background:T.card,border:`1px solid ${isActive?color:T.border}`,borderRadius:14,padding:20,position:"relative",overflow:"hidden"}}>{isActive&&<div style={{position:"absolute",top:0,left:0,right:0,height:2,background:color}}/>}<div style={{display:"flex",alignItems:"center",gap:9,marginBottom:8}}><span style={{fontSize:20}}>{icon}</span><div><div style={{fontWeight:700,fontSize:13}}>{title}</div><div style={{fontSize:10,color:T.dim}}>{sub}</div></div></div><p style={{fontSize:11,color:T.dim,lineHeight:1.6,marginBottom:12}}>{desc}</p><button onClick={()=>ref.current?.click()} style={{...bt(),width:"100%",background:`${color}15`,color,borderColor:`${color}30`}}>📁 Upload CSV</button><input ref={ref} type="file" accept=".csv" style={{display:"none"}} onChange={e=>onFile(e.target.files[0])}/></div>}
function MonthlyChart({txns,catFilter,srcFilter}){const data=useMemo(()=>{const m=Array(12).fill(0);txns.filter(t=>t.status!=="duplicate"&&t.status!=="in_wave"&&t.status!=="skipped").filter(t=>!catFilter||t.category===catFilter).filter(t=>!srcFilter||t.source===srcFilter).forEach(t=>{const mo=new Date(t.date).getMonth();if(mo>=0&&mo<12)m[mo]+=t.amount});return m},[txns,catFilter,srcFilter]);const max=Math.max(...data,1);const total=data.reduce((a,b)=>a+b,0);return <div><div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}><span style={{fontSize:13,fontWeight:700}}>Monthly Expenses — TY{TY}</span><span style={{fontSize:13,fontWeight:700,color:T.accent}}>${total.toFixed(2)}</span></div><div style={{display:"flex",alignItems:"flex-end",gap:6,height:180,padding:"0 4px"}}>{data.map((v,i)=><div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}><span style={{fontSize:9,color:T.dim}}>{v>0?`$${Math.round(v)}`:""}</span><div style={{width:"100%",background:v>0?`linear-gradient(180deg,${T.accent},${T.purple})`:`${T.dim}20`,borderRadius:4,height:`${Math.max((v/max)*140,2)}px`,transition:"height .3s",minHeight:2}}/><span style={{fontSize:10,color:T.dateText,fontWeight:600}}>{MONTHS[i]}</span></div>)}</div></div>}

// ═══════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════
export default function Home(){
  const[page,setPage]=useState("import");const[txns,setTxns]=useState([]);const[proc,setProc]=useState(false);const[prog,setProg]=useState(null);
  const[gTok,setGTok]=useState("");const[oTok,setOTok]=useState("");const[apiKey,setApiKey]=useState("");
  const[wTok,setWTok]=useState("");const[gCId,setGCId]=useState("");
  const[modal,setModal]=useState(null);const[filt,setFilt]=useState("all");
  const[imp,setImp]=useState(new Set());const[thresh,setThresh]=useState(THR_DEF);
  const[rProg,setRProg]=useState(null);const[sel,setSel]=useState(new Set());const[sort,setSort]=useState({field:"date",dir:"asc"});
  const[edId,setEdId]=useState(null);const[edVal,setEdVal]=useState("");const[cCat,setCCat]=useState("");const[cSrc,setCSrc]=useState("");
  const[anchorAcct,setAnchorAcct]=useState(WAVE_ANCHORS[0].id);const[expenseAcct,setExpenseAcct]=useState(WAVE_EXPENSES[0].id);
  const[pushProg,setPushProg]=useState(null);const[pushLog,setPushLog]=useState([]);

  // localStorage persistence
  useEffect(()=>{try{const s=localStorage.getItem("wavebot-settings");if(s){const d=JSON.parse(s);if(d.wTok)setWTok(d.wTok);if(d.gTok)setGTok(d.gTok);if(d.oTok)setOTok(d.oTok);if(d.apiKey)setApiKey(d.apiKey);if(d.gCId)setGCId(d.gCId);if(d.anchorAcct)setAnchorAcct(d.anchorAcct);if(d.expenseAcct)setExpenseAcct(d.expenseAcct)}}catch(e){}},[]);
  const saveSettings=()=>{try{localStorage.setItem("wavebot-settings",JSON.stringify({wTok,gTok,oTok,apiKey,gCId,anchorAcct,expenseAcct}))}catch(e){}};
  useEffect(()=>{const h=e=>{if(e.data?.type==="oauth_token"){if(e.data.provider==="gmail")setGTok(e.data.token);else if(e.data.provider==="outlook")setOTok(e.data.token)}};window.addEventListener("message",h);return()=>window.removeEventListener("message",h)},[]);
  const cGmail=()=>{if(!gCId){alert("Enter Client ID");return}window.open(`https://accounts.google.com/o/oauth2/v2/auth?client_id=${gCId}&redirect_uri=${encodeURIComponent(window.location.origin+"/api/auth")}&response_type=token&scope=${encodeURIComponent("https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send")}&state=gmail&prompt=consent`,"_blank","width=500,height=600")};

  // ─── Import ─────────────────────────────────────
  const importSrc=useCallback(async(file,source)=>{if(!file)return;setProc(true);const sp=(pct,detail)=>setProg({pct:Math.min(100,Math.round(pct)),detail});sp(2,"Reading...");const text=await file.text();let parsed=[];if(source==="creditcard")parsed=parseCC(text);else if(source==="doordash")parsed=parseDD(text);else if(source==="ubereats")parsed=parseUber(text,true);else if(source==="uber")parsed=parseUber(text,false);sp(10,`${parsed.length} orders`);if(!parsed.length){sp(100,"No transactions found");setTimeout(()=>{setProc(false);setProg(null)},2e3);return}sp(15,"Dedup...");const all2=[...txns.filter(t=>t.status!=="in_wave"),...parsed.map((t,i)=>({...t,id:`${source}-${i}-${Date.now()}`,category:null,confidence:null,status:"pending"}))];const final=intDedup(crossDedup(all2)).map(t=>({...t,id:t.id||`m-${Math.random().toString(36).slice(2)}`,status:t.isDuplicate?"duplicate":(t.status||"pending")}));sp(25,"Descriptions...");final.filter(t=>!t.description&&t.status!=="duplicate").forEach(t=>{t.description=genDesc(t)});sp(35,"Categorizing...");const needAI=[];for(const t of final){if(t.status==="duplicate")continue;if(!t.category){const lc=localCat(t);if(lc){t.category=lc.category;t.confidence=lc.confidence}else needAI.push(t)}}if(needAI.length>0&&apiKey){const res=await aiCatP(needAI,40,apiKey,d=>{sp(35+(d/needAI.length)*55,`AI: ${d}/${needAI.length}`)});res.forEach((r,i)=>{if(r&&needAI[i]){const idx=final.findIndex(t=>t.id===needAI[i].id);if(idx!==-1){final[idx].category=r.category;final[idx].confidence=r.confidence}}})}sp(95,"Finalizing...");let result=final.map(t=>({...t,category:t.category||"Other / Uncategorized",description:t.description||genDesc(t),status:t.status==="duplicate"?"duplicate":(t.confidence>=80?"approved":t.status),needsReceipt:t.status!=="duplicate"}));sp(100,"✅ Done");setTxns(result);setImp(p=>new Set([...p,source]));await new Promise(r=>setTimeout(r,500));setProc(false);setProg(null);setPage("review")},[txns,thresh,apiKey]);

  // ─── Receipt search ─────────────────────────────
  const findOne=useCallback(async id=>{if(!gTok&&!oTok){alert("Connect email first");return}const t=txns.find(x=>x.id===id);if(!t)return;const r=await findReceipt(t,gTok,oTok);if(r.found){const upd={receiptFound:true,receiptLink:r.link,receiptSubject:r.subject,receiptProvider:r.provider,receiptMsgId:r.messageId};if(r.receiptAmount&&r.receiptAmount>t.amount){upd.csvAmount=t.amount;upd.amount=r.receiptAmount}setTxns(p=>p.map(x=>x.id===id?{...x,...upd}:x))}else alert(`No receipt found for ${(t.description||"").slice(0,40)}`)},[txns,gTok,oTok]);
  const findBulk=useCallback(async ids=>{if(!gTok&&!oTok){alert("Connect email first");return}const targets=ids||[...sel];const ts2=txns.filter(t=>targets.includes(t.id)&&!t.receiptFound&&t.status!=="duplicate");if(!ts2.length){alert("Nothing to search");return}setRProg({done:0,total:ts2.length});for(let i=0;i<ts2.length;i++){const r=await findReceipt(ts2[i],gTok,oTok);if(r.found){const upd={receiptFound:true,receiptLink:r.link,receiptSubject:r.subject,receiptProvider:r.provider,receiptMsgId:r.messageId};if(r.receiptAmount&&r.receiptAmount>ts2[i].amount){upd.csvAmount=ts2[i].amount;upd.amount=r.receiptAmount}setTxns(p=>p.map(t=>t.id===ts2[i].id?{...t,...upd}:t))}setRProg({done:i+1,total:ts2.length})}setRProg(null)},[txns,gTok,oTok,sel]);
  const findAllReceipts=useCallback(()=>{findBulk(txns.filter(t=>!t.receiptFound&&t.status!=="duplicate").map(t=>t.id))},[txns,findBulk]);

  // ─── Forward receipt to Wave via Gmail ───────────
  const forwardReceipt=useCallback(async(t)=>{if(!gTok||!t.receiptMsgId)return{forwarded:false};try{const raw=btoa(`To: ${RECEIPT_EMAIL}\r\nSubject: Fwd: ${t.receiptSubject||"Receipt"}\r\nContent-Type: text/plain\r\n\r\nForwarded receipt for: ${waveDesc(t)} - $${t.amount.toFixed(2)} on ${nd(t.date)}`).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");const r=await fetch(`https://www.googleapis.com/gmail/v1/users/me/messages/${t.receiptMsgId}/forward`,{method:"POST",headers:{Authorization:`Bearer ${gTok}`,"Content-Type":"application/json"}});if(!r.ok){const r2=await fetch("https://www.googleapis.com/gmail/v1/users/me/messages/send",{method:"POST",headers:{Authorization:`Bearer ${gTok}`,"Content-Type":"application/json"},body:JSON.stringify({raw})});return{forwarded:r2.ok}}return{forwarded:true}}catch(e){console.error("Forward failed:",e);return{forwarded:false}}},[gTok]);

  // ─── Push to Wave ───────────────────────────────
  const pushOne=useCallback(async(t)=>{try{const r=await fetch("/api/wave",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token:wTok,query:`mutation($input:MoneyTransactionCreateInput!){moneyTransactionCreate(input:$input){didSucceed inputErrors{path message}transaction{id}}}`,variables:{input:{businessId:BIZ_ID,externalId:`exp-${t.id}-${Date.now()}`,date:nd(t.date),description:waveDesc(t),notes:`${t.description||""}${t.receiptLink?" | Receipt: "+t.receiptLink:""}`,anchor:{accountId:anchorAcct,amount:t.amount,direction:"WITHDRAWAL"},lineItems:[{accountId:waveExpenseId(t.category),amount:t.amount,balance:"INCREASE"}]}}})});const d=await r.json();if(d?.data?.moneyTransactionCreate?.didSucceed){const waveId=d.data.moneyTransactionCreate.transaction.id;if(t.receiptFound&&t.receiptMsgId&&gTok){await forwardReceipt(t)}return{success:true,waveId}}else{const errs=d?.data?.moneyTransactionCreate?.inputErrors||d?.errors||[];return{success:false,error:errs.map(e=>e.message).join(", ")||"Unknown error"}}}catch(e){return{success:false,error:e.message}}},[wTok,anchorAcct,gTok,forwardReceipt]);

  const pushAll=useCallback(async()=>{const approved=txns.filter(t=>t.status==="approved");if(!approved.length){alert("No approved transactions");return}if(!wTok){alert("Enter Wave API token in Settings");return}setPushProg({done:0,total:approved.length});const log=[];for(let i=0;i<approved.length;i++){const t=approved[i];const r=await pushOne(t);log.push({id:t.id,desc:waveDesc(t),amt:t.amount,...r});if(r.success)setTxns(p=>p.map(x=>x.id===t.id?{...x,status:"pushed",waveId:r.waveId}:x));setPushProg({done:i+1,total:approved.length});await new Promise(r=>setTimeout(r,300))}setPushLog(log);setPushProg(null)},[txns,wTok,pushOne]);

  const testPushOne=useCallback(async(id)=>{const t=txns.find(x=>x.id===id);if(!t)return;if(!wTok){alert("Enter Wave API token in Settings");return}const r=await pushOne(t);if(r.success){setTxns(p=>p.map(x=>x.id===id?{...x,status:"pushed",waveId:r.waveId}:x));alert(`✅ Pushed! Wave ID: ${r.waveId}${t.receiptFound?" | Receipt forwarded to Wave":""}`);}else{alert(`❌ Error: ${r.error}`)}},[txns,wTok,pushOne]);

  // ─── Filtering & Sorting ───────────────────────
  const fil=useMemo(()=>{let f=txns.filter(t=>{if(filt==="all")return true;if(filt==="large")return t.amount>=75;if(filt==="dup")return t.status==="duplicate";if(filt==="norec")return!t.receiptFound&&t.status!=="duplicate";return t.source===filt});f.sort((a,b)=>{let va,vb;if(sort.field==="date"){va=nd(a.date);vb=nd(b.date)}else if(sort.field==="amount"){va=a.amount;vb=b.amount}else if(sort.field==="description"){va=(a.description||"").toLowerCase();vb=(b.description||"").toLowerCase()}else if(sort.field==="category"){va=a.category||"";vb=b.category||""}else{va=a[sort.field]||"";vb=b[sort.field]||""}if(va<vb)return sort.dir==="asc"?-1:1;if(va>vb)return sort.dir==="asc"?1:-1;return 0});return f},[txns,filt,sort]);
  const C={all:txns.length,ok:txns.filter(t=>t.status==="approved").length,pend:txns.filter(t=>t.status==="pending").length,dup:txns.filter(t=>t.status==="duplicate").length,pushed:txns.filter(t=>t.status==="pushed").length,norec:txns.filter(t=>!t.receiptFound&&t.status!=="duplicate").length};
  const toggle=id=>setTxns(p=>p.map(t=>t.id===id&&t.status!=="duplicate"?{...t,status:t.status==="approved"?"pending":"approved"}:t));
  const setCatFn=(id,c)=>setTxns(p=>p.map(t=>t.id===id?{...t,category:c}:t));
  const saveDesc=id=>{setTxns(p=>p.map(t=>t.id===id?{...t,description:edVal}:t));setEdId(null)};
  const toggleSel=id=>setSel(p=>{const n=new Set(p);n.has(id)?n.delete(id):n.add(id);return n});
  const selAll=()=>{setSel(new Set(fil.filter(t=>t.status!=="duplicate").map(t=>t.id)))};
  const clrSel=()=>setSel(new Set());
  const grid="26px 42px 88px 1fr 140px 78px 36px 44px 52px";

  return (
    <div style={{minHeight:"100vh",background:T.bg,color:T.text,fontFamily:"'Outfit','DM Sans',system-ui,sans-serif"}}>
      <style>{`*{box-sizing:border-box;margin:0}::-webkit-scrollbar{width:5px}::-webkit-scrollbar-thumb{background:${T.border};border-radius:3px}select{appearance:none}`}</style>
      <header style={{background:T.card,borderBottom:`1px solid ${T.border}`,padding:"12px 22px",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:50}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:32,height:32,borderRadius:8,background:`linear-gradient(135deg,${T.accent},#c084fc)`,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,fontSize:15,color:"#fff"}}>W</div>
          <span style={{fontWeight:800,fontSize:14}}>Wave Expense Bot</span>
          <span style={{fontSize:9,color:T.dim,background:T.accentBg,padding:"2px 6px",borderRadius:4}}>TY{TY}</span>
          <span style={{fontSize:9,color:T.dim,background:`${T.purple}15`,padding:"2px 6px",borderRadius:4}}>{APP_VERSION}</span>
          {gTok&&<span style={{fontSize:9,color:T.green,background:T.greenBg,padding:"2px 6px",borderRadius:4}}>📧Gmail</span>}
          {oTok&&<span style={{fontSize:9,color:T.blue,background:T.blueBg,padding:"2px 6px",borderRadius:4}}>📧Outlook</span>}
          {wTok&&<span style={{fontSize:9,color:T.purple,background:T.purpleBg,padding:"2px 6px",borderRadius:4}}>🌊Wave</span>}
        </div>
        <nav style={{display:"flex",gap:4}}>{[["import","📥 Import"],["review","📋 Review"],["summary","📊 Summary"],["push","🚀 Push"],["settings","⚙"]].map(([k,l])=><button key={k} onClick={()=>!proc&&setPage(k)} style={{...bt(),background:page===k?T.accentBg:"transparent",color:page===k?T.accent:T.dim}}>{l}</button>)}</nav>
      </header>

      <main style={{maxWidth:1200,margin:"0 auto",padding:"24px 18px"}}>
        {page==="import"&&<><div style={{textAlign:"center",marginBottom:28}}><h1 style={{fontSize:24,fontWeight:900}}>Import — <span style={{background:`linear-gradient(135deg,${T.accent},#c084fc)`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>Tax Year {TY}</span></h1></div>{prog&&<div style={{background:T.card,border:`1px solid ${T.accent}30`,borderRadius:14,padding:22,marginBottom:22}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><span style={{fontWeight:700}}>{prog.detail}</span><span style={{fontWeight:800,color:T.accent}}>{prog.pct}%</span></div><div style={{height:7,background:T.bg,borderRadius:4,overflow:"hidden"}}><div style={{height:"100%",width:`${prog.pct}%`,background:`linear-gradient(90deg,${T.accent},${T.purple})`,borderRadius:4,transition:"width .3s"}}/></div></div>}<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:14,opacity:proc?.3:1,pointerEvents:proc?"none":"auto"}}><IC icon="🟢" title="Uber Eats" sub="Data export" color={T.ubereats} desc="Items aggregated per order. Receipts from Gmail." onFile={f=>importSrc(f,"ubereats")} isActive={imp.has("ubereats")}/><IC icon="🔴" title="DoorDash" sub="Orders" color={T.doordash} desc="Restaurant details. Receipts from Gmail/Outlook." onFile={f=>importSrc(f,"doordash")} isActive={imp.has("doordash")}/><IC icon="🚗" title="Uber Rides" sub="Trips" color="#888" desc="Pickup → dropoff routes." onFile={f=>importSrc(f,"uber")} isActive={imp.has("uber")}/><IC icon="💳" title="Credit Card" sub="Bank CSV" color={T.accent} desc="Updates amounts from CC statement." onFile={f=>importSrc(f,"creditcard")} isActive={imp.has("creditcard")}/></div></>}

        {page==="review"&&<><div style={{display:"flex",gap:7,marginBottom:16,flexWrap:"wrap"}}>{[["Total",C.all,T.text],["Approved",C.ok,T.green],["Pending",C.pend,T.amber],["Pushed",C.pushed,T.blue],["Dupes",C.dup,T.red],["No Receipt",C.norec,T.amber]].map(([l,c,color])=><div key={l} style={{flex:1,minWidth:80,padding:"10px 12px",background:T.card,borderRadius:9,border:`1px solid ${T.border}`}}><div style={{fontSize:9,color:T.dim,textTransform:"uppercase"}}>{l}</div><div style={{fontSize:18,fontWeight:800,color}}>{c}</div></div>)}</div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12,flexWrap:"wrap",gap:8}}>
            <div style={{display:"flex",gap:3,flexWrap:"wrap"}}>{[["all","All"],["ubereats","🟢UE"],["doordash","🔴DD"],["uber","🚗UR"],["creditcard","💳CC"],["norec","📎!"],["dup","🔄"]].map(([k,l])=><button key={k} onClick={()=>setFilt(k)} style={{...bt(),fontSize:10,padding:"4px 8px",background:filt===k?T.accentBg:"transparent",color:filt===k?T.accent:T.dim}}>{l}</button>)}</div>
            <div style={{display:"flex",gap:4,alignItems:"center"}}>
              {sel.size>0&&<button onClick={()=>findBulk()} style={{...bt(),background:T.accentBg,color:T.accent}}>📧 Search {sel.size}</button>}
              {sel.size>0&&<button onClick={clrSel} style={{...bt(),color:T.dim,padding:"4px 8px"}}>✕</button>}
              {rProg?<button style={{...bt(),background:T.accentBg,color:T.accent}}>📧 {rProg.done}/{rProg.total}...</button>:<button onClick={findAllReceipts} style={{...bt(),background:T.purpleBg,color:T.purple}}>📧 All receipts</button>}
              <button onClick={()=>setTxns(p=>p.map(t=>t.status==="pending"?{...t,status:"approved"}:t))} style={{...bt(),background:T.greenBg,color:T.green}}>✓ All</button>
              <button onClick={()=>setPage("push")} style={{...bt(),background:C.ok?T.accent:T.border,color:C.ok?"#fff":T.dim}}>🚀 {C.ok}</button>
            </div>
          </div>
          <div style={{background:T.card,borderRadius:11,border:`1px solid ${T.border}`,overflow:"hidden"}}>
            <div style={{display:"grid",gridTemplateColumns:grid,padding:"8px 12px",fontSize:9,fontWeight:700,color:T.dim,textTransform:"uppercase",background:T.cardHover}}>
              <span><input type="checkbox" checked={sel.size>0&&sel.size===fil.filter(t=>t.status!=="duplicate").length} onChange={e=>e.target.checked?selAll():clrSel()} style={{cursor:"pointer"}}/></span>
              <SH label="Src" field="source" sort={sort} setSort={setSort}/>
              <SH label="Date" field="date" sort={sort} setSort={setSort}/>
              <SH label="Description" field="description" sort={sort} setSort={setSort}/>
              <SH label="Category" field="category" sort={sort} setSort={setSort}/>
              <span style={{textAlign:"right"}}><SH label="Amt" field="amount" sort={sort} setSort={setSort}/></span>
              <span style={{textAlign:"center"}}>AI</span>
              <SH label="St" field="status" sort={sort} setSort={setSort}/>
              <span></span>
            </div>
            <div style={{maxHeight:500,overflowY:"auto"}}>
              {!fil.length&&<div style={{padding:36,textAlign:"center",color:T.dim}}>No results</div>}
              {fil.map(t=><div key={t.id} style={{display:"grid",gridTemplateColumns:grid,padding:"7px 12px",alignItems:"center",fontSize:11,borderTop:`1px solid ${T.border}`,opacity:t.status==="duplicate"?.2:1,background:sel.has(t.id)?`${T.accent}12`:t.status==="approved"?T.greenBg:t.status==="pushed"?T.blueBg:"transparent"}}>
                <span><input type="checkbox" checked={sel.has(t.id)} onChange={()=>toggleSel(t.id)} style={{cursor:"pointer"}}/></span>
                <span><SB source={t.source}/></span>
                <span style={{color:T.dateText,fontSize:11,fontWeight:600}}>{fd(t.date)}</span>
                <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",paddingRight:6,cursor:"text"}} onClick={()=>{setEdId(t.id);setEdVal(t.description||"")}}>
                  {edId===t.id?<input autoFocus value={edVal} onChange={e=>setEdVal(e.target.value)} onBlur={()=>saveDesc(t.id)} onKeyDown={e=>{if(e.key==="Enter")saveDesc(t.id);if(e.key==="Escape")setEdId(null)}} style={{...iSt(),fontSize:11,padding:"2px 4px",width:"100%"}}/>:<span style={{fontWeight:500}}>{t.description}{t.receiptFound&&<span style={{marginLeft:3,fontSize:8,color:T.green}}>📧✓</span>}{!t.receiptFound&&t.status!=="duplicate"&&<span style={{marginLeft:3,fontSize:8,color:T.red}}>📎!</span>}</span>}
                </span>
                <span><select value={t.category||""} onChange={e=>setCatFn(t.id,e.target.value)} style={{background:T.bg,color:T.text,border:`1px solid ${T.border}`,borderRadius:4,padding:"2px 4px",fontSize:10,width:"100%",outline:"none"}}>{CATS.map(c=><option key={c}>{c}</option>)}</select></span>
                <span style={{textAlign:"right",fontWeight:600,color:t.csvAmount?T.green:T.text}}>{t.csvAmount&&<span style={{fontSize:8,color:T.green,marginRight:2}}>↑</span>}${t.amount.toFixed(2)}</span>
                <span style={{textAlign:"center"}}>{t.confidence!=null&&<Cf v={t.confidence}/>}</span>
                <span style={{textAlign:"center",cursor:"pointer"}} onClick={()=>toggle(t.id)}><StB status={t.status}/></span>
                <span style={{display:"flex",gap:2}}>
                  <button onClick={()=>setModal(t)} style={{background:"none",border:"none",cursor:"pointer",fontSize:11}} title="Details">🔍</button>
                  <button onClick={()=>findOne(t.id)} style={{background:"none",border:"none",cursor:"pointer",fontSize:11}} title="Find receipt">📧</button>
                </span>
              </div>)}
            </div>
          </div>
          <div style={{marginTop:8,fontSize:10,color:T.dim}}>Click description to edit · Click status to toggle · ☑ select → 📧 bulk search · Headers sort</div>
        </>}

        {page==="summary"&&<><h2 style={{fontSize:20,fontWeight:800,marginBottom:20}}>📊 Summary — TY{TY}</h2><div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}><select value={cCat} onChange={e=>setCCat(e.target.value)} style={{...iSt(),width:220,fontSize:11}}><option value="">All Categories</option>{CATS.map(c=><option key={c} value={c}>{c}</option>)}</select><select value={cSrc} onChange={e=>setCSrc(e.target.value)} style={{...iSt(),width:160,fontSize:11}}><option value="">All Sources</option>{Object.entries(SRC).map(([k,v])=><option key={k} value={k}>{v.icon} {v.label}</option>)}</select></div><div style={{background:T.card,borderRadius:14,border:`1px solid ${T.border}`,padding:24,marginBottom:20}}><MonthlyChart txns={txns} catFilter={cCat} srcFilter={cSrc}/></div><div style={{background:T.card,borderRadius:14,border:`1px solid ${T.border}`,padding:20}}><div style={{fontSize:13,fontWeight:700,marginBottom:12}}>By Category</div>{CATS.map(cat=>{const ct=txns.filter(t=>t.category===cat&&t.status!=="duplicate");const tot=ct.reduce((s,t)=>s+t.amount,0);if(tot===0)return null;const grand=txns.filter(t=>t.status!=="duplicate").reduce((s,t)=>s+t.amount,0)||1;return<div key={cat} style={{display:"flex",alignItems:"center",gap:10,padding:"6px 0",borderBottom:`1px solid ${T.border}`}}><span style={{flex:1,fontSize:11,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{cat}</span><div style={{width:120,height:6,background:T.bg,borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",width:`${(tot/grand)*100}%`,background:T.accent,borderRadius:3}}/></div><span style={{fontSize:11,fontWeight:600,color:T.accent,minWidth:70,textAlign:"right"}}>${tot.toFixed(2)}</span><span style={{fontSize:10,color:T.dim,minWidth:25,textAlign:"right"}}>{ct.length}</span></div>}).filter(Boolean)}</div></>}

        {page==="push"&&<div style={{maxWidth:640,margin:"20px auto"}}><h2 style={{fontSize:18,fontWeight:800,marginBottom:16,textAlign:"center"}}>🚀 Push to Wave — TY{TY}</h2>
          {!wTok?<div style={{textAlign:"center",padding:20,background:T.card,borderRadius:10,border:`1px solid ${T.border}`}}><p style={{color:T.dim,marginBottom:12}}>Wave API token needed</p><button onClick={()=>setPage("settings")} style={{...bt(),background:T.accent,color:"#fff"}}>⚙ Settings</button></div>:<>
            <div style={{background:T.card,borderRadius:10,border:`1px solid ${T.border}`,padding:16,marginBottom:16}}>
              <div style={{display:"flex",gap:12,marginBottom:12}}>
                <label style={{flex:1}}><div style={{fontSize:9,color:T.dim,marginBottom:3}}>ANCHOR (CC/Bank)</div><select value={anchorAcct} onChange={e=>{setAnchorAcct(e.target.value)}} style={{...iSt(),fontSize:11}}>{WAVE_ANCHORS.map(a=><option key={a.id} value={a.id}>{a.name} ({a.type})</option>)}</select></label>
                <label style={{flex:1}}><div style={{fontSize:9,color:T.dim,marginBottom:3}}>DEFAULT EXPENSE</div><select value={expenseAcct} onChange={e=>{setExpenseAcct(e.target.value)}} style={{...iSt(),fontSize:11}}>{WAVE_EXPENSES.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
              </div>
              <div style={{fontSize:10,color:T.dim}}>Expense account auto-selected per category. Anchor applies to all. {gTok?"📧 Receipts will be forwarded to Wave.":"⚠ Connect Gmail to forward receipts."}</div>
            </div>
            {pushProg&&<div style={{background:T.accentBg,borderRadius:8,padding:12,marginBottom:12}}><div style={{display:"flex",justifyContent:"space-between",fontSize:12}}><span>Pushing...</span><span style={{fontWeight:700,color:T.accent}}>{pushProg.done}/{pushProg.total}</span></div><div style={{height:4,background:T.bg,borderRadius:2,marginTop:6,overflow:"hidden"}}><div style={{height:"100%",width:`${(pushProg.done/pushProg.total)*100}%`,background:T.accent,borderRadius:2}}/></div></div>}
            {pushLog.length>0&&<div style={{background:T.card,borderRadius:8,border:`1px solid ${T.border}`,padding:12,marginBottom:12,maxHeight:150,overflowY:"auto"}}>{pushLog.map((l,i)=><div key={i} style={{fontSize:10,padding:"2px 0",color:l.success?T.green:T.red}}>{l.success?"✅":"❌"} {l.desc} ${l.amt.toFixed(2)} {l.error||""}</div>)}</div>}
            <div style={{background:T.card,borderRadius:10,border:`1px solid ${T.border}`,padding:12,maxHeight:320,overflowY:"auto"}}>
              {txns.filter(t=>t.status==="approved"||t.status==="pushed").map(t=><div key={t.id} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:`1px solid ${T.border}`,fontSize:11,opacity:t.status==="pushed"?.5:1}}>
                <span style={{display:"flex",alignItems:"center",gap:5}}><SB source={t.source}/><span style={{maxWidth:280,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{waveDesc(t)}</span>{t.receiptFound&&<span style={{fontSize:8,color:T.green}}>📧</span>}</span>
                <span style={{display:"flex",alignItems:"center",gap:6}}><span style={{fontWeight:600}}>${t.amount.toFixed(2)}</span>{t.status==="pushed"?<span style={{fontSize:9,color:T.green}}>✓</span>:<button onClick={()=>testPushOne(t.id)} style={{...bt(),padding:"2px 8px",fontSize:9,background:T.greenBg,color:T.green}}>Test</button>}</span>
              </div>)}
            </div>
            <div style={{display:"flex",gap:8,marginTop:14}}><button onClick={()=>setPage("review")} style={{...bt(),flex:1}}>← Review</button><button onClick={pushAll} disabled={!!pushProg} style={{...bt(),flex:2,background:T.green,color:"#000",fontWeight:700,opacity:pushProg?.5:1}}>🚀 Push {C.ok} Approved</button></div>
          </>}
        </div>}

        {page==="settings"&&<div style={{maxWidth:500,margin:"28px auto"}}><h2 style={{fontSize:18,fontWeight:800,marginBottom:16}}>⚙ Settings</h2><div style={{background:T.card,borderRadius:14,border:`1px solid ${T.border}`,padding:22}}>
          <Sc t="Wave API"><In l="API Token" type="password" v={wTok} set={setWTok} ph="Wave Full Access token"/></Sc>
          <Sc t="Anthropic API"><In l="Key" type="password" v={apiKey} set={setApiKey} ph="sk-ant-... (optional, for AI categorization)"/></Sc>
          <Sc t="📧 Gmail"><In l="OAuth Client ID" v={gCId} set={setGCId} ph="Google Cloud client ID"/>{gCId&&!gTok&&<button onClick={cGmail} style={{...bt(),width:"100%",marginBottom:8,background:`${T.green}15`,color:T.green}}>🔗 Connect Gmail (read + send)</button>}{gTok&&<div style={{background:T.greenBg,borderRadius:6,padding:8,fontSize:11,color:T.green,marginBottom:8}}>✅ Gmail connected</div>}<In l="Or paste token" type="password" v={gTok} set={setGTok} ph="From OAuth Playground"/></Sc>
          <Sc t="📧 Outlook"><In l="Or paste token" type="password" v={oTok} set={setOTok} ph="Outlook token for DoorDash receipts"/></Sc>
          <button onClick={()=>{saveSettings();setPage(txns.length?"review":"import")}} style={{...bt(),width:"100%",marginTop:12,background:T.accent,color:"#fff"}}>💾 Save Settings</button>
        </div></div>}
      </main>

      {modal&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.7)",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(4px)"}} onClick={()=>setModal(null)}>
        <div onClick={e=>e.stopPropagation()} style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:14,padding:24,maxWidth:520,width:"90%",maxHeight:"80vh",overflowY:"auto"}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:14}}><h3 style={{fontSize:14,fontWeight:700,margin:0}}>Details</h3><button onClick={()=>setModal(null)} style={{...bt(),padding:"3px 8px"}}>✕</button></div>
          <div style={{display:"grid",gap:7,fontSize:12}}>
            <DR l="Date">{fd(modal.date)}</DR>
            <DR l="Wave Desc"><span style={{color:T.accent}}>{waveDesc(modal)}</span></DR>
            <DR l="Notes"><span style={{color:T.green,fontSize:11}}>{modal.description}</span></DR>
            <DR l="Amount" b>{modal.csvAmount?<span><span style={{textDecoration:"line-through",color:T.dim,marginRight:6}}>${modal.csvAmount.toFixed(2)}</span><span style={{color:T.green}}>${modal.amount.toFixed(2)} ↑</span></span>:<span>${modal.amount.toFixed(2)}</span>}</DR>
            <DR l="Source"><SB source={modal.source}/></DR>
            <DR l="Category">{modal.category}</DR>
            {modal.restaurant&&<DR l="Restaurant">{modal.restaurant}</DR>}
            {modal.items&&<DR l="Items"><span style={{fontSize:11,color:T.dim,whiteSpace:"normal",lineHeight:1.5}}>{modal.items}</span></DR>}
            {modal.pickup&&<DR l="Route">{modal.pickup} → {modal.dropoff}</DR>}
            <DR l="Receipt">{modal.receiptFound?<a href={modal.receiptLink} target="_blank" rel="noreferrer" style={{color:T.green,textDecoration:"underline"}}>📧 {modal.receiptSubject?.slice(0,50)}</a>:<div style={{display:"flex",gap:6,alignItems:"center"}}><Bd bg={T.redBg} color={T.red}>Missing</Bd><button onClick={()=>findOne(modal.id)} style={{...bt(),padding:"2px 8px",fontSize:10,background:T.accentBg,color:T.accent}}>📧 Search</button></div>}</DR>
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

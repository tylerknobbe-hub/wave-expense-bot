"use client";
import { useState, useCallback, useRef, useEffect, useMemo } from "react";

const T={bg:"#08090e",card:"#10111a",cardHover:"#161724",border:"#1c1d30",text:"#dcdff0",dim:"#555775",accent:"#818cf8",accentBg:"rgba(129,140,248,0.1)",green:"#4ade80",greenBg:"rgba(74,222,128,0.08)",red:"#fb7185",redBg:"rgba(251,113,133,0.08)",amber:"#fbbf24",amberBg:"rgba(251,191,36,0.08)",blue:"#60a5fa",blueBg:"rgba(96,165,250,0.08)",purple:"#c084fc",purpleBg:"rgba(192,132,252,0.08)",doordash:"#FF3008",ubereats:"#06C167",dateText:"#b0b4cc",cyan:"#22d3ee",cyanBg:"rgba(34,211,238,0.08)"};
const CATS=["Advertising & Promotion","Bank Charges & Fees","Business Meals & Entertainment","Car & Truck Expenses","Contractors & Freelancers","Education & Training","Equipment & Hardware","Insurance","Interest & Penalties","Legal & Professional Services","Office Supplies & Software","Rent & Lease","Repairs & Maintenance","Shipping & Delivery","Subscriptions & Memberships","Taxes & Licenses","Telephone & Internet","Travel & Lodging","Utilities","Wages & Salaries","Other / Uncategorized"];
const MONTHS=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const TY=2025,TYS=`${TY}-01-01`,TYE=`${TY}-12-31`,THR_DEF=75;
const SRC={creditcard:{label:"Credit Card",icon:"💳",color:T.accent},doordash:{label:"DoorDash",icon:"🔴",color:T.doordash},ubereats:{label:"Uber Eats",icon:"🟢",color:T.ubereats},uber:{label:"Uber Rides",icon:"🚗",color:"#aaa"},copilot:{label:"Copilot",icon:"📊",color:T.cyan}};
const PHASES=[{k:"parse",l:"Parsing",i:"📄"},{k:"dedup",l:"Dedup",i:"🔄"},{k:"desc",l:"Descriptions",i:"✍️"},{k:"cat",l:"Categorizing",i:"🤖"},{k:"wave",l:"Wave Check",i:"🌊"},{k:"done",l:"Done",i:"✅"}];
const COFFEE=/starbucks|dunkin|peet|philz|blue\s*bottle|coffee|cafe|latte|espresso|dutch\s*bros|republik coffee/i;
const OFFICE=/amazon|staples|office\s*depot|best\s*buy|adobe|microsoft|google|dropbox|zoom|slack|notion|figma|canva|github|atlassian|1password|typeform|wave pro|openai|claude\.ai/i;

// Copilot category → Wave category mapping
const COPILOT_CAT_MAP={
  "Restaurants":"Business Meals & Entertainment","Groceries":"Business Meals & Entertainment",
  "Transportation":"Car & Truck Expenses","Car":"Car & Truck Expenses",
  "Travel & Vacation":"Travel & Lodging","Subscriptions":"Subscriptions & Memberships",
  "Insurance":"Insurance","Rent":"Rent & Lease","Utilities":"Utilities","Gym":"Other / Uncategorized",
  "Shops":"Office Supplies & Software","Clothing":"Other / Uncategorized","Home":"Repairs & Maintenance",
  "Personal Care":"Other / Uncategorized","Other":"Other / Uncategorized","Healthcare":"Other / Uncategorized",
  "Donations":"Other / Uncategorized","Student Loans":"Interest & Penalties",
};
// Auto-exclude rules for Copilot
const COPILOT_EXCLUDE_TYPES=new Set(["internal transfer","income"]);
const COPILOT_EXCLUDE_CATS=new Set(["Healthcare","Donations"]);
const COPILOT_EXCLUDE_PATTERNS=/pediatric|village birth|interest charge|purchase interest|withdrawal made|ca dmv|student loan|payment.*thank|autopay/i;

function nd(s){try{const d=new Date(s);return isNaN(d)?s:d.toISOString().split("T")[0]}catch{return s}}
function inTY(s){const d=nd(s);return d>=TYS&&d<=TYE}
function fd(s){try{const d=new Date(s);if(isNaN(d))return s;return`${d.getMonth()+1}/${d.getDate()}/${String(d.getFullYear()).slice(2)}`}catch{return s}}
function mt(s){try{const h=new Date(s).getHours();return h<11?"breakfast":h<15?"lunch":"dinner"}catch{return"meal"}}
function cl(l){const r=[];let c="",q=false;for(const ch of l){if(ch==='"')q=!q;else if(ch===','&&!q){r.push(c.trim());c=""}else c+=ch}r.push(c.trim());return r}
function dayBefore(d){const dt=new Date(d);dt.setDate(dt.getDate()-1);return dt.toISOString().split("T")[0]}
function dayAfter(d){const dt=new Date(d);dt.setDate(dt.getDate()+2);return dt.toISOString().split("T")[0]}
function stripQ(s){return(s||"").replace(/^"|"$/g,"").trim()}

// ─── PARSERS ──────────────────────────────────────
function parseCC(t){const ls=t.trim().split("\n");if(ls.length<2)return[];const h=ls[0].split(",").map(s=>s.replace(/"/g,"").trim().toLowerCase());const di=h.findIndex(x=>/date/.test(x)),desc=h.findIndex(x=>/desc|narr|merchant|memo|detail|name/.test(x)),ai=h.findIndex(x=>/amount|debit|charge|total/.test(x));if(di===-1||ai===-1)return[];return ls.slice(1).map(l=>{const c=cl(l);const raw=(c[ai]||"").replace(/[^0-9.\-]/g,"");const date=c[di]?.trim()||"";if(!inTY(date))return null;const m=c[desc>=0?desc:di+1]?.trim()||"Unknown";return{date,description:m,rawMerchant:m,amount:Math.abs(parseFloat(raw)||0),source:"creditcard"}}).filter(t=>t&&t.amount>0)}

function parseDD(t){const ls=t.trim().split("\n");if(ls.length<2)return[];const h=ls[0].split(",").map(s=>s.replace(/"/g,"").trim().toLowerCase());const di=h.findIndex(x=>/date|order.*date|created/.test(x)),st=h.findIndex(x=>/store|restaurant|merchant/.test(x)),to=h.findIndex(x=>/total|amount|subtotal|charge/.test(x)),oi=h.findIndex(x=>/order.*id|id/.test(x)),it=h.findIndex(x=>/items|order.*items|description/.test(x));return ls.slice(1).map(l=>{const c=cl(l);const raw=(c[to>=0?to:0]||"").replace(/[^0-9.\-]/g,"");const amt=Math.abs(parseFloat(raw)||0);const date=c[di>=0?di:0]?.trim()||"";if(!amt||!inTY(date))return null;const r=c[st>=0?st:1]?.trim()||"restaurant";return{date,restaurant:r,rawDescription:`DoorDash — ${r}`,description:"",amount:amt,source:"doordash",orderId:c[oi>=0?oi:0]?.trim(),items:c[it>=0?it:-1]?.trim()||null}}).filter(Boolean)}

function parseUber(text,isEats=false){const lines=text.trim().split("\n");if(lines.length<2)return[];const h=lines[0].split(",").map(s=>s.replace(/"/g,"").trim().toLowerCase());const di=h.findIndex(x=>/date|request.*time|begin/.test(x));if(isEats){let restI=h.findIndex(x=>/^restaurant/.test(x));if(restI===-1)restI=h.findIndex(x=>/store|merchant/.test(x));if(restI===-1){const ci=h.findIndex(x=>/city|region|market|area/.test(x));restI=ci!==1?1:2}let opI=h.findIndex(x=>/^order.*(price|total)/.test(x));if(opI===-1)opI=h.findIndex(x=>/total|fare/.test(x));if(opI===-1)opI=h.findIndex(x=>/amount|price/.test(x));const inI=h.findIndex(x=>/^item.*(name|desc)/.test(x));const iqI=h.findIndex(x=>/item.*quant/.test(x));const raw=lines.slice(1).map(l=>{const c=cl(l);const date=c[di>=0?di:0]?.trim()||"";if(!inTY(date))return null;const r=c[restI]?.trim()||"";const op=Math.abs(parseFloat((c[opI]||"").replace(/[^0-9.\-]/g,""))||0);if(!op)return null;const iN=inI>=0?(c[inI]?.trim()||""):"";const iQ=iqI>=0?parseInt(c[iqI])||1:1;return{date,restaurant:r,orderPrice:op,itemName:iN,itemQty:iQ}}).filter(Boolean);const om=new Map();for(const r of raw){const k=`${r.date}|${r.restaurant}|${r.orderPrice}`;if(!om.has(k))om.set(k,{date:r.date,restaurant:r.restaurant,amount:r.orderPrice,items:[]});if(r.itemName){const o=om.get(k);o.items.push(`${r.itemQty>1?r.itemQty+"x ":""}${r.itemName}`)}}return Array.from(om.values()).map(o=>({date:o.date,restaurant:o.restaurant||"restaurant",rawDescription:`Uber Eats — ${o.restaurant||"restaurant"}`,description:"",amount:o.amount,source:"ubereats",items:o.items.length?o.items.join(", "):null}))}else{const tot=h.findIndex(x=>/total|fare/.test(x));const prI=tot>=0?tot:h.findIndex(x=>/amount|price/.test(x));const piI=h.findIndex(x=>/pickup|begin.*addr|from|start.*addr|origin/.test(x));const drI=h.findIndex(x=>/dropoff|end.*addr|destination|drop/.test(x));const ciI=h.findIndex(x=>/city|region|market/.test(x));return lines.slice(1).map(l=>{const c=cl(l);const raw2=(c[prI>=0?prI:0]||"").replace(/[^0-9.\-]/g,"");const amt=Math.abs(parseFloat(raw2)||0);const date=c[di>=0?di:0]?.trim()||"";if(!amt||!inTY(date))return null;let pu=piI>=0?c[piI]?.trim():"";let dr=drI>=0?c[drI]?.trim():"";if(!pu||/^\d{4}-/.test(pu))pu=ciI>=0?c[ciI]?.trim()||"office":"office";if(!dr||/^\d{4}-/.test(dr))dr="meeting";return{date,pickup:pu,dropoff:dr,rawDescription:`Uber — ${pu} → ${dr}`,description:"",amount:amt,source:"uber"}}).filter(Boolean)}}

// ─── COPILOT MONEY PARSER ─────────────────────────
function parseCopilot(text) {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return { include: [], exclude: [], triage: [] };

  const h = lines[0].split(",").map(s => stripQ(s).toLowerCase());
  const dateI = h.findIndex(x => x === "date");
  const nameI = h.findIndex(x => x === "name");
  const amtI = h.findIndex(x => x === "amount");
  const statusI = h.findIndex(x => x === "status");
  const catI = h.findIndex(x => x === "category");
  const parentCatI = h.findIndex(x => x === "parent category");
  const excludedI = h.findIndex(x => x === "excluded");
  const typeI = h.findIndex(x => x === "type");
  const accountI = h.findIndex(x => x === "account");
  const maskI = h.findIndex(x => x === "account mask");
  const noteI = h.findIndex(x => x === "note");

  const include = [], exclude = [], triage = [];

  for (let i = 1; i < lines.length; i++) {
    const c = cl(lines[i]);
    const date = stripQ(c[dateI] || "");
    if (!inTY(date)) continue;
    const name = stripQ(c[nameI] || "");
    const amt = parseFloat(stripQ(c[amtI] || "0")) || 0;
    const cat = stripQ(c[catI] || "");
    const parentCat = stripQ(c[parentCatI] || "");
    const excluded = stripQ(c[excludedI] || "");
    const typ = stripQ(c[typeI] || "");
    const account = stripQ(c[accountI] || "");
    const mask = stripQ(c[maskI] || "");
    const note = stripQ(c[noteI] || "");

    const txn = {
      date, description: name, rawMerchant: name, amount: Math.abs(amt),
      source: "copilot", copilotCategory: cat, copilotParentCategory: parentCat,
      copilotAccount: `${account} (${mask})`, copilotType: typ, copilotNote: note,
      isCredit: amt < 0,
    };

    // Auto-exclude
    if (COPILOT_EXCLUDE_TYPES.has(typ)) { exclude.push({ ...txn, excludeReason: "Transfer/income" }); continue; }
    if (excluded === "true") { exclude.push({ ...txn, excludeReason: "Excluded in Copilot" }); continue; }
    if (amt <= 0) { exclude.push({ ...txn, excludeReason: "Credit/refund" }); continue; }
    if (COPILOT_EXCLUDE_CATS.has(cat)) { exclude.push({ ...txn, excludeReason: `Category: ${cat}` }); continue; }
    if (COPILOT_EXCLUDE_PATTERNS.test(name)) { exclude.push({ ...txn, excludeReason: "Pattern match" }); continue; }

    // Map category
    txn.category = COPILOT_CAT_MAP[cat] || "Other / Uncategorized";
    txn.confidence = cat && COPILOT_CAT_MAP[cat] ? 88 : 50;

    // Smart description
    const nm = name.toLowerCase();
    if (/uber eats|ubereats/.test(nm)) txn.description = `Business meal — ${name} (via Copilot)`;
    else if (/dd \*doordash|doordash/.test(nm)) {
      const rest = name.replace(/dd \*doordash\s*/i, "").trim();
      txn.description = `Business meal at ${rest || "restaurant"} (DoorDash, via Copilot)`;
    }
    else if (/uber(?! eats)/i.test(nm) && cat === "Transportation") txn.description = `Uber ride — ${name}, for meetings related to Sun or various other projects`;
    else if (COFFEE.test(nm)) txn.description = amt < 15 ? `Coffee — ${name}` : `Business meal at ${name}`;
    else if (OFFICE.test(nm)) { txn.description = `Office supplies — ${name}`; txn.category = "Office Supplies & Software"; txn.confidence = 90; }
    else if (/fedex|ups|usps/i.test(nm)) { txn.description = `Shipping — ${name}`; txn.category = "Shipping & Delivery"; txn.confidence = 92; }
    else if (/spectrum|at&t|verizon|t-mobile/i.test(nm)) { txn.description = `${name} — telecom`; txn.category = "Telephone & Internet"; txn.confidence = 90; }
    else if (/airbnb|marriott|hilton|hyatt|hotel|courtyard/i.test(nm)) { txn.description = `Business travel — ${name}`; txn.category = "Travel & Lodging"; txn.confidence = 90; }
    else if (/airline|delta air|united|american air|southwest|swa\*/i.test(nm)) { txn.description = `Business travel — ${name}`; txn.category = "Travel & Lodging"; txn.confidence = 90; }
    else if (/enterprise|alamo|hertz|avis/i.test(nm)) { txn.description = `Car rental — ${name}`; txn.category = "Car & Truck Expenses"; txn.confidence = 90; }
    else if (/gusto/i.test(nm)) { txn.description = `Payroll — ${name}`; txn.category = "Wages & Salaries"; txn.confidence = 92; }
    else if (cat === "Restaurants") txn.description = `Business meal at ${name}`;
    else if (cat === "Groceries") txn.description = `Business groceries — ${name}`;
    else txn.description = `${name} — business expense`;

    // Auto-include known business categories
    if (["Restaurants","Groceries","Transportation","Car","Travel & Vacation","Subscriptions",
         "Insurance","Rent","Utilities","Gym","Shops","Clothing","Home"].includes(cat)) {
      include.push(txn);
    } else {
      // "Other", "Personal Care", empty — needs triage
      triage.push(txn);
    }
  }
  return { include, exclude, triage };
}

// ─── DESCRIPTIONS & CATEGORIZATION ────────────────
function genDesc(t){if(t.source==="doordash"||t.source==="ubereats"){const r=t.restaurant||"restaurant";const p=t.source==="doordash"?"DoorDash":"Uber Eats";if(t.amount<15){if(COFFEE.test(r))return`Coffee at ${r} (${p})`;return`Snack at ${r} (${p})`}return`Business ${mt(t.date)} at ${r} (${p}) to discuss ongoing projects`}if(t.source==="uber")return`Uber ride: ${t.pickup||"office"} → ${t.dropoff||"meeting"}, for meetings related to Sun or various other projects`;if(t.source==="copilot")return t.description||`${t.rawMerchant} — business expense`;const m=t.rawMerchant||t.description||"";if(OFFICE.test(m)&&t.amount<500)return`Office supplies — ${m}`;if(COFFEE.test(m)&&t.amount<15)return`Coffee — ${m}`;return m}
function localCat(t){if(t.source==="copilot"&&t.category&&t.category!=="Other / Uncategorized")return{category:t.category,confidence:t.confidence||88};const d=(t.rawDescription||t.description||t.rawMerchant||"").toLowerCase();if(t.source==="doordash"||t.source==="ubereats")return{category:"Business Meals & Entertainment",confidence:95};if(t.source==="uber")return{category:"Car & Truck Expenses",confidence:92};if(COFFEE.test(d)&&t.amount<15)return{category:"Business Meals & Entertainment",confidence:90};if(OFFICE.test(d))return{category:"Office Supplies & Software",confidence:t.amount<200?90:85};if(/at&t|verizon|t-mobile|comcast|spectrum|xfinity|internet|phone|cellular/i.test(d))return{category:"Telephone & Internet",confidence:90};if(/insurance|geico|state\s*farm|allstate/i.test(d))return{category:"Insurance",confidence:88};if(/hotel|marriott|hilton|hyatt|airbnb/i.test(d))return{category:"Travel & Lodging",confidence:90};if(/fedex|ups|usps|shipping|postage/i.test(d))return{category:"Shipping & Delivery",confidence:92};return null}

// ─── AI ───────────────────────────────────────────
async function aiCat(items,apiKey){const prompt=`Bookkeeping: categorize for TY${TY}. Categories: ${CATS.join(", ")}\nRules: Office supply merchants→"Office Supplies & Software". Food delivery→"Business Meals & Entertainment". Uber rides→"Car & Truck Expenses".\nReturn ONLY JSON array: [{"index":0,"category":"...","confidence":85}]\n${items.map((t,i)=>`${i}. "${t.rawDescription||t.description}" $${t.amount.toFixed(2)}`).join("\n")}`;try{const r=await fetch("/api/categorize",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({anthropicKey:apiKey,prompt})});const d=await r.json();const txt=d.content?.map(b=>b.text||"").join("")||"";return JSON.parse(txt.replace(/```json|```/g,"").trim())}catch(e){return null}}
async function aiCatP(items,bs,apiKey,onP){const res=new Array(items.length).fill(null);let done=0;const batches=[];for(let i=0;i<items.length;i+=bs)batches.push({s:i,b:items.slice(i,i+bs)});let bi=0;async function w(){while(bi<batches.length){const{s,b}=batches[bi++];const cats=await aiCat(b,apiKey);if(cats)cats.forEach(c=>{if(c.index+s<items.length)res[c.index+s]=c});done+=b.length;onP(done)}}await Promise.all(Array.from({length:Math.min(2,batches.length)},()=>w()));return res}

// ─── RECEIPT SEARCH ───────────────────────────────
function buildQ(t){const d=nd(t.date);const bef=dayAfter(d);const aft=dayBefore(d);if(t.source==="ubereats"||/uber eats|ubereats/i.test(t.rawMerchant||"")){const r=(t.restaurant||t.rawMerchant||"").split("(")[0].trim().split(" ").slice(0,2).join(" ");return`from:uber subject:order ${r} after:${aft} before:${bef}`}if(t.source==="uber"||/^uber(?! eats)/i.test(t.rawMerchant||""))return`from:uber subject:trip after:${aft} before:${bef}`;if(t.source==="doordash"||/doordash/i.test(t.rawMerchant||"")){const r=(t.restaurant||t.rawMerchant||"").replace(/dd \*doordash\s*/i,"").split(" ").slice(0,2).join(" ");return`from:doordash ${r} after:${aft} before:${bef}`}return`receipt ${(t.rawMerchant||t.description||"").split(" ").slice(0,2).join(" ")} after:${aft} before:${bef}`}
function buildQB(t){const d=nd(t.date);const bef=dayAfter(d);const aft=dayBefore(d);if(t.source==="ubereats"||/uber eats/i.test(t.rawMerchant||""))return`from:uber after:${aft} before:${bef}`;if(t.source==="uber"||/^uber/i.test(t.rawMerchant||""))return`from:uber trip after:${aft} before:${bef}`;if(t.source==="doordash"||/doordash/i.test(t.rawMerchant||""))return`from:doordash after:${aft} before:${bef}`;return`receipt after:${aft} before:${bef}`}
async function findReceipt(t,gTok,oTok){if(gTok){try{const r=await fetch("/api/gmail",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token:gTok,query:buildQ(t)})});const d=await r.json();if(d.found)return d}catch(e){}try{const r=await fetch("/api/gmail",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token:gTok,query:buildQB(t)})});const d=await r.json();if(d.found)return d}catch(e){}}if(oTok){const d2=nd(t.date);const q=(/uber/i.test(t.rawMerchant||""))?`from:uber AND (subject:receipt OR subject:trip) AND received>=${dayBefore(d2)}`:(/doordash/i.test(t.rawMerchant||""))?`from:doordash AND subject:receipt AND received>=${dayBefore(d2)}`:`subject:receipt AND body:${t.amount.toFixed(2)} AND received>=${dayBefore(d2)}`;try{const r=await fetch("/api/outlook",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token:oTok,query:q})});const d3=await r.json();if(d3.found)return d3}catch(e){}}return{found:false}}

// ─── WAVE & DEDUP ─────────────────────────────────
async function fetchWaveAccounts(tok,biz){const q=`query($b:ID!){business(id:$b){id name accounts{edges{node{id name type{name value}subtype{name value}normalBalanceType isArchived}}}}}`;const r=await fetch("/api/wave",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token:tok,query:q,variables:{b:biz}})});const d=await r.json();if(d?.errors)throw new Error(d.errors[0]?.message||"API error");const accts=d?.data?.business?.accounts?.edges?.map(e=>e.node).filter(a=>!a.isArchived)||[];const bizName=d?.data?.business?.name||"";return{accounts:accts,businessName:bizName}}
function mergeWave(imp,wave){const u=new Set();return imp.map(t=>{if(t.status==="duplicate")return t;const td=nd(t.date);for(let i=0;i<wave.length;i++){if(u.has(i))continue;if(Math.abs(t.amount-wave[i].amount)<.03&&Math.abs((new Date(td)-new Date(nd(wave[i].date)))/864e5)<=1){u.add(i);return{...t,status:"in_wave",waveMatch:wave[i],waveId:wave[i].waveId,waveHasReceipt:wave[i].hasReceipt}}}return t})}
function crossDedup(a){const pl=a.filter(t=>t.source!=="creditcard"&&t.source!=="copilot"),cc=a.filter(t=>t.source==="creditcard"||t.source==="copilot"),m=new Set(),r=[...pl.map(t=>({...t,matchedCC:false}))];for(const c of cc){const cd=nd(c.date);let f=false;for(let i=0;i<pl.length;i++){if(m.has(i))continue;const amtDiff=Math.abs(c.amount-pl[i].amount);const amtPct=amtDiff/Math.max(c.amount,pl[i].amount,1);const dateOk=Math.abs((new Date(cd)-new Date(nd(pl[i].date)))/864e5)<=1;if(dateOk&&(amtDiff<0.02||amtPct<0.15)){m.add(i);r[i].matchedCC=true;r[i].ccDescription=c.description;if(c.amount>pl[i].amount){r[i].csvAmount=pl[i].amount;r[i].amount=c.amount}f=true;break}}if(!f)r.push({...c,matchedCC:false})}return r}
function intDedup(ts){const s=new Set();return ts.map(t=>{const k=`${nd(t.date)}|${t.amount.toFixed(2)}|${t.source}|${(t.rawDescription||t.description||"").slice(0,20).toLowerCase()}`;if(s.has(k))return{...t,isDuplicate:true};s.add(k);return{...t,isDuplicate:false}})}

// ─── UI COMPONENTS ────────────────────────────────
function Bd({children,bg,color}){return <span style={{background:bg,color,padding:"2px 8px",borderRadius:5,fontSize:10,fontWeight:700,letterSpacing:.5,textTransform:"uppercase",whiteSpace:"nowrap"}}>{children}</span>}
function SB({source}){const m=SRC[source]||SRC.creditcard;const short={creditcard:"CC",doordash:"DD",ubereats:"UE",uber:"UR",copilot:"CP"};return <Bd bg={`${m.color}18`} color={m.color}>{m.icon}{short[source]||""}</Bd>}
function StB({status}){const m={pending:[T.amberBg,T.amber,"Pending"],approved:[T.greenBg,T.green,"OK"],duplicate:[T.redBg,T.red,"Dupe"],in_wave:[T.purpleBg,T.purple,"Wave"],pushed:[T.blueBg,T.blue,"Synced"],skipped:[`${T.dim}20`,T.dim,"Skip"]};const[bg,c,l]=m[status]||m.pending;return <Bd bg={bg} color={c}>{l}</Bd>}
function Cf({v}){const c=v>=80?T.green:v>=50?T.amber:T.red;return <span style={{fontSize:11,color:c,display:"inline-flex",alignItems:"center",gap:2}}><span style={{width:5,height:5,borderRadius:"50%",background:c}}/>{v}%</span>}
function SH({label,field,sort,setSort}){const a=sort.field===field;return <span onClick={()=>setSort({field,dir:a&&sort.dir==="asc"?"desc":"asc"})} style={{cursor:"pointer",userSelect:"none",display:"inline-flex",alignItems:"center",gap:2}}>{label}<span style={{fontSize:7,color:a?T.accent:T.dim}}>{a?(sort.dir==="asc"?"▲":"▼"):"⇅"}</span></span>}
function PP({p}){if(!p)return null;return <div style={{background:T.card,border:`1px solid ${T.accent}30`,borderRadius:14,padding:22,marginBottom:22}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}><span style={{fontWeight:700,fontSize:14}}>Processing — TY{TY}</span><span style={{fontSize:20,fontWeight:800,color:T.accent}}>{p.pct}%</span></div><div style={{height:7,background:T.bg,borderRadius:4,overflow:"hidden",marginBottom:16}}><div style={{height:"100%",width:`${p.pct}%`,background:`linear-gradient(90deg,${T.accent},${T.purple})`,borderRadius:4,transition:"width .3s"}}/></div><div style={{background:T.bg,borderRadius:8,padding:"10px 12px",display:"flex",alignItems:"center",gap:10}}><div style={{width:16,height:16,border:`2px solid ${T.accent}`,borderTopColor:"transparent",borderRadius:"50%",animation:"sp .7s linear infinite",flexShrink:0}}/><div style={{flex:1}}><div style={{fontSize:12,fontWeight:600}}>{PHASES[p.phase]?.i} {PHASES[p.phase]?.l}{p.total>0&&<span style={{color:T.dim,fontWeight:400,marginLeft:6}}>{p.cur}/{p.total}</span>}</div>{p.detail&&<div style={{fontSize:10,color:T.dim}}>{p.detail}</div>}</div></div><style>{`@keyframes sp{to{transform:rotate(360deg)}}`}</style></div>}
function IC({icon,title,sub,color,desc,onFile,isActive}){const ref=useRef();return <div style={{background:T.card,border:`1px solid ${isActive?color:T.border}`,borderRadius:14,padding:20,position:"relative",overflow:"hidden"}}>{isActive&&<div style={{position:"absolute",top:0,left:0,right:0,height:2,background:color}}/>}<div style={{display:"flex",alignItems:"center",gap:9,marginBottom:8}}><span style={{fontSize:20}}>{icon}</span><div><div style={{fontWeight:700,fontSize:13}}>{title}</div><div style={{fontSize:10,color:T.dim}}>{sub}</div></div></div><p style={{fontSize:11,color:T.dim,lineHeight:1.6,marginBottom:12}}>{desc}</p><button onClick={()=>ref.current?.click()} style={{...bt(),width:"100%",background:`${color}15`,color,borderColor:`${color}30`}}>📁 Upload CSV</button><input ref={ref} type="file" accept=".csv" style={{display:"none"}} onChange={e=>onFile(e.target.files[0])}/></div>}
function MonthlyChart({txns,catFilter,srcFilter}){const data=useMemo(()=>{const m=Array(12).fill(0);txns.filter(t=>t.status!=="duplicate"&&t.status!=="in_wave"&&t.status!=="skipped").filter(t=>!catFilter||t.category===catFilter).filter(t=>!srcFilter||t.source===srcFilter).forEach(t=>{const mo=new Date(t.date).getMonth();if(mo>=0&&mo<12)m[mo]+=t.amount});return m},[txns,catFilter,srcFilter]);const max=Math.max(...data,1);const total=data.reduce((a,b)=>a+b,0);return <div><div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}><span style={{fontSize:13,fontWeight:700}}>Monthly Expenses — TY{TY}</span><span style={{fontSize:13,fontWeight:700,color:T.accent}}>${total.toFixed(2)}</span></div><div style={{display:"flex",alignItems:"flex-end",gap:6,height:180,padding:"0 4px"}}>{data.map((v,i)=><div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}><span style={{fontSize:9,color:T.dim}}>{v>0?`$${Math.round(v)}`:""}</span><div style={{width:"100%",background:v>0?`linear-gradient(180deg,${T.accent},${T.purple})`:`${T.dim}20`,borderRadius:4,height:`${Math.max((v/max)*140,2)}px`,transition:"height .3s",minHeight:2}}/><span style={{fontSize:10,color:T.dateText,fontWeight:600}}>{MONTHS[i]}</span></div>)}</div></div>}

// ─── TRIAGE COMPONENT ─────────────────────────────
function TriagePanel({items,onKeep,onDiscard,onKeepAll,onDiscardAll}) {
  const [idx, setIdx] = useState(0);
  const grouped = useMemo(() => {
    const g = {};
    items.forEach(t => { const c = t.copilotCategory || "Other"; if (!g[c]) g[c] = []; g[c].push(t); });
    return Object.entries(g).sort((a, b) => b[1].length - a[1].length);
  }, [items]);
  if (!items.length) return <div style={{textAlign:"center",padding:40,color:T.dim}}>No items to triage</div>;
  const t = items[idx];
  return (
    <div style={{background:T.card,borderRadius:14,border:`1px solid ${T.border}`,padding:24}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <span style={{fontWeight:700,fontSize:15}}>Triage — {items.length} transactions</span>
        <div style={{display:"flex",gap:6}}>
          <button onClick={onKeepAll} style={{...bt(),background:T.greenBg,color:T.green,fontSize:10}}>✓ Keep All {items.length}</button>
          <button onClick={onDiscardAll} style={{...bt(),background:T.redBg,color:T.red,fontSize:10}}>✗ Discard All</button>
        </div>
      </div>
      {/* By category summary */}
      <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:16}}>
        {grouped.map(([cat, txns]) => (
          <Bd key={cat} bg={T.accentBg} color={T.accent}>{cat} ({txns.length})</Bd>
        ))}
      </div>
      {/* Current item */}
      <div style={{background:T.bg,borderRadius:10,padding:16,marginBottom:16}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
          <span style={{color:T.dim,fontSize:11}}>#{idx + 1} of {items.length}</span>
          <span style={{color:T.dateText,fontWeight:600}}>{fd(t.date)}</span>
        </div>
        <div style={{fontSize:16,fontWeight:700,marginBottom:6}}>{t.rawMerchant || t.description}</div>{(() => {const vendor=(t.rawMerchant||t.description||"").toLowerCase().replace(/[^a-z0-9]/g,"").slice(0,20);const matchCount=items.filter(x=>(x.rawMerchant||x.description||"").toLowerCase().replace(/[^a-z0-9]/g,"").slice(0,20)===vendor).length;return matchCount>1?<div style={{fontSize:11,color:T.amber,marginBottom:4}}>⚡ {matchCount} transactions from this vendor — decision applies to all</div>:null})()}
        <div style={{display:"flex",gap:12,marginBottom:8}}>
          <span style={{fontSize:20,fontWeight:800,color:T.accent}}>${t.amount.toFixed(2)}</span>
          <Bd bg={T.cyanBg} color={T.cyan}>{t.copilotCategory || "Other"}</Bd>
          <span style={{fontSize:11,color:T.dim}}>{t.copilotAccount}</span>
        </div>
        <div style={{fontSize:12,color:T.dim}}>→ {t.description}</div>
        <div style={{fontSize:11,color:T.dim,marginTop:4}}>Wave: {t.category}</div>
      </div>
      {/* Actions */}
      <div style={{display:"flex",gap:8}}>
        <button onClick={() => { onDiscard(t); setIdx(Math.min(idx, items.length - 2)); }} style={{...bt(),flex:1,background:T.redBg,color:T.red,padding:12,fontSize:14}}>✗ Discard</button>
        <button onClick={() => { onKeep(t); setIdx(Math.min(idx, items.length - 2)); }} style={{...bt(),flex:2,background:T.green,color:"#000",padding:12,fontSize:14,fontWeight:700}}>✓ Keep as Business</button>
      </div>
      {/* Navigation */}
      <div style={{display:"flex",justifyContent:"center",gap:8,marginTop:12}}>
        <button onClick={() => setIdx(Math.max(0, idx - 1))} disabled={idx === 0} style={{...bt(),opacity:idx===0?.3:1}}>← Prev</button>
        <span style={{fontSize:11,color:T.dim,padding:"6px 0"}}>{idx + 1} / {items.length}</span>
        <button onClick={() => setIdx(Math.min(items.length - 1, idx + 1))} disabled={idx >= items.length - 1} style={{...bt(),opacity:idx>=items.length-1?.3:1}}>Next →</button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════
export default function Home(){
  const[page,setPage]=useState("import");const[txns,setTxns]=useState([]);const[proc,setProc]=useState(false);const[prog,setProg]=useState(null);
  const[wTok,setWTok]=useState("");const[bId,setBId]=useState("");const[gTok,setGTok]=useState("");const[oTok,setOTok]=useState("");const[apiKey,setApiKey]=useState("");
  const[gCId,setGCId]=useState("");const[oCId,setOCId]=useState("");const[modal,setModal]=useState(null);const[filt,setFilt]=useState("all");
  const[imp,setImp]=useState(new Set());const[thresh,setThresh]=useState(THR_DEF);const[wStat,setWStat]=useState("idle");const[wEx,setWEx]=useState([]);const[wErr,setWErr]=useState("");
  const[rProg,setRProg]=useState(null);const[testPushResult,setTestPushResult]=useState(null);const[testPushing,setTestPushing]=useState(false);const[anchorAcct,setAnchorAcct]=useState("");const[expenseAcct,setExpenseAcct]=useState("");const[sel,setSel]=useState(new Set());const[sort,setSort]=useState({field:"date",dir:"asc"});
  const[edId,setEdId]=useState(null);const[edVal,setEdVal]=useState("");const[cCat,setCCat]=useState("");const[cSrc,setCSrc]=useState("");
  // Copilot triage state
  const[triageItems,setTriageItems]=useState([]);const[triageExcluded,setTriageExcluded]=useState([]);const[showTriage,setShowTriage]=useState(false);const[vendorKeep,setVendorKeep]=useState(new Set());const[vendorDiscard,setVendorDiscard]=useState(new Set());

  useEffect(()=>{const h=e=>{if(e.data?.type==="oauth_token"){if(e.data.provider==="gmail")setGTok(e.data.token);else if(e.data.provider==="outlook")setOTok(e.data.token)}};window.addEventListener("message",h);return()=>window.removeEventListener("message",h)},[]);
  const cGmail=()=>{if(!gCId){alert("Enter Client ID");return}window.open(`https://accounts.google.com/o/oauth2/v2/auth?client_id=${gCId}&redirect_uri=${encodeURIComponent(window.location.origin+"/api/auth")}&response_type=token&scope=${encodeURIComponent("https://www.googleapis.com/auth/gmail.readonly")}&state=gmail&prompt=consent`,"_blank","width=500,height=600")};
  const cOutlook=()=>{if(!oCId){alert("Enter Client ID");return}window.open(`https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${oCId}&redirect_uri=${encodeURIComponent(window.location.origin+"/api/auth")}&response_type=token&scope=${encodeURIComponent("https://graph.microsoft.com/Mail.Read")}&state=outlook&prompt=consent`,"_blank","width=500,height=600")};

  // ─── Standard import (CC, DoorDash, Uber Eats, Uber) ───
  const importSrc=useCallback(async(file,source)=>{if(!file)return;setProc(true);const log=[];const al=(t,c)=>{log.push({t,c})};const sp=(phase,cur,total,detail,pct)=>setProg({phase,cur:cur||0,total:total||0,detail:detail||"",pct:Math.min(100,Math.round(pct)),log:[...log]});al(`Reading ${file.name}`,T.accent);sp(0,0,0,"Reading...",2);const text=await file.text();let parsed=[];if(source==="creditcard")parsed=parseCC(text);else if(source==="doordash")parsed=parseDD(text);else if(source==="ubereats")parsed=parseUber(text,true);else if(source==="uber")parsed=parseUber(text,false);al(`${parsed.length} orders for TY${TY}`,T.green);sp(0,parsed.length,parsed.length,"",10);if(!parsed.length){al("No transactions",T.red);setTimeout(()=>{setProc(false);setProg(null)},2500);return}sp(1,0,parsed.length,"Dedup...",15);const all2=[...txns.filter(t=>t.status!=="in_wave"),...parsed.map((t,i)=>({...t,id:`${source}-${i}-${Date.now()}`,category:t.category||null,confidence:t.confidence||null,status:"pending"}))];const final=intDedup(crossDedup(all2)).map(t=>({...t,id:t.id||`m-${Math.random().toString(36).slice(2)}`,status:t.isDuplicate?"duplicate":(t.status||"pending")}));sp(1,parsed.length,parsed.length,"Done",20);sp(2,0,final.length,"",22);final.filter(t=>!t.description&&t.status!=="duplicate").forEach(t=>{t.description=genDesc(t)});sp(2,final.length,final.length,"Done",28);sp(3,0,0,"",30);const needAI=[];for(const t of final){if(t.status==="duplicate")continue;if(!t.category){const lc=localCat(t);if(lc){t.category=lc.category;t.confidence=lc.confidence}else needAI.push(t)}}if(needAI.length>0&&apiKey){const res=await aiCatP(needAI,40,apiKey,d=>{sp(3,d,needAI.length,`${d}/${needAI.length}`,30+(d/needAI.length)*45)});res.forEach((r,i)=>{if(r&&needAI[i]){const idx2=final.findIndex(t=>t.id===needAI[i].id);if(idx2!==-1){final[idx2].category=r.category;final[idx2].confidence=r.confidence}}})}sp(3,needAI.length,needAI.length,"Done",75);let result=final.map(t=>({...t,category:t.category||"Other / Uncategorized",description:t.description||genDesc(t),status:t.status==="duplicate"?"duplicate":(t.confidence>=80?"approved":t.status),needsReceipt:t.amount>=thresh&&t.status!=="duplicate"}));if(wEx.length>0){sp(4,0,wEx.length,"Merging...",80);result=mergeWave(result,wEx)}sp(5,result.length,result.length,"✅",100);setTxns(result);setImp(p=>new Set([...p,source]));await new Promise(r=>setTimeout(r,500));setProc(false);setProg(null);setPage("review")},[txns,thresh,wEx,apiKey]);

  // ─── Copilot import (with triage) ───────────────
  const importCopilot=useCallback(async(file)=>{if(!file)return;setProc(true);setProg({phase:0,cur:0,total:0,detail:"Reading Copilot export...",pct:5,log:[]});const text=await file.text();const{include,exclude,triage}=parseCopilot(text);setProg({phase:0,cur:include.length,total:include.length+triage.length,detail:`${include.length} auto-included, ${triage.length} need review, ${exclude.length} excluded`,pct:50,log:[]});setTriageExcluded(exclude);if(triage.length>0){setTriageItems(triage);setShowTriage(true);setProc(false);setProg(null);// Add auto-included to txns now
  const tagged=include.map((t,i)=>({...t,id:`cop-${i}-${Date.now()}`,status:t.confidence>=80?"approved":"pending",needsReceipt:t.amount>=thresh}));const all2=[...txns,...tagged];const final=intDedup(crossDedup(all2)).map(t=>({...t,id:t.id||`m-${Math.random().toString(36).slice(2)}`,status:t.isDuplicate?"duplicate":(t.status||"pending")}));setTxns(final);setImp(p=>new Set([...p,"copilot"]));setPage("triage")}else{const tagged=include.map((t,i)=>({...t,id:`cop-${i}-${Date.now()}`,status:t.confidence>=80?"approved":"pending",needsReceipt:t.amount>=thresh}));const all2=[...txns,...tagged];const final=intDedup(crossDedup(all2)).map(t=>({...t,id:t.id||`m-${Math.random().toString(36).slice(2)}`,status:t.isDuplicate?"duplicate":(t.status||"pending")}));setTxns(final);setImp(p=>new Set([...p,"copilot"]));setProc(false);setProg(null);setPage("review")}},[txns,thresh]);

  const triageKeep=useCallback((t)=>{const vendor=(t.rawMerchant||t.description||"").toLowerCase().replace(/[^a-z0-9]/g,"").slice(0,20);setVendorKeep(p=>new Set([...p,vendor]));const matching=triageItems.filter(x=>{const v=(x.rawMerchant||x.description||"").toLowerCase().replace(/[^a-z0-9]/g,"").slice(0,20);return v===vendor});const tagged=matching.map((x,i)=>({...x,id:`triage-${Date.now()}-${i}-${Math.random().toString(36).slice(2)}`,status:x.confidence>=80?"approved":"pending",needsReceipt:x.amount>=thresh}));setTxns(p=>[...p,...tagged]);setTriageItems(p=>p.filter(x=>{const v=(x.rawMerchant||x.description||"").toLowerCase().replace(/[^a-z0-9]/g,"").slice(0,20);return v!==vendor}))},[thresh,triageItems]);
  const triageDiscard=useCallback((t)=>{const vendor=(t.rawMerchant||t.description||"").toLowerCase().replace(/[^a-z0-9]/g,"").slice(0,20);setVendorDiscard(p=>new Set([...p,vendor]));setTriageItems(p=>p.filter(x=>{const v=(x.rawMerchant||x.description||"").toLowerCase().replace(/[^a-z0-9]/g,"").slice(0,20);return v!==vendor}))},[triageItems]);
  const triageKeepAll=useCallback(()=>{const tagged=triageItems.map((t,i)=>({...t,id:`triage-${i}-${Date.now()}`,status:t.confidence>=80?"approved":"pending",needsReceipt:t.amount>=thresh}));setTxns(p=>[...p,...tagged]);setTriageItems([])},[triageItems,thresh]);
  const triageDiscardAll=useCallback(()=>{setTriageItems([])},[]);

  // ─── Receipt search ─────────────────────────────
  const findOne=useCallback(async id=>{if(!gTok&&!oTok){alert("Connect email first");return}const t=txns.find(x=>x.id===id);if(!t)return;const r=await findReceipt(t,gTok,oTok);if(r.found){const upd={receiptFound:true,receiptLink:r.link,receiptSubject:r.subject,receiptProvider:r.provider};if(r.receiptAmount&&r.receiptAmount>0){upd.csvAmount=t.amount;upd.amount=r.receiptAmount}setTxns(p=>p.map(x=>x.id===id?{...x,...upd}:x))}else alert(`No receipt found for ${(t.description||"").slice(0,40)}`)},[txns,gTok,oTok]);
  const findBulk=useCallback(async ids=>{if(!gTok&&!oTok){alert("Connect email first");return}const targets=ids||[...sel];const ts2=txns.filter(t=>targets.includes(t.id)&&!t.receiptFound&&t.status!=="duplicate");if(!ts2.length){alert("Nothing to search");return}setRProg({done:0,total:ts2.length});for(let i=0;i<ts2.length;i++){const r=await findReceipt(ts2[i],gTok,oTok);if(r.found){const upd={receiptFound:true,receiptLink:r.link,receiptSubject:r.subject,receiptProvider:r.provider};if(r.receiptAmount&&r.receiptAmount>0){upd.csvAmount=ts2[i].amount;upd.amount=r.receiptAmount}setTxns(p=>p.map(t=>t.id===ts2[i].id?{...t,...upd}:t))}setRProg({done:i+1,total:ts2.length})}setRProg(null)},[txns,gTok,oTok,sel]);
  const findAllReceipts=useCallback(()=>{findBulk(txns.filter(t=>!t.receiptFound&&t.status!=="duplicate"&&t.status!=="skipped").map(t=>t.id))},[txns,findBulk]);
  const findAllMissing=useCallback(()=>{findBulk(txns.filter(t=>t.needsReceipt&&!t.receiptFound&&!t.waveHasReceipt&&t.status!=="duplicate").map(t=>t.id))},[txns,findBulk]);
  const[wAccts,setWAccts]=useState([]);const[wBizName,setWBizName]=useState("");
  const runWave=useCallback(async()=>{if(!wTok||!bId){alert("Enter Wave token and Business ID in Settings first");return}setWStat("checking");setWErr("");try{console.log("Fetching Wave accounts for biz:",bId);const{accounts,businessName}=await fetchWaveAccounts(wTok,bId);console.log("Wave accounts:",accounts.length,businessName);setWAccts(accounts);setWBizName(businessName);setWStat("done")}catch(e){console.error("Wave error:",e);setWStat("error");setWErr(e.message||"Connection failed")}},[wTok,bId]);

  const testPush=useCallback(async(txnId)=>{if(!wTok||!bId){alert("Configure Wave API first");return}const t=txns.find(x=>x.id===txnId);if(!t){alert("Transaction not found");return}setTestPushing(true);setTestPushResult(null);try{const mutation=`mutation($input:MoneyTransactionCreateInput!){moneyTransactionCreate(input:$input){didSucceed inputErrors{path message code}transaction{id}}}`;const input={businessId:bId,externalId:`exp-${t.id}-${Date.now()}`,date:nd(t.date),description:t.description||"Business expense",anchor:{accountId:anchorAcct||"SET_ANCHOR_ACCOUNT_ID",amount:t.amount,direction:"WITHDRAWAL"},lineItems:[{accountId:expenseAcct||"SET_EXPENSE_ACCOUNT_ID",amount:t.amount,balance:"INCREASE"}]};const r=await fetch("/api/wave",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token:wTok,query:mutation,variables:{input}})});const d=await r.json();if(d?.data?.moneyTransactionCreate?.didSucceed){setTestPushResult({success:true,id:d.data.moneyTransactionCreate.transaction.id,desc:t.description});setTxns(p=>p.map(x=>x.id===txnId?{...x,status:"pushed"}:x))}else{const errors=d?.data?.moneyTransactionCreate?.inputErrors||d?.errors||[];setTestPushResult({success:false,error:errors.map(e=>e.message||JSON.stringify(e)).join(", ")||"Unknown error"})}}catch(e){setTestPushResult({success:false,error:e.message})}setTestPushing(false)},[wTok,bId,txns]);
  const fil=useMemo(()=>{let f=txns.filter(t=>{if(filt==="all")return true;if(filt==="large")return t.amount>=thresh;if(filt==="dup")return t.status==="duplicate";if(filt==="wave")return t.status==="in_wave";if(filt==="norec")return t.needsReceipt&&!t.receiptFound&&!t.waveHasReceipt;return t.source===filt});f.sort((a,b)=>{let va,vb;if(sort.field==="date"){va=nd(a.date);vb=nd(b.date)}else if(sort.field==="amount"){va=a.amount;vb=b.amount}else if(sort.field==="description"){va=(a.description||"").toLowerCase();vb=(b.description||"").toLowerCase()}else if(sort.field==="category"){va=a.category||"";vb=b.category||""}else{va=a[sort.field]||"";vb=b[sort.field]||""}if(va<vb)return sort.dir==="asc"?-1:1;if(va>vb)return sort.dir==="asc"?1:-1;return 0});return f},[txns,filt,sort,thresh]);
  const C={all:txns.length,ok:txns.filter(t=>t.status==="approved").length,pend:txns.filter(t=>t.status==="pending").length,dup:txns.filter(t=>t.status==="duplicate").length,wave:txns.filter(t=>t.status==="in_wave").length,norec:txns.filter(t=>t.needsReceipt&&!t.receiptFound&&!t.waveHasReceipt&&t.status!=="duplicate").length};
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
          {gTok&&<span style={{fontSize:9,color:T.green,background:T.greenBg,padding:"2px 6px",borderRadius:4}}>📧Gmail</span>}
          {oTok&&<span style={{fontSize:9,color:T.blue,background:T.blueBg,padding:"2px 6px",borderRadius:4}}>📧Outlook</span>}
        </div>
        <nav style={{display:"flex",gap:4}}>{[["import","📥 Import"],["triage","🔀 Triage"],["review","📋 Review"],["summary","📊 Summary"],["push","🚀 Push"],["settings","⚙"]].map(([k,l])=><button key={k} onClick={()=>!proc&&setPage(k)} style={{...bt(),background:page===k?T.accentBg:"transparent",color:page===k?T.accent:T.dim,position:"relative"}}>{l}{k==="triage"&&triageItems.length>0&&<span style={{position:"absolute",top:-4,right:-4,background:T.red,color:"#fff",borderRadius:8,fontSize:8,fontWeight:700,padding:"1px 4px",minWidth:14,textAlign:"center"}}>{triageItems.length}</span>}</button>)}</nav>
      </header>

      <main style={{maxWidth:1200,margin:"0 auto",padding:"24px 18px"}}>
        {page==="import"&&<><div style={{textAlign:"center",marginBottom:28}}><h1 style={{fontSize:24,fontWeight:900}}>Import — <span style={{background:`linear-gradient(135deg,${T.accent},#c084fc)`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>Tax Year {TY}</span></h1><p style={{color:T.dim,fontSize:12,marginTop:5}}>Import from any source. Copilot Money for full account history. Smart auto-categorization.</p></div><PP p={prog}/><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:14,opacity:proc?.3:1,pointerEvents:proc?"none":"auto"}}><IC icon="📊" title="Copilot Money" sub="Full export" color={T.cyan} desc="All accounts. Smart triage — keep/discard business vs personal." onFile={f=>importCopilot(f)} isActive={imp.has("copilot")}/><IC icon="💳" title="Credit Card" sub="Bank CSV" color={T.accent} desc="Updates amounts from CC statement." onFile={f=>importSrc(f,"creditcard")} isActive={imp.has("creditcard")}/><IC icon="🔴" title="DoorDash" sub="Orders" color={T.doordash} desc="Restaurant + item details." onFile={f=>importSrc(f,"doordash")} isActive={imp.has("doordash")}/><IC icon="🟢" title="Uber Eats" sub="Data export" color={T.ubereats} desc="Items aggregated per order." onFile={f=>importSrc(f,"ubereats")} isActive={imp.has("ubereats")}/><IC icon="🚗" title="Uber Rides" sub="Trips" color="#888" desc="Pickup → dropoff routes." onFile={f=>importSrc(f,"uber")} isActive={imp.has("uber")}/></div>{imp.size>0&&!proc&&<div style={{marginTop:18,background:T.card,borderRadius:10,border:`1px solid ${T.border}`,padding:"12px 16px",display:"flex",alignItems:"center",justifyContent:"space-between"}}><div style={{display:"flex",gap:5}}>{[...imp].map(s=><Bd key={s} bg={`${SRC[s].color}18`} color={SRC[s].color}>{SRC[s].icon} {SRC[s].label}</Bd>)}</div><button onClick={()=>setPage(triageItems.length>0?"triage":"review")} style={{...bt(),background:T.accent,color:"#fff"}}>{triageItems.length>0?`Triage ${triageItems.length} →`:`Review ${txns.length} →`}</button></div>}</>}

        {page==="triage"&&<><h2 style={{fontSize:20,fontWeight:800,marginBottom:6}}>🔀 Triage — Keep or Discard</h2><p style={{color:T.dim,fontSize:12,marginBottom:20}}>{triageItems.length} transactions need your decision. {triageExcluded.length} were auto-excluded.</p><TriagePanel items={triageItems} onKeep={triageKeep} onDiscard={triageDiscard} onKeepAll={()=>{triageKeepAll();setPage("review")}} onDiscardAll={()=>{triageDiscardAll();setPage("review")}}/>{triageItems.length===0&&<div style={{marginTop:20,textAlign:"center"}}><button onClick={()=>setPage("review")} style={{...bt(),background:T.accent,color:"#fff",padding:12}}>📋 Review All Transactions →</button></div>}</>}

        {page==="review"&&<><div style={{display:"flex",gap:7,marginBottom:16,flexWrap:"wrap"}}>{[["Total",C.all,T.text],["Approved",C.ok,T.green],["Pending",C.pend,T.amber],["Wave",C.wave,T.purple],["Dupes",C.dup,T.red],["No Receipt",C.norec,T.red]].map(([l,c,color])=><div key={l} style={{flex:1,minWidth:80,padding:"10px 12px",background:T.card,borderRadius:9,border:`1px solid ${T.border}`}}><div style={{fontSize:9,color:T.dim,textTransform:"uppercase"}}>{l}</div><div style={{fontSize:18,fontWeight:800,color}}>{c}</div></div>)}</div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12,flexWrap:"wrap",gap:8}}>
            <div style={{display:"flex",gap:3,flexWrap:"wrap"}}>{[["all","All"],["copilot","📊 CP"],["creditcard","💳 CC"],["doordash","🔴 DD"],["ubereats","🟢 UE"],["uber","🚗 UR"],["wave","🌊"],["norec","📎!"],["large","💰"],["dup","🔄"]].map(([k,l])=><button key={k} onClick={()=>setFilt(k)} style={{...bt(),fontSize:10,padding:"4px 8px",background:filt===k?T.accentBg:"transparent",color:filt===k?T.accent:T.dim}}>{l}</button>)}</div>
            <div style={{display:"flex",gap:4,alignItems:"center"}}>
              {sel.size>0&&<button onClick={()=>findBulk()} style={{...bt(),background:T.accentBg,color:T.accent}}>📧 Search {sel.size}</button>}
              {sel.size>0&&<button onClick={clrSel} style={{...bt(),color:T.dim,padding:"4px 8px"}}>✕</button>}
              {rProg?<button style={{...bt(),background:T.accentBg,color:T.accent}}>📧 {rProg.done}/{rProg.total}...</button>:<><button onClick={findAllReceipts} style={{...bt(),background:T.purpleBg,color:T.purple}}>📧 All</button>{C.norec>0&&<button onClick={findAllMissing} style={{...bt(),background:T.amberBg,color:T.amber}}>📧 {C.norec} missing</button>}</>}
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
            <div style={{maxHeight:440,overflowY:"auto"}}>
              {!fil.length&&<div style={{padding:36,textAlign:"center",color:T.dim}}>No results</div>}
              {fil.map(t=><div key={t.id} style={{display:"grid",gridTemplateColumns:grid,padding:"7px 12px",alignItems:"center",fontSize:11,borderTop:`1px solid ${T.border}`,opacity:t.status==="duplicate"?.2:t.status==="in_wave"?.55:1,background:sel.has(t.id)?`${T.accent}12`:t.status==="approved"?T.greenBg:t.status==="in_wave"?T.purpleBg:"transparent"}}>
                <span><input type="checkbox" checked={sel.has(t.id)} onChange={()=>toggleSel(t.id)} style={{cursor:"pointer"}}/></span>
                <span><SB source={t.source}/></span>
                <span style={{color:T.dateText,fontSize:11,fontWeight:600}}>{fd(t.date)}</span>
                <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",paddingRight:6,cursor:"text"}} onClick={()=>{setEdId(t.id);setEdVal(t.description||"")}}>
                  {edId===t.id?<input autoFocus value={edVal} onChange={e=>setEdVal(e.target.value)} onBlur={()=>saveDesc(t.id)} onKeyDown={e=>{if(e.key==="Enter")saveDesc(t.id);if(e.key==="Escape")setEdId(null)}} style={{...iSt(),fontSize:11,padding:"2px 4px",width:"100%"}}/>:<span style={{fontWeight:500}}>{t.description}{t.receiptFound&&<span style={{marginLeft:3,fontSize:8,color:T.green}}>📧✓</span>}{t.needsReceipt&&!t.receiptFound&&!t.waveHasReceipt&&<span style={{marginLeft:3,fontSize:8,color:T.red}}>📎!</span>}</span>}
                </span>
                <span><select value={t.category||""} onChange={e=>setCatFn(t.id,e.target.value)} style={{background:T.bg,color:T.text,border:`1px solid ${T.border}`,borderRadius:4,padding:"2px 4px",fontSize:10,width:"100%",outline:"none"}}>{CATS.map(c=><option key={c}>{c}</option>)}</select></span>
                <span style={{textAlign:"right",fontWeight:600,color:t.csvAmount?T.green:t.amount>=thresh?T.amber:T.text}}>{t.csvAmount&&<span style={{fontSize:8,color:T.green,marginRight:2}}>↑</span>}${t.amount.toFixed(2)}</span>
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

        {page==="summary"&&<><h2 style={{fontSize:20,fontWeight:800,marginBottom:20}}>📊 Summary — TY{TY}</h2><div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}><select value={cCat} onChange={e=>setCCat(e.target.value)} style={{...iSt(),width:220,fontSize:11}}><option value="">All Categories</option>{CATS.map(c=><option key={c} value={c}>{c}</option>)}</select><select value={cSrc} onChange={e=>setCSrc(e.target.value)} style={{...iSt(),width:160,fontSize:11}}><option value="">All Sources</option>{Object.entries(SRC).map(([k,v])=><option key={k} value={k}>{v.icon} {v.label}</option>)}</select></div><div style={{background:T.card,borderRadius:14,border:`1px solid ${T.border}`,padding:24,marginBottom:20}}><MonthlyChart txns={txns} catFilter={cCat} srcFilter={cSrc}/></div><div style={{background:T.card,borderRadius:14,border:`1px solid ${T.border}`,padding:20}}><div style={{fontSize:13,fontWeight:700,marginBottom:12}}>By Category</div>{CATS.map(cat=>{const ct=txns.filter(t=>t.category===cat&&t.status!=="duplicate"&&t.status!=="in_wave"&&t.status!=="skipped").filter(t=>!cSrc||t.source===cSrc);const tot=ct.reduce((s,t)=>s+t.amount,0);if(tot===0)return null;const grand=txns.filter(t=>t.status!=="duplicate"&&t.status!=="in_wave"&&t.status!=="skipped").reduce((s,t)=>s+t.amount,0)||1;return<div key={cat} style={{display:"flex",alignItems:"center",gap:10,padding:"6px 0",borderBottom:`1px solid ${T.border}`}}><span style={{flex:1,fontSize:11,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{cat}</span><div style={{width:120,height:6,background:T.bg,borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",width:`${(tot/grand)*100}%`,background:T.accent,borderRadius:3}}/></div><span style={{fontSize:11,fontWeight:600,color:T.accent,minWidth:70,textAlign:"right"}}>${tot.toFixed(2)}</span><span style={{fontSize:10,color:T.dim,minWidth:25,textAlign:"right"}}>{ct.length}</span></div>}).filter(Boolean)}</div></>}

        {page==="push"&&<div style={{maxWidth:580,margin:"20px auto"}}><h2 style={{fontSize:18,fontWeight:800,marginBottom:16,textAlign:"center"}}>🚀 Push — TY{TY}</h2>{!wTok||!bId?<div style={{textAlign:"center",padding:20,background:T.card,borderRadius:10,border:`1px solid ${T.border}`}}><button onClick={()=>setPage("settings")} style={{...bt(),background:T.accent,color:"#fff"}}>⚙ Configure Wave</button></div>:<>{wStat==="error"&&<div style={{background:T.redBg,borderRadius:8,padding:12,marginBottom:12,fontSize:12,color:T.red}}>❌ Wave error: {wErr||"Connection failed"}. Check token & business ID in Settings.</div>}{wStat==="done"&&<div style={{background:T.greenBg,borderRadius:8,padding:12,marginBottom:12,fontSize:12,color:T.green}}>✅ Connected to "{wBizName}"! {wAccts.length} accounts found.</div>}
            {wStat==="done"&&wAccts.length>0&&<div style={{background:T.card,borderRadius:8,border:`1px solid ${T.border}`,padding:12,marginBottom:12,maxHeight:200,overflowY:"auto"}}><div style={{fontSize:10,fontWeight:700,color:T.dim,marginBottom:8}}>ACCOUNTS (select anchor + expense account for push)</div>{wAccts.filter(a=>a.type?.value==="EXPENSE"||a.subtype?.value==="CASH_AND_BANK"||a.subtype?.value==="CREDIT_CARD").map(a=><div key={a.id} style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:`1px solid ${T.border}`,fontSize:11}}><span>{a.name}</span><span style={{color:T.dim}}>{a.type?.name} / {a.subtype?.name}</span><span style={{fontSize:9,color:T.accent,cursor:"pointer"}} onClick={()=>{navigator.clipboard.writeText(a.id);alert(`Copied: ${a.id}`)}}>📋 ID</span></div>)}</div>}{wStat!=="done"&&<button onClick={runWave} style={{...bt(),width:"100%",marginBottom:12,background:T.purpleBg,color:T.purple,padding:10}}>🌊 {wStat==="checking"?"Checking...":wStat==="error"?"Retry Check":"Check & Merge Wave"}</button>}
            {testPushResult&&<div style={{background:testPushResult.success?T.greenBg:T.redBg,borderRadius:8,padding:12,marginBottom:12,fontSize:12,color:testPushResult.success?T.green:T.red}}>{testPushResult.success?`✅ Test push successful! Wave ID: ${testPushResult.id}`:`❌ Error: ${testPushResult.error}`}</div>}<div style={{background:T.card,borderRadius:10,border:`1px solid ${T.border}`,padding:12,maxHeight:280,overflowY:"auto"}}><div style={{display:"flex",gap:8,marginBottom:12}}><label style={{flex:1}}><div style={{fontSize:9,color:T.dim,marginBottom:3}}>ANCHOR ACCT (CC/Bank)</div><select value={anchorAcct} onChange={e=>setAnchorAcct(e.target.value)} style={{...iSt(),fontSize:10}}><option value="">Select...</option>{wAccts.filter(a=>a.subtype?.value==="CASH_AND_BANK"||a.subtype?.value==="CREDIT_CARD").map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label><label style={{flex:1}}><div style={{fontSize:9,color:T.dim,marginBottom:3}}>EXPENSE ACCT</div><select value={expenseAcct} onChange={e=>setExpenseAcct(e.target.value)} style={{...iSt(),fontSize:10}}><option value="">Select...</option>{wAccts.filter(a=>a.type?.value==="EXPENSE").map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label></div>
            {txns.filter(t=>t.status==="approved").map(t=><div key={t.id} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:`1px solid ${T.border}`,fontSize:11}}><span style={{display:"flex",alignItems:"center",gap:5}}><SB source={t.source}/><span style={{maxWidth:230,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.description}</span></span><span style={{display:"flex",alignItems:"center",gap:6}}><span style={{fontWeight:600}}>${t.amount.toFixed(2)}</span>{t.status!=="pushed"&&<button onClick={()=>testPush(t.id)} disabled={testPushing} style={{...bt(),padding:"2px 6px",fontSize:9,background:T.greenBg,color:T.green}}>Test</button>}{t.status==="pushed"&&<span style={{fontSize:9,color:T.green}}>✓</span>}</span></div>)}</div><div style={{display:"flex",gap:7,marginTop:12}}><button onClick={()=>setPage("review")} style={{...bt(),flex:1}}>←</button><button style={{...bt(),flex:2,background:T.green,color:"#000",fontWeight:700}}>🚀 Push {C.ok} + Merge {C.wave}</button></div></>}</div>}

        {page==="settings"&&<div style={{maxWidth:500,margin:"28px auto"}}><h2 style={{fontSize:18,fontWeight:800,marginBottom:16}}>⚙ Settings</h2><div style={{background:T.card,borderRadius:14,border:`1px solid ${T.border}`,padding:22}}>
          <Sc t="Anthropic API"><In l="Key" type="password" v={apiKey} set={setApiKey} ph="sk-ant-..."/></Sc>
          <Sc t="Wave API"><In l="Token" type="password" v={wTok} set={setWTok} ph="Wave token"/><In l="Business ID" v={bId} set={setBId} ph="Business ID"/></Sc>
          <Sc t="📧 Gmail"><In l="OAuth Client ID" v={gCId} set={setGCId} ph="Google Cloud client ID"/>{gCId&&!gTok&&<button onClick={cGmail} style={{...bt(),width:"100%",marginBottom:8,background:`${T.green}15`,color:T.green}}>🔗 Connect Gmail</button>}{gTok&&<div style={{background:T.greenBg,borderRadius:6,padding:8,fontSize:11,color:T.green,marginBottom:8}}>✅ Gmail connected</div>}<In l="Or paste token" type="password" v={gTok} set={setGTok} ph="From Playground"/></Sc>
          <Sc t="📧 Outlook"><In l="Azure Client ID" v={oCId} set={setOCId} ph="Azure client ID"/>{oCId&&!oTok&&<button onClick={cOutlook} style={{...bt(),width:"100%",marginBottom:8,background:`${T.blue}15`,color:T.blue}}>🔗 Connect Outlook</button>}{oTok&&<div style={{background:T.blueBg,borderRadius:6,padding:8,fontSize:11,color:T.blue,marginBottom:8}}>✅ Outlook connected</div>}<In l="Or paste token" type="password" v={oTok} set={setOTok} ph="From Azure"/></Sc>
          <Sc t="Receipt Threshold"><div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:11,color:T.dim}}>Flag ≥ $</span><input type="number" value={thresh} onChange={e=>setThresh(Number(e.target.value)||75)} style={{...iSt(),width:65,textAlign:"center"}}/></div></Sc>
          <button onClick={()=>setPage(txns.length?"review":"import")} style={{...bt(),width:"100%",marginTop:12,background:T.accent,color:"#fff"}}>Save</button>
        </div></div>}
      </main>

      {modal&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.7)",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(4px)"}} onClick={()=>setModal(null)}>
        <div onClick={e=>e.stopPropagation()} style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:14,padding:24,maxWidth:520,width:"90%",maxHeight:"80vh",overflowY:"auto"}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:14}}><h3 style={{fontSize:14,fontWeight:700,margin:0}}>Details</h3><button onClick={()=>setModal(null)} style={{...bt(),padding:"3px 8px"}}>✕</button></div>
          <div style={{display:"grid",gap:7,fontSize:12}}>
            <DR l="Date">{fd(modal.date)}</DR>
            <DR l="Description"><span style={{color:T.green}}>{modal.description}</span></DR>
            <DR l="Amount" b>{modal.csvAmount?<span><span style={{textDecoration:"line-through",color:T.dim,marginRight:6}}>${modal.csvAmount.toFixed(2)}</span><span style={{color:T.green}}>${modal.amount.toFixed(2)}</span> <span style={{fontSize:9,color:T.green}}>📧</span></span>:<span>${modal.amount.toFixed(2)}</span>}</DR>
            <DR l="Source"><SB source={modal.source}/></DR>
            <DR l="Category">{modal.category}</DR>
            {modal.restaurant&&<DR l="Restaurant">{modal.restaurant}</DR>}
            {modal.items&&<DR l="Items"><span style={{fontSize:11,color:T.dim,whiteSpace:"normal",lineHeight:1.5}}>{modal.items}</span></DR>}
            {modal.copilotAccount&&<DR l="Account">{modal.copilotAccount}</DR>}
            {modal.copilotCategory&&<DR l="Copilot Cat">{modal.copilotCategory}</DR>}
            {modal.pickup&&<DR l="Route">{modal.pickup} → {modal.dropoff}</DR>}
            <DR l="Receipt">{modal.receiptFound?<a href={modal.receiptLink} target="_blank" rel="noreferrer" style={{color:T.green,textDecoration:"underline"}}>📧 {modal.receiptProvider}: {modal.receiptSubject}</a>:<div style={{display:"flex",gap:6,alignItems:"center"}}>{modal.needsReceipt&&<Bd bg={T.redBg} color={T.red}>Missing</Bd>}<button onClick={()=>findOne(modal.id)} style={{...bt(),padding:"2px 8px",fontSize:10,background:T.accentBg,color:T.accent}}>📧 Search</button></div>}</DR>
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

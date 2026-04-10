import { useState, useEffect, useRef, useMemo } from "react";
import { api, setToken, getToken, roleToPortal } from "./api";
import { createT, LANGS, getInitialLang, persistLang } from "./i18n";

const GLOBAL = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap');
  *{margin:0;padding:0;box-sizing:border-box;}
  body{font-family:'DM Sans',sans-serif;overflow-x:hidden;}
  ::-webkit-scrollbar{width:4px;}::-webkit-scrollbar-track{background:transparent;}::-webkit-scrollbar-thumb{background:rgba(150,150,200,.2);border-radius:2px;}
  @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
  @keyframes pulse{0%{opacity:.7;transform:scale(.8)}100%{opacity:0;transform:scale(2)}}
  @keyframes glowPulse{0%,100%{box-shadow:0 0 20px rgba(59,130,246,.2)}50%{box-shadow:0 0 40px rgba(59,130,246,.5)}}
  .fadeUp{animation:fadeUp .5s ease both;}
  .fadeUp:nth-child(1){animation-delay:.06s}.fadeUp:nth-child(2){animation-delay:.12s}
  .fadeUp:nth-child(3){animation-delay:.18s}.fadeUp:nth-child(4){animation-delay:.24s}
  .fadeUp:nth-child(5){animation-delay:.30s}.fadeUp:nth-child(6){animation-delay:.36s}
`;
function injectGlobal(){
  if(document.getElementById("ia-g"))return;
  const s=document.createElement("style");s.id="ia-g";s.textContent=GLOBAL;document.head.appendChild(s);
}

const THEMES = {
  login:       { bg:"#060a10", surface:"#0b1120", accent:"#3b82f6", accent2:"#60a5fa", text:"#e2eaf8", text2:"#8ba4c8", text3:"#4a6080" },
  customer:    { bg:"#06100e", surface:"#0b1a18", accent:"#10b981", accent2:"#34d399", text:"#e2f5ef", text2:"#7bbfaa", text3:"#356050" },
  underwriter: { bg:"#0a0c14", surface:"#101426", accent:"#6366f1", accent2:"#818cf8", text:"#eceef8", text2:"#9496c8", text3:"#454770" },
  claims:      { bg:"#100a08", surface:"#1a1210", accent:"#f59e0b", accent2:"#fbbf24", text:"#f8f0e2", text2:"#c8a87b", text3:"#705840" },
  admin:       { bg:"#080c14", surface:"#0d1320", accent:"#3b82f6", accent2:"#60a5fa", text:"#e2eaf8", text2:"#8ba4c8", text3:"#4a6080" },
  ai:          { bg:"#0a060f", surface:"#130b1e", accent:"#8b5cf6", accent2:"#a78bfa", text:"#ece8f8", text2:"#a894c8", text3:"#584070" },
};

function Chip({ color, children, T }) {
  const map = {
    green:  ["rgba(16,185,129,.15)","#10b981"],
    amber:  ["rgba(245,158,11,.15)","#f59e0b"],
    blue:   ["rgba(99,102,241,.15)","#818cf8"],
    rose:   ["rgba(244,63,94,.15)", "#f87171"],
    violet: ["rgba(139,92,246,.15)","#a78bfa"],
    teal:   ["rgba(45,212,191,.15)","#2dd4bf"],
  };
  const [bg,fg]=map[color]||map.green;
  return <span style={{display:"inline-flex",alignItems:"center",gap:5,padding:"3px 10px",borderRadius:20,fontSize:11,fontWeight:600,background:bg,color:fg}}>
    <span style={{width:5,height:5,borderRadius:"50%",background:fg,flexShrink:0}}/>{children}
  </span>;
}

function Card({ children, T, style={} }) {
  const [hov,setHov]=useState(false);
  return <div style={{background:T.surface,border:`1px solid ${hov?"rgba(150,150,255,.2)":"rgba(150,150,255,.08)"}`,borderRadius:16,overflow:"hidden",transition:"all .25s",...style}} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}>{children}</div>;
}

function CardHdr({ title, sub, action, T }) {
  return <div style={{padding:"16px 22px 12px",display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:"1px solid rgba(150,150,255,.07)"}}>
    <div>
      <div style={{fontFamily:"Syne",fontSize:14,fontWeight:700,color:T.text}}>{title}</div>
      {sub&&<div style={{fontSize:11,color:T.text3,marginTop:2}}>{sub}</div>}
    </div>
    {action}
  </div>;
}

function Btn({ children, variant="primary", T, onClick, style={} }) {
  const [hov,setHov]=useState(false);
  const base={padding:"8px 18px",borderRadius:9,fontSize:13,fontWeight:500,cursor:"pointer",border:"none",fontFamily:"'DM Sans',sans-serif",transition:"all .2s",display:"inline-flex",alignItems:"center",gap:7};
  const v = variant==="primary"
    ? {background:hov?T.accent+"ee":T.accent,color:"#fff",boxShadow:hov?`0 0 20px ${T.accent}44`:"none"}
    : {background:hov?"rgba(150,150,255,.1)":"rgba(150,150,255,.05)",color:T.text2,border:"1px solid rgba(150,150,255,.12)"};
  return <button style={{...base,...v,...style}} onClick={onClick} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}>{children}</button>;
}

function ScoreBar({ value, T, pending, pendingText }) {
  if (pending || value == null || Number.isNaN(Number(value))) {
    return <span style={{fontSize:12,color:T.text3,lineHeight:1.4}}>{pendingText || "—"}</span>;
  }
  const n = Number(value);
  const col = n<40?"#10b981":n<70?"#f59e0b":"#f43f5e";
  return <div style={{display:"flex",alignItems:"center",gap:8}}>
    <div style={{flex:1,height:4,background:"rgba(150,150,255,.1)",borderRadius:2,overflow:"hidden"}}>
      <div style={{height:"100%",width:`${Math.min(100,Math.max(0,n))}%`,background:col,borderRadius:2,transition:"width .4s ease"}}/>
    </div>
    <span style={{fontSize:11,color:col,fontWeight:600,minWidth:22,textAlign:"right"}}>{n}</span>
  </div>;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function estimatePremiumFromCoverage(policyType, coverageAmount) {
  const c = Number(coverageAmount);
  if (!Number.isFinite(c) || c <= 0) return null;
  const rates = {
    VEHICLE: 0.02, CORPORATE_HEALTH: 0.022, TERM_LIFE: 0.018, GROUP_LIFE: 0.018,
    FIRE_HAZARD: 0.025, MARINE_CARGO: 0.025, CYBER_RISK: 0.025, PUBLIC_LIABILITY: 0.025, HOME: 0.015,
  };
  const r = rates[policyType] ?? 0.02;
  return Math.round(c * r * 100) / 100;
}

function PulseDot({ color="#10b981" }) {
  return <div style={{position:"relative",width:8,height:8,flexShrink:0}}>
    <div style={{width:8,height:8,borderRadius:"50%",background:color}}/>
    <div style={{position:"absolute",inset:-3,borderRadius:"50%",border:`2px solid ${color}`,opacity:0,animation:"pulse 2s infinite"}}/>
  </div>;
}

function StatBox({ label, value, sub, accent, T }) {
  return <div style={{background:"rgba(150,150,255,.05)",border:"1px solid rgba(150,150,255,.09)",borderRadius:12,padding:16}}>
    <div style={{fontSize:10,color:T.text2,marginBottom:6,letterSpacing:.8,textTransform:"uppercase"}}>{label}</div>
    <div style={{fontFamily:"Syne",fontSize:20,fontWeight:700,color:accent,letterSpacing:"-.5px"}}>{value}</div>
    {sub&&<div style={{fontSize:11,color:T.text2,marginTop:5}}>{sub}</div>}
  </div>;
}

function TH({ children }) {
  return <th style={{fontSize:10,letterSpacing:.8,textTransform:"uppercase",fontWeight:600,padding:"10px 14px",textAlign:"left",borderBottom:"1px solid rgba(150,150,255,.08)",color:"#8a90b4",whiteSpace:"nowrap"}}>{children}</th>;
}
function TD({ children, mono, accent }) {
  return <td style={{padding:"11px 14px",fontSize:13,borderBottom:"1px solid rgba(150,150,255,.05)",fontFamily:mono?"monospace":"inherit",color:accent||"#cdd6f0"}}>{children}</td>;
}
function TR({ children, onClick }) {
  const [hov,setHov]=useState(false);
  return <tr style={{background:hov?"rgba(150,150,255,.05)":"transparent",cursor:onClick?"pointer":"default",transition:"background .15s"}} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)} onClick={onClick}>{children}</tr>;
}

function LangSelect({ lang, setLang, T, fullWidth }) {
  return (
    <select
      value={lang}
      onChange={(e) => { const v = e.target.value; setLang(v); persistLang(v); }}
      style={{
        background: "rgba(150,150,255,.06)",
        border: "1px solid rgba(150,150,255,.12)",
        color: T.text2,
        borderRadius: 8,
        padding: "6px 10px",
        fontSize: 12,
        cursor: "pointer",
        fontFamily: "'DM Sans',sans-serif",
        maxWidth: fullWidth ? "100%" : 140,
        width: fullWidth ? "100%" : "auto",
        boxSizing: "border-box",
      }}
    >
      {Object.entries(LANGS).map(([code, name]) => (
        <option key={code} value={code}>{name}</option>
      ))}
    </select>
  );
}

function Sidebar({ role, nav, setNav, T, onLogout, badgeCounts = {}, lang, setLang, t }) {
  const NAVS = {
    customer:    [{id:"home",icon:"🏠",labelKey:"sidebar.customer.home"},{id:"policies",icon:"📋",labelKey:"sidebar.customer.policies"},{id:"apply",icon:"✨",labelKey:"sidebar.customer.apply"},{id:"claims",icon:"📁",labelKey:"sidebar.customer.claims"},{id:"fileclaim",icon:"📝",labelKey:"sidebar.customer.fileclaim"},{id:"renewals",icon:"🔁",labelKey:"sidebar.customer.renewals"},{id:"assistant",icon:"💬",labelKey:"sidebar.customer.assistant"}],
    underwriter: [{id:"home",icon:"⬡",labelKey:"sidebar.underwriter.home"},{id:"queue",icon:"📥",labelKey:"sidebar.underwriter.queue"},{id:"policies",icon:"📋",labelKey:"sidebar.underwriter.policies"},{id:"rules",icon:"⚖️",labelKey:"sidebar.underwriter.rules"},{id:"approved",icon:"✅",labelKey:"sidebar.underwriter.approved"},{id:"escalated",icon:"🚨",labelKey:"sidebar.underwriter.escalated"},{id:"reports",icon:"📈",labelKey:"sidebar.underwriter.reports"}],
    claims:      [{id:"home",icon:"⬡",labelKey:"sidebar.claims.home"},{id:"open",icon:"📂",labelKey:"sidebar.claims.open"},{id:"fraud",icon:"🔍",labelKey:"sidebar.claims.fraud"},{id:"approved",icon:"✅",labelKey:"sidebar.claims.approved"},{id:"aifraud",icon:"🤖",labelKey:"sidebar.claims.aifraud"},{id:"reports",icon:"📈",labelKey:"sidebar.claims.reports"}],
    admin:       [{id:"home",icon:"⬡",labelKey:"sidebar.admin.home"},{id:"users",icon:"👥",labelKey:"sidebar.admin.users"},{id:"services",icon:"⚙️",labelKey:"sidebar.admin.services"},{id:"rules",icon:"⚖️",labelKey:"sidebar.admin.rules"},{id:"reports",icon:"📈",labelKey:"sidebar.admin.reports"}],
    ai:          [{id:"home",icon:"⬡",labelKey:"sidebar.ai.home"},{id:"risk",icon:"📊",labelKey:"sidebar.ai.risk"},{id:"fraud",icon:"🔍",labelKey:"sidebar.ai.fraud"},{id:"document",icon:"📄",labelKey:"sidebar.ai.document"},{id:"assistant",icon:"💬",labelKey:"sidebar.ai.assistant"}],
  };
  const ROLE_META = {
    customer:    {icon:"🧑‍💼",labelKey:"meta.customerPortal",   color:"#10b981"},
    underwriter: {icon:"🔍", labelKey:"meta.underwriterPortal",color:"#6366f1"},
    claims:      {icon:"⚖️", labelKey:"meta.claimsPortal",   color:"#f59e0b"},
    admin:       {icon:"🛡️", labelKey:"meta.adminPortal",      color:"#3b82f6"},
    ai:          {icon:"🤖", labelKey:"meta.aiPortal", color:"#8b5cf6"},
  };
  const meta=ROLE_META[role];
  const items=NAVS[role]||[];
  return (
    <aside style={{width:248,background:T.surface,borderRight:"1px solid rgba(150,150,255,.08)",display:"flex",flexDirection:"column",position:"fixed",height:"100vh",left:0,top:0,zIndex:100}}>
      <div style={{padding:"22px 20px 18px",borderBottom:"1px solid rgba(150,150,255,.07)"}}>
        <div style={{display:"flex",alignItems:"flex-start",gap:11}}>
          <div style={{width:36,height:36,flexShrink:0,background:`linear-gradient(135deg,${meta.color},${meta.color}88)`,borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,boxShadow:`0 0 18px ${meta.color}44`}}>{meta.icon}</div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontFamily:"Syne",fontWeight:800,fontSize:18,letterSpacing:"-.5px",color:T.text,lineHeight:1.2}}>Insur<span style={{color:T.accent2}}>AI</span></div>
            <div style={{fontSize:9,color:T.text3,letterSpacing:1.4,textTransform:"uppercase",marginTop:2}}>{t(meta.labelKey)}</div>
          </div>
        </div>
        <div style={{marginTop:14,display:"flex",width:"100%"}}>
          <LangSelect lang={lang} setLang={setLang} T={T} fullWidth />
        </div>
      </div>
      <nav style={{flex:1,padding:"14px 10px",overflowY:"auto"}}>
        {items.map(item=>{
          const active=nav===item.id;
          return <div key={item.id} onClick={()=>setNav(item.id)} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 11px",borderRadius:9,cursor:"pointer",marginBottom:2,fontSize:13,color:active?T.accent2:T.text2,background:active?`${T.accent}18`:"transparent",border:active?`1px solid ${T.accent}28`:"1px solid transparent",position:"relative",transition:"all .15s"}}
            onMouseEnter={e=>{if(!active)e.currentTarget.style.background="rgba(150,150,255,.06)";}}
            onMouseLeave={e=>{if(!active)e.currentTarget.style.background="transparent";}}>
            {active&&<div style={{position:"absolute",left:0,top:"50%",transform:"translateY(-50%)",width:3,height:16,background:T.accent,borderRadius:"0 2px 2px 0"}}/>}
            <span style={{fontSize:15,width:20,textAlign:"center"}}>{item.icon}</span>
            <span style={{flex:1}}>{t(item.labelKey)}</span>
            {(badgeCounts[item.id] ?? item.badge) && (
              <span style={{background:T.accent,color:"#fff",fontSize:10,fontWeight:700,padding:"1px 7px",borderRadius:20}}>
                {badgeCounts[item.id] ?? item.badge}
              </span>
            )}
          </div>;
        })}
      </nav>
      <div style={{padding:12,borderTop:"1px solid rgba(150,150,255,.07)"}}>
        <button onClick={onLogout} style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"9px 11px",borderRadius:9,background:"rgba(244,63,94,.08)",border:"1px solid rgba(244,63,94,.15)",color:"#f87171",fontSize:13,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>
          <span>🚪</span> {t("auth.signOut")}
        </button>
      </div>
    </aside>
  );
}

function Topbar({ title, sub, T, userName, roleLabel, t }) {
  const tr = t || ((k) => k);
  return <header style={{height:58,background:`${T.bg}dd`,borderBottom:"1px solid rgba(150,150,255,.07)",display:"flex",alignItems:"center",padding:"0 26px",gap:16,position:"sticky",top:0,zIndex:50,backdropFilter:"blur(20px)"}}>
    <div style={{flex:1}}>
      <div style={{fontFamily:"Syne",fontSize:15,fontWeight:700,color:T.text}}>{title}</div>
      {sub&&<div style={{fontSize:11,color:T.text3}}>{sub}</div>}
    </div>
    <div style={{display:"flex",alignItems:"center",gap:10}}>
      <div style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:T.text2,background:"rgba(16,185,129,.08)",border:"1px solid rgba(16,185,129,.18)",borderRadius:20,padding:"3px 10px"}}>
        <PulseDot color="#10b981"/> {tr("topbar.online")}
      </div>
      <div style={{display:"flex",alignItems:"center",gap:9,padding:"6px 12px",background:"rgba(150,150,255,.06)",borderRadius:9,border:"1px solid rgba(150,150,255,.1)"}}>
        <div style={{width:28,height:28,borderRadius:7,background:`linear-gradient(135deg,${T.accent},${T.accent2})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:"#fff"}}>{(userName||"U")[0]}</div>
        <div>
          <div style={{fontSize:12,fontWeight:500,color:T.text}}>{userName||tr("common.user")}</div>
          <div style={{fontSize:10,color:T.text3}}>{roleLabel}</div>
        </div>
      </div>
    </div>
  </header>;
}

function LoginPage({ onLogin, lang, setLang }) {
  const T=THEMES.login;
  const t = useMemo(() => createT(lang), [lang]);
  const [mode,setMode]=useState("signup");
  const [role,setRole]=useState("customer");
  const [fullName,setFullName]=useState("");
  const [email,setEmail]=useState("");
  const [pass,setPass]=useState("");
  const [loading,setLoading]=useState(false);
  const [err,setErr]=useState("");
  const roles=[
    {id:"customer",   icon:"🧑‍💼",labelKey:"auth.customer",       subKey:"auth.customerSub",  color:"#10b981"},
    {id:"underwriter",icon:"🔍", labelKey:"auth.underwriter",    subKey:"auth.underwriterSub", color:"#6366f1"},
    {id:"claims",     icon:"⚖️", labelKey:"auth.claimsAdjuster",subKey:"auth.claimsSub",  color:"#f59e0b"},
    {id:"admin",      icon:"🛡️", labelKey:"auth.admin",           subKey:"auth.adminSub",       color:"#3b82f6"},
    {id:"ai",         icon:"🤖", labelKey:"auth.aiAnalyst",      subKey:"auth.aiSub", color:"#8b5cf6"},
  ];
  const roleToApi=(r)=>r==="customer"?"CUSTOMER":r==="underwriter"?"UNDERWRITER":r==="claims"?"CLAIMS_ADJUSTER":r==="admin"?"ADMIN":r==="ai"?"AI_ANALYST":"CUSTOMER";
  const isValidEmail=(s)=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s).trim().toLowerCase());
  function authErrMessage(e,fallbackKey){
    const msg=e?.message||"";
    if(msg==="Failed to fetch"||e?.name==="TypeError"||/network/i.test(msg))return t("auth.networkError");
    return msg||t(fallbackKey);
  }
  async function handleSignUp(){
    if(!fullName?.trim()){setErr(t("auth.enterFullName"));return;}
    const emailNorm=email.trim().toLowerCase();
    if(!emailNorm){setErr(t("auth.enterEmail"));return;}
    if(!isValidEmail(emailNorm)){setErr(t("auth.invalidEmail"));return;}
    if(!pass||pass.length<6){setErr(t("auth.passMin"));return;}
    setErr("");setLoading(true);
    try {
      const res = await api.register(emailNorm, pass, fullName.trim(), roleToApi(role));
      setToken(res.accessToken);
      if (res.refreshToken) localStorage.setItem("insurai_refresh", res.refreshToken);
      const portalRole = roleToPortal(res.user?.roles) || role;
      onLogin({ user: res.user, role: portalRole });
    } catch (e) {
      setErr(authErrMessage(e,"auth.signUpFailed"));
    } finally {
      setLoading(false);
    }
  }
  async function handleLogin(){
    const emailNorm=email.trim().toLowerCase();
    if(!emailNorm||!pass){setErr(t("auth.enterEmailPass"));return;}
    if(!isValidEmail(emailNorm)){setErr(t("auth.invalidEmail"));return;}
    setErr("");setLoading(true);
    try {
      const res = await api.login(emailNorm, pass);
      setToken(res.accessToken);
      if (res.refreshToken) localStorage.setItem("insurai_refresh", res.refreshToken);
      const portalRole = roleToPortal(res.user?.roles) || role;
      onLogin({ user: res.user, role: portalRole });
    } catch (e) {
      setErr(authErrMessage(e,"auth.loginFailed"));
    } finally {
      setLoading(false);
    }
  }
  return (
    <div style={{minHeight:"100vh",background:T.bg,display:"flex",alignItems:"center",justifyContent:"center",position:"relative",overflow:"hidden"}}>
      <div style={{position:"absolute",top:16,right:20,zIndex:5}}>
        <LangSelect lang={lang} setLang={setLang} T={T} />
      </div>
      <div style={{position:"fixed",top:"-20%",left:"-10%",width:"60%",height:"60%",background:"radial-gradient(ellipse,rgba(59,130,246,.08) 0%,transparent 70%)",pointerEvents:"none"}}/>
      <div style={{position:"fixed",bottom:"-20%",right:"-10%",width:"50%",height:"50%",background:"radial-gradient(ellipse,rgba(99,102,241,.06) 0%,transparent 70%)",pointerEvents:"none"}}/>
      <div style={{width:"100%",maxWidth:1040,padding:24,position:"relative",zIndex:1,display:"grid",gridTemplateColumns:"minmax(0,1.2fr) minmax(0,1fr)",gap:32,alignItems:"stretch"}}>
        <div style={{paddingRight:8,display:"flex",flexDirection:"column",justifyContent:"center"}}>
          <div style={{fontFamily:"Syne",fontSize:18,fontWeight:700,color:T.text2,marginBottom:12}}>InsurAI</div>
          <div style={{fontFamily:"Syne",fontSize:42,fontWeight:800,color:T.text,letterSpacing:"-1px",lineHeight:1.08,maxWidth:620}}>
            {t("landing.headline")}
          </div>
          <div style={{fontSize:14,color:T.text2,marginTop:14,maxWidth:560,lineHeight:1.7}}>
            {t("landing.subheadline")}
          </div>
          <div style={{display:"flex",alignItems:"center",gap:12,marginTop:26}}>
            <button
              onClick={()=>{setMode("signup");setErr("");}}
              style={{padding:"10px 16px",borderRadius:8,border:"none",background:"#3b82f6",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}
            >
              {String.fromCharCode(8594)} {t("auth.getStarted")}
            </button>
            <button
              onClick={()=>{setMode("login");setErr("");}}
              style={{padding:"10px 18px",borderRadius:8,border:"1px solid rgba(150,150,255,.2)",background:"transparent",color:T.text2,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}
            >
              {t("auth.logIn")}
            </button>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:10,marginTop:20}}>
            <div style={{display:"flex",alignItems:"center"}}>
              {[0,1,2].map(i=>(
                <div key={i} style={{width:24,height:24,borderRadius:"50%",background:"#cbd5e1",border:"2px solid #0b1120",marginLeft:i===0?0:-8}}/>
              ))}
            </div>
            <div style={{fontSize:11,color:T.text3}}>{t("landing.join")}</div>
          </div>
        </div>
        <div style={{background:T.surface,border:"1px solid rgba(99,168,255,.1)",borderRadius:20,padding:28,boxShadow:"0 18px 45px rgba(15,23,42,.35)"}}>
          {mode==="signup"&&(
            <div style={{marginBottom:13}}>
              <div style={{fontSize:11,color:T.text3,letterSpacing:1.2,textTransform:"uppercase",marginBottom:8}}>{t("auth.fullName")}</div>
              <input value={fullName} onChange={e=>setFullName(e.target.value)} placeholder={t("auth.enterFullName")} style={{width:"100%",background:"rgba(150,150,255,.06)",border:"1px solid rgba(150,150,255,.12)",borderRadius:9,padding:"10px 13px",color:T.text,fontSize:13,outline:"none",fontFamily:"'DM Sans',sans-serif"}}/>
            </div>
          )}
          {mode==="signup"&&(
            <div style={{marginBottom:20}}>
              <div style={{fontSize:11,color:T.text3,letterSpacing:1.2,textTransform:"uppercase",marginBottom:12}}>{t("auth.selectRole")}</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                {roles.slice(0,4).map(r=>(
                  <div key={r.id} onClick={()=>setRole(r.id)} style={{padding:"11px 13px",borderRadius:11,cursor:"pointer",border:`1.5px solid ${role===r.id?r.color+"88":"rgba(150,150,255,.1)"}`,background:role===r.id?`${r.color}12`:"rgba(150,150,255,.04)",transition:"all .2s",display:"flex",alignItems:"center",gap:9}}>
                    <span style={{fontSize:17}}>{r.icon}</span>
                    <div>
                      <div style={{fontSize:12,fontWeight:600,color:role===r.id?r.color:T.text}}>{t(r.labelKey)}</div>
                      <div style={{fontSize:10,color:T.text3,marginTop:1}}>{t(r.subKey)}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{marginTop:8}}>
                <div onClick={()=>setRole(roles[4].id)} style={{padding:"11px 13px",borderRadius:11,cursor:"pointer",border:`1.5px solid ${role===roles[4].id?roles[4].color+"88":"rgba(150,150,255,.1)"}`,background:role===roles[4].id?`${roles[4].color}12`:"rgba(150,150,255,.04)",transition:"all .2s",display:"flex",alignItems:"center",gap:9}}>
                  <span style={{fontSize:17}}>{roles[4].icon}</span>
                  <div>
                    <div style={{fontSize:12,fontWeight:600,color:role===roles[4].id?roles[4].color:T.text}}>{t(roles[4].labelKey)}</div>
                    <div style={{fontSize:10,color:T.text3,marginTop:1}}>{t(roles[4].subKey)}</div>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div style={{marginBottom:13}}>
              <div style={{fontSize:11,color:T.text3,letterSpacing:1.2,textTransform:"uppercase",marginBottom:8}}>{t("auth.email")}</div>
            <input type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@company.com" style={{width:"100%",background:"rgba(150,150,255,.06)",border:"1px solid rgba(150,150,255,.12)",borderRadius:9,padding:"10px 13px",color:T.text,fontSize:13,outline:"none",fontFamily:"'DM Sans',sans-serif"}}/>
          </div>
          <div style={{marginBottom:18}}>
              <div style={{fontSize:11,color:T.text3,letterSpacing:1.2,textTransform:"uppercase",marginBottom:8}}>{t("auth.password")}</div>
            <input type="password" value={pass} onChange={e=>setPass(e.target.value)} placeholder={mode==="signup"?t("auth.passMin"):"••••••••"} style={{width:"100%",background:"rgba(150,150,255,.06)",border:"1px solid rgba(150,150,255,.12)",borderRadius:9,padding:"10px 13px",color:T.text,fontSize:13,outline:"none",fontFamily:"'DM Sans',sans-serif"}}/>
          </div>
          {err&&<div style={{background:"rgba(244,63,94,.1)",border:"1px solid rgba(244,63,94,.22)",borderRadius:8,padding:"8px 12px",fontSize:12,color:"#f87171",marginBottom:14}}>⚠ {err}</div>}
          {mode==="signup"?(<button onClick={handleSignUp} style={{width:"100%",padding:"11px",borderRadius:11,fontSize:14,fontWeight:600,cursor:"pointer",border:"none",fontFamily:"'DM Sans',sans-serif",background:THEMES[role]?.accent||"#3b82f6",color:"#fff",transition:"all .3s",boxShadow:`0 0 24px ${THEMES[role]?.accent||"#3b82f6"}44`}}>
            {loading?t("auth.creating"):t("auth.createAccount")}
          </button>):(<button onClick={handleLogin} style={{width:"100%",padding:"11px",borderRadius:11,fontSize:14,fontWeight:600,cursor:"pointer",border:"none",fontFamily:"'DM Sans',sans-serif",background:"#3b82f6",color:"#fff",transition:"all .3s",boxShadow:"0 0 24px #3b82f644"}}>
            {loading?t("auth.signingIn"):t("auth.signIn")}
          </button>)}
          {mode==="signup"&&<div style={{textAlign:"center",marginTop:14,fontSize:12,color:T.text3}}>{t("auth.alreadyAccount")} <button onClick={()=>{setMode("login");setErr("");}} style={{background:"none",border:"none",color:"#60a5fa",cursor:"pointer",fontWeight:600,fontSize:12}}>{t("auth.logIn")}</button></div>}
          {mode==="login"&&<div style={{textAlign:"center",marginTop:14,fontSize:12,color:T.text3}}>{t("auth.newUser")} <button onClick={()=>{setMode("signup");setErr("");}} style={{background:"none",border:"none",color:"#60a5fa",cursor:"pointer",fontWeight:600,fontSize:12}}>{t("auth.signUp")}</button></div>}
        </div>
      </div>
    </div>
  );
}

function CustomerPortal({ auth, onLogout, lang, setLang }) {
  const T=THEMES.customer;
  const t = useMemo(() => createT(lang), [lang]);
  const userName = auth?.user?.fullName || "Customer";
  const [nav,setNav]=useState("home");
  const [chatMsgs,setChatMsgs]=useState([{role:"ai",text:""}]);
  const [chatInput,setChatInput]=useState("");
  const [myPolicies,setMyPolicies]=useState([]);
  const [myClaims,setMyClaims]=useState([]);
  const [renewals,setRenewals]=useState([]);
  const [loading,setLoading]=useState(true);
  const [err,setErr]=useState("");
  const [submitting,setSubmitting]=useState(false);
  const [claimFileNames,setClaimFileNames]=useState("");
  const applyFormRef=useRef({});
  const claimFormRef=useRef({});
  const chatRef=useRef(null);
  useEffect(()=>{ setChatMsgs([{role:"ai",text:t("customer.chat.welcome")}]); },[lang,t]);
  useEffect(()=>chatRef.current?.scrollIntoView({behavior:"smooth"}),[chatMsgs]);
  useEffect(()=>{
    (async()=>{
      try {
        setLoading(true);
        const [p,c,r]=await Promise.all([api.getPoliciesMy(),api.getClaimsMy(),api.getRenewalsMy().catch(()=>[])]);
        setMyPolicies(Array.isArray(p)?p:[]);
        setMyClaims(Array.isArray(c)?c:[]);
        setRenewals(Array.isArray(r)?r:[]);
      } catch(e){ setErr(e.message); setMyPolicies([]); setMyClaims([]); }
      finally { setLoading(false); }
    })();
  },[]);
  async function sendChat(){
    if(!chatInput.trim())return;
    const msg=chatInput; setChatInput("");
    setChatMsgs(m=>[...m,{role:"user",text:msg}]);
    try {
      const r=await api.chatAssistant(msg);
      setChatMsgs(m=>[...m,{role:"ai",text:r?.reply||r?.message||"I'm here to help. Please check your policies for details."}]);
    } catch(e){ setChatMsgs(m=>[...m,{role:"ai",text:"Sorry, I couldn't process that. Please try again."}]); }
  }
  async function handleApplyPolicy(){
    const f=applyFormRef.current;
    const holderName=f?.holderName?.value?.trim(), policyType=f?.policyType?.value;
    if(!holderName||!policyType) return setErr(t("customer.err.fillNamePolicyType"));
    setSubmitting(true); setErr("");
    try {
      await api.createPolicy({
        holderName,
        policyType,
        coverageAmount: parseFloat(String(f?.coverageAmount?.value||0).replace(/[^0-9.]/g,""))||5000000,
        startDate: f?.startDate?.value||new Date().toISOString().slice(0,10),
        endDate: f?.endDate?.value||new Date(Date.now()+365*24*60*60*1000).toISOString().slice(0,10),
        metadata: {},
      });
      setNav("policies");
      const p=await api.getPoliciesMy(); setMyPolicies(p||[]);
    } catch(e){ setErr(e.message); }
    finally { setSubmitting(false); }
  }
  async function handleFileClaim(){
    const f=claimFormRef.current;
    const sel=f?.policySelect?.value;
    if(!sel) return setErr(t("customer.err.selectPolicy"));
    const [policyId,policyNumber]=sel.split("|");
    const holderId=String(auth?.user?.id||"").trim();
    const holderName=auth?.user?.fullName||userName||"";
    const claimType=f?.claimType?.value, incidentDate=f?.incidentDate?.value, claimedAmount=f?.claimedAmount?.value;
    if(!holderId||!UUID_RE.test(holderId)) return setErr(t("customer.err.holderId"));
    if(!policyId||!policyNumber||!holderName||!claimType||!incidentDate||!claimedAmount) return setErr(t("customer.err.fillClaimFields"));
    setSubmitting(true); setErr("");
    try {
      const fd=new FormData();
      fd.append("policyId",policyId); fd.append("policyNumber",policyNumber); fd.append("holderId",holderId); fd.append("holderName",holderName);
      fd.append("claimType",claimType); fd.append("incidentDate",incidentDate); fd.append("claimedAmount",String(claimedAmount).replace(/[^0-9.]/g,""));
      if(f?.description?.value) fd.append("description",f.description.value);
      if(f?.fileInput?.files?.length) for(const file of f.fileInput.files) fd.append("documents",file);
      await api.createClaim(fd);
      setClaimFileNames("");
      if (f?.fileInput) f.fileInput.value = "";
      setNav("claims"); const c=await api.getClaimsMy(); setMyClaims(c||[]);
    } catch(e){ setErr(e.message); }
    finally { setSubmitting(false); }
  }
  async function handleRenewNow(renewalId,quoteId){
    setSubmitting(true); setErr("");
    try {
      await api.acceptRenewalQuote(renewalId,quoteId);
      const r=await api.getRenewalsMy(); setRenewals(r||[]);
    } catch(e){ setErr(e.message); }
    finally { setSubmitting(false); }
  }
  const toPolicy=(p)=>{
    const premRaw=p.premiumAmount!=null&&p.premiumAmount!==""?Number(p.premiumAmount):null;
    const est=premRaw==null||premRaw<=0?estimatePremiumFromCoverage(p.policyType,p.coverageAmount):null;
    let premium="—";
    if(premRaw!=null&&premRaw>0) premium=`₹${premRaw.toLocaleString("en-IN")}/yr`;
    else if(est!=null) premium=`₹${est.toLocaleString("en-IN")}/yr (${t("customer.policy.premiumEst")})`;
    const rs=p.riskScore;
    const riskPending=rs==null||rs==="";
    const risk=riskPending?null:Number(rs);
    return {id:p.policyNumber,uid:p.id,type:p.policyType||"Policy",premium,coverageLabel:p.coverageAmount?`₹${Number(p.coverageAmount).toLocaleString("en-IN")}`:"—",expiry:p.endDate?new Date(p.endDate).toLocaleDateString("en-IN",{month:"short",year:"numeric"}):"—",risk,riskPending,...p};
  };
  const toClaim=(c)=>({id:c.claimNumber,uid:c.id,policy:c.policyNumber,type:c.claimType,amount:c.claimedAmount?`₹${Number(c.claimedAmount).toLocaleString("en-IN")}`:"—",filed:c.filedAt?new Date(c.filedAt).toLocaleDateString("en-IN"):"—",status:c.status,sc:c.status==="APPROVED"||c.status==="SETTLED"?"green":c.status==="REJECTED"?"rose":"amber",...c});
  const policiesForUi=myPolicies.map(toPolicy);
  const claimsForUi=myClaims.map(toClaim);
  const pages={
    home:(
      <div>
        <div style={{background:`linear-gradient(135deg,${T.surface},rgba(16,185,129,.07))`,border:"1px solid rgba(16,185,129,.14)",borderRadius:20,padding:"26px 30px",marginBottom:26,position:"relative",overflow:"hidden"}}>
          <div style={{position:"absolute",top:-30,right:-30,width:160,height:160,borderRadius:"50%",background:"rgba(16,185,129,.05)",filter:"blur(40px)"}}/>
          <div style={{fontSize:13,color:T.accent2,marginBottom:6}}>{t("customer.greeting")}</div>
          <div style={{fontFamily:"Syne",fontSize:24,fontWeight:800,color:T.text,marginBottom:5}}>{userName} 👋</div>
          <div style={{fontSize:13,color:T.text2}}>{t("customer.customerId")} {auth?.user?.id?.slice(0,8)||"—"} · {t("customer.memberSince")} {auth?.user?.createdAt?new Date(auth.user.createdAt).toLocaleDateString("en-IN",{month:"short",year:"numeric"}):"—"}</div>
          <div style={{display:"flex",gap:14,marginTop:18}}>
            {[[String(policiesForUi.length),t("customer.stat.activePolicies"),T.accent],[String(claimsForUi.filter(c=>!["APPROVED","REJECTED","SETTLED"].includes(c.status)).length),t("customer.stat.openClaims"),"#f59e0b"],[`₹${policiesForUi.reduce((s,p)=>s+(Number(p.premiumAmount)||0),0).toLocaleString("en-IN")}`,t("customer.stat.annualPremium"),T.text2]].map(([v,l,c],i)=>(
              <div key={i} style={{background:"rgba(16,185,129,.08)",border:"1px solid rgba(16,185,129,.15)",borderRadius:11,padding:"11px 18px",textAlign:"center"}}>
                <div style={{fontFamily:"Syne",fontSize:18,fontWeight:700,color:c}}>{v}</div>
                <div style={{fontSize:11,color:T.text2,marginTop:2}}>{l}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
          <Card T={T}>
            <CardHdr title={t("customer.card.myPolicies")} sub={t("customer.card.quickOverview")} T={T} action={<button onClick={()=>setNav("policies")} style={{background:"none",border:"none",color:T.accent2,fontSize:12,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>{t("common.viewAll")}</button>}/>
            <div style={{padding:"12px 16px",display:"flex",flexDirection:"column",gap:8}}>
              {policiesForUi.map(p=>(
                <div key={p.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 12px",background:"rgba(16,185,129,.05)",borderRadius:9,border:"1px solid rgba(16,185,129,.09)"}}>
                  <div>
                    <div style={{fontSize:12,fontWeight:600,color:T.text}}>{p.type}</div>
                    <div style={{fontSize:11,color:T.text3,marginTop:1}}>{p.id} · {t("customer.expPrefix")} {p.expiry}</div>
                  </div>
                  <Chip color="green" T={T}>{t("customer.status.active")}</Chip>
                </div>
              ))}
            </div>
          </Card>
          <Card T={T}>
            <CardHdr title={t("customer.card.aiAssistant")} sub={t("customer.card.askPolicies")} T={T}/>
            <div style={{height:196,overflowY:"auto",padding:"10px 14px",display:"flex",flexDirection:"column",gap:8}}>
              {chatMsgs.map((m,i)=>(
                <div key={i} style={{maxWidth:"88%",padding:"8px 12px",borderRadius:11,fontSize:12.5,lineHeight:1.5,alignSelf:m.role==="user"?"flex-end":"flex-start",background:m.role==="user"?"rgba(16,185,129,.18)":"rgba(16,185,129,.07)",border:`1px solid ${m.role==="user"?"rgba(16,185,129,.3)":"rgba(16,185,129,.12)"}`,color:T.text}}>{m.text}</div>
              ))}
              <div ref={chatRef}/>
            </div>
            <div style={{display:"flex",gap:8,padding:"10px 13px",borderTop:"1px solid rgba(16,185,129,.08)"}}>
              <input value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendChat()} placeholder={t("customer.chat.placeholderShort")} style={{flex:1,background:"rgba(16,185,129,.06)",border:"1px solid rgba(16,185,129,.12)",borderRadius:8,padding:"7px 10px",color:T.text,fontSize:12,outline:"none",fontFamily:"'DM Sans',sans-serif"}}/>
              <Btn T={T} onClick={sendChat} style={{padding:"7px 13px",fontSize:12}}>➤</Btn>
            </div>
          </Card>
        </div>
      </div>
    ),
    policies:(<div><div style={{fontFamily:"Syne",fontSize:22,fontWeight:700,marginBottom:6,color:T.text}}>{t("customer.policiesPage.title")}</div><div style={{fontSize:13,color:T.text2,marginBottom:22}}>{t("customer.policiesPage.subtitle")}</div>
      <div style={{display:"flex",flexDirection:"column",gap:14}}>{policiesForUi.map(p=>(
        <Card key={p.id} T={T}><div style={{padding:"20px 24px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
            <div><div style={{fontFamily:"Syne",fontSize:15,fontWeight:700,color:T.text,marginBottom:3}}>{p.type}</div><div style={{fontSize:11,color:T.text3,fontFamily:"monospace"}}>{p.id}</div></div>
            <Chip color="green" T={T}>{t("customer.status.active")}</Chip>
          </div>
          {p.premium!=="—"&&<div style={{fontSize:12,color:T.text2,marginBottom:10}}>{t("customer.label.premium")}: <span style={{color:T.text,fontWeight:600}}>{p.premium}</span></div>}
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:14}}>
            <div style={{background:"rgba(16,185,129,.05)",borderRadius:8,padding:"10px 12px",border:"1px solid rgba(16,185,129,.09)"}}>
              <div style={{fontSize:10,color:T.text3,marginBottom:4}}>{t("customer.label.coverage")}</div>
              <div style={{fontSize:13,color:T.text}}>{p.coverageLabel}</div>
            </div>
            <div style={{background:"rgba(16,185,129,.05)",borderRadius:8,padding:"10px 12px",border:"1px solid rgba(16,185,129,.09)"}}>
              <div style={{fontSize:10,color:T.text3,marginBottom:4}}>{t("customer.label.expiry")}</div>
              <div style={{fontSize:13,color:T.text}}>{p.expiry}</div>
            </div>
            <div style={{background:"rgba(16,185,129,.05)",borderRadius:8,padding:"10px 12px",border:"1px solid rgba(16,185,129,.09)"}}>
              <div style={{fontSize:10,color:T.text3,marginBottom:6}}>{t("customer.label.riskScore")}</div>
              <ScoreBar value={p.risk} T={T} pending={p.riskPending} pendingText={t("customer.policy.riskPending")}/>
            </div>
          </div>
          <div style={{display:"flex",gap:8}}>
            <Btn T={T} style={{padding:"7px 14px",fontSize:12}} onClick={()=>setNav("fileclaim")}>📁 {t("customer.btn.fileClaim")}</Btn>
            <Btn T={T} variant="ghost" style={{padding:"7px 14px",fontSize:12}} onClick={()=>setNav("renewals")}>🔁 {t("customer.btn.renew")}</Btn>
          </div>
        </div></Card>
      ))}</div>
    </div>),
    claims:(<div><div style={{fontFamily:"Syne",fontSize:22,fontWeight:700,marginBottom:6,color:T.text}}>{t("customer.claimsPage.title")}</div><div style={{fontSize:13,color:T.text2,marginBottom:22}}>{t("customer.claimsPage.subtitle")}</div>
      <Card T={T}><table style={{width:"100%",borderCollapse:"collapse"}}>
        <thead><tr><TH>{t("customer.th.claimId")}</TH><TH>{t("customer.th.policy")}</TH><TH>{t("customer.th.type")}</TH><TH>{t("customer.th.amount")}</TH><TH>{t("customer.th.filed")}</TH><TH>{t("customer.th.status")}</TH><TH></TH></tr></thead>
        <tbody>{claimsForUi.map(c=>(<TR key={c.uid}><TD mono accent={T.accent2}>{c.id}</TD><TD>{c.policy}</TD><TD>{c.type}</TD><TD>{c.amount}</TD><TD>{c.filed}</TD><TD><Chip color={c.sc} T={T}>{c.status}</Chip></TD><TD><Btn T={T} variant="ghost" style={{padding:"5px 10px",fontSize:11}}>{t("customer.btn.track")}</Btn></TD></TR>))}</tbody>
      </table></Card>
    </div>),
    apply:(<div><div style={{fontFamily:"Syne",fontSize:22,fontWeight:700,marginBottom:6,color:T.text}}>{t("customer.apply.title")}</div><div style={{fontSize:13,color:T.text2,marginBottom:22}}>{t("customer.apply.subtitle")}</div>
      {err&&<div style={{padding:10,marginBottom:14,background:"rgba(239,68,68,.1)",borderRadius:9,color:"#ef4444",fontSize:13}}>{err}</div>}
      <Card T={T}><div style={{padding:"22px 26px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
        <div><div style={{fontSize:11,color:T.text3,letterSpacing:1,textTransform:"uppercase",marginBottom:6}}>{t("customer.apply.fullName")}</div>
          <input ref={el=>{if(el)applyFormRef.current.holderName=el}} defaultValue={userName} placeholder={t("customer.apply.placeholder.name")} style={{width:"100%",background:"rgba(16,185,129,.06)",border:"1px solid rgba(16,185,129,.12)",borderRadius:8,padding:"9px 12px",color:T.text,fontSize:13,outline:"none",fontFamily:"'DM Sans',sans-serif"}}/></div>
        <div><div style={{fontSize:11,color:T.text3,letterSpacing:1,textTransform:"uppercase",marginBottom:6}}>{t("customer.apply.dob")}</div>
          <input ref={el=>{if(el)applyFormRef.current.dob=el}} type="date" style={{width:"100%",background:"rgba(16,185,129,.06)",border:"1px solid rgba(16,185,129,.12)",borderRadius:8,padding:"9px 12px",color:T.text,fontSize:13,outline:"none",fontFamily:"'DM Sans',sans-serif"}}/></div>
        <div><div style={{fontSize:11,color:T.text3,letterSpacing:1,textTransform:"uppercase",marginBottom:6}}>{t("customer.apply.income")}</div>
          <input ref={el=>{if(el)applyFormRef.current.income=el}} placeholder={t("customer.apply.placeholder.income")} style={{width:"100%",background:"rgba(16,185,129,.06)",border:"1px solid rgba(16,185,129,.12)",borderRadius:8,padding:"9px 12px",color:T.text,fontSize:13,outline:"none",fontFamily:"'DM Sans',sans-serif"}}/></div>
        <div><div style={{fontSize:11,color:T.text3,letterSpacing:1,textTransform:"uppercase",marginBottom:6}}>{t("customer.apply.occupation")}</div>
          <input ref={el=>{if(el)applyFormRef.current.occupation=el}} placeholder={t("customer.apply.placeholder.occupation")} style={{width:"100%",background:"rgba(16,185,129,.06)",border:"1px solid rgba(16,185,129,.12)",borderRadius:8,padding:"9px 12px",color:T.text,fontSize:13,outline:"none",fontFamily:"'DM Sans',sans-serif"}}/></div>
        <div><div style={{fontSize:11,color:T.text3,letterSpacing:1,textTransform:"uppercase",marginBottom:6}}>{t("customer.apply.policyType")}</div>
          <select ref={el=>{if(el)applyFormRef.current.policyType=el}} style={{width:"100%",background:"rgba(16,185,129,.06)",border:"1px solid rgba(16,185,129,.12)",borderRadius:8,padding:"9px 12px",color:"#e5fdf4",fontSize:13,outline:"none",fontFamily:"'DM Sans',sans-serif",appearance:"none",WebkitAppearance:"none",MozAppearance:"none"}}>
            <option value="CORPORATE_HEALTH" style={{color:"#0f172a"}}>{t("customer.policy.corporateHealth")}</option>
            <option value="TERM_LIFE" style={{color:"#0f172a"}}>{t("customer.policy.termLife")}</option>
            <option value="VEHICLE" style={{color:"#0f172a"}}>{t("customer.policy.vehicle")}</option>
            <option value="HOME" style={{color:"#0f172a"}}>{t("customer.policy.home")}</option>
          </select></div>
        <div><div style={{fontSize:11,color:T.text3,letterSpacing:1,textTransform:"uppercase",marginBottom:6}}>{t("customer.apply.coverageAmount")}</div>
          <input ref={el=>{if(el)applyFormRef.current.coverageAmount=el}} defaultValue="5000000" placeholder={t("customer.apply.placeholder.coverage")} style={{width:"100%",background:"rgba(16,185,129,.06)",border:"1px solid rgba(16,185,129,.12)",borderRadius:8,padding:"9px 12px",color:T.text,fontSize:13,outline:"none",fontFamily:"'DM Sans',sans-serif"}}/></div>
        <div style={{gridColumn:"1/-1"}}><div style={{fontSize:11,color:T.text3,letterSpacing:1,textTransform:"uppercase",marginBottom:6}}>{t("customer.apply.startEndDate")}</div>
          <div style={{display:"flex",gap:12}}>
            <input ref={el=>{if(el)applyFormRef.current.startDate=el}} type="date" defaultValue={new Date().toISOString().slice(0,10)} style={{flex:1,background:"rgba(16,185,129,.06)",border:"1px solid rgba(16,185,129,.12)",borderRadius:8,padding:"9px 12px",color:T.text,fontSize:13,outline:"none",fontFamily:"'DM Sans',sans-serif"}}/>
            <input ref={el=>{if(el)applyFormRef.current.endDate=el}} type="date" defaultValue={new Date(Date.now()+365*24*60*60*1000).toISOString().slice(0,10)} style={{flex:1,background:"rgba(16,185,129,.06)",border:"1px solid rgba(16,185,129,.12)",borderRadius:8,padding:"9px 12px",color:T.text,fontSize:13,outline:"none",fontFamily:"'DM Sans',sans-serif"}}/>
          </div></div>
        <div style={{gridColumn:"1/-1",background:"rgba(16,185,129,.08)",border:"1px solid rgba(16,185,129,.16)",borderRadius:11,padding:"13px 16px",display:"flex",alignItems:"center",gap:12}}>
          <div style={{fontSize:22}}>🤖</div>
          <div><div style={{fontSize:13,fontWeight:500,color:T.text}}>{t("customer.apply.aiRisk")} <span style={{color:T.accent,fontFamily:"Syne",fontSize:17,fontWeight:700}}>—</span> {t("customer.apply.scoreOutOf")}</div>
          <div style={{fontSize:12,color:T.text2,marginTop:2}}>{t("customer.apply.aiHint")}</div></div>
        </div>
        <div style={{gridColumn:"1/-1",display:"flex",gap:10}}><Btn T={T} onClick={handleApplyPolicy} disabled={submitting}>{submitting?t("common.submitting"):t("customer.apply.submit")}</Btn><Btn T={T} variant="ghost" onClick={()=>setNav("policies")}>{t("common.cancel")}</Btn></div>
      </div></Card>
    </div>),
    fileclaim:(<div><div style={{fontFamily:"Syne",fontSize:22,fontWeight:700,marginBottom:6,color:T.text}}>{t("customer.fileclaim.title")}</div><div style={{fontSize:13,color:T.text2,marginBottom:22}}>{t("customer.fileclaim.subtitle")}</div>
      {err&&<div style={{padding:10,marginBottom:14,background:"rgba(239,68,68,.1)",borderRadius:9,color:"#ef4444",fontSize:13}}>{err}</div>}
      <Card T={T}><div style={{padding:"22px 26px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
        <div><div style={{fontSize:11,color:T.text3,letterSpacing:1,textTransform:"uppercase",marginBottom:6}}>{t("customer.fileclaim.selectPolicy")}</div>
          <select ref={el=>{if(el)claimFormRef.current.policySelect=el}} style={{width:"100%",background:"rgba(16,185,129,.06)",border:"1px solid rgba(16,185,129,.12)",borderRadius:8,padding:"9px 12px",color:T.text,fontSize:13,outline:"none",fontFamily:"'DM Sans',sans-serif"}}>
            <option value="" style={{color:"#0f172a"}}>{t("customer.fileclaim.selectPlaceholder")}</option>
            {policiesForUi.map(p=><option key={p.uid} value={`${p.uid}|${p.id}`} style={{color:"#0f172a"}}>{p.id} · {p.type}</option>)}
          </select></div>
        <div><div style={{fontSize:11,color:T.text3,letterSpacing:1,textTransform:"uppercase",marginBottom:6}}>{t("customer.fileclaim.claimType")}</div>
          <select ref={el=>{if(el)claimFormRef.current.claimType=el}} style={{width:"100%",background:"rgba(16,185,129,.06)",border:"1px solid rgba(16,185,129,.12)",borderRadius:8,padding:"9px 12px",color:"#e5fdf4",fontSize:13,outline:"none",fontFamily:"'DM Sans',sans-serif",appearance:"none",WebkitAppearance:"none",MozAppearance:"none"}}>
            <option value="MEDICAL_EXPENSE" style={{color:"#0f172a"}}>{t("customer.claimType.medical")}</option>
            <option value="HOSPITALIZATION" style={{color:"#0f172a"}}>{t("customer.claimType.hospitalization")}</option>
            <option value="ACCIDENT" style={{color:"#0f172a"}}>{t("customer.claimType.accident")}</option>
            <option value="THEFT" style={{color:"#0f172a"}}>{t("customer.claimType.theft")}</option>
            <option value="DAMAGE" style={{color:"#0f172a"}}>{t("customer.claimType.damage")}</option>
          </select></div>
        <div><div style={{fontSize:11,color:T.text3,letterSpacing:1,textTransform:"uppercase",marginBottom:6}}>{t("customer.fileclaim.incidentDate")}</div>
          <input ref={el=>{if(el)claimFormRef.current.incidentDate=el}} type="date" style={{width:"100%",background:"rgba(16,185,129,.06)",border:"1px solid rgba(16,185,129,.12)",borderRadius:8,padding:"9px 12px",color:T.text,fontSize:13,outline:"none",fontFamily:"'DM Sans',sans-serif"}}/></div>
        <div><div style={{fontSize:11,color:T.text3,letterSpacing:1,textTransform:"uppercase",marginBottom:6}}>{t("customer.fileclaim.claimAmount")}</div>
          <input ref={el=>{if(el)claimFormRef.current.claimedAmount=el}} type="number" placeholder={t("customer.fileclaim.placeholder.amount")} style={{width:"100%",background:"rgba(16,185,129,.06)",border:"1px solid rgba(16,185,129,.12)",borderRadius:8,padding:"9px 12px",color:T.text,fontSize:13,outline:"none",fontFamily:"'DM Sans',sans-serif"}}/></div>
        <div style={{gridColumn:"1/-1"}}><div style={{fontSize:11,color:T.text3,letterSpacing:1,textTransform:"uppercase",marginBottom:6}}>{t("customer.fileclaim.description")}</div>
          <textarea ref={el=>{if(el)claimFormRef.current.description=el}} rows={3} placeholder={t("customer.fileclaim.placeholder.desc")} style={{width:"100%",background:"rgba(16,185,129,.06)",border:"1px solid rgba(16,185,129,.12)",borderRadius:8,padding:"9px 12px",color:T.text,fontSize:13,outline:"none",fontFamily:"'DM Sans',sans-serif",resize:"vertical"}}/></div>
        <div style={{gridColumn:"1/-1"}}>
          <div style={{fontSize:11,color:T.text3,letterSpacing:1,textTransform:"uppercase",marginBottom:6}}>{t("customer.fileclaim.documents")}</div>
          <input ref={el=>{if(el)claimFormRef.current.fileInput=el}} type="file" multiple accept=".pdf,.jpg,.jpeg,.png" style={{display:"none"}} onChange={(e)=>setClaimFileNames(Array.from(e.target.files||[]).map(f=>f.name).join(", "))}/>
          <div onClick={()=>claimFormRef.current?.fileInput?.click()} style={{border:"2px dashed rgba(16,185,129,.2)",borderRadius:11,padding:22,textAlign:"center",cursor:"pointer"}}>
            <div style={{fontSize:26,marginBottom:5}}>📎</div><div style={{fontSize:13,color:T.text2}}>{t("customer.fileclaim.uploadHint")}</div><div style={{fontSize:11,color:T.text3,marginTop:3}}>{t("customer.fileclaim.uploadSub")}</div>
          </div>
          {claimFileNames?<div style={{fontSize:12,color:T.accent2,marginTop:8}}>✓ {claimFileNames}</div>:null}
          <div style={{fontSize:11,color:T.text3,marginTop:10,lineHeight:1.5}}>{t("customer.fileclaim.storageNote")}</div>
        </div>
        <div style={{gridColumn:"1/-1"}}><Btn T={T} onClick={handleFileClaim} disabled={submitting}>{submitting?t("common.submitting"):t("customer.fileclaim.submit")}</Btn></div>
      </div></Card>
    </div>),
    renewals:(<div><div style={{fontFamily:"Syne",fontSize:22,fontWeight:700,marginBottom:22,color:T.text}}>{t("portal.customer.renewals")}</div>
      {err&&<div style={{padding:10,marginBottom:14,background:"rgba(239,68,68,.1)",borderRadius:9,color:"#ef4444",fontSize:13}}>{err}</div>}
      <Card T={T}><div style={{padding:"16px 20px",display:"flex",flexDirection:"column",gap:12}}>
        {renewals.length===0?<div style={{padding:20,textAlign:"center",color:T.text2,fontSize:13}}>{t("customer.renewals.empty")}</div>:renewals.filter(r=>["PENDING","NOTIFIED"].includes(r.renewalStatus)).map(r=>{
          const exp=r.expiryDate?new Date(r.expiryDate):null;
          const daysLeft=exp?Math.ceil((exp-new Date())/864e5):0;
          return (
            <div key={r.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px",background:"rgba(245,158,11,.07)",borderRadius:11,border:"1px solid rgba(245,158,11,.18)"}}>
              <div><div style={{fontSize:13,fontWeight:600,color:T.text}}>{r.policyNumber||t("customer.fallback.policy")}</div><div style={{fontSize:11,color:T.text3,marginTop:2}}>{t("customer.renewals.expires")} {exp?exp.toLocaleDateString("en-IN"):"—"} · {daysLeft>0?`${daysLeft} ${t("customer.renewals.daysRemaining")}`:t("customer.renewals.expired")}</div></div>
              <Btn T={T} style={{padding:"7px 14px",fontSize:12}} disabled={submitting} onClick={async()=>{try{const full=await api.getRenewal(r.id); const q=full?.quotes?.[0]; if(!q) return setErr(t("customer.err.noQuotes")); await handleRenewNow(r.id,q.id);}catch(e){setErr(e.message);}}}>{t("customer.renewals.renewNow")}</Btn>
            </div>
          );
        })}
      </div></Card>
    </div>),
    assistant:(<div><div style={{fontFamily:"Syne",fontSize:22,fontWeight:700,marginBottom:22,color:T.text}}>{t("portal.customer.assistant")}</div>
      <Card T={T}><div style={{height:380,overflowY:"auto",padding:"14px 16px",display:"flex",flexDirection:"column",gap:9}}>
        {chatMsgs.map((m,i)=><div key={i} style={{maxWidth:"85%",padding:"9px 13px",borderRadius:11,fontSize:13,lineHeight:1.5,alignSelf:m.role==="user"?"flex-end":"flex-start",background:m.role==="user"?"rgba(16,185,129,.16)":"rgba(16,185,129,.06)",border:`1px solid ${m.role==="user"?"rgba(16,185,129,.28)":"rgba(16,185,129,.1)"}`,color:T.text}}>{m.text}</div>)}
        <div ref={chatRef}/>
      </div>
      <div style={{display:"flex",gap:8,padding:"11px 15px",borderTop:"1px solid rgba(16,185,129,.08)"}}>
        <input value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendChat()} placeholder={t("customer.assistant.placeholder")} style={{flex:1,background:"rgba(16,185,129,.06)",border:"1px solid rgba(16,185,129,.12)",borderRadius:8,padding:"9px 12px",color:T.text,fontSize:13,outline:"none",fontFamily:"'DM Sans',sans-serif"}}/>
        <Btn T={T} onClick={sendChat}>{t("common.send")} ➤</Btn>
      </div></Card>
    </div>),
  };
  const TITLES={home:t("portal.customer.home"),policies:t("portal.customer.policies"),apply:t("portal.customer.apply"),claims:t("portal.customer.claims"),fileclaim:t("portal.customer.fileclaim"),renewals:t("portal.customer.renewals"),assistant:t("portal.customer.assistant")};
  return (
    <div style={{display:"flex",minHeight:"100vh",background:T.bg}}>
      <div style={{position:"fixed",top:"-20%",left:"-10%",width:"60%",height:"60%",background:"radial-gradient(ellipse,rgba(16,185,129,.06) 0%,transparent 70%)",pointerEvents:"none",zIndex:0}}/>
      <Sidebar role="customer" nav={nav} setNav={setNav} T={T} onLogout={onLogout} lang={lang} setLang={setLang} t={t}/>
      <div style={{marginLeft:248,flex:1,display:"flex",flexDirection:"column",position:"relative",zIndex:1}}>
        <Topbar title={TITLES[nav]||nav} sub={t("customer.portalSub")} T={T} userName={userName} roleLabel={t("auth.rolePolicyholder")} t={t}/>
        {loading?<div style={{padding:26,flex:1,display:"flex",alignItems:"center",justifyContent:"center",color:T.text2}}>{t("common.loading")}</div>:<div style={{padding:26,flex:1}} key={nav}>{pages[nav]||pages.home}</div>}
      </div>
    </div>
  );
}

const SERVICES_LIST=[
  {name:"api-gateway",port:8080,lang:"Java"},{name:"auth-service",port:8081,lang:"Java"},{name:"policy-service",port:8082,lang:"Java"},{name:"workflow-service",port:8083,lang:"Java"},
  {name:"rules-service",port:8084,lang:"Java"},{name:"claims-service",port:8085,lang:"Java"},{name:"renewal-service",port:8086,lang:"Java"},{name:"notify-service",port:8087,lang:"Java"},
  {name:"ai-risk-service",port:9001,lang:"Python"},{name:"ai-fraud-service",port:9002,lang:"Python"},{name:"ai-document-service",port:9003,lang:"Python"},{name:"ai-assistant-service",port:9004,lang:"Python"},
];
const USERS_LIST=[
  {id:"USR-001",name:"Rahul Mehta",  email:"rahul@company.com",  role:"Customer",       status:"Active"},
  {id:"USR-002",name:"Priya Nair",   email:"priya@insurai.com",  role:"Underwriter",    status:"Active"},
  {id:"USR-003",name:"Vikram Rao",   email:"vikram@insurai.com", role:"Claims Adjuster",status:"Active"},
  {id:"USR-004",name:"Aryan Sharma", email:"aryan@insurai.com",  role:"Admin",          status:"Active"},
  {id:"USR-005",name:"Neha Gupta",   email:"neha@insurai.com",   role:"AI Analyst",     status:"Active"},
];

function UnderwriterPortal({ auth, onLogout, lang, setLang }) {
  const T=THEMES.underwriter;
  const t = useMemo(() => createT(lang), [lang]);
  const userName=auth?.user?.fullName||"Underwriter";
  const [nav,setNav]=useState("home");
  const [selected,setSelected]=useState(null);
  const [queue,setQueue]=useState([]);
  const [approvedList,setApprovedList]=useState([]);
  const [allPolicies,setAllPolicies]=useState([]);
  const [uwRules,setUwRules]=useState([]);
  const [loading,setLoading]=useState(true);
  const [err,setErr]=useState("");
  const [submitting,setSubmitting]=useState(false);
  const notesRef=useRef(null);
  useEffect(()=>{
    (async()=>{
      try {
        setLoading(true);
        const [q,a,policies,rules]=await Promise.all([
          api.getWorkflowsMyQueue().catch(()=>api.getWorkflows()),
          api.getWorkflows({status:"APPROVED"}).catch(()=>[]),
          api.getAllPolicies().catch(()=>[]),
          api.getRules().catch(()=>[])
        ]);
        const rlist = Array.isArray(rules)?rules:rules?.content??[];
        setUwRules(rlist);
        setAllPolicies(Array.isArray(policies)?policies:policies?.content??[]);
        const queueList = Array.isArray(q)?q:q?.content??[];
        const nonFinal = queueList.filter(w => !["APPROVED","REJECTED"].includes(String(w?.status || "").toUpperCase()));
        if (nonFinal.length === 0) {
          const policyQueue = (Array.isArray(policies)?policies:policies?.content??[])
            .filter(p => !["APPROVED","REJECTED","ACTIVE","CANCELLED","EXPIRED"].includes(String(p?.status || "").toUpperCase()))
            .map(p => ({
              id: p.id,
              policyId: p.id,
              policyNumber: p.policyNumber,
              holderName: p.holderName,
              policyType: p.policyType,
              riskScore: p.riskScore,
              assignedTo: null,
              createdAt: p.createdAt,
              coverageAmount: p.coverageAmount,
              premiumAmount: p.premiumAmount,
              _isPolicyFallback: true
            }));
          setQueue(policyQueue);
        } else {
          setQueue(nonFinal);
        }
        setApprovedList(Array.isArray(a)?a:a?.content??[]);
      } catch(e){ setErr(e.message); setQueue([]); }
      finally { setLoading(false); }
    })();
  },[]);
  const policyById = useMemo(() => {
    const m = new Map();
    (allPolicies || []).forEach((p) => {
      if (p?.id != null) m.set(String(p.id), p);
    });
    return m;
  }, [allPolicies]);
  const toQueueItem = (w) => {
    const polKey = w.policyId ?? w.id;
    const pol = polKey ? policyById.get(String(polKey)) : null;
    const premiumFromPolicy = pol?.premiumAmount ?? w.premiumAmount;
    const coverage = pol?.coverageAmount ?? w.coverageAmount;
    const policyType = pol?.policyType || w.policyType;
    const premRaw = premiumFromPolicy != null && premiumFromPolicy !== "" ? Number(premiumFromPolicy) : null;
    const est = premRaw == null || premRaw <= 0 ? estimatePremiumFromCoverage(policyType, coverage) : null;
    const premium = (premRaw != null && premRaw > 0) ? `₹${premRaw.toLocaleString("en-IN")}` : (est != null ? `₹${est.toLocaleString("en-IN")}` : "—");
    const riskRaw = w.riskScore ?? pol?.riskScore;
    const risk = riskRaw == null || riskRaw === "" ? null : Number(riskRaw);
    const aiRec = risk == null || Number.isNaN(risk) ? "Pending" : risk > 70 ? "Escalate" : risk < 40 ? "Approve" : "Manual Review";
    const created = w.createdAt ?? pol?.createdAt;
    const submitted = created ? new Date(created).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : "—";
    return {
      id: w.id,
      pid: w.policyNumber,
      holder: w.holderName || "—",
      type: policyType || "Policy",
      risk,
      premium,
      aiRec,
      submitted,
      uw: w.assignedTo ? "Assigned" : "Unassigned",
      ...w,
    };
  };
  const queueForUi = useMemo(() => queue.map(toQueueItem), [queue, policyById]);
  const approvedForUi = useMemo(() => approvedList.map(toQueueItem), [approvedList, policyById]);
  const scoredInQueue = queueForUi.filter((p) => p.risk != null && !Number.isNaN(p.risk));
  const underwriterStats = {
    queue: queueForUi.length,
    approved: approvedForUi.length,
    escalated: queueForUi.filter((p) => p.aiRec === "Escalate").length,
    avgRisk: scoredInQueue.length ? Math.round(scoredInQueue.reduce((s, p) => s + p.risk, 0) / scoredInQueue.length) : "—",
  };
  const riskInsights = useMemo(() => {
    return [...queueForUi]
      .filter((p) => p.risk != null && !Number.isNaN(p.risk))
      .sort((a, b) => b.risk - a.risk)
      .slice(0, 4)
      .map((p) => ({
        icon: p.risk > 70 ? "🔴" : p.risk > 40 ? "🟡" : "🟢",
        label: `${p.holder} · ${p.pid}`,
        score: p.risk,
        blurb: p.aiRec === "Escalate" ? "Escalate – high risk" : p.aiRec === "Approve" ? "Low risk – approve eligible" : "Manual review",
      }));
  }, [queueForUi]);
  async function handleDecision(decision,notes){
    if(!selected?.id) return;
    if (selected?._isPolicyFallback) {
      setSubmitting(true); setErr("");
      try {
        if (decision === "APPROVED" || decision === "REJECTED") {
          await api.updatePolicyStatus(selected.id, decision, notes || "");
          const updated = {...selected, status: decision, updatedAt: new Date().toISOString()};
          setQueue(q => q.filter(x => x.id !== selected.id));
          if (decision === "APPROVED") {
            setApprovedList(a => [updated, ...a.filter(x => x.id !== selected.id)]);
          }
        } else if (decision === "ESCALATE") {
          setQueue(q => q.map(x => x.id === selected.id ? {...x, aiRec: "Escalate", status: "ESCALATED"} : x));
        }
        setSelected(null);
      } catch (e) {
        setErr(e.message || "Decision update failed");
      } finally {
        setSubmitting(false);
      }
      return;
    }
    setSubmitting(true); setErr("");
    try {
      await api.workflowDecision(selected.id,decision,notes||"");
      setSelected(null);
      const [q,a,policies,rules]=await Promise.all([api.getWorkflowsMyQueue().catch(()=>api.getWorkflows()),api.getWorkflows({status:"APPROVED"}).catch(()=>[]),api.getAllPolicies().catch(()=>[]),api.getRules().catch(()=>[])]);
      setUwRules(Array.isArray(rules)?rules:rules?.content??[]);
      setAllPolicies(Array.isArray(policies)?policies:policies?.content??[]);
      const queueList = Array.isArray(q)?q:q?.content??[];
      const nonFinal = queueList.filter(w => !["APPROVED","REJECTED"].includes(String(w?.status || "").toUpperCase()));
      if (nonFinal.length === 0) {
        const policyQueue = (Array.isArray(policies)?policies:policies?.content??[])
          .filter(p => !["APPROVED","REJECTED","ACTIVE","CANCELLED","EXPIRED"].includes(String(p?.status || "").toUpperCase()))
          .map(p => ({
            id: p.id,
            policyId: p.id,
            policyNumber: p.policyNumber,
            holderName: p.holderName,
            policyType: p.policyType,
            riskScore: p.riskScore,
            assignedTo: null,
            createdAt: p.createdAt,
            coverageAmount: p.coverageAmount,
            premiumAmount: p.premiumAmount,
            _isPolicyFallback: true
          }));
        setQueue(policyQueue);
      } else {
        setQueue(nonFinal);
      }
      setApprovedList(Array.isArray(a)?a:a?.content??[]);
    } catch(e){ setErr(e.message); }
    finally { setSubmitting(false); }
  }
  const pages={
    home:(<div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:16,marginBottom:26}}>
        {[["📥","Review Queue",String(underwriterStats.queue),"pending review",T.accent],["✅","Approved",String(underwriterStats.approved),"policies issued",T.accent2],["🚨","Escalated",String(underwriterStats.escalated),"senior review req.","#f43f5e"],["📊","Avg Risk Score",String(underwriterStats.avgRisk),"across queue","#f59e0b"]].map(([ic,l,v,s,c])=>(
          <div key={l} className="fadeUp" style={{background:T.surface,border:"1px solid rgba(150,150,255,.08)",borderRadius:16,padding:18,position:"relative",overflow:"hidden"}}>
            <div style={{position:"absolute",top:-20,right:-20,width:80,height:80,borderRadius:"50%",background:c,opacity:.06,filter:"blur(25px)"}}/>
            <div style={{width:36,height:36,borderRadius:9,background:`${c}18`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,marginBottom:12}}>{ic}</div>
            <div style={{fontFamily:"Syne",fontSize:20,fontWeight:700,color:c}}>{v}</div>
            <div style={{fontSize:12,color:T.text2,marginTop:3}}>{l}</div>
            <div style={{fontSize:11,color:T.text3,marginTop:3}}>{s}</div>
          </div>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 320px",gap:16}}>
        <Card T={T}>
          <CardHdr title={t("underwriter.card.queueTitle")} sub={t("underwriter.card.queueSub")} T={T} action={<button onClick={()=>setNav("queue")} style={{background:"none",border:"none",color:T.accent2,fontSize:12,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>{t("common.viewAll")}</button>}/>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><tr><TH>Policy ID</TH><TH>Holder</TH><TH>Risk</TH><TH>AI Rec</TH><TH></TH></tr></thead>
            <tbody>{(queueForUi.length?queueForUi.slice(0,4):[]).map(p=>(
              <TR key={p.id} onClick={()=>{setSelected(p);setNav("queue");}} style={{cursor:"pointer"}}>
                <TD mono accent={T.accent2}>{p.pid}</TD><TD>{p.holder}</TD>
                <TD><div style={{width:90}}><ScoreBar value={p.risk} T={T} pendingText="…"/></div></TD>
                <TD><Chip color={p.aiRec==="Approve"?"green":p.aiRec==="Escalate"?"rose":p.aiRec==="Pending"?"blue":"amber"} T={T}>{p.aiRec}</Chip></TD>
                <TD><Btn T={T} style={{padding:"5px 10px",fontSize:11}}>{p._isPolicyFallback?"View":"Review"}</Btn></TD>
              </TR>
            ))}</tbody>
          </table>
        </Card>
        <Card T={T}>
          <CardHdr title={t("underwriter.card.riskTitle")} sub={t("underwriter.card.riskSub")} T={T}/>
          <div style={{padding:"12px 16px",display:"flex",flexDirection:"column",gap:8}}>
            {riskInsights.length === 0 ? (
              <div style={{padding:12,fontSize:12,color:T.text3,lineHeight:1.55}}>No scored policies in the queue yet. When policies receive risk scores, the highest-risk items appear here.</div>
            ) : riskInsights.map((row) => (
              <div key={row.label} style={{display:"flex",gap:9,alignItems:"flex-start",padding:"9px 10px",background:"rgba(99,102,241,.05)",borderRadius:8,border:"1px solid rgba(99,102,241,.09)"}}>
                <span style={{fontSize:13}}>{row.icon}</span>
                <div style={{flex:1}}>
                  <div style={{fontSize:12,fontWeight:600,color:T.text}}>{row.label} · <span style={{color:row.score>70?"#f43f5e":"#f59e0b",fontFamily:"Syne",fontWeight:700}}>{row.score}</span></div>
                  <div style={{fontSize:11,color:T.text3,marginTop:1}}>{row.blurb}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>),
    queue:(<div>
      <div style={{fontFamily:"Syne",fontSize:22,fontWeight:700,marginBottom:6,color:T.text}}>{t("portal.underwriter.queue")}</div>
      <div style={{fontSize:13,color:T.text2,marginBottom:22}}>{queueForUi.length} {queueForUi.length === 1 ? "policy" : "policies"} awaiting underwriter decision</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 350px",gap:16}}>
        <Card T={T}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><tr><TH>Policy ID</TH><TH>Holder</TH><TH>Type</TH><TH>Premium</TH><TH>Risk</TH><TH>AI Rec</TH><TH>Assignee</TH><TH></TH></tr></thead>
            <tbody>{queueForUi.map(p=>(
              <TR key={p.id} onClick={()=>setSelected(p)} style={{cursor:"pointer"}}>
                <TD mono accent={T.accent2}>{p.pid}</TD><TD>{p.holder}</TD><TD>{p.type}</TD><TD>{p.premium}</TD>
                <TD><div style={{width:80}}><ScoreBar value={p.risk} T={T} pendingText="…"/></div></TD>
                <TD><Chip color={p.aiRec==="Approve"?"green":p.aiRec==="Escalate"?"rose":p.aiRec==="Pending"?"blue":"amber"} T={T}>{p.aiRec}</Chip></TD>
                <TD><span style={{fontSize:12,color:T.text2}}>{p.uw}</span></TD>
                <TD><Btn T={T} style={{padding:"5px 10px",fontSize:11}}>{p._isPolicyFallback?"View":"Review"}</Btn></TD>
              </TR>
            ))}</tbody>
          </table>
        </Card>
        {selected?(
          <Card T={T}>
            <CardHdr title={selected.id} sub={selected.holder} T={T} action={<button onClick={()=>setSelected(null)} style={{background:"none",border:"none",color:T.text3,fontSize:18,cursor:"pointer"}}>✕</button>}/>
            <div style={{padding:"15px 18px"}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9,marginBottom:14}}>
                {[["Type",selected.type],["Premium",selected.premium],["Risk Score",selected.risk != null && !Number.isNaN(selected.risk) ? selected.risk : "—"],["Submitted",selected.submitted]].map(([l,v])=>(
                  <div key={l} style={{background:"rgba(99,102,241,.06)",borderRadius:8,padding:"9px 11px",border:"1px solid rgba(99,102,241,.1)"}}>
                    <div style={{fontSize:10,color:T.text3,marginBottom:3}}>{l}</div>
                    <div style={{fontSize:13,fontWeight:500,color:T.text}}>{v}</div>
                  </div>
                ))}
              </div>
              <div style={{background:"rgba(99,102,241,.08)",borderRadius:9,padding:"12px 14px",marginBottom:14,border:"1px solid rgba(99,102,241,.16)"}}>
                <div style={{fontSize:10,color:T.text3,marginBottom:4,letterSpacing:.8,textTransform:"uppercase"}}>AI Recommendation</div>
                <div style={{fontSize:14,fontWeight:700,color:T.accent2}}>{selected.aiRec}</div>
                <div style={{fontSize:11,color:T.text3,marginTop:3}}>{selected.risk != null && !Number.isNaN(selected.risk) ? `Risk score ${selected.risk} · sector & historical data` : "Risk score pending — connect Kafka and ai-risk-service, or wait for scoring to finish."}</div>
              </div>
              <div style={{marginBottom:12}}>
                <div style={{fontSize:10,color:T.text3,marginBottom:5,letterSpacing:.8,textTransform:"uppercase"}}>Underwriter Notes</div>
                <textarea ref={notesRef} rows={3} placeholder="Add your assessment…" style={{width:"100%",background:"rgba(99,102,241,.06)",border:"1px solid rgba(99,102,241,.14)",borderRadius:8,padding:"8px 10px",color:T.text,fontSize:12,outline:"none",fontFamily:"'DM Sans',sans-serif",resize:"vertical"}}/>
              </div>
              <div style={{display:"flex",gap:8}}>
                <Btn T={T} style={{flex:1,justifyContent:"center",background:"#10b981"}} disabled={submitting} onClick={()=>handleDecision("APPROVED",notesRef.current?.value)}>✓ Approve</Btn>
                <Btn T={T} variant="ghost" style={{flex:1,justifyContent:"center",color:"#f87171",border:"1px solid rgba(244,63,94,.25)"}} disabled={submitting} onClick={()=>handleDecision("REJECTED",notesRef.current?.value)}>✕ Reject</Btn>
              </div>
              <button style={{width:"100%",marginTop:8,padding:"8px",borderRadius:8,background:"rgba(245,158,11,.08)",border:"1px solid rgba(245,158,11,.22)",color:"#f59e0b",fontSize:12,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}} disabled={submitting} onClick={()=>handleDecision("ESCALATE",notesRef.current?.value)}>⬆ Escalate to Senior</button>
            </div>
          </Card>
        ):(
          <Card T={T}><div style={{padding:40,textAlign:"center",color:T.text3}}><div style={{fontSize:32,marginBottom:10}}>👆</div><div style={{fontSize:13}}>Click a policy to review</div></div></Card>
        )}
      </div>
    </div>),
    escalated:(<div>
      <div style={{fontFamily:"Syne",fontSize:22,fontWeight:700,marginBottom:6,color:T.text}}>{t("underwriter.page.escalatedTitle")}</div>
      <div style={{fontSize:13,color:T.text2,marginBottom:22}}>Requires senior underwriter review</div>
      <Card T={T}><div style={{padding:"14px 18px",display:"flex",flexDirection:"column",gap:10}}>
        {queueForUi.filter(p=>p.aiRec==="Escalate").map(p=>(
          <div key={p.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 16px",background:"rgba(244,63,94,.06)",borderRadius:11,border:"1px solid rgba(244,63,94,.16)"}}>
            <div>
              <div style={{fontSize:13,fontWeight:600,color:T.text}}>{p.pid} · {p.holder}</div>
              <div style={{fontSize:11,color:T.text3,marginTop:3}}>Risk: {p.risk ?? "—"} · {p.type} · Submitted {p.submitted}</div>
            </div>
            <Btn T={T} style={{background:"#f43f5e",padding:"7px 14px",fontSize:12}} onClick={()=>{setSelected(p);setNav("queue");}}>Review Now</Btn>
          </div>
        ))}
      </div></Card>
    </div>),
    approved:(<div><div style={{fontFamily:"Syne",fontSize:22,fontWeight:700,marginBottom:22,color:T.text}}>{t("underwriter.page.approvedTitle")}</div>
      <Card T={T}><table style={{width:"100%",borderCollapse:"collapse"}}>
        <thead><tr><TH>Policy ID</TH><TH>Holder</TH><TH>Type</TH><TH>Premium</TH><TH>Risk</TH><TH>Approved</TH></tr></thead>
        <tbody>{approvedForUi.map(p=>(<TR key={p.id}><TD mono accent={T.accent2}>{p.pid}</TD><TD>{p.holder}</TD><TD>{p.type}</TD><TD>{p.premium}</TD><TD><div style={{width:80}}><ScoreBar value={p.risk} T={T} pendingText="…"/></div></TD><TD><Chip color="green" T={T}>{p.updatedAt?new Date(p.updatedAt).toLocaleDateString("en-IN"):"—"}</Chip></TD></TR>))}</tbody>
      </table></Card>
    </div>),
    rules:(<div><div style={{fontFamily:"Syne",fontSize:22,fontWeight:700,marginBottom:22,color:T.text}}>{t("portal.underwriter.rules")}</div>
      <Card T={T}><div style={{padding:"14px 18px",display:"flex",flexDirection:"column",gap:8}}>
        {uwRules.length === 0 ? (
          <div style={{padding:16,fontSize:13,color:T.text2}}>No rules returned from rules-service. Add rules via the API or admin portal.</div>
        ) : (uwRules.map((r, i) => (
          <div key={r.code || r.id || i} style={{display:"flex",alignItems:"center",gap:13,padding:"11px 13px",background:"rgba(99,102,241,.05)",borderRadius:9,border:"1px solid rgba(99,102,241,.09)"}}>
            <span style={{fontFamily:"monospace",fontSize:11,color:T.accent2,width:66}}>{r.code || r.id || `RUL-${i + 1}`}</span>
            <div style={{flex:1}}><div style={{fontSize:13,fontWeight:500,color:T.text}}>{r.name || r.description || "Rule"}</div><div style={{fontSize:11,color:T.text3,fontFamily:"monospace",marginTop:1}}>{r.trigger || r.eventType || "—"}</div></div>
            <Chip color="green" T={T}>Active</Chip>
          </div>
        )))}
      </div></Card>
    </div>),
    reports:(<div><div style={{fontFamily:"Syne",fontSize:22,fontWeight:700,marginBottom:22,color:T.text}}>{t("portal.underwriter.reports")}</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16}}>
        <StatBox label="Pending review" value={String(queueForUi.length)} sub="in workflow queue" accent={T.accent} T={T}/>
        <StatBox label="Approved (workflow)" value={String(approvedForUi.length)} sub="completed workflows" accent="#10b981" T={T}/>
        <StatBox label="High risk in queue" value={String(queueForUi.filter((p) => p.risk != null && p.risk > 70).length)} sub="risk score &gt; 70 (ai-risk-service)" accent="#f43f5e" T={T}/>
      </div>
    </div>),
    policies:(<div><div style={{fontFamily:"Syne",fontSize:22,fontWeight:700,marginBottom:22,color:T.text}}>{t("portal.underwriter.policies")}</div>
      <Card T={T}><table style={{width:"100%",borderCollapse:"collapse"}}>
        <thead><tr><TH>Policy ID</TH><TH>Holder</TH><TH>Type</TH><TH>Premium</TH><TH>Risk</TH><TH>AI Rec</TH></tr></thead>
        <tbody>{[...queueForUi, ...approvedForUi.map((p) => ({ ...p, aiRec: "Approved" }))].map((p) => (
          <TR key={`${p.id}-${p.aiRec}`}>
            <TD mono accent={T.accent2}>{p.pid}</TD>
            <TD>{p.holder}</TD>
            <TD>{p.type}</TD>
            <TD>{p.premium}</TD>
            <TD><ScoreBar value={p.risk} T={T} pendingText="…"/></TD>
            <TD><Chip color={p.aiRec === "Approve" || p.aiRec === "Approved" ? "green" : p.aiRec === "Escalate" ? "rose" : p.aiRec === "Pending" ? "blue" : "amber"} T={T}>{p.aiRec}</Chip></TD>
          </TR>
        ))}</tbody>
      </table></Card>
    </div>),
  };
  const TITLES={
    home:t("portal.underwriter.home"),
    queue:t("portal.underwriter.queue"),
    policies:t("portal.underwriter.policies"),
    rules:t("portal.underwriter.rules"),
    approved:t("portal.underwriter.approved"),
    escalated:t("portal.underwriter.escalated"),
    reports:t("portal.underwriter.reports")
  };
  return (
    <div style={{display:"flex",minHeight:"100vh",background:T.bg}}>
      <div style={{position:"fixed",top:"-20%",right:"-10%",width:"50%",height:"60%",background:"radial-gradient(ellipse,rgba(99,102,241,.07) 0%,transparent 70%)",pointerEvents:"none",zIndex:0}}/>
      <Sidebar role="underwriter" nav={nav} setNav={setNav} T={T} onLogout={onLogout} lang={lang} setLang={setLang} t={t} badgeCounts={{ queue: String(queueForUi.length), escalated: String(queueForUi.filter((p) => p.aiRec === "Escalate").length) }}/>
      <div style={{marginLeft:248,flex:1,display:"flex",flexDirection:"column",position:"relative",zIndex:1}}>
        <Topbar title={TITLES[nav]||nav} sub={t("underwriter.portalSub")} T={T} userName={userName} roleLabel={t("auth.roleSeniorUnderwriter")} t={t}/>
        <div style={{padding:26,flex:1}} key={nav}>{pages[nav]||pages.home}</div>
      </div>
    </div>
  );
}

function ClaimsAdjusterPortal({ auth, onLogout, lang, setLang }) {
  const T=THEMES.claims;
  const t = useMemo(() => createT(lang), [lang]);
  const userName=auth?.user?.fullName||"Claims Adjuster";
  const [nav,setNav]=useState("home");
  const [claims,setClaims]=useState([]);
  const [selected,setSelected]=useState(null);
  const [loading,setLoading]=useState(true);
  const [err,setErr]=useState("");
  const [submitting,setSubmitting]=useState(false);
  const [fraudForm,setFraudForm]=useState({ claimId:"CLM-0091" });
  const [fraudResult,setFraudResult]=useState(null);
  const noteRef=useRef(null);
  const approvedAmtRef=useRef(null);
  useEffect(()=>{
    (async()=>{
      try {
        setLoading(true);
        const c=await api.getClaims();
        setClaims(Array.isArray(c)?c:c?.content??[]);
      } catch(e){ setErr(e.message); setClaims([]); }
      finally { setLoading(false); }
    })();
  },[]);
  useEffect(()=>{
    if (!claims.length) return;
    const exists = claims.some(c => c.claimNumber === fraudForm.claimId || c.id === fraudForm.claimId);
    if (!exists) {
      const first = claims[0];
      if (first?.claimNumber || first?.id) {
        setFraudForm({ claimId: first.claimNumber || first.id });
      }
    }
  },[claims]);
  useEffect(()=>{
    // Clear stale result when user changes claim ID
    setFraudResult(null);
  },[fraudForm.claimId]);
  const toClaim=(c)=>({id:c.id,cid:c.claimNumber,policy:c.policyNumber,holder:c.holderName||c.policyNumber,type:c.claimType,amount:c.claimedAmount?`₹${Number(c.claimedAmount).toLocaleString("en-IN")}`:"—",fraud:c.fraudScore??0,status:c.status,statusC:c.status==="APPROVED"||c.status==="SETTLED"?"green":c.status==="REJECTED"?"rose":c.status==="FRAUD_REVIEW"?"rose":"amber",...c});
  const claimsForUi=claims.map(toClaim);
  const openClaims=claimsForUi.filter(c=>!["APPROVED","REJECTED","SETTLED"].includes(c.status));
  const selectedFraudClaim = claims.find(c => c.claimNumber === fraudForm.claimId || c.id === fraudForm.claimId) || null;
  const selectedFraudAmount = Number(selectedFraudClaim?.claimedAmount || 0);
  async function handleStatus(claimId,status,approvedAmount){
    setSubmitting(true); setErr("");
    try {
      await api.updateClaimStatus(claimId,status,approvedAmount,noteRef.current?.value||"");
      setSelected(null);
      const c=await api.getClaims(); setClaims(Array.isArray(c)?c:c?.content??[]);
    } catch(e){ setErr(e.message); }
    finally { setSubmitting(false); }
  }
  async function handleRunFraudAnalysis(){
    setSubmitting(true);
    setErr("");
    try {
      const target = selectedFraudClaim;
      if (!target) throw new Error(t("claims.err.invalidClaim"));
      const amount = Number(target?.claimedAmount || 0);
      const req = {
        claim_id: fraudForm.claimId,
        claim_number: target?.claimNumber || fraudForm.claimId,
        policy_id: target?.policyId || "POL-UNKNOWN",
        holder_id: target?.holderId || (auth?.user?.id || "USR-UNKNOWN"),
        claim_type: target?.claimType || "OTHER",
        claimed_amount: amount,
        incident_date: target?.incidentDate || new Date().toISOString().slice(0,10),
        holder_claim_history: {
          totalPastClaims: 1,
          avgClaimAmount: amount || 10000
        }
      };
      const result = await api.detectFraud(req);
      setFraudResult({
        fraud_score: result?.fraud_score ?? 0,
        verdict: result?.verdict ?? "LOW_RISK",
        anomalies: Array.isArray(result?.anomalies) ? result.anomalies : ["No anomalies"]
      });
    } catch (e) {
      setErr(e.message || t("claims.err.fraudFailed"));
    } finally {
      setSubmitting(false);
    }
  }
  const pages={
    home:(<div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:16,marginBottom:26}}>
        {[["📂",t("claims.kpi.openTitle"),String(openClaims.length),t("claims.kpi.openSub"),T.accent],["🔍",t("claims.kpi.fraudTitle"),String(openClaims.filter(x=>x.fraud>70).length),t("claims.kpi.fraudSub"),"#f43f5e"],["🔎",t("claims.kpi.invTitle"),String(openClaims.filter(x=>x.status==="INVESTIGATION").length),t("claims.kpi.invSub"),"#f59e0b"],["✅",t("claims.kpi.approvedTitle"),String(claimsForUi.filter(x=>["APPROVED","SETTLED"].includes(x.status)).length),t("claims.kpi.approvedSub"),"#10b981"]].map(([ic,l,v,s,c],i)=>(
          <div key={`kpi-${i}`} className="fadeUp" style={{background:T.surface,border:"1px solid rgba(200,150,100,.08)",borderRadius:16,padding:18,position:"relative",overflow:"hidden"}}>
            <div style={{position:"absolute",top:-20,right:-20,width:80,height:80,borderRadius:"50%",background:c,opacity:.06,filter:"blur(25px)"}}/>
            <div style={{width:36,height:36,borderRadius:9,background:`${c}18`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,marginBottom:12}}>{ic}</div>
            <div style={{fontFamily:"Syne",fontSize:20,fontWeight:700,color:c}}>{v}</div>
            <div style={{fontSize:12,color:T.text2,marginTop:3}}>{l}</div>
            <div style={{fontSize:11,color:T.text3,marginTop:3}}>{s}</div>
          </div>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 320px",gap:16}}>
        <Card T={T}>
          <CardHdr title={t("claims.card.openTitle")} sub={t("claims.card.openSub")} T={T} action={<button onClick={()=>setNav("open")} style={{background:"none",border:"none",color:T.accent2,fontSize:12,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>{t("common.viewAll")}</button>}/>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><tr><TH>{t("claims.th.claimId")}</TH><TH>{t("claims.th.holder")}</TH><TH>{t("claims.th.amount")}</TH><TH>{t("claims.th.aiFraud")}</TH><TH>{t("claims.th.status")}</TH></tr></thead>
            <tbody>{openClaims.map(c=>(<TR key={c.id} onClick={()=>setSelected(c)} style={{cursor:"pointer"}}><TD mono accent={T.accent2}>{c.cid}</TD><TD>{c.holder}</TD><TD>{c.amount}</TD><TD><span style={{fontWeight:700,color:c.fraud>70?"#f43f5e":c.fraud>50?"#f59e0b":"#10b981"}}>{c.fraud}{c.fraud>70?" ⚠":""}</span></TD><TD><Chip color={c.statusC} T={T}>{c.status}</Chip></TD></TR>))}</tbody>
          </table>
        </Card>
        <Card T={T}>
          <CardHdr title={`🔍 ${t("claims.card.fraudTitle")}`} sub={t("claims.card.fraudSub")} T={T}/>
          <div style={{padding:"12px 15px",display:"flex",flexDirection:"column",gap:9}}>
            {openClaims.filter(c=>c.fraud>60).map(c=>(
              <div key={c.id} style={{padding:"11px 13px",background:"rgba(244,63,94,.07)",borderRadius:9,border:"1px solid rgba(244,63,94,.16)"}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                  <span style={{fontSize:12,fontWeight:700,color:T.text,fontFamily:"monospace"}}>{c.id}</span>
                  <span style={{fontFamily:"Syne",fontSize:16,fontWeight:700,color:"#f43f5e"}}>{c.fraud}</span>
                </div>
                <div style={{fontSize:11,color:T.text2}}>{c.holder} · {c.type}</div>
                <div style={{fontSize:11,color:"#f43f5e",marginTop:3}}>⚠ {t("claims.fraud.anomaly")}</div>
                <Btn T={T} style={{marginTop:8,padding:"5px 11px",fontSize:11,background:"rgba(244,63,94,.18)",color:"#f87171",border:"1px solid rgba(244,63,94,.28)"}} onClick={()=>{setSelected(c);setNav("open");}}>{t("claims.btn.investigate")}</Btn>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>),
    open:(<div><div style={{fontFamily:"Syne",fontSize:22,fontWeight:700,marginBottom:22,color:T.text}}>{t("portal.claims.open")}</div>
      {err&&<div style={{padding:10,marginBottom:14,background:"rgba(239,68,68,.1)",borderRadius:9,color:"#ef4444",fontSize:13}}>{err}</div>}
      <div style={{display:"grid",gridTemplateColumns:selected?"1fr 340px":"1fr",gap:16}}>
        <Card T={T}><table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr><TH>{t("claims.th.claimId")}</TH><TH>{t("claims.th.policy")}</TH><TH>{t("claims.th.holder")}</TH><TH>{t("claims.th.type")}</TH><TH>{t("claims.th.amount")}</TH><TH>{t("claims.th.fraudScore")}</TH><TH>{t("claims.th.status")}</TH><TH></TH></tr></thead>
          <tbody>{openClaims.map(c=>(<TR key={c.id} onClick={()=>setSelected(c)} style={{cursor:"pointer"}}><TD mono accent={T.accent2}>{c.cid}</TD><TD>{c.policy}</TD><TD>{c.holder}</TD><TD>{c.type}</TD><TD>{c.amount}</TD><TD><span style={{fontWeight:700,color:c.fraud>70?"#f43f5e":c.fraud>50?"#f59e0b":"#10b981"}}>{c.fraud}{c.fraud>70?" ⚠":""}</span></TD><TD><Chip color={c.statusC} T={T}>{c.status}</Chip></TD><TD><Btn T={T} style={{padding:"5px 10px",fontSize:11}} onClick={e=>{e.stopPropagation();setNav("open");setSelected(c);}}>{t("claims.btn.adjudicate")}</Btn></TD></TR>))}</tbody>
        </table></Card>
        {selected?(<Card T={T}>
          <CardHdr title={selected.cid} sub={selected.holder} T={T} action={<button onClick={()=>setSelected(null)} style={{background:"none",border:"none",color:T.text3,fontSize:18,cursor:"pointer"}}>✕</button>}/>
          <div style={{padding:"15px 18px"}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9,marginBottom:14}}>
              {[[t("claims.detail.type"),selected.type],[t("claims.detail.amount"),selected.amount],[t("claims.detail.fraud"),selected.fraud],[t("claims.detail.status"),selected.status]].map(([l,v])=>(
                <div key={String(l)} style={{background:"rgba(200,150,100,.06)",borderRadius:8,padding:"9px 11px",border:"1px solid rgba(200,150,100,.1)"}}>
                  <div style={{fontSize:10,color:T.text3,marginBottom:3}}>{l}</div>
                  <div style={{fontSize:13,fontWeight:500,color:T.text}}>{String(v)}</div>
                </div>
              ))}
            </div>
            <div style={{marginBottom:12}}><div style={{fontSize:10,color:T.text3,marginBottom:5}}>{t("claims.detail.approvedAmt")}</div><input ref={approvedAmtRef} type="number" placeholder={t("claims.detail.optional")} style={{width:"100%",background:"rgba(200,150,100,.06)",border:"1px solid rgba(200,150,100,.14)",borderRadius:8,padding:"8px 10px",color:T.text,fontSize:12,outline:"none",fontFamily:"'DM Sans',sans-serif"}}/></div>
            <div style={{marginBottom:12}}><div style={{fontSize:10,color:T.text3,marginBottom:5}}>{t("claims.detail.note")}</div><textarea ref={noteRef} rows={2} placeholder={t("claims.detail.notePh")} style={{width:"100%",background:"rgba(200,150,100,.06)",border:"1px solid rgba(200,150,100,.14)",borderRadius:8,padding:"8px 10px",color:T.text,fontSize:12,outline:"none",fontFamily:"'DM Sans',sans-serif",resize:"vertical"}}/></div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              <Btn T={T} style={{flex:1,background:"#10b981"}} disabled={submitting} onClick={()=>handleStatus(selected.id,"APPROVED",parseFloat(approvedAmtRef.current?.value||0)||undefined)}>{t("claims.btn.approve")}</Btn>
              <Btn T={T} variant="ghost" style={{flex:1,color:"#f87171",border:"1px solid rgba(244,63,94,.25)"}} disabled={submitting} onClick={()=>handleStatus(selected.id,"REJECTED")}>{t("claims.btn.reject")}</Btn>
              <Btn T={T} variant="ghost" style={{width:"100%",padding:"11px"}} disabled={submitting} onClick={()=>handleStatus(selected.id,"INVESTIGATION")}>{t("claims.btn.investigateFull")}</Btn>
            </div>
          </div>
        </Card>):null}
      </div>
    </div>),
    fraud:(<div><div style={{fontFamily:"Syne",fontSize:22,fontWeight:700,marginBottom:22,color:T.text}}>{t("portal.claims.fraud")}</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16,marginBottom:22}}>
        <StatBox label={t("claims.fraud.stats.flags")} value={String(openClaims.filter((c) => c.fraud > 60).length)} sub={t("claims.fraud.stats.subFlags")} accent="#f43f5e" T={T}/>
        <StatBox label={t("claims.kpi.openTitle")} value={String(openClaims.length)} sub={t("claims.kpi.openSub")} accent={T.accent} T={T}/>
        <StatBox label={t("claims.kpi.invTitle")} value={String(openClaims.filter((c) => c.status === "INVESTIGATION").length)} sub={t("claims.kpi.invSub")} accent="#f59e0b" T={T}/>
      </div>
      <Card T={T}><CardHdr title={t("claims.flagged.title")} sub={t("claims.flagged.sub")} T={T}/>
        <div style={{padding:"14px 18px",display:"flex",flexDirection:"column",gap:11}}>
          {openClaims.filter(c=>c.fraud>50).map(c=>(
            <div key={c.id} style={{background:"rgba(244,63,94,.05)",borderRadius:11,border:"1px solid rgba(244,63,94,.14)",padding:"14px 16px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:9}}>
                <div><div style={{fontFamily:"Syne",fontSize:13,fontWeight:700,color:T.text}}>{c.id} · {c.holder}</div><div style={{fontSize:12,color:T.text3,marginTop:2}}>{c.type} · {t("claims.fraud.claimedPrefix")} {c.amount}</div></div>
                <div style={{textAlign:"right"}}><div style={{fontFamily:"Syne",fontSize:22,fontWeight:700,color:"#f43f5e"}}>{c.fraud}</div><div style={{fontSize:10,color:"#f43f5e"}}>{t("claims.fraudScoreLabel")}</div></div>
              </div>
              <div style={{display:"flex",gap:8}}>
                <Btn T={T} style={{padding:"6px 13px",fontSize:12,background:"rgba(244,63,94,.18)",color:"#f87171",border:"1px solid rgba(244,63,94,.28)"}} onClick={()=>{setSelected(c);setNav("open");}}>{t("claims.btn.investigateFull")}</Btn>
                <Btn T={T} variant="ghost" style={{padding:"6px 13px",fontSize:12,color:"#10b981",border:"1px solid rgba(16,185,129,.25)"}} onClick={()=>handleStatus(c.id,"PROCESSING")}>{t("claims.btn.markLegitimate")}</Btn>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>),
    aifraud:(<div><div style={{fontFamily:"Syne",fontSize:22,fontWeight:700,marginBottom:22,color:T.text}}>{t("portal.claims.aifraud")}</div>
      {err&&<div style={{padding:10,marginBottom:14,background:"rgba(239,68,68,.1)",borderRadius:9,color:"#ef4444",fontSize:13}}>{err}</div>}
      <Card T={T}><CardHdr title={t("claims.aifraud.runTitle")} sub={t("claims.aifraud.runSub")} T={T}/>
        <div style={{padding:"20px 24px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
          <div><div style={{fontSize:10,color:T.text3,textTransform:"uppercase",letterSpacing:.8,marginBottom:6}}>{t("claims.form.claimId")}</div><input value={fraudForm.claimId} onChange={e=>setFraudForm(f=>({...f, claimId: e.target.value}))} style={{width:"100%",background:"rgba(200,150,100,.06)",border:"1px solid rgba(200,150,100,.14)",borderRadius:8,padding:"9px 12px",color:T.text,fontSize:13,outline:"none",fontFamily:"'DM Sans',sans-serif"}}/></div>
          <div><div style={{fontSize:10,color:T.text3,textTransform:"uppercase",letterSpacing:.8,marginBottom:6}}>{t("claims.form.claimAmt")}</div><input value={selectedFraudAmount ? `${selectedFraudAmount}` : ""} readOnly placeholder={t("claims.form.autoFill")} style={{width:"100%",background:"rgba(200,150,100,.06)",border:"1px solid rgba(200,150,100,.14)",borderRadius:8,padding:"9px 12px",color:T.text,fontSize:13,outline:"none",fontFamily:"'DM Sans',sans-serif"}}/></div>
          <div style={{gridColumn:"1/-1",background:"rgba(244,63,94,.07)",borderRadius:12,padding:"16px 18px",border:"1px solid rgba(244,63,94,.18)"}}>
            <div style={{fontSize:10,color:"#f43f5e",marginBottom:7,letterSpacing:.8,textTransform:"uppercase"}}>{t("claims.ai.result")}</div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <div style={{fontFamily:"Syne",fontSize:32,fontWeight:700,color:"#f43f5e"}}>{fraudResult?.fraud_score ?? "—"}</div>
              <Chip color={(fraudResult?.verdict||"").includes("HIGH")?"rose":(fraudResult?.verdict||"").includes("MEDIUM")?"amber":"green"} T={T}>{fraudResult ? (fraudResult.verdict||"N/A").replaceAll("_"," ") : t("claims.ai.notAnalyzed")}</Chip>
            </div>
            {(fraudResult?.anomalies?.length?fraudResult.anomalies:[t("claims.ai.runHint")]).map((a,i)=><div key={i} style={{fontSize:12,color:"#f87171",marginBottom:3}}>⚠ {String(a).replaceAll("_"," ")}</div>)}
          </div>
          <Btn T={T} disabled={submitting} onClick={handleRunFraudAnalysis}>{submitting?t("claims.btn.running"):t("claims.btn.runAnalysis")}</Btn>
        </div>
      </Card>
    </div>),
    approved:(<div><div style={{fontFamily:"Syne",fontSize:22,fontWeight:700,marginBottom:22,color:T.text}}>{t("portal.claims.approved")}</div>
      <Card T={T}><table style={{width:"100%",borderCollapse:"collapse"}}>
        <thead><tr><TH>{t("claims.th.claimId")}</TH><TH>{t("claims.th.holder")}</TH><TH>{t("claims.th.amount")}</TH><TH>{t("claims.th.fraudScore")}</TH><TH>{t("claims.th.approvedCol")}</TH></tr></thead>
        <tbody>{claimsForUi.filter(c=>["APPROVED","SETTLED"].includes(c.status)).map(c=>(<TR key={c.id}><TD mono accent={T.accent2}>{c.cid}</TD><TD>{c.holder}</TD><TD>{c.amount}</TD><TD><span style={{color:"#10b981",fontWeight:600}}>{c.fraud}</span></TD><TD><Chip color="green" T={T}>{c.filedAt?new Date(c.filedAt).toLocaleDateString("en-IN"):"—"}</Chip></TD></TR>))}</tbody>
      </table></Card>
    </div>),
    reports:(<div><div style={{fontFamily:"Syne",fontSize:22,fontWeight:700,marginBottom:22,color:T.text}}>{t("portal.claims.reports")}</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16}}>
        <StatBox label={t("claims.reports.stat1")} value={String(claimsForUi.length)} sub={t("claims.reports.stat1sub")} accent={T.accent} T={T}/>
        <StatBox label={t("claims.kpi.openTitle")} value={String(openClaims.length)} sub={t("claims.kpi.openSub")} accent="#f59e0b" T={T}/>
        <StatBox label={t("claims.kpi.approvedTitle")} value={String(claimsForUi.filter((c) => ["APPROVED", "SETTLED"].includes(c.status)).length)} sub={t("claims.kpi.approvedSub")} accent="#10b981" T={T}/>
      </div>
    </div>),
  };
  const TITLES={home:t("portal.claims.home"),open:t("portal.claims.open"),fraud:t("portal.claims.fraud"),approved:t("portal.claims.approved"),aifraud:t("portal.claims.aifraud"),reports:t("portal.claims.reports")};
  return (
    <div style={{display:"flex",minHeight:"100vh",background:T.bg}}>
      <div style={{position:"fixed",top:"-20%",left:"-10%",width:"60%",height:"60%",background:"radial-gradient(ellipse,rgba(245,158,11,.05) 0%,transparent 70%)",pointerEvents:"none",zIndex:0}}/>
      <Sidebar
        role="claims"
        nav={nav}
        setNav={setNav}
        T={T}
        onLogout={onLogout}
        lang={lang}
        setLang={setLang}
        t={t}
        badgeCounts={{
          open: String(openClaims.length),
          fraud: String(openClaims.filter(c=>c.fraud>70).length)
        }}
      />
      <div style={{marginLeft:248,flex:1,display:"flex",flexDirection:"column",position:"relative",zIndex:1}}>
        <Topbar title={TITLES[nav]||nav} sub={t("claims.portalSub")} T={T} userName={userName} roleLabel={t("auth.roleClaimsAdjuster")} t={t}/>
        <div style={{padding:26,flex:1}} key={nav}>{pages[nav]||pages.home}</div>
      </div>
    </div>
  );
}

function AdminPortal({ auth, onLogout, lang, setLang }) {
  const T=THEMES.admin;
  const t = useMemo(() => createT(lang), [lang]);
  const userName=auth?.user?.fullName||"Admin";
  const [nav,setNav]=useState("home");
  const [users,setUsers]=useState([]);
  const [rules,setRules]=useState([]);
  const [showAddUser,setShowAddUser]=useState(false);
  const [err,setErr]=useState("");
  const [submitting,setSubmitting]=useState(false);
  const [dash,setDash]=useState({ policies: [], claims: [] });
  const addUserRef=useRef({});
  useEffect(()=>{
    (async()=>{
      try {
        const [u,r,p,c]=await Promise.all([api.getUsers().catch(()=>[]),api.getRules().catch(()=>[]),api.getAllPolicies().catch(()=>[]),api.getClaims().catch(()=>[])]);
        setUsers(Array.isArray(u)?u:[]);
        setRules(Array.isArray(r)?r:r?.content??[]);
        setDash({ policies: Array.isArray(p)?p:[], claims: Array.isArray(c)?c:[] });
      } catch(e){ setErr(e.message); }
    })();
  },[]);
  async function handleAddUser(){
    const f=addUserRef.current;
    const email=f?.email?.value?.trim(), password=f?.password?.value, fullName=f?.fullName?.value?.trim(), role=f?.role?.value||"CUSTOMER";
    if(!email||!password||!fullName) return setErr(t("admin.users.errFill"));
    setSubmitting(true); setErr("");
    try {
      await api.createUser({email,password,fullName,role});
      setShowAddUser(false);
      const u=await api.getUsers(); setUsers(Array.isArray(u)?u:[]);
    } catch(e){ setErr(e.message); }
    finally { setSubmitting(false); }
  }
  const pages={
    home:(<div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:16,marginBottom:26}}>
        {[["⚙️",String(SERVICES_LIST.length),t("admin.kpi.micro.label"),t("admin.kpi.micro.sub"),T.accent],["👥",String(users.length||0),t("admin.kpi.users.label"),t("admin.kpi.users.sub"),T.accent2],["📋",String(dash.policies.length),t("admin.reports.policies"),t("admin.reports.policiesSub"),"#10b981"],["📁",String(dash.claims.length),t("admin.reports.claims"),t("admin.reports.claimsSub"),"#f59e0b"]].map(([ic,v,l,s,c],i)=>(
          <div key={`adm-kpi-${i}`} className="fadeUp" style={{background:T.surface,border:"1px solid rgba(100,150,255,.08)",borderRadius:16,padding:18,position:"relative",overflow:"hidden"}}>
            <div style={{position:"absolute",top:-20,right:-20,width:80,height:80,borderRadius:"50%",background:c,opacity:.06,filter:"blur(25px)"}}/>
            <div style={{width:36,height:36,borderRadius:9,background:`${c}18`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,marginBottom:12}}>{ic}</div>
            <div style={{fontFamily:"Syne",fontSize:20,fontWeight:700,color:c}}>{v}</div>
            <div style={{fontSize:12,color:T.text2,marginTop:3}}>{l}</div>
            <div style={{fontSize:11,color:T.text3,marginTop:3}}>{s}</div>
          </div>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
        <Card T={T}>
          <CardHdr title={t("admin.card.healthTitle")} sub={t("admin.card.healthSub")} T={T} action={<button onClick={()=>setNav("services")} style={{background:"none",border:"none",color:T.accent2,fontSize:12,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>{t("common.viewAll")}</button>}/>
          <div style={{padding:"12px 16px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
            {SERVICES_LIST.map(s=>(<div key={s.name} style={{display:"flex",alignItems:"center",gap:7,padding:"7px 9px",background:"rgba(59,130,246,.04)",borderRadius:7}}><div style={{width:6,height:6,borderRadius:"50%",background:"#10b981",flexShrink:0}}/><span style={{fontFamily:"monospace",fontSize:10,color:T.text2,flex:1}}>{s.name}</span><span style={{fontSize:10,color:T.text3}}>:{s.port}</span></div>))}
          </div>
        </Card>
        <Card T={T}>
          <CardHdr title={t("admin.card.usersTitle")} sub={t("admin.card.usersSub")} T={T} action={<button onClick={()=>setNav("users")} style={{background:"none",border:"none",color:T.accent2,fontSize:12,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>{t("common.viewAll")}</button>}/>
          <div style={{padding:"12px 16px",display:"flex",flexDirection:"column",gap:7}}>
            {(users.length?users:USERS_LIST).slice(0,5).map(u=>(<div key={u.id||u.email} style={{display:"flex",alignItems:"center",gap:9,padding:"8px 10px",background:"rgba(59,130,246,.04)",borderRadius:8}}>
              <div style={{width:27,height:27,borderRadius:7,background:`linear-gradient(135deg,${T.accent},${T.accent2})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:"#fff",flexShrink:0}}>{(u.fullName||u.name||"U")[0]}</div>
              <div style={{flex:1}}><div style={{fontSize:12,fontWeight:500,color:T.text}}>{u.fullName||u.name}</div><div style={{fontSize:10,color:T.text3}}>{u.roles?.[0]||u.role||"—"}</div></div>
              <Chip color="green" T={T}>{t("admin.status.active")}</Chip>
            </div>))}
          </div>
        </Card>
      </div>
    </div>),
    users:(<div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:22}}>
        <div><div style={{fontFamily:"Syne",fontSize:22,fontWeight:700,color:T.text}}>{t("portal.admin.users")}</div><div style={{fontSize:13,color:T.text2,marginTop:3}}>{t("admin.users.pageSub")}</div></div>
        <Btn T={T} onClick={()=>setShowAddUser(true)}>{t("admin.users.addUser")}</Btn>
      </div>
      {err&&<div style={{padding:10,marginBottom:14,background:"rgba(239,68,68,.1)",borderRadius:9,color:"#ef4444",fontSize:13}}>{err}</div>}
      {showAddUser&&(<Card T={T} style={{marginBottom:16}}><div style={{padding:"20px 24px"}}>
        <div style={{fontSize:13,fontWeight:600,marginBottom:14}}>{t("admin.users.addNewTitle")}</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
          <div><div style={{fontSize:10,color:T.text3,marginBottom:4}}>{t("admin.users.field.fullName")}</div><input ref={el=>{if(el)addUserRef.current.fullName=el}} placeholder={t("admin.users.ph.fullName")} style={{width:"100%",background:"rgba(59,130,246,.06)",border:"1px solid rgba(59,130,246,.14)",borderRadius:8,padding:"9px 12px",color:T.text,fontSize:13,outline:"none",fontFamily:"'DM Sans',sans-serif"}}/></div>
          <div><div style={{fontSize:10,color:T.text3,marginBottom:4}}>{t("admin.users.field.email")}</div><input ref={el=>{if(el)addUserRef.current.email=el}} type="email" placeholder={t("admin.users.ph.email")} style={{width:"100%",background:"rgba(59,130,246,.06)",border:"1px solid rgba(59,130,246,.14)",borderRadius:8,padding:"9px 12px",color:T.text,fontSize:13,outline:"none",fontFamily:"'DM Sans',sans-serif"}}/></div>
          <div><div style={{fontSize:10,color:T.text3,marginBottom:4}}>{t("admin.users.field.password")}</div><input ref={el=>{if(el)addUserRef.current.password=el}} type="password" placeholder={t("admin.users.ph.password")} style={{width:"100%",background:"rgba(59,130,246,.06)",border:"1px solid rgba(59,130,246,.14)",borderRadius:8,padding:"9px 12px",color:T.text,fontSize:13,outline:"none",fontFamily:"'DM Sans',sans-serif"}}/></div>
          <div><div style={{fontSize:10,color:T.text3,marginBottom:4}}>{t("admin.users.field.role")}</div><select ref={el=>{if(el)addUserRef.current.role=el}} style={{width:"100%",background:"rgba(59,130,246,.06)",border:"1px solid rgba(59,130,246,.14)",borderRadius:8,padding:"9px 12px",color:T.text,fontSize:13,outline:"none",fontFamily:"'DM Sans',sans-serif"}}><option value="CUSTOMER">{t("auth.customer")}</option><option value="ADMIN">{t("auth.admin")}</option><option value="UNDERWRITER">{t("auth.underwriter")}</option><option value="CLAIMS_ADJUSTER">{t("auth.claimsAdjuster")}</option><option value="AI_ANALYST">{t("auth.aiAnalyst")}</option></select></div>
        </div>
        <div style={{display:"flex",gap:8}}><Btn T={T} onClick={handleAddUser} disabled={submitting}>{submitting?t("admin.users.creating"):t("admin.users.createUser")}</Btn><Btn T={T} variant="ghost" onClick={()=>{setShowAddUser(false);setErr("");}}>{t("common.cancel")}</Btn></div>
      </div></Card>)}
      <Card T={T}><table style={{width:"100%",borderCollapse:"collapse"}}>
        <thead><tr><TH>{t("admin.th.userId")}</TH><TH>{t("admin.th.name")}</TH><TH>{t("admin.th.email")}</TH><TH>{t("admin.th.role")}</TH><TH>{t("admin.th.status")}</TH></tr></thead>
        <tbody>{(users.length?users:USERS_LIST).map(u=>(<TR key={u.id||u.email}><TD mono accent={T.accent2}>{u.id?.slice(0,8)||u.id||"—"}</TD>
          <TD><div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:26,height:26,borderRadius:6,background:`linear-gradient(135deg,${T.accent},${T.accent2})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:"#fff"}}>{(u.fullName||u.name||"U")[0]}</div>{u.fullName||u.name}</div></TD>
          <TD>{u.email}</TD><TD><Chip color={u.roles?.[0]==="ADMIN"?"rose":u.roles?.[0]==="AI_ANALYST"?"violet":u.roles?.[0]==="UNDERWRITER"?"blue":u.roles?.[0]==="CLAIMS_ADJUSTER"?"amber":"green"} T={T}>{u.roles?.[0]||u.role||"CUSTOMER"}</Chip></TD>
          <TD><Chip color="green" T={T}>{t("admin.status.active")}</Chip></TD></TR>))}</tbody>
      </table></Card>
    </div>),
    services:(<div><div style={{fontFamily:"Syne",fontSize:22,fontWeight:700,marginBottom:22,color:T.text}}>{t("portal.admin.services")}</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:11}}>
        {SERVICES_LIST.map(s=>(<div key={s.name} style={{background:T.surface,border:"1px solid rgba(100,150,255,.08)",borderRadius:13,padding:"15px 17px",display:"flex",alignItems:"center",gap:11}}>
          <div style={{width:34,height:34,borderRadius:9,background:s.lang==="Python"?"rgba(45,212,191,.12)":"rgba(245,158,11,.12)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:17}}>{s.lang==="Python"?"🐍":"☕"}</div>
          <div style={{flex:1}}><div style={{fontFamily:"monospace",fontSize:11,color:T.text}}>{s.name}</div><div style={{fontSize:10,color:T.text3,marginTop:1}}>:{s.port} · {s.lang}</div></div>
          <div style={{display:"flex",alignItems:"center",gap:4}}><PulseDot/><span style={{fontSize:11,color:"#10b981"}}>{t("admin.status.up")}</span></div>
        </div>))}
      </div>
    </div>),
    rules:(<div><div style={{fontFamily:"Syne",fontSize:22,fontWeight:700,marginBottom:22,color:T.text}}>{t("admin.rules.title")}</div>
      <Card T={T}><div style={{padding:"14px 18px",display:"flex",flexDirection:"column",gap:8}}>
        {(rules.length?rules:[{code:"RUL-001",name:"Eligibility Check",trigger:"POLICY_CREATED"},{code:"RUL-002",name:"IRDAI Compliance",trigger:"POLICY_APPROVED"},{code:"RUL-003",name:"High Risk Escalate",trigger:"RISK_SCORE_GT_70"},{code:"RUL-004",name:"Auto-Renewal",trigger:"EXPIRY_30D"}]).map((r,i)=>(
          <div key={r.code||r.id||i} style={{display:"flex",alignItems:"center",gap:13,padding:"11px 13px",background:"rgba(59,130,246,.05)",borderRadius:9,border:"1px solid rgba(59,130,246,.09)"}}><span style={{fontFamily:"monospace",fontSize:11,color:T.accent2,width:66}}>{r.code||r.id||`RUL-00${i+1}`}</span><div style={{flex:1}}><div style={{fontSize:13,fontWeight:500,color:T.text}}>{r.name||r.description||"Rule"}</div><div style={{fontSize:11,color:T.text3,fontFamily:"monospace",marginTop:1}}>{r.trigger||r.eventType||"—"}</div></div><Chip color="green" T={T}>{t("admin.status.active")}</Chip><Btn T={T} variant="ghost" style={{padding:"5px 9px",fontSize:11}}>{t("admin.rules.edit")}</Btn></div>
        ))}
      </div></Card>
    </div>),
    reports:(<div><div style={{fontFamily:"Syne",fontSize:22,fontWeight:700,marginBottom:22,color:T.text}}>{t("admin.reports.title")}</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:16}}>
        <StatBox label={t("admin.reports.policies")} value={String(dash.policies.length)} sub={t("admin.reports.policiesSub")} accent={T.accent} T={T}/>
        <StatBox label={t("admin.reports.claims")} value={String(dash.claims.length)} sub={t("admin.reports.claimsSub")} accent="#f43f5e" T={T}/>
        <StatBox label={t("admin.kpi.users.label")} value={String(users.length)} sub={t("admin.kpi.users.sub")} accent="#10b981" T={T}/>
        <StatBox label={t("admin.rules.title")} value={String(rules.length)} sub="rules-service" accent="#f59e0b" T={T}/>
      </div>
    </div>),
  };
  const TITLES={home:t("portal.admin.home"),users:t("portal.admin.users"),services:t("portal.admin.services"),rules:t("portal.admin.rules"),reports:t("portal.admin.reports")};
  return (
    <div style={{display:"flex",minHeight:"100vh",background:T.bg}}>
      <div style={{position:"fixed",top:"-20%",left:"-10%",width:"60%",height:"60%",background:"radial-gradient(ellipse,rgba(59,130,246,.07) 0%,transparent 70%)",pointerEvents:"none",zIndex:0}}/>
      <Sidebar role="admin" nav={nav} setNav={setNav} T={T} onLogout={onLogout} lang={lang} setLang={setLang} t={t}/>
      <div style={{marginLeft:248,flex:1,display:"flex",flexDirection:"column",position:"relative",zIndex:1}}>
        <Topbar title={TITLES[nav]||nav} sub={t("admin.portalSub")} T={T} userName={userName} roleLabel={t("auth.roleSystemAdmin")} t={t}/>
        <div style={{padding:26,flex:1}} key={nav}>{pages[nav]||pages.home}</div>
      </div>
    </div>
  );
}

function aiHealthOk(h) {
  if (!h || typeof h !== "object") return false;
  const s = String(h.status || "").toLowerCase();
  return s === "ok" || s === "healthy" || Boolean(h.service);
}

function AiAnalystPortal({ auth, onLogout, lang, setLang }) {
  const T=THEMES.ai;
  const t = useMemo(() => createT(lang), [lang]);
  const [nav,setNav]=useState("home");
  const [aiHealth,setAiHealth]=useState({ risk:null, fraud:null, document:null, assistant:null, loading:true });
  useEffect(()=>{
    let c=false;
    (async()=>{
      const [risk,fraud,document,assistant]=await Promise.all([
        api.getAIRiskHealth().catch(()=>null),
        api.getAIFraudHealth().catch(()=>null),
        api.getAIDocumentHealth().catch(()=>null),
        api.getAIAssistantHealth().catch(()=>null),
      ]);
      if(!c) setAiHealth({ risk,fraud,document,assistant,loading:false });
    })();
    return ()=>{ c=true; };
  },[]);
  const services=[
    { key:"risk", name:"ai-risk-service", port:9001, stack:"Risk scoring (Kafka + rules)", icon:"📊", color:"#818cf8", h: aiHealth.risk, path:"/api/ai/risk/health" },
    { key:"fraud", name:"ai-fraud-service", port:9002, stack:"Fraud detection", icon:"🔍", color:"#f43f5e", h: aiHealth.fraud, path:"/api/ai/fraud/health" },
    { key:"document", name:"ai-document-service", port:9003, stack:"Document analysis", icon:"📄", color:"#2dd4bf", h: aiHealth.document, path:"/api/ai/documents/health" },
    { key:"assistant", name:"ai-assistant-service", port:9004, stack:"Assistant (customer portal)", icon:"💬", color:"#a78bfa", h: aiHealth.assistant, path:"/api/ai/assistant/health" },
  ];
  const onlineN = services.filter((s) => aiHealthOk(s.h)).length;
  const pages={
    home:(<div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:16,marginBottom:26}}>
        {[["🤖",aiHealth.loading?"…":`${onlineN}/4`,"Python AI services","of 4 · GET /api/ai/*/health via gateway",T.accent],[String(SERVICES_LIST.length),String(SERVICES_LIST.length),t("admin.kpi.micro.label"),"Java + Python (see Admin → Services)",T.accent2],["🟢",aiHealth.loading?"…":String(onlineN),"Healthy endpoints","api-gateway → :9001–:9004","#2dd4bf"],["⚡","Kafka",t("admin.kpi.kafka.label"),"risk-evaluation-requests + results","#f59e0b"]].map(([ic,v,l,s,c],i)=>(
          <div key={`ai-kpi-${i}`} className="fadeUp" style={{background:T.surface,border:"1px solid rgba(130,100,200,.08)",borderRadius:16,padding:18,position:"relative",overflow:"hidden"}}>
            <div style={{position:"absolute",top:-20,right:-20,width:80,height:80,borderRadius:"50%",background:c,opacity:.07,filter:"blur(25px)"}}/>
            <div style={{width:36,height:36,borderRadius:9,background:`${c}18`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,marginBottom:12}}>{ic}</div>
            <div style={{fontFamily:"Syne",fontSize:20,fontWeight:700,color:c}}>{v}</div>
            <div style={{fontSize:12,color:T.text2,marginTop:3}}>{l}</div>
            <div style={{fontSize:11,color:T.text3,marginTop:3}}>{s}</div>
          </div>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
        {services.map(s=>(<div key={s.name} style={{background:T.surface,border:"1px solid rgba(130,100,200,.08)",borderRadius:16,padding:18,transition:"all .2s"}} onMouseEnter={e=>{e.currentTarget.style.borderColor="rgba(130,100,200,.2)";e.currentTarget.style.transform="translateY(-2px)";}} onMouseLeave={e=>{e.currentTarget.style.borderColor="rgba(130,100,200,.08)";e.currentTarget.style.transform="translateY(0)";}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:13}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <div style={{width:40,height:40,borderRadius:11,background:`${s.color}18`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:19}}>{s.icon}</div>
              <div><div style={{fontFamily:"Syne",fontSize:12,fontWeight:700,color:T.text}}>{s.name}</div><div style={{fontSize:10,color:T.text3,marginTop:1}}>:{s.port} · {s.stack}</div></div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:aiHealthOk(s.h)?"#10b981":"#f43f5e"}}>{aiHealthOk(s.h)?<><PulseDot/> {t("admin.status.up")}</>:<span>Offline</span>}</div>
          </div>
          <div style={{fontSize:11,color:T.text3,fontFamily:"monospace",marginBottom:8}}>GET {s.path}</div>
          <Btn T={T} style={{padding:"6px 12px",fontSize:12}} onClick={()=>setNav(s.key)}>{t("common.viewAll")}</Btn>
        </div>))}
      </div>
    </div>),
    risk:(<div><div style={{fontFamily:"Syne",fontSize:22,fontWeight:700,marginBottom:22,color:T.text}}>Risk Scoring Service</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16,marginBottom:22}}>
        <StatBox label={t("admin.status.up")} value={aiHealthOk(aiHealth.risk)?"OK":"—"} sub="GET /api/ai/risk/health" accent={aiHealthOk(aiHealth.risk)?"#10b981":"#f43f5e"} T={T}/>
        <StatBox label="Kafka" value="risk-evaluation-*" sub="consumes requests, publishes results" accent={T.accent2} T={T}/>
        <StatBox label="Gateway" value=":8080" sub="api-gateway → :9001" accent="#2dd4bf" T={T}/>
      </div>
      <Card T={T}><CardHdr title="Health payload" sub="ai-risk-service" T={T}/>
        <div style={{padding:"14px 18px"}}><pre style={{background:"rgba(130,100,200,.06)",borderRadius:9,padding:"13px 15px",fontFamily:"monospace",fontSize:11,color:T.text2,lineHeight:1.6,border:"1px solid rgba(130,100,200,.1)",whiteSpace:"pre-wrap",wordBreak:"break-word"}}>{aiHealth.loading?"…":JSON.stringify(aiHealth.risk||{ error:"unreachable" },null,2)}</pre></div>
      </Card>
    </div>),
    fraud:(<div><div style={{fontFamily:"Syne",fontSize:22,fontWeight:700,marginBottom:22,color:T.text}}>Fraud Detection Service</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16,marginBottom:22}}>
        <StatBox label={t("admin.status.up")} value={aiHealthOk(aiHealth.fraud)?"OK":"—"} sub="GET /api/ai/fraud/health" accent={aiHealthOk(aiHealth.fraud)?"#10b981":"#f43f5e"} T={T}/>
        <StatBox label="Claims portal" value="POST" sub="/api/ai/fraud/detect via gateway" accent={T.accent} T={T}/>
        <StatBox label="Gateway" value=":8080" sub="api-gateway → :9002" accent="#f59e0b" T={T}/>
      </div>
      <Card T={T}><CardHdr title="Health payload" sub="ai-fraud-service" T={T}/>
        <div style={{padding:"14px 18px"}}><pre style={{background:"rgba(130,100,200,.06)",borderRadius:9,padding:"13px 15px",fontFamily:"monospace",fontSize:11,color:T.text2,lineHeight:1.6,border:"1px solid rgba(130,100,200,.1)",whiteSpace:"pre-wrap",wordBreak:"break-word"}}>{aiHealth.loading?"…":JSON.stringify(aiHealth.fraud||{ error:"unreachable" },null,2)}</pre></div>
      </Card>
    </div>),
    document:(<div><div style={{fontFamily:"Syne",fontSize:22,fontWeight:700,marginBottom:22,color:T.text}}>Document Analysis Service</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16}}>
        <StatBox label={t("admin.status.up")} value={aiHealthOk(aiHealth.document)?"OK":"—"} sub="GET /api/ai/documents/health" accent={aiHealthOk(aiHealth.document)?"#10b981":"#f43f5e"} T={T}/>
        <StatBox label="Gateway" value=":8080" sub="api-gateway → :9003" accent="#2dd4bf" T={T}/>
        <StatBox label="Stack" value="Python" sub="FastAPI" accent={T.accent2} T={T}/>
      </div>
      <Card T={T}><CardHdr title="Health payload" sub="ai-document-service" T={T}/>
        <div style={{padding:"14px 18px"}}><pre style={{background:"rgba(130,100,200,.06)",borderRadius:9,padding:"13px 15px",fontFamily:"monospace",fontSize:11,color:T.text2,lineHeight:1.6,border:"1px solid rgba(130,100,200,.1)",whiteSpace:"pre-wrap",wordBreak:"break-word"}}>{aiHealth.loading?"…":JSON.stringify(aiHealth.document||{ error:"unreachable" },null,2)}</pre></div>
      </Card>
    </div>),
    assistant:(<div><div style={{fontFamily:"Syne",fontSize:22,fontWeight:700,marginBottom:22,color:T.text}}>AI Assistant Service</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16}}>
        <StatBox label={t("admin.status.up")} value={aiHealthOk(aiHealth.assistant)?"OK":"—"} sub="GET /api/ai/assistant/health" accent={aiHealthOk(aiHealth.assistant)?"#10b981":"#f43f5e"} T={T}/>
        <StatBox label="Customer portal" value="POST" sub="/api/ai/assistant/chat" accent={T.accent} T={T}/>
        <StatBox label="Gateway" value=":8080" sub="api-gateway → :9004" accent={T.accent2} T={T}/>
      </div>
      <Card T={T}><CardHdr title="Health payload" sub="ai-assistant-service" T={T}/>
        <div style={{padding:"14px 18px"}}><pre style={{background:"rgba(130,100,200,.06)",borderRadius:9,padding:"13px 15px",fontFamily:"monospace",fontSize:11,color:T.text2,lineHeight:1.6,border:"1px solid rgba(130,100,200,.1)",whiteSpace:"pre-wrap",wordBreak:"break-word"}}>{aiHealth.loading?"…":JSON.stringify(aiHealth.assistant||{ error:"unreachable" },null,2)}</pre></div>
      </Card>
    </div>),
  };
  const TITLES={home:t("sidebar.ai.home"),risk:t("sidebar.ai.risk"),fraud:t("sidebar.ai.fraud"),document:t("sidebar.ai.document"),assistant:t("sidebar.ai.assistant")};
  return (
    <div style={{display:"flex",minHeight:"100vh",background:T.bg}}>
      <div style={{position:"fixed",top:"-20%",left:"-10%",width:"60%",height:"60%",background:"radial-gradient(ellipse,rgba(139,92,246,.07) 0%,transparent 70%)",pointerEvents:"none",zIndex:0}}/>
      <Sidebar role="ai" nav={nav} setNav={setNav} T={T} onLogout={onLogout} lang={lang} setLang={setLang} t={t}/>
      <div style={{marginLeft:248,flex:1,display:"flex",flexDirection:"column",position:"relative",zIndex:1}}>
        <Topbar title={TITLES[nav]||nav} sub={t("ai.portalSub")} T={T} userName={auth?.user?.fullName||"AI Analyst"} roleLabel={t("auth.roleAiAnalyst")} t={t}/>
        <div style={{padding:26,flex:1}} key={nav}>{pages[nav]||pages.home}</div>
      </div>
    </div>
  );
}

export default function App() {
  useEffect(injectGlobal,[]);
  const [auth,setAuth]=useState(null);
  const [lang,setLang]=useState(getInitialLang);
  useEffect(()=>{ persistLang(lang); },[lang]);
  const logout=async()=>{ await api.logout(); setAuth(null); };
  if(!auth) return <LoginPage onLogin={setAuth} lang={lang} setLang={setLang}/>;
  switch(auth.role){
    case "customer":    return <CustomerPortal       auth={auth} onLogout={logout} lang={lang} setLang={setLang}/>;
    case "underwriter": return <UnderwriterPortal    auth={auth} onLogout={logout} lang={lang} setLang={setLang}/>;
    case "claims":      return <ClaimsAdjusterPortal auth={auth} onLogout={logout} lang={lang} setLang={setLang}/>;
    case "admin":       return <AdminPortal          auth={auth} onLogout={logout} lang={lang} setLang={setLang}/>;
    case "ai":          return <AiAnalystPortal      auth={auth} onLogout={logout} lang={lang} setLang={setLang}/>;
    default:            return <LoginPage onLogin={setAuth} lang={lang} setLang={setLang}/>;
  }
}

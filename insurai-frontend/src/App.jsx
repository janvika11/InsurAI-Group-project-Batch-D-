import { useState, useEffect, useRef } from "react";
import { api, setToken, getToken, roleToPortal } from "./api";

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

function ScoreBar({ value, T }) {
  const col = value<40?"#10b981":value<70?"#f59e0b":"#f43f5e";
  return <div style={{display:"flex",alignItems:"center",gap:8}}>
    <div style={{flex:1,height:4,background:"rgba(150,150,255,.1)",borderRadius:2,overflow:"hidden"}}>
      <div style={{height:"100%",width:`${value}%`,background:col,borderRadius:2,transition:"width .4s ease"}}/>
    </div>
    <span style={{fontSize:11,color:col,fontWeight:600,minWidth:22,textAlign:"right"}}>{value}</span>
  </div>;
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

function Sidebar({ role, nav, setNav, T, onLogout }) {
  const NAVS = {
    customer:    [{id:"home",icon:"🏠",label:"My Dashboard"},{id:"policies",icon:"📋",label:"My Policies"},{id:"apply",icon:"✨",label:"Apply for Policy"},{id:"claims",icon:"📁",label:"My Claims"},{id:"fileclaim",icon:"📝",label:"File a Claim"},{id:"renewals",icon:"🔁",label:"Renewals"},{id:"assistant",icon:"💬",label:"AI Assistant"},{id:"documents",icon:"📎",label:"My Documents"}],
    underwriter: [{id:"home",icon:"⬡",label:"Dashboard"},{id:"queue",icon:"📥",label:"Review Queue",badge:"7"},{id:"policies",icon:"📋",label:"All Policies"},{id:"risk",icon:"📊",label:"Risk Analysis"},{id:"rules",icon:"⚖️",label:"Rules Engine"},{id:"approved",icon:"✅",label:"Approved"},{id:"escalated",icon:"🚨",label:"Escalated",badge:"2"},{id:"reports",icon:"📈",label:"Reports"}],
    claims:      [{id:"home",icon:"⬡",label:"Dashboard"},{id:"open",icon:"📂",label:"Open Claims",badge:"12"},{id:"fraud",icon:"🔍",label:"Fraud Alerts",badge:"3"},{id:"investigation",icon:"🔎",label:"Investigation"},{id:"approved",icon:"✅",label:"Approved Claims"},{id:"settle",icon:"💰",label:"Settlements"},{id:"aifraud",icon:"🤖",label:"AI Fraud Tool"},{id:"reports",icon:"📈",label:"Reports"}],
    admin:       [{id:"home",icon:"⬡",label:"Dashboard"},{id:"users",icon:"👥",label:"User Management"},{id:"services",icon:"⚙️",label:"Microservices"},{id:"kafka",icon:"⚡",label:"Kafka Monitor"},{id:"rules",icon:"⚖️",label:"Rules Engine"},{id:"audit",icon:"🔒",label:"Audit Logs"},{id:"config",icon:"🛠️",label:"System Config"},{id:"reports",icon:"📈",label:"Reports"}],
    ai:          [{id:"home",icon:"⬡",label:"AI Overview"},{id:"risk",icon:"📊",label:"Risk Service"},{id:"fraud",icon:"🔍",label:"Fraud Service"},{id:"document",icon:"📄",label:"Document Service"},{id:"assistant",icon:"💬",label:"Assistant Service"},{id:"kafka",icon:"⚡",label:"Event Stream"},{id:"models",icon:"🧠",label:"Model Registry"},{id:"logs",icon:"📋",label:"Inference Logs"}],
  };
  const ROLE_META = {
    customer:    {icon:"🧑‍💼",label:"Customer Portal",   color:"#10b981"},
    underwriter: {icon:"🔍", label:"Underwriter Portal",color:"#6366f1"},
    claims:      {icon:"⚖️", label:"Claims Adjuster",   color:"#f59e0b"},
    admin:       {icon:"🛡️", label:"Admin Portal",      color:"#3b82f6"},
    ai:          {icon:"🤖", label:"AI Analyst Portal", color:"#8b5cf6"},
  };
  const meta=ROLE_META[role];
  const items=NAVS[role]||[];
  return (
    <aside style={{width:248,background:T.surface,borderRight:"1px solid rgba(150,150,255,.08)",display:"flex",flexDirection:"column",position:"fixed",height:"100vh",left:0,top:0,zIndex:100}}>
      <div style={{padding:"22px 20px 18px",borderBottom:"1px solid rgba(150,150,255,.07)"}}>
        <div style={{display:"flex",alignItems:"center",gap:11}}>
          <div style={{width:36,height:36,background:`linear-gradient(135deg,${meta.color},${meta.color}88)`,borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,boxShadow:`0 0 18px ${meta.color}44`}}>{meta.icon}</div>
          <div>
            <div style={{fontFamily:"Syne",fontWeight:800,fontSize:18,letterSpacing:"-.5px",color:T.text}}>Insur<span style={{color:T.accent2}}>AI</span></div>
            <div style={{fontSize:9,color:T.text3,letterSpacing:1.4,textTransform:"uppercase"}}>{meta.label}</div>
          </div>
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
            <span style={{flex:1}}>{item.label}</span>
            {item.badge&&<span style={{background:T.accent,color:"#fff",fontSize:10,fontWeight:700,padding:"1px 7px",borderRadius:20}}>{item.badge}</span>}
          </div>;
        })}
      </nav>
      <div style={{padding:12,borderTop:"1px solid rgba(150,150,255,.07)"}}>
        <button onClick={onLogout} style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"9px 11px",borderRadius:9,background:"rgba(244,63,94,.08)",border:"1px solid rgba(244,63,94,.15)",color:"#f87171",fontSize:13,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>
          <span>🚪</span> Sign Out
        </button>
      </div>
    </aside>
  );
}

function Topbar({ title, sub, T, userName, roleLabel }) {
  return <header style={{height:58,background:`${T.bg}dd`,borderBottom:"1px solid rgba(150,150,255,.07)",display:"flex",alignItems:"center",padding:"0 26px",gap:16,position:"sticky",top:0,zIndex:50,backdropFilter:"blur(20px)"}}>
    <div style={{flex:1}}>
      <div style={{fontFamily:"Syne",fontSize:15,fontWeight:700,color:T.text}}>{title}</div>
      {sub&&<div style={{fontSize:11,color:T.text3}}>{sub}</div>}
    </div>
    <div style={{display:"flex",alignItems:"center",gap:10}}>
      <div style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:T.text2,background:"rgba(16,185,129,.08)",border:"1px solid rgba(16,185,129,.18)",borderRadius:20,padding:"3px 10px"}}>
        <PulseDot color="#10b981"/> Online
      </div>
      <div style={{display:"flex",alignItems:"center",gap:9,padding:"6px 12px",background:"rgba(150,150,255,.06)",borderRadius:9,border:"1px solid rgba(150,150,255,.1)"}}>
        <div style={{width:28,height:28,borderRadius:7,background:`linear-gradient(135deg,${T.accent},${T.accent2})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:"#fff"}}>{(userName||"U")[0]}</div>
        <div>
          <div style={{fontSize:12,fontWeight:500,color:T.text}}>{userName||"User"}</div>
          <div style={{fontSize:10,color:T.text3}}>{roleLabel}</div>
        </div>
      </div>
    </div>
  </header>;
}

function LoginPage({ onLogin }) {
  const T=THEMES.login;
  const [mode,setMode]=useState("signup");
  const [role,setRole]=useState("customer");
  const [fullName,setFullName]=useState("");
  const [email,setEmail]=useState("");
  const [pass,setPass]=useState("");
  const [loading,setLoading]=useState(false);
  const [err,setErr]=useState("");
  const roles=[
    {id:"customer",   icon:"🧑‍💼",label:"Customer",       sub:"View & manage your policies",  color:"#10b981"},
    {id:"underwriter",icon:"🔍", label:"Underwriter",    sub:"Review & approve policy apps", color:"#6366f1"},
    {id:"claims",     icon:"⚖️", label:"Claims Adjuster",sub:"Investigate & settle claims",  color:"#f59e0b"},
    {id:"admin",      icon:"🛡️", label:"Admin",           sub:"Full system management",       color:"#3b82f6"},
    {id:"ai",         icon:"🤖", label:"AI Analyst",      sub:"Monitor AI services & models", color:"#8b5cf6"},
  ];
  const roleToApi=(r)=>r==="customer"?"CUSTOMER":r==="underwriter"?"UNDERWRITER":r==="claims"?"CLAIMS_ADJUSTER":r==="admin"?"ADMIN":r==="ai"?"AI_ANALYST":"CUSTOMER";
  async function handleSignUp(){
    if(!fullName?.trim()){setErr("Enter your full name");return;}
    if(!email?.trim()){setErr("Enter your email");return;}
    if(!pass||pass.length<6){setErr("Password must be at least 6 characters");return;}
    setErr("");setLoading(true);
    try {
      const res = await api.register(email.trim(), pass, fullName.trim(), roleToApi(role));
      setToken(res.accessToken);
      if (res.refreshToken) localStorage.setItem("insurai_refresh", res.refreshToken);
      const portalRole = roleToPortal(res.user?.roles) || role;
      onLogin({ user: res.user, role: portalRole });
    } catch (e) {
      setErr(e.message || "Sign up failed");
    } finally {
      setLoading(false);
    }
  }
  async function handleLogin(){
    if(!email||!pass){setErr("Enter email and password");return;}
    setErr("");setLoading(true);
    try {
      const res = await api.login(email, pass);
      setToken(res.accessToken);
      if (res.refreshToken) localStorage.setItem("insurai_refresh", res.refreshToken);
      const portalRole = roleToPortal(res.user?.roles) || role;
      onLogin({ user: res.user, role: portalRole });
    } catch (e) {
      setErr(e.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }
  return (
    <div style={{minHeight:"100vh",background:T.bg,display:"flex",alignItems:"center",justifyContent:"center",position:"relative",overflow:"hidden"}}>
      <div style={{position:"fixed",top:"-20%",left:"-10%",width:"60%",height:"60%",background:"radial-gradient(ellipse,rgba(59,130,246,.08) 0%,transparent 70%)",pointerEvents:"none"}}/>
      <div style={{position:"fixed",bottom:"-20%",right:"-10%",width:"50%",height:"50%",background:"radial-gradient(ellipse,rgba(99,102,241,.06) 0%,transparent 70%)",pointerEvents:"none"}}/>
      <div style={{width:"100%",maxWidth:1040,padding:24,position:"relative",zIndex:1,display:"grid",gridTemplateColumns:"minmax(0,1.2fr) minmax(0,1fr)",gap:32,alignItems:"stretch"}}>
        <div style={{paddingRight:8,display:"flex",flexDirection:"column",justifyContent:"center"}}>
          <div style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:54,height:54,background:"linear-gradient(135deg,#3b82f6,#2dd4bf)",borderRadius:16,fontSize:26,marginBottom:14,animation:"glowPulse 3s infinite"}}>🛡️</div>
          <div style={{fontFamily:"Syne",fontSize:30,fontWeight:800,color:T.text,letterSpacing:"-1px",lineHeight:1.1}}>InsurAI · Smart corporate insurance cockpit</div>
          <div style={{fontSize:13,color:T.text2,marginTop:10,maxWidth:520}}>Single place where risk, underwriting, claims and AI insights come together. Today I will show a working prototype of how large corporate policies can be supervised with modern microservices and AI.</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginTop:22}}>
            {[["5+","domain services"],["4","specialised AI engines"],["1","unified cockpit"]].map(([v,l])=>(
              <div key={l} style={{background:"rgba(59,130,246,.06)",borderRadius:12,padding:"10px 14px",border:"1px solid rgba(59,130,246,.14)"}}>
                <div style={{fontFamily:"Syne",fontSize:18,fontWeight:700,color:"#3b82f6"}}>{v}</div>
                <div style={{fontSize:11,color:T.text3,marginTop:3}}>{l}</div>
              </div>
            ))}
          </div>
          <div style={{fontSize:11,color:T.text3,marginTop:18}}>For today&apos;s demo I&apos;m focusing on the experience and architecture, not the full production setup.</div>
        </div>
        <div style={{background:T.surface,border:"1px solid rgba(99,168,255,.1)",borderRadius:20,padding:28,boxShadow:"0 18px 45px rgba(15,23,42,.35)"}}>
          <div style={{display:"flex",gap:8,marginBottom:20,borderRadius:10,background:"rgba(150,150,255,.06)",padding:4}}>
            <button onClick={()=>{setMode("signup");setErr("");}} style={{flex:1,padding:"9px 14px",borderRadius:8,border:"none",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",background:mode==="signup"?"#3b82f6":"transparent",color:mode==="signup"?"#fff":T.text2}}>Sign Up</button>
            <button onClick={()=>{setMode("login");setErr("");}} style={{flex:1,padding:"9px 14px",borderRadius:8,border:"none",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",background:mode==="login"?"#3b82f6":"transparent",color:mode==="login"?"#fff":T.text2}}>Sign In</button>
          </div>
          {mode==="signup"&&(
            <div style={{marginBottom:13}}>
              <div style={{fontSize:11,color:T.text3,letterSpacing:1.2,textTransform:"uppercase",marginBottom:8}}>Full Name</div>
              <input value={fullName} onChange={e=>setFullName(e.target.value)} placeholder="Your full name" style={{width:"100%",background:"rgba(150,150,255,.06)",border:"1px solid rgba(150,150,255,.12)",borderRadius:9,padding:"10px 13px",color:T.text,fontSize:13,outline:"none",fontFamily:"'DM Sans',sans-serif"}}/>
            </div>
          )}
          {mode==="signup"&&(
            <div style={{marginBottom:20}}>
              <div style={{fontSize:11,color:T.text3,letterSpacing:1.2,textTransform:"uppercase",marginBottom:12}}>Select Your Role</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                {roles.slice(0,4).map(r=>(
                  <div key={r.id} onClick={()=>setRole(r.id)} style={{padding:"11px 13px",borderRadius:11,cursor:"pointer",border:`1.5px solid ${role===r.id?r.color+"88":"rgba(150,150,255,.1)"}`,background:role===r.id?`${r.color}12`:"rgba(150,150,255,.04)",transition:"all .2s",display:"flex",alignItems:"center",gap:9}}>
                    <span style={{fontSize:17}}>{r.icon}</span>
                    <div>
                      <div style={{fontSize:12,fontWeight:600,color:role===r.id?r.color:T.text}}>{r.label}</div>
                      <div style={{fontSize:10,color:T.text3,marginTop:1}}>{r.sub}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{marginTop:8}}>
                <div onClick={()=>setRole(roles[4].id)} style={{padding:"11px 13px",borderRadius:11,cursor:"pointer",border:`1.5px solid ${role===roles[4].id?roles[4].color+"88":"rgba(150,150,255,.1)"}`,background:role===roles[4].id?`${roles[4].color}12`:"rgba(150,150,255,.04)",transition:"all .2s",display:"flex",alignItems:"center",gap:9}}>
                  <span style={{fontSize:17}}>{roles[4].icon}</span>
                  <div>
                    <div style={{fontSize:12,fontWeight:600,color:role===roles[4].id?roles[4].color:T.text}}>{roles[4].label}</div>
                    <div style={{fontSize:10,color:T.text3,marginTop:1}}>{roles[4].sub}</div>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div style={{marginBottom:13}}>
            <div style={{fontSize:11,color:T.text3,letterSpacing:1.2,textTransform:"uppercase",marginBottom:8}}>Email</div>
            <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@company.com" style={{width:"100%",background:"rgba(150,150,255,.06)",border:"1px solid rgba(150,150,255,.12)",borderRadius:9,padding:"10px 13px",color:T.text,fontSize:13,outline:"none",fontFamily:"'DM Sans',sans-serif"}}/>
          </div>
          <div style={{marginBottom:18}}>
            <div style={{fontSize:11,color:T.text3,letterSpacing:1.2,textTransform:"uppercase",marginBottom:8}}>Password</div>
            <input type="password" value={pass} onChange={e=>setPass(e.target.value)} placeholder={mode==="signup"?"Min 6 characters":"••••••••"} style={{width:"100%",background:"rgba(150,150,255,.06)",border:"1px solid rgba(150,150,255,.12)",borderRadius:9,padding:"10px 13px",color:T.text,fontSize:13,outline:"none",fontFamily:"'DM Sans',sans-serif"}}/>
          </div>
          {err&&<div style={{background:"rgba(244,63,94,.1)",border:"1px solid rgba(244,63,94,.22)",borderRadius:8,padding:"8px 12px",fontSize:12,color:"#f87171",marginBottom:14}}>⚠ {err}</div>}
          {mode==="signup"?(<button onClick={handleSignUp} style={{width:"100%",padding:"11px",borderRadius:11,fontSize:14,fontWeight:600,cursor:"pointer",border:"none",fontFamily:"'DM Sans',sans-serif",background:THEMES[role]?.accent||"#3b82f6",color:"#fff",transition:"all .3s",boxShadow:`0 0 24px ${THEMES[role]?.accent||"#3b82f6"}44`}}>
            {loading?"Creating account…":"Create Account →"}
          </button>):(<button onClick={handleLogin} style={{width:"100%",padding:"11px",borderRadius:11,fontSize:14,fontWeight:600,cursor:"pointer",border:"none",fontFamily:"'DM Sans',sans-serif",background:"#3b82f6",color:"#fff",transition:"all .3s",boxShadow:"0 0 24px #3b82f644"}}>
            {loading?"Signing in…":"Sign In →"}
          </button>)}
          {mode==="signup"&&<div style={{textAlign:"center",marginTop:14,fontSize:12,color:T.text3}}>Already have an account? <button onClick={()=>{setMode("login");setErr("");}} style={{background:"none",border:"none",color:"#60a5fa",cursor:"pointer",fontWeight:600,fontSize:12}}>Sign In</button></div>}
          {mode==="login"&&<div style={{textAlign:"center",marginTop:14,fontSize:12,color:T.text3}}>New user? <button onClick={()=>{setMode("signup");setErr("");}} style={{background:"none",border:"none",color:"#60a5fa",cursor:"pointer",fontWeight:600,fontSize:12}}>Sign Up</button></div>}
        </div>
      </div>
    </div>
  );
}

function CustomerPortal({ auth, onLogout }) {
  const T=THEMES.customer;
  const userName = auth?.user?.fullName || "Customer";
  const [nav,setNav]=useState("home");
  const [chatMsgs,setChatMsgs]=useState([{role:"ai",text:"👋 Hi! How can I help with your insurance today?"}]);
  const [chatInput,setChatInput]=useState("");
  const [myPolicies,setMyPolicies]=useState([]);
  const [myClaims,setMyClaims]=useState([]);
  const [renewals,setRenewals]=useState([]);
  const [loading,setLoading]=useState(true);
  const [err,setErr]=useState("");
  const [submitting,setSubmitting]=useState(false);
  const applyFormRef=useRef({});
  const claimFormRef=useRef({});
  const chatRef=useRef(null);
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
    if(!holderName||!policyType) return setErr("Fill required fields (Name, Policy Type)");
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
    if(!sel) return setErr("Select a policy");
    const [policyId,policyNumber]=sel.split("|");
    const holderId=auth?.user?.id||"";
    const holderName=auth?.user?.fullName||userName||"";
    const claimType=f?.claimType?.value, incidentDate=f?.incidentDate?.value, claimedAmount=f?.claimedAmount?.value;
    if(!policyId||!policyNumber||!holderName||!claimType||!incidentDate||!claimedAmount) return setErr("Fill all required fields");
    setSubmitting(true); setErr("");
    try {
      const fd=new FormData();
      fd.append("policyId",policyId); fd.append("policyNumber",policyNumber); fd.append("holderId",holderId); fd.append("holderName",holderName);
      fd.append("claimType",claimType); fd.append("incidentDate",incidentDate); fd.append("claimedAmount",String(claimedAmount).replace(/[^0-9.]/g,""));
      if(f?.description?.value) fd.append("description",f.description.value);
      if(f?.fileInput?.files?.length) for(const file of f.fileInput.files) fd.append("documents",file);
      await api.createClaim(fd);
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
  const toPolicy=(p)=>({id:p.policyNumber,uid:p.id,type:p.policyType||"Policy",premium:p.premiumAmount?`₹${Number(p.premiumAmount).toLocaleString("en-IN")}/yr`:"—",expiry:p.endDate?new Date(p.endDate).toLocaleDateString("en-IN",{month:"short",year:"numeric"}):"—",risk:p.riskScore??0,...p});
  const toClaim=(c)=>({id:c.claimNumber,uid:c.id,policy:c.policyNumber,type:c.claimType,amount:c.claimedAmount?`₹${Number(c.claimedAmount).toLocaleString("en-IN")}`:"—",filed:c.filedAt?new Date(c.filedAt).toLocaleDateString("en-IN"):"—",status:c.status,sc:c.status==="APPROVED"||c.status==="SETTLED"?"green":c.status==="REJECTED"?"rose":"amber",...c});
  const policiesForUi=myPolicies.map(toPolicy);
  const claimsForUi=myClaims.map(toClaim);
  const pages={
    home:(
      <div>
        <div style={{background:`linear-gradient(135deg,${T.surface},rgba(16,185,129,.07))`,border:"1px solid rgba(16,185,129,.14)",borderRadius:20,padding:"26px 30px",marginBottom:26,position:"relative",overflow:"hidden"}}>
          <div style={{position:"absolute",top:-30,right:-30,width:160,height:160,borderRadius:"50%",background:"rgba(16,185,129,.05)",filter:"blur(40px)"}}/>
          <div style={{fontSize:13,color:T.accent2,marginBottom:6}}>Good morning,</div>
          <div style={{fontFamily:"Syne",fontSize:24,fontWeight:800,color:T.text,marginBottom:5}}>{userName} 👋</div>
          <div style={{fontSize:13,color:T.text2}}>Customer ID: {auth?.user?.id?.slice(0,8)||"—"} · Member since {auth?.user?.createdAt?new Date(auth.user.createdAt).toLocaleDateString("en-IN",{month:"short",year:"numeric"}):"—"}</div>
          <div style={{display:"flex",gap:14,marginTop:18}}>
            {[[String(policiesForUi.length),"Active Policies",T.accent],[String(claimsForUi.filter(c=>!["APPROVED","REJECTED","SETTLED"].includes(c.status)).length),"Open Claims","#f59e0b"],[`₹${policiesForUi.reduce((s,p)=>s+(Number(p.premiumAmount)||0),0).toLocaleString("en-IN")}`,"Annual Premium",T.text2]].map(([v,l,c])=>(
              <div key={l} style={{background:"rgba(16,185,129,.08)",border:"1px solid rgba(16,185,129,.15)",borderRadius:11,padding:"11px 18px",textAlign:"center"}}>
                <div style={{fontFamily:"Syne",fontSize:18,fontWeight:700,color:c}}>{v}</div>
                <div style={{fontSize:11,color:T.text2,marginTop:2}}>{l}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
          <Card T={T}>
            <CardHdr title="My Policies" sub="Quick overview" T={T} action={<button onClick={()=>setNav("policies")} style={{background:"none",border:"none",color:T.accent2,fontSize:12,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>View all →</button>}/>
            <div style={{padding:"12px 16px",display:"flex",flexDirection:"column",gap:8}}>
              {policiesForUi.map(p=>(
                <div key={p.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 12px",background:"rgba(16,185,129,.05)",borderRadius:9,border:"1px solid rgba(16,185,129,.09)"}}>
                  <div>
                    <div style={{fontSize:12,fontWeight:600,color:T.text}}>{p.type}</div>
                    <div style={{fontSize:11,color:T.text3,marginTop:1}}>{p.id} · Exp {p.expiry}</div>
                  </div>
                  <Chip color="green" T={T}>Active</Chip>
                </div>
              ))}
            </div>
          </Card>
          <Card T={T}>
            <CardHdr title="AI Assistant" sub="Ask about your policies" T={T}/>
            <div style={{height:196,overflowY:"auto",padding:"10px 14px",display:"flex",flexDirection:"column",gap:8}}>
              {chatMsgs.map((m,i)=>(
                <div key={i} style={{maxWidth:"88%",padding:"8px 12px",borderRadius:11,fontSize:12.5,lineHeight:1.5,alignSelf:m.role==="user"?"flex-end":"flex-start",background:m.role==="user"?"rgba(16,185,129,.18)":"rgba(16,185,129,.07)",border:`1px solid ${m.role==="user"?"rgba(16,185,129,.3)":"rgba(16,185,129,.12)"}`,color:T.text}}>{m.text}</div>
              ))}
              <div ref={chatRef}/>
            </div>
            <div style={{display:"flex",gap:8,padding:"10px 13px",borderTop:"1px solid rgba(16,185,129,.08)"}}>
              <input value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendChat()} placeholder="Ask about your policy…" style={{flex:1,background:"rgba(16,185,129,.06)",border:"1px solid rgba(16,185,129,.12)",borderRadius:8,padding:"7px 10px",color:T.text,fontSize:12,outline:"none",fontFamily:"'DM Sans',sans-serif"}}/>
              <Btn T={T} onClick={sendChat} style={{padding:"7px 13px",fontSize:12}}>➤</Btn>
            </div>
          </Card>
        </div>
      </div>
    ),
    policies:(<div><div style={{fontFamily:"Syne",fontSize:22,fontWeight:700,marginBottom:6,color:T.text}}>My Policies</div><div style={{fontSize:13,color:T.text2,marginBottom:22}}>All your active insurance policies</div>
      <div style={{display:"flex",flexDirection:"column",gap:14}}>{policiesForUi.map(p=>(
        <Card key={p.id} T={T}><div style={{padding:"20px 24px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
            <div><div style={{fontFamily:"Syne",fontSize:15,fontWeight:700,color:T.text,marginBottom:3}}>{p.type}</div><div style={{fontSize:11,color:T.text3,fontFamily:"monospace"}}>{p.id}</div></div>
            <Chip color="green" T={T}>Active</Chip>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:14}}>
            {[["Premium",p.premium],["Expiry",p.expiry],["Coverage",p.coverageAmount?`₹${Number(p.coverageAmount).toLocaleString("en-IN")}`:"—"]].map(([l,v])=>(
              <div key={l} style={{background:"rgba(16,185,129,.05)",borderRadius:8,padding:"10px 12px",border:"1px solid rgba(16,185,129,.09)"}}>
                <div style={{fontSize:10,color:T.text3,marginBottom:4}}>{l}</div>
                <div style={{fontSize:13,color:T.text}}>{v}</div>
              </div>
            ))}
            <div style={{background:"rgba(16,185,129,.05)",borderRadius:8,padding:"10px 12px",border:"1px solid rgba(16,185,129,.09)"}}>
              <div style={{fontSize:10,color:T.text3,marginBottom:6}}>Risk Score</div>
              <ScoreBar value={p.risk} T={T}/>
            </div>
          </div>
          <div style={{display:"flex",gap:8}}>
            <Btn T={T} style={{padding:"7px 14px",fontSize:12}} onClick={()=>setNav("fileclaim")}>📁 File Claim</Btn>
            <Btn T={T} variant="ghost" style={{padding:"7px 14px",fontSize:12}} onClick={()=>setNav("renewals")}>🔁 Renew</Btn>
          </div>
        </div></Card>
      ))}</div>
    </div>),
    claims:(<div><div style={{fontFamily:"Syne",fontSize:22,fontWeight:700,marginBottom:6,color:T.text}}>My Claims</div><div style={{fontSize:13,color:T.text2,marginBottom:22}}>Track all your filed claims</div>
      <Card T={T}><table style={{width:"100%",borderCollapse:"collapse"}}>
        <thead><tr><TH>Claim ID</TH><TH>Policy</TH><TH>Type</TH><TH>Amount</TH><TH>Filed</TH><TH>Status</TH><TH></TH></tr></thead>
        <tbody>{claimsForUi.map(c=>(<TR key={c.uid}><TD mono accent={T.accent2}>{c.id}</TD><TD>{c.policy}</TD><TD>{c.type}</TD><TD>{c.amount}</TD><TD>{c.filed}</TD><TD><Chip color={c.sc} T={T}>{c.status}</Chip></TD><TD><Btn T={T} variant="ghost" style={{padding:"5px 10px",fontSize:11}}>Track</Btn></TD></TR>))}</tbody>
      </table></Card>
    </div>),
    apply:(<div><div style={{fontFamily:"Syne",fontSize:22,fontWeight:700,marginBottom:6,color:T.text}}>Apply for New Policy</div><div style={{fontSize:13,color:T.text2,marginBottom:22}}>AI will score your risk automatically</div>
      {err&&<div style={{padding:10,marginBottom:14,background:"rgba(239,68,68,.1)",borderRadius:9,color:"#ef4444",fontSize:13}}>{err}</div>}
      <Card T={T}><div style={{padding:"22px 26px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
        <div><div style={{fontSize:11,color:T.text3,letterSpacing:1,textTransform:"uppercase",marginBottom:6}}>Full Name</div>
          <input ref={el=>{if(el)applyFormRef.current.holderName=el}} defaultValue={userName} placeholder="Your full name" style={{width:"100%",background:"rgba(16,185,129,.06)",border:"1px solid rgba(16,185,129,.12)",borderRadius:8,padding:"9px 12px",color:T.text,fontSize:13,outline:"none",fontFamily:"'DM Sans',sans-serif"}}/></div>
        <div><div style={{fontSize:11,color:T.text3,letterSpacing:1,textTransform:"uppercase",marginBottom:6}}>Date of Birth</div>
          <input ref={el=>{if(el)applyFormRef.current.dob=el}} type="date" style={{width:"100%",background:"rgba(16,185,129,.06)",border:"1px solid rgba(16,185,129,.12)",borderRadius:8,padding:"9px 12px",color:T.text,fontSize:13,outline:"none",fontFamily:"'DM Sans',sans-serif"}}/></div>
        <div><div style={{fontSize:11,color:T.text3,letterSpacing:1,textTransform:"uppercase",marginBottom:6}}>Annual Income</div>
          <input ref={el=>{if(el)applyFormRef.current.income=el}} placeholder="₹ e.g. 1800000" style={{width:"100%",background:"rgba(16,185,129,.06)",border:"1px solid rgba(16,185,129,.12)",borderRadius:8,padding:"9px 12px",color:T.text,fontSize:13,outline:"none",fontFamily:"'DM Sans',sans-serif"}}/></div>
        <div><div style={{fontSize:11,color:T.text3,letterSpacing:1,textTransform:"uppercase",marginBottom:6}}>Occupation</div>
          <input ref={el=>{if(el)applyFormRef.current.occupation=el}} placeholder="e.g. Software Engineer" style={{width:"100%",background:"rgba(16,185,129,.06)",border:"1px solid rgba(16,185,129,.12)",borderRadius:8,padding:"9px 12px",color:T.text,fontSize:13,outline:"none",fontFamily:"'DM Sans',sans-serif"}}/></div>
        <div><div style={{fontSize:11,color:T.text3,letterSpacing:1,textTransform:"uppercase",marginBottom:6}}>Policy Type</div>
          <select ref={el=>{if(el)applyFormRef.current.policyType=el}} style={{width:"100%",background:"rgba(16,185,129,.06)",border:"1px solid rgba(16,185,129,.12)",borderRadius:8,padding:"9px 12px",color:"#e5fdf4",fontSize:13,outline:"none",fontFamily:"'DM Sans',sans-serif",appearance:"none",WebkitAppearance:"none",MozAppearance:"none"}}>
            <option value="CORPORATE_HEALTH" style={{color:"#0f172a"}}>Corporate Health</option>
            <option value="TERM_LIFE" style={{color:"#0f172a"}}>Term Life</option>
            <option value="VEHICLE" style={{color:"#0f172a"}}>Vehicle</option>
            <option value="HOME" style={{color:"#0f172a"}}>Home</option>
          </select></div>
        <div><div style={{fontSize:11,color:T.text3,letterSpacing:1,textTransform:"uppercase",marginBottom:6}}>Coverage Amount</div>
          <input ref={el=>{if(el)applyFormRef.current.coverageAmount=el}} defaultValue="5000000" placeholder="₹ e.g. 5000000" style={{width:"100%",background:"rgba(16,185,129,.06)",border:"1px solid rgba(16,185,129,.12)",borderRadius:8,padding:"9px 12px",color:T.text,fontSize:13,outline:"none",fontFamily:"'DM Sans',sans-serif"}}/></div>
        <div style={{gridColumn:"1/-1"}}><div style={{fontSize:11,color:T.text3,letterSpacing:1,textTransform:"uppercase",marginBottom:6}}>Start / End Date</div>
          <div style={{display:"flex",gap:12}}>
            <input ref={el=>{if(el)applyFormRef.current.startDate=el}} type="date" defaultValue={new Date().toISOString().slice(0,10)} style={{flex:1,background:"rgba(16,185,129,.06)",border:"1px solid rgba(16,185,129,.12)",borderRadius:8,padding:"9px 12px",color:T.text,fontSize:13,outline:"none",fontFamily:"'DM Sans',sans-serif"}}/>
            <input ref={el=>{if(el)applyFormRef.current.endDate=el}} type="date" defaultValue={new Date(Date.now()+365*24*60*60*1000).toISOString().slice(0,10)} style={{flex:1,background:"rgba(16,185,129,.06)",border:"1px solid rgba(16,185,129,.12)",borderRadius:8,padding:"9px 12px",color:T.text,fontSize:13,outline:"none",fontFamily:"'DM Sans',sans-serif"}}/>
          </div></div>
        <div style={{gridColumn:"1/-1",background:"rgba(16,185,129,.08)",border:"1px solid rgba(16,185,129,.16)",borderRadius:11,padding:"13px 16px",display:"flex",alignItems:"center",gap:12}}>
          <div style={{fontSize:22}}>🤖</div>
          <div><div style={{fontSize:13,fontWeight:500,color:T.text}}>AI Risk Score: <span style={{color:T.accent,fontFamily:"Syne",fontSize:17,fontWeight:700}}>—</span> / 100</div>
          <div style={{fontSize:12,color:T.text2,marginTop:2}}>Risk evaluated after submission</div></div>
        </div>
        <div style={{gridColumn:"1/-1",display:"flex",gap:10}}><Btn T={T} onClick={handleApplyPolicy} disabled={submitting}>{submitting?"Submitting…":"Submit Application"}</Btn><Btn T={T} variant="ghost" onClick={()=>setNav("policies")}>Cancel</Btn></div>
      </div></Card>
    </div>),
    fileclaim:(<div><div style={{fontFamily:"Syne",fontSize:22,fontWeight:700,marginBottom:6,color:T.text}}>File a Claim</div><div style={{fontSize:13,color:T.text2,marginBottom:22}}>AI fraud detection runs automatically</div>
      {err&&<div style={{padding:10,marginBottom:14,background:"rgba(239,68,68,.1)",borderRadius:9,color:"#ef4444",fontSize:13}}>{err}</div>}
      <Card T={T}><div style={{padding:"22px 26px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
        <div><div style={{fontSize:11,color:T.text3,letterSpacing:1,textTransform:"uppercase",marginBottom:6}}>Select Policy</div>
          <select ref={el=>{if(el)claimFormRef.current.policySelect=el}} style={{width:"100%",background:"rgba(16,185,129,.06)",border:"1px solid rgba(16,185,129,.12)",borderRadius:8,padding:"9px 12px",color:T.text,fontSize:13,outline:"none",fontFamily:"'DM Sans',sans-serif"}}>
            <option value="">— Select policy —</option>
            {policiesForUi.map(p=><option key={p.uid} value={`${p.uid}|${p.id}`}>{p.id} · {p.type}</option>)}
          </select></div>
        <div><div style={{fontSize:11,color:T.text3,letterSpacing:1,textTransform:"uppercase",marginBottom:6}}>Claim Type</div>
          <select ref={el=>{if(el)claimFormRef.current.claimType=el}} style={{width:"100%",background:"rgba(16,185,129,.06)",border:"1px solid rgba(16,185,129,.12)",borderRadius:8,padding:"9px 12px",color:"#e5fdf4",fontSize:13,outline:"none",fontFamily:"'DM Sans',sans-serif",appearance:"none",WebkitAppearance:"none",MozAppearance:"none"}}>
            <option value="MEDICAL_EXPENSE" style={{color:"#0f172a"}}>Medical Expense</option>
            <option value="HOSPITALIZATION" style={{color:"#0f172a"}}>Hospitalization</option>
            <option value="ACCIDENT" style={{color:"#0f172a"}}>Accident</option>
            <option value="THEFT" style={{color:"#0f172a"}}>Theft</option>
            <option value="DAMAGE" style={{color:"#0f172a"}}>Damage</option>
          </select></div>
        <div><div style={{fontSize:11,color:T.text3,letterSpacing:1,textTransform:"uppercase",marginBottom:6}}>Incident Date</div>
          <input ref={el=>{if(el)claimFormRef.current.incidentDate=el}} type="date" style={{width:"100%",background:"rgba(16,185,129,.06)",border:"1px solid rgba(16,185,129,.12)",borderRadius:8,padding:"9px 12px",color:T.text,fontSize:13,outline:"none",fontFamily:"'DM Sans',sans-serif"}}/></div>
        <div><div style={{fontSize:11,color:T.text3,letterSpacing:1,textTransform:"uppercase",marginBottom:6}}>Claim Amount</div>
          <input ref={el=>{if(el)claimFormRef.current.claimedAmount=el}} type="number" placeholder="₹ Enter amount" style={{width:"100%",background:"rgba(16,185,129,.06)",border:"1px solid rgba(16,185,129,.12)",borderRadius:8,padding:"9px 12px",color:T.text,fontSize:13,outline:"none",fontFamily:"'DM Sans',sans-serif"}}/></div>
        <div style={{gridColumn:"1/-1"}}><div style={{fontSize:11,color:T.text3,letterSpacing:1,textTransform:"uppercase",marginBottom:6}}>Description</div>
          <textarea ref={el=>{if(el)claimFormRef.current.description=el}} rows={3} placeholder="Describe the incident…" style={{width:"100%",background:"rgba(16,185,129,.06)",border:"1px solid rgba(16,185,129,.12)",borderRadius:8,padding:"9px 12px",color:T.text,fontSize:13,outline:"none",fontFamily:"'DM Sans',sans-serif",resize:"vertical"}}/></div>
        <div style={{gridColumn:"1/-1"}}>
          <div style={{fontSize:11,color:T.text3,letterSpacing:1,textTransform:"uppercase",marginBottom:6}}>Documents</div>
          <input ref={el=>{if(el)claimFormRef.current.fileInput=el}} type="file" multiple accept=".pdf,.jpg,.jpeg,.png" style={{display:"none"}}/>
          <div onClick={()=>claimFormRef.current?.fileInput?.click()} style={{border:"2px dashed rgba(16,185,129,.2)",borderRadius:11,padding:22,textAlign:"center",cursor:"pointer"}}>
            <div style={{fontSize:26,marginBottom:5}}>📎</div><div style={{fontSize:13,color:T.text2}}>Upload documents (click to select)</div><div style={{fontSize:11,color:T.text3,marginTop:3}}>PDF, JPG, PNG up to 10MB</div>
          </div>
        </div>
        <div style={{gridColumn:"1/-1"}}><Btn T={T} onClick={handleFileClaim} disabled={submitting}>{submitting?"Submitting…":"Submit Claim"}</Btn></div>
      </div></Card>
    </div>),
    renewals:(<div><div style={{fontFamily:"Syne",fontSize:22,fontWeight:700,marginBottom:22,color:T.text}}>Renewals</div>
      {err&&<div style={{padding:10,marginBottom:14,background:"rgba(239,68,68,.1)",borderRadius:9,color:"#ef4444",fontSize:13}}>{err}</div>}
      <Card T={T}><div style={{padding:"16px 20px",display:"flex",flexDirection:"column",gap:12}}>
        {renewals.length===0?<div style={{padding:20,textAlign:"center",color:T.text2,fontSize:13}}>No renewals due at the moment.</div>:renewals.filter(r=>["PENDING","NOTIFIED"].includes(r.renewalStatus)).map(r=>{
          const exp=r.expiryDate?new Date(r.expiryDate):null;
          const daysLeft=exp?Math.ceil((exp-new Date())/864e5):0;
          return (
            <div key={r.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px",background:"rgba(245,158,11,.07)",borderRadius:11,border:"1px solid rgba(245,158,11,.18)"}}>
              <div><div style={{fontSize:13,fontWeight:600,color:T.text}}>{r.policyNumber||"Policy"}</div><div style={{fontSize:11,color:T.text3,marginTop:2}}>Expires {exp?exp.toLocaleDateString("en-IN"):"—"} · {daysLeft>0?`${daysLeft} days remaining`:"Expired"}</div></div>
              <Btn T={T} style={{padding:"7px 14px",fontSize:12}} disabled={submitting} onClick={async()=>{try{const full=await api.getRenewal(r.id); const q=full?.quotes?.[0]; if(!q) return setErr("No quotes available"); await handleRenewNow(r.id,q.id);}catch(e){setErr(e.message);}}}>Renew Now</Btn>
            </div>
          );
        })}
      </div></Card>
    </div>),
    assistant:(<div><div style={{fontFamily:"Syne",fontSize:22,fontWeight:700,marginBottom:22,color:T.text}}>AI Assistant</div>
      <Card T={T}><div style={{height:380,overflowY:"auto",padding:"14px 16px",display:"flex",flexDirection:"column",gap:9}}>
        {chatMsgs.map((m,i)=><div key={i} style={{maxWidth:"85%",padding:"9px 13px",borderRadius:11,fontSize:13,lineHeight:1.5,alignSelf:m.role==="user"?"flex-end":"flex-start",background:m.role==="user"?"rgba(16,185,129,.16)":"rgba(16,185,129,.06)",border:`1px solid ${m.role==="user"?"rgba(16,185,129,.28)":"rgba(16,185,129,.1)"}`,color:T.text}}>{m.text}</div>)}
        <div ref={chatRef}/>
      </div>
      <div style={{display:"flex",gap:8,padding:"11px 15px",borderTop:"1px solid rgba(16,185,129,.08)"}}>
        <input value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendChat()} placeholder="Ask about your policies…" style={{flex:1,background:"rgba(16,185,129,.06)",border:"1px solid rgba(16,185,129,.12)",borderRadius:8,padding:"9px 12px",color:T.text,fontSize:13,outline:"none",fontFamily:"'DM Sans',sans-serif"}}/>
        <Btn T={T} onClick={sendChat}>Send ➤</Btn>
      </div></Card>
    </div>),
    documents:(<div><div style={{fontFamily:"Syne",fontSize:22,fontWeight:700,marginBottom:22,color:T.text}}>My Documents</div>
      <Card T={T}><div style={{padding:"14px 18px",display:"flex",flexDirection:"column",gap:8}}>
        {[["Policy_POL-2025-0303.pdf","Family Health Policy","1.2 MB","12 Jan 2025"],["Claim_CLM-0044_Approved.pdf","Approved Claim Receipt","0.4 MB","15 Feb 2025"],["RenewalNotice_2025.pdf","Renewal Reminder","0.2 MB","01 Mar 2025"]].map(([f,d,s,dt])=>(
          <div key={f} style={{display:"flex",alignItems:"center",gap:11,padding:"11px 13px",background:"rgba(16,185,129,.05)",borderRadius:9,border:"1px solid rgba(16,185,129,.09)"}}>
            <span style={{fontSize:20}}>📄</span>
            <div style={{flex:1}}><div style={{fontSize:13,fontWeight:500,color:T.text}}>{f}</div><div style={{fontSize:11,color:T.text3,marginTop:1}}>{d} · {s} · {dt}</div></div>
            <Btn T={T} variant="ghost" style={{padding:"5px 10px",fontSize:11}}>⬇ Download</Btn>
          </div>
        ))}
      </div></Card>
    </div>),
  };
  const TITLES={home:"My Dashboard",policies:"My Policies",apply:"Apply for Policy",claims:"My Claims",fileclaim:"File a Claim",renewals:"Renewals",assistant:"AI Assistant",documents:"My Documents"};
  return (
    <div style={{display:"flex",minHeight:"100vh",background:T.bg}}>
      <div style={{position:"fixed",top:"-20%",left:"-10%",width:"60%",height:"60%",background:"radial-gradient(ellipse,rgba(16,185,129,.06) 0%,transparent 70%)",pointerEvents:"none",zIndex:0}}/>
      <Sidebar role="customer" nav={nav} setNav={setNav} T={T} onLogout={onLogout}/>
      <div style={{marginLeft:248,flex:1,display:"flex",flexDirection:"column",position:"relative",zIndex:1}}>
        <Topbar title={TITLES[nav]||nav} sub="Customer Portal · policy-service · claims-service" T={T} userName={userName} roleLabel="Policyholder"/>
        {loading?<div style={{padding:26,flex:1,display:"flex",alignItems:"center",justifyContent:"center",color:T.text2}}>Loading…</div>:<div style={{padding:26,flex:1}} key={nav}>{pages[nav]||pages.home}</div>}
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

function UnderwriterPortal({ auth, onLogout }) {
  const T=THEMES.underwriter;
  const userName=auth?.user?.fullName||"Underwriter";
  const [nav,setNav]=useState("home");
  const [selected,setSelected]=useState(null);
  const [queue,setQueue]=useState([]);
  const [approvedList,setApprovedList]=useState([]);
  const [loading,setLoading]=useState(true);
  const [err,setErr]=useState("");
  const [submitting,setSubmitting]=useState(false);
  const notesRef=useRef(null);
  useEffect(()=>{
    (async()=>{
      try {
        setLoading(true);
        const [q,a]=await Promise.all([
          api.getWorkflowsMyQueue().catch(()=>api.getWorkflows({status:"IN_REVIEW"})),
          api.getWorkflows({status:"APPROVED"}).catch(()=>[])
        ]);
        setQueue(Array.isArray(q)?q:q?.content??[]);
        setApprovedList(Array.isArray(a)?a:a?.content??[]);
      } catch(e){ setErr(e.message); setQueue([]); }
      finally { setLoading(false); }
    })();
  },[]);
  const toQueueItem=(w)=>({id:w.id,pid:w.policyNumber,holder:w.holderName||"—",type:w.policyType||"Policy",risk:w.riskScore??0,aiRec:w.riskScore>70?"Escalate":w.riskScore<40?"Approve":"Manual Review",submitted:w.createdAt?new Date(w.createdAt).toLocaleDateString("en-IN",{day:"2-digit",month:"short"}):"—",uw:w.assignedTo?"Assigned":"Unassigned",...w});
  const queueForUi=queue.map(toQueueItem);
  const approvedForUi=approvedList.map(toQueueItem);
  async function handleDecision(decision,notes){
    if(!selected?.id) return;
    setSubmitting(true); setErr("");
    try {
      await api.workflowDecision(selected.id,decision,notes||"");
      setSelected(null);
      const [q,a]=await Promise.all([api.getWorkflowsMyQueue().catch(()=>api.getWorkflows({status:"IN_REVIEW"})),api.getWorkflows({status:"APPROVED"}).catch(()=>[])]);
      setQueue(Array.isArray(q)?q:q?.content??[]);
      setApprovedList(Array.isArray(a)?a:a?.content??[]);
    } catch(e){ setErr(e.message); }
    finally { setSubmitting(false); }
  }
  const pages={
    home:(<div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:16,marginBottom:26}}>
        {[["📥","Review Queue",String(queueForUi.length),"pending review",T.accent],["✅","Approved",String(approvedForUi.length),"policies issued",T.accent2],["🚨","Escalated",String(queueForUi.filter(p=>p.aiRec==="Escalate").length),"senior review req.","#f43f5e"],["📊","Avg Risk Score",queueForUi.length?Math.round(queueForUi.reduce((s,p)=>s+p.risk,0)/queueForUi.length):"—","across queue","#f59e0b"]].map(([ic,l,v,s,c])=>(
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
          <CardHdr title="Review Queue" sub="Pending underwriter action" T={T} action={<button onClick={()=>setNav("queue")} style={{background:"none",border:"none",color:T.accent2,fontSize:12,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>View all →</button>}/>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><tr><TH>Policy ID</TH><TH>Holder</TH><TH>Risk</TH><TH>AI Rec</TH><TH></TH></tr></thead>
            <tbody>{(queueForUi.length?queueForUi.slice(0,4):[]).map(p=>(
              <TR key={p.id} onClick={()=>{setSelected(p);setNav("queue");}} style={{cursor:"pointer"}}>
                <TD mono accent={T.accent2}>{p.pid}</TD><TD>{p.holder}</TD>
                <TD><div style={{width:90}}><ScoreBar value={p.risk} T={T}/></div></TD>
                <TD><Chip color={p.aiRec==="Approve"?"green":p.aiRec==="Escalate"?"rose":"amber"} T={T}>{p.aiRec}</Chip></TD>
                <TD><Btn T={T} style={{padding:"5px 10px",fontSize:11}}>Review</Btn></TD>
              </TR>
            ))}</tbody>
          </table>
        </Card>
        <Card T={T}>
          <CardHdr title="AI Risk Insights" sub="ai-risk-service · :9001" T={T}/>
          <div style={{padding:"12px 16px",display:"flex",flexDirection:"column",gap:8}}>
            {[["🔴","Arcturus Group",84,"Escalate – high cargo risk"],["🔴","Orion Dynamics",71,"Escalate – cyber exposure"],["🟡","Nexova Systems",67,"Review – location factor"],["🟢","Solaris Fintech",32,"Auto-approve eligible"]].map(([ic,n,s,r])=>(
              <div key={n} style={{display:"flex",gap:9,alignItems:"flex-start",padding:"9px 10px",background:"rgba(99,102,241,.05)",borderRadius:8,border:"1px solid rgba(99,102,241,.09)"}}>
                <span style={{fontSize:13}}>{ic}</span>
                <div style={{flex:1}}>
                  <div style={{fontSize:12,fontWeight:600,color:T.text}}>{n} · <span style={{color:s>70?"#f43f5e":"#f59e0b",fontFamily:"Syne",fontWeight:700}}>{s}</span></div>
                  <div style={{fontSize:11,color:T.text3,marginTop:1}}>{r}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>),
    queue:(<div>
      <div style={{fontFamily:"Syne",fontSize:22,fontWeight:700,marginBottom:6,color:T.text}}>Review Queue</div>
      <div style={{fontSize:13,color:T.text2,marginBottom:22}}>7 policies awaiting underwriter decision</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 350px",gap:16}}>
        <Card T={T}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><tr><TH>Policy ID</TH><TH>Holder</TH><TH>Type</TH><TH>Premium</TH><TH>Risk</TH><TH>AI Rec</TH><TH>Assignee</TH><TH></TH></tr></thead>
            <tbody>{queueForUi.map(p=>(
              <TR key={p.id} onClick={()=>setSelected(p)} style={{cursor:"pointer"}}>
                <TD mono accent={T.accent2}>{p.pid}</TD><TD>{p.holder}</TD><TD>{p.type}</TD><TD>—</TD>
                <TD><div style={{width:80}}><ScoreBar value={p.risk} T={T}/></div></TD>
                <TD><Chip color={p.aiRec==="Approve"?"green":p.aiRec==="Escalate"?"rose":"amber"} T={T}>{p.aiRec}</Chip></TD>
                <TD><span style={{fontSize:12,color:T.text2}}>{p.uw}</span></TD>
                <TD><Btn T={T} style={{padding:"5px 10px",fontSize:11}}>Review</Btn></TD>
              </TR>
            ))}</tbody>
          </table>
        </Card>
        {selected?(
          <Card T={T}>
            <CardHdr title={selected.id} sub={selected.holder} T={T} action={<button onClick={()=>setSelected(null)} style={{background:"none",border:"none",color:T.text3,fontSize:18,cursor:"pointer"}}>✕</button>}/>
            <div style={{padding:"15px 18px"}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9,marginBottom:14}}>
                {[["Type",selected.type],["Premium",selected.premium],["Risk Score",selected.risk],["Submitted",selected.submitted]].map(([l,v])=>(
                  <div key={l} style={{background:"rgba(99,102,241,.06)",borderRadius:8,padding:"9px 11px",border:"1px solid rgba(99,102,241,.1)"}}>
                    <div style={{fontSize:10,color:T.text3,marginBottom:3}}>{l}</div>
                    <div style={{fontSize:13,fontWeight:500,color:T.text}}>{v}</div>
                  </div>
                ))}
              </div>
              <div style={{background:"rgba(99,102,241,.08)",borderRadius:9,padding:"12px 14px",marginBottom:14,border:"1px solid rgba(99,102,241,.16)"}}>
                <div style={{fontSize:10,color:T.text3,marginBottom:4,letterSpacing:.8,textTransform:"uppercase"}}>AI Recommendation</div>
                <div style={{fontSize:14,fontWeight:700,color:T.accent2}}>{selected.aiRec}</div>
                <div style={{fontSize:11,color:T.text3,marginTop:3}}>Risk score {selected.risk} · sector & historical data</div>
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
      <div style={{fontFamily:"Syne",fontSize:22,fontWeight:700,marginBottom:6,color:T.text}}>Escalated Policies</div>
      <div style={{fontSize:13,color:T.text2,marginBottom:22}}>Requires senior underwriter review</div>
      <Card T={T}><div style={{padding:"14px 18px",display:"flex",flexDirection:"column",gap:10}}>
        {queue.filter(p=>p.aiRec==="Escalate").map(p=>(
          <div key={p.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 16px",background:"rgba(244,63,94,.06)",borderRadius:11,border:"1px solid rgba(244,63,94,.16)"}}>
            <div>
              <div style={{fontSize:13,fontWeight:600,color:T.text}}>{p.id} · {p.holder}</div>
              <div style={{fontSize:11,color:T.text3,marginTop:3}}>Risk: {p.risk} · {p.type} · Submitted {p.submitted}</div>
            </div>
            <Btn T={T} style={{background:"#f43f5e",padding:"7px 14px",fontSize:12}} onClick={()=>{setSelected(p);setNav("queue");}}>Review Now</Btn>
          </div>
        ))}
      </div></Card>
    </div>),
    risk:(<div><div style={{fontFamily:"Syne",fontSize:22,fontWeight:700,marginBottom:22,color:T.text}}>Risk Analysis</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16,marginBottom:22}}>
        <StatBox label="Avg Risk Score" value="54.2" sub="current queue" accent={T.accent} T={T}/>
        <StatBox label="High Risk (>70)" value="2" sub="need escalation" accent="#f43f5e" T={T}/>
        <StatBox label="Auto-Approve" value="2" sub="risk score < 40" accent="#10b981" T={T}/>
      </div>
      <Card T={T}><CardHdr title="Risk by Sector" sub="ai-risk-service · XGBoost" T={T}/>
        <div style={{padding:"16px 20px"}}>
          {[["Marine Cargo",84,"rose"],["Cyber Risk",71,"rose"],["Fire & Hazard",67,"amber"],["Group Life",45,"blue"],["Group Health",32,"green"]].map(([n,v,c])=>(
            <div key={n} style={{display:"flex",alignItems:"center",gap:14,marginBottom:13}}>
              <div style={{fontSize:13,color:T.text,width:140}}>{n}</div>
              <div style={{flex:1}}><ScoreBar value={v} T={T}/></div>
              <Chip color={c} T={T}>{v>70?"High":v>50?"Medium":"Low"}</Chip>
            </div>
          ))}
        </div>
      </Card>
    </div>),
    approved:(<div><div style={{fontFamily:"Syne",fontSize:22,fontWeight:700,marginBottom:22,color:T.text}}>Approved Policies</div>
      <Card T={T}><table style={{width:"100%",borderCollapse:"collapse"}}>
        <thead><tr><TH>Policy ID</TH><TH>Holder</TH><TH>Type</TH><TH>Premium</TH><TH>Risk</TH><TH>Approved</TH></tr></thead>
        <tbody>{approvedForUi.map(p=>(<TR key={p.id}><TD mono accent={T.accent2}>{p.pid}</TD><TD>{p.holder}</TD><TD>{p.type}</TD><TD>—</TD><TD><div style={{width:80}}><ScoreBar value={p.risk} T={T}/></div></TD><TD><Chip color="green" T={T}>{p.updatedAt?new Date(p.updatedAt).toLocaleDateString("en-IN"):"—"}</Chip></TD></TR>))}</tbody>
      </table></Card>
    </div>),
    rules:(<div><div style={{fontFamily:"Syne",fontSize:22,fontWeight:700,marginBottom:22,color:T.text}}>Rules Engine</div>
      <Card T={T}><div style={{padding:"14px 18px",display:"flex",flexDirection:"column",gap:8}}>
        {[["RUL-001","Eligibility Check","POLICY_CREATED","green"],["RUL-002","IRDAI Compliance","POLICY_APPROVED","green"],["RUL-003","High Risk Auto-Escalate","RISK_SCORE_GT_70","green"],["RUL-004","Auto-Renewal","EXPIRY_30D","amber"]].map(([id,name,trigger,c])=>(
          <div key={id} style={{display:"flex",alignItems:"center",gap:13,padding:"11px 13px",background:"rgba(99,102,241,.05)",borderRadius:9,border:"1px solid rgba(99,102,241,.09)"}}>
            <span style={{fontFamily:"monospace",fontSize:11,color:T.accent2,width:66}}>{id}</span>
            <div style={{flex:1}}><div style={{fontSize:13,fontWeight:500,color:T.text}}>{name}</div><div style={{fontSize:11,color:T.text3,fontFamily:"monospace",marginTop:1}}>{trigger}</div></div>
            <Chip color={c} T={T}>{c==="green"?"Active":"Draft"}</Chip>
          </div>
        ))}
      </div></Card>
    </div>),
    reports:(<div><div style={{fontFamily:"Syne",fontSize:22,fontWeight:700,marginBottom:22,color:T.text}}>Reports</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16}}>
        <StatBox label="Policies Processed" value="28" sub="this month" accent={T.accent} T={T}/>
        <StatBox label="Avg Processing Time" value="1.8d" sub="target: 2d" accent="#10b981" T={T}/>
        <StatBox label="Approval Rate" value="74%" sub="within SLA" accent={T.accent2} T={T}/>
      </div>
    </div>),
    policies:(<div><div style={{fontFamily:"Syne",fontSize:22,fontWeight:700,marginBottom:22,color:T.text}}>All Policies</div>
      <Card T={T}><table style={{width:"100%",borderCollapse:"collapse"}}>
        <thead><tr><TH>Policy ID</TH><TH>Holder</TH><TH>Type</TH><TH>Premium</TH><TH>Risk</TH><TH>AI Rec</TH></tr></thead>
        <tbody>{[...queue,...approvedList.map(p=>({...p,aiRec:"Approved"}))].map(p=>(<TR key={p.id}><TD mono accent={T.accent2}>{p.id}</TD><TD>{p.holder}</TD><TD>{p.type}</TD><TD>{p.premium}</TD><TD><ScoreBar value={p.risk} T={T}/></TD><TD><Chip color={p.aiRec==="Approve"||p.aiRec==="Approved"?"green":p.aiRec==="Escalate"?"rose":"amber"} T={T}>{p.aiRec}</Chip></TD></TR>))}</tbody>
      </table></Card>
    </div>),
  };
  const TITLES={home:"Dashboard",queue:"Review Queue",policies:"All Policies",risk:"Risk Analysis",rules:"Rules Engine",approved:"Approved",escalated:"Escalated",reports:"Reports"};
  return (
    <div style={{display:"flex",minHeight:"100vh",background:T.bg}}>
      <div style={{position:"fixed",top:"-20%",right:"-10%",width:"50%",height:"60%",background:"radial-gradient(ellipse,rgba(99,102,241,.07) 0%,transparent 70%)",pointerEvents:"none",zIndex:0}}/>
      <Sidebar role="underwriter" nav={nav} setNav={setNav} T={T} onLogout={onLogout}/>
      <div style={{marginLeft:248,flex:1,display:"flex",flexDirection:"column",position:"relative",zIndex:1}}>
        <Topbar title={TITLES[nav]||nav} sub="Underwriter Portal · workflow-service · ai-risk-service" T={T} userName={userName} roleLabel="Senior Underwriter"/>
        <div style={{padding:26,flex:1}} key={nav}>{pages[nav]||pages.home}</div>
      </div>
    </div>
  );
}

function ClaimsAdjusterPortal({ auth, onLogout }) {
  const T=THEMES.claims;
  const userName=auth?.user?.fullName||"Claims Adjuster";
  const [nav,setNav]=useState("home");
  const [claims,setClaims]=useState([]);
  const [selected,setSelected]=useState(null);
  const [loading,setLoading]=useState(true);
  const [err,setErr]=useState("");
  const [submitting,setSubmitting]=useState(false);
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
  const toClaim=(c)=>({id:c.id,cid:c.claimNumber,policy:c.policyNumber,holder:c.holderName||c.policyNumber,type:c.claimType,amount:c.claimedAmount?`₹${Number(c.claimedAmount).toLocaleString("en-IN")}`:"—",fraud:c.fraudScore??0,status:c.status,statusC:c.status==="APPROVED"||c.status==="SETTLED"?"green":c.status==="REJECTED"?"rose":c.status==="FRAUD_REVIEW"?"rose":"amber",...c});
  const claimsForUi=claims.map(toClaim);
  const openClaims=claimsForUi.filter(c=>!["APPROVED","REJECTED","SETTLED"].includes(c.status));
  async function handleStatus(claimId,status,approvedAmount){
    setSubmitting(true); setErr("");
    try {
      await api.updateClaimStatus(claimId,status,approvedAmount,noteRef.current?.value||"");
      setSelected(null);
      const c=await api.getClaims(); setClaims(Array.isArray(c)?c:c?.content??[]);
    } catch(e){ setErr(e.message); }
    finally { setSubmitting(false); }
  }
  const pages={
    home:(<div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:16,marginBottom:26}}>
        {[["📂","Open Claims",String(openClaims.length),"awaiting action",T.accent],["🔍","Fraud Alerts",String(openClaims.filter(x=>x.fraud>70).length),"high fraud score","#f43f5e"],["🔎","Investigation",String(openClaims.filter(x=>x.status==="INVESTIGATION").length),"active cases","#f59e0b"],["✅","Approved",String(claimsForUi.filter(x=>["APPROVED","SETTLED"].includes(x.status)).length),"claims closed","#10b981"]].map(([ic,l,v,s,c])=>(
          <div key={l} className="fadeUp" style={{background:T.surface,border:"1px solid rgba(200,150,100,.08)",borderRadius:16,padding:18,position:"relative",overflow:"hidden"}}>
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
          <CardHdr title="Open Claims" sub="claims-service · :8085" T={T} action={<button onClick={()=>setNav("open")} style={{background:"none",border:"none",color:T.accent2,fontSize:12,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>View all →</button>}/>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><tr><TH>Claim ID</TH><TH>Holder</TH><TH>Amount</TH><TH>AI Fraud</TH><TH>Status</TH></tr></thead>
            <tbody>{openClaims.map(c=>(<TR key={c.id} onClick={()=>setSelected(c)} style={{cursor:"pointer"}}><TD mono accent={T.accent2}>{c.cid}</TD><TD>{c.holder}</TD><TD>{c.amount}</TD><TD><span style={{fontWeight:700,color:c.fraud>70?"#f43f5e":c.fraud>50?"#f59e0b":"#10b981"}}>{c.fraud}{c.fraud>70?" ⚠":""}</span></TD><TD><Chip color={c.statusC} T={T}>{c.status}</Chip></TD></TR>))}</tbody>
          </table>
        </Card>
        <Card T={T}>
          <CardHdr title="🔍 Fraud Alerts" sub="ai-fraud-service · :9002" T={T}/>
          <div style={{padding:"12px 15px",display:"flex",flexDirection:"column",gap:9}}>
            {openClaims.filter(c=>c.fraud>60).map(c=>(
              <div key={c.id} style={{padding:"11px 13px",background:"rgba(244,63,94,.07)",borderRadius:9,border:"1px solid rgba(244,63,94,.16)"}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                  <span style={{fontSize:12,fontWeight:700,color:T.text,fontFamily:"monospace"}}>{c.id}</span>
                  <span style={{fontFamily:"Syne",fontSize:16,fontWeight:700,color:"#f43f5e"}}>{c.fraud}</span>
                </div>
                <div style={{fontSize:11,color:T.text2}}>{c.holder} · {c.type}</div>
                <div style={{fontSize:11,color:"#f43f5e",marginTop:3}}>⚠ Anomaly detected — Isolation Forest</div>
                <Btn T={T} style={{marginTop:8,padding:"5px 11px",fontSize:11,background:"rgba(244,63,94,.18)",color:"#f87171",border:"1px solid rgba(244,63,94,.28)"}} onClick={()=>{setSelected(c);setNav("open");}}>Investigate</Btn>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>),
    open:(<div><div style={{fontFamily:"Syne",fontSize:22,fontWeight:700,marginBottom:22,color:T.text}}>Open Claims</div>
      {err&&<div style={{padding:10,marginBottom:14,background:"rgba(239,68,68,.1)",borderRadius:9,color:"#ef4444",fontSize:13}}>{err}</div>}
      <div style={{display:"grid",gridTemplateColumns:selected?"1fr 340px":"1fr",gap:16}}>
        <Card T={T}><table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr><TH>Claim ID</TH><TH>Policy</TH><TH>Holder</TH><TH>Type</TH><TH>Amount</TH><TH>Fraud Score</TH><TH>Status</TH><TH></TH></tr></thead>
          <tbody>{openClaims.map(c=>(<TR key={c.id} onClick={()=>setSelected(c)} style={{cursor:"pointer"}}><TD mono accent={T.accent2}>{c.cid}</TD><TD>{c.policy}</TD><TD>{c.holder}</TD><TD>{c.type}</TD><TD>{c.amount}</TD><TD><span style={{fontWeight:700,color:c.fraud>70?"#f43f5e":c.fraud>50?"#f59e0b":"#10b981"}}>{c.fraud}{c.fraud>70?" ⚠":""}</span></TD><TD><Chip color={c.statusC} T={T}>{c.status}</Chip></TD><TD><Btn T={T} style={{padding:"5px 10px",fontSize:11}} onClick={e=>{e.stopPropagation();setSelected(c);}}>Adjudicate</Btn></TD></TR>))}</tbody>
        </table></Card>
        {selected?(<Card T={T}>
          <CardHdr title={selected.cid} sub={selected.holder} T={T} action={<button onClick={()=>setSelected(null)} style={{background:"none",border:"none",color:T.text3,fontSize:18,cursor:"pointer"}}>✕</button>}/>
          <div style={{padding:"15px 18px"}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9,marginBottom:14}}>
              {[["Type",selected.type],["Amount",selected.amount],["Fraud",selected.fraud],["Status",selected.status]].map(([l,v])=>(
                <div key={l} style={{background:"rgba(200,150,100,.06)",borderRadius:8,padding:"9px 11px",border:"1px solid rgba(200,150,100,.1)"}}>
                  <div style={{fontSize:10,color:T.text3,marginBottom:3}}>{l}</div>
                  <div style={{fontSize:13,fontWeight:500,color:T.text}}>{String(v)}</div>
                </div>
              ))}
            </div>
            <div style={{marginBottom:12}}><div style={{fontSize:10,color:T.text3,marginBottom:5}}>Approved Amount (₹)</div><input ref={approvedAmtRef} type="number" placeholder="Optional" style={{width:"100%",background:"rgba(200,150,100,.06)",border:"1px solid rgba(200,150,100,.14)",borderRadius:8,padding:"8px 10px",color:T.text,fontSize:12,outline:"none",fontFamily:"'DM Sans',sans-serif"}}/></div>
            <div style={{marginBottom:12}}><div style={{fontSize:10,color:T.text3,marginBottom:5}}>Note</div><textarea ref={noteRef} rows={2} placeholder="Add note…" style={{width:"100%",background:"rgba(200,150,100,.06)",border:"1px solid rgba(200,150,100,.14)",borderRadius:8,padding:"8px 10px",color:T.text,fontSize:12,outline:"none",fontFamily:"'DM Sans',sans-serif",resize:"vertical"}}/></div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              <Btn T={T} style={{flex:1,background:"#10b981"}} disabled={submitting} onClick={()=>handleStatus(selected.id,"APPROVED",parseFloat(approvedAmtRef.current?.value||0)||undefined)}>✓ Approve</Btn>
              <Btn T={T} variant="ghost" style={{flex:1,color:"#f87171",border:"1px solid rgba(244,63,94,.25)"}} disabled={submitting} onClick={()=>handleStatus(selected.id,"REJECTED")}>✕ Reject</Btn>
              <Btn T={T} variant="ghost" style={{width:"100%",padding:"11px"}} disabled={submitting} onClick={()=>handleStatus(selected.id,"INVESTIGATION")}>🔍 Investigate</Btn>
            </div>
          </div>
        </Card>):null}
      </div>
    </div>),
    fraud:(<div><div style={{fontFamily:"Syne",fontSize:22,fontWeight:700,marginBottom:22,color:T.text}}>Fraud Alerts</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16,marginBottom:22}}>
        <StatBox label="Fraud Flags" value="3" sub="high fraud score" accent="#f43f5e" T={T}/>
        <StatBox label="AI Precision" value="91%" sub="Isolation Forest" accent="#10b981" T={T}/>
        <StatBox label="Fraud Prevented" value="₹4.8Cr" sub="estimated savings" accent={T.accent} T={T}/>
      </div>
      <Card T={T}><CardHdr title="Flagged Cases" sub="ai-fraud-service · Kafka fraud-check-results" T={T}/>
        <div style={{padding:"14px 18px",display:"flex",flexDirection:"column",gap:11}}>
          {openClaims.filter(c=>c.fraud>50).map(c=>(
            <div key={c.id} style={{background:"rgba(244,63,94,.05)",borderRadius:11,border:"1px solid rgba(244,63,94,.14)",padding:"14px 16px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:9}}>
                <div><div style={{fontFamily:"Syne",fontSize:13,fontWeight:700,color:T.text}}>{c.id} · {c.holder}</div><div style={{fontSize:12,color:T.text3,marginTop:2}}>{c.type} · Claimed: {c.amount}</div></div>
                <div style={{textAlign:"right"}}><div style={{fontFamily:"Syne",fontSize:22,fontWeight:700,color:"#f43f5e"}}>{c.fraud}</div><div style={{fontSize:10,color:"#f43f5e"}}>Fraud Score</div></div>
              </div>
              <div style={{display:"flex",gap:8}}>
                <Btn T={T} style={{padding:"6px 13px",fontSize:12,background:"rgba(244,63,94,.18)",color:"#f87171",border:"1px solid rgba(244,63,94,.28)"}} onClick={()=>{setSelected(c);setNav("open");}}>🔍 Investigate</Btn>
                <Btn T={T} variant="ghost" style={{padding:"6px 13px",fontSize:12,color:"#10b981",border:"1px solid rgba(16,185,129,.25)"}} onClick={()=>handleStatus(c.id,"PROCESSING")}>✓ Mark Legitimate</Btn>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>),
    aifraud:(<div><div style={{fontFamily:"Syne",fontSize:22,fontWeight:700,marginBottom:22,color:T.text}}>AI Fraud Tool</div>
      <Card T={T}><CardHdr title="Run Fraud Check" sub="ai-fraud-service · Isolation Forest · :9002" T={T}/>
        <div style={{padding:"20px 24px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
          <div><div style={{fontSize:10,color:T.text3,textTransform:"uppercase",letterSpacing:.8,marginBottom:6}}>Claim ID</div><input defaultValue="CLM-0091" style={{width:"100%",background:"rgba(200,150,100,.06)",border:"1px solid rgba(200,150,100,.14)",borderRadius:8,padding:"9px 12px",color:T.text,fontSize:13,outline:"none",fontFamily:"'DM Sans',sans-serif"}}/></div>
          <div><div style={{fontSize:10,color:T.text3,textTransform:"uppercase",letterSpacing:.8,marginBottom:6}}>Claim Amount</div><input defaultValue="₹48,00,000" style={{width:"100%",background:"rgba(200,150,100,.06)",border:"1px solid rgba(200,150,100,.14)",borderRadius:8,padding:"9px 12px",color:T.text,fontSize:13,outline:"none",fontFamily:"'DM Sans',sans-serif"}}/></div>
          <div style={{gridColumn:"1/-1",background:"rgba(244,63,94,.07)",borderRadius:12,padding:"16px 18px",border:"1px solid rgba(244,63,94,.18)"}}>
            <div style={{fontSize:10,color:"#f43f5e",marginBottom:7,letterSpacing:.8,textTransform:"uppercase"}}>AI Analysis Result</div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <div style={{fontFamily:"Syne",fontSize:32,fontWeight:700,color:"#f43f5e"}}>87</div>
              <Chip color="rose" T={T}>High Fraud Risk</Chip>
            </div>
            {["Amount spike — 8× policy average","First large claim in 3 months","Location mismatch with policy terms"].map((a,i)=><div key={i} style={{fontSize:12,color:"#f87171",marginBottom:3}}>⚠ {a}</div>)}
          </div>
          <Btn T={T}>Run Analysis</Btn>
        </div>
      </Card>
    </div>),
    investigation:(<div><div style={{fontFamily:"Syne",fontSize:22,fontWeight:700,marginBottom:22,color:T.text}}>Under Investigation</div>
      <Card T={T}><div style={{padding:"14px 18px",display:"flex",flexDirection:"column",gap:9}}>
        {openClaims.filter(c=>c.fraud>30&&c.fraud<80).map(c=>(<div key={c.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 14px",background:"rgba(245,158,11,.06)",borderRadius:9,border:"1px solid rgba(245,158,11,.14)"}}>
          <div><div style={{fontSize:13,fontWeight:600,color:T.text}}>{c.id} · {c.holder}</div><div style={{fontSize:11,color:T.text3,marginTop:2}}>{c.amount} · Fraud Score: {c.fraud}</div></div>
          <Btn T={T} style={{padding:"6px 13px",fontSize:12}} onClick={()=>{setSelected(c);setNav("open");}}>Investigate</Btn>
        </div>))}
      </div></Card>
    </div>),
    approved:(<div><div style={{fontFamily:"Syne",fontSize:22,fontWeight:700,marginBottom:22,color:T.text}}>Approved Claims</div>
      <Card T={T}><table style={{width:"100%",borderCollapse:"collapse"}}>
        <thead><tr><TH>Claim ID</TH><TH>Holder</TH><TH>Amount</TH><TH>Fraud Score</TH><TH>Approved</TH></tr></thead>
        <tbody>{claimsForUi.filter(c=>["APPROVED","SETTLED"].includes(c.status)).map(c=>(<TR key={c.id}><TD mono accent={T.accent2}>{c.cid}</TD><TD>{c.holder}</TD><TD>{c.amount}</TD><TD><span style={{color:"#10b981",fontWeight:600}}>{c.fraud}</span></TD><TD><Chip color="green" T={T}>{c.filedAt?new Date(c.filedAt).toLocaleDateString("en-IN"):"—"}</Chip></TD></TR>))}</tbody>
      </table></Card>
    </div>),
    settle:(<div><div style={{fontFamily:"Syne",fontSize:22,fontWeight:700,marginBottom:22,color:T.text}}>Settlements</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16}}>
        <StatBox label="Settled Today" value="8" sub="claims closed" accent="#10b981" T={T}/>
        <StatBox label="Total Settled" value="₹24.8L" sub="this month" accent={T.accent} T={T}/>
        <StatBox label="Avg Settlement" value="4.2d" sub="turnaround" accent={T.accent2} T={T}/>
      </div>
    </div>),
    reports:(<div><div style={{fontFamily:"Syne",fontSize:22,fontWeight:700,marginBottom:22,color:T.text}}>Reports</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16}}>
        <StatBox label="Claims Processed" value="43" sub="this month" accent={T.accent} T={T}/>
        <StatBox label="Fraud Detection Rate" value="91%" sub="AI precision" accent="#10b981" T={T}/>
        <StatBox label="Avg Resolution" value="4.2d" sub="target: 5d" accent={T.accent2} T={T}/>
      </div>
    </div>),
  };
  const TITLES={home:"Dashboard",open:"Open Claims",fraud:"Fraud Alerts",investigation:"Investigation",approved:"Approved Claims",settle:"Settlements",aifraud:"AI Fraud Tool",reports:"Reports"};
  return (
    <div style={{display:"flex",minHeight:"100vh",background:T.bg}}>
      <div style={{position:"fixed",top:"-20%",left:"-10%",width:"60%",height:"60%",background:"radial-gradient(ellipse,rgba(245,158,11,.05) 0%,transparent 70%)",pointerEvents:"none",zIndex:0}}/>
      <Sidebar role="claims" nav={nav} setNav={setNav} T={T} onLogout={onLogout}/>
      <div style={{marginLeft:248,flex:1,display:"flex",flexDirection:"column",position:"relative",zIndex:1}}>
        <Topbar title={TITLES[nav]||nav} sub="Claims Adjuster · claims-service · ai-fraud-service" T={T} userName={userName} roleLabel="Claims Adjuster"/>
        <div style={{padding:26,flex:1}} key={nav}>{pages[nav]||pages.home}</div>
      </div>
    </div>
  );
}

function AdminPortal({ auth, onLogout }) {
  const T=THEMES.admin;
  const userName=auth?.user?.fullName||"Admin";
  const [nav,setNav]=useState("home");
  const [users,setUsers]=useState([]);
  const [rules,setRules]=useState([]);
  const [showAddUser,setShowAddUser]=useState(false);
  const [err,setErr]=useState("");
  const [submitting,setSubmitting]=useState(false);
  const addUserRef=useRef({});
  useEffect(()=>{
    (async()=>{
      try {
        const [u,r]=await Promise.all([api.getUsers().catch(()=>[]),api.getRules().catch(()=>[])]);
        setUsers(Array.isArray(u)?u:[]);
        setRules(Array.isArray(r)?r:r?.content??[]);
      } catch(e){ setErr(e.message); }
    })();
  },[]);
  async function handleAddUser(){
    const f=addUserRef.current;
    const email=f?.email?.value?.trim(), password=f?.password?.value, fullName=f?.fullName?.value?.trim(), role=f?.role?.value||"CUSTOMER";
    if(!email||!password||!fullName) return setErr("Fill email, password, and full name");
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
        {[["⚙️","Microservices","12/12","all healthy",T.accent],["👥","Total Users","147","across all roles",T.accent2],["📈","Uptime","99.8%","last 30 days","#10b981"],["⚡","Kafka Events","5.2K/m","real-time","#f59e0b"]].map(([ic,l,v,s,c])=>(
          <div key={l} className="fadeUp" style={{background:T.surface,border:"1px solid rgba(100,150,255,.08)",borderRadius:16,padding:18,position:"relative",overflow:"hidden"}}>
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
          <CardHdr title="Service Health" sub="All 12 microservices" T={T} action={<button onClick={()=>setNav("services")} style={{background:"none",border:"none",color:T.accent2,fontSize:12,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>View all →</button>}/>
          <div style={{padding:"12px 16px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
            {SERVICES_LIST.map(s=>(<div key={s.name} style={{display:"flex",alignItems:"center",gap:7,padding:"7px 9px",background:"rgba(59,130,246,.04)",borderRadius:7}}><div style={{width:6,height:6,borderRadius:"50%",background:"#10b981",flexShrink:0}}/><span style={{fontFamily:"monospace",fontSize:10,color:T.text2,flex:1}}>{s.name}</span><span style={{fontSize:10,color:T.text3}}>:{s.port}</span></div>))}
          </div>
        </Card>
        <Card T={T}>
          <CardHdr title="Users" sub="auth-service · :8081" T={T} action={<button onClick={()=>setNav("users")} style={{background:"none",border:"none",color:T.accent2,fontSize:12,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>View all →</button>}/>
          <div style={{padding:"12px 16px",display:"flex",flexDirection:"column",gap:7}}>
            {(users.length?users:USERS_LIST).slice(0,5).map(u=>(<div key={u.id||u.email} style={{display:"flex",alignItems:"center",gap:9,padding:"8px 10px",background:"rgba(59,130,246,.04)",borderRadius:8}}>
              <div style={{width:27,height:27,borderRadius:7,background:`linear-gradient(135deg,${T.accent},${T.accent2})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:"#fff",flexShrink:0}}>{(u.fullName||u.name||"U")[0]}</div>
              <div style={{flex:1}}><div style={{fontSize:12,fontWeight:500,color:T.text}}>{u.fullName||u.name}</div><div style={{fontSize:10,color:T.text3}}>{u.roles?.[0]||u.role||"—"}</div></div>
              <Chip color="green" T={T}>Active</Chip>
            </div>))}
          </div>
        </Card>
      </div>
    </div>),
    users:(<div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:22}}>
        <div><div style={{fontFamily:"Syne",fontSize:22,fontWeight:700,color:T.text}}>User Management</div><div style={{fontSize:13,color:T.text2,marginTop:3}}>auth-service · roles · JWT · :8081</div></div>
        <Btn T={T} onClick={()=>setShowAddUser(true)}>＋ Add User</Btn>
      </div>
      {err&&<div style={{padding:10,marginBottom:14,background:"rgba(239,68,68,.1)",borderRadius:9,color:"#ef4444",fontSize:13}}>{err}</div>}
      {showAddUser&&(<Card T={T} style={{marginBottom:16}}><div style={{padding:"20px 24px"}}>
        <div style={{fontSize:13,fontWeight:600,marginBottom:14}}>Add New User</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
          <div><div style={{fontSize:10,color:T.text3,marginBottom:4}}>Full Name</div><input ref={el=>{if(el)addUserRef.current.fullName=el}} placeholder="Full name" style={{width:"100%",background:"rgba(59,130,246,.06)",border:"1px solid rgba(59,130,246,.14)",borderRadius:8,padding:"9px 12px",color:T.text,fontSize:13,outline:"none",fontFamily:"'DM Sans',sans-serif"}}/></div>
          <div><div style={{fontSize:10,color:T.text3,marginBottom:4}}>Email</div><input ref={el=>{if(el)addUserRef.current.email=el}} type="email" placeholder="email@example.com" style={{width:"100%",background:"rgba(59,130,246,.06)",border:"1px solid rgba(59,130,246,.14)",borderRadius:8,padding:"9px 12px",color:T.text,fontSize:13,outline:"none",fontFamily:"'DM Sans',sans-serif"}}/></div>
          <div><div style={{fontSize:10,color:T.text3,marginBottom:4}}>Password</div><input ref={el=>{if(el)addUserRef.current.password=el}} type="password" placeholder="Min 6 chars" style={{width:"100%",background:"rgba(59,130,246,.06)",border:"1px solid rgba(59,130,246,.14)",borderRadius:8,padding:"9px 12px",color:T.text,fontSize:13,outline:"none",fontFamily:"'DM Sans',sans-serif"}}/></div>
          <div><div style={{fontSize:10,color:T.text3,marginBottom:4}}>Role</div><select ref={el=>{if(el)addUserRef.current.role=el}} style={{width:"100%",background:"rgba(59,130,246,.06)",border:"1px solid rgba(59,130,246,.14)",borderRadius:8,padding:"9px 12px",color:T.text,fontSize:13,outline:"none",fontFamily:"'DM Sans',sans-serif"}}><option value="CUSTOMER">Customer</option><option value="ADMIN">Admin</option><option value="UNDERWRITER">Underwriter</option><option value="CLAIMS_ADJUSTER">Claims Adjuster</option><option value="AI_ANALYST">AI Analyst</option></select></div>
        </div>
        <div style={{display:"flex",gap:8}}><Btn T={T} onClick={handleAddUser} disabled={submitting}>{submitting?"Creating…":"Create User"}</Btn><Btn T={T} variant="ghost" onClick={()=>{setShowAddUser(false);setErr("");}}>Cancel</Btn></div>
      </div></Card>)}
      <Card T={T}><table style={{width:"100%",borderCollapse:"collapse"}}>
        <thead><tr><TH>User ID</TH><TH>Name</TH><TH>Email</TH><TH>Role</TH><TH>Status</TH></tr></thead>
        <tbody>{(users.length?users:USERS_LIST).map(u=>(<TR key={u.id||u.email}><TD mono accent={T.accent2}>{u.id?.slice(0,8)||u.id||"—"}</TD>
          <TD><div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:26,height:26,borderRadius:6,background:`linear-gradient(135deg,${T.accent},${T.accent2})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:"#fff"}}>{(u.fullName||u.name||"U")[0]}</div>{u.fullName||u.name}</div></TD>
          <TD>{u.email}</TD><TD><Chip color={u.roles?.[0]==="ADMIN"?"rose":u.roles?.[0]==="AI_ANALYST"?"violet":u.roles?.[0]==="UNDERWRITER"?"blue":u.roles?.[0]==="CLAIMS_ADJUSTER"?"amber":"green"} T={T}>{u.roles?.[0]||u.role||"CUSTOMER"}</Chip></TD>
          <TD><Chip color="green" T={T}>Active</Chip></TD></TR>))}</tbody>
      </table></Card>
    </div>),
    services:(<div><div style={{fontFamily:"Syne",fontSize:22,fontWeight:700,marginBottom:22,color:T.text}}>Microservices</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:11}}>
        {SERVICES_LIST.map(s=>(<div key={s.name} style={{background:T.surface,border:"1px solid rgba(100,150,255,.08)",borderRadius:13,padding:"15px 17px",display:"flex",alignItems:"center",gap:11}}>
          <div style={{width:34,height:34,borderRadius:9,background:s.lang==="Python"?"rgba(45,212,191,.12)":"rgba(245,158,11,.12)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:17}}>{s.lang==="Python"?"🐍":"☕"}</div>
          <div style={{flex:1}}><div style={{fontFamily:"monospace",fontSize:11,color:T.text}}>{s.name}</div><div style={{fontSize:10,color:T.text3,marginTop:1}}>:{s.port} · {s.lang}</div></div>
          <div style={{display:"flex",alignItems:"center",gap:4}}><PulseDot/><span style={{fontSize:11,color:"#10b981"}}>Up</span></div>
        </div>))}
      </div>
    </div>),
    kafka:(<div><div style={{fontFamily:"Syne",fontSize:22,fontWeight:700,marginBottom:22,color:T.text}}>⚡ Kafka Monitor</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16,marginBottom:22}}>
        <StatBox label="Topics" value="8" sub="all healthy" accent={T.accent} T={T}/>
        <StatBox label="Messages/min" value="5.2K" sub="peak traffic" accent={T.accent2} T={T}/>
        <StatBox label="Broker Status" value="✓ OK" sub="3 brokers active" accent="#10b981" T={T}/>
      </div>
      <Card T={T}><CardHdr title="Topic Health" T={T}/>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr><TH>Topic</TH><TH>Producer</TH><TH>Msg/hr</TH><TH>Status</TH></tr></thead>
          <tbody>{[["policy-events","policy-service",1248],["risk-evaluation-requests","policy-service",847],["fraud-check-requests","claims-service",234],["notification-events","multiple",512],["audit-events","all services",2104]].map(([t,p,r])=>(<TR key={t}><TD mono accent={T.accent2}>{t}</TD><TD>{p}</TD><TD><span style={{fontFamily:"Syne",fontWeight:700,color:T.accent2}}>{r.toLocaleString()}</span></TD><TD><Chip color="green" T={T}>Healthy</Chip></TD></TR>))}</tbody>
        </table>
      </Card>
    </div>),
    audit:(<div><div style={{fontFamily:"Syne",fontSize:22,fontWeight:700,marginBottom:22,color:T.text}}>Audit Logs</div>
      <Card T={T}><table style={{width:"100%",borderCollapse:"collapse"}}>
        <thead><tr><TH>Time</TH><TH>User</TH><TH>Action</TH><TH>Service</TH><TH>Result</TH></tr></thead>
        <tbody>{[["09:12:33","Priya Nair","POLICY_APPROVED","workflow-service","green"],["09:10:11","Vikram Rao","CLAIM_FLAGGED","ai-fraud-service","amber"],["09:08:44","System","RISK_SCORED","ai-risk-service","green"],["09:05:22","Rahul Mehta","POLICY_APPLIED","policy-service","blue"],["08:58:01","Admin","USER_CREATED","auth-service","green"]].map(([t,u,a,s,c],i)=>(<TR key={i}><TD><span style={{fontFamily:"monospace",fontSize:11,color:T.text3}}>{t}</span></TD><TD>{u}</TD><TD><span style={{fontFamily:"monospace",fontSize:11,color:T.accent2}}>{a}</span></TD><TD><span style={{fontFamily:"monospace",fontSize:11,color:T.text3}}>{s}</span></TD><TD><Chip color={c} T={T}>OK</Chip></TD></TR>))}</tbody>
      </table></Card>
    </div>),
    config:(<div><div style={{fontFamily:"Syne",fontSize:22,fontWeight:700,marginBottom:22,color:T.text}}>System Config</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
        <Card T={T}><CardHdr title="JWT Settings" T={T}/><div style={{padding:"14px 18px"}}>
          {[["Issuer","auth-service"],["Expiry","24h"],["Algorithm","HS256"],["Refresh Token","7 days"]].map(([k,v])=>(<div key={k} style={{display:"flex",justifyContent:"space-between",fontSize:13,padding:"9px 0",borderBottom:"1px solid rgba(100,150,255,.06)"}}><span style={{color:T.text2}}>{k}</span><span style={{fontFamily:"monospace",fontSize:12,color:T.accent2}}>{v}</span></div>))}
        </div></Card>
        <Card T={T}><CardHdr title="Infrastructure" T={T}/><div style={{padding:"14px 18px",display:"flex",flexDirection:"column",gap:10}}>
          {[["PostgreSQL","Connected","green"],["Apache Kafka","Healthy","green"],["Redis","Active","green"],["Elasticsearch","Indexing","amber"]].map(([n,s,c])=>(<div key={n} style={{display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:13,padding:"8px 0",borderBottom:"1px solid rgba(100,150,255,.06)"}}><span style={{color:T.text2}}>{n}</span><Chip color={c} T={T}>{s}</Chip></div>))}
        </div></Card>
      </div>
    </div>),
    rules:(<div><div style={{fontFamily:"Syne",fontSize:22,fontWeight:700,marginBottom:22,color:T.text}}>Rules Engine</div>
      <Card T={T}><div style={{padding:"14px 18px",display:"flex",flexDirection:"column",gap:8}}>
        {(rules.length?rules:[{code:"RUL-001",name:"Eligibility Check",trigger:"POLICY_CREATED"},{code:"RUL-002",name:"IRDAI Compliance",trigger:"POLICY_APPROVED"},{code:"RUL-003",name:"High Risk Escalate",trigger:"RISK_SCORE_GT_70"},{code:"RUL-004",name:"Auto-Renewal",trigger:"EXPIRY_30D"}]).map((r,i)=>(
          <div key={r.code||r.id||i} style={{display:"flex",alignItems:"center",gap:13,padding:"11px 13px",background:"rgba(59,130,246,.05)",borderRadius:9,border:"1px solid rgba(59,130,246,.09)"}}><span style={{fontFamily:"monospace",fontSize:11,color:T.accent2,width:66}}>{r.code||r.id||`RUL-00${i+1}`}</span><div style={{flex:1}}><div style={{fontSize:13,fontWeight:500,color:T.text}}>{r.name||r.description||"Rule"}</div><div style={{fontSize:11,color:T.text3,fontFamily:"monospace",marginTop:1}}>{r.trigger||r.eventType||"—"}</div></div><Chip color="green" T={T}>Active</Chip><Btn T={T} variant="ghost" style={{padding:"5px 9px",fontSize:11}}>Edit</Btn></div>
        ))}
      </div></Card>
    </div>),
    reports:(<div><div style={{fontFamily:"Syne",fontSize:22,fontWeight:700,marginBottom:22,color:T.text}}>Reports</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:16}}>
        <StatBox label="Total Policies" value="2,481" sub="active" accent={T.accent} T={T}/>
        <StatBox label="Open Claims" value="187" sub="in progress" accent="#f43f5e" T={T}/>
        <StatBox label="AI Accuracy" value="94.3%" sub="risk model" accent="#10b981" T={T}/>
        <StatBox label="Revenue YTD" value="₹4.2Cr" sub="Q1 2025" accent="#f59e0b" T={T}/>
      </div>
    </div>),
  };
  const TITLES={home:"Dashboard",users:"User Management",services:"Microservices",kafka:"Kafka Monitor",rules:"Rules Engine",audit:"Audit Logs",config:"System Config",reports:"Reports"};
  return (
    <div style={{display:"flex",minHeight:"100vh",background:T.bg}}>
      <div style={{position:"fixed",top:"-20%",left:"-10%",width:"60%",height:"60%",background:"radial-gradient(ellipse,rgba(59,130,246,.07) 0%,transparent 70%)",pointerEvents:"none",zIndex:0}}/>
      <Sidebar role="admin" nav={nav} setNav={setNav} T={T} onLogout={onLogout}/>
      <div style={{marginLeft:248,flex:1,display:"flex",flexDirection:"column",position:"relative",zIndex:1}}>
        <Topbar title={TITLES[nav]||nav} sub="Admin Portal · Full system access" T={T} userName={userName} roleLabel="System Admin"/>
        <div style={{padding:26,flex:1}} key={nav}>{pages[nav]||pages.home}</div>
      </div>
    </div>
  );
}

function AiAnalystPortal({ auth, onLogout }) {
  const T=THEMES.ai;
  const [nav,setNav]=useState("home");
  const services=[
    {name:"ai-risk-service",     port:9001,stack:"Risk scoring engine",       metric:"1,247 scores/day",acc:"94.3%",latency:"48ms", icon:"📊",color:"#818cf8"},
    {name:"ai-fraud-service",    port:9002,stack:"Fraud detection engine",    metric:"12 flags today",  acc:"91%",  latency:"62ms", icon:"🔍",color:"#f43f5e"},
    {name:"ai-document-service", port:9003,stack:"Document extraction engine",metric:"348 docs parsed", acc:"97%",  latency:"210ms",icon:"📄",color:"#2dd4bf"},
    {name:"ai-assistant-service",port:9004,stack:"Assistant orchestration",   metric:"89 queries/day",  acc:"N/A",  latency:"1.2s", icon:"💬",color:"#a78bfa"},
  ];
  const pages={
    home:(<div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:16,marginBottom:26}}>
        {[["🤖","AI Services","4/4","all online",T.accent],["📊","Inferences","1,776","today",T.accent2],["⚡","Kafka Topics","8","all healthy","#2dd4bf"],["🧠","Models","6","in production","#f59e0b"]].map(([ic,l,v,s,c])=>(
          <div key={l} className="fadeUp" style={{background:T.surface,border:"1px solid rgba(130,100,200,.08)",borderRadius:16,padding:18,position:"relative",overflow:"hidden"}}>
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
            <div style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:"#10b981"}}><PulseDot/> Live</div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:9}}>
            {[["Volume",s.metric],["Accuracy",s.acc],["P95 Latency",s.latency]].map(([l,v])=>(<div key={l} style={{background:"rgba(130,100,200,.06)",borderRadius:7,padding:"8px 9px"}}><div style={{fontSize:9,color:T.text3,textTransform:"uppercase",letterSpacing:.8,marginBottom:3}}>{l}</div><div style={{fontSize:12,fontWeight:600,color:s.color}}>{v}</div></div>))}
          </div>
        </div>))}
      </div>
    </div>),
    risk:(<div><div style={{fontFamily:"Syne",fontSize:22,fontWeight:700,marginBottom:22,color:T.text}}>Risk Scoring Service</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16,marginBottom:22}}>
        <StatBox label="Inferences Today" value="1,247" sub="via Kafka consumer" accent={T.accent} T={T}/>
        <StatBox label="Avg Score" value="43.2" sub="all policies" accent={T.accent2} T={T}/>
        <StatBox label="Model Accuracy" value="94.3%" sub="production model" accent="#10b981" T={T}/>
      </div>
      <Card T={T}><CardHdr title="API Endpoint" sub="POST /api/risk/score · ai-risk-service :9001" T={T}/>
        <div style={{padding:"14px 18px"}}><div style={{background:"rgba(130,100,200,.06)",borderRadius:9,padding:"13px 15px",fontFamily:"monospace",fontSize:12,color:"#2dd4bf",lineHeight:1.8,border:"1px solid rgba(130,100,200,.1)"}}>{"// Request\nPOST http://ai-risk-service:9001/api/risk/score\n{\n  \"policy_id\": \"POL-2025-0839\",\n  \"features\": { \"sector\": \"fire\", \"revenue\": 180000000 }\n}\n\n// Response\n{ \"risk_score\": 67, \"label\": \"MEDIUM\", \"factors\": [\"occupancy_index\"] }"}</div></div>
      </Card>
    </div>),
    fraud:(<div><div style={{fontFamily:"Syne",fontSize:22,fontWeight:700,marginBottom:22,color:T.text}}>Fraud Detection Service</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16,marginBottom:22}}>
        <StatBox label="Flags Today" value="12" sub="anomaly detected" accent="#f43f5e" T={T}/>
        <StatBox label="Precision" value="91%" sub="fraud model" accent="#10b981" T={T}/>
        <StatBox label="False Positive Rate" value="9%" sub="improving" accent="#f59e0b" T={T}/>
      </div>
      <Card T={T}><CardHdr title="API Endpoint" sub="POST /api/fraud/detect · ai-fraud-service :9002" T={T}/>
        <div style={{padding:"14px 18px"}}><div style={{background:"rgba(130,100,200,.06)",borderRadius:9,padding:"13px 15px",fontFamily:"monospace",fontSize:12,color:"#2dd4bf",lineHeight:1.8,border:"1px solid rgba(130,100,200,.1)"}}>{"// Request\nPOST http://ai-fraud-service:9002/api/fraud/detect\n{\n  \"claim_id\": \"CLM-0091\",\n  \"amount\": 4800000\n}\n\n// Response\n{ \"fraud_score\": 87, \"verdict\": \"HIGH_RISK\", \"anomalies\": [\"amount_spike_8x\"] }"}</div></div>
      </Card>
    </div>),
    document:(<div><div style={{fontFamily:"Syne",fontSize:22,fontWeight:700,marginBottom:22,color:T.text}}>Document Analysis Service</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16}}>
        <StatBox label="Docs Parsed" value="348" sub="today" accent="#2dd4bf" T={T}/>
        <StatBox label="Extraction Acc" value="97%" sub="extraction model" accent="#10b981" T={T}/>
        <StatBox label="Avg Latency" value="210ms" sub="per document" accent={T.accent2} T={T}/>
      </div>
    </div>),
    assistant:(<div><div style={{fontFamily:"Syne",fontSize:22,fontWeight:700,marginBottom:22,color:T.text}}>AI Assistant Service</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16}}>
        <StatBox label="Queries Today" value="89" sub="RAG responses" accent={T.accent} T={T}/>
        <StatBox label="Avg Response" value="1.2s" sub="LLM latency" accent={T.accent2} T={T}/>
        <StatBox label="Vector DB" value="2,481" sub="indexed policies" accent="#2dd4bf" T={T}/>
      </div>
    </div>),
    kafka:(<div><div style={{fontFamily:"Syne",fontSize:22,fontWeight:700,marginBottom:22,color:T.text}}>Event Stream</div>
      <Card T={T}><table style={{width:"100%",borderCollapse:"collapse"}}>
        <thead><tr><TH>Topic</TH><TH>AI Consumer</TH><TH>Msg/hr</TH><TH>Status</TH></tr></thead>
        <tbody>{[["risk-evaluation-requests","ai-risk-service",847],["risk-evaluation-results","policy-service",841],["fraud-check-requests","ai-fraud-service",234],["fraud-check-results","claims-service",229],["document-analysis-requests","ai-document-service",348]].map(([t,c,r])=>(<TR key={t}><TD mono accent={T.accent2}>{t}</TD><TD>{c}</TD><TD><span style={{fontFamily:"Syne",fontWeight:700,color:T.accent2}}>{r}</span></TD><TD><Chip color="green" T={T}>Healthy</Chip></TD></TR>))}</tbody>
      </table></Card>
    </div>),
    models:(<div><div style={{fontFamily:"Syne",fontSize:22,fontWeight:700,marginBottom:22,color:T.text}}>Model Registry</div>
      <Card T={T}><table style={{width:"100%",borderCollapse:"collapse"}}>
        <thead><tr><TH>Model</TH><TH>Service</TH><TH>Version</TH><TH>Accuracy</TH><TH>Status</TH></tr></thead>
        <tbody>{[["Risk Scoring Model","ai-risk-service","v2.1","94.3%"],["Fraud Detection Model","ai-fraud-service","v1.4","91%"],["Document Extraction Model","ai-document-service","v3.0","97%"],["Assistant Orchestrator","ai-assistant-service","v1.0","N/A"]].map(([m,s,v,a])=>(<TR key={m}><TD>{m}</TD><TD><span style={{fontFamily:"monospace",fontSize:11,color:T.accent2}}>{s}</span></TD><TD>{v}</TD><TD>{a}</TD><TD><Chip color="green" T={T}>Deployed</Chip></TD></TR>))}</tbody>
      </table></Card>
    </div>),
    logs:(<div><div style={{fontFamily:"Syne",fontSize:22,fontWeight:700,marginBottom:22,color:T.text}}>Inference Logs</div>
      <Card T={T}><table style={{width:"100%",borderCollapse:"collapse"}}>
        <thead><tr><TH>Time</TH><TH>Service</TH><TH>Input ID</TH><TH>Score</TH><TH>Latency</TH></tr></thead>
        <tbody>{[["09:14:22","ai-risk-service","POL-2025-0842","34","45ms"],["09:13:58","ai-fraud-service","CLM-0092","21","60ms"],["09:13:12","ai-risk-service","POL-2025-0840","67","48ms"],["09:12:44","ai-document-service","POL-2025-0839","N/A","208ms"],["09:11:30","ai-fraud-service","CLM-0091","87","63ms"]].map(([t,s,id,sc,lat],i)=>(<TR key={i}><TD><span style={{fontFamily:"monospace",fontSize:11,color:T.text3}}>{t}</span></TD><TD><span style={{fontFamily:"monospace",fontSize:11,color:T.accent2}}>{s}</span></TD><TD><span style={{fontFamily:"monospace",fontSize:11,color:T.text2}}>{id}</span></TD><TD><span style={{color:sc==="N/A"?T.text3:parseInt(sc)>70?"#f43f5e":parseInt(sc)>50?"#f59e0b":"#10b981",fontWeight:700}}>{sc}</span></TD><TD><span style={{fontSize:12,color:T.text3}}>{lat}</span></TD></TR>))}</tbody>
      </table></Card>
    </div>),
  };
  const TITLES={home:"AI Overview",risk:"Risk Service",fraud:"Fraud Service",document:"Document Service",assistant:"Assistant Service",kafka:"Event Stream",models:"Model Registry",logs:"Inference Logs"};
  return (
    <div style={{display:"flex",minHeight:"100vh",background:T.bg}}>
      <div style={{position:"fixed",top:"-20%",left:"-10%",width:"60%",height:"60%",background:"radial-gradient(ellipse,rgba(139,92,246,.07) 0%,transparent 70%)",pointerEvents:"none",zIndex:0}}/>
      <Sidebar role="ai" nav={nav} setNav={setNav} T={T} onLogout={onLogout}/>
      <div style={{marginLeft:248,flex:1,display:"flex",flexDirection:"column",position:"relative",zIndex:1}}>
        <Topbar title={TITLES[nav]||nav} sub="AI Analyst Portal · Python FastAPI · Kafka" T={T} userName={auth?.user?.fullName||"AI Analyst"} roleLabel="AI Analyst"/>
        <div style={{padding:26,flex:1}} key={nav}>{pages[nav]||pages.home}</div>
      </div>
    </div>
  );
}

export default function App() {
  useEffect(injectGlobal,[]);
  const [auth,setAuth]=useState(null);
  const logout=async()=>{ await api.logout(); setAuth(null); };
  if(!auth) return <LoginPage onLogin={setAuth}/>;
  switch(auth.role){
    case "customer":    return <CustomerPortal       auth={auth} onLogout={logout}/>;
    case "underwriter": return <UnderwriterPortal    auth={auth} onLogout={logout}/>;
    case "claims":      return <ClaimsAdjusterPortal auth={auth} onLogout={logout}/>;
    case "admin":       return <AdminPortal          auth={auth} onLogout={logout}/>;
    case "ai":          return <AiAnalystPortal      auth={auth} onLogout={logout}/>;
    default:            return <LoginPage onLogin={setAuth}/>;
  }
}

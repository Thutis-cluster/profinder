const sb=supabase.createClient(CFG.url,CFG.key),M=document.getElementById("m");
function el(t,txt,cls){const e=document.createElement(t);if(txt!=null)e.textContent=txt;if(cls)e.className=cls;return e}
function field(l,id,type,ta){const w=el("div");w.append(el("label",l));const i=el(ta?"textarea":"input");i.id=id;if(type)i.type=type;w.append(i);return w}
function card(...k){const c=el("div",null,"card");c.append(...k);return c}
function btn(t,f,alt){const b=el("button",t,"btn"+(alt?" alt":""));b.onclick=f;return b}
const v=id=>document.getElementById(id).value.trim();
var TS={t:undefined};
function rs(){TS.t=undefined;if(window.turnstile)try{turnstile.reset()}catch(x){}}
function initTS(){var k=CFG.turnstile;if(!k||k.indexOf("YOUR")===0)return;
 var d=el("div");d.id="ts";M.firstChild.insertBefore(d,M.firstChild.lastChild);
 function go(){turnstile.render("#ts",{sitekey:k,callback:function(t){TS.t=t},"expired-callback":function(){TS.t=undefined}})}
 if(window.turnstile)return go();
 var sc=document.createElement("script");sc.src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";sc.onload=go;document.head.append(sc)}
var REC=false;
sb.auth.onAuthStateChange(function(ev){if(ev==="PASSWORD_RECOVERY"){REC=true;resetView()}});
function resetView(){const msg=el("div",null,"mut");M.replaceChildren(card(el("h3","Set a new password"),field("New password (min 10 characters)","np","password"),
 btn("Save password",async()=>{const p=document.getElementById("np").value;if(p.length<10){msg.textContent="Password too short.";return}
  const{error}=await sb.auth.updateUser({password:p});if(error){msg.textContent="Could not update: "+error.message;return}REC=false;boot()}),msg))}
function legal(){const p=el("p",null,"mut"),a=el("a","Terms","");a.href="terms.html";a.target="_blank";const b=el("a","Privacy Policy","");b.href="privacy.html";b.target="_blank";
 p.append("By submitting, you agree to our ",a," and ",b,", and confirm your references agreed to be contacted.");return p}
async function boot(){M.replaceChildren();const{data:{session}}=await sb.auth.getSession();if(REC)return resetView();if(!session)return authView();
 const{data:adm}=await sb.from("admins").select("user_id").maybeSingle();adm?adminView():proView(session.user)}
function authView(){const msg=el("div",null,"mut");
 M.append(card(el("h3","Join or log in"),el("p","Providers must create an account and be verified before appearing in search.","mut"),
 field("Email","em","email"),field("Password (min 10 characters)","pw","password"),
 btn("Log in",async()=>{const{error}=await sb.auth.signInWithPassword({email:v("em"),password:document.getElementById("pw").value,options:{captchaToken:TS.t}});rs();error?msg.textContent="Login failed: "+error.message:boot()}),document.createTextNode(" "),
 btn("Create account",async()=>{if(document.getElementById("pw").value.length<10){msg.textContent="Password too short.";return}
  const{error}=await sb.auth.signUp({email:v("em"),password:document.getElementById("pw").value,options:{captchaToken:TS.t}});rs();msg.textContent=error?("Could not sign up: "+error.message):"Check your email to confirm, then log in."},true),document.createTextNode(" "),btn("Forgot password",async()=>{if(!v("em")){msg.textContent="Enter your email first.";return}
  const{error}=await sb.auth.resetPasswordForEmail(v("em"),{redirectTo:location.origin+"/app.html",captchaToken:TS.t});rs();
  msg.textContent=error?("Could not send reset: "+error.message):"If that email has an account, a reset link is on its way."},true),msg));initTS()}
async function proView(u){const{data:p}=await sb.from("providers").select("*,provider_categories(category)").eq("id",u.id).maybeSingle();
 M.replaceChildren(btn("Log out",async()=>{await sb.auth.signOut();boot()},true));
 if(p){M.append(card(el("h3",p.biz),el("p","Status: "+p.status.toUpperCase(),p.status==="approved"?"ok":"mut"),
  el("p",p.status==="pending"?"We are verifying your details. You will appear in search once approved.":p.status==="approved"?"You are live in search.":"Your listing is not active. Contact support.","mut")));return}
 const msg=el("div",null,"mut"),cats=el("div",null,"row");CATS.forEach(c=>{const l=el("label"),i=el("input");i.type="checkbox";i.value=c;l.append(i,c);cats.append(l)});
 const f=card(el("h3","Provider application"),field("Full name","n"),field("Business name","b"),field("Cell number","p"),field("Main area (e.g. Hercules)","a"),
  el("label","Categories"),cats,field("Describe your services","d",null,true),field("Business reg. or trade certificate no. (CIPC, PIRB, Wireman's licence...)","r"),
  field("Reference 1 (name and number)","r1"),field("Reference 2 (name and number)","r2"),
  field("Upload ID + proof of trade (PDF/JPG, max 5MB)","f","file"),
  legal(),btn("Submit application",async()=>{
   const sel=[...cats.querySelectorAll("input:checked")].map(i=>i.value),file=document.getElementById("f").files[0];
   if(!v("n")||!v("b")||!v("p")||!v("a")||!v("d")||!v("r")||!v("r1")||!v("r2")||!sel.length||!file){msg.textContent="Please complete every field and upload a document.";return}
   if(file.size>5e6||!/^(application\/pdf|image\/(jpeg|png))$/.test(file.type)){msg.textContent="Document must be PDF/JPG/PNG under 5MB.";return}
   const path=u.id+"/"+Date.now()+"-"+file.name.replace(/[^\w.-]/g,"_");
   let r=await sb.storage.from("docs").upload(path,file);if(r.error){msg.textContent="Upload failed.";return}
   r=await sb.from("providers").insert({id:u.id,biz:v("b"),name:v("n"),phone:v("p"),area:v("a"),description:v("d")});if(r.error){msg.textContent="Check your details (cell number, lengths).";return}
   await sb.from("provider_private").insert({provider_id:u.id,email:u.email,reg_no:v("r"),ref1:v("r1"),ref2:v("r2"),doc_path:path});
   await sb.from("provider_categories").insert(sel.map(c=>({provider_id:u.id,category:c})));proView(u)}),msg);
 M.append(f)}
async function adminView(){const{count}=await sb.from("reports").select("id",{count:"exact",head:true});
 M.replaceChildren(el("h3","Admin: pending applications"),btn("Reports ("+(count||0)+")",reportsView),document.createTextNode(" "),btn("Log out",async()=>{await sb.auth.signOut();boot()},true));
 const{data}=await sb.from("providers").select("*,provider_categories(category),provider_private(*)").eq("status","pending");
 if(!data.length)M.append(card(el("p","Nothing waiting.")));
 const L={id:"ID document checked",phone:"Phone verified (called)",proof:"Trade/business registration confirmed",refs:"Both references called"};
 for(const p of data){const pr=p.provider_private,c=card(el("b",p.biz),el("div",p.name+" · "+p.area+" · "+p.phone+" · "+pr.email,"mut"),
   el("p","Reg: "+pr.reg_no+" | Refs: "+pr.ref1+" / "+pr.ref2,"mut"));
  const{data:s}=await sb.storage.from("docs").createSignedUrl(pr.doc_path,300);if(s){const a=el("a","Open document","btn alt");a.href=s.signedUrl;a.target="_blank";a.rel="noopener";c.append(a)}
  const ch=pr.checks;Object.keys(L).forEach(k=>{const d=el("div"),i=el("input");i.type="checkbox";i.checked=ch[k];i.style.width="auto";
   i.onchange=async()=>{ch[k]=i.checked;await sb.from("provider_private").update({checks:ch}).eq("provider_id",p.id)};d.append(i," "+L[k]);c.append(d)});
  c.append(btn("Approve",async()=>{const{error}=await sb.rpc("approve_provider",{pid:p.id});error?alert("Tick all four checks first."):adminView()}),document.createTextNode(" "),
   btn("Reject",async()=>{await sb.from("providers").update({status:"rejected"}).eq("id",p.id);adminView()},true));M.append(c)}}
async function reportsView(){
 M.replaceChildren(el("h3","Admin: reports"),btn("< Applications",adminView,true),document.createTextNode(" "),btn("Log out",async()=>{await sb.auth.signOut();boot()},true));
 const{data,error}=await sb.from("reports").select("id,reason,created_at,providers(id,biz,name,phone,status)").order("created_at",{ascending:false});
 if(error){M.append(card(el("p","Could not load reports. Did you run the reports SQL in Supabase?")));return}
 if(!data.length){M.append(card(el("p","No reports.")));return}
 const n={};data.forEach(r=>{if(r.providers)n[r.providers.id]=(n[r.providers.id]||0)+1});
 data.forEach(r=>{const p=r.providers;if(!p)return;
  const c=card(el("b",p.biz+" ("+p.status+")"),el("div",p.name+" · "+p.phone+" · "+n[p.id]+" report(s) in total","mut"),
   el("p",'"'+r.reason+'"'),el("div",new Date(r.created_at).toLocaleString(),"mut"));
  if(p.status==="approved")c.append(btn("Suspend provider",async()=>{if(confirm("Remove "+p.biz+" from search?")){await sb.from("providers").update({status:"suspended"}).eq("id",p.id);reportsView()}}),document.createTextNode(" "));
  if(p.status==="suspended")c.append(btn("Reinstate",async()=>{await sb.from("providers").update({status:"approved"}).eq("id",p.id);reportsView()}),document.createTextNode(" "));
  c.append(btn("Dismiss report",async()=>{await sb.from("reports").delete().eq("id",r.id);reportsView()},true));M.append(c)})}
boot();

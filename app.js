
const sb=supabase.createClient(CFG.url,CFG.key),M=document.getElementById("m");
function el(t,txt,cls){const e=document.createElement(t);if(txt!=null)e.textContent=txt;if(cls)e.className=cls;return e}
function field(l,id,type,ta){const w=el("div");w.append(el("label",l));const i=el(ta?"textarea":"input");i.id=id;if(type)i.type=type;w.append(i);return w}
function card(...k){const c=el("div",null,"card");c.append(...k);return c}
function btn(t,f,alt){const b=el("button",t,"btn"+(alt?" alt":""));b.onclick=f;return b}
const v=id=>document.getElementById(id).value.trim();
async function boot(){M.replaceChildren();const{data:{session}}=await sb.auth.getSession();if(!session)return authView();
 const{data:adm}=await sb.from("admins").select("user_id").maybeSingle();adm?adminView():proView(session.user)}
function authView(){const msg=el("div",null,"mut");
 M.append(card(el("h3","Join or log in"),el("p","Providers must create an account and be verified before appearing in search.","mut"),
 field("Email","em","email"),field("Password (min 10 characters)","pw","password"),
 btn("Log in",async()=>{const{error}=await sb.auth.signInWithPassword({email:v("em"),password:document.getElementById("pw").value});error?msg.textContent="Login failed: "+error.message:boot()}),document.createTextNode(" "),
 btn("Create account",async()=>{if(document.getElementById("pw").value.length<10){msg.textContent="Password too short.";return}
  const{error}=await sb.auth.signUp({email:v("em"),password:document.getElementById("pw").value});msg.textContent=error?("Could not sign up: "+error.message):"Check your email to confirm, then log in."},true),msg))}
async function proView(u){const{data:p}=await sb.from("providers").select("*,provider_categories(category)").eq("id",u.id).maybeSingle();
 M.replaceChildren(btn("Log out",async()=>{await sb.auth.signOut();boot()},true));
 if(p){M.append(card(el("h3",p.biz),el("p","Status: "+p.status.toUpperCase(),p.status==="approved"?"ok":"mut"),
  el("p",p.status==="pending"?"We are verifying your details. You will appear in search once approved.":p.status==="approved"?"You are live in search.":"Your listing is not active. Contact support.","mut")));return}
 const msg=el("div",null,"mut"),cats=el("div",null,"row");CATS.forEach(c=>{const l=el("label"),i=el("input");i.type="checkbox";i.value=c;l.append(i,c);cats.append(l)});
 const f=card(el("h3","Provider application"),field("Full name","n"),field("Business name","b"),field("Cell number","p"),field("Main area (e.g. Hercules)","a"),
  el("label","Categories"),cats,field("Describe your services","d",null,true),field("Business reg. or trade certificate no. (CIPC, PIRB, Wireman's licence...)","r"),
  field("Reference 1 (name and number)","r1"),field("Reference 2 (name and number)","r2"),
  field("Upload ID + proof of trade (PDF/JPG, max 5MB)","f","file"),
  btn("Submit application",async()=>{
   const sel=[...cats.querySelectorAll("input:checked")].map(i=>i.value),file=document.getElementById("f").files[0];
   if(!v("n")||!v("b")||!v("p")||!v("a")||!v("d")||!v("r")||!v("r1")||!v("r2")||!sel.length||!file){msg.textContent="Please complete every field and upload a document.";return}
   if(file.size>5e6||!/^(application\/pdf|image\/(jpeg|png))$/.test(file.type)){msg.textContent="Document must be PDF/JPG/PNG under 5MB.";return}
   const path=u.id+"/"+Date.now()+"-"+file.name.replace(/[^\w.-]/g,"_");
   let r=await sb.storage.from("docs").upload(path,file);if(r.error){msg.textContent="Upload failed.";return}
   r=await sb.from("providers").insert({id:u.id,biz:v("b"),name:v("n"),phone:v("p"),area:v("a"),description:v("d")});if(r.error){msg.textContent="Check your details (cell number, lengths).";return}
   await sb.from("provider_private").insert({provider_id:u.id,email:u.email,reg_no:v("r"),ref1:v("r1"),ref2:v("r2"),doc_path:path});
   await sb.from("provider_categories").insert(sel.map(c=>({provider_id:u.id,category:c})));proView(u)}),msg);
 M.append(f)}
async function adminView(){M.replaceChildren(el("h3","Admin: pending applications"),btn("Log out",async()=>{await sb.auth.signOut();boot()},true));
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
boot();

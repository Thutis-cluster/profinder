const sb=supabase.createClient(CFG.url,CFG.key),M=document.getElementById("m");
function el(t,txt,cls){const e=document.createElement(t);if(txt!=null)e.textContent=txt;if(cls)e.className=cls;return e}
function field(l,id,type,ta){const w=el("div");w.append(el("label",l));const i=el(ta?"textarea":"input");i.id=id;if(type)i.type=type;w.append(i);return w}
function card(...k){const c=el("div",null,"card");c.append(...k);return c}
function btn(t,f,alt){const b=el("button",t,"btn"+(alt?" alt":""));b.onclick=f;return b}
const v=id=>document.getElementById(id).value.trim();
var TS={t:undefined,w:undefined};
function wait(m){var k=CFG.turnstile;if(k&&k.indexOf("YOUR")!==0&&!TS.t){m.textContent="Please wait a moment for the security check above to finish, then try again.";return true}return false}
function rs(){TS.t=undefined;if(window.turnstile&&TS.w!==undefined)try{turnstile.reset(TS.w)}catch(x){}}
function initTS(){var k=CFG.turnstile;if(!k||k.indexOf("YOUR")===0)return;
 var d=el("div");d.id="ts";M.firstChild.insertBefore(d,M.firstChild.lastChild);
 function go(){if(TS.w!==undefined)try{turnstile.remove(TS.w)}catch(x){}TS.w=turnstile.render("#ts",{sitekey:k,callback:function(t){TS.t=t},"expired-callback":function(){TS.t=undefined}})}
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
 btn("Log in",async()=>{if(wait(msg))return;const{error}=await sb.auth.signInWithPassword({email:v("em"),password:document.getElementById("pw").value,options:{captchaToken:TS.t}});rs();error?msg.textContent="Login failed: "+error.message:boot()}),document.createTextNode(" "),
 btn("Create account",async()=>{if(wait(msg))return;if(document.getElementById("pw").value.length<10){msg.textContent="Password too short.";return}
  const{error}=await sb.auth.signUp({email:v("em"),password:document.getElementById("pw").value,options:{captchaToken:TS.t}});rs();msg.textContent=error?("Could not sign up: "+error.message):"Check your email to confirm, then log in."},true),document.createTextNode(" "),btn("Forgot password",async()=>{if(wait(msg))return;if(!v("em")){msg.textContent="Enter your email first.";return}
  const{error}=await sb.auth.resetPasswordForEmail(v("em"),{redirectTo:location.origin+"/app.html",captchaToken:TS.t});rs();
  msg.textContent=error?("Could not send reset: "+error.message):"If that email has an account, a reset link is on its way."},true),msg));initTS()}
function fv(l,id,val,ta){const w=field(l,id,null,ta);w.querySelector("#"+id).value=val||"";return w}
function myListing(u,p){
 const mut=p.status==="approved"?"ok":"mut",cur=p.provider_categories.map(c=>c.category);
 const info={pending:"We are verifying your details. You will appear in search once approved.",approved:"You are live in search.",rejected:"Your application was not approved. Contact info@kasituwebs.co.za.",suspended:"Your listing is suspended. Contact info@kasituwebs.co.za."}[p.status]||"";
 M.append(card(el("h3",p.biz),el("p","Status: "+p.status.toUpperCase(),mut),el("p",info,"mut")));if(p.status==="approved")replies(u,p);
 if(p.status!=="pending"&&p.status!=="approved")return;
 const msg=el("div",null,"mut"),cats=el("div",null,"row");
 CATS.forEach(c=>{const l=el("label"),i=el("input");i.type="checkbox";i.value=c;i.checked=cur.includes(c);l.append(i,c);cats.append(l)});
 M.append(card(el("h3","My listing"),el("p","Changing your business name, name, number, area, description or categories sends your listing back for review. It will not show in search until we approve it again.","mut"),
  fv("Business name","mb",p.biz),fv("Full name","mn",p.name),fv("Cell number","mp",p.phone),fv("Main area","ma",p.area),el("label","Categories"),cats,fv("Describe your services","md",p.description,true),
  btn("Save changes",async()=>{
   const sel=[...cats.querySelectorAll("input:checked")].map(i=>i.value),b=v("mb"),n=v("mn"),ph=v("mp"),a=v("ma"),d=v("md");
   if(!b||!n||!ph||!a||d.length<10||!sel.length){msg.textContent="Please complete every field (description at least 10 characters) and pick a category.";return}
   if(!/^[0-9+ ]{9,16}$/.test(ph)){msg.textContent="Cell number: digits, spaces and + only.";return}
   let r=await sb.from("providers").update({biz:b,name:n,phone:ph,area:a,description:d}).eq("id",u.id);
   if(r.error){msg.textContent="Could not save. Check your details.";return}
   const rem=cur.filter(c=>!sel.includes(c)),add=sel.filter(c=>!cur.includes(c));
   if(rem.length)await sb.from("provider_categories").delete().eq("provider_id",u.id).in("category",rem);
   if(add.length)await sb.from("provider_categories").insert(add.map(c=>({provider_id:u.id,category:c})));
   M.replaceChildren(btn("Log out",async()=>{await sb.auth.signOut();boot()},true));proView(u)}),msg))}
function delBtn(u){return btn("Delete my account and data",async()=>{
 if(!confirm("This permanently deletes your account, your listing and your uploaded documents. It cannot be undone. Continue?"))return;
 if(prompt("Type DELETE to confirm")!=="DELETE")return;
 const{data:f}=await sb.storage.from("docs").list(u.id);if(f&&f.length)await sb.storage.from("docs").remove(f.map(x=>u.id+"/"+x.name));
 const{error}=await sb.rpc("delete_my_account");if(error){alert("Could not delete automatically. Please email info@kasituwebs.co.za.");return}
 await sb.auth.signOut();boot()},true)}
async function proView(u){const{data:p}=await sb.from("providers").select("*,provider_categories(category)").eq("id",u.id).maybeSingle();
 M.replaceChildren(btn("Log out",async()=>{await sb.auth.signOut();boot()},true),document.createTextNode(" "),delBtn(u));
 if(p)return myListing(u,p);
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
async function adminView(){const{count}=await sb.from("reports").select("id",{count:"exact",head:true});const{count:rc}=await sb.from("reviews").select("id",{count:"exact",head:true}).eq("status","pending");
 M.replaceChildren(el("h3","Admin: pending applications"),btn("Reports ("+(count||0)+")",reportsView),document.createTextNode(" "),btn("Reviews ("+(rc||0)+")",reviewsAdmin),document.createTextNode(" "),btn("Log out",async()=>{await sb.auth.signOut();boot()},true));
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
async function reviewsAdmin(){
 M.replaceChildren(el("h3","Admin: reviews waiting"),btn("< Applications",adminView,true),document.createTextNode(" "),btn("Log out",async()=>{await sb.auth.signOut();boot()},true));
 const{data,error}=await sb.from("reviews").select("id,author_name,rating,comment,created_at,providers(biz)").eq("status","pending").order("created_at");
 if(error){M.append(card(el("p","Could not load reviews. Did you run the reviews SQL?")));return}
 if(!data.length){M.append(card(el("p","No reviews waiting.")));return}
 data.forEach(r=>{const c=card(el("b",(r.providers?r.providers.biz:"?")+": "+"\u2605".repeat(r.rating)),el("div","By "+r.author_name+" · "+new Date(r.created_at).toLocaleDateString("en-ZA"),"mut"),el("p",r.comment));
  const set=st=>async()=>{await sb.from("reviews").update({status:st}).eq("id",r.id);reviewsAdmin()};
  c.append(btn("Approve",set("approved")),document.createTextNode(" "),btn("Reject",set("rejected"),true));M.append(c)})}
async function replies(u,p){
 const{data}=await sb.from("reviews").select("id,author_name,rating,comment,reply").eq("provider_id",p.id).eq("status","approved").order("created_at",{ascending:false});
 if(!data||!data.length)return;M.append(el("h3","Reviews of my business"));
 data.forEach(r=>{const t=el("textarea");t.value=r.reply||"";t.maxLength=500;t.placeholder="Write a public reply (optional)";const m=el("div",null,"mut");
  M.append(card(el("b","\u2605".repeat(r.rating)+"  "+r.author_name),el("p",r.comment),t,btn("Save reply",async()=>{const{error}=await sb.rpc("reply_review",{rid:r.id,txt:t.value});m.textContent=error?"Could not save.":"Saved."}),m))})}
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

const sb=supabase.createClient(CFG.url,CFG.key),M=document.getElementById("m"),PID=new URLSearchParams(location.search).get("p");
function el(t,txt,cls){const e=document.createElement(t);if(txt!=null)e.textContent=txt;if(cls)e.className=cls;return e}
function card(...k){const c=el("div",null,"card");c.append(...k);return c}
function field(l,id,type){const w=el("div");w.append(el("label",l));const i=el(type==="ta"?"textarea":"input");i.id=id;if(type&&type!=="ta")i.type=type;w.append(i);return w}
const v=id=>document.getElementById(id).value.trim(),stars=n=>"\u2605".repeat(n)+"\u2606".repeat(5-n);
var TS={t:undefined};
function initTS(host){var k=CFG.turnstile;if(!k||k.indexOf("YOUR")===0)return;var d=el("div");d.id="ts";host.append(d);
 function go(){turnstile.render("#ts",{sitekey:k,callback:function(t){TS.t=t},"expired-callback":function(){TS.t=undefined}})}
 if(window.turnstile)return go();var sc=document.createElement("script");sc.src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";sc.onload=go;document.head.append(sc)}
async function load(){
 const{data:p}=await sb.from("providers").select("id,biz,area").eq("id",PID||"").eq("status","approved").maybeSingle();
 if(!p){M.append(card(el("p","Listing not found.")));return}
 const{data:rv,error:re}=await sb.from("reviews").select("author_name,rating,comment,reply,created_at").eq("provider_id",p.id).eq("status","approved").order("created_at",{ascending:false});
 if(re||!rv){M.append(card(el("h3",p.biz),el("p","Reviews are not available right now. Please try again later.","mut")));return}
 const avg=rv.length?(rv.reduce((a,x)=>a+x.rating,0)/rv.length).toFixed(1):null;
 M.append(card(el("h3",p.biz),el("div",p.area+(avg?" · \u2605 "+avg+" ("+rv.length+" review"+(rv.length>1?"s":"")+")":" · No reviews yet"),"mut")));
 rv.forEach(x=>{const c=card(el("b",stars(x.rating)+"  "+x.author_name),el("div",new Date(x.created_at).toLocaleDateString("en-ZA"),"mut"),el("p",x.comment));
  if(x.reply)c.append(el("p","Reply from provider: "+x.reply,"mut"));M.append(c)});
 const{data:{session}}=await sb.auth.getSession(),msg=el("div",null,"mut");
 if(!session){
  const b=el("button","Email me a sign-in link","btn");
  b.onclick=async()=>{const e=v("em");if(!e){msg.textContent="Enter your email.";return}
   if(CFG.turnstile&&CFG.turnstile.indexOf("YOUR")!==0&&!TS.t){msg.textContent="Please wait for the security check to finish.";return}
   const{error}=await sb.auth.signInWithOtp({email:e,options:{emailRedirectTo:location.href,captchaToken:TS.t}});
   if(window.turnstile)try{turnstile.reset()}catch(x){}TS.t=undefined;
   msg.textContent=error?"Could not send the link: "+error.message:"Check your email and click the link. You will come back to this page."};
  const c=card(el("h3","Write a review"),el("p","Verify your email first. We never show your email to anyone.","mut"),field("Your email","em","email"),b,msg);M.append(c);initTS(c);return}
 const sel=el("select");[5,4,3,2,1].forEach(n=>{const o=el("option",stars(n));o.value=n;sel.append(o)});
 const sb2=el("button","Submit review","btn");
 sb2.onclick=async()=>{const nm=v("rn"),cm=v("rc");if(nm.length<2||cm.length<10){msg.textContent="Add a name (2+ letters) and a comment (10+ characters).";return}
  const{error}=await sb.from("reviews").insert({provider_id:p.id,author_id:session.user.id,author_name:nm,rating:+sel.value,comment:cm});
  msg.textContent=error?(error.code==="23505"?"You have already reviewed this provider.":"Could not submit your review."):"Thank you! Your review will appear once we have approved it."};
 const lo=el("button","Log out","btn alt");lo.onclick=async()=>{await sb.auth.signOut();location.reload()};
 const w=el("div");w.append(el("label","Rating"),sel);
 M.append(card(el("h3","Write a review"),el("p","Only review providers you have actually dealt with. Reviews are checked before they are shown.","mut"),field("Name shown publicly (e.g. first name)","rn"),w,field("Your comment","rc","ta"),sb2," ",lo,msg))}
load();

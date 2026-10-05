const sb=supabase.createClient(CFG.url,CFG.key),$=i=>document.getElementById(i);
const near=(a,b)=>!a||a===b||CLUSTERS.some(c=>c.includes(a)&&c.includes(b));
function el(t,txt,cls){const e=document.createElement(t);if(txt!=null)e.textContent=txt;if(cls)e.className=cls;return e}
const wa=p=>{p=p.replace(/\D/g,"");if(p[0]==="0")p="27"+p.slice(1);return"https://wa.me/"+p};
async function search(){
 let t=$("q").value.trim().toLowerCase(),area="",svc=t,m=t.match(/^(.*?)\s+in\s+(.+)$/);
 if(m){svc=m[1];area=m[2].trim()}svc=svc.replace(/s$/,"").trim();
 const{data,error}=await sb.from("providers").select("id,biz,name,phone,area,description,approved_at,provider_categories(category)").eq("status","approved").limit(200);
 const out=$("res");out.replaceChildren();
 if(error){out.append(el("div","Something went wrong. Please try again.","card"));return}
 const r=data.filter(p=>(!svc||p.provider_categories.some(c=>c.category.toLowerCase().includes(svc))||p.description.toLowerCase().includes(svc))&&near(area,p.area.toLowerCase()))
  .sort((a,b)=>(b.area.toLowerCase()===area)-(a.area.toLowerCase()===area));
 if(!r.length){out.append(el("div","No verified providers found. Try a nearby area or another service.","card"));return}
 r.forEach(p=>{const c=el("div",null,"card"),h=el("b",p.biz);h.append(el("span"," ✓ Verified"+(p.approved_at?" "+new Date(p.approved_at).toLocaleDateString("en-ZA",{month:"short",year:"numeric"}):""),"ok"));c.append(h,el("div",p.name+" · "+p.area,"mut"));
  const tg=el("div");p.provider_categories.forEach(x=>tg.append(el("span",x.category,"tag")));
  const call=el("a","Call","btn");call.href="tel:"+p.phone.replace(/\s/g,"");
  const w=el("a","WhatsApp","btn alt");w.href=wa(p.phone);w.target="_blank";w.rel="noopener";
  const rp=el("button","Report","btn alt");rp.onclick=async()=>{const why=prompt("What is the problem with this listing?");
   if(why&&why.length>=5){const{error}=await sb.from("reports").insert({provider_id:p.id,reason:why.slice(0,500)});alert(error?"Could not send report.":"Thanks, we will review it.")}};
  c.append(tg,el("p",p.description),call," ",w," ",rp);out.append(c)})}
$("go").onclick=search;$("q").onkeydown=e=>{if(e.key==="Enter")search()};

CATS.forEach(c=>{const b=el("button",c,"btn alt");b.onclick=()=>{const m=$("q").value.match(/\s+in\s+(.+)$/i);$("q").value=c+(m?" in "+m[1]:"");search()};$("cats").append(b);$("cats").append(" ")});

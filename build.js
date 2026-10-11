// Generates Google-friendly static pages from your approved providers. Run on Render as the Build Command: node build.js
const fs=require("fs"),path=require("path");
const OUT=process.env.OUT||".",SITE=(process.env.SITE_URL||"https://profinder-4ec1.onrender.com").replace(/\/$/,"");
const PL={"Plumber":"Plumbers","Electrician":"Electricians","Painter":"Painters","Gardener":"Gardeners","Cleaner":"Cleaners","Handyman":"Handymen","Photographer":"Photographers","Social media marketer":"Social media marketers","Web designer":"Web designers","Printing & signage":"Printing and signage services"};
const esc=s=>String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const slug=s=>s.toLowerCase().replace(/&/g,"and").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
const tcase=s=>s.toLowerCase().replace(/\b[a-z]/g,c=>c.toUpperCase());
const wa=p=>{p=p.replace(/\D/g,"");if(p[0]==="0")p="27"+p.slice(1);return"https://wa.me/"+p};
const isF=p=>p.plan==="featured"&&p.featured_until&&new Date(p.featured_until).getTime()>Date.now();
async function get(u,k,q){const r=await fetch(u+"/rest/v1/"+q,{headers:{apikey:k}});if(!r.ok)throw new Error(r.status+" "+q);return r.json()}
function page(t,desc,canon,body,ld){return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(t)}</title><meta name="description" content="${esc(desc)}"><link rel="canonical" href="${SITE}${canon}">
<meta property="og:title" content="${esc(t)}"><meta property="og:description" content="${esc(desc)}"><link rel="stylesheet" href="/style.css">
${ld?`<script type="application/ld+json">${JSON.stringify(ld).replace(/</g,"\\u003c")}</script>`:""}</head><body>
<header><b>ProFinder</b><a href="/index.html">Search</a></header><main>${body}</main>
<footer><a href="/seo/index.html">Browse all</a> · <a href="/privacy.html">Privacy Policy</a> · <a href="/terms.html">Terms of Use</a> · info@kasituwebs.co.za</footer><script src="/back.js"></script></body></html>`}
(async()=>{
 let P,R;
 try{
  if(process.env.MOCK){const m=JSON.parse(fs.readFileSync(process.env.MOCK));P=m.providers;R=m.reviews}
  else{const c=fs.readFileSync("config.js","utf8"),u=c.match(/url:"([^"]+)"/)[1],k=c.match(/key:"([^"]+)"/)[1];
   P=await get(u,k,"providers?select=id,biz,name,phone,area,description,plan,featured_until,provider_categories(category),provider_areas(area)&status=eq.approved&limit=1000");
   R=await get(u,k,"reviews?select=provider_id,rating&status=eq.approved&limit=5000")}
 }catch(e){console.log("SEO build skipped:",e.message);return}
 const rs={};R.forEach(x=>{const o=rs[x.provider_id]||(rs[x.provider_id]={s:0,n:0});o.s+=x.rating;o.n++});
 const combos={};
 P.forEach(p=>{const areas=[p.area].concat(isF(p)?(p.provider_areas||[]).map(a=>a.area):[]);
  const seen={};areas.forEach(a=>{const as=slug(a);if(!as||seen[as])return;seen[as]=1;
   p.provider_categories.forEach(c=>{const k=slug(c.category)+"/"+as,o=combos[k]||(combos[k]={cat:c.category,area:tcase(a),cs:slug(c.category),as,list:[]});o.list.push(p)})})});
 const keys=Object.keys(combos),urls=["/index.html","/seo/index.html","/privacy.html","/terms.html"];
 const dir=path.join(OUT,"seo");fs.mkdirSync(dir,{recursive:true});
 keys.forEach(k=>{const o=combos[k],plural=PL[o.cat]||o.cat,fn=`${o.cs}-in-${o.as}.html`;urls.push("/seo/"+fn);
  o.list.sort((a,b)=>isF(b)-isF(a)||a.biz.localeCompare(b.biz));
  const cards=o.list.map(p=>{const r=rs[p.id];
   return `<div class="card"><b>${esc(p.biz)}</b>${isF(p)?' <span class="tag">Featured</span>':""} <span class="ok">&#10003; Verified</span><div class="mut">${esc(p.name)} · ${esc(p.area)}${r?` · &#9733; ${(r.s/r.n).toFixed(1)} (${r.n})`:""}</div>
<div>${p.provider_categories.map(c=>`<span class="tag">${esc(c.category)}</span>`).join("")}</div><p>${esc(p.description)}</p>
<a class="btn" href="tel:${esc(p.phone.replace(/\s/g,""))}">Call</a> <a class="btn alt" href="${wa(p.phone)}" rel="noopener">WhatsApp</a> <a class="btn alt" href="/review.html?p=${p.id}">Reviews</a></div>`}).join("");
  const sameArea=keys.filter(x=>combos[x].as===o.as&&x!==k).map(x=>`<a href="/seo/${combos[x].cs}-in-${combos[x].as}.html">${esc(PL[combos[x].cat]||combos[x].cat)} in ${esc(combos[x].area)}</a>`);
  const sameCat=keys.filter(x=>combos[x].cs===o.cs&&x!==k).map(x=>`<a href="/seo/${combos[x].cs}-in-${combos[x].as}.html">${esc(plural)} in ${esc(combos[x].area)}</a>`);
  const more=(sameArea.length?`<div class="card"><b>Other services in ${esc(o.area)}</b><p>${sameArea.join(" · ")}</p></div>`:"")+(sameCat.length?`<div class="card"><b>${esc(plural)} in other areas</b><p>${sameCat.join(" · ")}</p></div>`:"");
  const ld=o.list.map(p=>{const r=rs[p.id],j={"@context":"https://schema.org","@type":"LocalBusiness",name:p.biz,telephone:p.phone,description:p.description,areaServed:o.area};
   if(r)j.aggregateRating={"@type":"AggregateRating",ratingValue:(r.s/r.n).toFixed(1),reviewCount:r.n};return j});
  const t=`${plural} in ${o.area} | Verified local pros - ProFinder`,d=`Find verified ${plural.toLowerCase()} in ${o.area}. Every provider is checked for ID, phone number, trade or business proof and references before they are listed.`;
  fs.writeFileSync(path.join(dir,fn),page(t,d,"/seo/"+fn,`<h1>${esc(plural)} in ${esc(o.area)}</h1><p class="mut">Every provider on ProFinder is checked before they are listed: ID, phone number, trade or business proof and two references.</p>${cards}${more}`,ld))});
 const byCat={};keys.forEach(k=>{(byCat[combos[k].cat]=byCat[combos[k].cat]||[]).push(combos[k])});
 const idx=Object.keys(byCat).sort().map(c=>`<div class="card"><b>${esc(PL[c]||c)}</b><p>${byCat[c].map(o=>`<a href="/seo/${o.cs}-in-${o.as}.html">${esc(o.area)}</a>`).join(" · ")}</p></div>`).join("");
 fs.writeFileSync(path.join(dir,"index.html"),page("Browse verified local pros by service and area - ProFinder","Browse verified local service providers by service and area.","/seo/index.html",`<h1>Browse by service and area</h1>${idx||"<p>Listings are coming soon.</p>"}`));
 const day=new Date().toISOString().slice(0,10);
 fs.writeFileSync(path.join(OUT,"sitemap.xml"),`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u=>`<url><loc>${SITE}${u}</loc><lastmod>${day}</lastmod></url>`).join("\n")}\n</urlset>\n`);
 fs.writeFileSync(path.join(OUT,"robots.txt"),`User-agent: *\nAllow: /\nDisallow: /app.html\nSitemap: ${SITE}/sitemap.xml\n`);
 console.log("SEO build done:",keys.length,"pages");
})();

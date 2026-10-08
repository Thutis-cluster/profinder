(function(){
 var h=document.querySelector("header");
 if(!h||/(^\/$|index\.html$)/.test(location.pathname))return;
 var a=document.createElement("a");a.textContent="\u2190 Back";a.href="index.html";
 a.onclick=function(e){if(history.length>1&&document.referrer&&document.referrer.indexOf(location.host)>-1){e.preventDefault();history.back()}};
 h.insertBefore(a,h.firstChild);
})();

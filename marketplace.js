/* imMBA Marketplace: role-based C2C marketplace (Visitor · Buyer · Seller · Platform admin) */
(function(){
"use strict";
var root=document.getElementById("mk-app");
if(!root||!window.supabase)return;
var sb=supabase.createClient("https://yklyadjtwiupaolsfxpo.supabase.co","sb_publishable_2gZwb6alKHN9LaL2QZkBBQ_-dLmmam0");
var CATS=["Books & materials","Electronics","Dorm & home","Clothing & merch","Other"];
var STEPS=[["waiting_payment","Waiting for payment"],["payment_confirmed","Payment confirmed"],["ready_to_ship","Ready to ship"],["shipped","Shipped"],["completed","Completed"]];
var LABEL={waiting_payment:"Waiting for payment confirmation",payment_confirmed:"Payment confirmed",ready_to_ship:"Ready to ship",shipped:"Shipped",completed:"Completed"};
var NEXT={waiting_payment:["confirm_payment","Confirm payment"],payment_confirmed:["ready_to_ship","Move to Ready to ship"],ready_to_ship:["ship","Confirm shipment"],shipped:["complete","Mark as completed"]};
var TABS={buyer:[["browse","Browse"],["cart","Cart"],["orders","My orders"],["history","Purchase history"],["member","Member center"]],
 seller:[["products","My products"],["inventory","Inventory"],["sellorders","Orders to process"],["dashboard","Sales dashboard"]],
 admin:[["alltx","All transactions"],["sellers","Sellers & users"]]};
var FEE=80,STALL_MS=72*3600*1000;
var S={user:null,profile:null,mode:"buyer",tab:"browse",cart:[],ship:"pickup",q:"",cat:"",tok:0};
try{S.cart=JSON.parse(localStorage.getItem("mk_cart")||"[]")}catch(e){S.cart=[]}

/* ---------- helpers ---------- */
function h(tag,props){var e=document.createElement(tag);
 if(props)for(var k in props){var v=props[k];if(v==null||v===false)continue;
  if(k==="class")e.className=v;else if(k==="style")e.style.cssText=v;else if(k.slice(0,2)==="on")e.addEventListener(k.slice(2),v);
  else if(k==="value"||k==="checked"||k==="disabled"||k==="selected")e[k]=v;else e.setAttribute(k,v===true?"":v)}
 for(var i=2;i<arguments.length;i++)add(e,arguments[i]);return e}
function add(e,c){if(c==null||c===false)return;if(Array.isArray(c)){c.forEach(function(x){add(e,x)});return}e.appendChild(c.nodeType?c:document.createTextNode(String(c)))}
function fill(e){e.textContent="";for(var i=1;i<arguments.length;i++)add(e,arguments[i]);return e}
var $=function(id){return document.getElementById(id)};
var money=function(n){return "NT$ "+Number(n).toLocaleString("en-US",{maximumFractionDigits:2})};
var ordNo=function(id){return "ORD-"+String(id).padStart(6,"0")};
var dt=function(s){return new Date(s).toLocaleString()};
var avail=function(p){return p.inventory-p.sold_qty};
var roles=function(){var p=S.profile;return{buyer:!!S.user,seller:!!p&&p.seller_status==="approved",admin:!!p&&(p.role==="admin"||p.role==="super_admin")}};
function say(t,err){var m=$("mk-msg");if(!m)return;m.textContent=t||"";m.className=t?(err?"mk-msg err":"mk-msg ok"):"";if(t)m.scrollIntoView({block:"nearest"})}
function saveCart(){try{localStorage.setItem("mk_cart",JSON.stringify(S.cart))}catch(e){}}
function csvEsc(v){v=v==null?"":String(v);return /[",\n\r]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v}
function download(name,text){var b=new Blob(["\uFEFF"+text],{type:"text/csv;charset=utf-8"}),a=document.createElement("a");a.href=URL.createObjectURL(b);a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(a.href)},1500)}
function friendly(e){var m=(e&&e.message)||String(e);if(m.indexOf("products_stock_ok")>-1)return "The quantity cannot be lower than the units already purchased.";if(m.indexOf("row-level security")>-1)return "You do not have permission to do that.";return m}

/* ---------- styles ---------- */
var css=document.createElement("style");css.textContent="#mk-app{margin-top:6px}.mk-top{display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between;background:var(--b);border:1px solid var(--bd);border-radius:14px;padding:12px 14px}.mk-row{display:flex;flex-wrap:wrap;gap:8px;align-items:center}.mk-chip{background:var(--b2);color:var(--g);font-size:12px;font-weight:700;padding:3px 10px;border-radius:999px}.mk-chip.warn{background:#fbe3d4;color:#a4471b}.mk-chip.mut{background:#e8edf1;color:var(--mut)}.mk-chip.ok{background:#dcefe3;color:var(--g)}.mk-seg{display:inline-flex;border:1.5px solid var(--g);border-radius:999px;overflow:hidden}.mk-seg button{border:0;background:#fff;color:var(--g);padding:6px 14px;font:inherit;font-weight:600;cursor:pointer}.mk-seg button.on{background:var(--g);color:#fff}.mk-tabs{display:flex;flex-wrap:wrap;gap:4px;margin:14px 0;border-bottom:1px solid var(--bd)}.mk-tabs button{border:0;background:none;padding:9px 14px;font:inherit;font-weight:600;color:var(--mut);cursor:pointer;border-bottom:3px solid transparent}.mk-tabs button.on{color:var(--g);border-bottom-color:var(--g)}.mk-btn{background:var(--g);color:#fff;border:1.5px solid var(--g);border-radius:999px;padding:8px 18px;font:inherit;font-weight:600;cursor:pointer}.mk-btn:hover{background:var(--g2)}.mk-btn.o{background:#fff;color:var(--g)}.mk-btn.o:hover{background:var(--b2)}.mk-btn.s{padding:4px 12px;font-size:13px}.mk-btn.d{background:#fff;color:#b3261e;border-color:#b3261e}.mk-btn:disabled{opacity:.5;cursor:default}.mk-msg{margin:10px 0;padding:10px 14px;border-radius:10px}.mk-msg.ok{background:#e3f3ea;color:#14482f}.mk-msg.err{background:#fde8e6;color:#8c1d18}.mk-sub{color:var(--mut);font-size:13px}.mk-err{color:#8c1d18}.mk-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:14px;margin-top:12px}.mk-card{background:#fff;border:1px solid var(--bd);border-radius:14px;overflow:hidden;display:flex;flex-direction:column;transition:transform .2s,box-shadow .2s}.mk-card:hover{transform:translateY(-3px);box-shadow:0 10px 24px #1b2a3322}.mk-th{height:150px;background:var(--b2);display:grid;place-items:center;font-size:42px;font-weight:700;color:var(--g)}.mk-th img{width:100%;height:100%;object-fit:cover}.mk-cb{padding:12px;display:flex;flex-direction:column;gap:6px}.mk-price{font-size:18px;font-weight:700;color:#d9622b}.mk-qty{width:62px;padding:5px 8px;border:1px solid var(--bd);border-radius:8px;font:inherit}.mk-box{background:#fff;border:1px solid var(--bd);border-radius:14px;padding:16px;margin:12px 0}.mk-order{background:#fff;border:1px solid var(--bd);border-radius:14px;padding:14px;margin:10px 0;display:flex;flex-direction:column;gap:6px}.mk-oh{display:flex;flex-wrap:wrap;gap:10px;align-items:center}.mk-badge{background:var(--b2);color:var(--g);font-size:12px;font-weight:700;padding:2px 10px;border-radius:999px}.mk-badge.st-completed{background:#dcefe3}.mk-badge.st-waiting_payment{background:#fbe3d4;color:#a4471b}.mk-items{margin:0;padding-left:18px}.mk-note{background:var(--b);border-left:4px solid var(--g);padding:8px 12px;border-radius:8px;font-size:14px}.mk-track{display:flex;gap:6px;flex-wrap:wrap;margin-top:4px}.mk-step{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--mut)}.mk-step span{width:20px;height:20px;border-radius:50%;background:#e8edf1;display:grid;place-items:center;font-weight:700}.mk-step.on{color:var(--g);font-weight:600}.mk-step.on span{background:var(--g);color:#fff}.mk-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px;margin:12px 0}.mk-stat{background:var(--b);border:1px solid var(--bd);border-radius:12px;padding:12px}.mk-stat b{display:block;font-size:20px;color:var(--g)}.mk-tb{width:100%;border-collapse:collapse;font-size:14px;background:#fff}.mk-tb th,.mk-tb td{border:1px solid var(--bd);padding:7px 10px;text-align:left;vertical-align:middle}.mk-tb th{background:var(--b2);white-space:nowrap}.mk-field label{display:block;font-size:13px;color:var(--mut);margin:10px 0 3px}.mk-field input,.mk-field select,.mk-field textarea,.mk-in{width:100%;padding:9px 11px;border:1px solid var(--bd);border-radius:8px;font:inherit;background:#fff;color:var(--tx)}.mk-field textarea{min-height:70px}#mk-dlg{border:1px solid var(--bd);border-radius:14px;max-width:540px;width:92%;padding:20px}#mk-dlg::backdrop{background:#0006}.mk-pw{position:relative}.mk-pw input{padding-right:46px}.mk-eye{position:absolute;right:4px;top:50%;transform:translateY(-50%);background:none;border:0;cursor:pointer;font-size:17px;padding:4px 10px}.mk-flow{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px}.mk-flow>div{background:var(--b);border:1px solid var(--bd);border-radius:12px;padding:10px 12px;font-size:14px}.mk-flow b{color:var(--g);display:block}.mk-tl{margin:6px 0 0;padding-left:18px;font-size:13px;color:var(--mut)}@media(max-width:640px){.mk-tb{font-size:12px}}";
document.head.appendChild(css);

/* ---------- layout ---------- */
var dlg=h("dialog",{id:"mk-dlg"});root.appendChild(dlg);
function openDlg(){for(var i=0;i<arguments.length;i++)add(dlg,arguments[i]);if(!dlg.open)dlg.showModal()}
function closeDlg(){if(dlg.open)dlg.close();dlg.textContent=""}
function render(){var keep=dlg;root.textContent="";root.appendChild(keep);
 root.appendChild(header());root.appendChild(h("div",{id:"mk-tabs",class:"mk-tabs"}));root.appendChild(h("div",{id:"mk-msg"}));root.appendChild(h("div",{id:"mk-body"}));root.appendChild(workflow());
 renderTabs();renderBody()}
function tabsFor(){var r=roles();if(!S.user)return[["browse","Browse"]];if(S.mode==="seller")return r.seller?TABS.seller:[["become","Become a seller"]];if(S.mode==="admin")return TABS.admin;return TABS.buyer}
function renderTabs(){var T=$("mk-tabs"),list=tabsFor();if(!list.some(function(t){return t[0]===S.tab}))S.tab=list[0][0];
 fill(T,list.map(function(t){var n=t[0]==="cart"?"Cart ("+S.cart.reduce(function(a,c){return a+c.qty},0)+")":t[1];return h("button",{class:S.tab===t[0]?"on":"",onclick:function(){setTab(t[0])}},n)}))}
function setTab(t){S.tab=t;say("");renderTabs();renderBody()}
function setMode(m){S.mode=m;S.tab=tabsFor()[0][0];render()}
function header(){var r=roles(),p=S.profile;
 var chips=h("div",{class:"mk-row"},h("span",{class:"mk-chip"},S.user?"Buyer":"Visitor"),r.seller?h("span",{class:"mk-chip ok"},"Seller"):null,r.admin?h("span",{class:"mk-chip warn"},"Platform admin"):null);
 var modes=[["buyer","Buyer mode"]];if(S.user)modes.push(["seller","Seller mode"]);if(r.admin)modes.push(["admin","Platform admin"]);
 var seg=S.user?h("div",{class:"mk-seg",role:"group","aria-label":"Current role"},modes.map(function(m){return h("button",{class:S.mode===m[0]?"on":"",onclick:function(){setMode(m[0])}},m[1])})):null;
 var who=S.user?h("div",{class:"mk-row"},h("span",{class:"mk-sub"},"Signed in as "+((p&&p.display_name)||S.user.email)),h("button",{class:"mk-btn o s",onclick:function(){sb.auth.signOut()}},"Sign out")):h("div",{class:"mk-row"},h("span",{class:"mk-sub"},"Browsing as a visitor"),h("button",{class:"mk-btn s",onclick:function(){authDlg("in")}},"Sign in / Register"));
 return h("div",{class:"mk-top"},chips,seg,who)}
var TOK=0;
async function renderBody(){var b=$("mk-body");if(!b)return;var tok=++TOK;fill(b,h("p",{class:"mk-sub"},"Loading…"));
 try{var v=await VIEWS[S.tab]();if(tok!==TOK)return;fill(b,v)}catch(e){if(tok!==TOK)return;fill(b,h("p",{class:"mk-err"},"Something went wrong: "+friendly(e)+" (has marketplace_setup.sql been run in Supabase?)"))}}
function prompt(text){return h("div",{class:"mk-box"},h("p",null,text),h("button",{class:"mk-btn",onclick:function(){authDlg("in")}},"Sign in / Register"))}

/* ---------- auth ---------- */
function eye(id){return h("button",{type:"button",class:"mk-eye","aria-label":"Show password",title:"Show password",onclick:function(e){var i=$(id),s=i.type==="password";i.type=s?"text":"password";e.currentTarget.textContent=s?"🙈":"👁"}},"👁")}
function pw(id,ac){return h("div",{class:"mk-pw"},h("input",{id:id,type:"password",autocomplete:ac}),eye(id))}
function authDlg(mode,note){closeDlg();var conf=false;
 var msg=h("p",{class:"mk-sub"},note||"");
 var seg=h("div",{class:"mk-seg"},h("button",{class:mode==="in"?"on":"",onclick:function(){authDlg("in")}},"Sign in"),h("button",{class:mode==="up"?"on":"",onclick:function(){authDlg("up")}},"Register"));
 if(mode==="in"){
  openDlg(seg,h("div",{class:"mk-field"},h("label",null,"Email"),h("input",{id:"mk-em",type:"email",autocomplete:"email"}),h("label",null,"Password"),pw("mk-pw","current-password")),msg,
   h("div",{class:"mk-row",style:"margin-top:14px"},
    h("button",{class:"mk-btn",onclick:async function(){var r=await sb.auth.signInWithPassword({email:$("mk-em").value.trim(),password:$("mk-pw").value});if(r.error){fill(msg,r.error.message);msg.className="mk-err";return}closeDlg()}},"Sign in"),
    h("button",{class:"mk-btn o",onclick:async function(){var e=$("mk-em").value.trim();if(!e){fill(msg,"Type your email first.");return}var r=await sb.auth.resetPasswordForEmail(e,{redirectTo:location.origin+location.pathname});fill(msg,r.error?r.error.message:"Reset link sent. Check your email.")}},"Forgot password?"),
    h("button",{class:"mk-btn o",onclick:closeDlg},"Close")))
 }else{
  var ok=h("span",{class:"mk-sub"}),go=h("button",{class:"mk-btn",disabled:true,onclick:async function(){
    var e=$("mk-em2").value.trim(),n=$("mk-nm").value.trim();if(!e||!n){fill(msg,"Name and email are required.");msg.className="mk-err";return}
    var r=await sb.auth.signUp({email:e,password:$("mk-pw2").value,options:{emailRedirectTo:location.origin+location.pathname,data:{signup_source:"marketplace",display_name:n}}});
    if(r.error){fill(msg,r.error.message);msg.className="mk-err";return}
    authDlg("in","Account created. Check your email and click the verification link, then sign in.")}},"Create account");
  var reset=function(){conf=false;go.disabled=true;fill(ok,"")};
  openDlg(seg,h("div",{class:"mk-field"},h("label",null,"Display name"),h("input",{id:"mk-nm",autocomplete:"name"}),h("label",null,"Email"),h("input",{id:"mk-em2",type:"email",autocomplete:"email"}),h("label",null,"Password (min. 8 characters)"),pw("mk-pw2","new-password"),h("label",null,"Confirm password"),pw("mk-pw3","new-password")),
   h("div",{class:"mk-row",style:"margin-top:10px"},h("button",{class:"mk-btn o s",onclick:function(){var a=$("mk-pw2").value;if(a.length<8){fill(ok,"✗ At least 8 characters.");return}if(a!==$("mk-pw3").value){fill(ok,"✗ The passwords do not match.");return}conf=true;go.disabled=false;fill(ok,"✓ Passwords match.")}},"Confirm password"),ok),msg,
   h("div",{class:"mk-row",style:"margin-top:14px"},go,h("button",{class:"mk-btn o",onclick:closeDlg},"Close")));
  $("mk-pw2").addEventListener("input",reset);$("mk-pw3").addEventListener("input",reset)}}
function recoveryDlg(){closeDlg();var m=h("p",{class:"mk-sub"});openDlg(h("h3",null,"Set a new password"),h("div",{class:"mk-field"},pw("mk-npw","new-password")),m,h("div",{class:"mk-row",style:"margin-top:12px"},h("button",{class:"mk-btn",onclick:async function(){var r=await sb.auth.updateUser({password:$("mk-npw").value});fill(m,r.error?r.error.message:"Password updated.");if(!r.error)setTimeout(closeDlg,900)}},"Save password"),h("button",{class:"mk-btn o",onclick:closeDlg},"Close")))}
async function refreshAuth(){var s=(await sb.auth.getSession()).data.session;S.user=s?s.user:null;S.profile=null;
 if(S.user){var r=await sb.from("profiles").select("*").eq("id",S.user.id).maybeSingle();S.profile=r.data}
 var ro=roles();if(!S.user)S.mode="buyer";if(S.mode==="admin"&&!ro.admin)S.mode="buyer";render()}
sb.auth.onAuthStateChange(function(ev){setTimeout(function(){if(ev==="PASSWORD_RECOVERY"){refreshAuth().then(recoveryDlg)}else refreshAuth()},0)});
refreshAuth();

/* ---------- Buyer: browse, details, cart ---------- */
function thumb(p){return h("div",{class:"mk-th"},p.image_url?h("img",{src:p.image_url,alt:p.name,loading:"lazy"}):(p.name||"?").charAt(0).toUpperCase())}
function stock(a){return a<=0?h("span",{class:"mk-chip mut"},"Sold out"):a<=2?h("span",{class:"mk-chip warn"},"Low stock: only "+a+" left"):h("span",{class:"mk-chip ok"},"In stock: "+a+" available")}
function inCart(id){var c=S.cart.filter(function(x){return x.id===id})[0];return c?c.qty:0}
function addToCart(p,qty){if(!S.user){authDlg("in","Sign in to add items to your cart.");return}
 if(p.seller_id===S.user.id){say("You cannot buy your own product.",true);return}
 qty=Math.max(1,parseInt(qty,10)||1);var room=avail(p)-inCart(p.id);if(room<=0){say("You already have all available units in your cart.",true);return}
 if(qty>room){qty=room}
 var c=S.cart.filter(function(x){return x.id===p.id})[0];if(c){c.qty+=qty}else S.cart.push({id:p.id,name:p.name,price:Number(p.price),seller_id:p.seller_id,seller_name:p.seller_name,image_url:p.image_url,qty:qty});
 saveCart();renderTabs();say("Added to cart: "+p.name+" × "+qty)}
function detail(p){closeDlg();var a=avail(p),q=h("input",{type:"number",min:1,max:Math.max(a,1),value:1,class:"mk-qty",id:"mk-dq"});
 openDlg(thumb(p),h("h3",{style:"margin:10px 0 4px"},p.name),h("div",{class:"mk-price"},money(p.price)),h("p",{class:"mk-sub"},p.category+" · sold by "+(p.seller_name||"a member")),stock(a),h("p",null,p.description||"No description provided."),
  h("div",{class:"mk-row"},a>0?[h("label",null,"Quantity "),q,h("button",{class:"mk-btn",onclick:function(){addToCart(p,q.value);closeDlg()}},"Add to cart")]:null,h("button",{class:"mk-btn o",onclick:closeDlg},"Close")))}
function pcard(p){var a=avail(p),q=h("input",{type:"number",min:1,max:Math.max(a,1),value:1,class:"mk-qty","aria-label":"Quantity"});
 return h("div",{class:"mk-card"},thumb(p),h("div",{class:"mk-cb"},h("b",null,p.name),h("div",{class:"mk-price"},money(p.price)),h("div",{class:"mk-sub"},p.category+" · by "+(p.seller_name||"a member")),stock(a),
  h("div",{class:"mk-row"},h("button",{class:"mk-btn o s",onclick:function(){detail(p)}},"View details"),a>0?[q,h("button",{class:"mk-btn s",onclick:function(){addToCart(p,q.value)}},"Add to cart")]:null)))}
async function vBrowse(){var r=await sb.from("products").select("*").eq("status","listed").order("created_at",{ascending:false});if(r.error)throw r.error;var list=r.data;
 var grid=h("div",{class:"mk-grid"});
 function draw(){var q=S.q.toLowerCase(),f=list.filter(function(p){return(!S.cat||p.category===S.cat)&&(!q||(p.name+" "+(p.description||"")+" "+(p.seller_name||"")).toLowerCase().indexOf(q)>-1)});
  fill(grid,f.length?f.map(pcard):h("p",{class:"mk-sub"},"No products match your search."))}
 var search=h("input",{class:"mk-in",placeholder:"Search products…",value:S.q,oninput:function(e){S.q=e.target.value;draw()}}),
  cat=h("select",{class:"mk-in",onchange:function(e){S.cat=e.target.value;draw()}},h("option",{value:""},"All categories"),CATS.map(function(c){return h("option",{value:c,selected:S.cat===c},c)}));
 draw();
 return h("div",null,S.user?null:h("div",{class:"mk-note"},"You are browsing as a visitor. Sign in to add products to your cart, place orders or sell."),h("div",{class:"mk-row",style:"margin-top:10px"},h("div",{style:"flex:2;min-width:200px"},search),h("div",{style:"flex:1;min-width:160px"},cat)),grid)}
async function vCart(){if(!S.user)return prompt("Sign in to review your cart and place an order.");
 if(!S.cart.length)return h("div",{class:"mk-box"},h("p",null,"Your cart is empty."),h("button",{class:"mk-btn",onclick:function(){setTab("browse")}},"Browse products"));
 var r=await sb.from("products").select("*").in("id",S.cart.map(function(c){return c.id}));if(r.error)throw r.error;var fresh={};r.data.forEach(function(p){fresh[p.id]=p});
 var bad=false;S.cart.forEach(function(c){var p=fresh[c.id];if(p&&p.status==="listed"){c.price=Number(p.price);c.name=p.name;c.max=avail(p);if(c.qty>c.max)c.qty=Math.max(c.max,0)}else{c.max=0}});saveCart();
 var groups={};S.cart.forEach(function(c){(groups[c.seller_id]=groups[c.seller_id]||[]).push(c)});
 var box=h("div");
 function draw(){var total=0,okAll=S.cart.length>0&&S.cart.every(function(c){return c.max>0&&c.qty>=1});
  var parts=Object.keys(groups).map(function(sid){var items=groups[sid].filter(function(c){return S.cart.indexOf(c)>-1});if(!items.length)return null;
   var sub=items.reduce(function(a,c){return a+c.price*c.qty},0),fee=S.ship==="delivery"?FEE:0;total+=sub+fee;
   return h("div",{class:"mk-box"},h("b",null,"Seller: "+items[0].seller_name),
    items.map(function(c){return h("div",{class:"mk-row",style:"margin:8px 0;justify-content:space-between"},h("span",{style:"flex:1;min-width:140px"},c.name+(c.max<=0?" (no longer available)":"")),h("span",null,money(c.price)),
     h("span",{class:"mk-row"},h("button",{class:"mk-btn o s",onclick:function(){c.qty=Math.max(1,c.qty-1);saveCart();renderTabs();draw()}},"−"),h("b",null,c.qty),h("button",{class:"mk-btn o s",disabled:c.qty>=c.max,onclick:function(){c.qty=Math.min(c.max,c.qty+1);saveCart();renderTabs();draw()}},"+")),
     h("b",null,money(c.price*c.qty)),h("button",{class:"mk-btn d s",onclick:function(){S.cart=S.cart.filter(function(x){return x!==c});saveCart();renderTabs();if(!S.cart.length)renderBody();else{groups[sid]=groups[sid].filter(function(x){return x!==c});draw()}}},"Remove"))}),
    h("div",{class:"mk-sub"},"Subtotal "+money(sub)+" · Shipping "+money(fee)+" · ",h("b",null,"Order total "+money(sub+fee))))});
  fill(box,parts,
   h("div",{class:"mk-box"},h("b",null,"Shipping method"),
    h("label",{style:"display:block;margin:6px 0"},h("input",{type:"radio",name:"mk-ship",checked:S.ship==="pickup",onchange:function(){S.ship="pickup";draw()}})," In-person pickup (free)"),
    h("label",{style:"display:block;margin:6px 0"},h("input",{type:"radio",name:"mk-ship",checked:S.ship==="delivery",onchange:function(){S.ship="delivery";draw()}})," Home delivery (NT$ "+FEE+" per order)")),
   h("div",{class:"mk-row",style:"justify-content:space-between"},h("b",{style:"font-size:18px"},"Total to pay: "+money(total)),
    h("button",{class:"mk-btn",disabled:!okAll,onclick:submit},"Submit order")),
   okAll?null:h("p",{class:"mk-err"},"Remove unavailable items to continue."))}
 async function submit(e){e.currentTarget.disabled=true;var r=await sb.rpc("place_order",{p_items:S.cart.map(function(c){return{product_id:c.id,quantity:c.qty}}),p_shipping:S.ship});
  if(r.error){say(friendly(r.error),true);e.currentTarget.disabled=false;return}
  S.cart=[];saveCart();setTab("orders");say(r.data.length>1?"Orders created ("+r.data.map(ordNo).join(", ")+"). The sellers have been notified.":"Order "+ordNo(r.data[0])+" created. The seller has been notified.")}
 draw();return box}

/* ---------- order rendering (one transaction, several views) ---------- */
function tracker(st){var idx=STEPS.map(function(s){return s[0]}).indexOf(st);return h("div",{class:"mk-track"},STEPS.map(function(s,i){return h("div",{class:"mk-step"+(i<=idx?" on":"")},h("span",null,i+1),s[1])}))}
function orderCard(o,opt){opt=opt||{};var items=o.order_items||[];
 var c=h("div",{class:"mk-order"},h("div",{class:"mk-oh"},h("b",null,ordNo(o.id)),h("span",{class:"mk-badge st-"+o.status},LABEL[o.status]),h("span",{class:"mk-sub"},dt(o.created_at))),
  h("div",{class:"mk-sub"},opt.view==="seller"?"Buyer: "+o.buyer_name:"Seller: "+o.seller_name),
  h("ul",{class:"mk-items"},items.map(function(i){return h("li",null,i.product_name+" × "+i.quantity+" — "+money(i.unit_price*i.quantity))})),
  h("div",null,"Subtotal "+money(o.subtotal)+" · Shipping ("+(o.shipping_method==="delivery"?"home delivery":"in-person pickup")+") "+money(o.shipping_fee)+" · ",h("b",null,"Total "+money(o.total))),
  h("div",{class:"mk-sub"},"Payment status: ",h("b",null,o.payment_status==="confirmed"?"Confirmed":"Pending")));
 if(opt.tracker)c.appendChild(tracker(o.status));
 if(opt.view==="buyer"&&o.status==="waiting_payment")c.appendChild(h("div",{class:"mk-note"},"Pay the seller using: "+(o.seller_contact||"(ask the seller)")+". The seller will confirm your payment."));
 if(opt.actions)c.appendChild(h("div",{class:"mk-row"},opt.actions));return c}
async function myOrders(done){if(!S.user)return prompt("Sign in to see your orders.");
 var r=await sb.from("orders").select("*, order_items(*)").eq("buyer_id",S.user.id).order("created_at",{ascending:false});if(r.error)throw r.error;
 var f=r.data.filter(function(o){return done?o.status==="completed":o.status!=="completed"});
 return h("div",null,h("p",{class:"mk-sub"},done?"Completed purchases stay here as your purchase history.":"Track the status of your current orders."),f.length?f.map(function(o){return orderCard(o,{view:"buyer",tracker:true})}):h("p",{class:"mk-sub"},done?"No completed purchases yet.":"You have no open orders."))}

/* ---------- Member center & seller application ---------- */
async function vMember(){if(!S.user)return prompt("Sign in to open your member center.");
 var r=await sb.from("profiles").select("*").eq("id",S.user.id).maybeSingle();var p=r.data||{};S.profile=p;
 var nm=h("input",{value:p.display_name||""}),ct=h("textarea",{placeholder:"e.g. Bank transfer: ... / LINE ID: ... (shown to buyers only after they place an order)"},p.contact_info||"");ct.value=p.contact_info||"";
 var st=p.seller_status||"none",box;
 if(st==="approved")box=h("div",{class:"mk-note"},"You are an approved seller. Switch to Seller mode to list products.");
 else if(st==="pending")box=h("div",{class:"mk-note"},"Your seller application is waiting for platform admin approval.");
 else box=h("div",null,st==="rejected"?h("p",{class:"mk-err"},"Your last application was not approved. You can update your details and apply again."):null,
  h("p",{class:"mk-sub"},"Buyers can browse and order right away. To sell, apply to become a seller: a platform admin reviews it."),
  h("button",{class:"mk-btn",onclick:async function(){var s=await sb.rpc("update_my_profile",{p_name:nm.value,p_contact:ct.value});if(s.error){say(friendly(s.error),true);return}
   var q=await sb.rpc("request_seller");if(q.error){say(friendly(q.error),true);return}say("Application sent. A platform admin will review it.");await refreshAuth();setTab("member")}},"Apply to become a seller"));
 return h("div",{class:"mk-box"},h("h3",{style:"margin-top:0"},"Member center"),h("p",{class:"mk-sub"},S.user.email),
  h("div",{class:"mk-field"},h("label",null,"Display name"),nm,h("label",null,"Payment / contact instructions (required to sell)"),ct),
  h("div",{class:"mk-row",style:"margin:12px 0"},h("button",{class:"mk-btn o",onclick:async function(){var s=await sb.rpc("update_my_profile",{p_name:nm.value,p_contact:ct.value});if(s.error)say(friendly(s.error),true);else{say("Profile saved.");refreshAuth()}}},"Save profile")),
  h("h3",null,"Seller access"),box)}

/* ---------- Seller: products, inventory, orders, dashboard ---------- */
function guardSeller(){return roles().seller?null:vMember()}
async function myProducts(){var r=await sb.from("products").select("*").eq("seller_id",S.user.id).neq("status","removed").order("created_at",{ascending:false});if(r.error)throw r.error;return r.data}
function productDlg(p){closeDlg();var isNew=!p;p=p||{};
 var f={name:h("input",{value:p.name||""}),cat:h("select",null,CATS.map(function(c){return h("option",{value:c,selected:p.category===c},c)})),desc:h("textarea",null,p.description||""),price:h("input",{type:"number",min:0,step:"0.01",value:p.price!=null?p.price:""}),qty:h("input",{type:"number",min:0,step:1,value:p.inventory!=null?p.inventory:1}),img:h("input",{type:"file",accept:"image/*"}),st:h("select",null,["listed","hidden"].map(function(s){return h("option",{value:s,selected:(p.status||"listed")===s},s==="listed"?"Listed (visible to buyers)":"Hidden")}))};
 f.desc.value=p.description||"";
 var save=h("button",{class:"mk-btn",onclick:async function(){var name=f.name.value.trim(),price=parseFloat(f.price.value),qty=parseInt(f.qty.value,10);
  if(!name||isNaN(price)||price<0||isNaN(qty)||qty<0){say("Name, a valid price and a quantity are required.",true);return}
  save.disabled=true;var row={name:name,category:f.cat.value,description:f.desc.value.trim()||null,price:price,inventory:qty,status:f.st.value};
  var file=f.img.files[0];if(file){var path=S.user.id+"/"+Date.now()+"-"+file.name.replace(/[^a-zA-Z0-9._-]/g,"_"),up=await sb.storage.from("product-images").upload(path,file);
   if(up.error){say("Image upload failed: "+up.error.message,true);save.disabled=false;return}row.image_url=sb.storage.from("product-images").getPublicUrl(path).data.publicUrl}
  var r;if(isNew){row.seller_id=S.user.id;r=await sb.from("products").insert(row)}else r=await sb.from("products").update(row).eq("id",p.id);
  save.disabled=false;if(r.error){say(friendly(r.error),true);return}closeDlg();say("Product saved.");renderBody()}},"Save product");
 openDlg(h("h3",{style:"margin-top:0"},isNew?"Add a product":"Edit product"),h("div",{class:"mk-field"},h("label",null,"Product name *"),f.name,h("label",null,"Category"),f.cat,h("label",null,"Description"),f.desc,h("label",null,"Price (NT$) *"),f.price,h("label",null,"Quantity in stock *"),f.qty,h("label",null,"Product image"),f.img,h("label",null,"Listing status"),f.st),
  h("div",{class:"mk-row",style:"margin-top:14px;justify-content:flex-end"},h("button",{class:"mk-btn o",onclick:closeDlg},"Cancel"),save))}
async function vProducts(){var g=guardSeller();if(g)return g;var list=await myProducts();
 return h("div",null,h("div",{class:"mk-row",style:"justify-content:space-between"},h("p",{class:"mk-sub",style:"margin:0"},"List products, edit them, or hide / remove a listing. Past orders keep their records."),h("button",{class:"mk-btn",onclick:function(){productDlg(null)}},"+ Add product")),
  list.length?h("div",{class:"mk-grid"},list.map(function(p){return h("div",{class:"mk-card"},thumb(p),h("div",{class:"mk-cb"},h("b",null,p.name),h("div",{class:"mk-price"},money(p.price)),h("div",{class:"mk-sub"},p.category+" · Available "+avail(p)+" of "+p.inventory),
   h("span",{class:"mk-chip "+(p.status==="listed"?"ok":"mut")},p.status==="listed"?"Listed":"Hidden"),
   h("div",{class:"mk-row"},h("button",{class:"mk-btn o s",onclick:function(){productDlg(p)}},"Edit"),
    h("button",{class:"mk-btn o s",onclick:async function(){var r=await sb.from("products").update({status:p.status==="listed"?"hidden":"listed"}).eq("id",p.id);if(r.error)say(friendly(r.error),true);else renderBody()}},p.status==="listed"?"Hide":"List again"),
    h("button",{class:"mk-btn d s",onclick:async function(){if(!confirm("Remove \""+p.name+"\" from your listings? Existing orders keep their records."))return;var r=await sb.from("products").update({status:"removed"}).eq("id",p.id);if(r.error)say(friendly(r.error),true);else renderBody()}},"Remove"))))})):h("p",{class:"mk-sub",style:"margin-top:14px"},"You have no products yet. Add your first one."))}
async function vInventory(){var g=guardSeller();if(g)return g;var list=await myProducts(),total=list.filter(function(p){return p.status==="listed"}).reduce(function(a,p){return a+avail(p)},0);
 var rows=list.map(function(p){var inp=h("input",{type:"number",min:0,value:p.inventory,class:"mk-qty"}),a=avail(p);
  return h("tr",null,h("td",null,h("b",null,p.name),h("div",{class:"mk-sub"},p.status==="listed"?"Listed":"Hidden")),h("td",null,inp),h("td",null,p.sold_qty),h("td",null,h("b",null,a)),h("td",null,a<=0?h("span",{class:"mk-chip mut"},"Out of stock"):a<=2?h("span",{class:"mk-chip warn"},"Low stock: only "+a+" left"):h("span",{class:"mk-chip ok"},"In stock")),
   h("td",null,h("button",{class:"mk-btn o s",onclick:async function(){var n=parseInt(inp.value,10);if(isNaN(n)||n<0){say("Enter a valid quantity.",true);return}var r=await sb.from("products").update({inventory:n}).eq("id",p.id);if(r.error)say(friendly(r.error),true);else{say("Stock updated for "+p.name+".");renderBody()}}},"Update stock")))});
 return h("div",null,h("div",{class:"mk-stats"},h("div",{class:"mk-stat"},"Total available stock",h("b",null,total+" items")),h("div",{class:"mk-stat"},"Products listed",h("b",null,list.filter(function(p){return p.status==="listed"}).length))),
  h("div",{class:"mk-note"},"Available stock = Current inventory − Purchased quantity. Stock drops automatically when a buyer places an order."),
  list.length?h("div",{style:"overflow-x:auto;margin-top:12px"},h("table",{class:"mk-tb"},h("thead",null,h("tr",null,["Product","Current inventory","Purchased","Available","Stock status",""].map(function(t){return h("th",null,t)}))),h("tbody",null,rows))):h("p",{class:"mk-sub"},"No products to manage yet."))}
async function sellerOrders(){var r=await sb.from("orders").select("*, order_items(*)").eq("seller_id",S.user.id).order("created_at",{ascending:false});if(r.error)throw r.error;return r.data}
async function vSellOrders(){var g=guardSeller();if(g)return g;var all=await sellerOrders();
 var sec=[["waiting_payment","Payments to confirm"],["payment_confirmed","Ready to prepare"],["ready_to_ship","Products to ship"],["shipped","Shipped: awaiting completion"]];
 return h("div",null,h("p",{class:"mk-sub"},"Orders from buyers. Move each order forward step by step. Completed orders move to your sales history."),
  sec.map(function(s){var f=all.filter(function(o){return o.status===s[0]});return h("div",null,h("h3",{style:"margin:16px 0 0"},s[1]+" ("+f.length+")"),f.length?f.map(function(o){var n=NEXT[o.status];return orderCard(o,{view:"seller",actions:h("button",{class:"mk-btn s",onclick:async function(e){e.currentTarget.disabled=true;var x=await sb.rpc("advance_order",{p_order:o.id,p_action:n[0]});if(x.error){say(friendly(x.error),true);e.currentTarget.disabled=false}else{say(ordNo(o.id)+" is now: "+LABEL[x.data]);renderBody()}}},n[1])})}):h("p",{class:"mk-sub"},"There are no orders at the moment."))}))}
async function vDashboard(){var g=guardSeller();if(g)return g;var all=await sellerOrders(),months=Array.from(new Set(all.map(function(o){return o.created_at.slice(0,7)}))).sort().reverse(),sel="all";
 var stats=h("div"),hist=h("div");
 function filtered(){return all.filter(function(o){return sel==="all"||o.created_at.slice(0,7)===sel})}
 function draw(){var f=filtered(),done=f.filter(function(o){return o.status==="completed"}),rev=done.reduce(function(a,o){return a+Number(o.total)},0),pend=all.filter(function(o){return o.status==="waiting_payment"}),ship=all.filter(function(o){return o.status==="payment_confirmed"||o.status==="ready_to_ship"});
  fill(stats,h("div",{class:"mk-stats"},st("Monthly sales revenue",money(rev),sel==="all"?"All months":sel.replace("-","/")),st("Completed orders",done.length,""),st("Pending payments",pend.length,money(pend.reduce(function(a,o){return a+Number(o.total)},0))),st("Orders waiting for shipment",ship.length,"")));
  fill(hist,h("h3",null,"Sales history"),done.length?h("div",{style:"overflow-x:auto"},h("table",{class:"mk-tb"},h("thead",null,h("tr",null,["Order ID","Order date","Buyer","Products","Total"].map(function(t){return h("th",null,t)}))),h("tbody",null,done.map(function(o){return h("tr",null,h("td",null,ordNo(o.id)),h("td",null,dt(o.created_at)),h("td",null,o.buyer_name),h("td",null,(o.order_items||[]).map(function(i){return i.product_name+" × "+i.quantity}).join(", ")),h("td",null,money(o.total)))})))):h("p",{class:"mk-sub"},"No completed sales for this period."))}
 function st(a,b,c){return h("div",{class:"mk-stat"},a,h("b",null,b),h("span",{class:"mk-sub"},c))}
 var sele=h("select",{class:"mk-in",style:"max-width:200px",onchange:function(e){sel=e.target.value;draw()}},h("option",{value:"all"},"All months"),months.map(function(m){return h("option",{value:m},m.replace("-","/"))}));
 var exp=h("button",{class:"mk-btn o",onclick:function(){var f=filtered(),head=["Order ID","Order date","Buyer","Products","Subtotal","Shipping fee","Total","Order status","Payment status","Last updated"];
  download("sales_transactions_"+sel+".csv",[head.join(",")].concat(f.map(function(o){return [ordNo(o.id),o.created_at,o.buyer_name,(o.order_items||[]).map(function(i){return i.product_name+" x"+i.quantity}).join("; "),o.subtotal,o.shipping_fee,o.total,LABEL[o.status],o.payment_status,o.updated_at].map(csvEsc).join(",")})).join("\r\n"));say("Exported "+f.length+" transaction records.")}},"Export CSV");
 draw();return h("div",null,h("div",{class:"mk-row",style:"justify-content:space-between"},h("div",{class:"mk-row"},h("b",null,"Financial report"),sele),exp),stats,hist)}

/* ---------- Platform admin: transactions & sellers ---------- */
async function vAllTx(){if(!roles().admin)return h("p",{class:"mk-err"},"Platform admins only.");
 var r=await sb.from("orders").select("*, order_items(*), order_history(*)").order("created_at",{ascending:false});if(r.error)throw r.error;var all=r.data,pr=await sb.from("profiles").select("id,email,display_name"),who={};(pr.data||[]).forEach(function(x){who[x.id]=x});
 var now=Date.now(),stalled=function(o){return o.status!=="completed"&&now-new Date(o.updated_at).getTime()>STALL_MS};
 var list=h("div"),q="",sf="";
 var amount=all.reduce(function(a,o){return a+Number(o.total)},0);
 function draw(){var f=all.filter(function(o){var n=q.replace(/\D/g,"");return(!n||String(o.id).indexOf(String(parseInt(n,10)))>-1||ordNo(o.id).toLowerCase().indexOf(q.toLowerCase())>-1)&&(!sf||(sf==="attention"?stalled(o):o.status===sf))});
  fill(list,f.length?f.map(function(o){var det=h("div",{style:"display:none;margin-top:8px"});
   var mail=function(id,name){return name+(who[id]?" ("+who[id].email+")":"")};
   fill(det,h("div",{class:"mk-sub"},"Buyer: "+mail(o.buyer_id,o.buyer_name)),h("div",{class:"mk-sub"},"Seller: "+mail(o.seller_id,o.seller_name)),h("ul",{class:"mk-items"},(o.order_items||[]).map(function(i){return h("li",null,i.product_name+" × "+i.quantity+" — "+money(i.unit_price*i.quantity))})),
    h("div",null,"Subtotal "+money(o.subtotal)+" · Shipping "+money(o.shipping_fee)+" · ",h("b",null,"Total "+money(o.total))),h("b",{style:"font-size:13px"},"Transaction history"),
    h("ul",{class:"mk-tl"},(o.order_history||[]).slice().sort(function(a,b){return a.id-b.id}).map(function(x){return h("li",null,LABEL[x.status]+" · "+dt(x.changed_at))})));
   var tgl=h("button",{class:"mk-btn o s",onclick:function(){var s=det.style.display==="none";det.style.display=s?"block":"none";tgl.textContent=s?"Hide details":"Details"}},"Details");
   return h("div",{class:"mk-order"},h("div",{class:"mk-oh"},h("b",null,ordNo(o.id)),h("span",{class:"mk-badge st-"+o.status},LABEL[o.status]),stalled(o)?h("span",{class:"mk-chip warn"},"Needs attention: no progress for "+Math.floor((now-new Date(o.updated_at).getTime())/86400000)+" days"):null,h("span",{class:"mk-sub"},dt(o.created_at))),
    h("div",{class:"mk-row",style:"justify-content:space-between"},h("span",null,o.buyer_name+" → "+o.seller_name),h("b",null,money(o.total)),tgl),det)}):h("p",{class:"mk-sub"},"No transactions match."))}
 var search=h("input",{class:"mk-in",placeholder:"Search by order ID (e.g. 12 or ORD-000012)",oninput:function(e){q=e.target.value.trim();draw()}}),
  filt=h("select",{class:"mk-in",onchange:function(e){sf=e.target.value;draw()}},h("option",{value:""},"All statuses"),STEPS.map(function(s){return h("option",{value:s[0]},LABEL[s[0]])}),h("option",{value:"attention"},"Needs attention (abnormal or incomplete)"));
 draw();return h("div",null,h("div",{class:"mk-stats"},h("div",{class:"mk-stat"},"Transactions",h("b",null,all.length)),h("div",{class:"mk-stat"},"Total transaction amount",h("b",null,money(amount))),h("div",{class:"mk-stat"},"Completed",h("b",null,all.filter(function(o){return o.status==="completed"}).length)),h("div",{class:"mk-stat"},"Need attention",h("b",null,all.filter(stalled).length))),
  h("div",{class:"mk-row"},h("div",{style:"flex:2;min-width:200px"},search),h("div",{style:"flex:1;min-width:200px"},filt)),h("div",{class:"mk-note",style:"margin-top:10px"},"Monitoring does not always mean editing: admins can review every transaction but cannot change buyer or seller orders."),list)}
async function vSellers(){if(!roles().admin)return h("p",{class:"mk-err"},"Platform admins only.");var r=await sb.from("profiles").select("*").order("created_at");if(r.error)throw r.error;var pend=r.data.filter(function(p){return p.seller_status==="pending"});
 async function review(p,ok){var x=await sb.rpc("review_seller",{p_user:p.id,p_approve:ok});if(x.error)say(friendly(x.error),true);else{say((ok?"Approved: ":"Rejected: ")+p.display_name);renderBody()}}
 return h("div",null,h("h3",{style:"margin-top:0"},"Seller applications ("+pend.length+")"),pend.length?pend.map(function(p){return h("div",{class:"mk-order"},h("b",null,p.display_name),h("div",{class:"mk-sub"},p.email),h("div",null,"Payment / contact: "+(p.contact_info||"-")),h("div",{class:"mk-row"},h("button",{class:"mk-btn s",onclick:function(){review(p,true)}},"Approve"),h("button",{class:"mk-btn d s",onclick:function(){review(p,false)}},"Reject")))}):h("p",{class:"mk-sub"},"No pending applications."),
  h("h3",null,"All users"),h("div",{style:"overflow-x:auto"},h("table",{class:"mk-tb"},h("thead",null,h("tr",null,["Name","Email","Account role","Seller status"].map(function(t){return h("th",null,t)}))),h("tbody",null,r.data.map(function(p){return h("tr",null,h("td",null,p.display_name),h("td",null,p.email),h("td",null,p.role),h("td",null,p.seller_status))})))))}

var VIEWS={browse:vBrowse,cart:vCart,orders:function(){return myOrders(false)},history:function(){return myOrders(true)},member:vMember,become:vMember,products:vProducts,inventory:vInventory,sellorders:vSellOrders,dashboard:vDashboard,alltx:vAllTx,sellers:vSellers};

/* ---------- Marketplace workflow (how the pieces connect) ---------- */
function workflow(){return h("details",{open:true,style:"margin-top:22px"},h("summary",{style:"cursor:pointer;font-weight:700;color:var(--g)"},"How the marketplace works"),
 h("div",{class:"mk-flow",style:"margin-top:10px"},h("div",null,h("b",null,"Seller"),"List product → Product database"),h("div",null,h("b",null,"Buyer"),"Browse → Cart → Order"),h("div",null,h("b",null,"Order"),"Payment → Shipment → Completion"),h("div",null,h("b",null,"Seller"),"Inventory + Sales"),h("div",null,h("b",null,"Platform admin"),"Transaction monitoring")),
 h("p",{class:"mk-sub",style:"font-style:italic"},"A digital product is not a collection of pages. It is a connected workflow."))}
})();

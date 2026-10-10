const SUPABASE_URL='https://fddmwtwaznxuludpdvcw.supabase.co';
const SUPABASE_KEY='sb_publishable_xiB4TSI8R-wNs70OV6Pa0w_MJfvpIgZ';
const sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
const app=document.getElementById('app');
let state={page:'login',user:null,profile:null,matches:[],players:[],match:null,player:null,modal:null,loading:true};
// ===== GENERAL · contexto del equipo (marca, rol, suscripción) =====
const CN=()=>state.ctx?.equipo?.nombre||'Analyst Hub';
const CS=()=>state.ctx?.equipo?.nombre_corto||'NOS';
// Funciones por club: cada una tiene un valor por defecto; el súper-admin solo toca las excepciones.
const FEATURES=[
 {k:'datos',label:'Datos y araña',desc:'Sección Datos: araña por acción, zonas y tabla por partido.',grupo:'Secciones del menú',def:true,page:'data'},
 {k:'abp',label:'ABP',desc:'Biblioteca de pelota parada propia.',grupo:'Secciones del menú',def:true,page:'abplibrary'},
 {k:'rival',label:'Análisis Rival',desc:'Equipos rivales, modelo de juego, formación y clips.',grupo:'Secciones del menú',def:true,page:'rivalanalysis'},
 {k:'individual',label:'Seguimiento individual',desc:'Fichas y material de cada jugador.',grupo:'Secciones del menú',def:true,page:'individual'},
 {k:'informes',label:'Informes',desc:'Informes generales, de partido e individuales.',grupo:'Secciones del menú',def:true,page:'reports'},
 {k:'tag_propia',label:'Botonera Tag propia',desc:'Categorías y resultados propios del club en Analyst Tag.',grupo:'Exclusivas Adaptable',def:false,adaptable:true,pronto:true},
 {k:'informe_formato',label:'Informe con formato del club',desc:'Plantilla de informe con la estructura que pide el club.',grupo:'Exclusivas Adaptable',def:false,adaptable:true,pronto:true},
 {k:'indicadores',label:'Indicadores propios',desc:'KPIs definidos por el club en la sección Datos.',grupo:'Exclusivas Adaptable',def:false,adaptable:true,pronto:true}];
const featDef=k=>FEATURES.find(f=>f.k===k);
function featOn(k,eq){const e=eq||state.ctx?.equipo||{},f=featDef(k);if(!f)return true;if(f.adaptable&&e.plan!=='adaptable')return false;const o=e.funciones||{};return Object.prototype.hasOwnProperty.call(o,k)?!!o[k]:f.def}
const pageFeat=p=>FEATURES.find(f=>f.page===p);
const crestHTML=()=>{const u=state.ctx?.equipo?.escudo_url;return u?`<img class="logo" src="${esc(u)}" alt="Escudo ${esc(CN())}">`:`<img class="logo" src="hub-icons/ah-192.png" alt="Analyst Hub">`};
const nav=[['Inicio','dashboard'],['Partidos','matches'],['Análisis del equipo','analysis'],['Datos','data'],['ABP','abplibrary'],['Análisis Rival','rivalanalysis'],['Seguimiento individual','individual'],['Informes','reports'],['Configuración','settings']];
const esc=(s='')=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const admin=()=>state.profile?.rol==='admin';
let calendarView=new Date();
// ===== V2 · helpers de interfaz =====
function fmtDate(v){if(!v)return '';const d=new Date(String(v).length===10?v+'T12:00:00':v);if(isNaN(d))return esc(v);return new Intl.DateTimeFormat('es-AR',{weekday:'short',day:'2-digit',month:'2-digit',year:'2-digit'}).format(d).replace(',','')}
function resultClass(m){const a=+m?.goles_jn,b=+m?.goles_rival;if(isNaN(a)||isNaN(b))return 'res-na';return a>b?'res-win':a<b?'res-loss':'res-draw'}
function resultLabel(m){return {"res-win":'G',"res-loss":'P',"res-draw":'E'}[resultClass(m)]||'—'}
function scoreHTML(m){return `<div class="score ${resultClass(m)}"><span class="score-badge">${resultLabel(m)}</span><b>${m?.goles_jn??'-'}</b><i>—</i><b>${m?.goles_rival??'-'}</b></div>`}
const ICONS={
 team:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7l3.5 2.5-1.3 4h-4.4l-1.3-4z"/><path d="M12 3v4M20.5 9.5l-5 0M17 19l-2.8-5.5M7 19l2.8-5.5M3.5 9.5l5 0"/></svg>',
 player:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/></svg>',
 video:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M10 9.5v5l4.5-2.5z" fill="currentColor"/></svg>',
 trophy:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8.5 20h7"/></svg>',
 menu:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>'
};
function icon(n){return `<span class="ico">${ICONS[n]||''}</span>`}
// Cancha completa horizontal (105 x 68). Ataque del equipo propio hacia la derecha.
function pitchLinesH(){return `<svg viewBox="0 0 105 68" preserveAspectRatio="none" style="position:absolute;inset:2.4%;width:95.2%;height:95.2%;pointer-events:none;overflow:visible;z-index:1" aria-hidden="true"><g fill="none" stroke="#788592" stroke-width="0.45" vector-effect="non-scaling-stroke"><rect x="0" y="0" width="105" height="68"/><line x1="52.5" y1="0" x2="52.5" y2="68"/><circle cx="52.5" cy="34" r="9.15"/><rect x="0" y="13.84" width="16.5" height="40.32"/><rect x="0" y="24.84" width="5.5" height="18.32"/><rect x="88.5" y="13.84" width="16.5" height="40.32"/><rect x="99.5" y="24.84" width="5.5" height="18.32"/><path d="M 16.5 26.69 A 9.15 9.15 0 0 1 16.5 41.31"/><path d="M 88.5 26.69 A 9.15 9.15 0 0 0 88.5 41.31"/><rect x="-2.2" y="30.34" width="2.2" height="7.32"/><rect x="105" y="30.34" width="2.2" height="7.32"/></g><g fill="#98a4af"><circle cx="52.5" cy="34" r="0.55"/><circle cx="11" cy="34" r="0.55"/><circle cx="94" cy="34" r="0.55"/></g></svg>`}
// Los puntos se siguen guardando en coordenadas de la cancha vertical (x = ancho, y = largo, ataque hacia arriba).
// Para dibujarlos en horizontal se rotan 90° en sentido horario: izquierda = 100 - y, arriba = x.
function vToH(x,y){return {l:100-(+y||0),t:+x||0}}
function hToV(l,t){return {x:t,y:100-l}}
function attackBar(){return `<div class="attack-bar"><span>Arco propio</span><i></i><b>Ataque ${esc(CS())}</b></div>`}

// ===== V1.4.9 · PIZARRA CT + PRESENCIA =====
let ctPresenceChannel=null,ctPresenceUsers=[],ctPresenceProfiles=[],ctPresenceHeartbeat=null;
const CT_ROSTER=[
 {id:'be863531-4acd-4a76-9553-f1ecd3c9e0e4',nombre:'Ramiro',cargo:'Analista'},
 {id:'6cb8279b-dce9-4463-9c2d-9012843ff597',nombre:'Bruno',cargo:'DT'},
 {id:'b46489f2-08fb-4bc1-9843-ec559af520f4',nombre:'Matías',cargo:'AC'},
 {id:'1829e2db-86ed-4db3-a7b6-a79b4731be28',nombre:'Santiago',cargo:'AC'}
];
function ctRoleLabel(p={}){return p.cargo||(p.rol==='admin'?'Analista':'CT')}
function ctInitials(n=''){return String(n).trim().split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase()||'CT'}
function formatCTDate(v){return v?new Intl.DateTimeFormat('es-AR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}).format(new Date(v)):''}
function formatCTLastSeen(v){if(!v)return 'Sin registro';const d=new Date(v),now=new Date(),same=d.toDateString()===now.toDateString();return `${same?'hoy':new Intl.DateTimeFormat('es-AR',{day:'2-digit',month:'2-digit'}).format(d)}, ${new Intl.DateTimeFormat('es-AR',{hour:'2-digit',minute:'2-digit'}).format(d)}`}
async function touchCTLastSeen(){if(!state.user)return;await sb.from('profiles').update({ultima_conexion:new Date().toISOString()}).eq('id',state.user.id)}
async function loadCTPresenceProfiles(){const ids=CT_ROSTER.map(x=>x.id);const {data}=await sb.from('profiles').select('id,nombre,ultima_conexion').in('id',ids);ctPresenceProfiles=data||[];renderCTPresence()}
function setupCTPresence(){
 if(!state.user)return;if(ctPresenceChannel){sb.removeChannel(ctPresenceChannel)}if(ctPresenceHeartbeat){clearInterval(ctPresenceHeartbeat);ctPresenceHeartbeat=null}
 touchCTLastSeen();loadCTPresenceProfiles();ctPresenceHeartbeat=setInterval(()=>{touchCTLastSeen();loadCTPresenceProfiles()},60000);
 ctPresenceChannel=sb.channel('ah-presence-'+(state.ctx?.equipo?.id||'x'),{config:{presence:{key:state.user.id}}});
 ctPresenceChannel.on('presence',{event:'sync'},()=>{const raw=ctPresenceChannel.presenceState();ctPresenceUsers=Object.values(raw).flat().reduce((a,u)=>{if(u?.user_id&&!a.some(x=>x.user_id===u.user_id))a.push(u);return a},[]);renderCTPresence()})
 .subscribe(async s=>{if(s==='SUBSCRIBED')await ctPresenceChannel.track({user_id:state.user.id,nombre:state.profile?.nombre||state.user.email||'Usuario',cargo:ctRoleLabel(state.profile||{}),online_at:new Date().toISOString()})});
}
function renderCTPresence(){const box=document.getElementById('ctPresenceBox');if(!box)return;const onlineIds=new Set(ctPresenceUsers.map(x=>x.user_id));box.innerHTML=CT_ROSTER.map(r=>{const online=onlineIds.has(r.id),p=ctPresenceProfiles.find(x=>x.id===r.id),nombre=p?.nombre||r.nombre;return `<div class="ct-online-user"><div class="ct-avatar">${esc(ctInitials(nombre))}${online?'<i></i>':''}</div><div><b>${esc(nombre)} <em>${esc(r.cargo)}</em></b><small>${online?'Conectado ahora':'Últ. conexión: '+esc(formatCTLastSeen(p?.ultima_conexion))}</small></div>${online?'<span class="ct-online-label">En línea</span>':''}</div>`}).join('')}
async function loadCTBoard(){const box=document.getElementById('ctBoardList');if(!box)return;const {data,error}=await sb.from('pizarra_ct').select('*, profiles!pizarra_ct_autor_id_fkey(nombre,cargo,rol)').order('created_at',{ascending:false}).limit(30);if(error){box.innerHTML=`<div class="empty">No se pudo cargar la pizarra: ${esc(error.message)}</div>`;return}box.innerHTML=(data||[]).length?(data||[]).map(ctNoteHTML).join(''):'<div class="ct-board-empty">Todavía no hay tareas. Escribí la primera para el cuerpo técnico.</div>'}
function ctNoteHTML(n){const p=n.profiles||{},mine=n.autor_id===state.user?.id,can=mine||admin(),lab={pendiente:'Pendiente',en_proceso:'En proceso',listo:'Listo'}[n.estado]||n.estado;return `<article class="ct-note"><div class="ct-note-head"><div class="ct-note-author"><div class="ct-avatar">${esc(ctInitials(p.nombre))}</div><div><b>${esc(p.nombre||'Integrante')}</b><small>${esc(ctRoleLabel(p))} · ${esc(formatCTDate(n.created_at))}</small></div></div><span class="ct-status status-${esc(n.estado)}">${esc(lab)}</span></div><p>${esc(n.texto)}</p>${can?`<div class="ct-note-actions"><select class="ct-status-select" onchange="updateCTNoteStatus('${n.id}',this.value)"><option value="pendiente" ${n.estado==='pendiente'?'selected':''}>Pendiente</option><option value="en_proceso" ${n.estado==='en_proceso'?'selected':''}>En proceso</option><option value="listo" ${n.estado==='listo'?'selected':''}>Listo</option></select><button class="secondary mini" onclick="editCTNote('${n.id}')">Editar</button><button class="danger mini" onclick="deleteCTNote('${n.id}')">Eliminar</button></div>`:''}</article>`}
async function createCTNote(){const i=document.getElementById('ctNoteInput'),texto=i?.value.trim();if(!texto)return alert('Escribí una tarea u observación.');const {error}=await sb.from('pizarra_ct').insert({autor_id:state.user.id,texto,estado:'pendiente'});if(error)return alert(error.message);i.value='';loadCTBoard()}
async function updateCTNoteStatus(id,estado){const {error}=await sb.from('pizarra_ct').update({estado,updated_at:new Date().toISOString()}).eq('id',id);if(error)return alert(error.message);loadCTBoard()}
async function editCTNote(id){const {data,error}=await sb.from('pizarra_ct').select('*').eq('id',id).single();if(error)return alert(error.message);const texto=prompt('Editar tarea / nota:',data.texto||'');if(texto===null||!texto.trim())return;const {error:e}=await sb.from('pizarra_ct').update({texto:texto.trim(),updated_at:new Date().toISOString()}).eq('id',id);if(e)return alert(e.message);loadCTBoard()}
async function deleteCTNote(id){if(!confirm('¿Eliminar esta tarea de la pizarra?'))return;const {error}=await sb.from('pizarra_ct').delete().eq('id',id);if(error)return alert(error.message);loadCTBoard()}

function yt(url=''){let m=String(url).match(/(?:youtu\.be\/|v=|embed\/)([\w-]{6,})/);return m?`https://www.youtube.com/embed/${m[1]}`:''}
function downloadUrl(url=''){try{const u=new URL(String(url));if(u.hostname==='www.dropbox.com'||u.hostname==='dropbox.com'){u.searchParams.set('dl','1');return u.toString()}}catch(e){}return String(url)}
function downloadAttrs(url=''){const d=downloadUrl(url);return d===String(url)?'target="_blank" rel="noopener"':`href="${esc(d)}"`}
function shell(body,active='Inicio'){const navBase=nav.filter(([n,p])=>{const f=pageFeat(p);return !f||featOn(f.k)});const navItems=state.ctx?.superadmin?[...navBase,['Súper-admin','super']]:navBase;return `<div class="shell"><aside class="side"><div class="clubbrand">${crestHTML()}<div><div class="brand">ANALYST<span>HUB</span></div><small>${esc(CN())}</small></div></div><div class="nav">${navItems.map(([n,p])=>`<button class="${active===n?'active':''}" onclick="go('${p}')">${n}</button>`).join('')}</div><div class="side-foot">Workspace privado · 2026</div></aside><main class="main"><div class="top"><button class="mnav-toggle" onclick="document.body.classList.toggle('mnav-open')" aria-label="Menú">${ICONS.menu}</button><div class="project-pill">Proyecto: <b>${esc(CN())} ${new Date().getFullYear()}</b></div><div class="user-chip"><span class="ct-avatar">${esc(ctInitials(state.profile?.nombre||state.user?.email||''))}</span><span><b>${esc(state.profile?.nombre||state.user?.email||'')}</b><small>${admin()?'Admin':'Lector'}</small></span></div></div><nav class="mnav">${nav.map(([n,p])=>`<button class="${active===n?'active':''}" onclick="document.body.classList.remove('mnav-open');go('${p}')">${n}</button>`).join('')}</nav><div class="content">${body}</div></main></div>`}
function modal(html){return `<div class="modal-bg" onclick="if(event.target===this){state.modal=null;render()}"><div class="modal">${html}</div></div>`}
async function init(){const token=new URLSearchParams(location.search).get('informe');if(token){state.loading=false;await renderPublicSharedReport(token);return}const {data:{session}}=await sb.auth.getSession();if(session){state.user=session.user;await enterApp();return}state.loading=false;render()}
async function enterApp(){await loadProfile();const g=gatePage();if(g){state.page=g;state.loading=false;render();return}await loadData();state.page='dashboard';state.loading=false;render();setupCTPresence()}
function gatePage(){const c=state.ctx||{};if(c.superadmin&&!c.equipo)return 'super';if(!c.equipo)return 'join';if(!c.activo)return 'expired';return null}
async function loadProfile(){const [{data:ctx,error:ce},{data}]=await Promise.all([sb.rpc('mi_contexto'),sb.from('profiles').select('*').eq('id',state.user.id).maybeSingle()]);if(ce)console.warn(ce);state.ctx=ctx||{};state.profile={...(data||{}),rol:state.ctx.rol||data?.rol};applyBrand()}
function applyBrand(){const c=state.ctx?.equipo?.color;if(c&&/^#[0-9a-f]{6}$/i.test(c))document.documentElement.style.setProperty('--club',c);document.title=`Analyst Hub · ${CN()}`}
async function loadData(){let [{data:m},{data:p}]=await Promise.all([sb.from('partidos').select('*').order('fecha',{ascending:false}),sb.from('jugadores').select('*').eq('activo',true).order('dorsal',{ascending:true})]);state.matches=m||[];state.players=p||[]}
async function login(){const email=document.getElementById('email').value.trim(),password=document.getElementById('password').value;setMsg('Ingresando…');const {data,error}=await sb.auth.signInWithPassword({email,password});if(error)return setMsg(authMsg(error),true);state.user=data.user;await enterApp()}
function authMsg(e){const m=String(e?.message||e);if(/Invalid login/i.test(m))return 'Email o contraseña incorrectos.';if(/Email not confirmed/i.test(m))return 'Confirmá tu email: te mandamos un link al registrarte.';if(/already registered/i.test(m))return 'Ese email ya tiene cuenta. Iniciá sesión.';if(/Password should be/i.test(m))return 'La contraseña tiene que tener al menos 6 caracteres.';return m}
async function signup(){const email=document.getElementById('email').value.trim(),password=document.getElementById('password').value;if(!email||!password)return setMsg('Completá email y contraseña.',true);setMsg('Creando cuenta…');const {data,error}=await sb.auth.signUp({email,password});if(error)return setMsg(authMsg(error),true);if(!data.session)return setMsg('Listo. Te mandamos un mail para confirmar la cuenta; después volvé e iniciá sesión.');state.user=data.user;await enterApp()}
async function joinTeam(){const codigo=document.getElementById('jcode').value.trim(),nombre=document.getElementById('jname').value.trim(),cargo=document.getElementById('jrole').value.trim();if(!codigo||!nombre)return setMsg('Completá el código y tu nombre.',true);setMsg('Uniéndote…');const {data,error}=await sb.rpc('unirse_equipo',{p_codigo:codigo,p_nombre:nombre,p_cargo:cargo});if(error)return setMsg(String(error.message).replace(/^.*?:\s*/,''),true);try{localStorage.removeItem('ah-invite')}catch(_){}await enterApp()}
async function logout(){await touchCTLastSeen();if(ctPresenceHeartbeat){clearInterval(ctPresenceHeartbeat);ctPresenceHeartbeat=null}if(ctPresenceChannel){await ctPresenceChannel.untrack();sb.removeChannel(ctPresenceChannel);ctPresenceChannel=null;ctPresenceUsers=[];ctPresenceProfiles=[]}await sb.auth.signOut();state={page:'login',user:null,profile:null,ctx:null,matches:[],players:[],match:null,player:null,modal:null,loading:false};document.documentElement.style.removeProperty('--club');render()}
function setMsg(t,bad=false){let e=document.getElementById('msg');if(e){e.textContent=t;e.style.color=bad?'#ff8d8d':''}}
function go(p){{const f=pageFeat(p);if(f&&!featOn(f.k)&&!state.ctx?.superadmin)p='dashboard'}const tip=document.getElementById('chartTip');if(tip)tip.style.opacity=0;state.page=p;state.modal=null;render();scrollTo(0,0)}
function render(){if(state.loading){app.innerHTML='<div class="login"><div class="login-card"><p>Cargando…</p></div></div>';return}if(!state.user||state.page==='login'){app.innerHTML=`<div class="login"><div class="login-card">${crestHTML()}<div class="brand">ANALYST<span>HUB</span></div><h1>${esc(CN())}</h1><p class="muted">Centro privado de videoanálisis.</p>${inviteCode()?`<div class="inv-banner"><b>Te invitaron a tu equipo.</b> Si es tu primera vez, tocá <b>Crear cuenta nueva</b> con tu mail. El código ya queda cargado.</div>`:''}<label>Email</label><input id="email" class="field" autocomplete="email"><label>Contraseña</label><input id="password" class="field" type="password" autocomplete="current-password" onkeydown="if(event.key==='Enter')login()"><button class="primary full" onclick="login()">Ingresar</button><button class="ghost full gate-alt" onclick="signup()">Crear cuenta nueva</button><p id="msg" class="muted small"></p></div></div>`;return}
if(state.page==='join'){app.innerHTML=`<div class="login"><div class="login-card">${crestHTML()}<div class="brand">ANALYST<span>HUB</span></div><h1>Unite a tu equipo</h1><p class="muted">Pedile el código de acceso al analista o administrador de tu club.</p><label>Código del equipo</label><input id="jcode" class="field" placeholder="Ej. C-1A2B3C4D" style="text-transform:uppercase" value="${esc(inviteCode())}"><label>Tu nombre</label><input id="jname" class="field" placeholder="Nombre y apellido"><label>Cargo (opcional)</label><input id="jrole" class="field" placeholder="DT, analista, PF…" onkeydown="if(event.key==='Enter')joinTeam()"><button class="primary full" onclick="joinTeam()">Entrar al equipo</button><button class="ghost full gate-alt" onclick="logout()">Salir</button><p id="msg" class="muted small"></p></div></div>`;return}
if(state.page==='expired'){app.innerHTML=`<div class="login"><div class="login-card">${crestHTML()}<div class="brand">ANALYST<span>HUB</span></div><h1>${esc(CN())}</h1><p>La suscripción de tu equipo está <b>pausada o vencida</b>.</p><p class="muted">Tus datos están guardados. Cuando se renueve vas a poder entrar de nuevo con normalidad.</p><button class="ghost full gate-alt" onclick="logout()">Salir</button></div></div>`;return}
if(state.page==='super'){renderSuper();return}
let b='';
if(state.page==='dashboard'){let m=state.matches[0];b=`<div class="eyebrow">${esc(CN().toUpperCase())} · ${new Date().getFullYear()}</div><h1 class="title">Centro de análisis</h1><p class="muted">Información concreta para el cuerpo técnico.</p><div class="grid"><div class="card" onclick="go('analysis')"><span class="tag">EQUIPO</span><h3>${icon('team')}Análisis propio</h3><p class="muted">Dónde acertamos, dónde sufrimos, goles y clips.</p></div><div class="card" onclick="go('individual')"><span class="tag">PLANTEL</span><h3>${icon('player')}Seguimiento individual</h3><p class="muted">Seguimiento y material de cada jugador.</p></div><div class="card" onclick="go('matches')"><span class="tag">VIDEO</span><h3>${icon('video')}Partidos completos</h3><p class="muted">YouTube/Drive + contexto breve.</p></div></div><div class="section ct-workspace"><div class="section-head"><div><div class="eyebrow inline-eye">TRABAJO DEL CUERPO TÉCNICO</div><h2>Pizarra del CT</h2><p class="muted small">Tareas, pedidos y observaciones rápidas para organizar el trabajo diario.</p></div></div><div class="ct-workspace-grid"><div class="panel ct-board"><div class="ct-compose"><textarea id="ctNoteInput" placeholder="Ej. Marcar situaciones de salida vs Talleres · Preparar clip de Marcos en ABP"></textarea><div class="ct-compose-foot"><span class="muted small">Publicás como <b>${esc(state.profile?.nombre||'')}</b> · ${esc(ctRoleLabel(state.profile||{}))}</span><button class="primary" onclick="createCTNote()">Publicar</button></div></div><div id="ctBoardList" class="ct-board-list"><div class="empty">Cargando pizarra…</div></div></div><aside class="panel ct-presence"><div class="ct-presence-title"><div><span class="ct-live-dot"></span><b>En línea ahora</b></div><small>Presencia en Analyst Hub</small></div><div id="ctPresenceBox" class="ct-presence-list"><div class="ct-presence-empty">Comprobando conexiones…</div></div></aside></div></div><div class="section calendar-section"><div class="calendar-toolbar"><div><div class="eyebrow inline-eye">AGENDA DEL CUERPO TÉCNICO</div><h2>Calendario</h2><p class="muted small">Partidos, análisis, seguimientos, informes y presentaciones.</p></div><div class="calendar-actions">${admin()?'<button class="primary" onclick="openCalendarForm()">+ Agregar evento</button>':''}<button class="secondary calendar-nav" onclick="changeCalendarMonth(-1)">‹</button><button class="secondary calendar-today" onclick="calendarToday()">Hoy</button><button class="secondary calendar-nav" onclick="changeCalendarMonth(1)">›</button></div></div><div id="calendarBox" class="calendar-shell"><div class="empty">Cargando calendario…</div></div></div>${m?`<div class="section"><h2>Último partido</h2><div class="match-row last-match" onclick="openTeamAnalysis('${m.id}')">${scoreHTML(m)}<div class="match-row-main"><h3>${esc(CN())} vs ${esc(m.rival)}</h3><p class="muted small">${fmtDate(m.fecha)} · ${esc(m.competicion||'—')}${m.condicion?' · '+esc(m.condicion):''}</p></div><span class="link small">Ver análisis →</span></div></div>`:''}`;app.innerHTML=shell(b,'Inicio');loadCTBoard();renderCTPresence();loadCalendar()}
else if(state.page==='matches'){b=`<div class="eyebrow">VIDEO</div><div class="toolbar"><div><h1 class="title">Partidos completos</h1><p class="muted">Archivo de partidos con video y descripción.</p></div>${admin()?'<button class="primary" onclick="state.modal=\'match\';render()">+ Agregar partido</button>':''}</div><div class="match-list">${state.matches.map(m=>`<div class="match-row">${scoreHTML(m)}<div class="match-row-main"><h3>${esc(CN())} vs ${esc(m.rival)}</h3><p class="muted small">${fmtDate(m.fecha)} · ${esc(m.competicion||'Partido')}${m.condicion?' · '+esc(m.condicion):''}</p>${m.descripcion?`<p class="match-desc">${esc(m.descripcion)}</p>`:''}</div><div class="row-actions"><button class="primary" onclick="openMatch('${m.id}')">▶ Ver partido</button>${admin()?`<button class="secondary" onclick="importNacsportXML('${m.id}')" title="Importar el XML de Analyst Tag y el link de YouTube de este partido">⬆ Importar XML</button><button class="ghost" onclick="editMatch('${m.id}')">Editar</button><button class="ghost danger-ghost" onclick="deleteMatch('${m.id}')">Eliminar</button>`:''}</div></div>`).join('')||'<div class="empty">Todavía no hay partidos.</div>'}</div>`;app.innerHTML=shell(b,'Partidos')}
else if(state.page==='fullmatch'){let m=state.matches.find(x=>x.id===state.match),embed=yt(m?.video_url);const cover=m?.portada_url?`style="background-image:linear-gradient(rgba(5,10,15,.28),rgba(5,10,15,.68)),url('${esc(m.portada_url)}');background-size:cover;background-position:center;"`:'';b=`<div class="crumb"><button class="back" onclick="go('matches')">Partidos completos</button> / ${esc(m?.rival)}</div><div class="eyebrow">PARTIDO COMPLETO</div><h1 class="title">${esc(CN())} ${m?.goles_jn} — ${m?.goles_rival} ${esc(m?.rival)}</h1><p class="muted">${esc(m?.fecha||'')} · ${esc(m?.competicion||'')}</p><div class="analysis-layout"><div class="video" ${cover}>${embed?`<iframe src="${embed}" allowfullscreen></iframe>`:`<div><div class="play">▶</div><p class="muted">${m?.video_url?'Abrir video externo':'Sin video cargado'}</p>${m?.video_url?`<div class="media-link-actions"><a class="primary" target="_blank" rel="noopener" href="${esc(m.video_url)}">▶ Ver partido</a><a class="secondary" target="_blank" rel="noopener" href="${esc(downloadUrl(m.video_url))}">↓ Descargar partido</a></div>`:''}</div>`}</div><div class="panel"><h3>Descripción</h3><p>${esc(m?.descripcion||'Sin descripción')}</p><p><b>Condición:</b> ${esc(m?.condicion||'—')}</p></div></div>`;app.innerHTML=shell(b,'Partidos')}
else if(state.page==='analysis'){b=`<div class="eyebrow">ANÁLISIS DEL EQUIPO</div><h1 class="title">Análisis propio</h1><p class="muted">Los análisis se vinculan a cada partido: aciertos, dificultades, conclusión y video.</p><div class="match-list">${state.matches.map(m=>`<div class="match-row clickable" onclick="openTeamAnalysis('${m.id}')">${scoreHTML(m)}<div class="match-row-main"><h3>vs ${esc(m.rival)}</h3><p class="muted small">${fmtDate(m.fecha)} · ${esc(m.competicion||'')}</p></div><div class="row-actions">${admin()?`<button class="secondary" onclick="event.stopPropagation();importNacsportXML('${m.id}')" title="Importar el XML de Analyst Tag y el link de YouTube de este partido">⬆ Importar XML</button>`:''}<span class="link small">Ver análisis →</span></div></div>`).join('')||'<div class="empty">Primero cargá un partido.</div>'}</div>`;app.innerHTML=shell(b,'Análisis del equipo')}
else if(state.page==='data'){renderData();return}
else if(state.page==='matchdata'){renderMatchData();return}
else if(state.page==='abplibrary'){renderABPLibrary();return}
else if(state.page==='rivalanalysis'){renderRivalCompetitions();return}
else if(state.page==='teamanalysis'){renderTeamAnalysis();return}
else if(state.page==='rivalclubs'){renderRivalClubs();return}
else if(state.page==='rivalclub'){renderRivalClubBase();return}
else if(state.page==='rivalabp'){renderRivalABP();return}
else if(state.page==='ownabp'){renderOwnABP();return}
else if(state.page==='individual'){b=`<div class="eyebrow">SEGUIMIENTO INDIVIDUAL</div><div class="toolbar"><div><h1 class="title">Plantel</h1><p class="muted">Cada jugador tiene su ficha, seguimiento y material.</p></div>${admin()?'<button class="primary" onclick="state.modal=\'player\';render()">+ Agregar jugador</button>':''}</div><div class="players">${state.players.map(p=>`<div class="player-card" onclick="openPlayer('${p.id}')"><div class="avatar">${esc(p.dorsal||'—')}</div><div><h3>${esc(p.nombre)}</h3><b>${esc(p.posicion||'')}</b><p class="muted">${esc(p.observacion_general||'Sin observaciones')}</p></div><span>→</span></div>`).join('')||'<div class="empty">Todavía no hay jugadores.</div>'}</div>`;app.innerHTML=shell(b,'Seguimiento individual')}
else if(state.page==='player'){renderPlayer();return}
else if(state.page==='reports'){b=`<div class="eyebrow">DOCUMENTOS</div><div class="toolbar"><div><h1 class="title">Informes</h1><p class="muted">Informes generales, de partido e individuales.</p></div>${admin()?'<button class="primary" onclick="state.modal=\'report\';render()">+ Agregar informe</button>':''}</div><div id="reportsBox" class="games"><div class="empty">Cargando…</div></div>`;app.innerHTML=shell(b,'Informes');loadReports()}
else if(state.page==='super'){renderSuper();return}
else {renderSettings();return}
if(state.modal==='match')app.insertAdjacentHTML('beforeend',modal(matchForm()));if(state.modal==='player')app.insertAdjacentHTML('beforeend',modal(playerForm()));if(state.modal==='report')app.insertAdjacentHTML('beforeend',modal(reportForm()));}
function matchForm(m={}){return `<h2>${m.id?'Editar':'Agregar'} partido</h2><label>Rival</label><input id="opponent" class="field" value="${esc(m.rival||'')}"><label>Fecha</label><input id="date" class="field" type="date" value="${esc(m.fecha||'')}"><label>Condición</label><select id="condition" class="field"><option>Local</option><option>Visitante</option><option>Neutral</option></select><label>Goles ${esc(CN())}</label><input id="gf" class="field" type="number" min="0" value="${m.goles_jn??0}"><label>Goles rival</label><input id="ga" class="field" type="number" min="0" value="${m.goles_rival??0}"><label>Competición</label><input id="competition" class="field" value="${esc(m.competicion||'Liga local')}"><label>Link YouTube, Drive o Dropbox</label><input id="video" class="field" value="${esc(m.video_url||'')}"><label>Portada del partido</label>${m.portada_url?`<img class="photo-preview" src="${esc(m.portada_url)}" alt="Portada actual">`:''}<input id="matchCoverFile" class="field" type="file" accept="image/jpeg,image/png,image/webp"><input id="matchCover" type="hidden" value="${esc(m.portada_url||'')}"><p class="muted small">JPG, PNG o WEBP · máximo 8 MB. Se sube automáticamente al guardar.</p><label>Descripción breve</label><textarea id="description">${esc(m.descripcion||'')}</textarea><div class="modal-actions"><button class="secondary" onclick="state.modal=null;render()">Cancelar</button><button class="primary" onclick="saveMatch('${m.id||''}')">Guardar</button></div>`}
async function saveMatch(id){
  const file=document.getElementById('matchCoverFile')?.files?.[0];
  let coverUrl=document.getElementById('matchCover')?.value?.trim()||'';
  if(file){
    if(file.size>8*1024*1024)return alert('La portada es demasiado pesada. Usá una imagen de hasta 8 MB.');
    const ext=(file.name.split('.').pop()||'jpg').toLowerCase();
    const safeExt=['jpg','jpeg','png','webp'].includes(ext)?ext:'jpg';
    const key=`${state.ctx?.equipo?.id}/${id||crypto.randomUUID()}/${Date.now()}.${safeExt}`;
    const {error:uploadError}=await sb.storage.from('partidos').upload(key,file,{cacheControl:'3600',upsert:false,contentType:file.type||undefined});
    if(uploadError)return alert('No se pudo subir la portada: '+uploadError.message);
    const {data:publicData}=sb.storage.from('partidos').getPublicUrl(key);
    coverUrl=publicData.publicUrl;
  }
  let row={rival:opponent.value,fecha:date.value||null,condicion:condition.value,goles_jn:+gf.value||0,goles_rival:+ga.value||0,competicion:competition.value,video_url:video.value,portada_url:coverUrl,descripcion:description.value,publicado:true};
  let q=id?sb.from('partidos').update(row).eq('id',id):sb.from('partidos').insert(row);
  let {error}=await q;if(error)return alert(error.message);
  state.modal=null;await loadData();render();
}
function editMatch(id){let m=state.matches.find(x=>x.id===id);state.modal='match';render();document.querySelector('.modal').innerHTML=matchForm(m);document.getElementById('condition').value=m.condicion||'Local'}
async function deleteMatch(id){
  if(!admin()) return;
  const m=state.matches.find(x=>x.id===id);
  if(!m) return alert('No se encontró el partido.');
  if(!confirm(`¿Eliminar el partido vs ${m.rival}? Esta acción también eliminará la información asociada y no se puede deshacer.`)) return;

  const {error}=await sb.from('partidos').delete().eq('id',id);
  if(error) return alert('No se pudo eliminar el partido: '+error.message);

  if(state.match===id) state.match=null;
  await loadData();
  state.page='matches';
  render();
}
function openMatch(id){state.match=id;go('fullmatch')}
function playerForm(p={}){return `<h2>${p.id?'Editar':'Agregar'} jugador</h2><label>Dorsal</label><input id="num" class="field" type="number" value="${esc(p.dorsal||'')}"><label>Nombre</label><input id="pname" class="field" value="${esc(p.nombre||'')}"><label>Posición</label><input id="pos" class="field" value="${esc(p.posicion||'')}"><label>Foto del jugador</label>${p.foto_url?`<img class="photo-preview" src="${esc(p.foto_url)}" alt="Foto actual">`:''}<input id="photoFile" class="field" type="file" accept="image/jpeg,image/png,image/webp"><input id="photo" type="hidden" value="${esc(p.foto_url||'')}"><p class="muted small">JPG, PNG o WEBP. La foto se sube automáticamente al guardar.</p><label>Observación general</label><textarea id="summary">${esc(p.observacion_general||'')}</textarea><label>Fortalezas</label><textarea id="strengths">${esc(p.fortalezas||'')}</textarea><label>Aspectos a mejorar</label><textarea id="improve">${esc(p.aspectos_mejorar||'')}</textarea><label>Evolución</label><textarea id="evolution">${esc(p.evolucion||'')}</textarea><div class="modal-actions">${p.id?`<button class="danger" onclick="deletePlayer('${p.id}')">Eliminar jugador</button>`:''}<button class="secondary" onclick="if(document.getElementById('playerEditModal'))document.getElementById('playerEditModal').remove();else{state.modal=null;render()}">Cancelar</button><button class="primary" onclick="savePlayer('${p.id||''}')">Guardar</button></div>`}
async function savePlayer(id){
  const file=document.getElementById('photoFile')?.files?.[0];
  let photoUrl=document.getElementById('photo')?.value?.trim()||'';
  if(file){
    if(file.size>5*1024*1024)return alert('La foto es demasiado pesada. Usá una imagen de hasta 5 MB.');
    const ext=(file.name.split('.').pop()||'jpg').toLowerCase();
    const safeExt=['jpg','jpeg','png','webp'].includes(ext)?ext:'jpg';
    const key=`${state.ctx?.equipo?.id}/${id||crypto.randomUUID()}/${Date.now()}.${safeExt}`;
    const {error:uploadError}=await sb.storage.from('jugadores').upload(key,file,{cacheControl:'3600',upsert:false,contentType:file.type||undefined});
    if(uploadError)return alert('No se pudo subir la foto: '+uploadError.message);
    const {data:publicData}=sb.storage.from('jugadores').getPublicUrl(key);
    photoUrl=publicData.publicUrl;
  }
  let row={dorsal:+num.value||null,nombre:pname.value,posicion:pos.value,foto_url:photoUrl,observacion_general:summary.value,fortalezas:strengths.value,aspectos_mejorar:improve.value,evolucion:evolution.value,activo:true};
  let q=id?sb.from('jugadores').update(row).eq('id',id):sb.from('jugadores').insert(row);let {error}=await q;if(error)return alert(error.message);
  document.getElementById('playerEditModal')?.remove();state.modal=null;await loadData();if(id){state.player=id;await renderPlayer()}else render();
}
function openPlayer(id){state.player=id;go('player')}
function editPlayer(id){
  const p=state.players.find(x=>x.id===id);
  if(!p)return alert('No se encontró el jugador.');
  document.getElementById('playerEditModal')?.remove();
  app.insertAdjacentHTML('beforeend',`<div id="playerEditModal" class="modal-bg" onclick="if(event.target===this)this.remove()"><div class="modal">${playerForm(p)}</div></div>`);
}
async function deletePlayer(id){
  if(!admin())return;
  const p=state.players.find(x=>x.id===id);
  if(!p||!confirm(`¿Eliminar a ${p.nombre}? Esta acción no se puede deshacer.`))return;
  const {error}=await sb.from('jugadores').delete().eq('id',id);
  if(error)return alert('No se pudo eliminar el jugador: '+error.message);
  state.modal=null;state.player=null;await loadData();go('individual');
}
async function renderPlayer(){
  let p=state.players.find(x=>x.id===state.player);if(!p){go('individual');return}
  const [{data:v},{data:s},{data:shares}] = await Promise.all([
    sb.from('videos_jugador').select('*').eq('jugador_id',p.id).order('created_at',{ascending:false}),
    sb.from('seguimiento_individual').select('*').eq('jugador_id',p.id).order('fecha',{ascending:false}),
    admin()?sb.from('informes_compartidos').select('*').eq('jugador_id',p.id).eq('tipo','individual').order('created_at',{ascending:false}):Promise.resolve({data:[]})
  ]);
  const avatar=p.foto_url?`<img class="player-photo" src="${esc(p.foto_url)}" alt="${esc(p.nombre)}" onerror="this.style.display='none';this.nextElementSibling.style.display='grid'"><div class="avatar big photo-fallback" style="display:none">${esc(p.dorsal||'—')}</div>`:`<div class="avatar big">${esc(p.dorsal||'—')}</div>`;
  let b=`<div class="crumb"><button class="back" onclick="go('individual')">Plantel</button> / ${esc(p.nombre)}</div>
  <div class="player-head">${avatar}<div><div class="eyebrow">SEGUIMIENTO INDIVIDUAL</div><h1 class="title">${esc(p.nombre)}</h1><p class="muted">${esc(p.posicion||'')} · ${esc(CN())}</p></div></div>
  <div class="player-detail">
    <div class="panel"><h3>Ficha general</h3><label>Fortalezas</label><div class="note-box">${esc(p.fortalezas||'Sin cargar')}</div><label>Aspectos a mejorar</label><div class="note-box">${esc(p.aspectos_mejorar||'Sin cargar')}</div><label>Evolución</label><div class="note-box">${esc(p.evolucion||'Sin cargar')}</div>${admin()?`<div class="actions"><button class="primary" onclick="editPlayer('${p.id}')">Editar ficha</button></div>`:''}</div>
    <div class="panel"><h3>Videos generales</h3>${(v||[]).map(x=>`<div class="material-row"><div class="analysis-video-info"><b>${esc(x.titulo)}</b><p class="muted small">Material general · Dropbox</p></div><div class="actions compact-actions"><a class="secondary" target="_blank" rel="noopener" href="${esc(x.video_url)}">▶ Ver</a><a class="secondary" target="_blank" rel="noopener" href="${esc(downloadUrl(x.video_url))}">↓ Descargar</a>${admin()?`<button class="secondary" onclick="editPlayerVideo('${x.id}','${p.id}')">Editar</button><button class="danger" onclick="deletePlayerVideo('${x.id}','${p.id}')">Eliminar</button>`:''}</div></div>`).join('')||'<p class="muted">Sin videos generales.</p>'}${admin()?`<button class="material" onclick="addPlayerVideo('${p.id}')">＋ Agregar video</button>`:''}</div>
  </div>
  <div class="section"><div class="section-head"><div><div class="eyebrow inline-eye">INFORMES INDIVIDUALES</div><h2>Seguimientos por partido</h2><p class="muted small">Cada seguimiento reúne resumen, aspectos positivos, aspectos a mejorar y clips de Dropbox.</p></div>${admin()?`<button class="primary" onclick="addTracking('${p.id}')">+ Nuevo seguimiento</button>`:''}</div>${(s||[]).map(x=>trackingCardHTML(x,p)).join('')||'<div class="empty">Todavía no hay seguimientos.</div>'}</div>
  ${admin()?`<div class="section"><h2>Informes compartidos</h2>${(shares||[]).map(x=>shareAdminCard(x)).join('')||'<div class="empty">Todavía no generaste enlaces para este jugador.</div>'}</div>`:''}`;
  app.innerHTML=shell(b,'Seguimiento individual');
}

function trackingCardHTML(x,p){
  const m=state.matches.find(y=>y.id===x.partido_id);
  const subtitle=m?`vs ${esc(m.rival)}${m.fecha?' · '+esc(m.fecha):''}`:esc(x.fecha||'');
  return `<div class="panel tracking-card"><div class="analysis-card-head"><div><span class="pill">INFORME INDIVIDUAL</span><h3>${esc(x.titulo||'Seguimiento')}</h3><p class="muted">${subtitle}</p></div><div class="actions compact-actions"><button class="secondary" onclick="openTracking('${x.id}','${p.id}')">Abrir informe</button>${admin()?`<button class="secondary" onclick="editTracking('${x.id}','${p.id}')">Editar</button><button class="secondary" onclick="openShareTracking('${x.id}','${p.id}')">↗ Compartir</button><button class="danger" onclick="deleteTracking('${x.id}','${p.id}')">Eliminar</button>`:''}</div></div><p>${esc(x.observacion||'Sin resumen cargado.')}</p></div>`;
}

async function addPlayerVideo(pid){let titulo=prompt('Título del video:');if(!titulo)return;let url=prompt('Pegá el enlace de Dropbox:');if(!url)return;let {error}=await sb.from('videos_jugador').insert({jugador_id:pid,titulo,video_url:url});if(error)alert(error.message);else renderPlayer()}
async function editPlayerVideo(id,pid){const {data,error}=await sb.from('videos_jugador').select('*').eq('id',id).single();if(error)return alert(error.message);let titulo=prompt('Título del video:',data.titulo||'');if(titulo===null||!titulo.trim())return;let url=prompt('Enlace de Dropbox:',data.video_url||'');if(url===null)return;const {error:e}=await sb.from('videos_jugador').update({titulo:titulo.trim(),video_url:url.trim()}).eq('id',id);if(e)alert(e.message);else renderPlayer()}
async function deletePlayerVideo(id,pid){if(!confirm('¿Eliminar este video de la ficha? El archivo de Dropbox no se borra.'))return;const {error}=await sb.from('videos_jugador').delete().eq('id',id);if(error)alert(error.message);else renderPlayer()}

function trackingForm(t={},pid=''){
  const options=['<option value="">Sin vincular a partido</option>',...state.matches.map(m=>`<option value="${m.id}" ${t.partido_id===m.id?'selected':''}>${esc(m.fecha||'')} · vs ${esc(m.rival)}</option>`)].join('');
  return `<div class="eyebrow inline-eye">INFORME INDIVIDUAL</div><h2>${t.id?'Editar':'Nuevo'} seguimiento</h2><label>Partido</label><select id="trackingMatch" class="field">${options}</select><label>Título</label><input id="trackingTitle" class="field" value="${esc(t.titulo||'')}" placeholder="Ej. Informe individual · vs Talleres"><label>Fecha</label><input id="trackingDate" class="field" type="date" value="${esc(t.fecha||new Date().toISOString().slice(0,10))}"><label>Resumen del partido</label><textarea id="trackingSummary">${esc(t.observacion||'')}</textarea><label>Aspectos positivos</label><textarea id="trackingPositive">${esc(t.aspectos_positivos||'')}</textarea><label>Aspectos a mejorar</label><textarea id="trackingImprove">${esc(t.aspectos_mejorar||'')}</textarea><div class="modal-actions"><button class="secondary" onclick="document.getElementById('trackingModal')?.remove()">Cancelar</button><button class="primary" onclick="saveTracking('${t.id||''}','${pid}')">Guardar</button></div>`;
}
function addTracking(pid){document.getElementById('trackingModal')?.remove();app.insertAdjacentHTML('beforeend',`<div id="trackingModal" class="modal-bg" onclick="if(event.target===this)this.remove()"><div class="modal">${trackingForm({},pid)}</div></div>`)}
async function editTracking(id,pid){const {data,error}=await sb.from('seguimiento_individual').select('*').eq('id',id).single();if(error)return alert(error.message);document.getElementById('trackingModal')?.remove();app.insertAdjacentHTML('beforeend',`<div id="trackingModal" class="modal-bg" onclick="if(event.target===this)this.remove()"><div class="modal">${trackingForm(data,pid)}</div></div>`)}
async function saveTracking(id,pid){
  const row={jugador_id:pid,partido_id:trackingMatch.value||null,titulo:trackingTitle.value.trim(),fecha:trackingDate.value||null,observacion:trackingSummary.value.trim(),aspectos_positivos:trackingPositive.value.trim(),aspectos_mejorar:trackingImprove.value.trim()};
  if(!row.titulo)return alert('Completá el título del seguimiento.');
  const q=id?sb.from('seguimiento_individual').update(row).eq('id',id):sb.from('seguimiento_individual').insert(row);const {error}=await q;if(error)return alert(error.message);document.getElementById('trackingModal')?.remove();renderPlayer();
}
async function deleteTracking(id,pid){if(!confirm('¿Eliminar este seguimiento y sus clips?'))return;const {error}=await sb.from('seguimiento_individual').delete().eq('id',id);if(error)alert(error.message);else renderPlayer()}

async function openTracking(id,pid){
  const [{data:t,error},{data:clips}]=await Promise.all([sb.from('seguimiento_individual').select('*').eq('id',id).single(),sb.from('clips_seguimiento').select('*').eq('seguimiento_id',id).order('posicion',{ascending:true})]);
  if(error||!t)return alert(error?.message||'No se encontró el seguimiento.');
  const p=state.players.find(x=>x.id===pid),m=state.matches.find(x=>x.id===t.partido_id);
  const clipCards=(clips||[]).map(c=>`<div class="analysis-video-card"><div class="analysis-video-index">${String(c.posicion).padStart(2,'0')}</div><div class="analysis-video-info"><span class="pill">SITUACIÓN</span><h3>${esc(c.titulo)}</h3><p class="muted">Clip individual · Dropbox</p></div><div class="analysis-video-actions"><a class="primary" href="${esc(c.video_url)}" target="_blank" rel="noopener">▶ Ver video</a><a class="secondary" href="${esc(downloadUrl(c.video_url))}" target="_blank" rel="noopener">↓ Descargar</a>${admin()?`<button class="secondary" onclick="editTrackingClip('${c.id}','${id}','${pid}')">Editar</button><button class="danger" onclick="deleteTrackingClip('${c.id}','${id}','${pid}')">Eliminar</button>`:''}</div></div>`).join('');
  const html=`<div id="trackingDetailModal" class="modal-bg" onclick="if(event.target===this)this.remove()"><div class="modal tracking-report-modal"><div class="eyebrow inline-eye">INFORME INDIVIDUAL · PARTIDO</div><h2>${esc(p?.nombre||'Jugador')}</h2><p class="muted">${m?`vs ${esc(m.rival)} · ${esc(m.fecha||t.fecha||'')}`:esc(t.fecha||'')}</p><h3>${esc(t.titulo||'Seguimiento')}</h3><label>Resumen</label><div class="note-box">${esc(t.observacion||'Sin cargar')}</div><label>✓ Aspectos positivos</label><div class="note-box">${esc(t.aspectos_positivos||'Sin cargar')}</div><label>! Aspectos a mejorar</label><div class="note-box">${esc(t.aspectos_mejorar||'Sin cargar')}</div><div class="section"><div class="section-head"><div><h3>Situaciones / Clips</h3><p class="muted small">Videos alojados en Dropbox.</p></div>${admin()&&(clips||[]).length<10?`<button class="primary" onclick="addTrackingClip('${id}','${pid}')">+ Agregar clip</button>`:''}</div><div class="analysis-video-list">${clipCards||'<div class="empty">Todavía no hay clips en este seguimiento.</div>'}</div></div><div class="modal-actions">${admin()?`<button class="primary" onclick="openShareTracking('${id}','${pid}')">↗ Compartir informe</button>`:''}<button class="secondary" onclick="document.getElementById('trackingDetailModal').remove()">Cerrar</button></div></div></div>`;
  document.getElementById('trackingDetailModal')?.remove();app.insertAdjacentHTML('beforeend',html);
}
async function addTrackingClip(tid,pid){
  const {data:current,error}=await sb.from('clips_seguimiento').select('posicion').eq('seguimiento_id',tid).order('posicion');if(error)return alert(error.message);if((current||[]).length>=10)return alert('Este seguimiento ya tiene 10 clips.');const used=new Set((current||[]).map(x=>x.posicion));let posicion=1;while(used.has(posicion)&&posicion<=10)posicion++;let titulo=prompt('Título del clip:');if(titulo===null||!titulo.trim())return;let video_url=prompt('Pegá el enlace de Dropbox:');if(video_url===null||!video_url.trim())return;const {error:e}=await sb.from('clips_seguimiento').insert({seguimiento_id:tid,titulo:titulo.trim(),video_url:video_url.trim(),posicion});if(e)return alert(e.message);document.getElementById('trackingDetailModal')?.remove();openTracking(tid,pid);
}
async function editTrackingClip(cid,tid,pid){const {data,error}=await sb.from('clips_seguimiento').select('*').eq('id',cid).single();if(error)return alert(error.message);let titulo=prompt('Título del clip:',data.titulo||'');if(titulo===null||!titulo.trim())return;let video_url=prompt('Enlace de Dropbox:',data.video_url||'');if(video_url===null||!video_url.trim())return;const {error:e}=await sb.from('clips_seguimiento').update({titulo:titulo.trim(),video_url:video_url.trim(),updated_at:new Date().toISOString()}).eq('id',cid);if(e)return alert(e.message);document.getElementById('trackingDetailModal')?.remove();openTracking(tid,pid)}
async function deleteTrackingClip(cid,tid,pid){if(!confirm('¿Eliminar este clip del seguimiento? El archivo de Dropbox no se borra.'))return;const {error}=await sb.from('clips_seguimiento').delete().eq('id',cid);if(error)return alert(error.message);document.getElementById('trackingDetailModal')?.remove();openTracking(tid,pid)}

async function openShareTracking(tid,pid){
  if(!admin())return;const p=state.players.find(x=>x.id===pid);const [{data:t,error},{data:clips}]=await Promise.all([sb.from('seguimiento_individual').select('*').eq('id',tid).single(),sb.from('clips_seguimiento').select('*').eq('seguimiento_id',tid).order('posicion')]);if(error||!t)return alert(error?.message||'No se encontró el seguimiento.');const m=state.matches.find(x=>x.id===t.partido_id);document.getElementById('shareTrackingModal')?.remove();const subtitle=m?`vs ${m.rival} · ${m.fecha||t.fecha||''}`:(t.fecha||'');const html=`<div id="shareTrackingModal" class="modal-bg" onclick="if(event.target===this)this.remove()"><div class="modal"><div class="eyebrow inline-eye">COMPARTIR INFORME DEL PARTIDO</div><h2>${esc(p?.nombre||'Jugador')}</h2><p class="muted small">Se genera una copia privada de este seguimiento para enviar al jugador.</p><label>Título</label><input id="trackingShareTitle" class="field" value="${esc(t.titulo||`Informe individual · ${p?.nombre||''}`)}"><label>Subtítulo</label><input id="trackingShareSubtitle" class="field" value="${esc(subtitle)}"><div class="share-checks"><label><input id="trackingShowSummary" type="checkbox" checked> Resumen</label><label><input id="trackingShowPositive" type="checkbox" checked> Aspectos positivos</label><label><input id="trackingShowImprove" type="checkbox" checked> Aspectos a mejorar</label><label><input id="trackingShowClips" type="checkbox" checked> Situaciones / clips (${(clips||[]).length})</label></div><label>PDF (opcional)</label><input id="trackingSharePdf" class="field" placeholder="Link público al PDF"><div class="modal-actions"><button class="secondary" onclick="document.getElementById('shareTrackingModal').remove()">Cancelar</button><button class="primary" onclick="createSharedTracking('${tid}','${pid}')">Generar enlace</button></div></div></div>`;app.insertAdjacentHTML('beforeend',html);
}
async function createSharedTracking(tid,pid){
  const p=state.players.find(x=>x.id===pid);const [{data:t,error},{data:clips}]=await Promise.all([sb.from('seguimiento_individual').select('*').eq('id',tid).single(),sb.from('clips_seguimiento').select('*').eq('seguimiento_id',tid).order('posicion')]);if(error||!t)return alert(error?.message||'No se encontró el seguimiento.');const content={jugador:{nombre:p?.nombre||'',dorsal:p?.dorsal,posicion:p?.posicion||'',foto_url:p?.foto_url||''},resumen:trackingShowSummary.checked?(t.observacion||''):'',positivos:trackingShowPositive.checked?(t.aspectos_positivos||''):'',mejoras:trackingShowImprove.checked?(t.aspectos_mejorar||''):'',situaciones:[],videos:trackingShowClips.checked?(clips||[]).map(x=>({titulo:x.titulo,url:x.video_url})):[]};const row={tipo:'individual',jugador_id:pid,partido_id:t.partido_id||null,titulo:trackingShareTitle.value.trim()||`Informe individual · ${p?.nombre||''}`,subtitulo:trackingShareSubtitle.value.trim(),contenido:content,pdf_url:trackingSharePdf.value.trim()||null,activo:true};const {data,error:e}=await sb.from('informes_compartidos').insert(row).select('token').single();if(e)return alert(e.message);document.getElementById('shareTrackingModal')?.remove();document.getElementById('trackingDetailModal')?.remove();await renderPlayer();const link=`${location.origin}${location.pathname}?informe=${data.token}`;await copyShareLink(link);
}

function shareAdminCard(x){
  const link=`${location.origin}${location.pathname}?informe=${x.token}`;
  return `<div class="panel shared-admin-card"><div><span class="pill">${x.activo?'ACTIVO':'DESACTIVADO'}</span><h3>${esc(x.titulo)}</h3><p class="muted small">${new Date(x.created_at).toLocaleDateString('es-AR')}</p></div><div class="actions"><button class="secondary" onclick="copyShareLink('${esc(link)}')">Copiar enlace</button><button class="secondary" onclick="window.open('${esc(link)}','_blank')">Vista previa</button><button class="secondary" onclick="shareWhatsApp('${esc(link)}','${esc(x.titulo)}')">WhatsApp</button><button class="secondary" onclick="toggleShare('${x.id}',${!x.activo})">${x.activo?'Desactivar':'Reactivar'}</button><button class="danger" onclick="deleteSharedReport('${x.id}')">Eliminar</button></div></div>`;
}
async function copyShareLink(link){try{await navigator.clipboard.writeText(link);alert('Enlace copiado.')}catch{prompt('Copiá este enlace:',link)}}
function shareWhatsApp(link,title){window.open(`https://wa.me/?text=${encodeURIComponent('Te comparto tu informe de videoanálisis: '+title+'\n'+link)}`,'_blank')}
async function toggleShare(id,value){const {error}=await sb.from('informes_compartidos').update({activo:value,updated_at:new Date().toISOString()}).eq('id',id);if(error)alert(error.message);else renderPlayer()}
async function deleteSharedReport(id){if(!confirm('¿Eliminar definitivamente este informe compartido?'))return;const {error}=await sb.from('informes_compartidos').delete().eq('id',id);if(error)alert(error.message);else renderPlayer()}

async function openTeamAnalysis(mid){state.match=mid;state.page='teamanalysis';renderTeamAnalysis()}
async function renderTeamAnalysis(){
  let m=state.matches.find(x=>x.id===state.match);
  if(!m){go('analysis');return}
  const [{data:a},{data:f},{data:maps},{data:analysisVideos}] = await Promise.all([
    sb.from('analisis_equipo').select('*').eq('partido_id',m.id).order('created_at',{ascending:false}),
    sb.from('formaciones').select('*').eq('partido_id',m.id).maybeSingle(),
    sb.from('mapas_tacticos').select('*').eq('partido_id',m.id).order('tipo').order('posicion'),
    sb.from('videos_analisis_equipo').select('*').eq('partido_id',m.id).order('posicion',{ascending:true})
  ]);
  let mapList=maps||[];
  if(admin() && mapList.length<4){
    await ensureTacticalMaps(m.id,mapList);
    const {data:fresh}=await sb.from('mapas_tacticos').select('*').eq('partido_id',m.id).order('tipo').order('posicion');
    mapList=fresh||[];
  }
  let markers=[];
  if(mapList.length){
    const {data:mk}=await sb.from('marcadores_tacticos').select('*').in('mapa_id',mapList.map(x=>x.id)).order('created_at',{ascending:true});
    markers=mk||[];
  }
  state.tactical={formation:f||null,maps:mapList,markers};
  let analyses=(a||[]).map(x=>`<div class="panel analysis-card"><div class="analysis-card-head"><div><span class="pill">${esc(x.categoria||'Análisis')}</span><h3>${esc(x.titulo)}</h3></div>${admin()?`<div class="actions compact-actions"><button class="secondary" onclick="editTeamAnalysis('${x.id}')">✏ Editar</button><button class="danger" onclick="deleteTeamAnalysis('${x.id}')">Eliminar</button></div>`:''}</div>${x.descripcion?`<p>${esc(x.descripcion)}</p>`:''}<label>✓ Aciertos</label><div class="note-box">${esc(x.aciertos||'—')}</div><label>! Dificultades</label><div class="note-box">${esc(x.dificultades||'—')}</div><label>Conclusión</label><div class="note-box">${esc(x.conclusion||'—')}</div>${x.video_url?`<a class="material link" target="_blank" rel="noopener" href="${esc(x.video_url)}">▶ Abrir video</a>`:''}</div>`).join('')||'<div class="empty">Todavía no hay análisis cargados.</div>';
  let b=`<div class="crumb"><button class="back" onclick="go('analysis')">Análisis del equipo</button> / ${esc(m.rival)}</div><div class="page-head"><div class="page-head-main">${scoreHTML(m)}<div><div class="eyebrow inline-eye">POST PARTIDO · ${fmtDate(m.fecha)}</div><h1 class="title">${esc(CN())} vs ${esc(m.rival)}</h1></div></div>${admin()?`<div class="actions compact-actions"><button class="primary" onclick="addTeamAnalysis('${m.id}')">+ Agregar análisis</button></div>`:''}</div><div class="ta-split"><aside class="ta-formation">${formationHTML(f,m.id)}</aside><div class="ta-written"><div class="sec-title"><h2>Análisis escrito</h2></div>${analyses}</div></div>${tacticalMapsHTML(mapList,markers,m.id)}${matchDataEntryHTML(m.id)}${ownABPEntryHTML(m.id)}${analysisVideosHTML(analysisVideos||[],m.id)}`;
  app.innerHTML=shell(b,'Análisis del equipo');
  loadMatchData(m.id);
  loadABPStrip(m.id);
  enableFormationDrag();
}
function analysisDataFromPrompts(base={}){
  let titulo=prompt('Título del análisis:',base.titulo||'');if(titulo===null||!titulo.trim())return null;
  let categoria=prompt('Categoría (ej. Presión, Ataque, Defensa, ABP):',base.categoria||'')??base.categoria??'';
  let descripcion=prompt('Descripción breve (opcional):',base.descripcion||'')??base.descripcion??'';
  let aciertos=prompt('¿Qué hicimos bien?',base.aciertos||'')??base.aciertos??'';
  let dificultades=prompt('¿Dónde sufrimos?',base.dificultades||'')??base.dificultades??'';
  let conclusion=prompt('Conclusión breve:',base.conclusion||'')??base.conclusion??'';
  return {titulo:titulo.trim(),categoria,descripcion,aciertos,dificultades,conclusion,publicado:true};
}
async function addTeamAnalysis(mid){let row=analysisDataFromPrompts();if(!row)return;row.partido_id=mid;let {error}=await sb.from('analisis_equipo').insert(row);if(error)alert(error.message);else renderTeamAnalysis()}
async function editTeamAnalysis(id){const {data,error}=await sb.from('analisis_equipo').select('*').eq('id',id).single();if(error)return alert(error.message);let row=analysisDataFromPrompts(data);if(!row)return;let {error:e}=await sb.from('analisis_equipo').update(row).eq('id',id);if(e)alert(e.message);else renderTeamAnalysis()}
async function deleteTeamAnalysis(id){if(!confirm('¿Eliminar este análisis? Esta acción no se puede deshacer.'))return;let {error}=await sb.from('analisis_equipo').delete().eq('id',id);if(error)alert(error.message);else renderTeamAnalysis()}


function analysisVideosHTML(videos,mid){
  const cards=videos.map(v=>`<div class="analysis-video-card"><div class="analysis-video-index">${String(v.posicion).padStart(2,'0')}</div><div class="analysis-video-info"><span class="pill">VIDEO ${v.posicion}</span><h3>${esc(v.titulo)}</h3><p class="muted">Clip del análisis · Dropbox</p></div><div class="analysis-video-actions"><a class="primary video-open-btn" href="${esc(v.video_url)}" target="_blank" rel="noopener">▶ Ver video</a><a class="secondary video-download-btn" href="${esc(downloadUrl(v.video_url))}" target="_blank" rel="noopener">↓ Descargar</a>${admin()?`<button class="secondary" onclick="editAnalysisVideo('${v.id}')">Editar</button><button class="danger" onclick="deleteAnalysisVideo('${v.id}')">Eliminar</button>`:''}</div></div>`).join('');
  const canAdd=admin()&&videos.length<6;
  return `<div class="section analysis-videos-section"><div class="section-head"><div><div class="eyebrow inline-eye">MATERIAL AUDIOVISUAL</div><h2>Videos del análisis</h2><p class="muted">Clips finales del partido. Máximo 6 videos.</p></div>${canAdd?`<button class="primary" onclick="addAnalysisVideo('${mid}')">+ Agregar video</button>`:''}</div><div class="analysis-video-list">${cards||'<div class="empty">Todavía no hay videos cargados para este análisis.</div>'}</div>${admin()&&videos.length>=6?'<p class="muted small analysis-video-limit">Ya están ocupados los 6 espacios disponibles.</p>':''}</div>`;
}
async function addAnalysisVideo(mid){
  const {data:current,error:loadError}=await sb.from('videos_analisis_equipo').select('posicion').eq('partido_id',mid).order('posicion');
  if(loadError)return alert(loadError.message);
  if((current||[]).length>=6)return alert('Este partido ya tiene los 6 videos cargados.');
  const used=new Set((current||[]).map(x=>x.posicion));
  let posicion=1;while(used.has(posicion)&&posicion<=6)posicion++;
  let titulo=prompt('Título del video (ej. Transiciones DEF → ATAQ):');if(titulo===null||!titulo.trim())return;
  let video_url=prompt('Pegá el enlace de Dropbox:');if(video_url===null||!video_url.trim())return;
  const {error}=await sb.from('videos_analisis_equipo').insert({partido_id:mid,titulo:titulo.trim(),video_url:video_url.trim(),posicion});
  if(error)alert(error.message);else renderTeamAnalysis();
}
async function editAnalysisVideo(id){
  const {data,error}=await sb.from('videos_analisis_equipo').select('*').eq('id',id).single();
  if(error)return alert(error.message);
  let titulo=prompt('Título del video:',data.titulo||'');if(titulo===null||!titulo.trim())return;
  let video_url=prompt('Enlace de Dropbox:',data.video_url||'');if(video_url===null||!video_url.trim())return;
  const {error:e}=await sb.from('videos_analisis_equipo').update({titulo:titulo.trim(),video_url:video_url.trim(),updated_at:new Date().toISOString()}).eq('id',id);
  if(e)alert(e.message);else renderTeamAnalysis();
}
async function deleteAnalysisVideo(id){
  if(!confirm('¿Eliminar este video del análisis? El archivo de Dropbox no se borra.'))return;
  const {error}=await sb.from('videos_analisis_equipo').delete().eq('id',id);
  if(error)alert(error.message);else renderTeamAnalysis();
}

const default4231=[
  {n:'1',name:'ARQ',x:50,y:91},{n:'3',name:'LI',x:17,y:75},{n:'6',name:'DFC',x:39,y:77},{n:'2',name:'DFC',x:61,y:77},{n:'4',name:'LD',x:83,y:75},
  {n:'5',name:'MC',x:38,y:57},{n:'8',name:'MC',x:62,y:57},{n:'11',name:'EI',x:20,y:36},{n:'10',name:'MCO',x:50,y:34},{n:'7',name:'ED',x:80,y:36},{n:'9',name:'DEL',x:50,y:16}
];
function pitchLines(){return `<svg viewBox="0 0 68 105" preserveAspectRatio="none" style="position:absolute;inset:1.8%;width:96.4%;height:96.4%;pointer-events:none;overflow:visible;z-index:1" aria-hidden="true"><g fill="none" stroke="#788592" stroke-width="0.45" vector-effect="non-scaling-stroke"><rect x="0" y="0" width="68" height="105"/><line x1="0" y1="52.5" x2="68" y2="52.5"/><circle cx="34" cy="52.5" r="9.15"/><rect x="16.32" y="0" width="35.36" height="16.5"/><rect x="24.48" y="0" width="19.04" height="6.0"/><rect x="16.32" y="88.5" width="35.36" height="16.5"/><rect x="24.48" y="99" width="19.04" height="6.0"/><path d="M 27.6 16.5 A 9.15 9.15 0 0 0 40.4 16.5"/><path d="M 27.6 88.5 A 9.15 9.15 0 0 1 40.4 88.5"/><rect x="29.24" y="-2.2" width="9.52" height="2.2"/><rect x="29.24" y="105" width="9.52" height="2.2"/></g><g fill="#98a4af"><circle cx="34" cy="52.5" r="0.55"/><circle cx="34" cy="11" r="0.55"/><circle cx="34" cy="94" r="0.55"/></g></svg>`}
function formationHTML(f,mid){
  let players=Array.isArray(f?.jugadores)?f.jugadores:[];
  return `<div class="panel formation-panel"><div class="sec-title"><h2>Formación <span class="muted">${esc(f?.sistema||'')}</span></h2>${admin()?`<button class="ghost mini" onclick="resetFormation('${mid}')">${f?'Restablecer':'Crear'} 4-2-3-1</button>`:''}</div><div class="formation-wrap">${f?`<div class="football-pitch formation-pitch" id="formationPitch">${pitchLines()}${players.map((p,i)=>`<button class="player-dot" data-i="${i}" style="left:${Number(p.x)||50}%;top:${Number(p.y)||50}%" onclick="editFormationPlayer(event,${i})" title="Editar jugador"><b>${esc(p.n||'')}</b><span>${esc(p.name||'')}</span></button>`).join('')}</div>`:`<div class="empty">${admin()?'Creá la formación 4-2-3-1 para empezar.':'Formación todavía no cargada.'}</div>`}</div>${f?'<p class="muted small tactical-help">Arrastrá un jugador para moverlo. Hacé clic para editar número y nombre.</p>':''}</div>`;
}
async function resetFormation(mid){
  if(state.tactical?.formation && !confirm('¿Restablecer la formación a un 4-2-3-1 base?'))return;
  let row={partido_id:mid,sistema:'4-2-3-1',jugadores:default4231};
  let q=state.tactical?.formation?sb.from('formaciones').update(row).eq('id',state.tactical.formation.id):sb.from('formaciones').insert(row);
  let {error}=await q;if(error)alert(error.message);else renderTeamAnalysis();
}
async function editFormationPlayer(ev,i){
  ev.stopPropagation(); if(!admin()||!state.tactical?.formation)return;
  if(ev.currentTarget.dataset.dragged==='1'){ev.currentTarget.dataset.dragged='0';return}
  let players=structuredClone(state.tactical.formation.jugadores||[]),p=players[i];
  let n=prompt('Número:',p.n||'');if(n===null)return;let name=prompt('Nombre / referencia:',p.name||'');if(name===null)return;
  p.n=n;p.name=name;await saveFormationPlayers(players);
}
async function saveFormationPlayers(players){let {error}=await sb.from('formaciones').update({jugadores:players,updated_at:new Date().toISOString()}).eq('id',state.tactical.formation.id);if(error)alert(error.message);else{state.tactical.formation.jugadores=players;renderTeamAnalysis()}}
function enableFormationDrag(){
  if(!admin()||!state.tactical?.formation)return;let pitch=document.getElementById('formationPitch');if(!pitch)return;
  pitch.querySelectorAll('.player-dot').forEach(dot=>{
    let moved=false;
    dot.addEventListener('pointerdown',e=>{moved=false;dot.setPointerCapture(e.pointerId)});
    dot.addEventListener('pointermove',e=>{if(!dot.hasPointerCapture(e.pointerId))return;let r=pitch.getBoundingClientRect();let x=Math.max(4,Math.min(96,(e.clientX-r.left)/r.width*100)),y=Math.max(4,Math.min(96,(e.clientY-r.top)/r.height*100));dot.style.left=x+'%';dot.style.top=y+'%';dot.dataset.x=x;dot.dataset.y=y;moved=true});
    dot.addEventListener('pointerup',async e=>{if(!moved)return;dot.dataset.dragged='1';let players=structuredClone(state.tactical.formation.jugadores||[]),i=+dot.dataset.i;players[i].x=+dot.dataset.x;players[i].y=+dot.dataset.y;let {error}=await sb.from('formaciones').update({jugadores:players,updated_at:new Date().toISOString()}).eq('id',state.tactical.formation.id);if(error)alert(error.message);else state.tactical.formation.jugadores=players});
  });
}
async function ensureTacticalMaps(mid,current=[]){
  const wanted=[['defensivo',1,'Defensivo 1'],['defensivo',2,'Defensivo 2'],['ofensivo',1,'Ofensivo 1'],['ofensivo',2,'Ofensivo 2']];
  let rows=wanted.filter(([tipo,pos])=>!current.some(x=>x.tipo===tipo&&x.posicion===pos)).map(([tipo,pos,titulo])=>({partido_id:mid,tipo,posicion:pos,titulo}));
  if(rows.length){let {error}=await sb.from('mapas_tacticos').insert(rows);if(error)console.error(error)}
}
async function renameTacticalMap(id){let mp=state.tactical.maps.find(x=>x.id===id);let titulo=prompt('Título de esta cancha:',mp?.titulo||'');if(titulo===null||!titulo.trim())return;let {error}=await sb.from('mapas_tacticos').update({titulo:titulo.trim(),updated_at:new Date().toISOString()}).eq('id',id);if(error)alert(error.message);else renderTeamAnalysis()}
async function addTacticalMarker(ev,mapId){
  if(!admin())return;const pitch=ev.currentTarget,r=pitch.getBoundingClientRect(),hl=(ev.clientX-r.left)/r.width*100,ht=(ev.clientY-r.top)/r.height*100,{x,y}=hToV(hl,ht);
  const mp=state.tactical?.maps?.find(m=>m.id===mapId);window.__mk={mapId,x,y,tipo:mp?.tipo||'defensivo'};openMarkerForm({});
}
async function openTacticalMarker(id){
  let k=state.tactical?.markers?.find(x=>x.id===id);if(!k)return;
  document.getElementById('markerDetailModal')?.remove();
  const embed=k.video_url?dropboxEmbedUrl(k.video_url):'';
  const media=embed?`<div style="min-height:300px;background:#070b0f;border-radius:12px;overflow:hidden;display:flex;align-items:center;justify-content:center"><video controls playsinline style="width:100%;max-height:440px;background:#000" src="${esc(embed)}"></video></div>`:`<div class="empty">Esta situación todavía no tiene video.</div>`;
  let adminButtons=admin()?`<button class="secondary" onclick="closeTacticalMarkerModal();editTacticalMarker('${k.id}')">✏ Editar</button><button class="danger" onclick="deleteTacticalMarker('${k.id}')">Eliminar</button>`:'';
  let html=`<div id="markerDetailModal" class="modal-bg" onclick="if(event.target===this)closeTacticalMarkerModal()"><div class="modal" style="max-width:1050px;width:min(94vw,1050px)">${markerPills(k)}<h2>${esc(k.titulo||actionDef(k.accion)?.label||'Situación táctica')}</h2><div style="display:grid;grid-template-columns:minmax(0,1.5fr) minmax(260px,1fr);gap:18px;align-items:start"><div>${media}</div><div class="panel"><div class="eyebrow inline-eye">LO OBSERVADO</div><p style="white-space:pre-wrap">${esc(k.descripcion||'Sin observaciones cargadas.')}</p>${k.video_url?`<a class="secondary" href="${esc(k.video_url)}" target="_blank" rel="noopener">Abrir original ↗</a>`:''}</div></div><div class="modal-actions">${adminButtons}<button class="secondary" onclick="closeTacticalMarkerModal()">Cerrar</button></div></div></div>`;
  app.insertAdjacentHTML('beforeend',html);
}
function closeTacticalMarkerModal(){document.getElementById('markerDetailModal')?.remove()}

async function editTacticalMarker(id){const k=state.tactical.markers.find(x=>x.id===id);if(!k)return;const mp=state.tactical.maps.find(m=>m.id===k.mapa_id);window.__mk={id,tipo:mp?.tipo||'defensivo'};openMarkerForm(k)}
async function deleteTacticalMarker(id){if(!confirm('¿Eliminar este punto del mapa?'))return;let {error}=await sb.from('marcadores_tacticos').delete().eq('id',id);if(error)alert(error.message);else{closeTacticalMarkerModal();renderTeamAnalysis()}}





// ===== ABP PROPIO · 4 MEDIAS CANCHAS =====
function ownABPEntryHTML(mid){return `<div class="section"><div class="entry-strip" onclick="openOwnABP('${mid}')"><div><b>Pelota parada</b><span class="abp-strip-stats muted small" id="abpStripStats">Cuatro medias canchas con situaciones, video y observaciones</span></div><button class="primary" onclick="event.stopPropagation();openOwnABP('${mid}')">Abrir ABP →</button></div></div>`}
async function openOwnABP(mid){state.match=mid;state.page='ownabp';await renderOwnABP()}
async function ensureOwnABPMaps(mid,current=[]){const defaults=['ABP 1','ABP 2','ABP 3','ABP 4'];const rows=defaults.map((titulo,i)=>({partido_id:mid,posicion:i+1,titulo})).filter(r=>!current.some(x=>x.posicion===r.posicion));if(rows.length){const {error}=await sb.from('abp_mapas_equipo').insert(rows);if(error)throw error}}
async function renderOwnABP(){
  const mid=state.match,m=state.matches.find(x=>x.id===mid);if(!mid||!m){go('analysis');return}
  const {data:maps,error:me}=await sb.from('abp_mapas_equipo').select('*').eq('partido_id',mid).order('posicion');if(me)return alert(me.message);
  let list=maps||[];if(admin()&&list.length<4){try{await ensureOwnABPMaps(mid,list);const r=await sb.from('abp_mapas_equipo').select('*').eq('partido_id',mid).order('posicion');if(r.error)return alert(r.error.message);list=r.data||[]}catch(e){return alert(e.message)}}
  let points=[];if(list.length){const r=await sb.from('abp_puntos_equipo').select('*').in('mapa_id',list.map(x=>x.id)).order('created_at');if(r.error)return alert(r.error.message);points=r.data||[]}
  state.ownABP={maps:list,points};
  const cards=list.map(mp=>{const pts=points.filter(x=>x.mapa_id===mp.id);return `<div class="tactical-card"><div class="tactical-card-head"><div><span class="pill">ABP ${mp.posicion}</span><h3>${esc(mp.titulo)}</h3></div>${admin()?`<button class="secondary mini" onclick="renameOwnABPMap('${mp.id}')">Editar título</button>`:''}</div><div class="football-pitch half-pitch" onclick="addOwnABPPoint(event,'${mp.id}')">${rivalHalfPitchLines()}${pts.map(p=>`<button class="tactical-marker" style="left:${Number(p.x)}%;top:${Number(p.y)}%;${abpMarkerStyle(p.resultado)}" onclick="event.stopPropagation();openOwnABPPoint('${p.id}')" title="${esc(p.titulo||'Situación ABP')}"></button>`).join('')}</div></div>`}).join('');
  ensureChartTip();const summary=await abpMatchSummaryHTML(mid,points);
  const b=`<div class="crumb"><button class="back" onclick="state.page='teamanalysis';renderTeamAnalysis()">${esc(CN())} vs ${esc(m.rival)}</button> / ABP</div><div class="page-head"><div class="page-head-main">${scoreHTML(m)}<div><div class="eyebrow inline-eye">ANÁLISIS PROPIO · ABP</div><h1 class="title">ABP vs ${esc(m.rival)}</h1></div></div></div>${summary}<div class="sec-title" style="margin-top:14px"><h2>Medias canchas</h2><span class="muted small">${admin()?'Hacé clic en una media cancha para agregar una situación':'Tocá un punto para ver video y observación'}</span></div><div class="tactical-section"><div class="tactical-grid">${cards||'<div class="empty">Todavía no hay mapas ABP cargados.</div>'}</div></div>`;app.innerHTML=shell(b,'Análisis del equipo');
}
async function renameOwnABPMap(id){if(!admin())return;const mp=state.ownABP?.maps?.find(x=>x.id===id);let titulo=prompt('Título de esta media cancha:',mp?.titulo||'');if(titulo===null||!titulo.trim())return;const {error}=await sb.from('abp_mapas_equipo').update({titulo:titulo.trim(),updated_at:new Date().toISOString()}).eq('id',id);if(error)return alert(error.message);renderOwnABP()}
async function addOwnABPPoint(ev,mapId){if(!admin())return;const pitch=ev.currentTarget,r=pitch.getBoundingClientRect(),x=(ev.clientX-r.left)/r.width*100,y=(ev.clientY-r.top)/r.height*100;let titulo=prompt('Título de la situación:');if(titulo===null||!titulo.trim())return;let lado=prompt('ABP: favor o contra','favor');if(lado===null)return;lado=lado.toLowerCase().trim();if(!['favor','contra'].includes(lado))return alert('Escribí favor o contra.');let tipo=prompt('Tipo: corner, tiro_libre_lateral, tiro_libre_frontal, saque_banda u otro','corner')||'otro';tipo=tipo.toLowerCase().trim();let resultado=prompt('Resultado: acierto, error o neutro','neutro')||'neutro';resultado=resultado.toLowerCase().trim();if(!['acierto','error','neutro'].includes(resultado))return alert('Resultado no válido.');let finalizacion=prompt('Finalización: sin_remate, remate o gol','sin_remate')||'sin_remate';finalizacion=finalizacion.toLowerCase().trim();if(!['sin_remate','remate','gol'].includes(finalizacion))return alert('Finalización no válida.');let observado=prompt('Lo observado:')||'';let video_url=prompt('Link del clip de Dropbox (opcional):')||'';const {error}=await sb.from('abp_puntos_equipo').insert({mapa_id:mapId,x:+x.toFixed(2),y:+y.toFixed(2),titulo:titulo.trim(),observado:observado.trim(),video_url:video_url.trim(),lado,tipo_abp:tipo,resultado,finalizacion});if(error)return alert(error.message);renderOwnABP()}
async function openOwnABPPoint(id){const p=state.ownABP?.points?.find(x=>x.id===id);if(!p)return;document.getElementById('ownABPPointModal')?.remove();const embed=p.video_url?dropboxEmbedUrl(p.video_url):'';const media=embed?`<div style="min-height:300px;background:#070b0f;border-radius:12px;overflow:hidden;display:flex;align-items:center;justify-content:center"><video controls playsinline style="width:100%;max-height:440px;background:#000" src="${esc(embed)}"></video></div>`:`<div class="empty">Esta situación todavía no tiene video.</div>`;const controls=admin()?`<button class="secondary" onclick="editOwnABPPoint('${p.id}')">✏ Editar</button><button class="danger" onclick="deleteOwnABPPoint('${p.id}')">Eliminar</button>`:'';const html=`<div id="ownABPPointModal" class="modal-bg" onclick="if(event.target===this)this.remove()"><div class="modal" style="max-width:1050px;width:min(94vw,1050px)"><span class="pill">SITUACIÓN ABP</span><h2>${esc(p.titulo||'Situación ABP')}</h2><div style="display:grid;grid-template-columns:minmax(0,1.5fr) minmax(260px,1fr);gap:18px;align-items:start"><div>${media}</div><div class="panel"><div class="eyebrow inline-eye">LO OBSERVADO</div><p style="white-space:pre-wrap">${esc(p.observado||'Sin observaciones cargadas.')}</p>${p.video_url?`<a class="secondary" href="${esc(p.video_url)}" target="_blank" rel="noopener">Abrir original ↗</a>`:''}</div></div><div class="modal-actions">${controls}<button class="secondary" onclick="document.getElementById('ownABPPointModal').remove()">Cerrar</button></div></div></div>`;app.insertAdjacentHTML('beforeend',html)}
async function editOwnABPPoint(id){if(!admin())return;const p=state.ownABP?.points?.find(x=>x.id===id);if(!p)return;let titulo=prompt('Título:',p.titulo||'');if(titulo===null||!titulo.trim())return;let lado=prompt('ABP: favor o contra',p.lado||'favor');if(lado===null)return;lado=lado.toLowerCase().trim();if(!['favor','contra'].includes(lado))return alert('Escribí favor o contra.');let tipo_abp=prompt('Tipo de ABP:',p.tipo_abp||'corner');if(tipo_abp===null)return;let resultado=prompt('Resultado: acierto, error o neutro',p.resultado||'neutro');if(resultado===null)return;resultado=resultado.toLowerCase().trim();if(!['acierto','error','neutro'].includes(resultado))return alert('Resultado no válido.');let finalizacion=prompt('Finalización: sin_remate, remate o gol',p.finalizacion||'sin_remate');if(finalizacion===null)return;finalizacion=finalizacion.toLowerCase().trim();if(!['sin_remate','remate','gol'].includes(finalizacion))return alert('Finalización no válida.');let observado=prompt('Lo observado:',p.observado||'');if(observado===null)return;let video_url=prompt('Link de Dropbox:',p.video_url||'');if(video_url===null)return;const {error}=await sb.from('abp_puntos_equipo').update({titulo:titulo.trim(),lado,tipo_abp:tipo_abp.trim(),resultado,finalizacion,observado:observado.trim(),video_url:video_url.trim(),updated_at:new Date().toISOString()}).eq('id',id);if(error)return alert(error.message);document.getElementById('ownABPPointModal')?.remove();renderOwnABP()}
async function deleteOwnABPPoint(id){if(!admin()||!confirm('¿Eliminar este punto de ABP?'))return;const {error}=await sb.from('abp_puntos_equipo').delete().eq('id',id);if(error)return alert(error.message);document.getElementById('ownABPPointModal')?.remove();renderOwnABP()}

// ===== V1.4.8B · ANÁLISIS RIVAL: COMPETENCIAS + CLUBES =====
async function renderRivalCompetitions(){
  const {data,error}=await sb.from('competencias_rival').select('*').eq('activo',true).order('nombre');
  if(error){app.innerHTML=shell(`<div class="eyebrow">ANÁLISIS RIVAL</div><h1 class="title">Análisis Rival</h1><div class="empty">No se pudieron cargar las competencias: ${esc(error.message)}</div>`,'Análisis Rival');return}
  const comps=data||[];
  const cards=comps.map(c=>`<div class="match-card"><span class="pill">COMPETENCIA</span><h3>${icon('trophy')}${esc(c.nombre)}</h3><p class="muted">${esc(c.descripcion||'Rivales analizados')}</p><div class="actions"><button class="secondary" onclick="openRivalCompetition('${c.id}')">Ver equipos →</button>${admin()?`<button class="secondary" onclick="editRivalCompetition('${c.id}')">Editar</button><button class="danger" onclick="deleteRivalCompetition('${c.id}')">Eliminar</button>`:''}</div></div>`).join('');
  const b=`<div class="eyebrow">ANÁLISIS RIVAL</div><div class="toolbar"><div><h1 class="title">Análisis Rival</h1><p class="muted">Seleccioná una competencia para acceder a los equipos analizados.</p></div>${admin()?'<button class="primary" onclick="addRivalCompetition()">+ Agregar competencia</button>':''}</div><div class="games">${cards||'<div class="empty">Todavía no hay competencias cargadas.</div>'}</div>`;
  app.innerHTML=shell(b,'Análisis Rival');
}

async function addRivalCompetition(){
  if(!admin())return;
  let nombre=prompt('Nombre de la competencia (ej. Liga Rionegrina):');if(nombre===null||!nombre.trim())return;
  let descripcion=prompt('Descripción breve (opcional):')||'';
  const {error}=await sb.from('competencias_rival').insert({nombre:nombre.trim(),descripcion,activo:true});
  if(error)return alert(error.message);renderRivalCompetitions();
}
async function editRivalCompetition(id){
  if(!admin())return;const {data,error}=await sb.from('competencias_rival').select('*').eq('id',id).single();if(error)return alert(error.message);
  let nombre=prompt('Nombre de la competencia:',data.nombre||'');if(nombre===null||!nombre.trim())return;
  let descripcion=prompt('Descripción breve:',data.descripcion||'');if(descripcion===null)return;
  const {error:e}=await sb.from('competencias_rival').update({nombre:nombre.trim(),descripcion:descripcion.trim(),updated_at:new Date().toISOString()}).eq('id',id);
  if(e)return alert(e.message);renderRivalCompetitions();
}
async function deleteRivalCompetition(id){
  if(!admin()||!confirm('¿Eliminar esta competencia? También se quitarán sus vínculos con clubes.'))return;
  const {error}=await sb.from('competencias_rival').delete().eq('id',id);if(error)return alert(error.message);renderRivalCompetitions();
}
async function openRivalCompetition(id){state.rivalCompetition=id;state.page='rivalclubs';await renderRivalClubs()}
async function renderRivalClubs(){
  const cid=state.rivalCompetition;if(!cid){go('rivalanalysis');return}
  const [{data:comp,error:ce},{data:links,error:le}]=await Promise.all([
    sb.from('competencias_rival').select('*').eq('id',cid).single(),
    sb.from('club_competencias_rival').select('club_id').eq('competencia_id',cid)
  ]);
  if(ce||le){alert(ce?.message||le?.message);go('rivalanalysis');return}
  const ids=(links||[]).map(x=>x.club_id);let clubs=[];
  if(ids.length){const {data,error}=await sb.from('clubes_rivales').select('*').in('id',ids).order('nombre');if(error)return alert(error.message);clubs=data||[]}
  const cards=clubs.map(c=>`<div class="match-card"><span class="pill">RIVAL</span><h3>${esc(c.nombre)}</h3><p class="muted">${esc(c.ciudad||'')} ${c.entrenador?'· DT '+esc(c.entrenador):''}</p><p>${esc(c.descripcion||'')}</p><div class="actions"><button class="secondary" onclick="openRivalClub('${c.id}')">Ver análisis →</button>${admin()?`<button class="secondary" onclick="editRivalClub('${c.id}')">Editar</button><button class="danger" onclick="removeRivalClubFromCompetition('${c.id}')">Quitar</button>`:''}</div></div>`).join('');
  const b=`<div class="crumb"><button class="back" onclick="go('rivalanalysis')">Análisis Rival</button> / ${esc(comp.nombre)}</div><div class="eyebrow">COMPETENCIA</div><div class="toolbar"><div><h1 class="title">${esc(comp.nombre)}</h1><p class="muted">Equipos analizados en esta competencia.</p></div>${admin()?`<button class="primary" onclick="addRivalClub('${cid}')">+ Agregar equipo</button>`:''}</div><div class="games">${cards||'<div class="empty">Todavía no hay equipos cargados en esta competencia.</div>'}</div>`;
  app.innerHTML=shell(b,'Análisis Rival');
}
async function addRivalClub(cid){
  if(!admin())return;let nombre=prompt('Nombre del equipo rival:');if(nombre===null||!nombre.trim())return;
  let ciudad=prompt('Ciudad (opcional):')||'';let entrenador=prompt('Entrenador / DT (opcional):')||'';let descripcion=prompt('Descripción breve (opcional):')||'';
  let {data:club,error}=await sb.from('clubes_rivales').insert({nombre:nombre.trim(),ciudad:ciudad.trim(),entrenador:entrenador.trim(),descripcion:descripcion.trim()}).select('*').single();
  if(error){if(String(error.message).toLowerCase().includes('duplicate')){const r=await sb.from('clubes_rivales').select('*').eq('nombre',nombre.trim()).maybeSingle();club=r.data;if(!club)return alert(error.message)}else return alert(error.message)}
  const {error:e}=await sb.from('club_competencias_rival').upsert({club_id:club.id,competencia_id:cid},{onConflict:'club_id,competencia_id'});if(e)return alert(e.message);renderRivalClubs();
}
async function editRivalClub(id){
  if(!admin())return;const {data,error}=await sb.from('clubes_rivales').select('*').eq('id',id).single();if(error)return alert(error.message);
  let nombre=prompt('Nombre del equipo:',data.nombre||'');if(nombre===null||!nombre.trim())return;let ciudad=prompt('Ciudad:',data.ciudad||'');if(ciudad===null)return;let entrenador=prompt('Entrenador / DT:',data.entrenador||'');if(entrenador===null)return;let descripcion=prompt('Descripción breve:',data.descripcion||'');if(descripcion===null)return;
  const {error:e}=await sb.from('clubes_rivales').update({nombre:nombre.trim(),ciudad:ciudad.trim(),entrenador:entrenador.trim(),descripcion:descripcion.trim(),updated_at:new Date().toISOString()}).eq('id',id);if(e)return alert(e.message);renderRivalClubs();
}
async function removeRivalClubFromCompetition(clubId){
  if(!admin()||!confirm('¿Quitar este equipo de la competencia? La ficha del club no se elimina.'))return;
  const {error}=await sb.from('club_competencias_rival').delete().eq('club_id',clubId).eq('competencia_id',state.rivalCompetition);if(error)return alert(error.message);renderRivalClubs();
}
function openRivalClub(id){state.rivalClub=id;state.page='rivalclub';renderRivalClubBase()}
async function renderRivalClubBase(){
  const [{data:c,error},{data:modelo,error:me}]=await Promise.all([
    sb.from('clubes_rivales').select('*').eq('id',state.rivalClub).single(),
    sb.from('modelo_juego_rival').select('*').eq('club_id',state.rivalClub).maybeSingle()
  ]);
  if(error||!c){alert(error?.message||'No se encontró el club.');renderRivalClubs();return}
  if(me)return alert(me.message);
  const rx=await rivalExtrasFetch(c.id);
  const info=`<div class="panel"><div class="analysis-card-head"><div><span class="pill">INFORMACIÓN GENERAL</span><h3>Ficha del rival</h3></div>${admin()?`<button class="secondary" onclick="editRivalClubInfo('${c.id}')">✏ Editar</button>`:''}</div><p><b>Ciudad:</b> ${esc(c.ciudad||'—')}</p><p><b>Entrenador / DT:</b> ${esc(c.entrenador||'—')}</p><label>Descripción / características generales</label><div class="note-box">${esc(c.descripcion||'Sin descripción cargada.')}</div></div>`;
  const game=`<div class="section"><div class="section-head"><div><div class="eyebrow inline-eye">MODELO DE JUEGO</div><h2>Perfil futbolístico</h2><p class="muted small">Lectura general del rival para la preparación del partido.</p></div>${admin()?`<button class="primary" onclick="editRivalGameModel('${c.id}')">${modelo?'Editar modelo':'Cargar modelo'}</button>`:''}</div><div class="player-detail"><div class="panel"><h3>⚽ Organización ofensiva</h3><div class="note-box">${esc(modelo?.organizacion_ofensiva||'Sin cargar')}</div><h3>🛡 Organización defensiva</h3><div class="note-box">${esc(modelo?.organizacion_defensiva||'Sin cargar')}</div><h3>↔ Transiciones</h3><div class="note-box">${esc(modelo?.transiciones||'Sin cargar')}</div></div><div class="panel"><h3>✓ Fortalezas</h3><div class="note-box">${esc(modelo?.fortalezas||'Sin cargar')}</div><h3>! Debilidades / espacios a explotar</h3><div class="note-box">${esc(modelo?.debilidades||'Sin cargar')}</div><h3>Conclusión</h3><div class="note-box">${esc(modelo?.conclusion||'Sin cargar')}</div></div></div></div>`;
  const next=`<div class="section"><div class="games"><div class="match-card" style="cursor:pointer" onclick="openRivalABP('${c.id}')"><span class="pill">ABP RIVAL</span><h3>🎯 ABP</h3><p class="muted">Cuatro medias canchas con puntos interactivos.</p><button class="secondary">Abrir ABP →</button></div><div class="match-card"><span class="pill">PRÓXIMA ETAPA</span><h3>⭐ Jugadores destacados</h3><p class="muted">Perfiles, clips e informes compartibles.</p></div></div></div>`;
  const b=`<div class="crumb"><button class="back" onclick="state.page='rivalclubs';renderRivalClubs()">Equipos analizados</button> / ${esc(c.nombre)}</div><div class="eyebrow">ANÁLISIS RIVAL</div><h1 class="title">${esc(c.nombre)}</h1><p class="muted">Ficha de scouting del rival</p>${info}${game}${rivalExtrasHTML(c,rx)}${next}`;
  app.innerHTML=shell(b,'Análisis Rival');
  enableRivalFormationDrag();
}

async function editRivalClubInfo(id){
  if(!admin())return;const {data,error}=await sb.from('clubes_rivales').select('*').eq('id',id).single();if(error)return alert(error.message);
  let ciudad=prompt('Ciudad:',data.ciudad||'');if(ciudad===null)return;let entrenador=prompt('Entrenador / DT:',data.entrenador||'');if(entrenador===null)return;let descripcion=prompt('Descripción / características generales:',data.descripcion||'');if(descripcion===null)return;
  const {error:e}=await sb.from('clubes_rivales').update({ciudad:ciudad.trim(),entrenador:entrenador.trim(),descripcion:descripcion.trim(),updated_at:new Date().toISOString()}).eq('id',id);if(e)return alert(e.message);renderRivalClubBase();
}

async function editRivalGameModel(clubId){
  if(!admin())return;const {data,error}=await sb.from('modelo_juego_rival').select('*').eq('club_id',clubId).maybeSingle();if(error)return alert(error.message);const base=data||{};
  let organizacion_ofensiva=prompt('Organización ofensiva:',base.organizacion_ofensiva||'');if(organizacion_ofensiva===null)return;
  let organizacion_defensiva=prompt('Organización defensiva:',base.organizacion_defensiva||'');if(organizacion_defensiva===null)return;
  let transiciones=prompt('Transiciones:',base.transiciones||'');if(transiciones===null)return;
  let fortalezas=prompt('Fortalezas:',base.fortalezas||'');if(fortalezas===null)return;
  let debilidades=prompt('Debilidades / espacios a explotar:',base.debilidades||'');if(debilidades===null)return;
  let conclusion=prompt('Conclusión:',base.conclusion||'');if(conclusion===null)return;
  const row={club_id:clubId,organizacion_ofensiva:organizacion_ofensiva.trim(),organizacion_defensiva:organizacion_defensiva.trim(),transiciones:transiciones.trim(),fortalezas:fortalezas.trim(),debilidades:debilidades.trim(),conclusion:conclusion.trim(),updated_at:new Date().toISOString()};
  const q=data?sb.from('modelo_juego_rival').update(row).eq('id',data.id):sb.from('modelo_juego_rival').insert(row);const {error:e}=await q;if(e)return alert(e.message);renderRivalClubBase();
}


// ===== V1.4.8D · ABP RIVAL =====
async function openRivalABP(clubId){state.rivalClub=clubId;state.page='rivalabp';await renderRivalABP()}

function rivalHalfPitchLines(){return `<svg viewBox="0 0 52.5 68" preserveAspectRatio="none" style="position:absolute;inset:1.8%;width:96.4%;height:96.4%;pointer-events:none;overflow:visible;z-index:1" aria-hidden="true"><g fill="none" stroke="#788592" stroke-width="0.55" vector-effect="non-scaling-stroke"><rect x="0" y="0" width="52.5" height="68"/><rect x="0" y="16.32" width="16.5" height="35.36"/><rect x="0" y="24.48" width="6" height="19.04"/><path d="M 16.5 27.6 A 9.15 9.15 0 0 1 16.5 40.4"/><path d="M 52.5 24.85 A 9.15 9.15 0 0 0 52.5 43.15"/><rect x="-2.2" y="29.24" width="2.2" height="9.52"/></g><g fill="#98a4af"><circle cx="11" cy="34" r="0.6"/><circle cx="52.5" cy="34" r="0.6"/></g></svg>`}

async function ensureRivalABPMaps(clubId,current=[]){
  const defaults=['ABP 1','ABP 2','ABP 3','ABP 4'];
  const rows=defaults.map((titulo,i)=>({club_id:clubId,posicion:i+1,titulo})).filter(r=>!current.some(x=>x.posicion===r.posicion));
  if(rows.length){const {error}=await sb.from('abp_mapas_rival').insert(rows);if(error)throw error}
}

async function renderRivalABP(){
  const clubId=state.rivalClub;if(!clubId){go('rivalanalysis');return}
  const [{data:c,error:ce},{data:maps,error:me}]=await Promise.all([sb.from('clubes_rivales').select('*').eq('id',clubId).single(),sb.from('abp_mapas_rival').select('*').eq('club_id',clubId).order('posicion')]);
  if(ce||!c)return alert(ce?.message||'No se encontró el club.');if(me)return alert(me.message);
  let list=maps||[];
  if(admin()&&list.length<4){try{await ensureRivalABPMaps(clubId,list);const r=await sb.from('abp_mapas_rival').select('*').eq('club_id',clubId).order('posicion');if(r.error)return alert(r.error.message);list=r.data||[]}catch(e){return alert(e.message)}}
  let points=[];if(list.length){const r=await sb.from('abp_puntos_rival').select('*').in('mapa_id',list.map(x=>x.id)).order('created_at');if(r.error)return alert(r.error.message);points=r.data||[]}
  state.rivalABP={club:c,maps:list,points};
  const cards=list.map(mp=>{const pts=points.filter(x=>x.mapa_id===mp.id);return `<div class="tactical-card"><div class="tactical-card-head"><div><span class="pill">ABP ${mp.posicion}</span><h3>${esc(mp.titulo)}</h3></div>${admin()?`<button class="secondary mini" onclick="renameRivalABPMap('${mp.id}')">Editar título</button>`:''}</div><div class="football-pitch half-pitch" onclick="addRivalABPPoint(event,'${mp.id}')">${rivalHalfPitchLines()}${pts.map(p=>`<button class="tactical-marker marker-situacion" style="left:${Number(p.x)}%;top:${Number(p.y)}%" onclick="event.stopPropagation();openRivalABPPoint('${p.id}')" title="${esc(p.titulo||'Situación ABP')}"></button>`).join('')}</div></div>`}).join('');
  const b=`<div class="crumb"><button class="back" onclick="state.page='rivalclub';renderRivalClubBase()">${esc(c.nombre)}</button> / ABP</div><div class="eyebrow">ANÁLISIS RIVAL · ABP</div><h1 class="title">${esc(c.nombre)}</h1><p class="muted">Pelota parada del rival · cuatro medias canchas editables.</p><div class="section tactical-section"><div class="tactical-grid">${cards||'<div class="empty">Todavía no hay mapas ABP cargados.</div>'}</div></div>`;
  app.innerHTML=shell(b,'Análisis Rival');
}

async function renameRivalABPMap(id){if(!admin())return;const mp=state.rivalABP?.maps?.find(x=>x.id===id);let titulo=prompt('Título de esta media cancha:',mp?.titulo||'');if(titulo===null||!titulo.trim())return;const {error}=await sb.from('abp_mapas_rival').update({titulo:titulo.trim(),updated_at:new Date().toISOString()}).eq('id',id);if(error)return alert(error.message);renderRivalABP()}

async function addRivalABPPoint(ev,mapId){
  if(!admin())return;const pitch=ev.currentTarget,r=pitch.getBoundingClientRect(),x=(ev.clientX-r.left)/r.width*100,y=(ev.clientY-r.top)/r.height*100;
  let titulo=prompt('Título de la situación (ej. Centro al segundo palo):');if(titulo===null||!titulo.trim())return;
  let observado=prompt('Lo observado:')||'';let video_url=prompt('Link del clip de Dropbox (opcional):')||'';
  const {error}=await sb.from('abp_puntos_rival').insert({mapa_id:mapId,x:+x.toFixed(2),y:+y.toFixed(2),titulo:titulo.trim(),observado:observado.trim(),video_url:video_url.trim()});if(error)return alert(error.message);renderRivalABP();
}

function dropboxEmbedUrl(url=''){try{const u=new URL(String(url));if(u.hostname.includes('dropbox.com')){u.searchParams.delete('dl');u.searchParams.set('raw','1');return u.toString()}}catch(e){}return String(url)}

async function openRivalABPPoint(id){
  const p=state.rivalABP?.points?.find(x=>x.id===id);if(!p)return;document.getElementById('rivalABPPointModal')?.remove();
  const embed=p.video_url?dropboxEmbedUrl(p.video_url):'';
  const media=embed?`<div style="min-height:300px;background:#070b0f;border-radius:12px;overflow:hidden;display:flex;align-items:center;justify-content:center"><video controls playsinline style="width:100%;max-height:440px;background:#000" src="${esc(embed)}"></video></div>`:`<div class="empty">Esta situación todavía no tiene video.</div>`;
  const controls=admin()?`<button class="secondary" onclick="editRivalABPPoint('${p.id}')">✏ Editar</button><button class="danger" onclick="deleteRivalABPPoint('${p.id}')">Eliminar</button>`:'';
  const html=`<div id="rivalABPPointModal" class="modal-bg" onclick="if(event.target===this)this.remove()"><div class="modal" style="max-width:1050px;width:min(94vw,1050px)"><span class="pill">SITUACIÓN ABP</span><h2>${esc(p.titulo||'Situación ABP')}</h2><div style="display:grid;grid-template-columns:minmax(0,1.5fr) minmax(260px,1fr);gap:18px;align-items:start"><div>${media}</div><div class="panel"><div class="eyebrow inline-eye">LO OBSERVADO</div><p style="white-space:pre-wrap">${esc(p.observado||'Sin observaciones cargadas.')}</p>${p.video_url?`<a class="secondary" href="${esc(p.video_url)}" target="_blank" rel="noopener">Abrir original ↗</a>`:''}</div></div><div class="modal-actions">${controls}<button class="secondary" onclick="document.getElementById('rivalABPPointModal').remove()">Cerrar</button></div></div></div>`;
  app.insertAdjacentHTML('beforeend',html);
}

async function editRivalABPPoint(id){if(!admin())return;const p=state.rivalABP?.points?.find(x=>x.id===id);if(!p)return;let titulo=prompt('Título:',p.titulo||'');if(titulo===null||!titulo.trim())return;let observado=prompt('Lo observado:',p.observado||'');if(observado===null)return;let video_url=prompt('Link de Dropbox:',p.video_url||'');if(video_url===null)return;const {error}=await sb.from('abp_puntos_rival').update({titulo:titulo.trim(),observado:observado.trim(),video_url:video_url.trim(),updated_at:new Date().toISOString()}).eq('id',id);if(error)return alert(error.message);document.getElementById('rivalABPPointModal')?.remove();renderRivalABP()}
async function deleteRivalABPPoint(id){if(!admin()||!confirm('¿Eliminar este punto de ABP?'))return;const {error}=await sb.from('abp_puntos_rival').delete().eq('id',id);if(error)return alert(error.message);document.getElementById('rivalABPPointModal')?.remove();renderRivalABP()}


// ===== V1.4.8F · BIBLIOTECA / DATOS ABP =====
let abpLibrarySide='favor',abpLibraryWindow=5,abpExpandedMatch=null;
function abpSideLabel(v){return v==='contra'?'EN CONTRA':'A FAVOR'}
function abpTypeLabel(v){return ({corner:'Córner',tiro_libre_lateral:'Tiro libre lateral',tiro_libre_frontal:'Tiro libre frontal',saque_banda:'Saque de banda',otro:'Otro'})[v]||String(v||'Otro').replaceAll('_',' ')}
function abpMarkerColor(v){return v==='error'?'#ef4444':v==='acierto'?'#22c55e':'#38a9e8'}
function abpMarkerStyle(v){const c=abpMarkerColor(v);return `background:${c};border-color:#fff;box-shadow:0 0 0 3px ${c}33`}
function abpMatchLibraryHTML(m,maps,points){const cards=maps.sort((a,b)=>a.posicion-b.posicion).map(mp=>{const pts=points.filter(p=>p.mapa_id===mp.id);return `<div class="tactical-card"><div class="tactical-card-head"><div><span class="pill">ABP ${mp.posicion}</span><h3>${esc(mp.titulo)}</h3></div><button class="secondary mini" onclick="openOwnABP('${m.id}')">Editar en análisis →</button></div><div class="football-pitch half-pitch">${rivalHalfPitchLines()}${pts.map(p=>`<button class="tactical-marker" style="left:${+p.x}%;top:${+p.y}%;${abpMarkerStyle(p.resultado)}" onclick="openABPLibraryPoint('${p.id}')" title="${esc(p.titulo)}"></button>`).join('')}</div></div>`}).join('');window.__abpLibraryPoints=points;return `<div class="tactical-grid" style="margin-top:14px">${cards||'<div class="empty">Sin ABP para este filtro.</div>'}</div>`}
async function openABPLibraryPoint(id){const p=(window.__abpLibraryPoints||[]).find(x=>x.id===id);if(!p)return;document.getElementById('abpLibraryModal')?.remove();const embed=p.video_url?dropboxEmbedUrl(p.video_url):'';const media=embed?`<video controls playsinline style="width:100%;max-height:440px;background:#000;border-radius:12px" src="${esc(embed)}"></video>`:'<div class="empty">Sin video.</div>';app.insertAdjacentHTML('beforeend',`<div id="abpLibraryModal" class="modal-bg" onclick="if(event.target===this)this.remove()"><div class="modal" style="max-width:1050px"><span class="pill">${esc(abpSideLabel(p.lado))} · ${esc(abpTypeLabel(p.tipo_abp))}</span><h2>${esc(p.titulo)}</h2><div style="display:grid;grid-template-columns:1.5fr 1fr;gap:18px"><div>${media}</div><div class="panel"><div class="eyebrow inline-eye">LO OBSERVADO</div><p>${esc(p.observado||'Sin observaciones')}</p><p class="muted small">${esc(p.resultado||'neutro')} · ${esc(p.finalizacion||'sin_remate')}</p></div></div><div class="modal-actions"><button class="secondary" onclick="document.getElementById('abpLibraryModal').remove()">Cerrar</button></div></div></div>`)}

const calendarTypes={
  partido:'⚽ Próximo partido',
  analisis_rival:'🎥 Análisis rival',
  analisis_propio:'📊 Análisis propio',
  analisis_individual:'👤 Análisis individual',
  presentacion:'👥 Presentación grupal',
  informe:'📄 Informe',
  otro:'📌 Otro'
};
const calendarStates={
  pendiente:'Pendiente',
  en_proceso:'En proceso',
  disponible:'Disponible',
  finalizado:'Finalizado'
};
function calendarISO(d){let y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');return `${y}-${m}-${day}`}
function calendarToday(){calendarView=new Date();loadCalendar()}
function changeCalendarMonth(n){calendarView=new Date(calendarView.getFullYear(),calendarView.getMonth()+n,1);loadCalendar()}
async function loadCalendar(){
  const box=document.getElementById('calendarBox');if(!box)return;
  const y=calendarView.getFullYear(),mo=calendarView.getMonth();
  const from=calendarISO(new Date(y,mo,1)),to=calendarISO(new Date(y,mo+1,0));
  const {data,error}=await sb.from('calendario').select('*').gte('fecha',from).lte('fecha',to).order('fecha',{ascending:true}).order('created_at',{ascending:true});
  if(error){box.innerHTML=`<div class="empty">No se pudo cargar el calendario: ${esc(error.message)}</div>`;return}
  const events=data||[],first=new Date(y,mo,1),lastDay=new Date(y,mo+1,0).getDate(),offset=(first.getDay()+6)%7;
  const names=['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
  const monthName=new Intl.DateTimeFormat('es-AR',{month:'long',year:'numeric'}).format(first);
  let cells='';
  for(let k=0;k<offset;k++)cells+=`<div class="calendar-day outside"></div>`;
  const today=calendarISO(new Date());
  for(let day=1;day<=lastDay;day++){
    const iso=calendarISO(new Date(y,mo,day)),items=events.filter(e=>e.fecha===iso);
    cells+=`<div class="calendar-day ${iso===today?'today':''}" ${admin()?`ondblclick="openCalendarForm('${iso}')"`:''}><div class="calendar-day-number">${day}</div><div class="calendar-events">${items.map(e=>`<button class="calendar-event type-${esc(e.tipo)} status-${esc(e.estado)}" ${admin()?`onclick="editCalendarEvent('${e.id}')"`:'disabled'} title="${esc(e.descripcion||e.titulo)}"><span class="calendar-event-type">${esc(calendarTypes[e.tipo]||calendarTypes.otro)}</span><b>${esc(e.titulo)}</b><small>${esc(calendarStates[e.estado]||e.estado)}</small></button>`).join('')}</div>${admin()?`<button class="calendar-add-day" onclick="openCalendarForm('${iso}')" title="Agregar evento">＋</button>`:''}</div>`;
  }
  const total=offset+lastDay,tail=(7-(total%7))%7;
  for(let k=0;k<tail;k++)cells+=`<div class="calendar-day outside"></div>`;
  box.innerHTML=`<div class="calendar-month-head"><h3>${esc(monthName.charAt(0).toUpperCase()+monthName.slice(1))}</h3><span>${events.length} evento${events.length===1?'':'s'}</span></div><div class="calendar-weekdays">${names.map(n=>`<div>${n}</div>`).join('')}</div><div class="calendar-grid">${cells}</div>`;
}
function calendarForm(e={}){
  const date=e.fecha||calendarISO(new Date());
  return `<h2>${e.id?'Editar':'Agregar'} evento</h2><label>Fecha</label><input id="calDate" class="field" type="date" value="${esc(date)}"><label>Título</label><input id="calTitle" class="field" value="${esc(e.titulo||'')}" placeholder="Ej. Análisis rival vs Villa Congreso"><label>Tipo</label><select id="calType" class="field">${Object.entries(calendarTypes).map(([v,n])=>`<option value="${v}" ${e.tipo===v?'selected':''}>${esc(n)}</option>`).join('')}</select><label>Estado</label><select id="calState" class="field">${Object.entries(calendarStates).map(([v,n])=>`<option value="${v}" ${e.estado===v?'selected':''}>${esc(n)}</option>`).join('')}</select><label>Descripción (opcional)</label><textarea id="calDesc" placeholder="Información para el cuerpo técnico">${esc(e.descripcion||'')}</textarea><label>Enlace (opcional)</label><input id="calLink" class="field" value="${esc(e.enlace||'')}" placeholder="Link al análisis, informe o video"><div class="modal-actions">${e.id?`<button class="danger" onclick="deleteCalendarEvent('${e.id}')">Eliminar</button>`:''}<button class="secondary" onclick="closeCalendarForm()">Cancelar</button><button class="primary" onclick="saveCalendarEvent('${e.id||''}')">Guardar</button></div>`;
}
function openCalendarForm(date=''){
  if(!admin())return;
  document.getElementById('calendarModal')?.remove();
  const html=`<div id="calendarModal" class="modal-bg" onclick="if(event.target===this)closeCalendarForm()"><div class="modal">${calendarForm({fecha:date||calendarISO(new Date())})}</div></div>`;
  app.insertAdjacentHTML('beforeend',html);
}
function closeCalendarForm(){document.getElementById('calendarModal')?.remove()}
async function editCalendarEvent(id){
  if(!admin())return;
  const {data,error}=await sb.from('calendario').select('*').eq('id',id).single();
  if(error)return alert(error.message);
  document.getElementById('calendarModal')?.remove();
  app.insertAdjacentHTML('beforeend',`<div id="calendarModal" class="modal-bg" onclick="if(event.target===this)closeCalendarForm()"><div class="modal">${calendarForm(data)}</div></div>`);
}
async function saveCalendarEvent(id){
  if(!admin())return;
  const row={fecha:calDate.value,titulo:calTitle.value.trim(),tipo:calType.value,estado:calState.value,descripcion:calDesc.value.trim(),enlace:calLink.value.trim(),updated_at:new Date().toISOString()};
  if(!row.fecha||!row.titulo)return alert('Completá la fecha y el título.');
  const q=id?sb.from('calendario').update(row).eq('id',id):sb.from('calendario').insert(row);
  const {error}=await q;if(error)return alert(error.message);
  const d=new Date(row.fecha+'T12:00:00');calendarView=new Date(d.getFullYear(),d.getMonth(),1);
  closeCalendarForm();loadCalendar();
}
async function deleteCalendarEvent(id){
  if(!admin()||!confirm('¿Eliminar este evento del calendario?'))return;
  const {error}=await sb.from('calendario').delete().eq('id',id);if(error)return alert(error.message);
  closeCalendarForm();loadCalendar();
}

function reportForm(){return `<h2>Agregar informe</h2><label>Título</label><input id="rtitle" class="field"><label>Tipo</label><select id="rtype" class="field"><option value="equipo">Equipo</option><option value="partido">Partido</option><option value="individual">Individual</option></select><label>Descripción</label><textarea id="rdesc"></textarea><label>Link del PDF (Drive u otro)</label><input id="rurl" class="field"><div class="modal-actions"><button class="secondary" onclick="state.modal=null;render()">Cancelar</button><button class="primary" onclick="saveReport()">Guardar</button></div>`}
async function saveReport(){let {error}=await sb.from('informes').insert({titulo:rtitle.value,tipo:rtype.value,descripcion:rdesc.value,archivo_url:rurl.value,publicado:true});if(error)return alert(error.message);state.modal=null;render()}
async function loadReports(){const {data}=await sb.from('informes').select('*').order('created_at',{ascending:false});let box=document.getElementById('reportsBox');if(box)box.innerHTML=(data||[]).map(r=>`<div class="match-card"><span class="pill">${esc(r.tipo)}</span><h3>${esc(r.titulo)}</h3><p>${esc(r.descripcion||'')}</p>${r.archivo_url?`<a class="secondary" target="_blank" href="${esc(r.archivo_url)}">📄 Abrir informe</a>`:''}</div>`).join('')||'<div class="empty">Todavía no hay informes.</div>'}

async function openShareReport(pid){
  if(!admin())return;
  const p=state.players.find(x=>x.id===pid);if(!p)return;
  const {data:trackings}=await sb.from('seguimiento_individual').select('*').eq('jugador_id',pid).order('fecha',{ascending:false});
  const {data:videos}=await sb.from('videos_jugador').select('*').eq('jugador_id',pid).order('created_at',{ascending:false});
  document.getElementById('shareReportModal')?.remove();
  const html=`<div id="shareReportModal" class="modal-bg" onclick="if(event.target===this)this.remove()"><div class="modal"><div class="eyebrow inline-eye">INFORME COMPARTIBLE</div><h2>${esc(p.nombre)}</h2><p class="muted small">Elegí qué información verá el jugador.</p>
  <label>Título</label><input id="shareTitle" class="field" value="Informe individual · ${esc(p.nombre)}">
  <label>Subtítulo / partido (opcional)</label><input id="shareSubtitle" class="field" placeholder="Ej. vs. Villa Congreso · 27/09/2026">
  <div class="share-checks"><label><input id="showSummary" type="checkbox" checked> Resumen / evolución</label><label><input id="showPositive" type="checkbox" checked> Aspectos positivos</label><label><input id="showImprove" type="checkbox" checked> Aspectos a mejorar</label><label><input id="showSituations" type="checkbox" checked> Seguimientos / situaciones</label><label><input id="showVideo" type="checkbox" checked> Videos</label></div>
  <label>PDF (opcional)</label><input id="sharePdf" class="field" placeholder="Link público al PDF">
  <div class="modal-actions"><button class="secondary" onclick="document.getElementById('shareReportModal').remove()">Cancelar</button><button class="primary" onclick="createSharedReport('${pid}')">Generar enlace</button></div></div></div>`;
  app.insertAdjacentHTML('beforeend',html);
}
async function createSharedReport(pid){
  const p=state.players.find(x=>x.id===pid);if(!p)return;
  const [{data:trackings},{data:videos}]=await Promise.all([
    sb.from('seguimiento_individual').select('*').eq('jugador_id',pid).order('fecha',{ascending:false}),
    sb.from('videos_jugador').select('*').eq('jugador_id',pid).order('created_at',{ascending:false})
  ]);
  const content={
    jugador:{nombre:p.nombre,dorsal:p.dorsal,posicion:p.posicion,foto_url:p.foto_url||''},
    resumen:showSummary.checked?(p.evolucion||p.observacion_general||''):'',
    positivos:showPositive.checked?(p.fortalezas||''):'',
    mejoras:showImprove.checked?(p.aspectos_mejorar||''):'',
    situaciones:showSituations.checked?(trackings||[]).map(x=>({titulo:x.titulo,fecha:x.fecha,descripcion:x.observacion})):[],
    videos:showVideo.checked?(videos||[]).map(x=>({titulo:x.titulo,url:x.video_url})):[]
  };
  const row={tipo:'individual',jugador_id:pid,titulo:shareTitle.value.trim()||`Informe individual · ${p.nombre}`,subtitulo:shareSubtitle.value.trim(),contenido:content,pdf_url:sharePdf.value.trim()||null,activo:true};
  const {data,error}=await sb.from('informes_compartidos').insert(row).select('token').single();
  if(error)return alert(error.message);
  document.getElementById('shareReportModal')?.remove();
  await renderPlayer();
  const link=`${location.origin}${location.pathname}?informe=${data.token}`;
  await copyShareLink(link);
}
async function renderPublicSharedReport(token){
  document.body.classList.add('public-report-body');
  const {data,error}=await sb.rpc('obtener_informe_compartido',{p_token:token});
  const r=Array.isArray(data)?data[0]:data;
  if(r)state.ctx={equipo:{nombre:r.equipo_nombre,escudo_url:r.equipo_escudo}};
  if(error||!r){app.innerHTML=`<main class="public-report"><div class="public-brand">${crestHTML()}<div><b>ANALYST<span>HUB</span></b><small>${esc(CN())}</small></div></div><div class="public-empty"><h2>Informe no disponible</h2><p>El enlace fue desactivado, venció o no es válido.</p></div></main>`;return}
  const c=r.contenido||{},p=c.jugador||{},photo=p.foto_url?`<img class="public-player-photo" src="${esc(p.foto_url)}" alt="${esc(p.nombre||'Jugador')}">`:`<div class="public-player-fallback">${esc(p.dorsal||'—')}</div>`;
  const situations=(c.situaciones||[]).map((x,i)=>`<div class="public-situation"><div class="situation-num">${String(i+1).padStart(2,'0')}</div><div><b>${esc(x.titulo||'Situación')}</b><small>${esc(x.fecha||'')}</small><p>${esc(x.descripcion||'')}</p></div></div>`).join('');
  const videos=(c.videos||[]).map(x=>`<a class="public-video" target="_blank" rel="noopener" href="${esc(x.url)}"><span>▶</span><div><b>${esc(x.titulo||'Video')}</b><small>Abrir clip</small></div></a>`).join('');
  app.innerHTML=`<main class="public-report"><header class="public-brand">${crestHTML()}<div><b>ANALYST<span>HUB</span></b><small>${esc(CN())} · Área de Videoanálisis</small></div></header><section class="public-player-head">${photo}<div><div class="public-kicker">INFORME INDIVIDUAL</div><h1>${esc(p.nombre||r.titulo)}</h1><p>#${esc(p.dorsal||'—')} · ${esc(p.posicion||'Jugador')}</p><small>${esc(r.subtitulo||'')}</small></div></section>${c.resumen?`<section class="public-section"><h2>Resumen</h2><p>${esc(c.resumen)}</p></section>`:''}<div class="public-two">${c.positivos?`<section class="public-card good"><small>ASPECTOS POSITIVOS</small><p>${esc(c.positivos)}</p></section>`:''}${c.mejoras?`<section class="public-card improve"><small>ASPECTOS A MEJORAR</small><p>${esc(c.mejoras)}</p></section>`:''}</div>${situations?`<section class="public-section"><h2>Situaciones</h2><div class="public-situations">${situations}</div></section>`:''}${videos?`<section class="public-section"><h2>Video</h2><div class="public-videos">${videos}</div></section>`:''}${r.pdf_url?`<section class="public-section"><a class="public-pdf" target="_blank" rel="noopener" href="${esc(r.pdf_url)}">📄 <div><b>Informe completo</b><small>Abrir PDF</small></div><span>→</span></a></section>`:''}<footer>${esc(CN())} · Área de Videoanálisis</footer></main>`;
}

// ===== IMPORTAR ACCIONES DE ONCE (XML) =====
function onceTimeToSec(t=''){const p=String(t).split(':');if(p.length!==3)return null;const s=(+p[0])*3600+(+p[1])*60+parseFloat(p[2]);return isNaN(s)?null:+s.toFixed(2)}
function fmtClock(sec){sec=Math.floor(Number(sec)||0);const h=Math.floor(sec/3600),m=Math.floor(sec%3600/60),s=sec%60,ss=String(s).padStart(2,'0');return h?`${h}:${String(m).padStart(2,'0')}:${ss}`:`${m}:${ss}`}
function youtubeIdFrom(url=''){try{const u=new URL(String(url));if(u.hostname==='youtu.be')return u.pathname.slice(1).split('/')[0]||'';if(u.hostname.includes('youtube.com')){if(u.searchParams.get('v'))return u.searchParams.get('v');const m=u.pathname.match(/\/(embed|shorts|live)\/([^/?]+)/);if(m)return m[2]}}catch(e){}return ''}
function youtubeLinkAt(url,sec){const id=youtubeIdFrom(url);return id?`https://youtu.be/${id}?t=${Math.floor(Number(sec)||0)}`:''}
function parseOnceXML(text){
  const doc=new DOMParser().parseFromString(String(text).replace(/^\uFEFF/,''),'application/xml');
  if(doc.getElementsByTagName('parsererror').length)throw new Error('El archivo no es un XML válido.');
  const root=doc.documentElement;
  return [...doc.getElementsByTagName('action')].filter(a=>a.parentElement&&a.parentElement.parentElement===root).map(a=>{
    const inicio=onceTimeToSec(a.getAttribute('startTime')),fin=onceTimeToSec(a.getAttribute('endTime'));
    const resultado=a.getAttribute('isGood')==='True'?'acierto':(a.getAttribute('isBad')==='True'?'error':'neutro');
    return {nombre:(a.getAttribute('actionName')||'').trim(),tipo:a.getAttribute('actionType')||'',inicio_seg:inicio,fin_seg:fin,resultado};
  }).filter(r=>r.inicio_seg!==null).sort((x,y)=>x.inicio_seg-y.inicio_seg);
}
function importOnceXML(mid){
  if(!admin())return;
  const inp=document.createElement('input');inp.type='file';inp.accept='.xml,text/xml,application/xml';
  inp.onchange=async()=>{
    const f=inp.files[0];if(!f)return;
    try{
      const rows=parseOnceXML(await f.text());
      if(!rows.length)return alert('No encontré acciones en ese archivo.');
      const {count}=await sb.from('acciones_importadas').select('id',{count:'exact',head:true}).eq('partido_id',mid);
      if(count&&!confirm(`Este partido ya tiene ${count} acciones importadas. ¿Reemplazarlas por las ${rows.length} del archivo nuevo?`))return;
      if(count){const d=await sb.from('acciones_importadas').delete().eq('partido_id',mid);if(d.error)return alert(d.error.message)}
      const ins=await sb.from('acciones_importadas').insert(rows.map(r=>({...r,partido_id:mid})));
      if(ins.error)return alert(ins.error.message);
      alert(`Listo: se importaron ${rows.length} acciones.`);
      loadImportedActions(mid);
    }catch(e){alert('No se pudo importar: '+e.message)}
  };
  inp.click();
}
async function setAnalysisVideo(mid){
  if(!admin())return;
  const m=state.matches.find(x=>x.id===mid);
  let url=prompt('Pegá el link de YouTube del partido (el no listado):',m?.video_analisis_url||'');
  if(url===null)return;url=url.trim();
  if(url&&!youtubeIdFrom(url))return alert('Ese link no parece ser de YouTube.');
  const {error}=await sb.from('partidos').update({video_analisis_url:url||null}).eq('id',mid);
  if(error)return alert('No se pudo guardar: '+error.message);
  if(m)m.video_analisis_url=url||null;
  loadImportedActions(mid);
}
async function loadImportedActions(mid){
  const box=document.getElementById('onceBox');if(!box||!admin())return;
  const m=state.matches.find(x=>x.id===mid);
  const {data,error}=await sb.from('acciones_importadas').select('*').eq('partido_id',mid).order('inicio_seg');
  if(error){box.innerHTML=`<div class="empty">No se pudieron cargar las acciones: ${esc(error.message)}</div>`;return}
  const list=data||[];
  const ytUrl=m?.video_analisis_url||'';const hasYT=!!youtubeIdFrom(ytUrl);
  const n=r=>list.filter(x=>x.resultado===r).length;
  const color={acierto:'#3ecf8e',error:'#ef5b6b',neutro:'#8a94a3'};
  const rows=list.map(x=>{const link=hasYT?youtubeLinkAt(ytUrl,x.inicio_seg):'';return `<div class="panel" style="display:flex;gap:12px;align-items:center;padding:8px 12px;margin:6px 0"><span class="pill">${fmtClock(x.inicio_seg)}</span><i style="width:10px;height:10px;border-radius:50%;background:${color[x.resultado]||color.neutro};flex:none"></i><div style="flex:1;min-width:0"><b>${esc(x.nombre||'Sin nombre')}</b> <span class="muted small">${esc(x.tipo||'')} · ${Math.max(0,Math.round((x.fin_seg||x.inicio_seg)-x.inicio_seg))} s</span></div>${link?`<a class="secondary" target="_blank" rel="noopener" href="${esc(link)}">▶ Ver</a>`:''}</div>`}).join('');
  box.innerHTML=`<div class="section-head"><div><div class="eyebrow inline-eye">IMPORTAR DATOS</div><h2>Acciones del partido</h2><p class="muted small">${list.length?`${list.length} acciones · ${n('acierto')} verdes · ${n('error')} rojas · ${n('neutro')} sin marcar`:'Todavía no importaste el XML de Once para este partido.'}</p></div><div class="actions"><button class="secondary" onclick="setAnalysisVideo('${mid}')">${hasYT?'✓ Link de YouTube':'▶ Link de YouTube'}</button><button class="secondary" onclick="importOnceXML('${mid}')">⬆ XML de Once</button><button class="primary" onclick="importNacsportXML('${mid}')">⬆ Importar XML</button></div></div>${list.length&&!hasYT?'<div class="empty">Para abrir cada jugada en su minuto, apretá el botón «Link de YouTube» y pegá el link del partido en YouTube.</div>':''}${list.length?`<details><summary class="muted">Ver las ${list.length} acciones</summary><div style="max-height:460px;overflow:auto;margin-top:8px">${rows}</div></details>`:''}`;
}


// =====================================================================
// V2 · DATOS — acciones clasificadas en las 4 canchas + ABP
// Para cambiar acciones o resultados, editar solo ACTION_CATALOG.
// Cada resultado tiene una valoración: 'pos' (éxito), 'neu' (neutro) o 'neg' (negativo).
// El % de éxito de una acción = resultados 'pos' / total de esa acción.
// =====================================================================
const ACTION_CATALOG={
 defensivo:[
  {id:'presion_alta',label:'Presión alta',res:[['recuperamos','Recuperamos','pos'],['pelota_larga','Forzamos pelota larga','pos'],['falta','Falta','neu'],['retrocedemos','Retrocedemos','neu'],['nos_superan','Nos superan','neg'],['error','Error','neg']]},
  {id:'bloque_medio',label:'Bloque medio',res:[['recuperamos','Recuperamos','pos'],['forzamos_atras','Forzamos atrás','pos'],['falta','Falta','neu'],['nos_superan','Nos superan','neg'],['error','Error','neg']]},
  {id:'repliegue',label:'Repliegue',res:[['ordenados','Llegamos ordenados','pos'],['cortamos','Cortamos','pos'],['falta_tactica','Falta táctica','neu'],['superioridad','Llegan en superioridad','neg'],['remate_rival','Remate rival','neg']]},
  {id:'transicion_def',label:'Transición defensiva',res:[['recuperamos','Recuperamos','pos'],['temporizamos','Temporizamos','pos'],['falta_tactica','Falta táctica','neu'],['nos_superan','Nos superan','neg'],['remate_rival','Remate rival','neg']]},
  {id:'duelo_def',label:'Duelos defensivos',res:[['ganado','Ganado','pos'],['despeje','Despeje','pos'],['falta','Falta','neu'],['perdido','Perdido','neg'],['error','Error','neg']]}
 ],
 ofensivo:[
  {id:'salida',label:'Salida / construcción',res:[['progresamos','Progresamos','pos'],['saltamos_linea','Saltamos línea','pos'],['volvemos','Volvemos atrás','neu'],['pelota_larga','Pelota larga','neu'],['perdida','Pérdida','neg'],['error','Error','neg']]},
  {id:'transicion_rapida',label:'Transición rápida',res:[['remate','Remate','pos'],['sin_remate','Llega sin remate','neu'],['falta_recibida','Falta recibida','neu'],['perdida','Pérdida','neg'],['error','Error','neg']]},
  {id:'ataque_posicional',label:'Ataque posicional',res:[['remate','Remate','pos'],['llegada_area','Llegada al área','pos'],['sin_remate','Sin remate','neu'],['falta_recibida','Falta recibida','neu'],['perdida','Pérdida','neg'],['error','Error','neg']]},
  {id:'centro',label:'Centros',res:[['remate','Remate','pos'],['segunda_jugada','Segunda jugada','neu'],['corner','Córner ganado','neu'],['rechazado','Rechazado','neg'],['error','Sin destinatario','neg']]},
  {id:'finalizacion',label:'Finalización',res:[['gol','Gol','pos'],['al_arco','Al arco','pos'],['bloqueado','Bloqueado','neu'],['afuera','Afuera','neg'],['error','Mala definición','neg']]}
 ]
};
const VAL_LABEL={pos:'Éxito',neu:'Neutro',neg:'Negativo'};
const SERIES_A='#2f8fdc',SERIES_B='#c0802a';
let dataWindow=5,dataCond='todos',dataFocus='ataque_posicional',dataCompare=null;

function allActions(){return [...ACTION_CATALOG.defensivo.map(a=>({...a,fase:'defensivo'})),...ACTION_CATALOG.ofensivo.map(a=>({...a,fase:'ofensivo'}))]}
function actionDef(id){return allActions().find(a=>a.id===id)}
function resultDef(aid,rid){return actionDef(aid)?.res.find(r=>r[0]===rid)}
function valenceOf(aid,rid){return resultDef(aid,rid)?.[2]||null}
function catFromValence(v){return v==='pos'?'acierto':v==='neg'?'error':'situacion'}
function markerTip(k){const a=actionDef(k.accion),r=resultDef(k.accion,k.resultado);return [a?.label,r?.[1],k.titulo].filter(Boolean).join(' · ')||k.categoria||'Situación'}
function markerPills(k){const a=actionDef(k.accion),r=resultDef(k.accion,k.resultado);return a?`<span class="pill">${esc(a.label)}</span> <span class="pill vpill v-${valenceOf(k.accion,k.resultado)||'neu'}">${esc(r?.[1]||'')}</span>`:`<span class="pill">${esc(k.categoria||'situacion')}</span>`}

// ---------- Formulario para cargar / editar un punto en las canchas ----------
function openMarkerForm(k={}){
 const f=window.__mk||{};document.getElementById('markerFormModal')?.remove();
 const group=(fase,title)=>`<optgroup label="${title}">${ACTION_CATALOG[fase].map(a=>`<option value="${a.id}" ${k.accion===a.id?'selected':''}>${esc(a.label)}</option>`).join('')}</optgroup>`;
 const first=f.tipo==='ofensivo'?['ofensivo','defensivo']:['defensivo','ofensivo'];
 const sel=k.id?(k.accion||''):(k.accion??ACTION_CATALOG[first[0]][0].id);
 app.insertAdjacentHTML('beforeend',`<div id="markerFormModal" class="modal-bg" onclick="if(event.target===this)closeMarkerForm()"><div class="modal mk-modal"><span class="pill">${f.tipo==='ofensivo'?'CANCHA OFENSIVA':'CANCHA DEFENSIVA'}</span><h2>${k.id?'Editar acción':'Nueva acción'}</h2>
 <label for="mkAccion">Acción</label><select id="mkAccion" onchange="mkRenderResults()">${group(first[0],first[0]==='defensivo'?'Defensivas':'Ofensivas')}${group(first[1],first[1]==='defensivo'?'Defensivas':'Ofensivas')}<option value="">Otra situación (sin clasificar)</option></select>
 <label>Resultado</label><div id="mkResults" class="mk-results"></div>
 <label for="mkTitulo">Título <span class="muted">(opcional)</span></label><input id="mkTitulo" class="field" value="${esc(k.titulo||'')}" placeholder="Ej. Presión tras saque de arco">
 <label for="mkDesc">Lo observado</label><textarea id="mkDesc" placeholder="Qué pasó y por qué">${esc(k.descripcion||'')}</textarea>
 <label for="mkVideo">Link del clip <span class="muted">(opcional)</span></label><input id="mkVideo" class="field" value="${esc(k.video_url||'')}" placeholder="Dropbox / YouTube">
 <div class="modal-actions"><button class="secondary" onclick="closeMarkerForm()">Cancelar</button><button class="primary" onclick="saveMarkerForm()">Guardar</button></div></div></div>`);
 document.getElementById('mkAccion').value=sel;window.__mkPrev=k;mkRenderResults();
}
function mkRenderResults(){
 const aid=document.getElementById('mkAccion').value,k=window.__mkPrev||{},box=document.getElementById('mkResults');
 const opts=aid?actionDef(aid).res.map(([id,label,v])=>({id,label,v})):[{id:'acierto',label:'Acierto',v:'pos'},{id:'situacion',label:'Situación',v:'neu'},{id:'error',label:'Error',v:'neg'}];
 const cur=aid?(k.accion===aid?k.resultado:null):k.categoria;
 box.innerHTML=opts.map((o,i)=>`<label class="mk-chip v-${o.v}"><input type="radio" name="mkRes" value="${o.id}" ${(cur?cur===o.id:i===0)?'checked':''}><span>${esc(o.label)}</span></label>`).join('');
}
function closeMarkerForm(){document.getElementById('markerFormModal')?.remove()}
async function saveMarkerForm(){
 const f=window.__mk||{},accion=document.getElementById('mkAccion').value,r=document.querySelector('input[name=mkRes]:checked');if(!r)return alert('Elegí un resultado.');
 const resultado=accion?r.value:null,categoria=accion?catFromValence(valenceOf(accion,resultado)):r.value;
 const row={categoria,accion:accion||null,resultado,titulo:document.getElementById('mkTitulo').value.trim(),descripcion:document.getElementById('mkDesc').value.trim(),video_url:document.getElementById('mkVideo').value.trim()};
 const {error}=f.id?await sb.from('marcadores_tacticos').update(row).eq('id',f.id):await sb.from('marcadores_tacticos').insert({...row,mapa_id:f.mapId,x:+(+f.x).toFixed(2),y:+(+f.y).toFixed(2)});
 if(error){if(/accion|resultado/i.test(error.message))return alert('Falta actualizar la base de datos: corré en Supabase el archivo sql/v2_datos.sql (agrega las columnas accion y resultado).');return alert(error.message)}
 closeMarkerForm();closeTacticalMarkerModal();renderTeamAnalysis();
}

// ---------- Tooltip compartido por todos los gráficos ----------
function ensureChartTip(){if(window.__tipReady)return;window.__tipReady=true;const t=document.createElement('div');t.id='chartTip';t.className='chart-tip';document.body.appendChild(t);
 document.addEventListener('mousemove',e=>{const el=e.target.closest?.('[data-tip]');if(!el){t.style.opacity=0;return}t.innerHTML=el.getAttribute('data-tip');t.style.opacity=1;const w=t.offsetWidth,h=t.offsetHeight;let x=e.clientX+14,y=e.clientY+14;if(x+w>innerWidth-8)x=e.clientX-w-14;if(y+h>innerHeight-8)y=e.clientY-h-14;t.style.left=x+'px';t.style.top=y+'px'});
 document.addEventListener('scroll',()=>{t.style.opacity=0},true);document.addEventListener('click',()=>{t.style.opacity=0},true)}

// ---------- Cálculos ----------
function agg(list){const o={pos:0,neu:0,neg:0,total:0};list.forEach(a=>{o[a.val]++;o.total++});o.pct=o.total?Math.round(o.pos/o.total*100):null;return o}
function abpVal(p){return p.resultado==='acierto'?'pos':p.resultado==='error'?'neg':'neu'}
function pctTxt(p){return p==null?'—':p+'%'}
function shortMatch(m){return `${esc(m.rival)} ${m.goles_jn??''}-${m.goles_rival??''}`}
function dataAxes(c){
 const axes=allActions().filter(a=>c.acts.some(x=>x.accion===a.id)).map(a=>({key:a.id,label:a.label,list:x=>x.acts.filter(y=>y.accion===a.id)}));
 if(c.abp.some(p=>(p.lado||'favor')==='favor'))axes.push({key:'abp_favor',label:'ABP a favor',list:x=>x.abp.filter(p=>(p.lado||'favor')==='favor').map(p=>({val:abpVal(p)}))});
 if(c.abp.some(p=>p.lado==='contra'))axes.push({key:'abp_contra',label:'ABP en contra',list:x=>x.abp.filter(p=>p.lado==='contra').map(p=>({val:abpVal(p)}))});
 return axes;
}
function forMatch(c,pid){return {acts:c.acts.filter(a=>a.pid===pid),abp:c.abp.filter(p=>p.pid===pid)}}

// ---------- Carga ----------
function openData(){state.page='data';renderData()}
async function renderData(){
 ensureChartTip();
 app.innerHTML=shell(`<div class="eyebrow">DATOS DEL EQUIPO</div><h1 class="title">Datos</h1><div class="empty">Cargando datos…</div>`,'Datos');
 let ms=[...state.matches].filter(m=>m.fecha).sort((a,b)=>String(a.fecha).localeCompare(String(b.fecha)));
 if(dataCond!=='todos')ms=ms.filter(m=>String(m.condicion||'').toLowerCase()===dataCond);
 if(dataWindow)ms=ms.slice(-dataWindow);
 const ids=ms.map(m=>m.id);let maps=[],mk=[],am=[],ap=[];
 if(ids.length){
  const [r1,r2]=await Promise.all([sb.from('mapas_tacticos').select('*').in('partido_id',ids),sb.from('abp_mapas_equipo').select('*').in('partido_id',ids)]);
  maps=r1.data||[];am=r2.data||[];
  const [r3,r4]=await Promise.all([maps.length?sb.from('marcadores_tacticos').select('*').in('mapa_id',maps.map(x=>x.id)):Promise.resolve({data:[]}),am.length?sb.from('abp_puntos_equipo').select('*').in('mapa_id',am.map(x=>x.id)):Promise.resolve({data:[]})]);
  mk=r3.data||[];ap=r4.data||[];
 }
 const mm=Object.fromEntries(maps.map(x=>[x.id,x.partido_id])),aa=Object.fromEntries(am.map(x=>[x.id,x.partido_id]));
 state.dataCache={ms,acts:mk.filter(k=>k.accion&&actionDef(k.accion)).map(k=>({...k,pid:mm[k.mapa_id],val:valenceOf(k.accion,k.resultado)||'neu'})),abp:ap.map(p=>({...p,pid:aa[p.mapa_id]})),unclassified:mk.filter(k=>!k.accion).length};
 if(!ms.some(m=>m.id===dataCompare))dataCompare=ms.length?ms[ms.length-1].id:null;
 drawData();
}

// ---------- Dibujo ----------
function drawData(){
 const c=state.dataCache;if(!c)return renderData();
 const btn=(on,label,js)=>`<button class="${on?'primary':'secondary'}" onclick="${js}">${label}</button>`;
 const filters=`<div class="data-filters"><div class="seg">${btn(dataWindow===5,'Últimos 5','dataWindow=5;renderData()')}${btn(dataWindow===10,'Últimos 10','dataWindow=10;renderData()')}${btn(dataWindow===0,'Todos','dataWindow=0;renderData()')}</div><div class="seg">${btn(dataCond==='todos','Todos','dataCond=\'todos\';renderData()')}${btn(dataCond==='local','Local','dataCond=\'local\';renderData()')}${btn(dataCond==='visitante','Visitante','dataCond=\'visitante\';renderData()')}</div></div>`;
 const head=`<div class="eyebrow">DATOS DEL EQUIPO</div><div class="toolbar"><div><h1 class="title">Datos</h1><p class="muted">Se calculan solos con las acciones marcadas en las 4 canchas y en la ABP de cada análisis propio · ${c.ms.length} partido${c.ms.length===1?'':'s'}</p></div>${filters}</div>`;
 if(!c.acts.length&&!c.abp.length){app.innerHTML=shell(head+`<div class="empty data-empty"><b>Todavía no hay acciones clasificadas en estos partidos.</b><br>Entrá a un análisis propio, hacé clic en una de las 4 canchas y elegí la acción (presión alta, transición rápida…) y su resultado. Cada punto suma acá automáticamente.${c.unclassified?`<br><span class="muted small">Hay ${c.unclassified} punto${c.unclassified===1?'':'s'} viejo${c.unclassified===1?'':'s'} sin acción asignada: editalos para que cuenten.</span>`:''}</div>`,'Datos');return}

 // KPIs
 const all=agg(c.acts),recIds=['presion_alta','bloque_medio','transicion_def'];
 const rec=c.acts.filter(a=>recIds.includes(a.accion)&&a.val==='pos'),recHigh=rec.filter(a=>+a.y<50).length;
 const pa=agg(c.acts.filter(a=>a.accion==='presion_alta')),tr=agg(c.acts.filter(a=>a.accion==='transicion_rapida'));
 const n=c.ms.length||1;
 const kpi=(label,val,sub,tip)=>`<div class="stat kpi" ${tip?`data-tip="${esc(tip)}"`:''}><small>${label}</small><b>${val}</b><span>${sub}</span></div>`;
 const kpis=`<div class="stats kpis">${kpi('ACCIONES',all.total,`${(all.total/n).toFixed(1)} por partido`)}${kpi('ÉXITO GLOBAL',pctTxt(all.pct),`${all.pos} de ${all.total} con resultado positivo`)}${kpi('RECUPERACIONES',rec.length,`${recHigh} en campo rival`,'Presión alta + bloque medio + transición defensiva con resultado positivo')}${kpi('PRESIÓN ALTA',pctTxt(pa.pct),`recuperamos ${pa.pos} de ${pa.total}`)}${kpi('TRANSICIÓN → REMATE',pctTxt(tr.pct),`${tr.pos} de ${tr.total} transiciones`)}</div>`;

 // Araña de la acción elegida: cada punta es un resultado (% sobre el total de esa acción)
 if(!actionDef(dataFocus))dataFocus=allActions()[0].id;
 const fa=actionDef(dataFocus),fl=c.acts.filter(a=>a.accion===dataFocus),fg=agg(fl);
 const cm=c.ms.find(m=>m.id===dataCompare),cl=cm?fl.filter(a=>a.pid===cm.id):[];
 const share=(list,id)=>{const k=list.filter(a=>a.resultado===id).length;return {pct:list.length?Math.round(k/list.length*100):0,k,total:list.length}};
 const raxes=fa.res.map(([id,label,v])=>({key:id,label,v}));
 const series=[{name:`Promedio · ${c.ms.length} partidos`,color:SERIES_B,vals:raxes.map(a=>share(fl,a.key))}];
 if(cm)series.push({name:`vs ${cm.rival}`,color:SERIES_A,vals:raxes.map(a=>share(cl,a.key))});
 const actSelect=`<select class="mini-select" onchange="dataFocus=this.value;drawData()">${['defensivo','ofensivo'].map(f=>`<optgroup label="${f==='defensivo'?'Defensivas':'Ofensivas'}">${ACTION_CATALOG[f].map(a=>`<option value="${a.id}" ${a.id===dataFocus?'selected':''}>${esc(a.label)}</option>`).join('')}</optgroup>`).join('')}</select>`;
 const cmpSelect=`<select class="mini-select" onchange="dataCompare=this.value;drawData()">${[...c.ms].reverse().map(m=>`<option value="${m.id}" ${m.id===dataCompare?'selected':''}>vs ${esc(m.rival)} · ${fmtDate(m.fecha)}</option>`).join('')}</select>`;
 const radar=fl.length?radarSVG(raxes,series):`<div class="empty">Todavía no hay acciones de ${esc(fa.label)} en estos partidos.</div>`;
 const radarPanel=`<div class="panel chart-panel"><div class="sec-title"><h3>Araña · cómo terminan las acciones</h3><div class="radar-controls">${actSelect}${cmpSelect}</div></div>${radar}<div class="chart-legend">${series.map(s=>`<span><i style="background:${s.color}"></i>${esc(s.name)}${s.vals[0]?` · n ${s.vals[0].total}`:''}</span>`).join('')}</div><p class="muted small chart-note">Cada punta es un resultado posible de la acción: % sobre el total de ${esc(fa.label.toLowerCase())}. Punto verde = éxito, gris = neutro, rojo = negativo.</p></div>`;

 // Acción en números
 const outcome=fa.res.map(([id,label,v])=>{const k=fl.filter(a=>a.resultado===id).length;return `<div class="outcome v-${v}"><i></i><span>${esc(label)}</span><b>${k}</b><em>${fl.length?Math.round(k/fl.length*100):0}%</em></div>`}).join('');
 const trend=lineSVG(c.ms.map(m=>{const g=agg(fl.filter(a=>a.pid===m.id));return {label:esc(m.rival),date:fmtDate(m.fecha),pct:g.pct,n:g.total,pos:g.pos}}));
 const focusPanel=`<div class="panel chart-panel"><div class="sec-title"><h3>${esc(fa.label)} en números</h3><span class="muted small">${fa.fase==='defensivo'?'Acción defensiva':'Acción ofensiva'}</span></div>
  <div class="focus-head"><div><b>${pctTxt(fg.pct)}</b><span>de éxito · ${fg.total} acciones</span></div>${stackBar(fg,fa.label)}</div><div class="outcomes">${outcome}</div>
  <div class="sub-title">Evolución partido a partido · % de éxito</div>${trend}</div>`;

 // Desglose por acción
 const rows=allActions().map(a=>({a,g:agg(c.acts.filter(x=>x.accion===a.id))})).filter(r=>r.g.total);
 const maxN=Math.max(...rows.map(r=>r.g.total),1);
 const breakdown=`<div class="panel chart-panel"><div class="sec-title"><h3>Desglose por acción</h3><div class="chart-legend inline">${['pos','neu','neg'].map(v=>`<span><i class="vbg-${v}"></i>${VAL_LABEL[v]}</span>`).join('')}</div></div><div class="bars">${rows.map(({a,g})=>`<div class="bar-row ${a.id===dataFocus?'is-focus':''}" onclick="dataFocus='${a.id}';drawData()"><span class="bar-label">${esc(a.label)}<em>${a.fase==='defensivo'?'DEF':'OF'}</em></span><div class="bar-track"><div class="bar-fill" style="width:${g.total/maxN*100}%">${['pos','neu','neg'].filter(v=>g[v]).map(v=>`<i class="vbg-${v}" style="flex:${g[v]}" data-tip="<b>${esc(a.label)}</b><br>${VAL_LABEL[v]}: ${g[v]} de ${g.total}"></i>`).join('')}</div></div><span class="bar-val"><b>${pctTxt(g.pct)}</b> <small>n ${g.total}</small></span></div>`).join('')}</div><p class="muted small chart-note">Largo de la barra = cantidad de acciones · % = éxito. Tocá una fila para verla en detalle.</p></div>`;

 // Zonas
 const zonesPanel=`<div class="panel chart-panel"><div class="sec-title"><h3>Dónde ocurre · ${esc(fa.label)}</h3><span class="muted small">${esc(CS())} ataca →</span></div>${zoneMap(fl)}<p class="muted small chart-note">Cada zona muestra cantidad de acciones y % de éxito. Más oscuro = más acciones.</p></div>`;

 // Tabla por partido
 const axes=dataAxes(c),avgVals=axes.map(a=>agg(a.list(c))),tcols=axes;
 const table=`<div class="panel chart-panel"><div class="sec-title"><h3>Partido a partido</h3><span class="muted small">% de éxito (cantidad)</span></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Partido</th><th>Acc.</th><th>Éxito</th>${tcols.map(a=>`<th>${esc(a.label)}</th>`).join('')}</tr></thead><tbody>${[...c.ms].reverse().map(m=>{const d=forMatch(c,m.id),g=agg(d.acts);return `<tr><td><span class="t-score ${resultClass(m)}">${m.goles_jn??'-'}-${m.goles_rival??'-'}</span> ${esc(m.rival)} <small>${fmtDate(m.fecha)}</small></td><td>${g.total}</td><td><b>${pctTxt(g.pct)}</b></td>${tcols.map(a=>{const x=agg(a.list(d));return `<td class="${x.pct==null?'na':x.pct>=60?'hi':x.pct<40?'lo':''}">${x.total?`${x.pct}% <small>(${x.total})</small>`:'—'}</td>`}).join('')}</tr>`}).join('')}</tbody><tfoot><tr><td>Promedio</td><td>${all.total}</td><td><b>${pctTxt(all.pct)}</b></td>${avgVals.map(x=>`<td>${x.total?`${x.pct}% <small>(${x.total})</small>`:'—'}</td>`).join('')}</tr></tfoot></table></div></div>`;

 const note=c.unclassified?`<p class="muted small">${c.unclassified} punto${c.unclassified===1?'':'s'} de las canchas no tiene${c.unclassified===1?'':'n'} acción asignada y no entra${c.unclassified===1?'':'n'} en los números.</p>`:'';
 app.innerHTML=shell(`${head}${kpis}<div class="data-grid">${radarPanel}${focusPanel}</div><div class="data-grid">${breakdown}${zonesPanel}</div>${table}${note}`,'Datos');
}

function stackBar(g,label){if(!g.total)return '<div class="stackbar empty-bar"></div>';return `<div class="stackbar">${['pos','neu','neg'].filter(v=>g[v]).map(v=>`<i class="vbg-${v}" style="flex:${g[v]}" data-tip="<b>${esc(label)}</b><br>${VAL_LABEL[v]}: ${g[v]} (${Math.round(g[v]/g.total*100)}%)"></i>`).join('')}</div>`}

function radarSVG(axes,series){
 const W=500,H=400,cx=W/2,cy=H/2+2,R=132,N=axes.length;
 const top=Math.max(...series.flatMap(s=>s.vals.map(v=>v.pct)),10),max=Math.min(100,Math.ceil(top/10)*10);
 const ang=i=>-Math.PI/2+i*2*Math.PI/N,pt=(i,v)=>[cx+Math.cos(ang(i))*R*v/max,cy+Math.sin(ang(i))*R*v/max];
 const vcol={pos:'#3ecf8e',neu:'#7c8a97',neg:'#ef5b6b'};
 let g=`<svg class="radar" viewBox="0 0 ${W} ${H}" role="img" aria-label="Araña de resultados de la acción">`;
 [.25,.5,.75,1].forEach(f=>{g+=`<polygon points="${axes.map((_,i)=>pt(i,max*f).join(',')).join(' ')}" fill="none" stroke="#263442" stroke-width="1"/>`});
 axes.forEach((a,i)=>{const [x,y]=pt(i,max);g+=`<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="#263442" stroke-width="1"/>`;
  const [lx,ly]=pt(i,max*(1+18/R)),co=Math.cos(ang(i)),si=Math.sin(ang(i)),anchor=co>.25?'start':co<-.25?'end':'middle',dy=si>.3?12:si<-.3?-4:4;
  const words=a.label.split(' '),lines=a.label.length>14&&words.length>1?[words.slice(0,Math.ceil(words.length/2)).join(' '),words.slice(Math.ceil(words.length/2)).join(' ')]:[a.label];
  const ty=ly+dy-(lines.length-1)*(si<-.3?11:si>.3?0:5.5);
  const dotX=anchor==='start'?lx-8:anchor==='end'?lx+8:null;
  if(a.v)g+=dotX!=null?`<circle cx="${dotX}" cy="${ty-4}" r="3.5" fill="${vcol[a.v]}"/>`:`<circle cx="${lx}" cy="${si<0?ty-16:ty-16}" r="3.5" fill="${vcol[a.v]}"/>`;
  g+=`<text x="${lx}" y="${ty}" text-anchor="${anchor}" class="radar-label">${lines.map((l,j)=>`<tspan x="${lx}" dy="${j?11:0}">${esc(l)}</tspan>`).join('')}</text>`});
 [.5,1].forEach(f=>{g+=`<text x="${cx+4}" y="${cy-R*f+11}" class="radar-tick">${Math.round(max*f)}%</text>`});
 series.forEach(s=>{g+=`<polygon points="${s.vals.map((v,i)=>pt(i,v.pct||0).join(',')).join(' ')}" fill="${s.color}" fill-opacity=".14" stroke="${s.color}" stroke-width="2" stroke-linejoin="round"/>`});
 series.forEach(s=>s.vals.forEach((v,i)=>{const [x,y]=pt(i,v.pct||0);const tip=`<b>${esc(axes[i].label)}</b><br><i style='background:${s.color}'></i>${esc(s.name)}: ${v.total?`${v.pct}% · ${v.k} de ${v.total}`:'sin datos'}`;g+=`<circle cx="${x}" cy="${y}" r="4" fill="${s.color}" stroke="#10161d" stroke-width="2"/><circle cx="${x}" cy="${y}" r="12" fill="transparent" data-tip="${esc(tip)}"/>`}));
 return g+'</svg>';
}
function lineSVG(pts){
 const W=560,H=170,L=40,Rr=34,T=12,B=34,iw=W-L-Rr,ih=H-T-B,n=pts.length;
 if(!n)return '<div class="empty">Sin partidos.</div>';
 const X=i=>L+(n===1?iw/2:i*iw/(n-1)),Y=p=>T+ih-(p/100)*ih;
 let s=`<svg class="linechart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Evolución del porcentaje de éxito">`;
 [0,50,100].forEach(v=>{s+=`<line x1="${L}" x2="${W-Rr}" y1="${Y(v)}" y2="${Y(v)}" stroke="#1f2b36" stroke-width="1" ${v===50?'stroke-dasharray="3 4"':''}/><text x="${L-6}" y="${Y(v)+3}" text-anchor="end" class="axis-t">${v}%</text>`});
 let path='',open=false;pts.forEach((p,i)=>{if(p.pct==null){open=false;return}path+=`${open?'L':'M'}${X(i)},${Y(p.pct)} `;open=true});
 if(path)s+=`<path d="${path}" fill="none" stroke="${SERIES_A}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
 const colW=n>1?iw/(n-1):iw;
 pts.forEach((p,i)=>{s+=`<text x="${X(i)}" y="${H-18}" text-anchor="middle" class="axis-t">${p.label.length>11?p.label.slice(0,10)+'…':p.label}</text><text x="${X(i)}" y="${H-6}" text-anchor="middle" class="axis-t dim">${p.date.split(' ')[1]||''}</text>`;
  if(p.pct!=null)s+=`<circle cx="${X(i)}" cy="${Y(p.pct)}" r="4" fill="${SERIES_A}" stroke="#10161d" stroke-width="2"/>`;
  s+=`<rect x="${X(i)-colW/2}" y="${T}" width="${colW}" height="${ih}" fill="transparent" data-tip="<b>vs ${p.label}</b> · ${esc(p.date)}<br>${p.n?`${p.pct}% de éxito · ${p.pos} de ${p.n}`:'sin acciones de este tipo'}"/>`});
 return s+'</svg>';
}

function zoneMap(list){
 const cells=[];for(let r=0;r<3;r++)for(let col=0;col<3;col++)cells.push({r,col,items:[]});
 list.forEach(a=>{const h=vToH(a.x,a.y),col=Math.min(2,Math.floor(h.l/33.34)),r=Math.min(2,Math.floor(h.t/33.34));cells[r*3+col].items.push(a)});
 const max=Math.max(...cells.map(c=>c.items.length),1),tercio=['Tercio propio','Tercio medio','Último tercio'],carril=['Carril izquierdo','Carril central','Carril derecho'];
 return `<div class="football-pitch tactical-pitch-h zone-pitch">${pitchLinesH()}<div class="zone-grid">${cells.map(c=>{const g=agg(c.items),a=c.items.length/max;return `<div class="zone-cell" style="background:rgba(47,143,220,${(a*.55).toFixed(2)})" data-tip="<b>${tercio[c.col]} · ${carril[c.r]}</b><br>${g.total} acciones${g.total?` · ${g.pct}% de éxito`:''}">${g.total?`<b>${g.total}</b><span>${g.pct}%</span>`:''}</div>`}).join('')}</div>${list.map(a=>{const h=vToH(a.x,a.y);return `<i class="zone-dot v-${a.val}" style="left:${h.l}%;top:${h.t}%"></i>`}).join('')}</div>${attackBar()}`;
}

// =====================================================================
// V2 · IMPORTAR XML DE NACSPORT
// Botonera: Categoría = acción (mismo nombre que en ACTION_CATALOG)
//           Descriptores = resultado + zona (+ cualquier otro, ej. jugador, que se guarda como texto)
// Zonas: 9 descriptores "<Tercio> <Carril>" según el sentido de ataque del equipo propio.
// Reimportar reemplaza solo los puntos que vinieron de Nacsport en ese partido.
// =====================================================================
const NAC_ZONES={tercio:{'propio':83,'medio':50,'ultimo':17},carril:{'izq':17,'centro':50,'der':83}};
const NAC_ZONE_LIST=['Propio Izq','Propio Centro','Propio Der','Medio Izq','Medio Centro','Medio Der','Último Izq','Último Centro','Último Der'];
// Zona por defecto si el clip no tiene descriptor de zona
const NAC_DEFAULT_ZONE={presion_alta:'Último Centro',bloque_medio:'Medio Centro',repliegue:'Propio Centro',transicion_def:'Medio Centro',duelo_def:'Medio Centro',salida:'Propio Centro',transicion_rapida:'Medio Centro',ataque_posicional:'Último Centro',centro:'Último Der',finalizacion:'Último Centro'};
function nacNorm(s=''){return String(s).normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim()}
function nacFindAction(code){const n=nacNorm(code);return allActions().find(a=>nacNorm(a.label)===n||nacNorm(a.id)===n)}
function nacFindResult(a,txt){const n=nacNorm(txt);return a.res.find(([id,label])=>nacNorm(label)===n||nacNorm(id)===n)}
function nacZoneXY(txt){const n=nacNorm(txt).split(' ');if(n.length!==2)return null;const t=NAC_ZONES.tercio[n[0]],c=NAC_ZONES.carril[n[1]];if(t==null||c==null)return null;return {x:c,y:t}}
function parseNacsportXML(text){
 const doc=new DOMParser().parseFromString(String(text).replace(/^﻿/,''),'application/xml');
 if(doc.getElementsByTagName('parsererror').length)throw new Error('El archivo no es un XML válido.');
 const kid=(el,tag)=>[...el.children].find(c=>c.tagName.toLowerCase()===tag);
 return [...doc.getElementsByTagName('instance')].map(i=>{
  const num=t=>{const v=kid(i,t)?.textContent?.trim();if(!v)return null;return v.includes(':')?onceTimeToSec(v):parseFloat(v)};
  return {code:(kid(i,'code')?.textContent||'').trim(),start:num('start'),end:num('end'),labels:[...i.children].filter(c=>c.tagName.toLowerCase()==='label').map(l=>({group:(kid(l,'group')?.textContent||'').trim(),text:(kid(l,'text')?.textContent||'').trim()})).filter(l=>l.text)};
 }).filter(r=>r.code);
}
function nacBuildMarkers(rows,ytUrl){
 const out=[],unknown={},noResult=[];
 rows.forEach(r=>{
  const a=nacFindAction(r.code);if(!a){unknown[r.code]=(unknown[r.code]||0)+1;return}
  let res=null,zone=null;const extra=[];
  r.labels.forEach(l=>{const rr=nacFindResult(a,l.text);if(rr&&!res){res=rr;return}const z=nacZoneXY(l.text);if(z&&!zone){zone={...z,name:l.text};return}extra.push(l.group?`${l.group}: ${l.text}`:l.text)});
  if(!res){noResult.push(r);return}
  const z=zone||{...nacZoneXY(NAC_DEFAULT_ZONE[a.id]||'Medio Centro'),name:null};
  // pequeña dispersión dentro de la zona para que los puntos no queden encimados
  const jx=(Math.random()-.5)*20,jy=(Math.random()-.5)*20,x=Math.max(4,Math.min(96,z.x+jx)),y=Math.max(4,Math.min(96,z.y+jy));
  out.push({fase:a.fase,accion:a.id,resultado:res[0],categoria:catFromValence(res[2]),x:+x.toFixed(2),y:+y.toFixed(2),
   titulo:`${a.label} · ${res[1]}`,descripcion:[r.start!=null?`XML ${fmtClock(r.start)}`:'',zone?null:'(sin zona: ubicado en zona habitual)',extra.join(' · ')].filter(Boolean).join(' · '),
   video_url:r.start!=null&&ytUrl?youtubeLinkAt(ytUrl,Math.max(0,r.start)):'',inicio_seg:r.start,fin_seg:r.end,origen:'nacsport'});
 });
 return {out,unknown,noResult};
}
function matchYouTube(m){const a=m?.video_analisis_url||'',b=m?.video_url||'';return youtubeIdFrom(a)?a:(youtubeIdFrom(b)?b:'')}
function importNacsportXML(mid){
 if(!admin())return;const m=state.matches.find(x=>x.id===mid);if(!m)return;
 const cur=m.video_analisis_url||matchYouTube(m)||'';
 document.getElementById('xmlModal')?.remove();
 app.insertAdjacentHTML('beforeend',`<div id="xmlModal" class="modal-bg" onclick="if(event.target===this)this.remove()"><div class="modal xi-modal"><div class="eyebrow">IMPORTAR PARTIDO</div><h2>${esc(CN())} vs ${esc(m.rival)}</h2>
  <label class="xi-field"><span>1 · Link de YouTube del partido</span><input id="xiYT" type="url" placeholder="https://youtu.be/…" value="${esc(cur)}"><small class="muted">El mismo video que usaste en Analyst Tag. Con este link se arman los recortes de cada zona.</small></label>
  <div class="xi-field"><span>2 · XML exportado de Analyst Tag</span><small class="muted">Al tocar el botón elegís el archivo. Si ya habías importado uno en este partido, se reemplaza.</small></div>
  <div class="modal-actions"><button class="ghost" onclick="document.getElementById('xmlModal').remove()">Cancelar</button><button class="ghost" onclick="xiSaveLinkOnly('${mid}')">Guardar solo el link</button><button class="primary" onclick="xiPick('${mid}')">⬆ Elegir XML e importar</button></div></div></div>`);
}
function xiReadLink(){const v=(document.getElementById('xiYT')?.value||'').trim();if(v&&!youtubeIdFrom(v)){alert('Ese link no parece de YouTube. Dejalo vacío o pegá el link del video de YouTube.');return null}return v}
async function xiSaveLink(mid,v){const m=state.matches.find(x=>x.id===mid);if(!m||(m.video_analisis_url||'')===v)return true;const r=await sb.from('partidos').update({video_analisis_url:v||null}).eq('id',mid);if(r.error){alert('No se pudo guardar el link: '+r.error.message);return false}m.video_analisis_url=v||null;return true}
async function xiSaveLinkOnly(mid){const v=xiReadLink();if(v===null)return;if(await xiSaveLink(mid,v)){document.getElementById('xmlModal')?.remove();if(state.page==='teamanalysis'&&state.match===mid)renderTeamAnalysis();alert('Link guardado.')}}
function xiPick(mid){const v=xiReadLink();if(v===null)return;importNacsportXMLFile(mid,async()=>{const ok=await xiSaveLink(mid,v);document.getElementById('xmlModal')?.remove();return ok})}
function importNacsportXMLFile(mid,before){
 if(!admin())return;
 const inp=document.createElement('input');inp.type='file';inp.accept='.xml,text/xml,application/xml';
 inp.onchange=async()=>{
  const f=inp.files[0];if(!f)return;
  if(before&&!(await before()))return;
  try{
   const rows=parseNacsportXML(await f.text());if(!rows.length)return alert('No encontré clips (instance) en ese archivo. Exportalo desde Analyst Tag (Exportar → Descargar XML).');
   const m=state.matches.find(x=>x.id===mid),yt=matchYouTube(m);
   const abpRows=rows.filter(r=>nacFindABPType(r.code)),actRows=rows.filter(r=>!nacFindABPType(r.code));
   const {out,unknown,noResult}=nacBuildMarkers(actRows,yt),{out:abpOut,noSide}=nacBuildABP(abpRows,yt);
   const byAct={};out.forEach(o=>byAct[o.accion]=(byAct[o.accion]||0)+1);
   const byABP={};abpOut.forEach(p=>{const k=`${abpTypeLabel(p.tipo_abp)} ${p.lado==='favor'?'a favor':'en contra'}`;byABP[k]=(byABP[k]||0)+1});
   const unk=Object.entries(unknown);
   let msg=`Encontré ${rows.length} clips en el XML.\n\nAcciones para las canchas: ${out.length}\n${Object.entries(byAct).map(([k,n])=>`· ${actionDef(k).label}: ${n}`).join('\n')||'· ninguna'}\n\nABP para las medias canchas: ${abpOut.length}\n${Object.entries(byABP).map(([k,n])=>`· ${k}: ${n}`).join('\n')||'· ninguna'}`;
   if(noResult.length)msg+=`\n\n${noResult.length} acción(es) sin resultado (no se cargan).`;
   if(noSide.length)msg+=`\n\n${noSide.length} ABP sin "A favor" / "En contra" (no se cargan).`;
   if(unk.length)msg+=`\n\nCategorías que la app no usa (se ignoran): ${unk.map(([k,n])=>`${k} (${n})`).join(', ')}`;
   if(!out.length&&!abpOut.length)return alert(msg+'\n\nRevisá que los nombres de la botonera coincidan con los de la app.');
   if(!confirm(msg+'\n\nSi ya habías importado un XML en este partido, se reemplaza. ¿Continuar?'))return;
   const dbErr=e=>/accion|resultado|origen|inicio_seg/i.test(e?.message||'')?'Falta actualizar la base de datos: corré sql/v2_datos.sql en Supabase.':(e?.message||String(e));
   let nAct=0,nABP=0;
   if(out.length){
    let maps=(await sb.from('mapas_tacticos').select('*').eq('partido_id',mid)).data||[];
    if(maps.length<4){await ensureTacticalMaps(mid,maps);maps=(await sb.from('mapas_tacticos').select('*').eq('partido_id',mid)).data||[]}
    const mapFor=o=>{const pos=o.fase==='defensivo'?(o.y<55?1:2):(o.y>45?1:2);return maps.find(mp=>mp.tipo===o.fase&&mp.posicion===pos)||maps.find(mp=>mp.tipo===o.fase)};
    const ids=maps.map(x=>x.id);
    if(ids.length){const d=await sb.from('marcadores_tacticos').delete().in('mapa_id',ids).eq('origen','nacsport');if(d.error)return alert(dbErr(d.error))}
    const rowsIns=out.map(({fase,...o})=>({...o,mapa_id:mapFor({fase,...o})?.id})).filter(o=>o.mapa_id);
    for(let i=0;i<rowsIns.length;i+=200){const ins=await sb.from('marcadores_tacticos').insert(rowsIns.slice(i,i+200));if(ins.error)return alert(dbErr(ins.error))}
    nAct=rowsIns.length;
   }
   if(abpOut.length){try{nABP=await nacSaveABP(mid,abpOut)}catch(e){return alert(dbErr(e))}}
   alert(`Listo: ${nAct} acciones en las canchas y ${nABP} ABP en las medias canchas.`+(yt?'':'\n\nTip: si el partido completo tiene link de YouTube (Partidos → Editar), cada jugada abre el video en su minuto.'));
   state.match=mid;state.page='teamanalysis';renderTeamAnalysis();scrollTo(0,0);
  }catch(e){alert('No se pudo importar: '+e.message)}
 };
 inp.click();
}

// =====================================================================
// V2 · CANCHAS POR ZONAS (vista por defecto) + DATOS DE ESTE PARTIDO
// =====================================================================
let tacticalView='zonas'; // solo vista por zonas
const Z_TERCIO=['Propio','Medio','Último'],Z_CARRIL=['Izq','Centro','Der'];
function markerVal(k){return k.accion?(valenceOf(k.accion,k.resultado)||'neu'):(k.categoria==='acierto'?'pos':k.categoria==='error'?'neg':'neu')}
function zoneOf(k){const h=vToH(k.x,k.y);return {col:Math.min(2,Math.max(0,Math.floor(h.l/33.34))),row:Math.min(2,Math.max(0,Math.floor(h.t/33.34)))}}
function zoneName(row,col){return `${Z_TERCIO[col]} ${Z_CARRIL[row]}`}
function zoneCenterV(row,col){return {x:[17,50,83][row],y:[83,50,17][col]}}
function setTacticalView(v){tacticalView=v;const el=document.getElementById('tacticalSection');if(el&&state.tactical)el.outerHTML=tacticalMapsHTML(state.tactical.maps,state.tactical.markers,state.match)}
function zoneGridHTML(mp,mk){
 const cells=[];for(let r=0;r<3;r++)for(let c=0;c<3;c++)cells.push({r,c,list:[]});
 mk.forEach(k=>{const z=zoneOf(k);cells[z.row*3+z.col].list.push(k)});
 const max=Math.max(...cells.map(x=>x.list.length),1);
 return `<div class="zone-grid tz-grid">${cells.map(x=>{const n=x.list.length,pos=x.list.filter(k=>markerVal(k)==='pos').length,neg=x.list.filter(k=>markerVal(k)==='neg').length,pct=n?Math.round(pos/n*100):0;
  return `<button class="zone-cell tz-cell ${n?'':'is-empty'}" style="background:rgba(47,143,220,${n?(.12+.5*n/max).toFixed(2):0})" onclick="event.stopPropagation();openZone('${mp.id}',${x.r},${x.c})" title="${esc(zoneName(x.r,x.c))}">${n?`<b>${n}</b><span>${pct}% éxito</span><i class="tz-bar"><em class="vbg-pos" style="flex:${pos}"></em><em class="vbg-neu" style="flex:${n-pos-neg}"></em><em class="vbg-neg" style="flex:${neg}"></em></i>`:(admin()?'<span class="tz-add">+</span>':'')}</button>`}).join('')}</div>`;
}
function tacticalMapsHTML(maps,markers,mid){
 if(!maps.length&&!admin())return '';
 const order=[['defensivo',1],['defensivo',2],['ofensivo',1],['ofensivo',2]],zonas=true;
 const cards=order.map(([type,pos])=>{const mp=maps.find(x=>x.tipo===type&&x.posicion===pos);if(!mp)return '';const mk=markers.filter(x=>x.mapa_id===mp.id);
  const inner=zonas?zoneGridHTML(mp,mk):mk.map(k=>{const h=vToH(k.x,k.y);return `<button class="tactical-marker marker-${esc(k.categoria)}" style="left:${h.l}%;top:${h.t}%" onclick="event.stopPropagation();openTacticalMarker('${k.id}')" title="${esc(markerTip(k))}"></button>`}).join('');
  return `<div class="tactical-card"><div class="tactical-card-head"><div class="tc-title"><span class="pill ${type==='defensivo'?'pill-def':'pill-of'}">${type==='defensivo'?'DEF':'OF'}</span><h3>${esc(mp.titulo)}</h3><span class="muted small tc-n">${mk.length} acc.</span></div>${admin()?`<button class="ghost mini" onclick="renameTacticalMap('${mp.id}')">Editar título</button>`:''}</div><div class="football-pitch tactical-pitch-h ${zonas?'is-zones':''}" ${zonas?'':`onclick="addTacticalMarker(event,'${mp.id}')"`}>${pitchLinesH()}${inner}</div>${attackBar()}</div>`}).join('');
 const legend=zonas?`<span class="muted small">Número = acciones · % = éxito · Tocá una zona para ver las jugadas${admin()?' o agregar una':''}</span>`:`<div class="marker-legend inline"><span><i class="legend-dot acierto"></i>Éxito</span><span><i class="legend-dot situacion"></i>Neutro</span><span><i class="legend-dot error"></i>Negativo</span></div>`;
 return `<div class="section tactical-section" id="tacticalSection"><div class="sec-title"><h2>Situaciones del partido</h2><div class="tactical-tools">${legend}</div></div><div class="tactical-grid tactical-grid-h">${cards}</div></div>`;
}

function addZoneAction(mapId,row,col){const mp=state.tactical.maps.find(m=>m.id===mapId),c=zoneCenterV(row,col);closeZoneModal();window.__mk={mapId,x:c.x+(Math.random()-.5)*16,y:c.y+(Math.random()-.5)*16,tipo:mp?.tipo||'defensivo'};openMarkerForm({})}

// ---------- Datos de este partido (vs promedio de los últimos 5) ----------
// ---------- Datos de este partido: franja en el análisis + página propia ----------
async function matchDataFetch(mid){
 const recent=[...state.matches].filter(m=>m.fecha).sort((a,b)=>String(b.fecha).localeCompare(String(a.fecha))).slice(0,5);
 if(!recent.some(m=>m.id===mid)){const cur=state.matches.find(m=>m.id===mid);if(cur)recent.push(cur)}
 const ids=recent.map(m=>m.id);const r1=await sb.from('mapas_tacticos').select('*').in('partido_id',ids);const maps=r1.data||[];
 const r2=maps.length?await sb.from('marcadores_tacticos').select('*').in('mapa_id',maps.map(x=>x.id)):{data:[]};
 const pm=Object.fromEntries(maps.map(x=>[x.id,x.partido_id]));
 const acts=(r2.data||[]).filter(k=>k.accion&&actionDef(k.accion)).map(k=>({...k,pid:pm[k.mapa_id],val:valenceOf(k.accion,k.resultado)||'neu'}));
 return {acts,mine:acts.filter(a=>a.pid===mid),nM:new Set(acts.map(a=>a.pid)).size||1};
}
function mdDelta(v,p){return v==null||p==null?'':`<em class="${v>=p?'up':'down'}">${v>=p?'▲':'▼'} ${Math.abs(v-p)}</em>`}
async function loadMatchData(mid){
 const el=document.getElementById('matchDataStrip');if(!el)return;
 const {acts,mine}=await matchDataFetch(mid);
 if(!mine.length){el.innerHTML='Todavía sin acciones: importá el XML de Analyst Tag desde la lista de partidos';return}
 const g=agg(mine),avg=agg(acts),pa=agg(mine.filter(a=>a.accion==='presion_alta')),tr=agg(mine.filter(a=>a.accion==='transicion_rapida'));
 el.innerHTML=`<span><b>${g.total}</b> acciones</span><span>Éxito <b>${pctTxt(g.pct)}</b> ${mdDelta(g.pct,avg.pct)}</span>${pa.total?`<span>Presión alta <b>${pctTxt(pa.pct)}</b></span>`:''}${tr.total?`<span>Transición → remate <b>${pctTxt(tr.pct)}</b></span>`:''}`;
}
function matchDataEntryHTML(mid){return `<div class="section"><div class="entry-strip" onclick="openMatchData('${mid}')"><div><b>Datos del partido</b><span class="abp-strip-stats muted small" id="matchDataStrip">Cargando…</span></div><button class="primary" onclick="event.stopPropagation();openMatchData('${mid}')">Ver datos →</button></div></div>`}
function openMatchData(mid){state.match=mid;state.page='matchdata';renderMatchData();scrollTo(0,0)}
async function renderMatchData(){
 ensureChartTip();
 const mid=state.match,m=state.matches.find(x=>x.id===mid);if(!m){go('analysis');return}
 const head=`<div class="crumb"><button class="back" onclick="state.page='teamanalysis';renderTeamAnalysis()">${esc(CN())} vs ${esc(m.rival)}</button> / Datos</div><div class="page-head"><div class="page-head-main">${scoreHTML(m)}<div><div class="eyebrow inline-eye">ANÁLISIS PROPIO · DATOS</div><h1 class="title">Datos vs ${esc(m.rival)}</h1></div></div><div class="actions compact-actions"><button class="ghost" onclick="dataCompare='${mid}';go('data')">Ver en Datos generales →</button></div></div>`;
 app.innerHTML=shell(head+'<div class="empty">Cargando datos…</div>','Análisis del equipo');
 const {acts,mine,nM}=await matchDataFetch(mid);
 if(!mine.length){app.innerHTML=shell(head+`<div class="empty">Todavía no hay acciones clasificadas en este partido. Importá el XML de Analyst Tag desde <b>Partidos</b> o <b>Análisis del equipo</b> (botón ⬆ Importar XML).</div>`,'Análisis del equipo');return}
 const g=agg(mine),avg=agg(acts);
 const rec=l=>l.filter(a=>['presion_alta','bloque_medio','transicion_def'].includes(a.accion)&&a.val==='pos').length;
 const pa=agg(mine.filter(a=>a.accion==='presion_alta')),paA=agg(acts.filter(a=>a.accion==='presion_alta'));
 const tr=agg(mine.filter(a=>a.accion==='transicion_rapida')),trA=agg(acts.filter(a=>a.accion==='transicion_rapida'));
 const kpi=(l,v,p,unit='')=>`<div class="stat kpi"><small>${l}</small><b>${v==null?'—':v+unit}</b><span>prom. ${p==null?'—':p+unit} ${mdDelta(v,p)}</span></div>`;
 const rows=allActions().map(a=>({a,m:agg(mine.filter(x=>x.accion===a.id)),p:agg(acts.filter(x=>x.accion===a.id))})).filter(r=>r.m.total);
 const maxN=Math.max(...rows.map(r=>r.m.total),1);
 if(!rows.some(r=>r.a.id===dataFocus))dataFocus=rows[0].a.id;
 const fa=actionDef(dataFocus),fl=mine.filter(a=>a.accion===dataFocus),flA=acts.filter(a=>a.accion===dataFocus);
 const share=(list,id)=>{const k=list.filter(a=>a.resultado===id).length;return {pct:list.length?Math.round(k/list.length*100):0,k,total:list.length}};
 const raxes=fa.res.map(([id,label,v])=>({key:id,label,v}));
 const series=[{name:`Promedio · ${nM} partidos`,color:SERIES_B,vals:raxes.map(a=>share(flA,a.key))},{name:`vs ${m.rival}`,color:SERIES_A,vals:raxes.map(a=>share(fl,a.key))}];
 const sel=`<select class="mini-select" onchange="dataFocus=this.value;renderMatchData()">${rows.map(r=>`<option value="${r.a.id}" ${r.a.id===dataFocus?'selected':''}>${esc(r.a.label)}</option>`).join('')}</select>`;
 const outcome=fa.res.map(([id,label,v])=>{const k=fl.filter(a=>a.resultado===id).length;return `<div class="outcome v-${v}"><i></i><span>${esc(label)}</span><b>${k}</b><em>${fl.length?Math.round(k/fl.length*100):0}%</em></div>`}).join('');
 const b=`${head}
 <div class="stats kpis">${kpi('ACCIONES',g.total,Math.round(avg.total/nM))}${kpi('ÉXITO',g.pct,avg.pct,'%')}${kpi('RECUPERACIONES',rec(mine),Math.round(rec(acts)/nM))}${kpi('PRESIÓN ALTA',pa.pct,paA.pct,'%')}${kpi('TRANSICIÓN → REMATE',tr.pct,trA.pct,'%')}</div>
 <div class="panel chart-panel" style="margin-top:8px"><div class="sec-title"><h3>Por acción</h3><span class="muted small">Comparado con el promedio de los últimos ${nM} partidos · tocá una fila para verla en detalle</span></div><div class="bars md-bars">${rows.map(({a,m:mm,p})=>`<div class="bar-row md-row ${a.id===dataFocus?'is-focus':''}" style="cursor:pointer" onclick="dataFocus='${a.id}';renderMatchData()"><span class="bar-label">${esc(a.label)}<em>${a.fase==='defensivo'?'DEF':'OF'}</em></span><div class="bar-track"><div class="bar-fill" style="width:${mm.total/maxN*100}%">${['pos','neu','neg'].filter(v=>mm[v]).map(v=>`<i class="vbg-${v}" style="flex:${mm[v]}" data-tip="<b>${esc(a.label)}</b><br>${VAL_LABEL[v]}: ${mm[v]} de ${mm.total}"></i>`).join('')}</div></div><span class="bar-val"><b>${pctTxt(mm.pct)}</b> <small>n ${mm.total}</small></span><span class="md-avg">prom. ${pctTxt(p.pct)} ${mdDelta(mm.pct,p.pct)}</span></div>`).join('')}</div></div>
 <div class="data-grid"><div class="panel chart-panel"><div class="sec-title"><h3>Araña · ${esc(fa.label)}</h3>${sel}</div>${radarSVG(raxes,series)}<div class="chart-legend">${series.map(s=>`<span><i style="background:${s.color}"></i>${esc(s.name)} · n ${s.vals[0]?.total??0}</span>`).join('')}</div></div>
 <div class="panel chart-panel"><div class="sec-title"><h3>${esc(fa.label)} en este partido</h3><span class="muted small">${esc(CS())} ataca →</span></div><div class="outcomes">${outcome}</div><div style="margin-top:10px">${zoneMap(fl)}</div></div></div>`;
 app.innerHTML=shell(b,'Análisis del equipo');
}

// =====================================================================
// V2 · DATOS DE ABP (general y por partido)
// =====================================================================
const ABP_FIN_COL={gol:'#3ecf8e',remate:'#2f8fdc',sin_remate:'#55626f'};
const ABP_FIN_LABEL={gol:'Gol',remate:'Remate',sin_remate:'Sin remate'};
const ABP_TYPES=['corner','tiro_libre_lateral','tiro_libre_frontal','saque_banda','otro'];
function abpFin(p){return ['gol','remate'].includes(p.finalizacion)?p.finalizacion:'sin_remate'}
function abpAgg(l){const n=l.length,gol=l.filter(p=>p.finalizacion==='gol').length,rem=l.filter(p=>['remate','gol'].includes(p.finalizacion)).length,ac=l.filter(p=>p.resultado==='acierto').length,er=l.filter(p=>p.resultado==='error').length;
 return {n,gol,rem,ac,er,pAc:n?Math.round(ac/n*100):null,pRem:n?Math.round(rem/n*100):null,pGol:n?Math.round(gol/n*100):null}}
// Zonas de caída sobre la media cancha (arco a la izquierda). Coordenadas en % del contenedor.
const ABP_ZONES=[
 {id:'chica',label:'Área chica',r:[1.8,36.5,12.8,63.5]},
 {id:'arriba',label:'1º palo',r:[1.8,24.9,32.1,41.6]},
 {id:'centro',label:'Centro del área',r:[12.8,41.6,32.1,58.4]},
 {id:'abajo',label:'2º palo',r:[1.8,58.4,32.1,75.1]},
 {id:'borde',label:'Borde del área',r:[32.1,24.9,45,75.1]}
];
function abpZoneOf(p){const x=+p.x,y=+p.y;for(const z of ABP_ZONES){const [x1,y1,x2,y2]=z.r;if(x>=x1-1.8&&x<=x2&&y>=y1&&y<=y2)return z.id}return 'fuera'}
function abpSideList(points,side){return points.filter(p=>(p.lado||'favor')===side)}

function abpFunnelHTML(title,side,a,avg,nAvg){
 const max=Math.max(a.n,1),row=(label,v,pct,avgV,avgPct,col)=>`<div class="fn-row"><span class="fn-label">${label}</span><div class="fn-track"><i style="width:${v/max*100}%;background:${col}"></i></div><span class="fn-val"><b>${v}</b>${pct!=null?` <small>${pct}%</small>`:''}</span>${avg?`<span class="fn-avg">prom. ${avgV}${avgPct!=null?` · ${avgPct}%`:''}</span>`:''}</div>`;
 const f=v=>nAvg?(v/nAvg).toFixed(1).replace('.0',''):v;
 return `<div class="panel abp-funnel ${side}"><div class="sec-title"><h3>${title}</h3><span class="muted small">${a.n?`${a.pAc}% bien ejecutadas`:'sin datos'}</span></div>
  ${row('ABP',a.n,null,avg?f(avg.n):'',null,'#3a4a58')}${row('Remates',a.rem,a.pRem,avg?f(avg.rem):'',avg?.pRem,ABP_FIN_COL.remate)}${row('Goles',a.gol,a.pGol,avg?f(avg.gol):'',avg?.pGol,ABP_FIN_COL.gol)}</div>`;
}
function abpTypesHTML(list){
 const rows=ABP_TYPES.map(t=>({t,l:list.filter(p=>(p.tipo_abp||'otro')===t)})).filter(r=>r.l.length);
 if(!rows.length)return '<div class="empty">Sin ABP para este filtro.</div>';
 const max=Math.max(...rows.map(r=>r.l.length));
 return `<div class="bars">${rows.map(({t,l})=>{const g=abpAgg(l),seg=['gol','remate','sin_remate'].map(k=>({k,n:l.filter(p=>abpFin(p)===k).length})).filter(s=>s.n);
  return `<div class="bar-row abp-type-row"><span class="bar-label">${esc(abpTypeLabel(t))}</span><div class="bar-track"><div class="bar-fill" style="width:${l.length/max*100}%">${seg.map(s=>`<i style="flex:${s.n};background:${ABP_FIN_COL[s.k]}" data-tip="<b>${esc(abpTypeLabel(t))}</b><br>${ABP_FIN_LABEL[s.k]}: ${s.n} de ${l.length}"></i>`).join('')}</div></div><span class="bar-val"><b>${l.length}</b> <small>${g.pRem}% rem.</small></span></div>`}).join('')}</div>
  <div class="chart-legend inline" style="margin-top:6px">${['gol','remate','sin_remate'].map(k=>`<span><i style="background:${ABP_FIN_COL[k]}"></i>${ABP_FIN_LABEL[k]}</span>`).join('')}</div>`;
}
function abpZoneMapHTML(list){
 const by={};list.forEach(p=>{const z=abpZoneOf(p);(by[z]=by[z]||[]).push(p)});
 const max=Math.max(...ABP_ZONES.map(z=>(by[z.id]||[]).length),1);
 const rects=ABP_ZONES.map(z=>{const l=by[z.id]||[],g=abpAgg(l),[x1,y1,x2,y2]=z.r;return `<div class="abp-zone ${z.id==='chica'?'is-top':''}" style="left:${x1}%;top:${y1}%;width:${x2-x1}%;height:${y2-y1}%;background:rgba(47,143,220,${l.length?(.1+.5*l.length/max).toFixed(2):0})" data-tip="<b>${z.label}</b><br>${l.length} ABP${l.length?` · ${g.rem} remates · ${g.gol} goles`:''}">${l.length?`<b>${l.length}</b>${z.id==='chica'?'':`<span>${g.pRem}% rem.</span>`}`:''}</div>`}).join('');
 const out=(by.fuera||[]).length;
 return `<div class="football-pitch half-pitch half-pitch-lg abp-zmap">${rivalHalfPitchLines()}${rects}${list.map(p=>`<i class="abp-dot" style="left:${+p.x}%;top:${+p.y}%;background:${ABP_FIN_COL[abpFin(p)]}"></i>`).join('')}</div>
 <div class="chart-legend" style="margin-top:6px">${['gol','remate','sin_remate'].map(k=>`<span><i style="background:${ABP_FIN_COL[k]}"></i>${ABP_FIN_LABEL[k]}</span>`).join('')}${out?`<span class="muted">${out} fuera del área</span>`:''}</div>`;
}
function abpHistoryChart(ms,list){
 const W=560,H=170,L=28,R=10,T=10,B=34,iw=W-L-R,ih=H-T-B,n=ms.length;if(!n)return '';
 const data=ms.map(m=>{const l=list.filter(p=>p.pid===m.id);return {m,l,seg:['sin_remate','remate','gol'].map(k=>({k,n:l.filter(p=>abpFin(p)===k).length}))}});
 const max=Math.max(...data.map(d=>d.l.length),1),top=Math.max(2,Math.ceil(max/2)*2),bw=Math.min(34,iw/n*.55),X=i=>L+iw*(i+.5)/n,Y=v=>T+ih-v/top*ih;
 let s=`<svg class="linechart" viewBox="0 0 ${W} ${H}" role="img" aria-label="ABP por partido">`;
 [0,top/2,top].forEach(v=>{s+=`<line x1="${L}" x2="${W-R}" y1="${Y(v)}" y2="${Y(v)}" stroke="#1f2b36"/><text x="${L-6}" y="${Y(v)+3}" text-anchor="end" class="axis-t">${v}</text>`});
 data.forEach((d,i)=>{let acc=0;const g=abpAgg(d.l);d.seg.forEach(sg=>{if(!sg.n)return;const y0=Y(acc),y1=Y(acc+sg.n);s+=`<rect x="${X(i)-bw/2}" y="${y1+1}" width="${bw}" height="${Math.max(0,y0-y1-2)}" rx="2" fill="${ABP_FIN_COL[sg.k]}"/>`;acc+=sg.n});
  s+=`<text x="${X(i)}" y="${H-19}" text-anchor="middle" class="axis-t">${esc(d.m.rival.length>11?d.m.rival.slice(0,10)+'…':d.m.rival)}</text><text x="${X(i)}" y="${H-7}" text-anchor="middle" class="axis-t dim">${(fmtDate(d.m.fecha).split(' ')[1]||'')}</text>`;
  s+=`<rect x="${X(i)-iw/n/2}" y="${T}" width="${iw/n}" height="${ih}" fill="transparent" data-tip="<b>vs ${esc(d.m.rival)}</b><br>${g.n} ABP · ${g.rem} remates · ${g.gol} goles"/>`});
 return s+'</svg>';
}

// ---------- Página general de ABP ----------
async function renderABPLibrary(){
 ensureChartTip();
 const side=abpLibrarySide;
 const recent=[...state.matches].filter(m=>m.fecha).sort((a,b)=>String(b.fecha).localeCompare(String(a.fecha))).slice(0,abpLibraryWindow);
 const ids=recent.map(m=>m.id);let maps=[],all=[];
 if(ids.length){const mr=await sb.from('abp_mapas_equipo').select('*').in('partido_id',ids);if(mr.error)return alert(mr.error.message);maps=mr.data||[];if(maps.length){const pr=await sb.from('abp_puntos_equipo').select('*').in('mapa_id',maps.map(x=>x.id)).order('created_at');if(pr.error)return alert(pr.error.message);const pm=Object.fromEntries(maps.map(x=>[x.id,x.partido_id]));all=(pr.data||[]).map(p=>({...p,pid:pm[p.mapa_id]}))}}
 const points=abpSideList(all,side),chron=[...recent].reverse();
 const fav=abpAgg(abpSideList(all,'favor')),con=abpAgg(abpSideList(all,'contra'));
 const btn=(on,label,js)=>`<button class="${on?'primary':'secondary'}" onclick="${js}">${label}</button>`;
 const rows=recent.map(m=>{const mm=maps.filter(x=>x.partido_id===m.id),pp=points.filter(p=>p.pid===m.id),g=abpAgg(pp);return `<div class="panel abp-hist" style="margin-bottom:6px"><div class="abp-hist-head">${scoreHTML(m)}<div class="match-row-main"><h3>vs ${esc(m.rival)} <span class="muted small">${fmtDate(m.fecha)}</span></h3><p class="abp-hist-stats"><span>ABP <b>${g.n}</b></span><span class="c-ok">Bien ejecutadas <b>${g.ac}</b></span><span class="c-rem">Remates <b>${g.rem}</b></span><span class="c-gol">Goles <b>${g.gol}</b></span></p></div><button class="ghost mini" onclick="abpExpandedMatch=abpExpandedMatch==='${m.id}'?null:'${m.id}';renderABPLibrary()">${abpExpandedMatch===m.id?'Cerrar':'Ver canchas'}</button></div>${abpExpandedMatch===m.id?abpMatchLibraryHTML(m,mm,pp):''}</div>`}).join('');
 const b=`<div class="eyebrow">DATOS DE PELOTA PARADA</div><div class="toolbar"><div><h1 class="title">ABP</h1><p class="muted">Se calcula solo con las ABP cargadas en cada análisis propio · últimos ${recent.length} partidos</p></div><div class="data-filters"><div class="seg">${btn(abpLibraryWindow===5,'Últimos 5','abpLibraryWindow=5;renderABPLibrary()')}${btn(abpLibraryWindow===10,'Últimos 10','abpLibraryWindow=10;renderABPLibrary()')}${btn(abpLibraryWindow===99,'Todos','abpLibraryWindow=99;renderABPLibrary()')}</div></div></div>
 <div class="abp-duo">${abpFunnelHTML('A favor','favor',fav)}${abpFunnelHTML('En contra','contra',con)}</div>
 <div class="sec-title" style="margin-top:14px"><h2>Detalle</h2><div class="seg">${btn(side==='favor','A favor','abpLibrarySide=\'favor\';renderABPLibrary()')}${btn(side==='contra','En contra','abpLibrarySide=\'contra\';renderABPLibrary()')}</div></div>
 <div class="abp-overview"><div class="panel abp-map-panel"><div class="sec-title"><h3>Dónde caen · ${side==='favor'?'a favor':'en contra'}</h3><span class="muted small">1º palo arriba · 2º palo abajo</span></div>${abpZoneMapHTML(points)}</div>
 <div class="abp-side"><div class="panel"><div class="sec-title"><h3>Por tipo de ABP</h3></div>${abpTypesHTML(points)}</div><div class="panel"><div class="sec-title"><h3>Partido a partido</h3></div>${abpHistoryChart(chron,points)}</div></div></div>
 <div class="section"><div class="sec-title"><h2>Historial por partido</h2></div>${rows||'<div class="empty">Todavía no hay partidos con ABP cargadas.</div>'}</div>`;
 app.innerHTML=shell(b,'ABP');
}

// ---------- Resumen ABP de un partido (vs promedio últimos 5) ----------
async function abpMatchSummaryHTML(mid,points){
 const recent=[...state.matches].filter(m=>m.fecha).sort((a,b)=>String(b.fecha).localeCompare(String(a.fecha))).slice(0,5);
 const ids=recent.map(m=>m.id);let avgPts=[];
 if(ids.length){const mr=await sb.from('abp_mapas_equipo').select('*').in('partido_id',ids);const maps=mr.data||[];if(maps.length){const pr=await sb.from('abp_puntos_equipo').select('*').in('mapa_id',maps.map(x=>x.id));avgPts=pr.data||[]}}
 const nM=Math.max(1,recent.length),fav=abpSideList(points,'favor'),con=abpSideList(points,'contra');
 if(!points.length)return `<div class="empty" style="margin-top:10px">Cargá las situaciones en las medias canchas y acá vas a ver el resumen del partido comparado con el promedio.</div>`;
 return `<div class="abp-duo" style="margin-top:10px">${abpFunnelHTML('A favor','favor',abpAgg(fav),abpAgg(abpSideList(avgPts,'favor')),nM)}${abpFunnelHTML('En contra','contra',abpAgg(con),abpAgg(abpSideList(avgPts,'contra')),nM)}</div>
 <div class="abp-duo"><div class="panel"><div class="sec-title"><h3>Por tipo · a favor</h3></div>${abpTypesHTML(fav)}</div><div class="panel"><div class="sec-title"><h3>Por tipo · en contra</h3></div>${abpTypesHTML(con)}</div></div>`;
}
async function loadABPStrip(mid){
 const el=document.getElementById('abpStripStats');if(!el)return;
 const mr=await sb.from('abp_mapas_equipo').select('*').eq('partido_id',mid);const maps=mr.data||[];if(!maps.length)return;
 const pr=await sb.from('abp_puntos_equipo').select('*').in('mapa_id',maps.map(x=>x.id));const pts=pr.data||[];if(!pts.length)return;
 const f=abpAgg(abpSideList(pts,'favor')),c=abpAgg(abpSideList(pts,'contra'));
 el.innerHTML=`<span><em class="sw fav"></em>A favor <b>${f.n}</b> · ${f.rem} rem. · ${f.gol} gol${f.gol===1?'':'es'}</span><span><em class="sw con"></em>En contra <b>${c.n}</b> · ${c.rem} rem. · ${c.gol} gol${c.gol===1?'':'es'}</span>`;
}

// ---------- Nacsport · ABP ----------
// Categorías: Córner · Tiro libre lateral · Tiro libre frontal · Saque de banda
// Descriptores: Lado (A favor / En contra) · Finalización (Gol / Remate / Sin remate)
//               Ejecución (Bien ejecutada / Mal ejecutada / Neutra) · Zona de caída (6)
// Convención de dibujo: la ABP se dibuja como si se ejecutara desde arriba → 1º palo = sector de arriba del área.
const NAC_ABP_TYPES={corner:['corner','corners','tiro de esquina'],tiro_libre_lateral:['tiro libre lateral','tl lateral','falta lateral'],tiro_libre_frontal:['tiro libre frontal','tl frontal','falta frontal'],saque_banda:['saque de banda','saque lateral']};
const NAC_ABP_ZONES=[{id:'chica',names:['area chica'],x:7,y:50},{id:'p1',names:['1 palo','1er palo','primer palo','palo cercano'],x:17,y:33},{id:'centro',names:['centro del area','punto penal','penal'],x:22,y:50},{id:'p2',names:['2 palo','2do palo','segundo palo','palo lejano'],x:17,y:67},{id:'borde',names:['borde del area'],x:38,y:50},{id:'fuera',names:['fuera del area'],x:56,y:50}];
const NAC_ABP_MAPS=[['Córners a favor','favor',true],['Otras ABP a favor','favor',false],['Córners en contra','contra',true],['Otras ABP en contra','contra',false]];
function nacFindABPType(code){const n=nacNorm(code);return Object.keys(NAC_ABP_TYPES).find(t=>NAC_ABP_TYPES[t].includes(n)||nacNorm(abpTypeLabel(t))===n)}
function nacBuildABP(rows,ytUrl){
 const out=[],noSide=[];
 rows.forEach(r=>{const tipo=nacFindABPType(r.code);if(!tipo)return;
  let lado=null,fin=null,res=null,zone=null;const extra=[];
  r.labels.forEach(l=>{const n=nacNorm(l.text);
   if(!lado&&(n==='a favor'||n==='favor'))lado='favor';else if(!lado&&(n==='en contra'||n==='contra'))lado='contra';
   else if(!fin&&n==='gol')fin='gol';else if(!fin&&n==='remate')fin='remate';else if(!fin&&n==='sin remate')fin='sin_remate';
   else if(!res&&n==='bien ejecutada')res='acierto';else if(!res&&n==='mal ejecutada')res='error';else if(!res&&n==='neutra')res='neutro';
   else{const z=NAC_ABP_ZONES.find(z=>z.names.includes(n));if(z&&!zone)zone=z;else extra.push(l.group?`${l.group}: ${l.text}`:l.text)}});
  if(!lado){noSide.push(r);return}
  const z=zone||NAC_ABP_ZONES.find(z=>z.id==='centro'),x=Math.max(2,Math.min(98,z.x+(Math.random()-.5)*8)),y=Math.max(2,Math.min(98,z.y+(Math.random()-.5)*8));
  out.push({lado,tipo_abp:tipo,finalizacion:fin||'sin_remate',resultado:res||'neutro',x:+x.toFixed(2),y:+y.toFixed(2),
   titulo:`${abpTypeLabel(tipo)} · ${ABP_FIN_LABEL[fin||'sin_remate']}`,observado:[r.start!=null?`XML ${fmtClock(r.start)}`:'',zone?zone.names[0].replace('1 palo','1º palo').replace('2 palo','2º palo'):'(sin zona de caída)',extra.join(' · ')].filter(Boolean).join(' · '),
   video_url:r.start!=null&&ytUrl?youtubeLinkAt(ytUrl,Math.max(0,r.start)):'',inicio_seg:r.start,fin_seg:r.end,origen:'nacsport'});
 });
 return {out,noSide};
}
async function nacSaveABP(mid,list){
 let maps=(await sb.from('abp_mapas_equipo').select('*').eq('partido_id',mid)).data||[];
 const missing=NAC_ABP_MAPS.map(([titulo],i)=>({partido_id:mid,posicion:i+1,titulo})).filter(r=>!maps.some(m=>m.posicion===r.posicion));
 if(missing.length){const e=await sb.from('abp_mapas_equipo').insert(missing);if(e.error)throw e.error;maps=(await sb.from('abp_mapas_equipo').select('*').eq('partido_id',mid)).data||[]}
 const ids=maps.map(m=>m.id);
 if(ids.length){const d=await sb.from('abp_puntos_equipo').delete().in('mapa_id',ids).eq('origen','nacsport');if(d.error)throw d.error}
 const mapFor=p=>{const i=NAC_ABP_MAPS.findIndex(([,l,c])=>l===p.lado&&c===(p.tipo_abp==='corner'));return maps.find(m=>m.posicion===i+1)};
 const rows=list.map(p=>({...p,mapa_id:mapFor(p)?.id})).filter(p=>p.mapa_id);
 for(let i=0;i<rows.length;i+=200){const ins=await sb.from('abp_puntos_equipo').insert(rows.slice(i,i+200));if(ins.error)throw ins.error}
 return rows.length;
}

sb.auth.onAuthStateChange((event,session)=>{if(event==='SIGNED_OUT'){state.user=null;state.profile=null;state.page='login';render()}});
init();

// ---------- v2.3 · Zona → recortes de video (playlist) ----------
// Tocás una zona de cualquiera de las 4 canchas y ves/reproducís las jugadas de esa zona.
// Usa el video de YouTube del partido + inicio_seg/fin_seg de cada acción (vienen del XML de Analyst Tag / Nacsport).
let ZP=null;
function zpClip(k){const st=Math.max(0,Number(k.inicio_seg)||0);const en=k.fin_seg!=null?Math.max(st+2,Number(k.fin_seg)):st+12;return {st,en}}
function zpFiltered(){if(!ZP)return [];return ZP.all.filter(k=>(!ZP.fa||k.accion===ZP.fa)&&(!ZP.fr||markerVal(k)===ZP.fr))}
function openZone(mapId,row,col){
 const mp=state.tactical?.maps?.find(m=>m.id===mapId);if(!mp)return;
 const all=(state.tactical.markers||[]).filter(k=>k.mapa_id===mapId).filter(k=>{const z=zoneOf(k);return z.row===row&&z.col===col}).sort((a,b)=>(a.inicio_seg??1e9)-(b.inicio_seg??1e9));
 const m=state.matches.find(x=>x.id===state.match),yt=matchYouTube(m);
 zpStop();ZP={mapId,row,col,mp,all,fa:'',fr:'',i:-1,auto:false,yt:youtubeIdFrom(yt)||null,player:null,timer:null,simT:null};
 document.getElementById('zoneModal')?.remove();
 app.insertAdjacentHTML('beforeend',`<div id="zoneModal" class="modal-bg" onclick="if(event.target===this)closeZoneModal()"><div class="modal zp-modal">
  <div class="zp-head"><div><span class="pill ${mp.tipo==='defensivo'?'pill-def':'pill-of'}">${esc(mp.titulo)}</span><h2>${esc(zoneName(row,col))} <span class="muted">· ${all.length} ${all.length===1?'acción':'acciones'}</span></h2></div><button class="ghost" onclick="closeZoneModal()">Cerrar ✕</button></div>
  <div class="zp-body">
   <div class="zp-left">
    <div class="zp-player" id="zpPlayer">${zpIdleHTML()}</div>
    <div class="zp-now" id="zpNow"><span class="muted small">Elegí una jugada o tocá <b>Ver todas</b>.</span></div>
    <div class="zp-ctrl"><button class="ghost" onclick="zpStep(-1)">⏮ Anterior</button><button class="primary" id="zpAllBtn" onclick="zpToggleAll()">▶ Ver todas</button><button class="ghost" onclick="zpStep(1)">Siguiente ⏭</button><button class="ghost" onclick="zpReplay()">↺ Repetir</button></div>
   </div>
   <div class="zp-right"><div id="zpFilters"></div><div class="zp-list" id="zpList"></div>
    ${admin()?`<button class="secondary zp-add" onclick="addZoneAction('${mapId}',${row},${col})">+ Agregar acción en esta zona</button>`:''}</div>
  </div></div></div>`);
 zpRenderSide();if(ZP.yt)zpInitYT();
}
function zpIdleHTML(){return ZP&&ZP.yt?'<div id="zpYT"></div>':`<div class="zp-sim"><div class="zp-sim-pitch"></div><div class="zp-sim-txt"><b>▶</b><span>Elegí una jugada</span><small>${state.matches.find(x=>x.id===state.match)?'Cargá el link de YouTube del partido para ver el video acá':''}</small></div></div>`}
function zpRenderSide(){if(!ZP)return;const all=ZP.all,list=zpFiltered();
 const acts={};all.forEach(k=>{const id=k.accion||'_';acts[id]=(acts[id]||0)+1});
 const vals={pos:0,neu:0,neg:0};all.forEach(k=>vals[markerVal(k)]++);
 const chip=(on,txt,fn)=>`<button class="zp-chip ${on?'on':''}" onclick="${fn}">${txt}</button>`;
 document.getElementById('zpFilters').innerHTML=`<div class="zp-frow">${chip(!ZP.fa,`Todas <em>${all.length}</em>`,"ZP.fa='';zpAfterFilter()")}${Object.entries(acts).map(([id,n])=>chip(ZP.fa===id,`${esc(actionDef(id)?.label||'Sin clasificar')} <em>${n}</em>`,`ZP.fa='${id}';zpAfterFilter()`)).join('')}</div>
  <div class="zp-frow">${chip(!ZP.fr,'Todos los resultados',"ZP.fr='';zpAfterFilter()")}${[['pos','Éxito'],['neu','Neutro'],['neg','Negativo']].filter(([v])=>vals[v]).map(([v,l])=>chip(ZP.fr===v,`<i class="vdot v-${v}"></i>${l} <em>${vals[v]}</em>`,`ZP.fr='${v}';zpAfterFilter()`)).join('')}</div>`;
 const cur=list[ZP.i];
 document.getElementById('zpList').innerHTML=list.map((k,i)=>{const a=actionDef(k.accion),r=resultDef(k.accion,k.resultado),c=k.inicio_seg!=null?zpClip(k):null;
  return `<button class="zp-row ${k===cur?'on':''} ${c?'':'no-time'}" onclick="zpPlay(${i},false)" ${c?'':'disabled'}><i class="vdot v-${markerVal(k)}"></i><span class="zp-main"><b>${esc(a?.label||k.titulo||'Situación')}</b><small>${esc(r?.[1]||k.categoria||'')}${k.descripcion?' · '+esc(k.descripcion):''}</small></span><span class="zp-time">${c?`${fmtClock(c.st)}<small>${Math.round(c.en-c.st)} s</small>`:'<small>sin tiempo</small>'}</span>${k===cur?'<span class="zp-playing">▶</span>':''}</button>`}).join('')||'<div class="empty">No hay jugadas con ese filtro.</div>';
 const ab=document.getElementById('zpAllBtn');if(ab)ab.textContent=ZP.auto?'⏸ Pausar playlist':`▶ Ver todas (${list.filter(k=>k.inicio_seg!=null).length})`;
}
function zpAfterFilter(){ZP.i=-1;ZP.auto=false;zpHalt();zpRenderSide();zpNow(null)}
function zpNow(k){const el=document.getElementById('zpNow');if(!el)return;if(!k){el.innerHTML='<span class="muted small">Elegí una jugada o tocá <b>Ver todas</b>.</span>';return}
 const a=actionDef(k.accion),r=resultDef(k.accion,k.resultado),c=zpClip(k),list=zpFiltered();
 el.innerHTML=`<div class="zp-now-top"><b>${esc(a?.label||'Situación')}</b> · ${esc(r?.[1]||'')}<span class="muted small"> · ${ZP.i+1} de ${list.length}</span><span class="zp-clock" id="zpClock">${fmtClock(c.st)}</span></div><div class="zp-prog"><i id="zpProg"></i></div><div class="muted small">${fmtClock(c.st)} → ${fmtClock(c.en)}</div>`}
function zpInitYT(){const mk=()=>{if(!ZP||!document.getElementById('zpYT'))return;ZP.player=new YT.Player('zpYT',{videoId:ZP.yt,playerVars:{playsinline:1,rel:0,modestbranding:1},events:{onReady:()=>{ZP.ready=true;if(ZP.pending!=null){const i=ZP.pending;ZP.pending=null;zpPlay(i,ZP.auto)}}}})};
 if(window.YT&&YT.Player)return mk();const prev=window.onYouTubeIframeAPIReady;window.onYouTubeIframeAPIReady=()=>{prev&&prev();mk()};if(!document.getElementById('ytApiScript')){const s=document.createElement('script');s.id='ytApiScript';s.src='https://www.youtube.com/iframe_api';document.head.appendChild(s)}}
function zpPlay(i,auto){if(!ZP)return;const list=zpFiltered();while(i<list.length&&list[i]&&list[i].inicio_seg==null)i++;const k=list[i];if(!k){zpHalt();ZP.auto=false;zpRenderSide();return}
 ZP.i=i;if(auto!==undefined)ZP.auto=auto;zpHalt();const c=zpClip(k);zpRenderSide();zpNow(k);
 const row=document.querySelector('.zp-row.on');row&&row.scrollIntoView({block:'nearest'});
 if(ZP.yt){if(!ZP.ready){ZP.pending=i;return}ZP.player.loadVideoById({videoId:ZP.yt,startSeconds:c.st,endSeconds:c.en});
  ZP.timer=setInterval(()=>{const t=ZP.player.getCurrentTime?.()||c.st;zpTick(t,c);if(t>=c.en-.15)zpEnd()},250)}
 else{ZP.simT=c.st;const box=document.getElementById('zpPlayer');box.innerHTML=`<div class="zp-sim playing"><div class="zp-sim-pitch"></div><div class="zp-sim-txt"><b>${esc(actionDef(k.accion)?.label||'')}</b><span id="zpSimClock">${fmtClock(c.st)}</span><small>Vista simulada · en la app real se reproduce el video de YouTube del partido en este minuto</small></div></div>`;
  ZP.timer=setInterval(()=>{ZP.simT+=.25;zpTick(ZP.simT,c);const sc=document.getElementById('zpSimClock');if(sc)sc.textContent=fmtClock(ZP.simT);if(ZP.simT>=c.en)zpEnd()},250)}}
function zpTick(t,c){const p=document.getElementById('zpProg'),cl=document.getElementById('zpClock');if(p)p.style.width=Math.max(0,Math.min(100,(t-c.st)/(c.en-c.st)*100))+'%';if(cl)cl.textContent=fmtClock(t)}
function zpEnd(){zpHalt();if(ZP&&ZP.auto){const list=zpFiltered();if(ZP.i+1<list.length){setTimeout(()=>zpPlay(ZP.i+1,true),400);return}ZP.auto=false;zpRenderSide()}else if(ZP&&ZP.yt&&ZP.player)ZP.player.pauseVideo?.()}
function zpHalt(){if(ZP&&ZP.timer){clearInterval(ZP.timer);ZP.timer=null}}
function zpStop(){if(!ZP)return;zpHalt();try{ZP.player&&ZP.player.destroy&&ZP.player.destroy()}catch(e){}ZP=null}
function zpToggleAll(){if(!ZP)return;if(ZP.auto){ZP.auto=false;zpHalt();if(ZP.yt&&ZP.player)ZP.player.pauseVideo?.();zpRenderSide();return}zpPlay(ZP.i>=0&&ZP.i<zpFiltered().length-1?ZP.i:0,true)}
function zpStep(d){if(!ZP)return;const n=zpFiltered().length;if(!n)return;let i=ZP.i+d;if(i<0)i=0;if(i>=n)i=n-1;zpPlay(i,ZP.auto)}
function zpReplay(){if(ZP&&ZP.i>=0)zpPlay(ZP.i,false)}
function closeZoneModal(){zpStop();document.getElementById('zoneModal')?.remove()}

// ---------- v2.4 · Análisis rival: formación + análisis escrito + clips por categoría ----------
const RIVAL_CLIP_CATS=['Salida / construcción','Ataque posicional','Transiciones ofensivas','Finalización','Presión','Bloque defensivo','Transiciones defensivas','Pelota parada','Jugadores','Otros'];
async function rivalExtrasFetch(clubId){
 const [f,a,v]=await Promise.all([
  sb.from('rival_formacion').select('*').eq('club_id',clubId).maybeSingle(),
  sb.from('rival_analisis').select('*').eq('club_id',clubId).order('created_at',{ascending:true}),
  sb.from('rival_clips').select('*').eq('club_id',clubId).order('posicion',{ascending:true})]);
 const missing=[f,a,v].some(r=>r.error&&/does not exist|relation|schema cache|Could not find/i.test(r.error.message||''));
 const rx={missing,formation:f.data||null,analyses:a.data||[],videos:v.data||[]};state.rivalX=rx;return rx;
}
function rivalExtrasHTML(c,rx){
 if(rx.missing)return `<div class="section"><div class="empty">${admin()?'Para usar formación, análisis escrito y clips del rival falta correr <b>sql/v2_4b_rival.sql</b> en Supabase.':'Sección en preparación.'}</div></div>`;
 const f=rx.formation,players=Array.isArray(f?.jugadores)?f.jugadores:[];
 const form=`<div class="panel formation-panel"><div class="sec-title"><h2>Formación <span class="muted">${esc(f?.sistema||'')}</span></h2>${admin()?`<button class="ghost mini" onclick="rivalFormationReset('${c.id}')">${f?'Cambiar sistema':'Crear formación'}</button>`:''}</div><div class="formation-wrap">${f?`<div class="football-pitch formation-pitch" id="rivalFormationPitch">${pitchLines()}${players.map((p,i)=>`<button class="player-dot rival-dot" data-i="${i}" style="left:${Number(p.x)||50}%;top:${Number(p.y)||50}%" onclick="rivalFormationEdit(event,${i})" title="Editar jugador"><b>${esc(p.n||'')}</b><span>${esc(p.name||'')}</span></button>`).join('')}</div>`:`<div class="empty">${admin()?'Creá la formación base del rival.':'Formación todavía no cargada.'}</div>`}</div>${f&&admin()?'<p class="muted small tactical-help">Arrastrá un jugador para moverlo. Hacé clic para editar número y nombre.</p>':''}</div>`;
 const cards=rx.analyses.map(x=>`<div class="panel analysis-card"><div class="analysis-card-head"><div><span class="pill">${esc(x.categoria||'Análisis')}</span><h3>${esc(x.titulo)}</h3></div>${admin()?`<div class="actions compact-actions"><button class="secondary" onclick="rivalAnalysisEdit('${x.id}')">✏ Editar</button><button class="danger" onclick="rivalAnalysisDelete('${x.id}')">Eliminar</button></div>`:''}</div>${x.descripcion?`<p>${esc(x.descripcion)}</p>`:''}<label>✓ Fortalezas del rival</label><div class="note-box">${esc(x.fortalezas||'—')}</div><label>! Debilidades / cómo atacarlo</label><div class="note-box">${esc(x.debilidades||'—')}</div><label>Conclusión</label><div class="note-box">${esc(x.conclusion||'—')}</div>${rivalClipCount(x.categoria)?`<button class="ghost mini rc-jump" onclick="rivalClipsFilter='${esc(x.categoria)}';rivalClipsRender();document.getElementById('rivalClips')?.scrollIntoView({behavior:'smooth'})">▶ Ver ${rivalClipCount(x.categoria)} clip(s) de ${esc(x.categoria)}</button>`:''}</div>`).join('')||`<div class="empty">${admin()?'Todavía no hay análisis escrito. Tocá <b>+ Agregar análisis</b>.':'Todavía no hay análisis escrito.'}</div>`;
 const split=`<div class="section"><div class="section-head"><div><div class="eyebrow inline-eye">ANÁLISIS DEL RIVAL</div><h2>Formación y análisis escrito</h2></div>${admin()?`<button class="primary" onclick="rivalAnalysisAdd('${c.id}')">+ Agregar análisis</button>`:''}</div><div class="ta-split"><aside class="ta-formation">${form}</aside><div class="ta-written">${cards}</div></div></div>`;
 return split+`<div class="section analysis-videos-section" id="rivalClips">${rivalClipsInner(c.id)}</div>`;
}
let rivalClipsFilter='';
function rivalClipCount(cat){return (state.rivalX?.videos||[]).filter(v=>(v.categoria||'Otros')===cat).length}
function rivalClipsInner(clubId){
 const vids=state.rivalX?.videos||[];const cats=[...new Set(vids.map(v=>v.categoria||'Otros'))].sort((a,b)=>RIVAL_CLIP_CATS.indexOf(a)-RIVAL_CLIP_CATS.indexOf(b));
 if(rivalClipsFilter&&!cats.includes(rivalClipsFilter))rivalClipsFilter='';
 const shown=vids.filter(v=>!rivalClipsFilter||(v.categoria||'Otros')===rivalClipsFilter);
 const groups={};shown.forEach(v=>{const k=v.categoria||'Otros';(groups[k]=groups[k]||[]).push(v)});
 const order=Object.keys(groups).sort((a,b)=>RIVAL_CLIP_CATS.indexOf(a)-RIVAL_CLIP_CATS.indexOf(b));
 const chips=vids.length?`<div class="rc-chips"><button class="zp-chip ${!rivalClipsFilter?'on':''}" onclick="rivalClipsFilter='';rivalClipsRender()">Todos <em>${vids.length}</em></button>${cats.map(k=>`<button class="zp-chip ${rivalClipsFilter===k?'on':''}" onclick="rivalClipsFilter='${esc(k)}';rivalClipsRender()">${esc(k)} <em>${rivalClipCount(k)}</em></button>`).join('')}</div>`:'';
 const card=v=>{const yt=youtubeIdFrom(v.video_url||'');return `<div class="analysis-video-card"><div class="analysis-video-index">${yt?'▶':'⧉'}</div><div class="analysis-video-info"><h3>${esc(v.titulo)}</h3><p class="muted">${esc(v.descripcion||'')}${v.descripcion?' · ':''}${yt?'YouTube':/dropbox/i.test(v.video_url||'')?'Dropbox':'Link'}</p></div><div class="analysis-video-actions">${yt?`<button class="primary" onclick="rivalClipPlay('${v.id}')">▶ Ver clip</button>`:`<a class="primary video-open-btn" href="${esc(v.video_url)}" target="_blank" rel="noopener">▶ Ver clip</a>`}${/dropbox/i.test(v.video_url||'')?`<a class="secondary video-download-btn" href="${esc(downloadUrl(v.video_url))}" target="_blank" rel="noopener">↓ Descargar</a>`:''}${admin()?`<button class="secondary" onclick="rivalClipEdit('${v.id}')">Editar</button><button class="danger" onclick="rivalClipDelete('${v.id}')">Eliminar</button>`:''}</div></div>`};
 const body=order.map(k=>`<div class="rc-group"><div class="rc-group-head"><span class="pill">${esc(k)}</span><span class="muted small">${groups[k].length} clip(s)</span></div><div class="analysis-video-list">${groups[k].map(card).join('')}</div></div>`).join('')||`<div class="empty">${admin()?'Todavía no hay clips. Tocá <b>+ Agregar clip</b> y pegá el link de YouTube o Dropbox.':'Todavía no hay clips cargados.'}</div>`;
 return `<div class="section-head"><div><div class="eyebrow inline-eye">MATERIAL AUDIOVISUAL</div><h2>Clips del rival</h2><p class="muted">Ordenados por categoría: ataques posicionales, salida, presión, transiciones, ABP…</p></div>${admin()?`<button class="primary" onclick="rivalClipAdd('${clubId}')">+ Agregar clip</button>`:''}</div>${chips}${body}`;
}
function rivalClipsRender(){const el=document.getElementById('rivalClips');if(el)el.innerHTML=rivalClipsInner(state.rivalClub)}
function rivalPickCat(cur){const list=RIVAL_CLIP_CATS.map((k,i)=>`${i+1}. ${k}`).join('\n');const ans=prompt(`Categoría (escribí el número o un nombre nuevo):\n${list}`,cur?String(RIVAL_CLIP_CATS.indexOf(cur)+1||cur):'');if(ans===null)return null;const t=ans.trim();const n=parseInt(t,10);if(String(n)===t&&RIVAL_CLIP_CATS[n-1])return RIVAL_CLIP_CATS[n-1];return t||'Otros'}
async function rivalClipAdd(clubId){if(!admin())return;const categoria=rivalPickCat(rivalClipsFilter||'');if(categoria===null)return;
 const titulo=prompt('Título del clip (ej. Ataque posicional por derecha · 2º tiempo):');if(titulo===null||!titulo.trim())return;
 const video_url=prompt('Pegá el link del clip (YouTube o Dropbox). Si es YouTube podés incluir el minuto (?t=...):');if(video_url===null||!video_url.trim())return;
 const descripcion=prompt('Nota breve (opcional, ej. vs Talleres, min 23):','')??'';
 const posicion=(state.rivalX?.videos||[]).reduce((m,v)=>Math.max(m,v.posicion||0),0)+1;
 const {error}=await sb.from('rival_clips').insert({club_id:clubId,categoria,titulo:titulo.trim(),video_url:video_url.trim(),descripcion:descripcion.trim(),posicion});if(error)return alert(error.message);rivalClipsFilter=categoria;renderRivalClubBase()}
async function rivalClipEdit(id){if(!admin())return;const v=(state.rivalX?.videos||[]).find(x=>x.id===id);if(!v)return;const categoria=rivalPickCat(v.categoria);if(categoria===null)return;
 const titulo=prompt('Título del clip:',v.titulo||'');if(titulo===null||!titulo.trim())return;const video_url=prompt('Link del clip:',v.video_url||'');if(video_url===null||!video_url.trim())return;const descripcion=prompt('Nota breve (opcional):',v.descripcion||'')??v.descripcion??'';
 const {error}=await sb.from('rival_clips').update({categoria,titulo:titulo.trim(),video_url:video_url.trim(),descripcion:descripcion.trim(),updated_at:new Date().toISOString()}).eq('id',id);if(error)return alert(error.message);renderRivalClubBase()}
async function rivalClipDelete(id){if(!admin()||!confirm('¿Eliminar este clip?'))return;const {error}=await sb.from('rival_clips').delete().eq('id',id);if(error)return alert(error.message);renderRivalClubBase()}
function rivalClipPlay(id){const v=(state.rivalX?.videos||[]).find(x=>x.id===id);if(!v)return;const yid=youtubeIdFrom(v.video_url);let t=0;try{const u=new URL(v.video_url);const raw=u.searchParams.get('t')||u.searchParams.get('start')||'';const m=String(raw).match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s?)?$/);if(m)t=(+m[1]||0)*3600+(+m[2]||0)*60+(+m[3]||0)}catch(e){}
 document.getElementById('rcModal')?.remove();
 app.insertAdjacentHTML('beforeend',`<div id="rcModal" class="modal-bg" onclick="if(event.target===this)this.remove()"><div class="modal rc-modal"><div class="zp-head"><div><span class="pill">${esc(v.categoria||'Clip')}</span><h2>${esc(v.titulo)}</h2>${v.descripcion?`<p class="muted small">${esc(v.descripcion)}</p>`:''}</div><button class="ghost" onclick="document.getElementById('rcModal').remove()">Cerrar ✕</button></div><div class="zp-player"><iframe src="https://www.youtube.com/embed/${yid}?start=${t}&autoplay=1&rel=0&playsinline=1" allow="autoplay; encrypted-media; fullscreen" allowfullscreen></iframe></div></div></div>`)}
function rivalAnalysisPrompts(base={}){
 const titulo=prompt('Título del análisis (ej. Ataque posicional por banda derecha):',base.titulo||'');if(titulo===null||!titulo.trim())return null;
 const categoria=rivalPickCat(base.categoria||'');if(categoria===null)return null;
 const descripcion=prompt('Descripción breve (opcional):',base.descripcion||'')??base.descripcion??'';
 const fortalezas=prompt('Fortalezas del rival en este aspecto:',base.fortalezas||'')??base.fortalezas??'';
 const debilidades=prompt('Debilidades / cómo atacarlo:',base.debilidades||'')??base.debilidades??'';
 const conclusion=prompt('Conclusión breve:',base.conclusion||'')??base.conclusion??'';
 return {titulo:titulo.trim(),categoria,descripcion,fortalezas,debilidades,conclusion};
}
async function rivalAnalysisAdd(clubId){if(!admin())return;const row=rivalAnalysisPrompts();if(!row)return;row.club_id=clubId;const {error}=await sb.from('rival_analisis').insert(row);if(error)return alert(error.message);renderRivalClubBase()}
async function rivalAnalysisEdit(id){if(!admin())return;const x=(state.rivalX?.analyses||[]).find(a=>a.id===id);if(!x)return;const row=rivalAnalysisPrompts(x);if(!row)return;row.updated_at=new Date().toISOString();const {error}=await sb.from('rival_analisis').update(row).eq('id',id);if(error)return alert(error.message);renderRivalClubBase()}
async function rivalAnalysisDelete(id){if(!admin()||!confirm('¿Eliminar este análisis? No se puede deshacer.'))return;const {error}=await sb.from('rival_analisis').delete().eq('id',id);if(error)return alert(error.message);renderRivalClubBase()}
const RIVAL_SYSTEMS={'4-2-3-1':default4231,'4-4-2':[{n:'1',x:50,y:91},{n:'4',x:84,y:72},{n:'2',x:62,y:76},{n:'6',x:38,y:76},{n:'3',x:16,y:72},{n:'7',x:84,y:46},{n:'5',x:60,y:52},{n:'8',x:40,y:52},{n:'11',x:16,y:46},{n:'9',x:40,y:22},{n:'10',x:60,y:24}],'4-3-3':[{n:'1',x:50,y:91},{n:'4',x:84,y:72},{n:'2',x:62,y:76},{n:'6',x:38,y:76},{n:'3',x:16,y:72},{n:'5',x:50,y:58},{n:'8',x:68,y:46},{n:'10',x:32,y:46},{n:'7',x:82,y:24},{n:'9',x:50,y:18},{n:'11',x:18,y:24}],'3-5-2':[{n:'1',x:50,y:91},{n:'2',x:72,y:76},{n:'6',x:50,y:78},{n:'3',x:28,y:76},{n:'4',x:88,y:50},{n:'5',x:50,y:58},{n:'8',x:66,y:46},{n:'10',x:34,y:46},{n:'11',x:12,y:50},{n:'9',x:40,y:20},{n:'7',x:60,y:22}],'5-3-2':[{n:'1',x:50,y:91},{n:'4',x:88,y:66},{n:'2',x:70,y:76},{n:'6',x:50,y:78},{n:'3',x:30,y:76},{n:'11',x:12,y:66},{n:'5',x:50,y:54},{n:'8',x:70,y:48},{n:'10',x:30,y:48},{n:'9',x:40,y:22},{n:'7',x:60,y:22}]};
async function rivalFormationReset(clubId){if(!admin())return;const keys=Object.keys(RIVAL_SYSTEMS);const ans=prompt(`Sistema del rival:\n${keys.map((k,i)=>`${i+1}. ${k}`).join('\n')}`,'1');if(ans===null)return;const k=keys[parseInt(ans,10)-1]||(RIVAL_SYSTEMS[ans.trim()]?ans.trim():null);if(!k)return alert('Elegí un número de la lista.');
 const cur=state.rivalX?.formation;if(cur&&!confirm(`¿Cambiar la formación a ${k}? Se reemplazan las posiciones actuales.`))return;
 const row={club_id:clubId,sistema:k,jugadores:structuredClone(RIVAL_SYSTEMS[k]),updated_at:new Date().toISOString()};
 const q=cur?sb.from('rival_formacion').update(row).eq('id',cur.id):sb.from('rival_formacion').insert(row);const {error}=await q;if(error)return alert(error.message);renderRivalClubBase()}
async function rivalFormationEdit(ev,i){ev.stopPropagation();if(!admin()||!state.rivalX?.formation)return;if(ev.currentTarget.dataset.dragged==='1'){ev.currentTarget.dataset.dragged='0';return}
 const players=structuredClone(state.rivalX.formation.jugadores||[]),p=players[i];const n=prompt('Número:',p.n||'');if(n===null)return;const name=prompt('Nombre / referencia:',p.name||'');if(name===null)return;p.n=n;p.name=name;
 const {error}=await sb.from('rival_formacion').update({jugadores:players,updated_at:new Date().toISOString()}).eq('id',state.rivalX.formation.id);if(error)return alert(error.message);renderRivalClubBase()}
function enableRivalFormationDrag(){if(!admin()||!state.rivalX?.formation)return;const pitch=document.getElementById('rivalFormationPitch');if(!pitch)return;
 pitch.querySelectorAll('.player-dot').forEach(dot=>{let moved=false;
  dot.addEventListener('pointerdown',e=>{moved=false;dot.setPointerCapture(e.pointerId)});
  dot.addEventListener('pointermove',e=>{if(!dot.hasPointerCapture(e.pointerId))return;const r=pitch.getBoundingClientRect();const x=Math.max(4,Math.min(96,(e.clientX-r.left)/r.width*100)),y=Math.max(4,Math.min(96,(e.clientY-r.top)/r.height*100));dot.style.left=x+'%';dot.style.top=y+'%';dot.dataset.x=x;dot.dataset.y=y;moved=true});
  dot.addEventListener('pointerup',async e=>{if(!moved)return;dot.dataset.dragged='1';const players=structuredClone(state.rivalX.formation.jugadores||[]),i=+dot.dataset.i;players[i].x=+dot.dataset.x;players[i].y=+dot.dataset.y;const {error}=await sb.from('rival_formacion').update({jugadores:players,updated_at:new Date().toISOString()}).eq('id',state.rivalX.formation.id);if(error)alert(error.message);else state.rivalX.formation.jugadores=players})})}

// ===================== GENERAL · Configuración del equipo =====================
async function renderSettings(){
 const c=state.ctx||{},e=c.equipo||{};
 app.innerHTML=shell(`<div class="eyebrow">ADMINISTRACIÓN</div><h1 class="title">Configuración</h1><div class="empty">Cargando…</div>`,'Configuración');
 let codes=null,members=[];
 if(admin()){const [r1,r2]=await Promise.all([sb.from('equipo_codigos').select('*').eq('equipo_id',e.id).maybeSingle(),sb.from('profiles').select('id,nombre,cargo,rol,ultima_conexion').eq('equipo_id',e.id).order('nombre')]);codes=r1.data;members=r2.data||[]}
 const venc=e.suscripcion_hasta?fmtDate(e.suscripcion_hasta):'Sin vencimiento';
 const cuenta=`<div class="panel"><h3>Tu cuenta</h3><p>${esc(state.user.email)}</p><p class="muted">Rol: ${admin()?'Administrador':'Lector'}${c.superadmin?' · Súper-admin':''}</p><button class="danger" onclick="logout()">Cerrar sesión</button></div>`;
 const equipo=`<div class="panel"><h3>Equipo</h3><div class="set-brand">${crestHTML()}<div><b>${esc(e.nombre||'—')}</b><p class="muted small">Plan ${esc(e.plan||'general')} · Suscripción: ${venc}</p></div></div>${admin()?`<div class="set-actions"><button class="secondary" onclick="setCrest()">Cambiar escudo</button><label class="set-color">Color <input type="color" value="${esc(e.color||'#1593e7')}" onchange="setColor(this.value)"></label></div>`:''}</div>`;
 const invit=admin()&&codes?`<div class="panel"><h3>Invitar al cuerpo técnico</h3><p class="muted small">Cada persona crea su cuenta en la app y entra con uno de estos códigos.</p><div class="codes"><div><small>Código para lectores (CT, jugadores)</small><b class="code">${esc(codes.codigo_lector)}</b><button class="ghost mini" onclick="copyText('${esc(codes.codigo_lector)}')">Copiar</button></div><div><small>Código para administradores (pueden cargar y editar)</small><b class="code">${esc(codes.codigo_admin)}</b><button class="ghost mini" onclick="copyText('${esc(codes.codigo_admin)}')">Copiar</button></div></div><p class="muted small">Link para compartir: <b>${esc(location.origin)}</b></p></div>`:'';
 const soporte=isClubAdmin()?await soporteCardHTML(e):'';
 const miembros=admin()?`<div class="panel"><h3>Miembros (${members.length})</h3><div class="members">${members.map(m=>`<div class="member"><div><b>${esc(m.nombre||'—')}</b><small class="muted">${esc(m.cargo||'')}</small></div><select class="mini-select" onchange="setRole('${m.id}',this.value)" ${m.id===state.user.id?'disabled':''}><option value="lector" ${m.rol==='lector'?'selected':''}>Lector</option><option value="admin" ${m.rol==='admin'?'selected':''}>Admin</option></select></div>`).join('')||'<div class="empty">Todavía no hay miembros.</div>'}</div></div>`:'';
 app.innerHTML=shell(`<div class="eyebrow">ADMINISTRACIÓN</div><h1 class="title">Configuración</h1><div class="set-grid">${equipo}${cuenta}${soporte}${invit}${miembros}</div>`,'Configuración');
}
function copyText(t){navigator.clipboard?.writeText(t).then(()=>alert('Copiado: '+t)).catch(()=>prompt('Copiá el código:',t))}
async function setRole(uid,rol){const {error}=await sb.rpc('cambiar_rol',{p_usuario:uid,p_rol:rol});if(error)alert(error.message);renderSettings()}
async function setColor(c){const {error}=await sb.rpc('actualizar_marca',{p_escudo:null,p_color:c});if(error)return alert(error.message);await loadProfile();renderSettings()}
function setCrest(){const inp=document.createElement('input');inp.type='file';inp.accept='image/png,image/jpeg,image/webp,image/svg+xml';inp.onchange=async()=>{const f=inp.files[0];if(!f)return;if(f.size>2*1024*1024)return alert('La imagen tiene que pesar menos de 2 MB.');const ext=(f.name.split('.').pop()||'png').toLowerCase().replace(/[^a-z0-9]/g,'');const key=`${state.ctx.equipo.id}/escudo/${Date.now()}.${ext}`;const up=await sb.storage.from('partidos').upload(key,f,{upsert:false,contentType:f.type||undefined});if(up.error)return alert(up.error.message);const url=sb.storage.from('partidos').getPublicUrl(key).data.publicUrl;const {error}=await sb.rpc('actualizar_marca',{p_escudo:url,p_color:null});if(error)return alert(error.message);await loadProfile();renderSettings()};inp.click()}

// ===================== GENERAL · Panel súper-admin =====================
async function renderSuper(){
 if(!state.ctx?.superadmin){go('dashboard');return}
 const wrap=b=>state.ctx.equipo?shell(b,'Súper-admin'):`<div class="super-solo"><div class="super-top"><div class="brand">ANALYST<span>HUB</span></div><span class="muted small">Súper-admin · ${esc(state.user.email)}</span><button class="ghost mini" onclick="logout()">Salir</button></div>${b}</div>`;
 app.innerHTML=wrap('<div class="empty">Cargando equipos…</div>');
 const [r1,r2,r3]=await Promise.all([sb.from('equipos').select('*').order('nombre'),sb.from('equipo_codigos').select('*'),sb.rpc('conteo_miembros')]);
 if(r1.error){app.innerHTML=wrap(`<div class="empty">${esc(r1.error.message)}</div>`);return}
 const codes=Object.fromEntries((r2.data||[]).map(x=>[x.equipo_id,x])),cnt={};(r3.data||[]).forEach(p=>{if(p.equipo_id)cnt[p.equipo_id]=Number(p.n)||0});
 const today=new Date().toISOString().slice(0,10);
 window.__eqs=r1.data||[];const PL={general:'General',adaptable:'Adaptable',prueba:'Prueba'};const cntP={todos:(r1.data||[]).length};(r1.data||[]).forEach(e=>cntP[e.plan]=(cntP[e.plan]||0)+1);
 const rows=(r1.data||[]).filter(e=>superFilter==='todos'||e.plan===superFilter).map(e=>{const venc=e.suscripcion_hasta,vencido=venc&&venc<today,cur=state.ctx.equipo?.id===e.id;const perm=e.soporte_hasta&&new Date(e.soporte_hasta)>new Date();const permTxt=perm?`<span class="sa-perm ok" title="El club te dio acceso">🔓 Acceso hasta ${fmtDateTime(e.soporte_hasta)}</span>`:`<span class="sa-perm no" title="El club tiene que darte permiso desde su Configuración">🔒 Sin permiso de acceso</span>`;const st=!e.activo?'<span class="sa-st off">Pausado</span>':vencido?'<span class="sa-st warn">Vencido</span>':'<span class="sa-st on">Activo</span>';const k=codes[e.id]||{};
  return `<div class="sa-row ${cur?'is-cur':''}"><div class="sa-main">${e.escudo_url?`<img src="${esc(e.escudo_url)}" alt="">`:'<i class="sa-ph">'+esc((e.nombre_corto||e.nombre||'?').slice(0,3))+'</i>'}<div><b>${esc(e.nombre)}</b><small class="muted"><span class="sa-plan p-${esc(e.plan)}">${PL[e.plan]||esc(e.plan)}</span> ${cnt[e.id]||0} miembros · vence ${venc?fmtDate(venc):'—'} · ${permTxt}${featCustomCount(e)?` · <b class="sa-fx">${featCustomCount(e)} función(es) a medida</b>`:''}</small></div>${st}</div><div class="sa-codes"><small>Lector <b>${esc(k.codigo_lector||'—')}</b></small><small>Admin <b>${esc(k.codigo_admin||'—')}</b></small></div><div class="sa-actions"><button class="primary mini" ${perm?'':'disabled title="Sin permiso del club"'} onclick="superEnter('${e.id}')">${cur?'Estás adentro':'Entrar'}</button><button class="secondary mini" onclick="superExtend('${e.id}','${venc||''}')">+30 días</button><button class="secondary mini" onclick="superFeatures('${e.id}')">Funciones</button><button class="secondary mini" onclick="superEdit('${e.id}')">Editar</button><button class="ghost mini" onclick="superToggle('${e.id}',${!e.activo})">${e.activo?'Pausar':'Activar'}</button><button class="ghost mini" onclick="superCodes('${e.id}')">Nuevos códigos</button><button class="primary mini" onclick="superInvite('${e.id}')">Invitación</button></div></div>`}).join('')||'<div class="empty">Todavía no hay equipos. Creá el primero.</div>';
 app.innerHTML=wrap(`<div class="eyebrow">SÚPER-ADMIN</div><div class="toolbar"><div><h1 class="title">Equipos suscriptos</h1><p class="muted">Alta de clubes, códigos de acceso y suscripciones.</p></div><div class="actions">${state.ctx.equipo?'<button class="ghost" onclick="superLeave()">Salir del equipo</button>':''}<button class="primary" onclick="superCreate()">+ Nuevo equipo</button></div></div><div class="sa-filter">${['todos','general','adaptable','prueba'].map(k=>`<button class="zp-chip ${superFilter===k?'on':''}" onclick="superFilter='${k}';renderSuper()">${k==='todos'?'Todos':PL[k]} <em>${cntP[k]||0}</em></button>`).join('')}</div><div class="sa-list">${rows||'<div class="empty">No hay equipos con ese plan.</div>'}</div>`);
}
async function superCreate(){const nombre=prompt('Nombre del club (ej. Club Atlético Ejemplo):');if(!nombre||!nombre.trim())return;const corto=prompt('Abreviatura (2 a 4 letras, ej. CAE):',nombre.trim().split(/\s+/).map(w=>w[0]).join('').slice(0,4).toUpperCase());if(corto===null)return;const plan=(prompt('Plan: general, adaptable o prueba','general')||'general').trim().toLowerCase();const dias=parseInt(prompt('¿Cuántos días de suscripción? (vacío = sin vencimiento)','30')||'',10);const vence=isNaN(dias)?null:new Date(Date.now()+dias*864e5).toISOString().slice(0,10);
 const {data,error}=await sb.rpc('crear_equipo',{p_nombre:nombre.trim(),p_corto:(corto||'').trim(),p_vence:vence,p_plan:['general','adaptable','prueba'].includes(plan)?plan:'general'});if(error)return alert(error.message);
 alert(`Equipo creado.\n\nCódigo para el ADMIN del club: ${data.codigo_admin}\nCódigo para LECTORES: ${data.codigo_lector}\n\nEl club entra a ${location.origin}, crea su cuenta y usa el código.`);renderSuper()}
async function superExtend(id,venc){const base=venc&&venc>=new Date().toISOString().slice(0,10)?new Date(venc+'T12:00:00'):new Date();base.setDate(base.getDate()+30);const {error}=await sb.from('equipos').update({suscripcion_hasta:base.toISOString().slice(0,10),activo:true}).eq('id',id);if(error)return alert(error.message);renderSuper()}
async function superToggle(id,on){if(!on&&!confirm('¿Pausar este equipo? Sus usuarios no van a poder entrar (los datos se conservan).'))return;const {error}=await sb.from('equipos').update({activo:on}).eq('id',id);if(error)return alert(error.message);renderSuper()}
async function superCodes(id){if(!confirm('¿Generar códigos nuevos? Los anteriores dejan de servir (los que ya entraron siguen igual).'))return;const {data,error}=await sb.rpc('regenerar_codigos',{p_equipo:id});if(error)return alert(error.message);alert(`Nuevos códigos:\nAdmin: ${data.codigo_admin}\nLector: ${data.codigo_lector}`);renderSuper()}
async function superEdit(id){const {data:e,error}=await sb.from('equipos').select('*').eq('id',id).single();if(error)return alert(error.message);const nombre=prompt('Nombre:',e.nombre);if(nombre===null)return;const corto=prompt('Abreviatura:',e.nombre_corto||'');if(corto===null)return;const plan=prompt('Plan (general, adaptable, prueba):',e.plan);if(plan===null)return;const venc=prompt('Vence (AAAA-MM-DD, vacío = sin vencimiento):',e.suscripcion_hasta||'');if(venc===null)return;const notas=prompt('Notas internas (pagos, contacto…):',e.notas||'');if(notas===null)return;
 const row={nombre:nombre.trim()||e.nombre,nombre_corto:corto.trim().toUpperCase(),plan:['general','adaptable','prueba'].includes(plan.trim())?plan.trim():e.plan,suscripcion_hasta:/^\d{4}-\d{2}-\d{2}$/.test(venc.trim())?venc.trim():null,notas:notas.trim()};const {error:e2}=await sb.from('equipos').update(row).eq('id',id);if(e2)return alert(e2.message);if(state.ctx.equipo?.id===id)await loadProfile();renderSuper()}
async function superEnter(id){const {error}=await sb.rpc('elegir_equipo',{p_equipo:id});if(error)return alert(error.message);await loadProfile();await loadData();state.page='dashboard';render();setupCTPresence()}
async function superLeave(){const {error}=await sb.rpc('elegir_equipo',{p_equipo:null});if(error)return alert(error.message);await loadProfile();state.matches=[];state.players=[];state.page='super';render()}
// ===================== GENERAL · Funciones por club (interruptores) =====================
let superFilter='todos';
function featCustomCount(e){const o=e.funciones||{};return Object.keys(o).filter(k=>{const f=featDef(k);return f&&!!o[k]!==f.def}).length}
function superFeatures(id){const e=(window.__eqs||[]).find(x=>x.id===id);if(!e)return;const groups={};FEATURES.forEach(f=>(groups[f.grupo]=groups[f.grupo]||[]).push(f));
 const body=Object.entries(groups).map(([g,fs])=>`<div class="fx-group"><div class="fx-gtitle">${esc(g)}${g.includes('Adaptable')&&e.plan!=='adaptable'?' <span class="muted small">· solo para plan Adaptable</span>':''}</div>${fs.map(f=>{const dis=f.adaptable&&e.plan!=='adaptable',on=featOn(f.k,e),custom=Object.prototype.hasOwnProperty.call(e.funciones||{},f.k)&&!!e.funciones[f.k]!==f.def;
  return `<label class="fx-row ${dis?'is-dis':''}"><span class="fx-txt"><b>${esc(f.label)}${f.pronto?' <em class="fx-soon">próximamente</em>':''}${custom?' <em class="fx-custom">a medida</em>':''}</b><small>${esc(f.desc)} · por defecto ${f.def?'prendida':'apagada'}</small></span><span class="fx-sw"><input type="checkbox" ${on?'checked':''} ${dis?'disabled':''} onchange="superSetFeat('${e.id}','${f.k}',this.checked)"><i></i></span></label>`}).join('')}</div>`).join('');
 document.getElementById('fxModal')?.remove();
 app.insertAdjacentHTML('beforeend',`<div id="fxModal" class="modal-bg" onclick="if(event.target===this)this.remove()"><div class="modal fx-modal"><div class="zp-head"><div><span class="sa-plan p-${esc(e.plan)}">${esc({general:'General',adaptable:'Adaptable',prueba:'Prueba'}[e.plan]||e.plan)}</span><h2>Funciones · ${esc(e.nombre)}</h2><p class="muted small">Los cambios se aplican solo a este club y se guardan al instante.</p></div><button class="ghost" onclick="document.getElementById('fxModal').remove()">Cerrar ✕</button></div>${body}<div class="modal-actions"><button class="ghost" onclick="superResetFeat('${e.id}')">Volver a lo estándar</button></div></div></div>`)}
async function superSetFeat(id,k,on){const e=(window.__eqs||[]).find(x=>x.id===id);if(!e)return;const f=featDef(k),o={...(e.funciones||{})};if(on===f.def)delete o[k];else o[k]=on;const {error}=await sb.from('equipos').update({funciones:o}).eq('id',id);if(error)return alert(error.message);e.funciones=o;if(state.ctx.equipo?.id===id){state.ctx.equipo.funciones=o}superFeatures(id);const row=document.querySelector('.sa-list');if(row)renderSuperSoft()}
async function superResetFeat(id){if(!confirm('¿Volver este club a las funciones estándar de su plan?'))return;const {error}=await sb.from('equipos').update({funciones:{}}).eq('id',id);if(error)return alert(error.message);const e=(window.__eqs||[]).find(x=>x.id===id);if(e)e.funciones={};if(state.ctx.equipo?.id===id)state.ctx.equipo.funciones={};document.getElementById('fxModal')?.remove();renderSuper()}
function renderSuperSoft(){const m=document.getElementById('fxModal');const html=m?m.outerHTML:'';renderSuper().then(()=>{if(html&&!document.getElementById('fxModal'))app.insertAdjacentHTML('beforeend',html)})}

// ===================== GENERAL · Permiso de soporte (el club decide si el súper-admin entra) =====================
function fmtDateTime(v){const d=new Date(v);if(isNaN(d))return '';return new Intl.DateTimeFormat('es-AR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}).format(d)}
const isClubAdmin=()=>state.profile?.equipo_id&&state.profile?.rol==='admin'&&state.profile.equipo_id===state.ctx?.equipo?.id;
async function soporteCardHTML(e){
 const {data:acc}=await sb.from('accesos_soporte').select('email,momento').eq('equipo_id',e.id).order('momento',{ascending:false}).limit(8);
 const on=e.soporte_hasta&&new Date(e.soporte_hasta)>new Date();
 return `<div class="panel"><h3>Acceso de soporte</h3><p class="muted small">El administrador de Analyst Hub solo puede entrar a la plataforma de tu club si vos le das permiso, y por el tiempo que elijas. Cada ingreso queda registrado acá.</p>
 <div class="sup-st ${on?'on':'off'}">${on?`🔓 Permiso activo hasta <b>${fmtDateTime(e.soporte_hasta)}</b>`:'🔒 Sin permiso: no puede entrar a tu club'}</div>
 <div class="set-actions"><button class="secondary" onclick="setSupport(24)">Dar acceso 24 h</button><button class="secondary" onclick="setSupport(168)">Dar acceso 7 días</button>${on?'<button class="danger" onclick="setSupport(0)">Quitar acceso</button>':''}</div>
 <div class="sup-log"><small class="muted">Últimos ingresos</small>${(acc||[]).map(a=>`<div><span>${esc(a.email||'Administrador')}</span><em>${fmtDateTime(a.momento)}</em></div>`).join('')||'<div class="muted small">Nunca ingresó.</div>'}</div></div>`}
async function setSupport(h){if(h===0&&!confirm('¿Quitar el acceso de soporte?'))return;const {error}=await sb.rpc('dar_acceso_soporte',{p_horas:h});if(error)return alert(error.message);await loadProfile();renderSettings()}


// ===================== GENERAL · Invitación por club (imagen + mensaje con link y código) =====================
(function(){try{const c=new URLSearchParams(location.search).get('codigo');if(c&&/^[AC]-[0-9A-F]{8}$/i.test(c)){localStorage.setItem('ah-invite',c.toUpperCase());history.replaceState(null,'',location.pathname)}}catch(_){}})();
function inviteCode(){try{return localStorage.getItem('ah-invite')||''}catch(_){return ''}}
let invState={id:null,tipo:'admin'};
function invData(){const e=(window.__eqs||[]).find(x=>x.id===invState.id);const k=(window.__codes||{})[invState.id]||{};const code=invState.tipo==='admin'?k.codigo_admin:k.codigo_lector;return {e,code,link:`${location.origin}/?codigo=${encodeURIComponent(code||'')}`,home:location.host}}
function invText(){const {e,code,link,home}=invData();if(!e)return '';const rol=invState.tipo==='admin'?'administrador (podés cargar y editar todo)':'lector (podés ver todo el material)';const prueba=e.plan==='prueba'&&e.suscripcion_hasta?`\nPeríodo de prueba hasta el ${new Intl.DateTimeFormat('es-AR',{day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date(e.suscripcion_hasta+'T12:00:00'))}.`:'';
 return `Hola! Ya está lista la plataforma de *${e.nombre}* en Analyst Hub.\n\n1. Entrá a: ${link}\n2. Tocá *Crear cuenta nueva* y registrate con tu mail y una contraseña.\n3. Poné tu nombre. Tu código es *${code}* (si entrás desde el link ya viene cargado).\n\nTu acceso es de ${rol}.${prueba}\nTambién incluye Analyst Tag para marcar partidos: ${home}/tag/\n\nCualquier duda, escribime.`}
async function superInvite(id){invState={id,tipo:invState.id===id?invState.tipo:'admin'};const {data}=await sb.from('equipo_codigos').select('*');window.__codes=Object.fromEntries((data||[]).map(x=>[x.equipo_id,x]));invRender()}
function invRender(){const {e,code}=invData();if(!e)return;document.getElementById('invModal')?.remove();
 app.insertAdjacentHTML('beforeend',`<div id="invModal" class="modal-bg" onclick="if(event.target===this)this.remove()"><div class="modal inv-modal"><div class="zp-head"><div><h2>Invitación · ${esc(e.nombre)}</h2><p class="muted small">Mandá la imagen y el mensaje por WhatsApp. El link ya trae el código cargado.</p></div><button class="ghost" onclick="document.getElementById('invModal').remove()">Cerrar ✕</button></div>
 <div class="inv-tabs"><button class="zp-chip ${invState.tipo==='admin'?'on':''}" onclick="invState.tipo='admin';invRender()">Para el analista (admin)</button><button class="zp-chip ${invState.tipo==='lector'?'on':''}" onclick="invState.tipo='lector';invRender()">Para el cuerpo técnico (lector)</button></div>
 <div class="inv-body"><canvas id="invCanvas" width="1080" height="1080" aria-label="Imagen de invitación"></canvas><div class="inv-side"><label for="invMsg">Mensaje</label><textarea id="invMsg" readonly>${esc(invText())}</textarea>
 <div class="inv-actions"><button class="primary" onclick="invDownload()">Descargar imagen</button><button class="secondary" onclick="invCopy(this)">Copiar mensaje</button><a class="secondary inv-wa" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(invText())}">Abrir WhatsApp</a></div>
 <p class="muted small">${code?'':'Este club no tiene código todavía: tocá «Nuevos códigos».'}En WhatsApp: primero adjuntá la imagen descargada y después pegá el mensaje.</p></div></div></div></div>`);
 invDraw()}
function invLoad(src){return new Promise(r=>{if(!src)return r(null);const i=new Image();i.crossOrigin='anonymous';i.onload=()=>r(i);i.onerror=()=>r(null);i.src=src})}
async function invDraw(){const cv=document.getElementById('invCanvas');if(!cv)return;const x=cv.getContext('2d');const {e,code,home}=invData();const W=1080,acc=e.color||'#1593e7';
 const g=x.createRadialGradient(780,180,40,780,180,900);g.addColorStop(0,'#0f3553');g.addColorStop(1,'#080b0f');x.fillStyle=g;x.fillRect(0,0,W,W);
 x.strokeStyle='#263442';x.lineWidth=2;x.strokeRect(40,40,W-80,W-80);
 const F='Inter,Segoe UI,Arial,sans-serif';x.textAlign='center';
 x.font=`900 34px ${F}`;x.fillStyle='#f3f7fa';const t1='ANALYST',t2='HUB';x.letterSpacing='6px';const w1=x.measureText(t1).width,w2=x.measureText(t2).width;x.textAlign='left';x.fillText(t1,W/2-(w1+w2)/2,120);x.fillStyle=acc;x.fillText(t2,W/2-(w1+w2)/2+w1,120);x.letterSpacing='0px';x.textAlign='center';
 const img=await invLoad(e.escudo_url);if(!document.getElementById('invCanvas'))return;
 if(img){const s=230,r=Math.min(s/img.width,s/img.height);x.drawImage(img,W/2-img.width*r/2,165+(s-img.height*r)/2,img.width*r,img.height*r)}else{x.fillStyle='#151e27';x.beginPath();x.arc(W/2,280,115,0,7);x.fill();x.fillStyle='#f3f7fa';x.font=`900 72px ${F}`;x.fillText((e.nombre_corto||e.nombre||'?').slice(0,3),W/2,305)}
 x.fillStyle='#8d9aa7';x.font=`600 30px ${F}`;x.fillText('Te damos la bienvenida a la plataforma de',W/2,460);
 x.fillStyle='#f3f7fa';let fs=72;x.font=`800 ${fs}px ${F}`;while(x.measureText(e.nombre).width>W-160&&fs>40){fs-=4;x.font=`800 ${fs}px ${F}`}x.fillText(e.nombre,W/2,540);
 x.fillStyle='#55b9f5';x.font=`800 24px ${F}`;x.letterSpacing='4px';x.fillText(invState.tipo==='admin'?'ACCESO DE ADMINISTRADOR':'ACCESO DE LECTOR',W/2,600);x.letterSpacing='0px';
 x.fillStyle='#10161d';x.strokeStyle=acc;x.lineWidth=3;x.beginPath();x.roundRect(240,630,600,130,22);x.fill();x.stroke();
 x.fillStyle='#8d9aa7';x.font=`700 22px ${F}`;x.fillText('TU CÓDIGO',W/2,670);x.fillStyle='#f3f7fa';x.font=`800 58px ui-monospace,Consolas,monospace`;x.fillText(code||'—',W/2,735);
 const steps=[['1','Entrá a '+home],['2','Tocá «Crear cuenta nueva» con tu mail'],['3','Poné tu nombre y el código']];x.textAlign='left';
 steps.forEach(([n,t],i)=>{const y=830+i*62;x.fillStyle=acc;x.beginPath();x.arc(230,y-10,22,0,7);x.fill();x.fillStyle='#fff';x.font=`800 24px ${F}`;x.textAlign='center';x.fillText(n,230,y-2);x.textAlign='left';x.fillStyle='#e6edf2';x.font=`600 30px ${F}`;x.fillText(t,270,y)});
 x.textAlign='center';x.fillStyle='#5d6b78';x.font=`600 20px ${F}`;x.fillText('Incluye Analyst Tag · '+home+'/tag/',W/2,1015)}
function invDownload(){const cv=document.getElementById('invCanvas');const {e}=invData();try{cv.toBlob(b=>{if(!b)return alert('No se pudo generar la imagen. Probá recargar la página.');const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=`invitacion-${(e.nombre_corto||e.nombre).toLowerCase().replace(/[^a-z0-9]+/g,'-')}-${invState.tipo}.png`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),3000)},'image/png')}catch(err){alert('No se pudo generar la imagen: '+err.message)}}
async function invCopy(btn){const t=document.getElementById('invMsg');try{await navigator.clipboard.writeText(t.value);btn.textContent='Copiado ✓'}catch(_){t.select();document.execCommand('copy');btn.textContent='Copiado ✓'}setTimeout(()=>{if(btn)btn.textContent='Copiar mensaje'},1800)}

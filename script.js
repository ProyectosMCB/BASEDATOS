/* ===== Mini motor T-SQL (simulado, en memoria) ===== */
const L=s=>s.toLowerCase(),E=m=>{throw new Error(m)},$=id=>document.getElementById(id);
const esc=s=>String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
let S={dbs:{},cur:null};
const split=(s,sep=",")=>{const o=[];let d=0,q=0,b="";for(const c of s){if(c==="'")q^=1;if(!q){if(c==="(")d++;else if(c===")")d--;else if(c===sep&&!d){o.push(b.trim());b="";continue}}b+=c}if(b.trim())o.push(b.trim());return o};
const val=s=>{s=s.trim();if(/^null$/i.test(s))return null;const m=s.match(/^N?'(.*)'$/s);if(m)return m[1].replace(/''/g,"'");if(/^-?\d+(\.\d+)?$/.test(s))return +s;E(`Valor no válido: ${s}. Los textos van entre comillas simples.`)};
const db=()=>S.cur?S.dbs[S.cur]:E("No hay una base de datos activa. Ejecuta USE NombreBase;");
const tb=n=>db().t[L(n)]||E(`Nombre de objeto '${n}' no válido: la tabla no existe.`);
const col=(t,n)=>{const q=n.includes('.'),f=t.cols.filter(c=>L(q?c.name:c.bare||c.name)===L(n));if(f.length>1)E(`El nombre de columna '${n}' es ambiguo: califícalo (alias.columna).`);return f[0]||E(`Nombre de columna '${n}' no válido${t.name?' en la tabla '+t.name:''}.`)};
const fk=(t,c,r,rc)=>{const p=tb(r);if(L(p.pk||"")!==L(rc))E(`${r}.${rc} no es la PRIMARY KEY de ${r}: una FOREIGN KEY debe apuntar a una clave primaria.`);t.fks.push({col:c,ref:p.name,rc:p.pk})};
const rows=n=>`(${n} ${n==1?"fila afectada":"filas afectadas"})`;

function cond(t,c){
  const m=c.trim().replace(/^\((.*)\)$/s,"$1").match(/^([\w.]+)\s*(<>|!=|>=|<=|=|>|<|LIKE|IN|IS\s+NOT\s+NULL|IS\s+NULL)\s*(.*)$/is);
  if(!m)E("Condición no válida en WHERE: "+c);
  const k=col(t,m[1]).name,o=m[2].toUpperCase().replace(/\s+/g," "),x=o.startsWith("IS")?0:o==="IN"?split(m[3].replace(/^\(|\)$/g,"")).map(val):val(m[3]);
  const n=v=>typeof v==="string"?v.toLowerCase():v,X=Array.isArray(x)?x.map(n):n(x);
  const re=o==="LIKE"?new RegExp("^"+String(x).replace(/[.*+?^${}()|[\]\\]/g,"\\$&").replace(/%/g,".*").replace(/_/g,".")+"$","i"):0;
  return r=>{const a=r[k],A=n(a);
    if(o==="IS NULL")return a==null;if(o==="IS NOT NULL")return a!=null;if(a==null)return false;
    return o==="IN"?X.includes(A):o==="LIKE"?re.test(a):o==="="?A===X:o==="<>"||o==="!="?A!==X:o===">"?A>X:o==="<"?A<X:o===">="?A>=X:A<=X}}
const where=(t,w)=>{if(!w)return()=>true;const g=w.split(/\s+OR\s+/i).map(a=>a.split(/\s+AND\s+/i).map(c=>cond(t,c)));return r=>g.some(a=>a.every(f=>f(r)))};

function chk(t,o,others){
  for(const c of t.cols){const v=o[c.name];
    if(v==null){if(c.nn)E(`No se puede insertar NULL en la columna '${c.name}' de ${t.name}: no admite valores NULL.`);continue}
    const num=["INT","DECIMAL","BIT"].includes(c.type);
    if(num&&typeof v!=="number")E(`Error de conversión: '${v}' no es un número válido para ${c.name} (${c.type}).`);
    if(!num&&typeof v!=="string")E(`La columna ${c.name} (${c.type}) espera texto entre comillas simples.`);
    if(c.type==="INT"&&!Number.isInteger(v))E(`La columna ${c.name} es INT: no admite decimales.`);
    if(c.len&&v.length>c.len)E(`Se truncarían los datos: '${c.name}' admite máximo ${c.len} caracteres.`)}
  for(const c of t.cols){const v=o[c.name];if(v==null)continue;
    if(c.uniq&&others.some(r=>r[c.name]===v))E(`Violación de la restricción UNIQUE: el valor '${v}' ya existe en ${t.name}.${c.name}.`);
    if(c.ck&&!where(t,c.ck)(o))E(`Conflicto con la restricción CHECK: ${c.name} no cumple la condición (${c.ck}).`)}
  if(t.pk&&others.some(r=>r[t.pk]===o[t.pk]))E(`Violación de la restricción PRIMARY KEY: ya existe ${t.pk} = ${o[t.pk]} en ${t.name}. No se puede insertar una clave duplicada.`);
  for(const f of t.fks){const v=o[f.col];if(v!=null&&!tb(f.ref).rows.some(r=>r[f.rc]===v))E(`Conflicto con la restricción FOREIGN KEY: el valor ${v} de ${f.col} no existe en ${f.ref}(${f.rc}).`)}}

function run(s){let m;
  if(m=s.match(/^CREATE DATABASE (\w+)$/i)){if(S.dbs[L(m[1])])E(`La base de datos '${m[1]}' ya existe.`);S.dbs[L(m[1])]={name:m[1],t:{}};return{msg:"Comandos completados correctamente."}}
  if(m=s.match(/^USE \[?(\w+)\]?$/i)){if(!S.dbs[L(m[1])])E(`La base de datos '${m[1]}' no existe. Créala con CREATE DATABASE.`);S.cur=L(m[1]);return{msg:`Contexto cambiado a ${S.dbs[S.cur].name}.`}}
  if(m=s.match(/^CREATE TABLE (\w+) ?\((.*)\)$/i)){
    const d=db();if(d.t[L(m[1])])E(`Ya existe un objeto llamado '${m[1]}' en la base de datos.`);
    const t={name:m[1],cols:[],pk:null,fks:[],rows:[],next:1};
    for(const x of split(m[2])){let a;
      if(a=x.match(/^(?:CONSTRAINT \w+ )?PRIMARY KEY ?\((\w+)\)$/i)){t.pk=col(t,a[1]).name;continue}
      if(a=x.match(/^(?:CONSTRAINT \w+ )?FOREIGN KEY ?\((\w+)\) ?REFERENCES (\w+) ?\((\w+)\)$/i)){fk(t,col(t,a[1]).name,a[2],a[3]);continue}
      a=x.match(/^(\w+) (\w+) ?(?:\( ?(\d+)[^)]*\))?(.*)$/i)||E("Definición de columna no válida: "+x);
      const ty=a[2].toUpperCase(),r=a[4];
      if(!["INT","DECIMAL","NVARCHAR","VARCHAR","DATE","BIT"].includes(ty))E(`Tipo de dato no reconocido: ${a[2]}.`);
      const c={name:a[1],type:ty,len:/VARCHAR/.test(ty)?+a[3]:0,ident:/IDENTITY/i.test(r),nn:/NOT NULL|PRIMARY KEY/i.test(r),uniq:/UNIQUE/i.test(r),ck:(r.match(/CHECK ?\(([^)]+)\)/i)||[])[1],def:(d=>d?val(d[1]):undefined)(r.match(/DEFAULT ('[^']*'|-?[\d.]+|NULL)/i))};
      t.cols.push(c);if(/PRIMARY KEY/i.test(r))t.pk=c.name;
      const f=r.match(/REFERENCES (\w+) ?\((\w+)\)/i);if(f)fk(t,c.name,f[1],f[2])}
    if(!t.cols.length)E("Una tabla necesita al menos una columna.");
    if(t.pk)col(t,t.pk).nn=true;d.t[L(m[1])]=t;return{msg:"Comandos completados correctamente."}}
  if(m=s.match(/^INSERT INTO (\w+) ?(?:\(([^)]*)\))? ?VALUES ?(.+)$/i)){
    const t=tb(m[1]),cn=m[2]?m[2].split(",").map(x=>col(t,x.trim()).name):t.cols.filter(c=>!c.ident).map(c=>c.name),add=[];let n=t.next;
    for(const g of split(m[3])){const v=split(g.replace(/^\(|\)$/g,"")).map(val);
      if(v.length!==cn.length)E(`El número de valores (${v.length}) no coincide con el de columnas (${cn.length}).`);
      const o={};t.cols.forEach(c=>o[c.name]=c.def===undefined?null:c.def);
      cn.forEach((k,i)=>{if(col(t,k).ident)E(`No se puede insertar un valor explícito en la columna IDENTITY '${k}'.`);o[k]=v[i]});
      t.cols.forEach(c=>{if(c.ident)o[c.name]=n++});chk(t,o,t.rows.concat(add));add.push(o)}
    t.rows.push(...add);t.next=n;return{msg:rows(add.length)}}
  if(m=s.match(/^SELECT (DISTINCT )?(?:TOP (\d+) )?(.+?) FROM (\w+)(?: (?:AS )?(?!(?:WHERE|INNER|LEFT|JOIN|GROUP|ORDER|HAVING|ON)\b)(\w+))?((?: (?:INNER |LEFT )?JOIN \w+(?: (?:AS )?(?!ON\b)\w+)? ON [\w.]+ ?= ?[\w.]+)*)(?: WHERE (.+?))?(?: GROUP BY (.+?))?(?: HAVING (.+?))?(?: ORDER BY (.+?))?$/i)){
    const mk=(t,a)=>({cols:t.cols.map(c=>({...c,bare:c.name,name:a+"."+c.name})),rows:t.rows.map(r=>Object.fromEntries(t.cols.map(c=>[a+"."+c.name,r[c.name]])))});
    const t0=tb(m[4]);let vt=mk(t0,m[5]||t0.name);
    for(const j of m[6].matchAll(/(INNER |LEFT )?JOIN (\w+)(?: (?:AS )?(?!ON\b)(\w+))? ON ([\w.]+) ?= ?([\w.]+)/gi)){
      const rv=mk(tb(j[2]),j[3]||j[2]),all={cols:vt.cols.concat(rv.cols)},ka=col(all,j[4]).name,kb=col(all,j[5]).name,lf=/LEFT/i.test(j[1]||""),nl=Object.fromEntries(rv.cols.map(c=>[c.name,null])),out=[];
      for(const l of vt.rows){const h=rv.rows.map(x=>({...l,...x})).filter(x=>x[ka]!=null&&x[ka]===x[kb]);if(h.length)out.push(...h);else if(lf)out.push({...l,...nl})}
      vt={cols:all.cols,rows:out}}
    const src=vt.rows.filter(where(vt,m[7])),AG=/^(COUNT|SUM|AVG|MIN|MAX) ?\((\*|[\w.]+)\)$/i;
    const items=m[3].trim()==="*"?vt.cols.map((c,i,a)=>({k:c.name,n:a.filter(x=>x.bare===c.bare).length>1?c.name:c.bare})):split(m[3]).map(x=>{const a=x.match(/^(.+?)(?: AS (\w+))?$/i),e=a[1].trim(),g=e.match(AG);return g?{ag:g[1].toUpperCase(),k:g[2]==="*"?null:col(vt,g[2]).name,n:a[2]||"(Sin nombre de columna)"}:{k:col(vt,e).name,n:a[2]||col(vt,e).bare}});
    const agg=(g,k,rs)=>{const v=k?rs.map(r=>r[k]).filter(x=>x!=null):rs,sm=v.reduce((a,b)=>a+b,0);return g==="COUNT"?v.length:!v.length?null:g==="SUM"?sm:g==="AVG"?+(sm/v.length).toFixed(2):g==="MIN"?v.reduce((a,b)=>a<b?a:b):v.reduce((a,b)=>a>b?a:b)};
    const gb=m[8]?split(m[8]).map(x=>col(vt,x).name):[];let res;
    if(items.some(i=>i.ag)||gb.length||m[9]){
      const gs=new Map();src.forEach(r=>{const k=JSON.stringify(gb.map(c=>r[c]));gs.has(k)?gs.get(k).push(r):gs.set(k,[r])});
      if(!gb.length&&!gs.size)gs.set("",[]);
      items.forEach(i=>{if(!i.ag&&!gb.includes(i.k))E(`La columna '${i.n}' no es válida en la lista de selección porque no está contenida en una función de agregado ni en la cláusula GROUP BY.`)});
      const hv=(m[9]||"").split(/ AND /i).filter(Boolean).map(h=>{const a=h.trim().match(/^(COUNT|SUM|AVG|MIN|MAX) ?\((\*|[\w.]+)\) ?(<>|>=|<=|=|>|<) ?(-?[\d.]+)$/i)||E("HAVING no válido: "+h),k=a[2]==="*"?null:col(vt,a[2]).name;return rs=>{const v=agg(a[1].toUpperCase(),k,rs),x=+a[4];return a[3]==="="?v===x:a[3]==="<>"?v!==x:a[3]===">"?v>x:a[3]==="<"?v<x:a[3]===">="?v>=x:v<=x}});
      res=[...gs.values()].filter(rs=>hv.every(f=>f(rs))).map(rs=>({s:rs[0]||{},o:Object.fromEntries(items.map(i=>[i.n,i.ag?agg(i.ag,i.k,rs):rs[0][i.k]]))}))}
    else res=src.map(r=>({s:r,o:Object.fromEntries(items.map(i=>[i.n,r[i.k]]))}));
    if(m[10]){const nv=v=>typeof v==="string"?v.toLowerCase():v,ks=split(m[10]).map(x=>{const a=x.match(/^([\w.]+)(?: (ASC|DESC))?$/i)||E("ORDER BY no válido: "+x),n=items.find(i=>L(i.n)===L(a[1])),cn=n?0:col(vt,a[1]).name;return{f:r=>n?r.o[n.n]:r.s[cn],d:/DESC/i.test(a[2]||"")?-1:1}});
      res.sort((a,b)=>{for(const k of ks){const x=nv(k.f(a)),y=nv(k.f(b));if(x!==y)return(x>y?1:-1)*k.d}return 0})}
    let out=res.map(r=>r.o);
    if(m[1]){const sn=new Set();out=out.filter(o=>{const k=JSON.stringify(o);return sn.has(k)?false:(sn.add(k),true)})}
    if(m[2])out=out.slice(0,+m[2]);
    return{cols:items.map(i=>i.n),data:out}}
  if(m=s.match(/^UPDATE (\w+) SET (.+?)(?: WHERE (.+))?$/i)){
    const t=tb(m[1]),f=where(t,m[3]),h=t.rows.filter(f);
    const st=split(m[2]).map(x=>{const a=x.match(/^(\w+) ?= ?(.*)$/)||E("SET no válido: "+x),c=col(t,a[1]);if(c.ident)E(`No se puede actualizar la columna IDENTITY '${c.name}'.`);return[c.name,val(a[2])]});
    const nw=h.map(r=>{const o={...r};st.forEach(([k,v])=>o[k]=v);chk(t,o,t.rows.filter(x=>x!==r));return o});
    h.forEach((r,i)=>Object.assign(r,nw[i]));return{msg:rows(h.length)}}
  if(m=s.match(/^DELETE FROM (\w+)(?: WHERE (.+))?$/i)){
    const t=tb(m[1]),h=t.rows.filter(where(t,m[2]));
    for(const u of Object.values(db().t))for(const f of u.fks)if(f.ref===t.name&&h.some(r=>u.rows.some(x=>x[f.col]===r[f.rc])))E(`La instrucción DELETE está en conflicto con la restricción REFERENCE: ${u.name}.${f.col} todavía hace referencia a ${t.name}. Borra primero las filas hijas.`);
    t.rows=t.rows.filter(r=>!h.includes(r));return{msg:rows(h.length)}}
  if(m=s.match(/^DROP TABLE (\w+)$/i)){const t=tb(m[1]);for(const u of Object.values(db().t))if(u!==t&&u.fks.some(f=>f.ref===t.name))E(`No se puede eliminar la tabla '${t.name}' porque una restricción FOREIGN KEY de '${u.name}' hace referencia a ella.`);delete db().t[L(t.name)];return{msg:"Comandos completados correctamente."}}
  if(m=s.match(/^ALTER TABLE (\w+) (ADD|DROP COLUMN) (.+)$/i)){const t=tb(m[1]);
    if(/^ADD/i.test(m[2])){run(`CREATE TABLE zz_tmp (${m[3]})`);const c=db().t.zz_tmp.cols[0];delete db().t.zz_tmp;
      if(t.cols.some(x=>L(x.name)===L(c.name)))E(`El nombre de columna '${c.name}' ya existe en ${t.name}.`);
      if(c.nn&&t.rows.length&&c.def===undefined)E("No se puede agregar una columna NOT NULL sin DEFAULT a una tabla que ya tiene datos.");
      t.cols.push(c);t.rows.forEach(r=>r[c.name]=c.def===undefined?null:c.def)}
    else{const c=col(t,m[3]);if(c.name===t.pk||t.fks.some(f=>f.col===c.name))E(`No se puede quitar la columna '${c.name}' porque forma parte de una clave.`);t.cols=t.cols.filter(x=>x!==c);t.rows.forEach(r=>delete r[c.name])}
    return{msg:"Comandos completados correctamente."}}
  E(`El simulador no reconoce «${s.split(" ")[0]}». Prueba con CREATE, USE, INSERT, SELECT, UPDATE o DELETE.`)}

function exec(sql){
  const st=split(sql.replace(/--.*$/gm,"").replace(/^\s*GO\s*$/gim,";"),";").filter(Boolean),out=[];
  if(!st.length)return[{err:"Escribe una instrucción SQL."}];
  for(const [i,s] of st.entries()){try{out.push(run(s.replace(/\s+/g," ").trim()))}catch(e){out.push({err:`Instrucción ${i+1}: ${e.message}`});break}}
  return out}

/* ===== Resaltado ===== */
const KW="JOIN|INNER|LEFT|ON|GROUP|HAVING|DISTINCT|IN|UNIQUE|DEFAULT|CHECK|ALTER|ADD|DROP|COLUMN|COUNT|SUM|AVG|MIN|MAX|CASE|WHEN|THEN|ELSE|END|VIEW|INDEX|PROCEDURE|BEGIN|TRY|CATCH|TRANSACTION|COMMIT|ROLLBACK|EXEC|BACKUP|GRANT|LOGIN|USER|SELECT|FROM|WHERE|AND|OR|ORDER|BY|TOP|AS|INSERT|INTO|VALUES|UPDATE|SET|DELETE|CREATE|DATABASE|TABLE|USE|GO|PRIMARY|FOREIGN|KEY|REFERENCES|IDENTITY|NOT|NULL|INT|NVARCHAR|DECIMAL|DESC|ASC|LIKE|IS";
const RE=new RegExp(`(--.*)|('[^']*')|\\b(${KW})\\b|\\b(\\d+)\\b`,"gi");
const hl=c=>esc(c).replace(RE,(m,a,s,k)=>`<span class="${a?"com":s?"str":k?"kw":"num"}">${m}</span>`);

/* ===== Lecciones ===== */
const DB0="CREATE DATABASE Tienda; USE Tienda;";
const CLI="CREATE TABLE Clientes (Id INT IDENTITY(1,1) PRIMARY KEY, Nombre NVARCHAR(100) NOT NULL, Ciudad NVARCHAR(50));";
const PED="CREATE TABLE Pedidos (Id INT IDENTITY(1,1) PRIMARY KEY, ClienteId INT NOT NULL, Total DECIMAL(10,2), FOREIGN KEY (ClienteId) REFERENCES Clientes(Id));";
const DAT="INSERT INTO Clientes (Nombre, Ciudad) VALUES ('Ana Ruiz','Lima'),('Luis Paz','Piura'),('Marta Gil','Cusco'),('Eva Soto','Piura'); INSERT INTO Pedidos (ClienteId, Total) VALUES (1,950),(2,720),(1,120);";
const T=()=>S.dbs.tienda&&S.dbs.tienda.t;

const LESSONS=[
{t:"Introducción",
 html:`<p>SQL Server es el sistema gestor de bases de datos de Microsoft. Guarda la información en <b>tablas</b>: cada <b>columna</b> es un dato (Nombre, Edad) y cada <b>fila</b> es un registro. Se maneja con <b>T-SQL</b>, la versión de SQL de Microsoft, normalmente desde SQL Server Management Studio (SSMS).</p><p>La jerarquía es: un <b>servidor</b> tiene varias <b>bases de datos</b>; cada base tiene <b>tablas</b>; cada tabla tiene <b>columnas</b> y <b>filas</b>.</p><p>Aquí escribirás T-SQL en un simulador que imita los errores reales de SQL Server.</p>`,
 quiz:[{q:"Marca todo lo que es cierto:",multi:1,o:["Una tabla se compone de filas y columnas","Una fila representa un registro","T-SQL es el lenguaje de SQL Server","Una base de datos puede tener varias tablas","Cada columna es un registro completo"],a:[0,1,2,3],w:"Una columna es un dato; la fila es el registro completo."},
 {q:"¿Qué es SSMS?",o:["Un tipo de dato","La herramienta gráfica para administrar SQL Server y escribir consultas","Una clave foránea"],a:[1],w:"SQL Server Management Studio."}]},
{t:"Crear una base de datos",
 html:`<p>Una base de datos es el contenedor de tus tablas. <b>CREATE DATABASE</b> la crea y <b>USE</b> la activa: todo lo que ejecutes después ocurre dentro de ella. En SSMS también puedes crearla con clic derecho en <i>Bases de datos &gt; Nueva base de datos</i>.</p><p><b>GO</b> separa bloques en SSMS; no es parte de SQL. Usa nombres sin espacios ni tildes.</p>`,
 code:"CREATE DATABASE Escuela;\nGO\nUSE Escuela;",
 task:{txt:"Crea la base de datos <b>Tienda</b> y actívala con USE.",sol:"CREATE DATABASE Tienda;\nUSE Tienda;",ok:()=>S.cur==="tienda"},
 quiz:[{q:"¿Qué hace USE Tienda?",o:["Crea la base Tienda","Elimina la base Tienda","Hace que las siguientes instrucciones se ejecuten en Tienda"],a:[2],w:"USE cambia el contexto de trabajo."}]},
{t:"Crear tablas y tipos de dato",setup:DB0,
 html:`<p><b>CREATE TABLE</b> define el nombre de la tabla y sus columnas. Cada columna lleva un nombre, un <b>tipo de dato</b> y, si quieres, restricciones como <b>NOT NULL</b> (obligatorio).</p><div class="tw"><table><tr><th>Tipo</th><th>Para qué sirve</th></tr><tr><td>INT</td><td>Números enteros</td></tr><tr><td>DECIMAL(10,2)</td><td>Decimales: 10 dígitos en total, 2 decimales</td></tr><tr><td>NVARCHAR(100)</td><td>Texto de hasta 100 caracteres</td></tr><tr><td>DATE</td><td>Fechas</td></tr><tr><td>BIT</td><td>Verdadero/falso (1 o 0)</td></tr></table></div>`,
 code:"CREATE TABLE Productos (\n  Id INT,\n  Nombre NVARCHAR(80) NOT NULL,\n  Precio DECIMAL(10,2)\n);",
 task:{txt:"Crea la tabla <b>Clientes</b> con las columnas <b>Id</b> (INT), <b>Nombre</b> (NVARCHAR) y <b>Ciudad</b> (NVARCHAR).",sol:"CREATE TABLE Clientes (\n  Id INT,\n  Nombre NVARCHAR(100) NOT NULL,\n  Ciudad NVARCHAR(50)\n);",ok:()=>{const t=T()&&T().clientes;return t&&["id","nombre","ciudad"].every(c=>t.cols.some(x=>L(x.name)===c))}},
 quiz:[{q:"¿Qué tipo usarías para un precio con centavos?",o:["INT","DECIMAL(10,2)","BIT"],a:[1],w:"INT no guarda decimales."},{q:"¿Qué pasa si insertas NULL en una columna NOT NULL?",o:["Se guarda como 0","SQL Server rechaza la fila con un error","Se guarda vacío"],a:[1],w:"NOT NULL obliga a dar un valor."}]},
{t:"Claves: PRIMARY KEY y FOREIGN KEY",setup:DB0+CLI,
 html:`<p>Las claves hacen que los datos sean fiables.</p><p><b>PRIMARY KEY (clave primaria):</b> columna que identifica cada fila de forma única. No admite repetidos ni NULL, y solo hay una por tabla. <b>IDENTITY(1,1)</b> la numera sola: empieza en 1 y suma 1.</p><p><b>FOREIGN KEY (clave foránea):</b> columna que apunta a la clave primaria de otra tabla. Así cada pedido pertenece a un cliente que existe de verdad (integridad referencial). Es una relación de uno a muchos: un cliente tiene muchos pedidos.</p><div class="rel"><div><b>Clientes</b><br>Id <span class="b pk">PK</span><br>Nombre<br>Ciudad</div><div class="ar">1 ──── muchos</div><div><b>Pedidos</b><br>Id <span class="b pk">PK</span><br>ClienteId <span class="b fk">FK</span><br>Total</div></div><p>Regla práctica: crea primero la tabla "padre"; la tabla "hija" lleva la FOREIGN KEY.</p>`,
 code:"CREATE TABLE Categorias (\n  Id INT IDENTITY(1,1) PRIMARY KEY,\n  Nombre NVARCHAR(50) NOT NULL\n);\n\nCREATE TABLE Productos (\n  Id INT IDENTITY(1,1) PRIMARY KEY,\n  CategoriaId INT NOT NULL,\n  FOREIGN KEY (CategoriaId) REFERENCES Categorias(Id)\n);",
 task:{txt:"La tabla Clientes ya existe. Crea <b>Pedidos</b> con <b>Id</b> (PRIMARY KEY, IDENTITY), <b>ClienteId</b> (INT) y <b>Total</b> (DECIMAL), y una FOREIGN KEY de ClienteId hacia Clientes(Id).",sol:PED.replace(/, /g,",\n  ").replace("(Id","(\n  Id"),ok:()=>{const t=T()&&T().pedidos;return t&&t.pk&&t.fks.some(f=>f.ref==="Clientes")}},
 quiz:[{q:"¿Para qué sirve una FOREIGN KEY?",o:["Hacer la tabla más rápida","Enlazar una fila con la de otra tabla y evitar datos huérfanos","Ordenar los resultados"],a:[1],w:"Impide, por ejemplo, un pedido de un cliente inexistente."},{q:"Una PRIMARY KEY...",multi:1,o:["No puede repetirse","No puede ser NULL","Puede haber dos distintas en la misma tabla","Identifica cada fila"],a:[0,1,3],w:"Una tabla tiene una sola clave primaria."}]},
{t:"INSERT: agregar datos",setup:DB0+CLI+PED,
 html:`<p><b>INSERT INTO</b> tabla (columnas) <b>VALUES</b> (valores). Los textos van entre comillas simples. No escribas el Id: IDENTITY lo genera. Puedes insertar varias filas separándolas con comas. Si rompes una regla (PK, FK, NOT NULL), SQL Server rechaza la instrucción.</p>`,
 code:"INSERT INTO Clientes (Nombre, Ciudad)\nVALUES ('Ana Ruiz', 'Lima'), ('Luis Paz', 'Piura');\n\n-- Falla: el cliente 99 no existe (FOREIGN KEY)\nINSERT INTO Pedidos (ClienteId, Total) VALUES (99, 50);",
 task:{txt:"Inserta <b>3 clientes</b> en Clientes, cada uno de una ciudad distinta.",sol:"INSERT INTO Clientes (Nombre, Ciudad)\nVALUES ('Eva Soto', 'Lima'), ('Raúl Díaz', 'Cusco'), ('Sofía León', 'Piura');",ok:()=>{const r=T()&&T().clientes.rows;return r&&r.length>=3&&new Set(r.map(x=>x.Ciudad)).size>=3}},
 quiz:[{q:"¿Por qué falla el INSERT en Pedidos con ClienteId = 99?",o:["Porque Total es muy bajo","Porque no existe un cliente con Id 99 (FOREIGN KEY)","Porque falta el Id"],a:[1],w:"La FK exige que el valor exista en Clientes."}]},
{t:"SELECT, WHERE y ORDER BY",setup:DB0+CLI+PED+DAT,
 html:`<p><b>SELECT</b> elige columnas (<code>*</code> = todas), <b>FROM</b> la tabla, <b>WHERE</b> filtra filas y <b>ORDER BY</b> ordena (DESC para descendente). <b>TOP n</b> limita las filas.</p><p>Operadores: <code>=</code> <code>&lt;&gt;</code> <code>&gt;</code> <code>&lt;</code> <code>&gt;=</code> <code>&lt;=</code> <code>LIKE 'A%'</code> <code>IS NULL</code>, combinables con AND y OR. En SQL Server el texto no distingue mayúsculas al comparar.</p><p>Tablas de práctica: <b>Clientes</b> (Id, Nombre, Ciudad) y <b>Pedidos</b> (Id, ClienteId, Total).</p>`,
 code:"SELECT TOP 2 Nombre, Ciudad\nFROM Clientes\nWHERE Nombre LIKE 'A%' OR Ciudad = 'Lima'\nORDER BY Nombre DESC;",
 task:{txt:"Muestra <b>Nombre</b> y <b>Ciudad</b> de los clientes de <b>Piura</b>, ordenados por Nombre.",sol:"SELECT Nombre, Ciudad\nFROM Clientes\nWHERE Ciudad = 'Piura'\nORDER BY Nombre;",ok:l=>l&&l.data.length===2&&l.data.every(r=>r.Ciudad==="Piura")&&l.data[0].Nombre<l.data[1].Nombre},
 quiz:[{q:"¿Qué devuelve WHERE Total > 100 AND Total < 500?",o:["Filas que cumplen una de las dos condiciones","Solo filas que cumplen ambas","Todas las filas"],a:[1],w:"AND exige las dos; OR basta con una."}]},
{t:"UPDATE y DELETE",setup:DB0+CLI+PED+DAT,
 html:`<p><b>UPDATE</b> modifica filas y <b>DELETE</b> las borra. <b>Siempre escribe WHERE</b>: sin él afectas toda la tabla. Prueba primero el WHERE con un SELECT. Las claves foráneas te protegen: no puedes borrar un cliente que todavía tiene pedidos.</p>`,
 code:"UPDATE Clientes SET Ciudad = 'Lima'\nWHERE Nombre = 'Luis Paz';\n\n-- Falla: Ana tiene pedidos (FOREIGN KEY)\nDELETE FROM Clientes WHERE Nombre = 'Ana Ruiz';",
 task:{txt:"Cambia la ciudad de <b>Marta Gil</b> a <b>Piura</b>.",sol:"UPDATE Clientes\nSET Ciudad = 'Piura'\nWHERE Nombre = 'Marta Gil';",ok:()=>{const r=T()&&T().clientes.rows.find(x=>x.Nombre==="Marta Gil");return r&&r.Ciudad==="Piura"}},
 quiz:[{q:"Antes de un UPDATE o DELETE conviene:",multi:1,o:["Escribir un WHERE","Probar ese WHERE con un SELECT","Ejecutarlo sin WHERE para ir rápido"],a:[0,1],w:"Sin WHERE afectas todas las filas."}]}
];

/* ===== Interfaz ===== */
let cur=0,last=null,P={q:[],t:[]};
const KEY="sqlP2"; /* clave nueva: ignora el progreso viejo ("sqlP") */
try{localStorage.removeItem("sqlP")}catch(e){}
try{P=JSON.parse(localStorage.getItem(KEY))||P}catch(e){}
const saveP=()=>{try{localStorage.setItem(KEY,JSON.stringify(P))}catch(e){}};
function resetProgress(){
  if(!confirm("¿Borrar todo tu progreso? Las lecciones quedarán sin completar."))return;
  P={q:[],t:[]};saveP();show(0)}
const done=i=>P.q.includes(i)&&(!LESSONS[i].task||P.t.includes(i));

function menu(){
  $("menu").innerHTML="";
  let pv="";LESSONS.forEach((l,i)=>{if(l.lvl!==pv){pv=l.lvl;const h=document.createElement("div");h.className="lvl";h.textContent=pv;$("menu").appendChild(h)}const b=document.createElement("button");b.textContent=`${i+1}. ${l.t}`;b.className=(i===cur?"active ":"")+(done(i)?"done":"");b.onclick=()=>show(i);$("menu").appendChild(b)});
  const n=LESSONS.filter((l,i)=>done(i)).length;
  $("bar").style.width=n/LESSONS.length*100+"%";$("progressText").textContent=`${n} de ${LESSONS.length} completadas`}

function schema(){
  const el=$("schema");if(!el)return;const d=S.cur&&S.dbs[S.cur];
  el.innerHTML=d?`<p class="mut">Base activa: <b>${d.name}</b></p>`+(Object.values(d.t).map(t=>`<div class="tb"><b>${t.name}</b> <span class="mut">(${t.rows.length} filas)</span>${t.cols.map(c=>{const f=t.fks.find(f=>f.col===c.name);return `<div>${c.name} <span class="mut">${c.type}${c.len?"("+c.len+")":""}</span>${c.name===t.pk?' <span class="b pk">PK</span>':""}${c.ident?' <span class="b">IDENTITY</span>':""}${f?` <span class="b fk">FK → ${f.ref}</span>`:""}</div>`}).join("")}</div>`).join("")||'<p class="mut">Sin tablas todavía.</p>'):'<p class="mut">No hay base de datos activa todavía.</p>'}

const tableHtml=x=>`<div class="tw"><table><tr>${x.cols.map(c=>`<th>${esc(c)}</th>`).join("")}</tr>${x.data.map(r=>`<tr>${x.cols.map(c=>`<td>${r[c]==null?'<i class="mut">NULL</i>':esc(r[c])}</td>`).join("")}</tr>`).join("")}</table></div><p class="mut">${rows(x.data.length).replace(/ afectadas?/,"")}</p>`;

function go(){
  const o=exec($("sql").value);
  last=[...o].reverse().find(x=>x.data)||null;
  $("out").innerHTML=o.map(x=>x.err?`<div class="err">${esc(x.err)}</div>`:x.msg?`<div class="msg">${esc(x.msg)}</div>`:tableHtml(x)).join("");
  schema();let ok=false;try{ok=LESSONS[cur].task.ok(last)}catch(e){}
  if(ok&&!P.t.includes(cur)){P.t.push(cur);saveP();menu()}
  $("tstat").textContent=P.t.includes(cur)?"✓ Práctica completada":""}

function reset(){S={dbs:{},cur:null};const s=LESSONS[cur].setup;if(s)exec(s);last=null}

function show(i){
  cur=i;const l=LESSONS[i];reset();
  $("lesson").innerHTML=`<h2>${i+1}. ${l.t}</h2>${l.html}`
  +(l.code?`<div class="bar"><span>${l.ssms?"Ejemplo para SSMS (no se ejecuta en el simulador)":"Ejemplo en T-SQL"}</span><span><button class="sec" id="cp">Copiar al editor</button></span></div><pre><code>${hl(l.code)}</code></pre>`:"")
  +`<h3>Preguntas</h3>${l.quiz.map((q,k)=>`<fieldset id="f${k}"><legend>${q.q}${q.multi?" (marca todas las correctas)":""}</legend>${q.o.map((o,j)=>`<label class="opt"><input type="${q.multi?"checkbox":"radio"}" name="q${k}" value="${j}"> ${o}</label>`).join("")}<div class="why"></div></fieldset>`).join("")}<button class="btn" id="chk">Comprobar respuestas</button> <span class="mut">${P.q.includes(i)?"✓ Preguntas completadas":""}</span>`
  +(l.task?`<h3>Práctica: escribe tu código</h3><p>${l.task.txt}</p><textarea id="sql" spellcheck="false" placeholder="Escribe aquí y pulsa Ejecutar (Ctrl+Enter)"></textarea><div class="bar"><span><button class="btn" id="go">Ejecutar</button> <button class="sec" id="sol">Ver solución</button> <button class="sec" id="rst">Reiniciar base</button></span><b id="tstat" class="mut">${P.t.includes(i)?"✓ Práctica completada":""}</b></div><div id="out"></div><h3>Estado de la base de datos</h3><div id="schema"></div>`:"")
  +`<div class="nav2"><button class="btn" id="prev" ${i?"":"disabled"}>Anterior</button><button class="btn" id="next" ${i<LESSONS.length-1?"":"disabled"}>Siguiente</button></div>`;
  $("prev").onclick=()=>show(i-1);$("next").onclick=()=>show(i+1);
  $("chk").onclick=()=>{let all=true;l.quiz.forEach((q,k)=>{const s=[...document.querySelectorAll(`[name=q${k}]:checked`)].map(x=>+x.value),ok=s.length===q.a.length&&q.a.every(a=>s.includes(a)),f=$("f"+k);all=all&&ok;f.className=ok?"ok":"bad";f.querySelector(".why").textContent=ok?"Correcto. "+q.w:s.length?"Revisa tu respuesta e inténtalo otra vez.":"Elige una respuesta."});if(all&&!P.q.includes(i)){P.q.push(i);saveP();menu()}};
  if(l.task){
    $("go").onclick=go;$("sol").onclick=()=>$("sql").value=l.task.sol;
    $("rst").onclick=()=>{reset();$("out").innerHTML="";schema()};
    $("sql").onkeydown=e=>{if((e.ctrlKey&&e.key==="Enter")||e.key==="F5"){e.preventDefault();go()}};
    if(l.code)$("cp").onclick=()=>{$("sql").value=l.code;$("sql").focus()};
    schema()}
  else if(l.code){$("cp").textContent="Copiar";$("cp").onclick=()=>navigator.clipboard.writeText(l.code)}
  menu();window.scrollTo({top:0})}
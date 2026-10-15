/* Lecciones nuevas por nivel. Para agregar una, copia un bloque y cambia sus campos. */
LESSONS.forEach(l=>l.lvl="Básico");
const ALL=DB0+CLI+PED+DAT,add=(lvl,a)=>a.forEach(l=>LESSONS.push({lvl,...l}));
add("Básico",[
{t:"Funciones de agregado",setup:ALL,
 html:`<p>Las funciones de agregado resumen muchas filas en un solo valor: <b>COUNT</b> (cuántas), <b>SUM</b> (suma), <b>AVG</b> (promedio), <b>MIN</b> y <b>MAX</b>. <code>COUNT(*)</code> cuenta filas; <code>COUNT(columna)</code> ignora los NULL. Usa <b>AS</b> para nombrar la columna del resultado.</p>`,
 code:"SELECT COUNT(*) AS Pedidos,\n       AVG(Total) AS Promedio,\n       MAX(Total) AS Mayor\nFROM Pedidos;",
 task:{txt:"Calcula el <b>total vendido</b>: la suma de la columna Total de Pedidos.",sol:"SELECT SUM(Total) AS TotalVendido\nFROM Pedidos;",ok:l=>l&&l.data.length===1&&Object.values(l.data[0]).includes(1790)},
 quiz:[{q:"¿Qué diferencia hay entre COUNT(*) y COUNT(Ciudad)?",o:["Ninguna","COUNT(Ciudad) no cuenta las filas donde Ciudad es NULL","COUNT(*) ignora los NULL"],a:[1],w:"COUNT(*) cuenta todas las filas."}]}]);
add("Intermedio",[
{t:"JOIN: unir tablas",setup:ALL,
 html:`<p>Los datos viven en varias tablas; <b>JOIN</b> las combina usando la clave foránea. <b>INNER JOIN</b> devuelve solo las filas con pareja en ambas tablas. <b>LEFT JOIN</b> conserva todas las filas de la izquierda y pone NULL cuando no hay pareja (por ejemplo, clientes sin pedidos).</p><p>Los <b>alias</b> (<code>c</code>, <code>p</code>) acortan los nombres. Si una columna existe en ambas tablas, califícala: <code>c.Id</code>.</p>`,
 code:"SELECT c.Nombre, p.Total\nFROM Clientes AS c\nLEFT JOIN Pedidos AS p\n  ON p.ClienteId = c.Id;",
 task:{txt:"Muestra el <b>Nombre</b> del cliente y el <b>Total</b> de cada pedido usando INNER JOIN.",sol:"SELECT c.Nombre, p.Total\nFROM Clientes AS c\nINNER JOIN Pedidos AS p\n  ON p.ClienteId = c.Id;",ok:l=>l&&l.data.length===3&&l.data.every(r=>"Nombre" in r&&"Total" in r)},
 quiz:[{q:"¿Qué clientes aparecen en Clientes LEFT JOIN Pedidos?",o:["Solo los que tienen pedidos","Todos, aunque no tengan pedidos","Ninguno"],a:[1],w:"Los que no tienen pedidos salen con NULL en Total."}]},
{t:"GROUP BY y HAVING",setup:ALL,
 html:`<p><b>GROUP BY</b> agrupa filas con el mismo valor para aplicar agregados a cada grupo. Toda columna del SELECT debe estar en el GROUP BY o dentro de un agregado; si no, SQL Server da error. <b>WHERE</b> filtra filas <i>antes</i> de agrupar; <b>HAVING</b> filtra los grupos <i>después</i>.</p>`,
 code:"SELECT Ciudad, COUNT(*) AS Total\nFROM Clientes\nGROUP BY Ciudad\nHAVING COUNT(*) > 1;",
 task:{txt:"Muestra cuántos clientes hay en cada <b>Ciudad</b>. Llama <b>Total</b> a la cuenta.",sol:"SELECT Ciudad, COUNT(*) AS Total\nFROM Clientes\nGROUP BY Ciudad;",ok:l=>l&&l.data.length===3&&l.data.some(r=>r.Ciudad==="Piura"&&r.Total===2)},
 quiz:[{q:"Quieres solo las ciudades con más de 1 cliente. ¿Qué usas?",o:["WHERE COUNT(*) > 1","HAVING COUNT(*) > 1","ORDER BY COUNT(*) > 1"],a:[1],w:"Los agregados se filtran con HAVING."}]},
{t:"IN, LIKE, DISTINCT y NULL",setup:ALL,
 html:`<p><b>IN</b> compara con una lista; <b>LIKE</b> busca patrones (<code>%</code> = cualquier texto, <code>_</code> = un carácter); <b>DISTINCT</b> quita filas repetidas. Para NULL usa <code>IS NULL</code> o <code>IS NOT NULL</code>: <code>= NULL</code> nunca funciona.</p>`,
 code:"SELECT DISTINCT Ciudad\nFROM Clientes\nWHERE Ciudad IN ('Lima', 'Piura')\n  AND Nombre LIKE '%a%';",
 task:{txt:"Lista las <b>ciudades distintas</b> donde hay clientes (sin repetir).",sol:"SELECT DISTINCT Ciudad\nFROM Clientes;",ok:l=>l&&l.data.length===3&&l.data.every(r=>"Ciudad" in r)},
 quiz:[{q:"¿Qué encuentra LIKE 'A%'?",o:["Textos que empiezan con A","Textos que terminan con A","Textos con una sola letra A"],a:[0],w:"% reemplaza cualquier cantidad de caracteres."},{q:"¿Cómo se busca un valor vacío?",o:["Ciudad = NULL","Ciudad IS NULL","Ciudad = ''"],a:[1],w:"NULL no es igual a nada, ni a sí mismo."}]},
{t:"Restricciones: UNIQUE, DEFAULT y CHECK",setup:DB0,
 html:`<p>Además de PK y FK, una tabla puede proteger sus datos con: <b>UNIQUE</b> (no admite repetidos, a diferencia de la PK puede haber varias por tabla), <b>DEFAULT</b> (valor automático si no das uno) y <b>CHECK</b> (condición que cada valor debe cumplir). Prueba insertar un valor inválido para ver el error.</p>`,
 code:"CREATE TABLE Empleados (\n  Id INT IDENTITY(1,1) PRIMARY KEY,\n  Dni NVARCHAR(8) UNIQUE,\n  Sueldo DECIMAL(10,2) CHECK (Sueldo >= 0),\n  Activo BIT DEFAULT 1\n);",
 task:{txt:"Crea <b>Productos</b>: Id (PK), Nombre NVARCHAR(80) <b>UNIQUE</b>, Precio DECIMAL(10,2) con <b>CHECK</b> (Precio &gt; 0) y Stock INT con <b>DEFAULT</b> 0.",sol:"CREATE TABLE Productos (\n  Id INT PRIMARY KEY,\n  Nombre NVARCHAR(80) UNIQUE,\n  Precio DECIMAL(10,2) CHECK (Precio > 0),\n  Stock INT DEFAULT 0\n);",ok:()=>{const t=T()&&T().productos;return t&&t.cols.some(c=>c.uniq)&&t.cols.some(c=>c.ck)&&t.cols.some(c=>c.def!==undefined)}},
 quiz:[{q:"¿Qué pasa al insertar Precio = -5 con CHECK (Precio > 0)?",o:["Se guarda","SQL Server rechaza la fila","Se guarda como 0"],a:[1],w:"CHECK valida cada valor."},{q:"Una columna DEFAULT 0...",o:["Siempre vale 0","Vale 0 solo si no das un valor","No admite otros valores"],a:[1],w:"Puedes sobrescribirlo."}]},
{t:"ALTER TABLE y DROP TABLE",setup:ALL,
 html:`<p><b>ALTER TABLE</b> cambia una tabla existente: <code>ADD</code> agrega una columna y <code>DROP COLUMN</code> la quita. <b>DROP TABLE</b> elimina la tabla con todos sus datos. SQL Server no deja borrar una tabla si otra la referencia con una FOREIGN KEY: borra primero la hija. Fuera de una transacción no hay deshacer; respalda antes.</p>`,
 code:"ALTER TABLE Clientes ADD Telefono NVARCHAR(20);\n\n-- Falla: Pedidos referencia a Clientes\nDROP TABLE Clientes;",
 task:{txt:"Agrega a <b>Clientes</b> la columna <b>Email</b> NVARCHAR(100).",sol:"ALTER TABLE Clientes ADD Email NVARCHAR(100);",ok:()=>T()&&T().clientes.cols.some(c=>L(c.name)==="email")},
 quiz:[{q:"¿Por qué falla DROP TABLE Clientes?",o:["Porque tiene datos","Porque Pedidos la referencia con una FOREIGN KEY","Porque falta un WHERE"],a:[1],w:"Primero se borra la tabla hija."}]},
{t:"Normalización",
 html:`<p>Normalizar es organizar las tablas para no repetir datos ni generar errores.</p><p><b>1FN:</b> cada celda guarda un solo valor (nada de «Lima, Piura» en una celda) y no hay columnas repetidas como Telefono1, Telefono2.</p><p><b>2FN:</b> cumple 1FN y cada columna depende de toda la clave primaria, no de una parte (importa con claves compuestas).</p><p><b>3FN:</b> cumple 2FN y ninguna columna depende de otra que no sea la clave. Si Pedidos guarda ClienteId y también NombreCliente, el nombre depende del cliente, no del pedido: va en Clientes.</p><p>Resultado: cada dato se guarda una vez y se enlaza con claves foráneas.</p>`,
 quiz:[{q:"Marca los problemas que la normalización ayuda a evitar:",multi:1,o:["Datos repetidos en muchas filas","Inconsistencias al actualizar un dato","Que existan claves primarias","Anomalías al borrar datos"],a:[0,1,3],w:"Las claves son parte de la solución, no el problema."},{q:"Una celda con el valor 'Lima, Piura' viola:",o:["La 1FN","La 3FN","Ninguna forma normal"],a:[0],w:"Cada celda debe tener un solo valor."}]}
]);
add("Avanzado",[
{t:"Subconsultas, CASE y funciones",ssms:1,
 html:`<p>Una <b>subconsulta</b> es un SELECT dentro de otro, útil en WHERE con IN. <b>CASE</b> devuelve un valor según condiciones. Funciones comunes: <code>ISNULL(x, 0)</code> reemplaza NULL, <code>GETDATE()</code> fecha y hora actual, <code>LEN</code>, <code>UPPER</code> y <code>DATEDIFF(DAY, f1, f2)</code>.</p>`,
 code:"SELECT Nombre FROM Clientes\nWHERE Id IN (SELECT ClienteId FROM Pedidos WHERE Total > 500);\n\nSELECT Id, CASE WHEN Total >= 500 THEN 'Grande' ELSE 'Normal' END AS Tipo\nFROM Pedidos;",
 quiz:[{q:"¿Para qué sirve CASE?",o:["Crear una tabla","Devolver un valor distinto según una condición","Ordenar filas"],a:[1],w:"Es el «si... entonces...» de SQL."}]},
{t:"Vistas",ssms:1,
 html:`<p>Una <b>vista</b> es una consulta guardada con nombre que se usa como si fuera una tabla. No almacena datos: ejecuta el SELECT cada vez. Sirve para simplificar consultas largas y para ocultar columnas sensibles a ciertos usuarios.</p>`,
 code:"CREATE VIEW vw_PedidosClientes AS\nSELECT c.Nombre, c.Ciudad, p.Total\nFROM Clientes c\nINNER JOIN Pedidos p ON p.ClienteId = c.Id;\nGO\nSELECT * FROM vw_PedidosClientes WHERE Ciudad = 'Lima';",
 quiz:[{q:"Una vista normal...",multi:1,o:["Guarda una copia de los datos","Guarda una consulta","Se usa con SELECT como una tabla","Es más rápida siempre"],a:[1,2],w:"Ejecuta el SELECT en cada uso."}]},
{t:"Índices",ssms:1,
 html:`<p>Un <b>índice</b> es una estructura que acelera las búsquedas, como el índice de un libro. El <b>clustered</b> ordena físicamente la tabla (uno por tabla; la PRIMARY KEY lo crea por defecto). Los <b>nonclustered</b> son estructuras aparte y puede haber varios. Aceleran SELECT con WHERE, JOIN y ORDER BY, pero ralentizan INSERT, UPDATE y DELETE y ocupan espacio: crea solo los necesarios.</p>`,
 code:"CREATE INDEX IX_Clientes_Ciudad\n  ON Clientes (Ciudad);",
 quiz:[{q:"¿Qué costo tiene un índice?",o:["Hace más lentas las escrituras y ocupa espacio","Ninguno","Impide usar WHERE"],a:[0],w:"Cada cambio de datos debe actualizar el índice."}]},
{t:"Procedimientos almacenados",ssms:1,
 html:`<p>Un <b>procedimiento almacenado</b> es un bloque de T-SQL guardado en el servidor, con parámetros (<code>@Ciudad</code>). Ventajas: reutilización, menos tráfico, permisos más finos y protección contra <b>inyección SQL</b>, porque el parámetro se trata como dato y no como código. Se ejecuta con <b>EXEC</b>.</p>`,
 code:"CREATE PROCEDURE usp_ClientesPorCiudad\n  @Ciudad NVARCHAR(50)\nAS\nBEGIN\n  SELECT Id, Nombre FROM Clientes WHERE Ciudad = @Ciudad;\nEND;\nGO\nEXEC usp_ClientesPorCiudad @Ciudad = 'Piura';",
 quiz:[{q:"¿Cómo ayudan los parámetros contra la inyección SQL?",o:["Cifran la base","Se tratan como datos, no como código","Borran las comillas"],a:[1],w:"El valor nunca se interpreta como instrucción."}]},
{t:"Transacciones y ACID",ssms:1,
 html:`<p>Una <b>transacción</b> agrupa instrucciones que se ejecutan todas o ninguna. <b>COMMIT</b> confirma y <b>ROLLBACK</b> deshace. Las propiedades <b>ACID</b>: Atomicidad (todo o nada), Consistencia (respeta las reglas), Aislamiento (no se mezclan con otras) y Durabilidad (lo confirmado persiste). Típico: una transferencia entre cuentas.</p>`,
 code:"BEGIN TRY\n  BEGIN TRANSACTION;\n  UPDATE Cuentas SET Saldo = Saldo - 100 WHERE Id = 1;\n  UPDATE Cuentas SET Saldo = Saldo + 100 WHERE Id = 2;\n  COMMIT TRANSACTION;\nEND TRY\nBEGIN CATCH\n  ROLLBACK TRANSACTION;\n  PRINT ERROR_MESSAGE();\nEND CATCH;",
 quiz:[{q:"Si falla la segunda instrucción de la transferencia, ¿qué debe pasar?",o:["Queda aplicada solo la primera","Se hace ROLLBACK y no cambia nada","Se repite el COMMIT"],a:[1],w:"Atomicidad: todo o nada."}]},
{t:"Seguridad y respaldos",ssms:1,
 html:`<p>El acceso se controla en capas: un <b>login</b> entra al servidor, un <b>usuario</b> accede a una base y los <b>permisos</b> (<code>GRANT</code>, <code>DENY</code>, <code>REVOKE</code>) dicen qué puede hacer. Aplica el mínimo privilegio. Los respaldos (<b>BACKUP</b>) son tu red de seguridad: prueba siempre que se puedan restaurar con <b>RESTORE</b>.</p>`,
 code:"BACKUP DATABASE Tienda TO DISK = 'C:\\Respaldo\\Tienda.bak';\n\nCREATE LOGIN ana WITH PASSWORD = 'ClaveSegura#1';\nCREATE USER ana FOR LOGIN ana;\nGRANT SELECT ON Clientes TO ana;",
 quiz:[{q:"Ana solo debe consultar Clientes. ¿Qué permiso le das?",o:["GRANT SELECT ON Clientes","GRANT ALL","Hacerla administrador"],a:[0],w:"Mínimo privilegio."}]}
]);
$("resetAll").onclick=resetProgress;
show(0);
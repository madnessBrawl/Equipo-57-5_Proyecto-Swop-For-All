// Script: add-cifrado-to-server.js
// Agrega la instancia de CifradoService a server.js
const fs   = require('fs');
const path = require('path');

const ruta = path.join(__dirname, '..', 'server.js');
const lineas = fs.readFileSync(ruta, 'utf8').split('\n');

// Ya existe el require de CifradoService?
if (lineas.some(l => l.includes("require('./Service/CifradoService')"))) {
  console.log('CifradoService ya importado. Nada que hacer.');
  process.exit(0);
}

// Insertar después de la línea que hace require de CalificacionPersistencia
const idxCalif = lineas.findIndex(l => l.includes("CalificacionPersistencia = require"));
if (idxCalif === -1) { console.error('No se encontró el punto de inserción'); process.exit(1); }

const insercion = [
  "const CifradoService          = require('./Service/CifradoService');",
  ""
];
lineas.splice(idxCalif + 1, 0, ...insercion);

// Insertar instancia después de calificacionPersistencia = new ...
const idxInstCalif = lineas.findIndex(l => l.includes("calificacionPersistencia = new CalificacionPersistencia()"));
if (idxInstCalif === -1) { console.error('No se encontró el punto de instancia'); process.exit(1); }

lineas.splice(idxInstCalif + 1, 0, "const cifradoService          = new CifradoService();", "");

fs.writeFileSync(ruta, lineas.join('\n'), 'utf8');
console.log('✅ CifradoService agregado a server.js');

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const ComunidadPersistencia = require('../Persistencia/ComunidadPersistencia');
const IntercambioPersistencia = require('../Persistencia/IntercambioPersistencia');
const LibroPersistencia = require('../Persistencia/LibroPersistencia');
const PerfilPersistencia = require('../Persistencia/PerfilPersistencia');
const UsuarioPersistencia = require('../Persistencia/UsuarioPersistencia');

const archivos = [];

function nombreTemporal(entidad) {
  const nombre = `${entidad}-sin-semillas-${process.pid}-${Date.now()}-${archivos.length}.json`;
  archivos.push(path.join(__dirname, '..', 'Persistencia', nombre));
  return nombre;
}

test.after(() => {
  for (const archivo of archivos) {
    if (fs.existsSync(archivo)) fs.unlinkSync(archivo);
  }
});

test('las persistencias de usuarios, perfiles, libros, intercambios y comunidades empiezan vacías', () => {
  const persistencias = [
    new UsuarioPersistencia(nombreTemporal('usuarios')),
    new PerfilPersistencia(nombreTemporal('perfiles')),
    new LibroPersistencia(null, undefined, nombreTemporal('libros')),
    new IntercambioPersistencia(nombreTemporal('intercambios')),
    new ComunidadPersistencia(nombreTemporal('comunidades'))
  ];

  for (const persistencia of persistencias) {
    assert.deepEqual(persistencia.obtenerTodos(), []);
  }
});

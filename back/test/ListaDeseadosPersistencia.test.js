const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const ListaDeseadosPersistencia = require('../Persistencia/ListaDeseadosPersistencia');

const nombreArchivo = `libros-deseados-test-${process.pid}.json`;
const rutaArchivo = path.join(__dirname, '..', 'Persistencia', nombreArchivo);
test.after(() => {
  if (fs.existsSync(rutaArchivo)) fs.unlinkSync(rutaArchivo);
});

test('ListaDeseadosPersistencia limita la consulta y eliminación a su propietario', () => {
  const persistencia = new ListaDeseadosPersistencia([], nombreArchivo);
  const libroAna = persistencia.agregar('Ana', { titulo: 'Rayuela', autor: 'Julio Cortázar', anio: 1963 });
  persistencia.agregar('Luis', { titulo: 'El Aleph', autor: 'Jorge Luis Borges', anio: 1949 });

  assert.deepEqual(persistencia.buscarPorUsuario(' ana ').map(libro => libro.id), [libroAna.id]);
  assert.equal(persistencia.eliminarDeUsuario(libroAna.id, 'Luis'), false);
  assert.equal(persistencia.eliminarDeUsuario(libroAna.id, 'ANA'), true);
  assert.deepEqual(persistencia.buscarPorUsuario('Ana'), []);
});

test('ListaDeseadosPersistencia exige título y valida el año', () => {
  const persistencia = new ListaDeseadosPersistencia([], nombreArchivo);

  assert.throws(() => persistencia.agregar('Ana', { titulo: ' ' }), /título es obligatorio/i);
  assert.throws(() => persistencia.agregar('Ana', { titulo: 'Libro', anio: 2020.5 }), /año debe ser/i);
});

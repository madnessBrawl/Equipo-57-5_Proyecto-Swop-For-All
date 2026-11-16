const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const CalificacionPersistencia = require('../persistencia/CalificacionPersistencia');

test('CalificacionPersistencia cifra datos privados y los recupera para la aplicación', () => {
  const archivo = `calificaciones-test-${process.pid}-${Date.now()}.json`;
  const claveAnterior = process.env.SWOP_REPUTACION_KEY;
  process.env.SWOP_REPUTACION_KEY = 'clave-de-prueba-suficientemente-larga-32';

  try {
    const persistencia = new CalificacionPersistencia(archivo);
    const calificacion = {
      id: 'calif_test',
      idIntercambio: 'intercambio_test',
      tipo: 'lector',
      evaluador: 'ana',
      evaluado: 'beto',
      puntuacion: 5,
      comentario: { texto: 'Comentario privado', fecha: '2026-01-01T00:00:00.000Z' }
    };

    persistencia.guardar(calificacion);

    const archivoCrudo = fs.readFileSync(persistencia.rutaArchivo, 'utf8');
    assert.strictEqual(archivoCrudo.includes('ana'), false);
    assert.strictEqual(archivoCrudo.includes('Comentario privado'), false);
    assert.strictEqual(persistencia.buscarPorEvaluado('beto')[0].comentario.texto, 'Comentario privado');
    assert.deepStrictEqual(persistencia.buscarPorId('calif_test'), calificacion);
  } finally {
    fs.rmSync(path.join(__dirname, '..', 'persistencia', archivo), { force: true });
    if (claveAnterior === undefined) {
      delete process.env.SWOP_REPUTACION_KEY;
    } else {
      process.env.SWOP_REPUTACION_KEY = claveAnterior;
    }
  }
});

test('CalificacionPersistencia migra registros existentes en texto plano al iniciar', () => {
  const archivo = `calificaciones-test-${process.pid}-${Date.now()}.json`;
  const ruta = path.join(__dirname, '..', 'persistencia', archivo);
  const claveAnterior = process.env.SWOP_REPUTACION_KEY;
  process.env.SWOP_REPUTACION_KEY = 'clave-de-prueba-suficientemente-larga-32';
  const antigua = {
    id: 'calif_legada',
    evaluador: 'lector_privado',
    comentario: { texto: 'Reseña legada' }
  };

  try {
    fs.writeFileSync(ruta, JSON.stringify([antigua]));
    const persistencia = new CalificacionPersistencia(archivo);
    const archivoCrudo = fs.readFileSync(ruta, 'utf8');

    assert.strictEqual(archivoCrudo.includes('lector_privado'), false);
    assert.strictEqual(persistencia.buscarPorId('calif_legada').comentario.texto, 'Reseña legada');
  } finally {
    fs.rmSync(ruta, { force: true });
    if (claveAnterior === undefined) {
      delete process.env.SWOP_REPUTACION_KEY;
    } else {
      process.env.SWOP_REPUTACION_KEY = claveAnterior;
    }
  }
});

/*
  Archivo: Intercambio.test.js (BACKEND: back/test/)
  Función: Pruebas unitarias automatizadas para el módulo de Gestión de Intercambios
           (Modelos POO, Controlador, Persistencia, Chat y Reglas de Negocio del Brief).
  Ejecutar: node --test back/test/Intercambio.test.js
*/

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const OfertaIntercambio = require('../models/intercambioModel');
const IntercambioPersistencia = require('../Persistencia/IntercambioPersistencia');
const ControladorIntercambio = require('../controllers/intercambioController');

/* ---------------- 1. Pruebas del Modelo OfertaIntercambio ---------------- */
test('Modelo OfertaIntercambio: Valida reglas de negocio correctamente', () => {
  // Caso 1: Emisor vacío
  const sinEmisor = new OfertaIntercambio({ usuarioEmisor: '', usuarioReceptor: 'maria' });
  assert.strictEqual(typeof sinEmisor.validar(), 'string');

  // Caso 2: Intercambio consigo mismo
  const consigoMismo = new OfertaIntercambio({
    usuarioEmisor: 'carlos',
    usuarioReceptor: 'carlos',
    librosSolicitados: ['lib_1']
  });
  assert.match(consigoMismo.validar(), /consigo mismo/i);

  // Caso 3: Sin libros solicitados
  const sinLibros = new OfertaIntercambio({
    usuarioEmisor: 'carlos',
    usuarioReceptor: 'maria',
    librosSolicitados: []
  });
  assert.match(sinLibros.validar(), /al menos un libro/i);

  // Caso 4: Oferta válida
  const valida = new OfertaIntercambio({
    usuarioEmisor: 'carlos',
    usuarioReceptor: 'maria',
    librosSolicitados: [{ id: 'lib_1', titulo: '1984' }]
  });
  assert.strictEqual(valida.validar(), null);
});

test('Modelo OfertaIntercambio: Chat limita longitud de mensaje a 250 caracteres', () => {
  const oferta = new OfertaIntercambio({
    usuarioEmisor: 'carlos',
    usuarioReceptor: 'maria',
    librosSolicitados: ['lib_1']
  });

  // Mensaje válido
  const msg = oferta.agregarMensaje({ remitente: 'carlos', texto: '¿Aún está disponible?' });
  assert.strictEqual(msg.remitente, 'carlos');
  assert.strictEqual(msg.texto, '¿Aún está disponible?');
  assert.strictEqual(oferta.mensajes.length, 1);

  // Mensaje de usuario no participante
  assert.throws(
    () => oferta.agregarMensaje({ remitente: 'hacker', texto: 'Mensaje no autorizado' }),
    /participantes/i
  );

  // Mensaje que excede los 250 caracteres
  const textoLargo = 'a'.repeat(251);
  assert.throws(
    () => oferta.agregarMensaje({ remitente: 'carlos', texto: textoLargo }),
    /250 caracteres/i
  );
});

/* ---------------- 2. Pruebas de Controlador y Persistencia ---------------- */
test('ControladorIntercambio: Crea oferta y la persiste físicamente', () => {
  const archivoTest = `intercambios-test-${Date.now()}.json`;
  const persistencia = new IntercambioPersistencia(archivoTest);

  try {
    const controlador = new ControladorIntercambio(persistencia);

    const ofertaCreada = controlador.crearOferta({
      usuarioReceptor: 'ana_lectora',
      librosOfrecidos: [{ id: 'lib_p1', titulo: 'Don Quijote' }],
      librosSolicitados: [{ id: 'lib_s1', titulo: 'Rayuela' }],
      mensajeInicial: '¡Hola Ana! Me gustaría hacer este intercambio.'
    }, 'pedro_lector');

    assert.strictEqual(ofertaCreada.usuarioEmisor, 'pedro_lector');
    assert.strictEqual(ofertaCreada.usuarioReceptor, 'ana_lectora');
    assert.strictEqual(ofertaCreada.estado, 'Pendiente');
    assert.strictEqual(ofertaCreada.mensajes.length, 1);

    // Verificar lectura desde persistencia
    const recuperada = controlador.obtenerOfertaPorId(ofertaCreada.idIntercambio);
    assert.strictEqual(recuperada.idIntercambio, ofertaCreada.idIntercambio);
    assert.strictEqual(recuperada.mensajes[0].texto, '¡Hola Ana! Me gustaría hacer este intercambio.');
  } finally {
    fs.rmSync(path.join(__dirname, '..', 'Persistencia', archivoTest), { force: true });
  }
});

test('ControladorIntercambio: Restricción 3.4 del Brief (Libro en intercambio activo)', () => {
  const archivoTest = `intercambios-test-restr-${Date.now()}.json`;
  const persistencia = new IntercambioPersistencia(archivoTest);

  try {
    const controlador = new ControladorIntercambio(persistencia);

    controlador.crearOferta({
      usuarioReceptor: 'ana_lectora',
      librosOfrecidos: [{ id: 'lib_p1', titulo: 'Don Quijote' }],
      librosSolicitados: [{ id: 'lib_unico', titulo: 'Libro Exclusivo' }]
    }, 'pedro_lector');

    // Intentar crear otra oferta solicitando el mismo libro mientras la anterior está activa
    assert.throws(
      () => controlador.crearOferta({
        usuarioReceptor: 'ana_lectora',
        librosOfrecidos: [{ id: 'lib_p2', titulo: 'Otro Libro' }],
        librosSolicitados: [{ id: 'lib_unico', titulo: 'Libro Exclusivo' }]
      }, 'juan_lector'),
      /intercambio activo/i
    );
  } finally {
    fs.rmSync(path.join(__dirname, '..', 'Persistencia', archivoTest), { force: true });
  }
});

test('ControladorIntercambio: Modificar oferta cambia estado a Modificada', () => {
  const archivoTest = `intercambios-test-mod-${Date.now()}.json`;
  const persistencia = new IntercambioPersistencia(archivoTest);

  try {
    const controlador = new ControladorIntercambio(persistencia);

    const oferta = controlador.crearOferta({
      usuarioReceptor: 'maria_books',
      librosOfrecidos: [{ id: 'lib_1', titulo: 'Libro 1' }],
      librosSolicitados: [{ id: 'lib_2', titulo: 'Libro 2' }]
    }, 'carlos_lector');

    // Modificar oferta agregando un libro más
    const modificada = controlador.modificarOferta(oferta.idIntercambio, {
      librosOfrecidos: [{ id: 'lib_1', titulo: 'Libro 1' }, { id: 'lib_extra', titulo: 'Libro Extra' }],
      librosSolicitados: [{ id: 'lib_2', titulo: 'Libro 2' }]
    }, 'carlos_lector');

    assert.strictEqual(modificada.estado, 'Modificada');
    assert.strictEqual(modificada.librosOfrecidos.length, 2);

    // Rechazar modificación si un usuario ajeno intenta modificar
    assert.throws(
      () => controlador.modificarOferta(oferta.idIntercambio, { librosOfrecidos: [] }, 'usuario_intruso'),
      /permisos/i
    );
  } finally {
    fs.rmSync(path.join(__dirname, '..', 'Persistencia', archivoTest), { force: true });
  }
});

test('ControladorIntercambio: Chat envía y persiste mensajes entre participantes', () => {
  const archivoTest = `intercambios-test-chat-${Date.now()}.json`;
  const persistencia = new IntercambioPersistencia(archivoTest);

  try {
    const controlador = new ControladorIntercambio(persistencia);

    const oferta = controlador.crearOferta({
      usuarioReceptor: 'maria_books',
      librosOfrecidos: [{ id: 'lib_1', titulo: 'Libro 1' }],
      librosSolicitados: [{ id: 'lib_2', titulo: 'Libro 2' }]
    }, 'carlos_lector');

    // Carlos envía mensaje
    controlador.enviarMensajeChat(oferta.idIntercambio, { texto: '¿Qué te parece la propuesta?' }, 'carlos_lector');

    // María responde
    controlador.enviarMensajeChat(oferta.idIntercambio, { texto: '¡Me parece bien! ¿Podrías agregar otro libro?' }, 'maria_books');

    // Consultar mensajes
    const mensajes = controlador.obtenerMensajesChat(oferta.idIntercambio, 'carlos_lector');
    assert.strictEqual(mensajes.length, 2);
    assert.strictEqual(mensajes[0].remitente, 'carlos_lector');
    assert.strictEqual(mensajes[1].remitente, 'maria_books');
  } finally {
    fs.rmSync(path.join(__dirname, '..', 'Persistencia', archivoTest), { force: true });
  }
});

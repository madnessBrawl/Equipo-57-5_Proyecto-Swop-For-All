const assert = require('node:assert/strict');
const test = require('node:test');
const ControladorIntercambio = require('../controllers/intercambioController');
const Libro = require('../models/Libro');
const LibroRepository = require('../Repositorio/LibroRepository');

test('solicitudes se comparten con ambos participantes, reinician confirmaciones y finalizan con dos confirmaciones', () => {
  const controlador = new ControladorIntercambio(new Map());
  const oferta = controlador.crearOferta({
    idIntercambio: 'INT-test',
    usuarioReceptor: 'maria',
    librosSolicitados: [{ id: 'libro-maria', titulo: 'Libro de María' }]
  }, 'ana');

  assert.equal(oferta.estado, 'Pendiente');
  assert.deepEqual(controlador.obtenerOfertasPorParticipante('maria').map(item => item.idIntercambio), ['INT-test']);

  const modificada = controlador.modificarOferta('INT-test', {
    librosOfrecidos: [{ id: 'libro-ana', titulo: 'Libro de Ana' }]
  }, 'ana');
  assert.equal(modificada.estado, 'Modificada');
  assert.deepEqual(modificada.confirmaciones, []);

  const primeraConfirmacion = controlador.confirmarOferta('INT-test', 'ana');
  assert.deepEqual(primeraConfirmacion.confirmaciones, ['ana']);

  const editadaTrasConfirmar = controlador.modificarOferta('INT-test', {
    librosOfrecidos: [{ id: 'libro-ana-2', titulo: 'Otro libro de Ana' }]
  }, 'maria');
  assert.equal(editadaTrasConfirmar.estado, 'Modificada');
  assert.deepEqual(editadaTrasConfirmar.confirmaciones, []);

  controlador.confirmarOferta('INT-test', 'ana');
  const finalizada = controlador.confirmarOferta('INT-test', 'maria');
  assert.equal(finalizada.estado, 'Finalizado');
  assert.equal(finalizada.confirmaciones.length, 2);
  assert.throws(() => controlador.modificarOferta('INT-test', {}, 'ana'), /cerrado/);
});

test('solo los participantes pueden ver, modificar y confirmar una solicitud', () => {
  const controlador = new ControladorIntercambio(new Map());
  controlador.crearOferta({
    idIntercambio: 'INT-privado',
    usuarioReceptor: 'maria',
    librosSolicitados: [{ id: 'libro-maria' }]
  }, 'ana');

  assert.deepEqual(controlador.obtenerOfertasPorParticipante('otro'), []);
  assert.throws(() => controlador.modificarOferta('INT-privado', {}, 'otro'), /permisos/);
  assert.throws(() => controlador.confirmarOferta('INT-privado', 'otro'), /permisos/);
});

test('solo los participantes pueden eliminar una solicitud cancelada', () => {
  const controlador = new ControladorIntercambio(new Map());
  controlador.crearOferta({
    idIntercambio: 'INT-cancelada',
    usuarioReceptor: 'maria',
    librosSolicitados: [{ id: 'libro-maria' }]
  }, 'ana');
  controlador.cancelarOferta('INT-cancelada', 'ana');

  assert.throws(() => controlador.eliminarOfertaDeLista('INT-cancelada', 'otro'), /permisos/);
  assert.deepEqual(
    controlador.eliminarOfertaDeLista('INT-cancelada', 'maria'),
    { idIntercambio: 'INT-cancelada', oculto: false }
  );
  assert.deepEqual(controlador.obtenerOfertasPorParticipante('ana'), []);
});

test('no se puede eliminar una solicitud activa', () => {
  const controlador = new ControladorIntercambio(new Map());
  controlador.crearOferta({
    idIntercambio: 'INT-activa',
    usuarioReceptor: 'maria',
    librosSolicitados: [{ id: 'libro-maria' }]
  }, 'ana');

  assert.throws(() => controlador.eliminarOfertaDeLista('INT-activa', 'ana'), /finalizados o cancelados/);
});

test('quitar un intercambio finalizado lo oculta solo al usuario y lo conserva para calificar', () => {
  const controlador = new ControladorIntercambio(new Map());
  controlador.crearOferta({
    idIntercambio: 'INT-finalizada',
    usuarioReceptor: 'maria',
    librosSolicitados: [{ id: 'libro-maria', titulo: 'Libro de María' }]
  }, 'ana');
  controlador.modificarOferta('INT-finalizada', {
    librosOfrecidos: [{ id: 'libro-ana', titulo: 'Libro de Ana' }]
  }, 'ana');
  controlador.confirmarOferta('INT-finalizada', 'ana');
  controlador.confirmarOferta('INT-finalizada', 'maria');

  assert.deepEqual(
    controlador.eliminarOfertaDeLista('INT-finalizada', 'ana'),
    { idIntercambio: 'INT-finalizada', oculto: true }
  );
  assert.deepEqual(controlador.obtenerOfertasPorParticipante('ana'), []);
  assert.equal(controlador.obtenerOfertasPorParticipante('maria').length, 1);
  assert.equal(
    controlador.obtenerOfertasPorParticipante('ana', { incluirOcultas: true })[0].estado,
    'Finalizado'
  );
});

test('el segundo consentimiento transfiere los libros y cierra el intercambio', () => {
  let librosTransferidos = 0;
  const controlador = new ControladorIntercambio(new Map(), undefined, {
    transferirLibros: oferta => librosTransferidos = oferta.librosOfrecidos.length + oferta.librosSolicitados.length
  });
  controlador.crearOferta({
    idIntercambio: 'INT-transferencia',
    usuarioReceptor: 'maria',
    librosSolicitados: [{ id: 'maria-1', titulo: 'Libro de María' }]
  }, 'ana');
  controlador.modificarOferta('INT-transferencia', {
    librosOfrecidos: [{ id: 'ana-1', titulo: 'Libro de Ana' }]
  }, 'ana');

  controlador.confirmarOferta('INT-transferencia', 'ana');
  const finalizada = controlador.confirmarOferta('INT-transferencia', 'maria');

  assert.equal(finalizada.estado, 'Finalizado');
  assert.equal(librosTransferidos, 2);
});

test('LibroRepository actualiza propietarios al intercambiar libros', () => {
  let almacen = [
    new Libro({ id: 'ana-1', titulo: 'Libro de Ana', propietario: 'ana' }),
    new Libro({ id: 'maria-1', titulo: 'Libro de María', propietario: 'maria' })
  ];
  const persistencia = {
    buscarTodos: () => almacen,
    guardarVarios: libros => almacen = libros
  };
  const repository = new LibroRepository({ persistencia });

  repository.transferirLibros({
    usuarioEmisor: 'ana',
    usuarioReceptor: 'maria',
    librosOfrecidos: [{ id: 'ana-1', titulo: 'Libro de Ana', autor: 'Autora' }],
    librosSolicitados: [{ id: 'maria-1', titulo: 'Libro de María', autor: 'Autor' }]
  });

  assert.equal(almacen.find(libro => libro.id === 'ana-1').propietario, 'maria');
  assert.equal(almacen.find(libro => libro.id === 'maria-1').propietario, 'ana');
});

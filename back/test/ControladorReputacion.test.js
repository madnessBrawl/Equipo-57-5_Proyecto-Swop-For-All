/*
  Archivo: ControladorReputacion.test.js   (BACKEND: back/test/)
  Función: Pruebas automáticas que VERIFICAN los requisitos no funcionales de Reputación.
  Ejecutar:  node --test back/test/ControladorReputacion.test.js
*/
const test = require('node:test');
const assert = require('node:assert');
const ControladorReputacion = require('../controllers/ControladorReputacion');

// Base de datos falsa en memoria que cumple el contrato buscar/guardar
class BDMemoria {
  constructor(intercambios = []) { this.tablas = { Intercambios: intercambios, Calificaciones: [] }; }
  buscar(tabla, predicado) { return this.tablas[tabla].filter(predicado); }
  guardar(tabla, objeto) { this.tablas[tabla].push(objeto); return objeto; }
}

// Prepara un controlador con un intercambio finalizado entre ana y beto
function preparar() {
  const bd = new BDMemoria([
    { id: 'i1', ofertante: 'ana', receptor: 'beto', estado: 'Finalizado' },
    { id: 'i2', ofertante: 'ana', receptor: 'beto', estado: 'Pendiente' }
  ]);
  return { bd, ctrl: new ControladorReputacion(bd) };
}
const datos = (extra = {}) => ({ idIntercambio: 'i1', tipo: 'lector', evaluado: 'beto', puntuacion: 4, comentario: 'Muy puntual', ...extra });

test('Fiabilidad: una calificación válida se guarda exactamente una vez', () => {
  const { bd, ctrl } = preparar();
  ctrl.calificar(datos(), 'ana');
  assert.strictEqual(bd.tablas.Calificaciones.length, 1);
  assert.throws(() => ctrl.calificar(datos(), 'ana'), /ya calificó/); // El segundo intento se rechaza
  assert.strictEqual(bd.tablas.Calificaciones.length, 1);
});

test('Fiabilidad: una calificación inválida no guarda nada', () => {
  const { bd, ctrl } = preparar();
  assert.throws(() => ctrl.calificar(datos({ puntuacion: 0 }), 'ana'));
  assert.throws(() => ctrl.calificar(datos({ puntuacion: 6 }), 'ana'));
  assert.throws(() => ctrl.calificar(datos({ puntuacion: 3.5 }), 'ana'));
  assert.strictEqual(bd.tablas.Calificaciones.length, 0);
});

test('Reglas de negocio: autocalificación, intercambio no finalizado y no participante', () => {
  const { ctrl } = preparar();
  assert.throws(() => ctrl.calificar(datos({ evaluado: 'ana' }), 'ana'), /sí mismo/);
  assert.throws(() => ctrl.calificar(datos({ idIntercambio: 'i2' }), 'ana'), /finalizados/);
  assert.throws(() => ctrl.calificar(datos(), 'carla'), /no participó/);
});

test('Confidencialidad: no se puede calificar suplantando a otro usuario ni sin sesión', () => {
  const { ctrl } = preparar();
  assert.throws(() => ctrl.calificar({ ...datos(), evaluador: 'beto' }, 'ana'), /nombre de otro/);
  assert.throws(() => ctrl.calificar(datos(), null), /iniciar sesión/);
});

test('Confidencialidad: las reseñas no exponen datos privados', () => {
  const { bd, ctrl } = preparar();
  ctrl.calificar(datos(), 'ana');
  bd.tablas.Calificaciones[0].clave = 'secreto'; // Aunque el registro tuviera un campo extra...
  const { resenas } = ctrl.consultarResenas('beto');
  assert.strictEqual(resenas.length, 1);
  assert.strictEqual('clave' in resenas[0], false); // ...la consulta no lo devuelve
});

test('Consultar reseñas: promedio, filtro y caso sin reseñas', () => {
  const { ctrl } = preparar();
  assert.strictEqual(ctrl.consultarResenas('beto').promedio, null);
  assert.strictEqual(ctrl.consultarResenas('beto').total, 0);
  ctrl.calificar(datos({ puntuacion: 4 }), 'ana');
  ctrl.calificar(datos({ tipo: 'intercambio', puntuacion: 2 }), 'ana');
  assert.strictEqual(ctrl.consultarResenas('beto').total, 2);
  assert.strictEqual(ctrl.consultarResenas('beto', 'lector').total, 1);
  assert.strictEqual(ctrl.consultarResenas('beto').promedio, 4); // Solo cuenta el tipo 'lector'
});

test('Reseñas enviadas: se separan de las recibidas', () => {
  const { ctrl } = preparar();
  ctrl.calificar(datos(), 'ana');
  assert.strictEqual(ctrl.consultarResenasEnviadas('ana').total, 1);
  assert.strictEqual(ctrl.consultarResenasEnviadas('beto').total, 0);
  assert.strictEqual(ctrl.consultarResenas('ana').total, 0);
});

test('Operabilidad: todo rechazo trae un mensaje claro', () => {
  const { ctrl } = preparar();
  const casos = [
    () => ctrl.calificar(datos({ puntuacion: 0 }), 'ana'),
    () => ctrl.calificar(datos({ comentario: 'x'.repeat(301) }), 'ana'),
    () => ctrl.calificar(datos({ idIntercambio: 'zzz' }), 'ana'),
    () => ctrl.calificar(datos(), null)
  ];
  for (const caso of casos) {
    try { caso(); assert.fail('Debía rechazarse'); }
    catch (e) { assert.ok(e.message && e.message.length > 5); }
  }
});

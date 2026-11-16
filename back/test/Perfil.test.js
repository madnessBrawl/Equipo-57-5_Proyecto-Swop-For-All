/*
  Archivo: Perfil.test.js (BACKEND: back/test/)
  Función: Pruebas automatizadas para verificar el cumplimiento del flujo de Modificar Perfil
           y las correcciones señaladas por la profesora.
  Ejecución: node --test back/test/Perfil.test.js
*/

const test = require('node:test');
const assert = require('node:assert');
const PerfilModel = require('../models/PerfilModel');
const PerfilService = require('../Service/PerfilService');
const PerfilController = require('../controllers/PerfilController');

// Repositorio en memoria para pruebas unitarias sin tocar el disco
class PerfilRepositoryMemoria {
  constructor(perfilesIniciales = []) {
    this.perfiles = perfilesIniciales.map(p => new PerfilModel(p));
  }
  obtenerTodos() {
    return [...this.perfiles];
  }
  buscarPorUsuario(u) {
    return this.perfiles.find(p => p.usuario.toLowerCase() === u.toLowerCase()) || null;
  }
  obtenerPorUsuario(u) {
    return this.buscarPorUsuario(u);
  }
  buscarPorCorreo(c) {
    return this.perfiles.find(p => p.correo.toLowerCase() === c.toLowerCase()) || null;
  }
  obtenerPorCorreo(c) {
    return this.buscarPorCorreo(c);
  }
  buscarPorTelefono(t) {
    if (!t) return null;
    return this.perfiles.find(p => p.telefono === t) || null;
  }
  obtenerPorTelefono(t) {
    return this.buscarPorTelefono(t);
  }
  guardar(nuevo) {
    this.perfiles.push(nuevo);
    return nuevo;
  }
  actualizar(usuario, modificado) {
    const idx = this.perfiles.findIndex(p => p.usuario.toLowerCase() === usuario.toLowerCase());
    if (idx === -1) throw new Error('Usuario no encontrado');
    this.perfiles[idx] = modificado;
    return modificado;
  }
}

// Datos iniciales de prueba
function prepararPruebas() {
  const repo = new PerfilRepositoryMemoria([
    {
      usuario: 'gabriel_lector',
      nombre: 'Gabriel',
      apellido: 'Alfonso',
      correo: 'gabriel@ejemplo.com',
      telefono: '04141234567',
      estadoVenezuela: 'Distrito Capital',
      genero: 'Hombre',
      generosFavoritos: 'Fantasía, Novela',
      biografia: 'Lector entusiasta.',
      reputacion: 5.0
    },
    {
      usuario: 'maria_libros',
      nombre: 'María',
      apellido: 'Gómez',
      correo: 'maria@ejemplo.com',
      telefono: '04247654321',
      estadoVenezuela: 'Miranda',
      genero: 'Mujer',
      generosFavoritos: 'Historia',
      biografia: 'Interesada en biografías.',
      reputacion: 4.8
    }
  ]);
  const servicio = new PerfilService(repo);
  const controller = new PerfilController(servicio);
  return { repo, servicio, controller };
}

test('Consulta de Perfil: devuelve la información sin exponer contraseña', () => {
  const { controller } = prepararPruebas();
  const respuesta = controller.consultar('gabriel_lector');
  assert.strictEqual(respuesta.exito, true);
  assert.strictEqual(respuesta.datos.usuario, 'gabriel_lector');
  assert.strictEqual(respuesta.datos.nombre, 'Gabriel');
  assert.strictEqual('clave' in respuesta.datos, false);
});

test('Corrección de Profesora: Si ya está logueado no debe volver a pedir login', () => {
  const { controller } = prepararPruebas();
  const res = controller.modificar('gabriel_lector', {
    generosFavoritos: 'Terror, Ciencia Ficción'
  });
  assert.strictEqual(res.exito, true);
  assert.strictEqual(res.mensaje, 'información actualizada con éxito');
  assert.strictEqual(res.perfil.generosFavoritos, 'Terror, Ciencia Ficción');
});

test('Validación de campos obligatorios: no permite nombre o apellido vacíos', () => {
  const { controller } = prepararPruebas();
  const res = controller.modificar('gabriel_lector', { nombre: '' });
  assert.strictEqual(res.exito, false);
  assert.match(res.mensaje, /nombre debe tener al menos/);
});

test('Validación de formato de correo electrónico', () => {
  const { controller } = prepararPruebas();
  const res = controller.modificar('gabriel_lector', { correo: 'correo-invalido' });
  assert.strictEqual(res.exito, false);
  assert.match(res.mensaje, /formato válido/);
});

test('Verificación de unicidad: rechaza correo si pertenece a otro usuario', () => {
  const { controller } = prepararPruebas();
  const res = controller.modificar('gabriel_lector', { correo: 'maria@ejemplo.com' });
  assert.strictEqual(res.exito, false);
  assert.match(res.mensaje, /registrado por otro usuario/);
});

test('Verificación de unicidad: permite mantener el mismo correo propio', () => {
  const { controller } = prepararPruebas();
  const res = controller.modificar('gabriel_lector', {
    correo: 'gabriel@ejemplo.com',
    biografia: 'Nueva biografía actualizada.'
  });
  assert.strictEqual(res.exito, true);
  assert.strictEqual(res.perfil.biografia, 'Nueva biografía actualizada.');
});

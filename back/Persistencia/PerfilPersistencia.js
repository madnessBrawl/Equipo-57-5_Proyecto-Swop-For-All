/*
  Archivo: PerfilPersistencia.js (BACKEND: back/Persistencia/)
  Clase: PerfilPersistencia
  Función: Capa de persistencia en archivos JSON para perfiles de lectores,
           heredando de PersistenciaJSON para almacenamiento persistente y atómico.
*/

const PersistenciaJSON = require('./PersistenciaJSON');

class PerfilPersistencia extends PersistenciaJSON {
  constructor(nombreArchivo = 'usuarios.json') {
    const semilla = [
      {
        id: 'usr_gabriel',
        usuario: 'gabriel_lector',
        nombre: 'Gabriel',
        apellido: 'Alfonso',
        correo: 'gabriel@ejemplo.com',
        telefono: '04141234567',
        estadoVenezuela: 'Distrito Capital',
        genero: 'Hombre',
        generosFavoritos: 'Novela, Ciencia Ficción',
        biografia: 'Lector apasionado buscando intercambiar sagas de fantasía y ciencia ficción.',
        reputacion: 5.0,
        clave: '123456'
      },
      {
        id: 'usr_juan',
        usuario: 'Juan02',
        nombre: 'juan',
        apellido: 'Santana',
        correo: 'juanito023@gmail.com',
        telefono: '04143731047',
        estadoVenezuela: 'Distrito Capital',
        genero: 'Hombre',
        generosFavoritos: 'terror',
        biografia: 'Cuéntale a otros lectores sobre tus intereses literarios o tipos de libros que buscas intercambiar...',
        reputacion: 5.0,
        clave: 'juan123'
      },
      {
        id: 'usr_carlos',
        usuario: 'carlos_lector',
        nombre: 'Carlos Andrés',
        apellido: 'Pérez',
        correo: 'carlos@ejemplo.com',
        telefono: '04147654321',
        estadoVenezuela: 'Miranda',
        genero: 'Hombre',
        generosFavoritos: 'Historia, Biografías',
        biografia: '',
        reputacion: 4.8,
        clave: 'carlos123'
      }
    ];

    super(nombreArchivo, semilla);
  }

  buscarPorUsuario(nombreUsuario) {
    if (!nombreUsuario) return null;
    const u = String(nombreUsuario).trim().toLowerCase();
    const todos = this._leerArchivo();
    return todos.find(item => item.usuario && item.usuario.toLowerCase() === u) || null;
  }

  buscarPorCorreo(correo) {
    if (!correo) return null;
    const c = String(correo).trim().toLowerCase();
    const todos = this._leerArchivo();
    return todos.find(item => item.correo && item.correo.toLowerCase() === c) || null;
  }

  buscarPorTelefono(telefono) {
    if (!telefono) return null;
    const telLimpio = String(telefono).replace(/[\s-]/g, '');
    const todos = this._leerArchivo();
    return todos.find(item => item.telefono && item.telefono.replace(/[\s-]/g, '') === telLimpio) || null;
  }

  actualizarPorUsuario(nombreUsuario, datosNuevos) {
    if (!nombreUsuario) return null;
    const u = String(nombreUsuario).trim().toLowerCase();
    const todos = this._leerArchivo();
    const indice = todos.findIndex(item => item.usuario && item.usuario.toLowerCase() === u);

    if (indice === -1) {
      return null;
    }

    todos[indice] = {
      ...todos[indice],
      ...datosNuevos,
      usuario: todos[indice].usuario
    };

    this._escribirArchivo(todos);
    return todos[indice];
  }
}

module.exports = PerfilPersistencia;

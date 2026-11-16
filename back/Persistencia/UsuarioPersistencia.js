/*
  Archivo: UsuarioPersistencia.js (BACKEND: back/Persistencia/)
  Clase: UsuarioPersistencia
  Función: Gestiona la persistencia de usuarios y perfiles en back/Persistencia/usuarios.json.
*/

const PersistenciaJSON = require('./PersistenciaJSON');

class UsuarioPersistencia extends PersistenciaJSON {
  constructor(nombreArchivo = 'usuarios.json') {
    const semilla = [
      {
        id: 'usr_carlos',
        usuario: 'carlos_lector',
        nombres: 'Carlos Andrés',
        apellidos: 'Pérez',
        correo: 'carlos@ejemplo.com',
        telefono: '04141234567',
        clave: 'carlos123',
        reputacion: 4.8
      },
      {
        id: 'usr_maria',
        usuario: 'maria_books',
        nombres: 'María Gabriela',
        apellidos: 'López',
        correo: 'maria@ejemplo.com',
        telefono: '04249876543',
        clave: 'maria123',
        reputacion: 5.0
      },
      {
        id: 'usr_ana',
        usuario: 'ana_lectora',
        nombres: 'Ana Isabel',
        apellidos: 'Rodríguez',
        correo: 'ana@ejemplo.com',
        telefono: '04125556677',
        clave: 'ana123',
        reputacion: 4.5
      }
    ];

    super(nombreArchivo, semilla);
  }

  buscarPorUsuario(nombreUsuario) {
    if (!nombreUsuario) return null;
    const u = String(nombreUsuario).trim().toLowerCase();
    const todos = this.obtenerTodos();
    return todos.find(user => user.usuario && user.usuario.toLowerCase() === u) || null;
  }

  buscarPorCorreo(correo) {
    if (!correo) return null;
    const c = String(correo).trim().toLowerCase();
    const todos = this.obtenerTodos();
    return todos.find(user => user.correo && user.correo.toLowerCase() === c) || null;
  }
}

module.exports = UsuarioPersistencia;

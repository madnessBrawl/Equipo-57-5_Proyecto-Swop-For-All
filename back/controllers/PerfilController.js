/*
  Archivo: PerfilController.js (BACKEND: back/controllers/)
  Clase: PerfilController
  Función: Capa de Controlador que recibe las solicitudes de la Vista/Frontend o del Servidor HTTP,
           orquesta la llamada al Servicio de Perfil y retorna la respuesta normalizada.
*/

const PerfilService = require('../Service/PerfilService');

class PerfilController {
  constructor(servicio = new PerfilService()) {
    this.servicio = servicio;
  }

  // Método para tests y arquitectura estándar
  consultar(usuario) {
    try {
      const perfil = this.servicio.consultarPerfil(usuario);
      return { exito: true, datos: perfil, codigo: 200 };
    } catch (error) {
      return { exito: false, mensaje: error.message, codigo: 404 };
    }
  }

  // Alias para endpoint HTTP
  obtenerPerfil(usuario) {
    return this.consultar(usuario);
  }

  // Método para tests y arquitectura estándar
  modificar(usuarioSesion, datosModificados) {
    try {
      const resultado = this.servicio.modificarPerfil(usuarioSesion, datosModificados);
      return {
        exito: true,
        mensaje: resultado.mensaje,
        perfil: resultado.perfil,
        codigo: 200
      };
    } catch (error) {
      return {
        exito: false,
        mensaje: error.message,
        codigo: 400
      };
    }
  }

  // Alias para endpoint HTTP
  actualizarPerfil(usuarioSesion, datosModificados) {
    return this.modificar(usuarioSesion, datosModificados);
  }

  // Verificación de disponibilidad de correo y teléfono
  verificar(usuarioSesion, { correo, telefono } = {}) {
    try {
      this.servicio.verificarUnicidad(usuarioSesion, correo, telefono);
      return { exito: true, disponible: true, codigo: 200 };
    } catch (error) {
      return { exito: false, disponible: false, mensaje: error.message, codigo: 409 };
    }
  }

  verificarDisponibilidad(usuarioSesion, params) {
    return this.verificar(usuarioSesion, params);
  }
}

module.exports = PerfilController;

/*
  Archivo: PerfilRepository.js (BACKEND: back/Repositorio/)
  Clase: PerfilRepository
  Función: Capa de Repositorio que encapsula las consultas y operaciones
           sobre la persistencia de perfiles, abstrayendo la base de datos física.
*/

const PerfilModel = require('../models/PerfilModel');
const PerfilPersistencia = require('../Persistencia/PerfilPersistencia');

class PerfilRepository {
  constructor(persistencia = new PerfilPersistencia()) {
    this.persistencia = persistencia;
  }

  obtenerPorUsuario(usuario) {
    const raw = this.persistencia.buscarPorUsuario(usuario);
    return raw ? new PerfilModel(raw) : null;
  }

  obtenerPorCorreo(correo) {
    const raw = this.persistencia.buscarPorCorreo(correo);
    return raw ? new PerfilModel(raw) : null;
  }

  obtenerPorTelefono(telefono) {
    const raw = this.persistencia.buscarPorTelefono(telefono);
    return raw ? new PerfilModel(raw) : null;
  }

  actualizar(usuario, datosActualizados) {
    const actualizado = this.persistencia.actualizarPorUsuario(usuario, datosActualizados);
    return actualizado ? new PerfilModel(actualizado) : null;
  }

  listarTodos() {
    return this.persistencia.obtenerTodos().map(d => new PerfilModel(d));
  }
}

module.exports = PerfilRepository;

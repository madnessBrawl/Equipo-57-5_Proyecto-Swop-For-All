/*
  Archivo: PerfilService.js (BACKEND: back/Service/)
  Clase: PerfilService
  Función: Capa de Lógica de Negocio (Service) para la gestión y modificación
           del perfil del lector, orquestando validaciones, reglas de unicidad y persistencia.
*/

const PerfilModel = require('../models/PerfilModel');
const PerfilRepository = require('../Repositorio/PerfilRepository');

class PerfilService {
  constructor(repositorio = new PerfilRepository()) {
    this.repositorio = repositorio;
  }

  _buscarUsuario(u) {
    if (typeof this.repositorio.obtenerPorUsuario === 'function') {
      return this.repositorio.obtenerPorUsuario(u);
    }
    if (typeof this.repositorio.buscarPorUsuario === 'function') {
      return this.repositorio.buscarPorUsuario(u);
    }
    return null;
  }

  _buscarCorreo(c) {
    if (typeof this.repositorio.obtenerPorCorreo === 'function') {
      return this.repositorio.obtenerPorCorreo(c);
    }
    if (typeof this.repositorio.buscarPorCorreo === 'function') {
      return this.repositorio.buscarPorCorreo(c);
    }
    return null;
  }

  _buscarTelefono(t) {
    if (typeof this.repositorio.obtenerPorTelefono === 'function') {
      return this.repositorio.obtenerPorTelefono(t);
    }
    if (typeof this.repositorio.buscarPorTelefono === 'function') {
      return this.repositorio.buscarPorTelefono(t);
    }
    return null;
  }

  consultarPerfil(usuario) {
    if (!usuario) {
      throw new Error('Debe especificar un nombre de usuario válido.');
    }
    const perfil = this._buscarUsuario(usuario);
    if (!perfil) {
      throw new Error(`El usuario '${usuario}' no fue encontrado en el sistema.`);
    }
    return typeof perfil.aObjetoPublico === 'function' ? perfil.aObjetoPublico() : perfil;
  }

  verificarUnicidad(usuarioActual, nuevoCorreo, nuevoTelefono) {
    if (nuevoCorreo) {
      const usuarioConMismoCorreo = this._buscarCorreo(nuevoCorreo);
      if (usuarioConMismoCorreo && usuarioConMismoCorreo.usuario.toLowerCase() !== usuarioActual.toLowerCase()) {
        throw new Error('El correo electrónico ya se encuentra registrado por otro usuario. Intente con otro.');
      }
    }

    if (nuevoTelefono) {
      const usuarioConMismoTel = this._buscarTelefono(nuevoTelefono);
      if (usuarioConMismoTel && usuarioConMismoTel.usuario.toLowerCase() !== usuarioActual.toLowerCase()) {
        throw new Error('El teléfono ya se encuentra registrado por otro usuario. Intente con otro.');
      }
    }

    return true;
  }

  modificarPerfil(usuarioSesion, datosModificados) {
    if (!usuarioSesion) {
      throw new Error('Sesión requerida: el usuario debe estar autenticado en la plataforma.');
    }

    const perfilExistente = this._buscarUsuario(usuarioSesion);
    if (!perfilExistente) {
      throw new Error(`El usuario '${usuarioSesion}' no existe.`);
    }

    const nuevoPerfil = new PerfilModel({
      ...perfilExistente,
      ...datosModificados,
      usuario: perfilExistente.usuario,
      reputacion: perfilExistente.reputacion,
      clave: perfilExistente.clave
    });

    const errorValidacion = nuevoPerfil.validar();
    if (errorValidacion) {
      throw new Error(errorValidacion);
    }

    this.verificarUnicidad(usuarioSesion, nuevoPerfil.correo, nuevoPerfil.telefono);

    let perfilGuardado = null;
    if (typeof this.repositorio.actualizar === 'function') {
      perfilGuardado = this.repositorio.actualizar(usuarioSesion, nuevoPerfil);
    }

    const salida = perfilGuardado || nuevoPerfil;
    return {
      exito: true,
      mensaje: 'información actualizada con éxito',
      perfil: typeof salida.aObjetoPublico === 'function' ? salida.aObjetoPublico() : salida
    };
  }
}

module.exports = PerfilService;

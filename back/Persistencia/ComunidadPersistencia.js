/*
  Archivo: ComunidadPersistencia.js (BACKEND: back/Persistencia/)
  Clase: ComunidadPersistencia
  Función: Gestiona la persistencia física de comunidades en back/Persistencia/comunidades.json
           incluyendo membresías, límite de 20 miembros, roles y chat general.
*/

const PersistenciaJSON = require('./PersistenciaJSON');

class ComunidadPersistencia extends PersistenciaJSON {
  constructor(nombreArchivo = 'comunidades.json') {
    super(nombreArchivo, []);
  }

  buscarPorNombre(nombre) {
    if (!nombre) return null;
    const n = String(nombre).trim().toLowerCase();
    const todas = this.obtenerTodos();
    return todas.find(c => c.nombre && c.nombre.toLowerCase() === n) || null;
  }

  buscarPorCreador(usuario) {
    if (!usuario) return [];
    const u = String(usuario).trim().toLowerCase();
    return this.buscarPorPredicado(c => c.creador && c.creador.toLowerCase() === u);
  }

  buscarPorMiembro(usuario) {
    if (!usuario) return [];
    const u = String(usuario).trim().toLowerCase();
    return this.buscarPorPredicado(c =>
      Array.isArray(c.miembros) && c.miembros.some(m => String(m).toLowerCase() === u)
    );
  }

  // Unir a un nuevo lector a la comunidad
  unirMiembro(idComunidad, usuario) {
    if (!usuario) {
      throw new Error('Usuario inválido.');
    }

    const comunidad = this.buscarPorId(idComunidad);
    if (!comunidad) {
      throw new Error('La comunidad no existe.');
    }

    if (!Array.isArray(comunidad.miembros)) {
      comunidad.miembros = [comunidad.creador];
    }

    const u = String(usuario).trim();

    // Validar si ya es miembro
    if (comunidad.miembros.includes(u)) {
      return { yaEsMiembro: true, comunidad };
    }

    // Condición del límite de 20 miembros
    const limite = comunidad.maxMiembros || 20;
    if (comunidad.miembros.length >= limite) {
      throw new Error('Comunidad llena');
    }

    comunidad.miembros.push(u);
    this.guardar(comunidad);

    return { yaEsMiembro: false, comunidad };
  }

  // Agregar mensaje al chat de la comunidad
  agregarMensaje(idComunidad, emisor, texto) {
    const comunidad = this.buscarPorId(idComunidad);
    if (!comunidad) {
      throw new Error('Comunidad no encontrada');
    }

    if (!Array.isArray(comunidad.mensajes)) {
      comunidad.mensajes = [];
    }

    const nuevoMensaje = {
      emisor: String(emisor || 'Anónimo').trim(),
      texto: String(texto || '').trim(),
      fecha: new Date().toISOString()
    };

    comunidad.mensajes.push(nuevoMensaje);
    this.guardar(comunidad);
    return nuevoMensaje;
  }
}

module.exports = ComunidadPersistencia;

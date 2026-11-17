/*
  Archivo: intercambioController.js (BACKEND: back/controllers/)
  Clase: ControladorIntercambio
  Función: Controlador orientado a objetos que orquesta la creación, modificación,
           seguimiento y sala de chat de ofertas de intercambio entre lectores de Swop-For-All.
           Sigue la teoría de Diseño 3 (arquitectura en capas C4 / MVC / Repository).
*/

const OfertaIntercambio = require('../models/intercambioModel');
const IntercambioPersistencia = require('../Persistencia/IntercambioPersistencia');
const CifradoService = require('../Service/CifradoService');

class ControladorIntercambio {
  constructor(persistencia = null, libroRepository = null, cifradoService = new CifradoService()) {
    if (persistencia instanceof Map) {
      this._ofertasDB = persistencia;
      this._persistencia = null;
    } else if (persistencia) {
      this._persistencia = persistencia;
      this._ofertasDB = new Map();
    } else {
      this._ofertasDB = new Map();
      this._persistencia = null;
    }

    this._libroRepository = libroRepository;
    this._cifradoService = cifradoService;
  }

  // Getters para inspección
  get persistencia() {
    return this._persistencia;
  }

  get totalOfertas() {
    return this._persistencia ? this._persistencia.total() : this._ofertasDB.size;
  }

  /*
    HU: Enviar oferta de intercambio desde el catálogo
    Precondición: Usuario autenticado y libros seleccionados.
    Restricción 3.4 del Brief: Un libro solo puede formar parte de un intercambio activo a la vez.
  */
  crearOferta({ usuarioReceptor, librosOfrecidos = [], librosSolicitados = [], mensajeInicial = '' }, usuarioSesion) {
    if (!usuarioSesion) {
      throw new Error('Debe iniciar sesión para crear una oferta de intercambio.');
    }

    const nuevaOferta = new OfertaIntercambio({
      usuarioEmisor: usuarioSesion,
      usuarioReceptor: usuarioReceptor,
      librosOfrecidos: librosOfrecidos,
      librosSolicitados: librosSolicitados,
      estado: 'Pendiente'
    });

    const error = nuevaOferta.validar();
    if (error) {
      throw new Error(error);
    }

    // Validación de la Restricción 3.4 del Brief (o reutilizar oferta existente entre los mismos usuarios)
    for (const lib of librosSolicitados) {
      const idLib = typeof lib === 'object' ? lib.id : lib;
      const ofertaExistente = this._persistencia
        ? this._persistencia.buscarIntercambioActivoPorLibro(idLib)
        : Array.from(this._ofertasDB.values()).find(o =>
            ['Pendiente', 'Modificada', 'Aceptada'].includes(o.estado) &&
            o.librosSolicitados.some(s => (typeof s === 'object' ? s.id : s) === idLib)
          );

      if (ofertaExistente) {
        const u = String(usuarioSesion).trim().toLowerCase();
        const emisor = String(ofertaExistente.usuarioEmisor).trim().toLowerCase();
        // Si el mismo usuario ya tiene este intercambio activo, retornamos la oferta existente para continuarla
        if (emisor === u) {
          return (typeof ofertaExistente.toJSON === 'function') ? ofertaExistente.toJSON() : ofertaExistente;
        }
        throw new Error(`El libro "${typeof lib === 'object' ? lib.titulo || idLib : idLib}" ya se encuentra en un intercambio activo.`);
      }
    }

    // Si se envía un mensaje inicial al abrir la sala de negociación
    if (mensajeInicial && String(mensajeInicial).trim()) {
      nuevaOferta.agregarMensaje({
        remitente: usuarioSesion,
        texto: String(mensajeInicial).trim()
      });
    }

    // Persistencia física en JSON (si hay persistencia configurada) y en memoria
    const guardada = this._persistencia ? this._persistencia.guardar(nuevaOferta) : nuevaOferta.toJSON();
    this._ofertasDB.set(nuevaOferta.idIntercambio, nuevaOferta);

    // Actualiza disponibilidad del libro solicitado si hay repositorio disponible
    if (this._libroRepository && typeof this._libroRepository.actualizarDisponibilidad === 'function') {
      for (const lib of librosSolicitados) {
        const idLib = typeof lib === 'object' ? lib.id : lib;
        try {
          this._libroRepository.actualizarDisponibilidad(idLib, false);
        } catch {}
      }
    }

    return guardada;
  }

  /*
    HU: Modificar oferta de intercambio
    Permite ajustar libros propios ofrecidos y libros ajenos solicitados.
  */
  modificarOferta(idIntercambio, { librosOfrecidos, librosSolicitados }, usuarioSesion) {
    if (!usuarioSesion) {
      throw new Error('Debe estar autenticado para modificar una oferta.');
    }

    const registro = (this._persistencia ? this._persistencia.buscarPorId(idIntercambio) : null) ||
                     this._ofertasDB.get(idIntercambio);
    if (!registro) {
      throw new Error(`La oferta con ID ${idIntercambio} no fue encontrada.`);
    }

    const oferta = (registro instanceof OfertaIntercambio) ? registro : new OfertaIntercambio(registro);

    // Regla de seguridad: solo los lectores involucrados pueden modificarla
    const u = String(usuarioSesion).trim().toLowerCase();
    const emisor = String(oferta.usuarioEmisor).trim().toLowerCase();
    const receptor = String(oferta.usuarioReceptor).trim().toLowerCase();
    if (emisor !== u && receptor !== u) {
      throw new Error('No tiene permisos para modificar esta oferta de intercambio.');
    }

    if (oferta.estado === 'Finalizado' || oferta.estado === 'Cancelada' || oferta.estado === 'Rechazada') {
      throw new Error(`No se puede modificar una oferta en estado "${oferta.estado}".`);
    }

    // ── Validación: un mismo libro propio no puede ofrecerse en más de un intercambio activo ──
    if (this._persistencia && Array.isArray(librosOfrecidos)) {
      for (const lib of librosOfrecidos) {
        const idLib    = typeof lib === 'object' ? lib.id : lib;
        const titulo   = typeof lib === 'object' ? (lib.titulo || idLib) : idLib;
        const conflicto = this._persistencia.buscarIntercambioActivoPorLibroOfrecido(
          idLib, usuarioSesion, idIntercambio
        );
        if (conflicto) {
          throw new Error(
            `⚠️ Ya estás ofreciendo "${titulo}" en otro intercambio activo ` +
            `(ID: ${conflicto.id || conflicto.idIntercambio}). ` +
            `Retíralo de ese intercambio antes de ofrecerlo aquí.`
          );
        }
      }
    }

    oferta.actualizarLibros({ librosOfrecidos, librosSolicitados });

    // Guardar en persistencia JSON y en memoria
    const guardada = this._persistencia ? this._persistencia.guardar(oferta) : oferta.toJSON();
    this._ofertasDB.set(oferta.idIntercambio, oferta);

    return guardada;
  }

  /*
    HU: Chat de intercambio (Enviar mensaje)
    Permite enviar mensajes entre los lectores en la sala de negociación del intercambio.
  */
  enviarMensajeChat(idIntercambio, { texto }, usuarioSesion) {
    if (!usuarioSesion) {
      throw new Error('Debe iniciar sesión para enviar mensajes en el chat.');
    }

    const registro = (this._persistencia ? this._persistencia.buscarPorId(idIntercambio) : null) ||
                     this._ofertasDB.get(idIntercambio);
    if (!registro) {
      throw new Error(`El intercambio con ID ${idIntercambio} no fue encontrado.`);
    }

    const oferta = (registro instanceof OfertaIntercambio) ? registro : new OfertaIntercambio(registro);
    const mensajeNuevo = oferta.agregarMensaje({ remitente: usuarioSesion, texto });

    if (this._persistencia) {
      this._persistencia.guardar(oferta);
    }
    this._ofertasDB.set(oferta.idIntercambio, oferta);

    return {
      mensaje: 'Mensaje enviado exitosamente',
      data: mensajeNuevo,
      idIntercambio: oferta.idIntercambio
    };
  }

  /*
    HU: Chat de intercambio (Consultar mensajes)
  */
  obtenerMensajesChat(idIntercambio, usuarioSesion) {
    const oferta = this.obtenerOfertaPorId(idIntercambio);
    if (!oferta) {
      throw new Error(`El intercambio con ID ${idIntercambio} no existe.`);
    }

    if (usuarioSesion) {
      const u = String(usuarioSesion).trim().toLowerCase();
      const emisor = String(oferta.usuarioEmisor).trim().toLowerCase();
      const receptor = String(oferta.usuarioReceptor).trim().toLowerCase();
      if (emisor !== u && receptor !== u) {
        throw new Error('No tiene permisos para consultar los mensajes de este intercambio.');
      }
    }

    return oferta.mensajes || [];
  }

  /*
    Consulta una oferta por su ID único
  */
  obtenerOfertaPorId(idIntercambio) {
    const encontrada = (this._persistencia ? this._persistencia.buscarPorId(idIntercambio) : null) ||
                       this._ofertasDB.get(idIntercambio);
    if (!encontrada) return null;
    return (encontrada instanceof OfertaIntercambio) ? encontrada.toJSON() : encontrada;
  }

  /*
    Lista los intercambios de un usuario específico
  */
  obtenerOfertasUsuario(usuario) {
    if (!usuario) return [];
    if (this._persistencia) {
      return this._persistencia.buscarPorParticipante(usuario);
    }
    const u = String(usuario).trim().toLowerCase();
    return Array.from(this._ofertasDB.values())
      .filter(o => o.usuarioEmisor.toLowerCase() === u || o.usuarioReceptor.toLowerCase() === u)
      .map(o => (typeof o.toJSON === 'function' ? o.toJSON() : o));
  }

  /*
    Lista todas las ofertas
  */
  obtenerTodasLasOfertas() {
    return this._persistencia ? this._persistencia.obtenerTodos() : Array.from(this._ofertasDB.values());
  }

  /*
    Cancela una oferta activa y libera los libros
  */
  cancelarOferta(idIntercambio, usuarioSesion) {
    if (!usuarioSesion) {
      throw new Error('Debe iniciar sesión para cancelar una oferta.');
    }

    const registro = (this._persistencia ? this._persistencia.buscarPorId(idIntercambio) : null) ||
                     this._ofertasDB.get(idIntercambio);
    if (!registro) {
      throw new Error(`La oferta con ID ${idIntercambio} no fue encontrada.`);
    }

    const oferta = (registro instanceof OfertaIntercambio) ? registro : new OfertaIntercambio(registro);
    const u = String(usuarioSesion).trim().toLowerCase();
    if (oferta.usuarioEmisor.toLowerCase() !== u && oferta.usuarioReceptor.toLowerCase() !== u) {
      throw new Error('No tiene permisos para cancelar este intercambio.');
    }

    oferta.estado = 'Cancelada';
    const guardada = this._persistencia ? this._persistencia.guardar(oferta) : oferta.toJSON();
    this._ofertasDB.set(oferta.idIntercambio, oferta);

    // Liberar disponibilidad de libros si hay repositorio
    if (this._libroRepository && typeof this._libroRepository.actualizarDisponibilidad === 'function') {
      for (const lib of oferta.librosSolicitados) {
        const idLib = typeof lib === 'object' ? lib.id : lib;
        try {
          this._libroRepository.actualizarDisponibilidad(idLib, true);
        } catch {}
      }
    }

    return guardada;
  }
}

// Para compatibilidad
const controladorInstancia = new ControladorIntercambio();

module.exports = ControladorIntercambio;
module.exports.controladorInstancia = controladorInstancia;

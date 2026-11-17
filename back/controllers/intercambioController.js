/*
  Archivo: intercambioController.js (BACKEND: back/controllers/)
  Clase: ControladorIntercambio
  Función: Controlador orientado a objetos que orquesta la creación, modificación,
           seguimiento, confirmaciones y sala de chat de ofertas de intercambio entre lectores de Swop-For-All.
           Sigue la teoría de Diseño 3 (arquitectura en capas C4 / MVC / Repository).
*/

const OfertaIntercambio = require('../models/intercambioModel');
const IntercambioPersistencia = require('../Persistencia/IntercambioPersistencia');
const CifradoService = require('../Service/CifradoService');

class ControladorIntercambio {
  constructor(baseDeDatos = null, cifradoService = new CifradoService(), libroController = null, libroRepository = null) {
    if (baseDeDatos instanceof Map) {
      this._ofertasDB = baseDeDatos;
      this._persistencia = null;
    } else if (baseDeDatos && typeof baseDeDatos.guardar === 'function') {
      this._persistencia = baseDeDatos;
      this._ofertasDB = new Map();
    } else {
      this._ofertasDB = new Map();
      this._persistencia = null;
    }

    this._cifradoService = cifradoService;
    this._libroController = libroController;
    this._libroRepository = libroRepository;
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
  crearOferta({ id, idIntercambio, usuarioReceptor, librosOfrecidos = [], librosSolicitados = [], mensajeInicial = '' } = {}, usuarioSesion) {
    if (!usuarioSesion) {
      throw new Error('Debe iniciar sesión para crear una oferta de intercambio.');
    }

    const idFinal = id || idIntercambio;

    const nuevaOferta = new OfertaIntercambio({
      id: idFinal,
      idIntercambio: idFinal,
      usuarioEmisor: usuarioSesion,
      usuarioReceptor: usuarioReceptor,
      librosOfrecidos: librosOfrecidos,
      librosSolicitados: librosSolicitados,
      estado: 'Pendiente',
      confirmaciones: []
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
            Array.isArray(o.librosSolicitados) &&
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

    // Guardado unificado
    const guardada = this._guardar(nuevaOferta);

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
  modificarOferta(idIntercambio, { librosOfrecidos, librosSolicitados } = {}, usuarioSesion) {
    if (!usuarioSesion) {
      throw new Error('Debe estar autenticado para modificar una oferta.');
    }

    const registro = this._buscar(idIntercambio);
    if (!registro) {
      throw new Error(`La oferta con ID ${idIntercambio} no fue encontrada.`);
    }

    // Regla de seguridad: solo los involucrados pueden modificarla
    if (!this._esParticipante(registro, usuarioSesion)) {
      throw new Error('No tiene permisos para modificar esta oferta de intercambio.');
    }

    if (registro.estado === 'Finalizado' || registro.estado === 'Cancelada') {
      throw new Error('No se puede modificar un intercambio cerrado.');
    }
    if (registro.estado === 'Rechazada') {
      throw new Error(`No se puede modificar una oferta en estado "${registro.estado}".`);
    }

    // ── Validación: un mismo libro propio no puede ofrecerse en más de un intercambio activo ──
    if (this._persistencia && Array.isArray(librosOfrecidos) && typeof this._persistencia.buscarIntercambioActivoPorLibroOfrecido === 'function') {
      for (const lib of librosOfrecidos) {
        const idLib = typeof lib === 'object' ? lib.id : lib;
        const titulo = typeof lib === 'object' ? (lib.titulo || idLib) : idLib;
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

    const oferta = (registro instanceof OfertaIntercambio) ? registro : this._hidratar(registro);

    if (Array.isArray(librosOfrecidos)) {
      oferta._librosOfrecidos = [...librosOfrecidos];
    }
    if (Array.isArray(librosSolicitados)) {
      oferta._librosSolicitados = [...librosSolicitados];
    }
    if (oferta.librosSolicitados.length === 0) {
      throw new Error('Debe solicitar al menos un libro para mantener el intercambio.');
    }

    oferta._confirmaciones = [];
    oferta.estado = 'Modificada';
    oferta._fechaModificacion = new Date().toISOString();

    return this._guardar(oferta);
  }

  /*
    HU: Chat de intercambio (Enviar mensaje)
    Permite enviar mensajes entre los lectores en la sala de negociación del intercambio.
  */
  enviarMensajeChat(idIntercambio, { texto }, usuarioSesion) {
    if (!usuarioSesion) {
      throw new Error('Debe iniciar sesión para enviar mensajes en el chat.');
    }

    const registro = this._buscar(idIntercambio);
    if (!registro) {
      throw new Error(`El intercambio con ID ${idIntercambio} no fue encontrado.`);
    }

    const oferta = (registro instanceof OfertaIntercambio) ? registro : this._hidratar(registro);
    const mensajeNuevo = oferta.agregarMensaje({ remitente: usuarioSesion, texto });

    this._guardar(oferta);

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
    const oferta = this._buscar(idIntercambio);
    return oferta ? this._serializar(oferta) : null;
  }

  /*
    Lista los intercambios de un participante
  */
  obtenerOfertasPorParticipante(usuarioSesion, { incluirOcultas = false } = {}) {
    if (!usuarioSesion) return [];
    const usuario = String(usuarioSesion).trim().toLowerCase();
    const ofertas = this._persistencia
      ? this._persistencia.obtenerTodos()
      : [...this._ofertasDB.values()].map(oferta => this._serializar(oferta));
    return ofertas.filter(oferta => {
      const esParticipante =
        String(oferta.usuarioEmisor || '').toLowerCase() === usuario ||
        String(oferta.usuarioReceptor || '').toLowerCase() === usuario;
      const ocultoPara = Array.isArray(oferta.ocultoPara) ? oferta.ocultoPara : [];
      const estaOculta = ocultoPara.some(
        participante => String(participante).toLowerCase() === usuario
      );
      return esParticipante && (incluirOcultas || !estaOculta);
    });
  }

  /*
    Alias para compatibilidad: busca intercambios de un usuario
  */
  obtenerOfertasUsuario(usuario) {
    return this.obtenerOfertasPorParticipante(usuario);
  }

  /*
    Lista todas las ofertas
  */
  obtenerTodasLasOfertas() {
    return this._persistencia ? this._persistencia.obtenerTodos() : Array.from(this._ofertasDB.values()).map(o => this._serializar(o));
  }

  /*
    Confirma una oferta de intercambio
  */
  confirmarOferta(idIntercambio, usuarioSesion) {
    if (!usuarioSesion) {
      throw new Error('Debe iniciar sesión para confirmar el intercambio.');
    }
    const registro = this._buscar(idIntercambio);
    if (!registro) {
      throw new Error(`La oferta con ID ${idIntercambio} no fue encontrada.`);
    }
    if (!this._esParticipante(registro, usuarioSesion)) {
      throw new Error('No tiene permisos para confirmar este intercambio.');
    }
    if (registro.estado === 'Cancelada') {
      throw new Error('No se puede confirmar un intercambio cancelado.');
    }

    const oferta = (registro instanceof OfertaIntercambio) ? registro : this._hidratar(registro);

    if (oferta.estado !== 'Finalizado') {
      if (oferta.librosOfrecidos.length === 0 || oferta.librosSolicitados.length === 0) {
        throw new Error('Ambos usuarios deben tener libros definidos antes de confirmar.');
      }
      const confirmaciones = new Set(oferta.confirmaciones || []);
      confirmaciones.add(usuarioSesion);
      oferta._confirmaciones = [...confirmaciones];
      const participantes = [oferta.usuarioEmisor.toLowerCase(), oferta.usuarioReceptor.toLowerCase()];
      const confirmaronTodos = participantes.every(usuario =>
        oferta.confirmaciones.some(confirmante => String(confirmante).toLowerCase() === usuario)
      );
      if (confirmaronTodos) {
        this._libroController?.transferirLibros(oferta);
        oferta.estado = 'Finalizado';
      } else {
        oferta.estado = 'Pendiente';
      }
      oferta._fechaModificacion = new Date().toISOString();
    }
    return this._guardar(oferta);
  }

  /*
    Cancela una oferta activa y libera los libros
  */
  cancelarOferta(idIntercambio, usuarioSesion) {
    if (!usuarioSesion) {
      throw new Error('Debe iniciar sesión para cancelar el intercambio.');
    }
    const registro = this._buscar(idIntercambio);
    if (!registro) {
      throw new Error(`La oferta con ID ${idIntercambio} no fue encontrada.`);
    }
    if (!this._esParticipante(registro, usuarioSesion)) {
      throw new Error('No tiene permisos para cancelar este intercambio.');
    }
    if (registro.estado === 'Finalizado') {
      throw new Error('No se puede cancelar un intercambio finalizado.');
    }

    const oferta = (registro instanceof OfertaIntercambio) ? registro : this._hidratar(registro);
    oferta.estado = 'Cancelada';
    oferta._confirmaciones = [];
    oferta._fechaModificacion = new Date().toISOString();

    const guardada = this._guardar(oferta);

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

  /*
    Elimina o quita de la lista un intercambio cerrado
  */
  eliminarOfertaDeLista(idIntercambio, usuarioSesion) {
    if (!usuarioSesion) {
      throw new Error('Debe iniciar sesión para eliminar un intercambio.');
    }
    const registro = this._buscar(idIntercambio);
    if (!registro) {
      throw new Error(`La oferta con ID ${idIntercambio} no fue encontrada.`);
    }
    if (!this._esParticipante(registro, usuarioSesion)) {
      throw new Error('No tiene permisos para eliminar esta oferta de intercambio.');
    }
    if (registro.estado === 'Finalizado') {
      const usuario = String(usuarioSesion).trim();
      const oferta = (registro instanceof OfertaIntercambio) ? registro : this._hidratar(registro);
      const ocultoPara = Array.isArray(oferta.ocultoPara) ? oferta.ocultoPara : [];
      if (!ocultoPara.some(participante =>
        String(participante).toLowerCase() === usuario.toLowerCase()
      )) {
        oferta._ocultoPara = [...ocultoPara, usuario];
        this._guardar(oferta);
      }
      return { idIntercambio: oferta.idIntercambio, oculto: true };
    }
    if (registro.estado !== 'Cancelada') {
      throw new Error('Solo se pueden quitar de la lista intercambios finalizados o cancelados.');
    }

    const eliminada = this._persistencia
      ? this._persistencia.eliminar(registro.idIntercambio || registro.id)
      : this._ofertasDB.delete(registro.idIntercambio || registro.id);
    if (!eliminada) {
      throw new Error(`No se pudo eliminar la oferta con ID ${idIntercambio}.`);
    }
    return { idIntercambio: registro.idIntercambio || registro.id, oculto: false };
  }

  _buscar(idIntercambio) {
    if (!idIntercambio) return null;
    const idBuscado = String(idIntercambio).trim();
    if (!this._persistencia) {
      const oferta = this._ofertasDB.get(idBuscado);
      if (oferta) return oferta;
      for (const o of this._ofertasDB.values()) {
        if (String(o.idIntercambio || o.id) === idBuscado) {
          return o;
        }
      }
      return null;
    }
    return (typeof this._persistencia.buscarPorId === 'function'
      ? this._persistencia.buscarPorId(idBuscado)
      : null) ||
      this._persistencia.buscarPorPredicado(oferta =>
        String(oferta.idIntercambio || oferta.id) === idBuscado
      )[0] || null;
  }

  _guardar(oferta) {
    const serializada = this._serializar(oferta);
    if (this._persistencia) {
      return this._persistencia.guardar({ ...serializada, id: serializada.idIntercambio });
    }
    const instancia = oferta instanceof OfertaIntercambio ? oferta : this._hidratar(oferta);
    this._ofertasDB.set(instancia.idIntercambio, instancia);
    return instancia.toJSON();
  }

  _serializar(oferta) {
    return (oferta && typeof oferta.toJSON === 'function') ? oferta.toJSON() : { ...oferta };
  }

  _hidratar(oferta) {
    return new OfertaIntercambio(oferta);
  }

  _esParticipante(oferta, usuarioSesion) {
    const usuario = String(usuarioSesion).trim().toLowerCase();
    return [oferta.usuarioEmisor, oferta.usuarioReceptor]
      .some(participante => String(participante || '').toLowerCase() === usuario);
  }
}

// Para compatibilidad
const controladorInstancia = new ControladorIntercambio();

module.exports = ControladorIntercambio;
module.exports.controladorInstancia = controladorInstancia;

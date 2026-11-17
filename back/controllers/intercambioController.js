/*
  Archivo: intercambioController.js (BACKEND: back/controllers/)
  Clase: ControladorIntercambio
  Función: Controlador orientado a objetos que orquesta la creación, modificación y
           seguimiento de ofertas de intercambio entre lectores de Swop-For-All.
           Sigue la teoría de Diseño 3 (arquitectura en capas C4 - Simon Brown).
*/

const OfertaIntercambio = require('../models/intercambioModel');
const CifradoService = require('../Service/CifradoService');

class ControladorIntercambio {
  constructor(baseDeDatos = new Map(), cifradoService = new CifradoService(), libroController = null) {
    this._persistencia = baseDeDatos && typeof baseDeDatos.guardar === 'function'
      ? baseDeDatos
      : null;
    this._ofertasDB = baseDeDatos instanceof Map ? baseDeDatos : new Map();
    // Servicio de cifrado para protección de transacciones
    this._cifradoService = cifradoService;
    this._libroController = libroController;
  }

  // Getters
  get totalOfertas() {
    return this._persistencia ? this._persistencia.total() : this._ofertasDB.size;
  }

  /*
    HU: Enviar oferta de intercambio desde el catálogo
    Precondición: Usuario autenticado y libro seleccionado.
  */
  crearOferta({ idIntercambio, usuarioReceptor, librosOfrecidos = [], librosSolicitados = [] }, usuarioSesion) {
    if (!usuarioSesion) {
      throw new Error('Debe iniciar sesión para crear una oferta de intercambio.');
    }

    const nuevaOferta = new OfertaIntercambio({
      idIntercambio,
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

    return this._guardar(nuevaOferta);
  }

  /*
    HU: Modificar oferta de intercambio
  */
  modificarOferta(idIntercambio, { librosOfrecidos, librosSolicitados }, usuarioSesion) {
    if (!usuarioSesion) {
      throw new Error('Debe estar autenticado para modificar una oferta.');
    }

    const ofertaEncontrada = this._buscar(idIntercambio);
    if (!ofertaEncontrada) {
      throw new Error(`La oferta con ID ${idIntercambio} no fue encontrada.`);
    }
    const ofertaExistente = this._serializar(ofertaEncontrada);

    // Regla de seguridad: solo los involucrados pueden modificarla
    if (!this._esParticipante(ofertaExistente, usuarioSesion)) {
      throw new Error('No tiene permisos para modificar esta oferta de intercambio.');
    }
    if (ofertaExistente.estado === 'Finalizado' || ofertaExistente.estado === 'Cancelada') {
      throw new Error('No se puede modificar un intercambio cerrado.');
    }

    if (Array.isArray(librosOfrecidos)) {
      ofertaExistente.librosOfrecidos = [...librosOfrecidos];
    }
    if (Array.isArray(librosSolicitados)) {
      ofertaExistente.librosSolicitados = [...librosSolicitados];
    }
    if (ofertaExistente.librosSolicitados.length === 0) {
      throw new Error('Debe solicitar al menos un libro para mantener el intercambio.');
    }
    ofertaExistente.confirmaciones = [];
    ofertaExistente.estado = 'Modificada';
    ofertaExistente.fechaModificacion = new Date().toISOString();

    return this._guardar(ofertaExistente);
  }

  /*
    Consulta una oferta por su ID único
  */
  obtenerOfertaPorId(idIntercambio) {
    const oferta = this._buscar(idIntercambio);
    return oferta ? this._serializar(oferta) : null;
  }

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

  confirmarOferta(idIntercambio, usuarioSesion) {
    if (!usuarioSesion) {
      throw new Error('Debe iniciar sesión para confirmar el intercambio.');
    }
    const oferta = this._buscar(idIntercambio);
    if (!oferta) {
      throw new Error(`La oferta con ID ${idIntercambio} no fue encontrada.`);
    }
    if (!this._esParticipante(oferta, usuarioSesion)) {
      throw new Error('No tiene permisos para confirmar este intercambio.');
    }
    if (oferta.estado === 'Cancelada') {
      throw new Error('No se puede confirmar un intercambio cancelado.');
    }
    if (oferta.estado !== 'Finalizado') {
      if (oferta.librosOfrecidos.length === 0 || oferta.librosSolicitados.length === 0) {
        throw new Error('Ambos usuarios deben tener libros definidos antes de confirmar.');
      }
      const confirmaciones = new Set(oferta.confirmaciones || []);
      confirmaciones.add(usuarioSesion);
      oferta.confirmaciones = [...confirmaciones];
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
      oferta.fechaModificacion = new Date().toISOString();
    }
    return this._guardar(oferta);
  }

  cancelarOferta(idIntercambio, usuarioSesion) {
    if (!usuarioSesion) {
      throw new Error('Debe iniciar sesión para cancelar el intercambio.');
    }
    const oferta = this._buscar(idIntercambio);
    if (!oferta) {
      throw new Error(`La oferta con ID ${idIntercambio} no fue encontrada.`);
    }
    if (!this._esParticipante(oferta, usuarioSesion)) {
      throw new Error('No tiene permisos para cancelar este intercambio.');
    }
    if (oferta.estado === 'Finalizado') {
      throw new Error('No se puede cancelar un intercambio finalizado.');
    }
    oferta.estado = 'Cancelada';
    oferta.confirmaciones = [];
    oferta.fechaModificacion = new Date().toISOString();
    return this._guardar(oferta);
  }

  eliminarOfertaDeLista(idIntercambio, usuarioSesion) {
    if (!usuarioSesion) {
      throw new Error('Debe iniciar sesión para eliminar un intercambio.');
    }
    const oferta = this._buscar(idIntercambio);
    if (!oferta) {
      throw new Error(`La oferta con ID ${idIntercambio} no fue encontrada.`);
    }
    if (!this._esParticipante(oferta, usuarioSesion)) {
      throw new Error('No tiene permisos para eliminar esta oferta de intercambio.');
    }
    if (oferta.estado === 'Finalizado') {
      const usuario = String(usuarioSesion).trim();
      const ocultoPara = Array.isArray(oferta.ocultoPara) ? oferta.ocultoPara : [];
      if (!ocultoPara.some(participante =>
        String(participante).toLowerCase() === usuario.toLowerCase()
      )) {
        oferta.ocultoPara = [...ocultoPara, usuario];
        this._guardar(oferta);
      }
      return { idIntercambio: oferta.idIntercambio, oculto: true };
    }
    if (oferta.estado !== 'Cancelada') {
      throw new Error('Solo se pueden quitar de la lista intercambios finalizados o cancelados.');
    }

    const eliminada = this._persistencia
      ? this._persistencia.eliminar(oferta.idIntercambio)
      : this._ofertasDB.delete(oferta.idIntercambio);
    if (!eliminada) {
      throw new Error(`No se pudo eliminar la oferta con ID ${idIntercambio}.`);
    }
    return { idIntercambio: oferta.idIntercambio, oculto: false };
  }

  _buscar(idIntercambio) {
    if (!this._persistencia) {
      const oferta = this._ofertasDB.get(idIntercambio);
      return oferta ? this._serializar(oferta) : null;
    }
    return this._persistencia.buscarPorPredicado(oferta =>
      String(oferta.idIntercambio || oferta.id) === String(idIntercambio)
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
    return oferta instanceof OfertaIntercambio ? oferta.toJSON() : { ...oferta };
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

// Para compatibilidad con frameworks Express / endpoints existentes
const controladorInstancia = new ControladorIntercambio();

// Exporta tanto la Clase (para arquitectura POO) como el adaptador Express si se requiere
module.exports = ControladorIntercambio;
module.exports.controladorInstancia = controladorInstancia;
module.exports.modificarOferta = (req, res) => {
  try {
    const { idIntercambio, librosOfrecidos, librosSolicitados, usuarioSesion = 'UsuarioA' } = req.body;
    const resultado = controladorInstancia.modificarOferta(idIntercambio, { librosOfrecidos, librosSolicitados }, usuarioSesion);
    res.status(200).json({ message: 'Oferta modificada con éxito', oferta: resultado });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

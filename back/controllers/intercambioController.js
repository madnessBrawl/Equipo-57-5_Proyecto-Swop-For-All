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
  constructor(baseDeDatos = new Map(), cifradoService = new CifradoService()) {
    // Almacén en memoria de ofertas
    this._ofertasDB = baseDeDatos;
    // Servicio de cifrado para protección de transacciones
    this._cifradoService = cifradoService;
  }

  // Getters
  get totalOfertas() {
    return this._ofertasDB.size;
  }

  /*
    HU: Enviar oferta de intercambio desde el catálogo
    Precondición: Usuario autenticado y libro seleccionado.
  */
  crearOferta({ usuarioReceptor, librosOfrecidos = [], librosSolicitados = [] }, usuarioSesion) {
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

    this._ofertasDB.set(nuevaOferta.idIntercambio, nuevaOferta);
    return nuevaOferta.toJSON();
  }

  /*
    HU: Modificar oferta de intercambio
  */
  modificarOferta(idIntercambio, { librosOfrecidos, librosSolicitados }, usuarioSesion) {
    if (!usuarioSesion) {
      throw new Error('Debe estar autenticado para modificar una oferta.');
    }

    const ofertaExistente = this._ofertasDB.get(idIntercambio);
    if (!ofertaExistente) {
      throw new Error(`La oferta con ID ${idIntercambio} no fue encontrada.`);
    }

    // Regla de seguridad: solo los involucrados pueden modificarla
    if (ofertaExistente.usuarioEmisor !== usuarioSesion && ofertaExistente.usuarioReceptor !== usuarioSesion) {
      throw new Error('No tiene permisos para modificar esta oferta de intercambio.');
    }

    if (Array.isArray(librosOfrecidos)) {
      ofertaExistente._librosOfrecidos = [...librosOfrecidos];
    }
    if (Array.isArray(librosSolicitados)) {
      ofertaExistente._librosSolicitados = [...librosSolicitados];
    }
    ofertaExistente.estado = 'Modificada';

    this._ofertasDB.set(idIntercambio, ofertaExistente);
    return ofertaExistente.toJSON();
  }

  /*
    Consulta una oferta por su ID único
  */
  obtenerOfertaPorId(idIntercambio) {
    const oferta = this._ofertasDB.get(idIntercambio);
    return oferta ? oferta.toJSON() : null;
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

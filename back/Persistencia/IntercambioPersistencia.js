/*
  Archivo: IntercambioPersistencia.js (BACKEND: back/Persistencia/)
  Clase: IntercambioPersistencia
  Función: Gestiona la persistencia física de intercambios y ofertas en back/Persistencia/intercambios.json.
           Implementa operaciones atómicas de lectura, escritura y búsqueda.
*/

const PersistenciaJSON = require('./PersistenciaJSON');
const OfertaIntercambio = require('../models/intercambioModel');

class IntercambioPersistencia extends PersistenciaJSON {
  constructor(nombreArchivo = 'intercambios.json') {
    const semilla = [
      {
        id: 'INT-2026-01',
        idIntercambio: 'INT-2026-01',
        usuarioEmisor: 'carlos_lector',
        usuarioReceptor: 'maria_books',
        librosOfrecidos: [
          { id: 'lib_100', titulo: 'El Principito', autor: 'Antoine de Saint-Exupéry', disponible: true }
        ],
        librosSolicitados: [
          { id: 'lib_101', titulo: '1984', autor: 'George Orwell', disponible: true }
        ],
        estado: 'Finalizado',
        mensajes: [
          {
            id: 'msg_ini_01',
            remitente: 'carlos_lector',
            texto: 'Hola María, me interesa intercambiar El Principito por tu ejemplar de 1984.',
            hora: '10:30 AM',
            fecha: '2026-11-10T10:30:00.000Z'
          }
        ],
        fechaCreacion: '2026-11-10T10:00:00.000Z',
        fechaModificacion: '2026-11-10T12:00:00.000Z'
      }
    ];

    super(nombreArchivo, semilla);
  }

  // Busca un intercambio por su identificador único (id o idIntercambio)
  buscarPorId(idIntercambio) {
    if (!idIntercambio) return null;
    const buscado = String(idIntercambio).trim();
    const todos = this._leerArchivo();
    return todos.find(i => String(i.id) === buscado || String(i.idIntercambio) === buscado) || null;
  }

  // Busca todos los intercambios en los que participa un usuario (como emisor o receptor)
  buscarPorParticipante(usuario) {
    if (!usuario) return [];
    const u = String(usuario).trim().toLowerCase();
    return this.buscarPorPredicado(i =>
      (i.usuarioEmisor && i.usuarioEmisor.toLowerCase() === u) ||
      (i.usuarioReceptor && i.usuarioReceptor.toLowerCase() === u) ||
      (i.ofertante && i.ofertante.toLowerCase() === u) ||
      (i.receptor && i.receptor.toLowerCase() === u)
    );
  }

  // Restricción 3.4 del Brief: Obtiene el intercambio activo si el libro ya está comprometido
  buscarIntercambioActivoPorLibro(idLibro) {
    if (!idLibro) return null;
    const idStr = String(idLibro).trim();
    const estadosActivos = ['Pendiente', 'Modificada', 'Aceptada'];
    const intercambiosActivos = this.buscarPorPredicado(i => estadosActivos.includes(i.estado));

    return intercambiosActivos.find(intercambio => {
      const enOfrecidos = Array.isArray(intercambio.librosOfrecidos) &&
        intercambio.librosOfrecidos.some(l => String(typeof l === 'object' ? l.id : l) === idStr);
      const enSolicitados = Array.isArray(intercambio.librosSolicitados) &&
        intercambio.librosSolicitados.some(l => String(typeof l === 'object' ? l.id : l) === idStr);
      return enOfrecidos || enSolicitados;
    }) || null;
  }

  // Restricción 3.4 del Brief: Verifica si un libro ya está comprometido en un intercambio activo
  verificarLibroEnIntercambioActivo(idLibro) {
    return Boolean(this.buscarIntercambioActivoPorLibro(idLibro));
  }

  /*
    Restricción librosOfrecidos: Verifica si un usuario ya está ofreciendo un libro concreto
    en otro intercambio activo distinto al que se está editando.
    Parámetros:
      - idLibro       : ID del libro a verificar
      - usuarioEmisor : Usuario que ofrece el libro (solo se chequea para ese usuario)
      - idExcluir     : ID del intercambio actual que se está editando (para no bloquearse a sí mismo)
  */
  buscarIntercambioActivoPorLibroOfrecido(idLibro, usuarioEmisor, idExcluir = null) {
    if (!idLibro || !usuarioEmisor) return null;
    const idStr  = String(idLibro).trim();
    const uStr   = String(usuarioEmisor).trim().toLowerCase();
    const excStr = idExcluir ? String(idExcluir).trim() : null;
    const estadosActivos = ['Pendiente', 'Modificada', 'Aceptada'];

    return this.buscarPorPredicado(i => {
      // Excluir el propio intercambio que se está modificando
      const esMismo = excStr && (String(i.id) === excStr || String(i.idIntercambio) === excStr);
      if (esMismo) return false;
      // Solo intercambios activos del mismo emisor
      if (!estadosActivos.includes(i.estado)) return false;
      if (!i.usuarioEmisor || String(i.usuarioEmisor).trim().toLowerCase() !== uStr) return false;
      // Verificar si el libro aparece en librosOfrecidos
      return Array.isArray(i.librosOfrecidos) &&
        i.librosOfrecidos.some(l => String(typeof l === 'object' ? l.id : l) === idStr);
    })[0] || null;
  }

  // Agrega un mensaje al chat de un intercambio existente
  agregarMensaje(idIntercambio, { remitente, texto }) {
    const raw = this.buscarPorId(idIntercambio);
    if (!raw) {
      throw new Error(`El intercambio con ID ${idIntercambio} no existe.`);
    }

    const oferta = new OfertaIntercambio(raw);
    const mensajeNuevo = oferta.agregarMensaje({ remitente, texto });
    this.guardar(oferta);
    return mensajeNuevo;
  }
}

module.exports = IntercambioPersistencia;

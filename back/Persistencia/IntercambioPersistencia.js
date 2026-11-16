/*
  Archivo: IntercambioPersistencia.js (BACKEND: back/Persistencia/)
  Clase: IntercambioPersistencia
  Función: Gestiona la persistencia de intercambios y ofertas en back/Persistencia/intercambios.json.
*/

const PersistenciaJSON = require('./PersistenciaJSON');

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
        fechaModificacion: '2026-11-10T12:00:00.000Z'
      }
    ];

    super(nombreArchivo, semilla);
  }

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
}

module.exports = IntercambioPersistencia;

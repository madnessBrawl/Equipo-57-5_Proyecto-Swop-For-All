/*
  Archivo: CalificacionPersistencia.js (BACKEND: back/Persistencia/)
  Clase: CalificacionPersistencia
  Función: Gestiona la persistencia de calificaciones y reseñas en back/Persistencia/calificaciones.json.
*/

const PersistenciaJSON = require('./PersistenciaJSON');

class CalificacionPersistencia extends PersistenciaJSON {
  constructor(nombreArchivo = 'calificaciones.json') {
    const semilla = [
      {
        id: 'calif_demo_1',
        idIntercambio: 'INT-2026-01',
        tipo: 'lector',
        evaluador: 'carlos_lector',
        evaluado: 'maria_books',
        puntuacion: 5,
        comentario: {
          texto: 'Excelente lectora, el libro llegó en perfecto estado y muy puntual.',
          fecha: '2026-11-10T14:30:00.000Z'
        }
      }
    ];

    super(nombreArchivo, semilla);
  }

  buscarPorEvaluado(usuario) {
    if (!usuario) return [];
    const u = String(usuario).trim().toLowerCase();
    return this.buscarPorPredicado(c => c.evaluado && c.evaluado.toLowerCase() === u);
  }

  buscarPorEvaluador(usuario) {
    if (!usuario) return [];
    const u = String(usuario).trim().toLowerCase();
    return this.buscarPorPredicado(c => c.evaluador && c.evaluador.toLowerCase() === u);
  }
}

module.exports = CalificacionPersistencia;

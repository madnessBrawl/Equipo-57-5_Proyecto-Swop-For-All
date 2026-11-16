/*
  Archivo: ComunidadPersistencia.js (BACKEND: back/Persistencia/)
  Clase: ComunidadPersistencia
  Función: Gestiona la persistencia de comunidades literarias en back/Persistencia/comunidades.json.
*/

const PersistenciaJSON = require('./PersistenciaJSON');

class ComunidadPersistencia extends PersistenciaJSON {
  constructor(nombreArchivo = 'comunidades.json') {
    const semilla = [
      {
        id: 'com_1',
        nombre: 'Lectores de Novela Histórica',
        descripcion: 'Comunidad dedicada al intercambio y debate de obras de ficción y no ficción histórica.',
        tematica: 'Novela Histórica',
        creador: 'carlos_lector',
        administradores: ['carlos_lector'],
        miembros: ['carlos_lector', 'maria_books'],
        fechaCreacion: '2026-11-08T10:00:00.000Z'
      },
      {
        id: 'com_2',
        nombre: 'Club de Realismo Mágico',
        descripcion: 'Obras de Gabriel García Márquez, Isabel Allende, Juan Rulfo y autores afines.',
        tematica: 'Realismo Mágico',
        creador: 'maria_books',
        administradores: ['maria_books'],
        miembros: ['maria_books', 'ana_lectora'],
        fechaCreacion: '2026-11-09T15:00:00.000Z'
      }
    ];

    super(nombreArchivo, semilla);
  }

  buscarPorNombre(nombre) {
    if (!nombre) return null;
    const n = String(nombre).trim().toLowerCase();
    const todas = this.obtenerTodos();
    return todas.find(c => c.nombre && c.nombre.toLowerCase() === n) || null;
  }
}

module.exports = ComunidadPersistencia;

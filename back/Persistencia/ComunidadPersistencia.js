/*
  Archivo: ComunidadPersistencia.js (BACKEND: back/Persistencia/)
  Clase: ComunidadPersistencia
  Función: Gestiona la persistencia física de comunidades en back/Persistencia/comunidades.json
           incluyendo membresías, límite de 20 miembros, roles y chat general.
*/

const PersistenciaJSON = require('./PersistenciaJSON');

class ComunidadPersistencia extends PersistenciaJSON {
  constructor(nombreArchivo = 'comunidades.json') {
    const semilla = [
      {
        id: 'com_1',
        nombre: 'Lectores de Novela Histórica',
        descripcion: 'Comunidad dedicada al intercambio y debate de obras de ficción y no ficción histórica.',
        genero: 'Aventura',
        tipo: 'publico',
        creador: 'carlos_lector',
        administradores: ['carlos_lector'],
        miembros: ['carlos_lector', 'maria_books'],
        maxMiembros: 20,
        fechaCreacion: '2026-11-08T10:00:00.000Z',
        mensajes: [
          { emisor: 'carlos_lector', texto: '¡Bienvenidos al club de novela histórica!', fecha: '2026-11-08T10:05:00.000Z' }
        ]
      },
      {
        id: 'com_2',
        nombre: 'Club de Realismo Mágico',
        descripcion: 'Obras de Gabriel García Márquez, Isabel Allende, Juan Rulfo y autores afines.',
        genero: 'Fantasía',
        tipo: 'privado',
        creador: 'maria_books',
        administradores: ['maria_books'],
        miembros: ['maria_books', 'ana_lectora'],
        maxMiembros: 20,
        fechaCreacion: '2026-11-09T15:00:00.000Z',
        mensajes: [
          { emisor: 'maria_books', texto: 'Iniciamos debate sobre Cien Años de Soledad esta semana.', fecha: '2026-11-09T15:10:00.000Z' }
        ]
      },
      {
        id: 'com_3',
        nombre: 'Tertulia de Misterio y Suspenso',
        descripcion: 'Para apasionados del thriller psicológico, novela negra y detectivesca.',
        genero: 'Misterio',
        tipo: 'publico',
        creador: 'ana_lectora',
        administradores: ['ana_lectora'],
        miembros: ['ana_lectora', 'carlos_lector'],
        maxMiembros: 20,
        fechaCreacion: '2026-11-10T09:00:00.000Z',
        mensajes: []
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

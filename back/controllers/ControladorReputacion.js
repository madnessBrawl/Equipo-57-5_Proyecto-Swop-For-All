/*
  Archivo: ControladorReputacion.js   (BACKEND: back/controllers/)
  Clase: ControladorReputacion
  Función: Recibe los datos desde el Frontend (Angular), aplica las reglas de negocio de la
           Gestión de Reputación y gestiona la Base de Datos.
*/
const { Calificacion } = require('../models/Calificacion');

class ControladorReputacion {
  constructor(baseDeDatos) {
    this.bd = baseDeDatos; // Inyección de dependencia de la DB
  }

  /* ---------- HU: Calificar lector o intercambio ---------- */
  // datos: { idIntercambio, tipo, evaluado, puntuacion, comentario }
  // usuarioSesion: usuario autenticado (lo entrega la sesión, NO el cuerpo de la petición)
  calificar(datos, usuarioSesion) {
    // Confidencialidad: nadie puede calificar suplantando a otro usuario
    if (!usuarioSesion) throw new Error('Debe iniciar sesión para calificar.');
    if (datos.evaluador && datos.evaluador !== usuarioSesion) {
      throw new Error('No puede calificar en nombre de otro usuario.');
    }

    // 1. Se instancia el objeto y se valida ANTES de tocar la BD
    const calificacion = new Calificacion({
      id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
      idIntercambio: datos.idIntercambio,
      tipo: datos.tipo,
      evaluador: usuarioSesion,
      evaluado: datos.evaluado,
      puntuacion: datos.puntuacion,
      comentario: datos.comentario
    });
    const error = calificacion.validar();
    if (error) throw new Error(error);

    // 2. Reglas de negocio contra los repositorios reales
    const intercambio = this.bd.buscar('Intercambios', i => i.id === calificacion.idIntercambio)[0];
    if (!intercambio) throw new Error('El intercambio seleccionado no existe.');
    if (intercambio.estado !== 'Finalizado') throw new Error('Solo puede calificar intercambios finalizados.');

    const participantes = [intercambio.ofertante, intercambio.receptor];
    if (!participantes.includes(usuarioSesion)) throw new Error('Usted no participó en este intercambio.');
    const contraparte = participantes.find(p => p !== usuarioSesion);
    if (contraparte !== calificacion.evaluado) {
      throw new Error('El lector evaluado no corresponde a este intercambio.');
    }

    // 3. Unicidad: una sola calificación por (evaluador + intercambio + tipo)
    const duplicada = this.bd.buscar('Calificaciones', c =>
      c.evaluador === usuarioSesion &&
      c.idIntercambio === calificacion.idIntercambio &&
      c.tipo === calificacion.tipo
    ).length > 0;
    if (duplicada) throw new Error('Usted ya calificó este intercambio. No es posible calificarlo de nuevo.');

    // 4. Guardado ÚNICO
    return this.bd.guardar('Calificaciones', calificacion);
  }

  /* ---------- HU: Consultar reseñas ---------- */
  // filtro: 'todas' | 'lector' | 'intercambio'
  // usuarioSesion: usuario autenticado; solo puede consultar SUS propias reseñas recibidas
  consultarResenas(lector, filtro = 'todas', usuarioSesion) {
    if (!usuarioSesion) throw new Error('Debe iniciar sesión para consultar reseñas.');
    if (usuarioSesion !== lector) throw new Error('Solo puede consultar las reseñas que usted ha recibido.');
    const resenas = this.bd
      .buscar('Calificaciones', c => c.evaluado === lector && (filtro === 'todas' || c.tipo === filtro))
      .sort((a, b) => b.comentario.fecha.localeCompare(a.comentario.fecha))
      // Solo se exponen los campos públicos de la reseña
      .map(c => ({
        id: c.id, tipo: c.tipo, evaluador: c.evaluador, evaluado: c.evaluado,
        puntuacion: c.puntuacion, comentario: c.comentario
      }));
    return { lector, promedio: this.calcularPromedio(lector), total: resenas.length, resenas };
  }

  // Reseñas ENVIADAS por un usuario (las que él calificó), más recientes primero
  consultarResenasEnviadas(evaluador, filtro = 'todas', usuarioSesion) {
    if (!usuarioSesion) throw new Error('Debe iniciar sesión para consultar reseñas.');
    if (usuarioSesion !== evaluador) throw new Error('Solo puede consultar las reseñas que usted ha enviado.');
    const resenas = this.bd
      .buscar('Calificaciones', c => c.evaluador === evaluador && (filtro === 'todas' || c.tipo === filtro))
      .sort((a, b) => b.comentario.fecha.localeCompare(a.comentario.fecha))
      .map(c => ({
        id: c.id, tipo: c.tipo, evaluador: c.evaluador, evaluado: c.evaluado,
        puntuacion: c.puntuacion, comentario: c.comentario
      }));
    return { evaluador, total: resenas.length, resenas };
  }

  // Promedio de reputación como lector (1 decimal); null si aún no tiene calificaciones
  calcularPromedio(lector) {
    const notas = this.bd.buscar('Calificaciones', c => c.evaluado === lector && c.tipo === 'lector')
      .map(c => c.puntuacion);
    if (notas.length === 0) return null;
    return Math.round((notas.reduce((a, n) => a + n, 0) / notas.length) * 10) / 10;
  }
}

module.exports = ControladorReputacion;

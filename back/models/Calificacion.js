/*
  Archivo: Calificacion.js   (BACKEND: back/models/)
  Clases: Comentario y Calificacion
  Función: Objetos de dominio de la Gestión de Reputación en el servidor.
           Son el espejo de front/src/app/reputacion/modelo-reputacion.ts, para que las
           reglas se validen TAMBIÉN en el Backend (el Frontend nunca es de fiar).
*/

/* ---------- Objeto Comentario (corrección de la profesora: faltaba este objeto) ---------- */
class Comentario {
  static LONGITUD_MAXIMA = 300; // Límite de caracteres permitido

  constructor(texto = '', fecha = new Date().toISOString()) {
    this.texto = String(texto ?? '').trim(); // Texto limpio de espacios sobrantes
    this.fecha = fecha;                      // Fecha y hora de redacción
  }

  // Verifica el límite de longitud
  esValido() {
    return this.texto.length <= Comentario.LONGITUD_MAXIMA;
  }
}

/* ---------- Objeto Calificacion (puntuación + comentario en un solo objeto) ---------- */
class Calificacion {
  static PUNTUACION_MINIMA = 1; // Mínimo de estrellas
  static PUNTUACION_MAXIMA = 5; // Máximo de estrellas
  static TIPOS = ['lector', 'intercambio']; // Tipos permitidos

  constructor({ id, idIntercambio, tipo, evaluador, evaluado, puntuacion, comentario }) {
    this.id = id;                         // Identificador único
    this.idIntercambio = idIntercambio;   // Intercambio asociado
    this.tipo = tipo;                     // 'lector' o 'intercambio'
    this.evaluador = evaluador;           // Usuario que califica
    this.evaluado = evaluado;             // Lector calificado
    this.puntuacion = puntuacion;         // Estrellas (1 a 5)
    // Se acepta un texto o un objeto { texto, fecha } y siempre se guarda como Comentario
    this.comentario = comentario instanceof Comentario
      ? comentario
      : new Comentario(comentario?.texto ?? comentario ?? '', comentario?.fecha);
  }

  // Devuelve el mensaje del primer error, o null si todo es válido
  validar() {
    if (!this.evaluador) return 'Debe iniciar sesión para calificar.';
    if (!this.idIntercambio) return 'Seleccione el intercambio que desea calificar.';
    if (!this.evaluado) return 'No se pudo identificar al lector que será calificado.';
    if (!Calificacion.TIPOS.includes(this.tipo)) return 'El tipo de calificación no es válido.';
    if (this.evaluador === this.evaluado) return 'No puede calificarse a sí mismo.';
    if (!Number.isInteger(this.puntuacion) ||
        this.puntuacion < Calificacion.PUNTUACION_MINIMA ||
        this.puntuacion > Calificacion.PUNTUACION_MAXIMA) {
      return 'Seleccione una puntuación entre 1 y 5 estrellas.';
    }
    if (!this.comentario.esValido()) {
      return `El comentario no puede superar los ${Comentario.LONGITUD_MAXIMA} caracteres.`;
    }
    return null;
  }
}

module.exports = { Calificacion, Comentario };

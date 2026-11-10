/*
  Función: Define los OBJETOS de dominio de la Gestión de Reputación (POO).
  Contiene únicamente lógica de negocio pura (sin Angular, sin almacenamiento)
*/

/*1. TIPOS AUXILIARES*/
export type TipoCalificacion = 'lector' | 'intercambio'; // Qué se está calificando
export type FiltroResenas = 'todas' | TipoCalificacion;  // Filtro de la consulta de reseñas
export type EstadoIntercambio = 'Pendiente' | 'Finalizado' | 'Cancelado'; // Estados posibles

// Resultado simple de una operación: éxito o error + texto para el usuario
export interface ResultadoOperacion {
  exito: boolean;   // true si la operación se realizó
  mensaje: string;  // Texto que se le muestra al usuario
}

// Forma "plana" (JSON) de una calificación guardada 
export interface CalificacionPlana {
  id: string;
  idIntercambio: string;
  tipo: TipoCalificacion;
  evaluador: string;
  evaluado: string;
  puntuacion: number;
  comentario: { texto: string; fecha: string };
}

// Forma "plana" (JSON) de un intercambio guardado en el almacenamiento
export interface IntercambioPlano {
  id: string;
  libroOfrecido: string;
  libroSolicitado: string;
  ofertante: string;
  receptor: string;
  estado: EstadoIntercambio;
  fecha: string;
}

/* 2. OBJETO COMENTARIO*/
export class Comentario {
  static readonly LONGITUD_MAXIMA = 300; // Límite de caracteres permitido

  constructor(
    public texto: string = '',                         // Texto escrito por el evaluador (opcional)
    public fecha: string = new Date().toISOString()    // Fecha y hora en que se redactó
  ) {
    this.texto = (texto ?? '').trim(); // Se eliminan espacios sobrantes al crear el objeto
  }

  // Verifica que el comentario respete el límite de longitud
  public esValido(): boolean {
    return this.texto.length <= Comentario.LONGITUD_MAXIMA;
  }

  // Indica si el evaluador escribió algo
  public tieneTexto(): boolean {
    return this.texto.length > 0;
  }
}

/* 3. OBJETO CALIFICACION (puntuación + comentario)*/
export class Calificacion {
  static readonly PUNTUACION_MINIMA = 1; // Mínimo de estrellas
  static readonly PUNTUACION_MAXIMA = 5; // Máximo de estrellas

  constructor(
    public id: string,                   // Identificador único de la calificación
    public idIntercambio: string,        // Intercambio en el que se basa la calificación
    public tipo: TipoCalificacion,       // 'lector' o 'intercambio'
    public evaluador: string,            // Usuario que califica (el que tiene la sesión)
    public evaluado: string,             // Lector que recibe la calificación
    public puntuacion: number,           // Estrellas (1 a 5)
    public comentario: Comentario        // Objeto Comentario asociado
  ) {}

  // Valida TODOS los datos ANTES de guardar. Devuelve el primer error encontrado
  public validar(): ResultadoOperacion {
    if (!this.evaluador) {
      return { exito: false, mensaje: 'Debe iniciar sesión para calificar.' };
    }
    if (!this.idIntercambio) {
      return { exito: false, mensaje: 'Seleccione el intercambio que desea calificar.' };
    }
    if (!this.evaluado) {
      return { exito: false, mensaje: 'No se pudo identificar al lector que será calificado.' };
    }
    if (this.evaluador === this.evaluado) {
      return { exito: false, mensaje: 'No puede calificarse a sí mismo.' };
    }
    if (
      !Number.isInteger(this.puntuacion) ||
      this.puntuacion < Calificacion.PUNTUACION_MINIMA ||
      this.puntuacion > Calificacion.PUNTUACION_MAXIMA
    ) {
      return { exito: false, mensaje: 'Seleccione una puntuación entre 1 y 5 estrellas.' };
    }
    if (!this.comentario.esValido()) {
      return {
        exito: false,
        mensaje: `El comentario no puede superar los ${Comentario.LONGITUD_MAXIMA} caracteres.`
      };
    }
    return { exito: true, mensaje: '' };
  }

  // Clave de unicidad: un evaluador solo puede calificar UNA vez cada (intercambio + tipo)
  public clave(): string {
    return `${this.evaluador}|${this.idIntercambio}|${this.tipo}`;
  }

  // Reconstruye el objeto a partir del JSON guardado (rehidratación)
  static desdeJSON(plano: CalificacionPlana): Calificacion {
    return new Calificacion(
      plano.id,
      plano.idIntercambio,
      plano.tipo,
      plano.evaluador,
      plano.evaluado,
      plano.puntuacion,
      new Comentario(plano.comentario?.texto ?? '', plano.comentario?.fecha)
    );
  }
}

/* 4. OBJETO INTERCAMBIO (referencia mínima para calificar) */
export class Intercambio {
  constructor(
    public id: string,                  // Identificador del intercambio
    public libroOfrecido: string,       // Libro que ofreció el ofertante
    public libroSolicitado: string,     // Libro que pidió a cambio
    public ofertante: string,           // Usuario que envió la oferta
    public receptor: string,            // Usuario que recibió la oferta
    public estado: EstadoIntercambio,   // Estado actual
    public fecha: string                // Fecha del intercambio
  ) {}

  // Indica si el usuario fue parte del intercambio
  public participa(usuario: string): boolean {
    return usuario === this.ofertante || usuario === this.receptor;
  }

  // Devuelve a la otra persona del intercambio (la que sería calificada)
  public contraparteDe(usuario: string): string | null {
    if (usuario === this.ofertante) return this.receptor;
    if (usuario === this.receptor) return this.ofertante;
    return null; // El usuario no participó
  }

  // Solo se puede calificar cuando el intercambio ya terminó
  public estaFinalizado(): boolean {
    return this.estado === 'Finalizado';
  }

  // Reconstruye el objeto a partir del JSON guardado
  static desdeJSON(plano: IntercambioPlano): Intercambio {
    return new Intercambio(
      plano.id, plano.libroOfrecido, plano.libroSolicitado,
      plano.ofertante, plano.receptor, plano.estado, plano.fecha
    );
  }
}

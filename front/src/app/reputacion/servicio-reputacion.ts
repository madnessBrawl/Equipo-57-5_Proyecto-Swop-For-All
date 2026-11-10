/*
  Archivo: servicio-reputacion.ts   (FRONTEND: front/src/app/reputacion/)
  Clase: ServicioReputacion
  Función: ÚNICA clase que maneja la lógica y el almacenamiento de la Gestión de Reputación.
  Los componentes (pantallas) NO guardan ni calculan nada: le piden todo a este servicio.

  CAMINO DE PROCESO DE DATOS (quién maneja la lógica):
   [Calificar] Pantalla (CalificarReputacionComponent)
        -> ServicioReputacion.yaFueCalificado()      (advierte si ya calificó)
        -> Calificacion.validar()                     (objeto valida sus propios datos)
        -> ServicioReputacion.registrarCalificacion() (reglas de negocio + guardado ÚNICO)
        -> localStorage 'swop_calificaciones'         (simula el Backend/BD por ahora)
        -> ServicioReputacion.actualizarReputacionLector() (recalcula promedio del evaluado)
   [Consultar] Pantalla (ConsultarResenasComponent)
        -> ServicioReputacion.obtenerResenas() / calcularPromedio()
        -> localStorage 'swop_calificaciones'
   Cuando exista el Backend: este servicio pasa a llamar por HTTP a
   ControladorReputacion (back/controllers) y los componentes no cambian.
*/
import { Injectable } from '@angular/core';
import { Calificacion, Intercambio } from './modelo-reputacion'; // Clases (objetos de dominio)
import type {
  CalificacionPlana, FiltroResenas, IntercambioPlano, ResultadoOperacion
} from './modelo-reputacion'; // Solo tipos (no generan código)

@Injectable({ providedIn: 'root' })
export class ServicioReputacion {

  /* =========================================================
     1. CONSTANTES: claves del almacenamiento local simulado
     ========================================================= */
  private readonly CLAVE_CALIFICACIONES = 'swop_calificaciones'; // Calificaciones guardadas
  private readonly CLAVE_INTERCAMBIOS = 'swop_intercambios';     // Intercambios (módulo futuro)
  private readonly CLAVE_USUARIOS = 'swop_usuarios';             // Usuarios registrados (ya existente)
  private readonly CLAVE_SESION = 'usuarioLogueado';             // Sesión activa (ya existente)

  /* =========================================================
     2. SESIÓN: solo se expone el nombre de usuario (Confidencialidad)
     ========================================================= */
  public obtenerUsuarioActual(): string | null {
    try {
      const crudo = localStorage.getItem(this.CLAVE_SESION); // Lee la sesión guardada
      if (!crudo) return null;                               // No hay sesión
      const sesion = JSON.parse(crudo) as { usuario?: string };
      return sesion.usuario ?? null; // Se devuelve SOLO el usuario, nunca la clave
    } catch {
      return null; // Dato dañado: se trata como sin sesión
    }
  }

  /* =========================================================
     3. INTERCAMBIOS DISPONIBLES PARA CALIFICAR
     ========================================================= */
  // Devuelve los intercambios FINALIZADOS en los que participó el usuario
  public obtenerIntercambiosFinalizados(usuario: string): Intercambio[] {
    return this.leerLista<IntercambioPlano>(this.CLAVE_INTERCAMBIOS)
      .map(p => Intercambio.desdeJSON(p))
      .filter(i => i.estaFinalizado() && i.participa(usuario));
  }

  // TEMPORAL: crea 2 intercambios finalizados de prueba mientras no exista el módulo Intercambio
  public sembrarIntercambiosDemo(usuario: string): number {
    const existentes = this.leerLista<IntercambioPlano>(this.CLAVE_INTERCAMBIOS);
    const hoy = new Date().toISOString();
    const demo: IntercambioPlano[] = [
      { id: this.generarId(), libroOfrecido: 'Cien años de soledad', libroSolicitado: 'Doña Bárbara',
        ofertante: usuario, receptor: 'lector_ejemplo_1', estado: 'Finalizado', fecha: hoy },
      { id: this.generarId(), libroOfrecido: 'Pedro Páramo', libroSolicitado: 'La casa de los espíritus',
        ofertante: 'lector_ejemplo_2', receptor: usuario, estado: 'Finalizado', fecha: hoy }
    ];
    this.guardarLista(this.CLAVE_INTERCAMBIOS, [...existentes, ...demo]);
    return demo.length;
  }

  /* =========================================================
     4. CALIFICAR LECTOR O INTERCAMBIO
     ========================================================= */
  // Verifica si el evaluador ya calificó ese intercambio (para advertir ANTES de mostrar el formulario)
  public yaFueCalificado(evaluador: string, idIntercambio: string, tipo: 'lector' | 'intercambio'): boolean {
    const claveBuscada = `${evaluador}|${idIntercambio}|${tipo}`;
    return this.leerCalificaciones().some(c => c.clave() === claveBuscada);
  }

  // Valida las reglas de negocio y guarda la calificación UNA SOLA VEZ
  public registrarCalificacion(calificacion: Calificacion): ResultadoOperacion {
    // Paso 1: el propio objeto valida puntuación, comentario y datos básicos
    const validacion = calificacion.validar();
    if (!validacion.exito) return validacion;

    // Paso 2: el intercambio debe existir, estar finalizado y el evaluador haber participado
    const intercambio = this.leerLista<IntercambioPlano>(this.CLAVE_INTERCAMBIOS)
      .map(p => Intercambio.desdeJSON(p))
      .find(i => i.id === calificacion.idIntercambio);
    if (!intercambio) {
      return { exito: false, mensaje: 'El intercambio seleccionado no existe.' };
    }
    if (!intercambio.estaFinalizado()) {
      return { exito: false, mensaje: 'Solo puede calificar intercambios finalizados.' };
    }
    if (!intercambio.participa(calificacion.evaluador)) {
      return { exito: false, mensaje: 'Usted no participó en este intercambio.' };
    }
    if (intercambio.contraparteDe(calificacion.evaluador) !== calificacion.evaluado) {
      return { exito: false, mensaje: 'El lector evaluado no corresponde a este intercambio.' };
    }

    // Paso 3: no se permite calificar dos veces lo mismo
    if (this.yaFueCalificado(calificacion.evaluador, calificacion.idIntercambio, calificacion.tipo)) {
      return { exito: false, mensaje: 'Usted ya calificó este intercambio. No es posible calificarlo de nuevo.' };
    }

    // Paso 4: guardado ÚNICO (puntuación + comentario viajan juntos en el mismo objeto)
    const lista = this.leerLista<CalificacionPlana>(this.CLAVE_CALIFICACIONES);
    lista.push(calificacion as unknown as CalificacionPlana);
    if (!this.guardarLista(this.CLAVE_CALIFICACIONES, lista)) {
      return { exito: false, mensaje: 'No se pudo guardar la calificación. Intente nuevamente.' };
    }

    // Paso 5: consecuencia derivada: se refresca la reputación del lector calificado
    if (calificacion.tipo === 'lector') {
      this.actualizarReputacionLector(calificacion.evaluado);
    }
    return { exito: true, mensaje: '¡Calificación registrada con éxito!' };
  }

  // Crea un identificador único para cada calificación o intercambio
  public generarId(): string {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  /* =========================================================
     5. CONSULTAR RESEÑAS
     ========================================================= */
  // Lista las reseñas recibidas por un lector (más recientes primero), con filtro opcional
  public obtenerResenas(lector: string, filtro: FiltroResenas = 'todas'): Calificacion[] {
    return this.leerCalificaciones()
      .filter(c => c.evaluado === lector && (filtro === 'todas' || c.tipo === filtro))
      .sort((a, b) => b.comentario.fecha.localeCompare(a.comentario.fecha));
  }

  // Promedio de reputación como lector (1 decimal). Devuelve null si aún no tiene calificaciones
  public calcularPromedio(lector: string): number | null {
    const notas = this.obtenerResenas(lector, 'lector').map(c => c.puntuacion);
    if (notas.length === 0) return null;
    const promedio = notas.reduce((suma, n) => suma + n, 0) / notas.length;
    return Math.round(promedio * 10) / 10;
  }

  // Lista los lectores que se pueden consultar (registrados + los que ya recibieron reseñas)
  public listarLectores(): string[] {
    const registrados = this.leerLista<{ usuario: string }>(this.CLAVE_USUARIOS).map(u => u.usuario);
    const calificados = this.leerCalificaciones().map(c => c.evaluado);
    return Array.from(new Set([...registrados, ...calificados])).sort();
  }

  /* =========================================================
     6. MÉTODOS PRIVADOS DE ALMACENAMIENTO (Fiabilidad)
     ========================================================= */
  // Actualiza el campo "reputacion" del perfil del lector (el que creó perfil-usuario)
  private actualizarReputacionLector(lector: string): void {
    const promedio = this.calcularPromedio(lector);
    if (promedio === null) return;
    const usuarios = this.leerLista<{ usuario: string; reputacion?: number }>(this.CLAVE_USUARIOS);
    const perfil = usuarios.find(u => u.usuario === lector);
    if (perfil) {
      perfil.reputacion = promedio;                       // Nuevo promedio
      this.guardarLista(this.CLAVE_USUARIOS, usuarios);   // Persistencia del perfil
    }
  }

  // Lee y reconstruye todas las calificaciones como objetos Calificacion
  private leerCalificaciones(): Calificacion[] {
    return this.leerLista<CalificacionPlana>(this.CLAVE_CALIFICACIONES).map(p => Calificacion.desdeJSON(p));
  }

  // Lee una lista del almacenamiento; si está dañada o vacía devuelve []
  private leerLista<T>(clave: string): T[] {
    try {
      const crudo = localStorage.getItem(clave);
      const datos = crudo ? JSON.parse(crudo) : [];
      return Array.isArray(datos) ? (datos as T[]) : [];
    } catch {
      return [];
    }
  }

  // Guarda una lista; devuelve false si el almacenamiento falla (cuota, bloqueo, etc.)
  private guardarLista(clave: string, lista: unknown[]): boolean {
    try {
      localStorage.setItem(clave, JSON.stringify(lista));
      return true;
    } catch {
      return false;
    }
  }
}

/*
  Archivo: script-calificar-reputacion.ts   (FRONTEND: front/src/app/calificar-reputacion/)
  Clase: CalificarReputacionComponent
  HU: "Calificar lector o intercambio" (Épica Reputación) - 1er Sprint

  Función: Controla la PANTALLA. Recoge los datos del usuario y se los pasa al servicio.
           NO contiene reglas de negocio ni guarda datos (eso lo hace ServicioReputacion).

  CAMINO DE PROCESO DE DATOS:
   HTML (formulario) -> CalificarReputacionComponent -> new Calificacion(new Comentario(...))
        -> ServicioReputacion.registrarCalificacion() -> almacenamiento (futuro: ControladorReputacion)

  CORRECCIONES DE LA PROFESORA APLICADAS EN EL FLUJO:
   1. Se verifica la sesión y se usa el usuario logueado (no se "autentica" otra vez).
   2. Si el intercambio YA fue calificado, se muestra una ADVERTENCIA antes del formulario.
   3. Existe el objeto Comentario (dentro de Calificacion).
   4. Se VALIDA primero y se guarda UNA sola vez (puntuación y comentario juntos).
   5. Antes de registrar se SOLICITA CONFIRMACIÓN al usuario.
   6. El mensaje de éxito ofrece acciones al actor ("Calificar otro" / "Ver mis reseñas enviadas").
   7. Los mensajes son texto simple (mensajeTexto), no objetos.
*/
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ServicioReputacion } from '../reputacion/servicio-reputacion';
import { Calificacion, Comentario, Intercambio } from '../reputacion/modelo-reputacion'; // Clases de dominio
import type { TipoCalificacion } from '../reputacion/modelo-reputacion'; // Solo tipo

@Component({
  selector: 'app-calificar-reputacion',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './calificar-reputacion.html',
  styleUrls: ['./estilos-calificar-reputacion.css']
})
export class CalificarReputacionComponent implements OnInit {

  /* =========================================================
     1. ESTADO DE LA PANTALLA (variables)
     ========================================================= */
  usuarioActual: string | null = null;                 // Usuario con sesión iniciada
  tipoSeleccionado: TipoCalificacion = 'lector';       // Qué se califica: lector o intercambio
  intercambios: Intercambio[] = [];                    // Intercambios finalizados del usuario
  idIntercambioSeleccionado: string = '';              // Intercambio elegido en la lista
  yaCalificado: boolean = false;                       // true si ya calificó lo elegido
  puntuacion: number = 0;                              // Estrellas elegidas (0 = ninguna)
  textoComentario: string = '';                        // Texto del comentario (opcional)
  paso: 'formulario' | 'confirmacion' = 'formulario';  // Paso actual del proceso
  completada: boolean = false;                         // true cuando la calificación ya se guardó
  mensajeTipo: 'exito' | 'error' | 'advertencia' | '' = ''; // Tipo del mensaje mostrado
  mensajeTexto: string = '';                           // Texto del mensaje (simple string)

  /* =========================================================
     2. CONSTANTES USADAS POR LA PLANTILLA
     ========================================================= */
  readonly estrellasDisponibles: number[] = [1, 2, 3, 4, 5];                       // Botones de estrella
  readonly rutaEstrellaLlena = '/imagenes/calificacion-estrella-llena.png';        // Imagen estrella llena
  readonly rutaEstrellaVacia = '/imagenes/calificacion-estrella-vacia.png';        // Imagen estrella vacía
  readonly longitudMaximaComentario = Comentario.LONGITUD_MAXIMA;                  // Límite del comentario

  // Inyección de dependencias (POO): el servicio hace la lógica, el router solo navega
  constructor(private servicio: ServicioReputacion, private router: Router) {}

  /* =========================================================
     3. CICLO DE VIDA: carga inicial
     ========================================================= */
  ngOnInit(): void {
    this.usuarioActual = this.servicio.obtenerUsuarioActual(); // Precondición: usuario logueado
    if (!this.usuarioActual) {
      this.router.navigate(['/']); // Sin sesión: se devuelve al inicio de sesión
      return;
    }
    this.cargarIntercambios();
  }

  /* =========================================================
     4. SELECCIÓN: tipo de calificación e intercambio
     ========================================================= */
  // Carga los intercambios finalizados donde participó el usuario
  cargarIntercambios(): void {
    this.intercambios = this.servicio.obtenerIntercambiosFinalizados(this.usuarioActual!);
  }

  // TEMPORAL: genera intercambios de prueba (se elimina cuando exista el módulo Intercambio)
  cargarDatosDePrueba(): void {
    this.servicio.sembrarIntercambiosDemo(this.usuarioActual!);
    this.cargarIntercambios();
  }

  // Cambia entre calificar al lector o calificar el intercambio
  seleccionarTipo(tipo: TipoCalificacion): void {
    this.tipoSeleccionado = tipo;
    this.alCambiarIntercambio(this.idIntercambioSeleccionado); // Re-verifica con el nuevo tipo
  }

  // Al elegir un intercambio: advierte si ya fue calificado, antes de mostrar el formulario
  alCambiarIntercambio(id: string): void {
    this.idIntercambioSeleccionado = id;
    this.paso = 'formulario';
    this.puntuacion = 0;
    this.textoComentario = '';
    this.limpiarMensaje();
    this.yaCalificado = !!id && this.servicio.yaFueCalificado(this.usuarioActual!, id, this.tipoSeleccionado);
    if (this.yaCalificado) {
      this.mostrarMensaje('advertencia',
        'Usted ya calificó este intercambio. Elija otro intercambio o cambie el tipo de calificación.');
    }
  }

  // Intercambio actualmente seleccionado (o undefined si no hay)
  get intercambioActual(): Intercambio | undefined {
    return this.intercambios.find(i => i.id === this.idIntercambioSeleccionado);
  }

  // Título del campo de selección según lo que se califica
  get tituloLista(): string {
    return this.tipoSeleccionado === 'lector' ? 'Lector a calificar' : 'Intercambio a calificar';
  }

  // Texto de cada opción: en "lector" va primero el usuario y entre paréntesis el intercambio;
  // en "intercambio" va primero el intercambio y entre paréntesis el usuario
  etiquetaOpcion(i: Intercambio): string {
    const lector = i.contraparteDe(this.usuarioActual!) ?? '';
    const libros = `${i.libroOfrecido} ⇄ ${i.libroSolicitado}`;
    return this.tipoSeleccionado === 'lector' ? `${lector} (${libros})` : `${libros} (${lector})`;
  }

  // Lector que será calificado (la otra persona del intercambio)
  get lectorEvaluado(): string {
    return this.intercambioActual?.contraparteDe(this.usuarioActual!) ?? '';
  }

  /* =========================================================
     5. FORMULARIO: puntuación y comentario
     ========================================================= */
  // Registra las estrellas: se llama al pasar el mouse por una estrella (mouseenter) y al hacer clic.
  // La puntuación siempre es la de la ÚLTIMA estrella sobre la que estuvo el mouse (se puede subir y bajar).
  asignarPuntuacion(estrellas: number): void {
    this.puntuacion = estrellas;
  }

  // Construye el objeto Calificacion con los datos actuales de la pantalla
  private construirCalificacion(): Calificacion {
    return new Calificacion(
      this.servicio.generarId(),
      this.idIntercambioSeleccionado,
      this.tipoSeleccionado,
      this.usuarioActual!,
      this.lectorEvaluado,
      this.puntuacion,
      new Comentario(this.textoComentario)
    );
  }

  /* =========================================================
     6. PROCESO: validar -> confirmar -> guardar
     ========================================================= */
  // Paso A: valida y, si todo es correcto, pide confirmación (todavía NO guarda nada)
  solicitarConfirmacion(): void {
    this.limpiarMensaje();
    const validacion = this.construirCalificacion().validar(); // Validar ANTES de continuar
    if (!validacion.exito) {
      this.mostrarMensaje('error', validacion.mensaje);
      return;
    }
    this.paso = 'confirmacion';
  }

  // Paso B (alterno): el usuario decide volver a editar
  volverAlFormulario(): void {
    this.paso = 'formulario';
  }

  // Paso B: el usuario confirma y se registra (guardado único en el servicio)
  confirmarYGuardar(): void {
    const resultado = this.servicio.registrarCalificacion(this.construirCalificacion());
    if (!resultado.exito) {
      this.paso = 'formulario';
      this.mostrarMensaje('error', resultado.mensaje);
      return;
    }
    this.completada = true;
    this.paso = 'formulario';
    this.mostrarMensaje('exito', resultado.mensaje);
  }

  // Acción del actor tras el éxito: preparar otra calificación
  calificarOtro(): void {
    this.completada = false;
    this.alCambiarIntercambio('');
  }

  /* =========================================================
     7. UTILIDADES DE MENSAJES
     ========================================================= */
  private mostrarMensaje(tipo: 'exito' | 'error' | 'advertencia', texto: string): void {
    this.mensajeTipo = tipo;
    this.mensajeTexto = texto;
  }

  private limpiarMensaje(): void {
    this.mensajeTipo = '';
    this.mensajeTexto = '';
  }
}

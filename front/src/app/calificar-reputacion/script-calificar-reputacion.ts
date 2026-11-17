/*
  HU: "Calificar lector o intercambio" (Épica Reputación) - 1er Sprint

  Función: Controla la PANTALLA. Recoge los datos del usuario y se los pasa al servicio.
*/
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
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

  /* 1. ESTADO DE LA PANTALLA (variables)*/
  usuarioActual: string | null = null;                 // Usuario con sesión iniciada
  tipoSeleccionado: TipoCalificacion = 'lector';       // Qué se califica: lector o intercambio
  intercambios: Intercambio[] = [];                    // Intercambios finalizados del usuario
  idIntercambioSeleccionado: string = '';              // Intercambio elegido en la lista
  cargandoIntercambios = false;
  yaCalificado: boolean = false;                       // true si ya calificó lo elegido
  puntuacion: number = 0;                              // Estrellas elegidas (0 = ninguna)
  textoComentario: string = '';                        // Texto del comentario (opcional)
  paso: 'formulario' | 'confirmacion' = 'formulario';  // Paso actual del proceso
  completada: boolean = false;                         // true cuando la calificación ya se guardó
  consultandoCalificacion: boolean = false;
  guardando: boolean = false;
  mensajeTipo: 'exito' | 'error' | 'advertencia' | '' = ''; // Tipo del mensaje mostrado
  mensajeTexto: string = '';                           // Texto del mensaje (simple string)
  private verificacionActual = 0;

  /* 2. CONSTANTES USADAS POR LA PLANTILLA*/
  readonly estrellasDisponibles: number[] = [1, 2, 3, 4, 5];                       // Botones de estrella
  readonly rutaEstrellaLlena = '/imagenes/calificacion-estrella-llena.png';        // Imagen estrella llena
  readonly rutaEstrellaVacia = '/imagenes/calificacion-estrella-vacia.png';        // Imagen estrella vacía
  readonly longitudMaximaComentario = Comentario.LONGITUD_MAXIMA;                  // Límite del comentario

  // Inyección de dependencias (POO): el servicio hace la lógica, el router solo navega
  constructor(
    private servicio: ServicioReputacion,
    private router: Router,
    private readonly changeDetector: ChangeDetectorRef
  ) {}

  /* 3. CICLO DE VIDA: carga inicial*/
  ngOnInit(): void {
    this.usuarioActual = this.servicio.obtenerUsuarioActual(); // Precondición: usuario logueado
    if (!this.usuarioActual) {
      this.router.navigate(['/']); // Sin sesión: se devuelve al inicio de sesión
      return;
    }
    this.cargarIntercambios();
  }

  /* 4. SELECCIÓN: tipo de calificación e intercambio*/
  // Carga los intercambios finalizados donde participó el usuario
  cargarIntercambios(): void {
    this.cargandoIntercambios = true;
    this.servicio.obtenerIntercambiosFinalizados(this.usuarioActual!).subscribe({
      next: intercambios => {
        this.intercambios = intercambios;
        this.cargandoIntercambios = false;
        this.changeDetector.markForCheck();
      },
      error: () => {
        this.cargandoIntercambios = false;
        this.mostrarMensaje('error', 'No se pudieron cargar los intercambios finalizados.');
        this.changeDetector.markForCheck();
      }
    });
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
    this.yaCalificado = false;
    this.consultandoCalificacion = false;
    const verificacion = ++this.verificacionActual;
    if (!id) return;

    this.consultandoCalificacion = true;
    this.servicio.yaFueCalificado(this.usuarioActual!, id, this.tipoSeleccionado).subscribe({
      next: yaCalificado => {
        if (verificacion !== this.verificacionActual) return;
        this.yaCalificado = yaCalificado;
        this.consultandoCalificacion = false;
        if (yaCalificado) {
          this.mostrarMensaje('advertencia',
            'Usted ya calificó este intercambio. Elija otro intercambio o cambie el tipo de calificación.');
        }
        this.changeDetector.markForCheck();
      },
      error: () => {
        if (verificacion !== this.verificacionActual) return;
        this.consultandoCalificacion = false;
        this.mostrarMensaje('error', 'No se pudo verificar si ya calificó este intercambio.');
        this.changeDetector.markForCheck();
      }
    });
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

  /*5. FORMULARIO: puntuación y comentario*/
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

  /* 6. PROCESO: validar -> confirmar -> guardar */
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
    this.guardando = true;
    this.servicio.registrarCalificacion(this.construirCalificacion()).subscribe({
      next: resultado => {
        this.guardando = false;
        if (!resultado.exito) {
          this.paso = 'formulario';
          this.mostrarMensaje('error', resultado.mensaje);
          this.changeDetector.markForCheck();
          return;
        }
        this.completada = true;
        this.paso = 'formulario';
        this.mostrarMensaje('exito', resultado.mensaje);
        this.changeDetector.markForCheck();
      },
      error: () => {
        this.guardando = false;
        this.paso = 'formulario';
        this.mostrarMensaje('error', 'No se pudo guardar la calificación. Intente nuevamente.');
        this.changeDetector.markForCheck();
      }
    });
  }

  // Acción del actor tras el éxito: preparar otra calificación
  calificarOtro(): void {
    this.completada = false;
    this.alCambiarIntercambio('');
  }

  /*7. UTILIDADES DE MENSAJES*/
  private mostrarMensaje(tipo: 'exito' | 'error' | 'advertencia', texto: string): void {
    this.mensajeTipo = tipo;
    this.mensajeTexto = texto;
  }

  private limpiarMensaje(): void {
    this.mensajeTipo = '';
    this.mensajeTexto = '';
  }
}

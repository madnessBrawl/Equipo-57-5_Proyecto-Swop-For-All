import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, ElementRef, ViewChild, AfterViewChecked, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { Libro, OfertaIntercambio } from '../modelos/intercambio.model';
import { GoogleBooksService } from '../servicios/google-books.service';
import { IntercambioService } from '../servicios/intercambio.service';
import { CifradoService } from '../servicios/cifrado.service';

interface MensajeChat {
  id?: string;
  remitente: string;
  texto: string;
  hora: string;
}

@Component({
  selector: 'app-modificar-oferta',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './modificar-oferta.component.html',
  styleUrls: ['./modificar-oferta.component.css']
})
export class ModificarOfertaComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('scrollChat') private scrollChatContainer?: ElementRef<HTMLElement>;
  private actualizadorOfertas: ReturnType<typeof setInterval> | null = null;
  private readonly ofertasEliminadas = new Set<string>();

  public usuarioActual = '';
  public ofertas: OfertaIntercambio[] = [];
  public ofertaActiva: OfertaIntercambio | null = null;
  public inventarioPersonal: Libro[] = [];
  public inventarioDelOtroUsuario: Libro[] = [];
  public mensajeInput = '';
  public readonly maxLengthMensaje = 250;
  public historialMensajes: MensajeChat[] = [];
  public estaCargando = false;
  public guardandoModificacion = false;
  public eliminandoOfertaId: string | null = null;
  public tieneCambiosSinGuardar = false;
  public mensajeEstado = '';
  public error = '';

  constructor(
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly librosService: GoogleBooksService,
    private readonly intercambioService: IntercambioService,
    private readonly changeDetector: ChangeDetectorRef,
    private readonly cifradoService: CifradoService
  ) {}

  ngOnInit(): void {
    this.usuarioActual = this.obtenerUsuarioActual();
    if (!this.usuarioActual) {
      this.router.navigate(['/']);
      return;
    }
    this.cargarOfertas();
    this.actualizadorOfertas = setInterval(() => this.refrescarOfertas(), 5000);
  }

  ngOnDestroy(): void {
    if (this.actualizadorOfertas) clearInterval(this.actualizadorOfertas);
  }

  ngAfterViewChecked(): void {
    this.scrollToBottom();
  }

  get tieneOfertaActiva(): boolean {
    return this.ofertaActiva !== null;
  }

  get usuarioInterlocutor(): string {
    if (!this.ofertaActiva) return '';
    return this.esEmisor ? this.ofertaActiva.usuarioReceptor : this.ofertaActiva.usuarioEmisor;
  }

  get idIntercambio(): string {
    return this.ofertaActiva?.idIntercambio || '';
  }

  get esEmisor(): boolean {
    return this.ofertaActiva?.usuarioEmisor.toLowerCase() === this.usuarioActual.toLowerCase();
  }

  get librosPropiosEnOferta(): Libro[] {
    if (!this.ofertaActiva) return [];
    return this.esEmisor ? this.ofertaActiva.librosOfrecidos : this.ofertaActiva.librosSolicitados;
  }

  get librosDelOtroEnOferta(): Libro[] {
    if (!this.ofertaActiva) return [];
    return this.esEmisor ? this.ofertaActiva.librosSolicitados : this.ofertaActiva.librosOfrecidos;
  }

  get usuarioConfirmo(): boolean {
    return Boolean((this.ofertaActiva?.confirmaciones || []).some(
      usuario => usuario.toLowerCase() === this.usuarioActual.toLowerCase()
    ));
  }

  get interlocutorConfirmo(): boolean {
    return Boolean((this.ofertaActiva?.confirmaciones || []).some(
      usuario => usuario.toLowerCase() === this.usuarioInterlocutor.toLowerCase()
    ));
  }

  get puedeConfirmar(): boolean {
    return Boolean(
      this.ofertaActiva &&
      this.ofertaActiva.estado !== 'Finalizado' &&
      this.ofertaActiva.estado !== 'Cancelada' &&
      this.librosPropiosEnOferta.length > 0 &&
      this.librosDelOtroEnOferta.length > 0 &&
      !this.usuarioConfirmo &&
      !this.guardandoModificacion &&
      !this.tieneCambiosSinGuardar
    );
  }

  cargarOfertas(): void {
    this.estaCargando = true;
    this.error = '';
    this.intercambioService.obtenerPorParticipante(this.usuarioActual)
      .pipe(finalize(() => {
        this.estaCargando = false;
        this.changeDetector.markForCheck();
      }))
      .subscribe({
        next: ofertas => {
          this.recibirOfertas(ofertas);
        },
        error: (error: unknown) => {
          this.error = this.mensajeError(error, 'No se pudieron cargar tus intercambios.');
          this.changeDetector.markForCheck();
        }
      });
  }

  private refrescarOfertas(): void {
    this.intercambioService.obtenerPorParticipante(this.usuarioActual).subscribe({
      next: ofertas => this.recibirOfertas(ofertas),
      error: (error: unknown) => {
        this.error = this.mensajeError(error, 'No se pudieron actualizar tus intercambios.');
        this.changeDetector.markForCheck();
      }
    });
  }

  private recibirOfertas(ofertas: OfertaIntercambio[]): void {
    this.ofertas = ofertas.filter(oferta => !this.ofertasEliminadas.has(oferta.idIntercambio));
    if (this.ofertaActiva) {
      const actualizada = ofertas.find(oferta => oferta.idIntercambio === this.ofertaActiva?.idIntercambio);
      if (actualizada && !this.tieneCambiosSinGuardar) {
        const cambioEnOferta = actualizada.fechaModificacion !== this.ofertaActiva.fechaModificacion;
        this.ofertaActiva = actualizada;
        if (cambioEnOferta) this.cargarInventarios();
      }
      this.changeDetector.markForCheck();
      return;
    }

    const idSolicitado = this.route.snapshot.queryParamMap.get('id');
    const ofertaSeleccionada = ofertas.find(oferta => oferta.idIntercambio === idSolicitado) ||
      ofertas.find(oferta => oferta.estado !== 'Finalizado' && oferta.estado !== 'Cancelada') ||
      ofertas[0] ||
      null;
    if (ofertaSeleccionada) this.seleccionarOferta(ofertaSeleccionada);
    this.changeDetector.markForCheck();
  }

  seleccionarOferta(oferta: OfertaIntercambio): void {
    this.ofertaActiva = oferta;
    this.tieneCambiosSinGuardar = false;
    this.mensajeEstado = '';
    this.cargarInventarios();
    this.cargarChat();
    this.changeDetector.markForCheck();
  }

  private cargarInventarios(): void {
    if (!this.ofertaActiva) return;
    this.librosService.obtenerInventarioUsuario(this.usuarioActual).subscribe({
      next: libros => {
        this.inventarioPersonal = libros;
        this.changeDetector.markForCheck();
      },
      error: (error: unknown) => {
        this.error = this.mensajeError(error, 'No se pudo cargar tu inventario.');
        this.changeDetector.markForCheck();
      }
    });
    this.librosService.obtenerInventarioUsuario(this.usuarioInterlocutor).subscribe({
      next: libros => {
        this.inventarioDelOtroUsuario = libros;
        this.changeDetector.markForCheck();
      },
      error: (error: unknown) => {
        this.error = this.mensajeError(error, 'No se pudo cargar el inventario del otro usuario.');
        this.changeDetector.markForCheck();
      }
    });
  }

  public agregarLibroPropio(libro: Libro): void {
    if (!this.ofertaActiva || this.intercambioCerrado || this.guardandoModificacion) return;
    if (this.librosPropiosEnOferta.some(actual => actual.id === libro.id)) return;

    // Verificación cruzada: ya lo estás ofreciendo en OTRO intercambio activo
    this.intercambioService.obtenerMisIntercambios().subscribe(intercambios => {
      const estadosActivos = ['Pendiente', 'Modificada', 'Aceptada'];
      const conflicto = intercambios.find((i: any) =>
        estadosActivos.includes(i.estado) &&
        String(i.idIntercambio || i.id) !== String(this.idIntercambio) &&
        Array.isArray(i.librosOfrecidos) &&
        i.librosOfrecidos.some((l: any) => String(typeof l === 'object' ? l.id : l) === String(libro.id))
      );

      if (conflicto) {
        alert(
          `⚠️ Ya estás ofreciendo "${libro.titulo}" en otro intercambio activo ` +
          `(ID: ${conflicto.idIntercambio || conflicto.id}).\n\n` +
          `Retíralo de ese intercambio antes de ofrecerlo aquí.`
        );
        return;
      }

      this.reemplazarLibrosPropios([...this.librosPropiosEnOferta, libro]);
      this.marcarModificada();
      this.guardarModificacionOferta();
    });
  }

  public retirarLibroPropio(idLibro: string): void {
    if (!this.ofertaActiva || this.intercambioCerrado || this.guardandoModificacion) return;
    this.reemplazarLibrosPropios(this.librosPropiosEnOferta.filter(libro => libro.id !== idLibro));
    this.marcarModificada();
    this.guardarModificacionOferta();
  }

  public solicitarAgregarLibroAjeno(libro: Libro): void {
    if (!this.ofertaActiva || this.intercambioCerrado || this.guardandoModificacion) return;
    if (this.librosDelOtroEnOferta.some(actual => actual.id === libro.id)) return;
    this.reemplazarLibrosDelOtro([...this.librosDelOtroEnOferta, libro]);
    this.marcarModificada();
    this.guardarModificacionOferta();
  }

  public solicitarRetirarLibroAjeno(idLibro: string): void {
    if (!this.ofertaActiva || this.intercambioCerrado || this.guardandoModificacion) return;
    this.reemplazarLibrosDelOtro(this.librosDelOtroEnOferta.filter(libro => libro.id !== idLibro));
    this.marcarModificada();
    this.guardarModificacionOferta();
  }

  public estaOfrecido(idLibro: string): boolean {
    return this.librosPropiosEnOferta.some(libro => libro.id === idLibro);
  }

  public estaSolicitado(idLibro: string): boolean {
    return this.librosDelOtroEnOferta.some(libro => libro.id === idLibro);
  }

  public esEmisorDe(oferta: OfertaIntercambio): boolean {
    return oferta.usuarioEmisor.toLowerCase() === this.usuarioActual.toLowerCase();
  }

  public titulosLibros(libros: Libro[]): string {
    return libros.map(libro => libro.titulo).join(', ') || 'Solicitud pendiente de completar';
  }

  public guardarModificacionOferta(): void {
    const oferta = this.ofertaActiva;
    if (!oferta || this.intercambioCerrado || !this.tieneCambiosSinGuardar) return;

    this.mensajeEstado = 'La modificación anuló las confirmaciones. Guardando cambios…';
    this.guardandoModificacion = true;
    this.intercambioService.modificar(oferta, this.usuarioActual)
      .pipe(finalize(() => {
        this.guardandoModificacion = false;
        this.changeDetector.markForCheck();
      }))
      .subscribe({
        next: guardada => {
          this.actualizarOfertaActiva(guardada);
          this.tieneCambiosSinGuardar = false;
          this.mensajeEstado = 'Cambios guardados. Ambos usuarios deben confirmar nuevamente.';
          this.changeDetector.markForCheck();
        },
        error: (error: unknown) => {
          this.mensajeEstado = this.mensajeError(error, 'No se pudieron guardar los cambios.');
          this.changeDetector.markForCheck();
        }
      });
  }

  public confirmarIntercambio(): void {
    if (!this.ofertaActiva || !this.puedeConfirmar) return;
    this.guardandoModificacion = true;
    this.mensajeEstado = '';
    this.intercambioService.confirmar(this.ofertaActiva.idIntercambio, this.usuarioActual)
      .pipe(finalize(() => this.guardandoModificacion = false))
      .subscribe({
        next: oferta => {
          this.actualizarOfertaActiva(oferta);
          this.mensajeEstado = oferta.estado === 'Finalizado'
            ? 'Intercambio confirmado por ambos usuarios y finalizado.'
            : 'Tu confirmación quedó registrada. Falta la confirmación del otro usuario.';
          this.changeDetector.markForCheck();
        },
        error: (error: unknown) => {
          this.mensajeEstado = this.mensajeError(error, 'No se pudo confirmar el intercambio.');
          this.changeDetector.markForCheck();
        }
      });
  }

  public cancelarIntercambio(): void {
    if (!this.ofertaActiva || this.intercambioCerrado) return;
    if (!confirm('¿Estás seguro de que deseas cancelar este intercambio?')) return;
    this.intercambioService.cancelar(this.ofertaActiva.idIntercambio, this.usuarioActual).subscribe({
      next: oferta => {
        this.actualizarOfertaActiva(oferta);
        this.mensajeEstado = 'El intercambio fue cancelado.';
        this.changeDetector.markForCheck();
      },
      error: (error: unknown) => {
        this.mensajeEstado = this.mensajeError(error, 'No se pudo cancelar el intercambio.');
        this.changeDetector.markForCheck();
      }
    });
  }

  public eliminarOfertaDeLista(oferta: OfertaIntercambio): void {
    const esCancelada = oferta.estado === 'Cancelada';
    const esFinalizada = oferta.estado === 'Finalizado';
    if ((!esCancelada && !esFinalizada) || this.eliminandoOfertaId) return;
    const confirmacion = esFinalizada
      ? '¿Quitar este intercambio de tu lista? Seguirá disponible en Calificaciones.'
      : '¿Eliminar este intercambio cancelado para ambos participantes?';
    if (!confirm(confirmacion)) return;

    this.eliminandoOfertaId = oferta.idIntercambio;
    this.error = '';
    this.intercambioService.eliminarDeLista(oferta.idIntercambio, this.usuarioActual)
      .pipe(finalize(() => {
        this.eliminandoOfertaId = null;
        this.changeDetector.markForCheck();
      }))
      .subscribe({
        next: () => {
          this.ofertasEliminadas.add(oferta.idIntercambio);
          this.ofertas = this.ofertas.filter(actual => actual.idIntercambio !== oferta.idIntercambio);
          if (this.ofertaActiva?.idIntercambio === oferta.idIntercambio) {
            this.ofertaActiva = null;
            this.inventarioPersonal = [];
            this.inventarioDelOtroUsuario = [];
            this.historialMensajes = [];
          }
          this.changeDetector.markForCheck();
        },
        error: (error: unknown) => {
          this.error = this.mensajeError(error, 'No se pudo quitar el intercambio de tu lista.');
          this.changeDetector.markForCheck();
        }
      });
  }

  public enviarMensaje(): void {
    if (!this.ofertaActiva || !this.mensajeInput.trim()) return;
    if (this.mensajeInput.length > this.maxLengthMensaje) {
      alert('El mensaje excede el límite de 250 caracteres.');
      return;
    }

    const texto = this.mensajeInput.trim();
    const nuevoMensaje: MensajeChat = {
      remitente: this.usuarioActual,
      texto,
      hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    this.historialMensajes.push(nuevoMensaje);
    this.guardarChatEnStorage();
    this.mensajeInput = '';

    // Enviar también al backend
    this.intercambioService.enviarMensaje(this.ofertaActiva.idIntercambio, texto).subscribe();
  }

  public irAlCatalogo(): void {
    this.router.navigate(['/catalogo']);
  }

  public get intercambioCerrado(): boolean {
    return this.ofertaActiva?.estado === 'Finalizado' || this.ofertaActiva?.estado === 'Cancelada';
  }

  private reemplazarLibrosPropios(libros: Libro[]): void {
    if (!this.ofertaActiva) return;
    if (this.esEmisor) this.ofertaActiva.librosOfrecidos = libros;
    else this.ofertaActiva.librosSolicitados = libros;
  }

  private reemplazarLibrosDelOtro(libros: Libro[]): void {
    if (!this.ofertaActiva) return;
    if (this.esEmisor) this.ofertaActiva.librosSolicitados = libros;
    else this.ofertaActiva.librosOfrecidos = libros;
  }

  private marcarModificada(): void {
    if (!this.ofertaActiva) return;
    this.ofertaActiva.estado = 'Pendiente';
    this.ofertaActiva.confirmaciones = [];
    this.ofertaActiva.fechaModificacion = new Date().toISOString();
    this.tieneCambiosSinGuardar = true;
  }

  private actualizarOfertaActiva(oferta: OfertaIntercambio): void {
    this.ofertaActiva = oferta;
    this.ofertas = this.ofertas.map(actual =>
      actual.idIntercambio === oferta.idIntercambio ? oferta : actual
    );
    this.changeDetector.markForCheck();
  }

  private cargarChat(): void {
    if (!this.ofertaActiva) return;
    try {
      this.historialMensajes = JSON.parse(
        localStorage.getItem(`chat_${this.ofertaActiva.idIntercambio}`) || '[]'
      ) as MensajeChat[];
    } catch {
      this.historialMensajes = [];
    }

    // Consultar mensajes del backend
    this.intercambioService.obtenerMensajes(this.ofertaActiva.idIntercambio).subscribe(mensajes => {
      if (Array.isArray(mensajes) && mensajes.length > 0) {
        this.historialMensajes = mensajes.map(m => ({
          remitente: m.remitente,
          texto: m.texto,
          hora: m.hora
        }));
        this.guardarChatEnStorage();
        this.changeDetector.markForCheck();
      }
    });

    if (this.historialMensajes.length === 0) {
      this.historialMensajes = [{
        remitente: this.usuarioInterlocutor,
        texto: `Solicitud de intercambio con ${this.usuarioInterlocutor}.`,
        hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }];
      this.guardarChatEnStorage();
    }
  }

  private guardarChatEnStorage(): void {
    if (this.ofertaActiva) {
      localStorage.setItem(`chat_${this.ofertaActiva.idIntercambio}`, JSON.stringify(this.historialMensajes));
    }
  }

  private scrollToBottom(): void {
    if (this.scrollChatContainer) {
      const elemento = this.scrollChatContainer.nativeElement;
      elemento.scrollTop = elemento.scrollHeight;
    }
  }

  private obtenerUsuarioActual(): string {
    try {
      const sesion = JSON.parse(localStorage.getItem('usuarioLogueado') || 'null') as { usuario?: string } | null;
      return sesion?.usuario?.trim() || '';
    } catch {
      return '';
    }
  }

  private mensajeError(error: unknown, predeterminado: string): string {
    if (error instanceof HttpErrorResponse && typeof error.error?.error === 'string') {
      return error.error.error;
    }
    return predeterminado;
  }
}

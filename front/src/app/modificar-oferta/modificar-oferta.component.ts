/* ==========================================================================
   ARCHIVO: modificar-oferta.component.ts (FRONTEND: front/src/app/modificar-oferta/)
   Componente: ModificarOfertaComponent
   Función: Permite gestionar y modificar los términos de una oferta de intercambio
            iniciada exclusivamente desde el Catálogo Global.
   Reglas de negocio:
     1. Solo accesible si existe un intercambio iniciado desde el catálogo.
        Si no hay oferta activa, redirige automáticamente al catálogo.
     2. Inicia con 0 libros ofrecidos (el usuario debe agregarlos activamente).
     3. Solo se pueden ofrecer libros que el usuario posea en su inventario.
     4. Debe ofrecer al menos un libro propio para solicitar el intercambio.
   ========================================================================== */

import { Component, ElementRef, ViewChild, AfterViewChecked, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Libro, OfertaIntercambio } from '../modelos/intercambio.model';
import { CifradoService } from '../servicios/cifrado.service';

interface MensajeChat {
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
export class ModificarOfertaComponent implements OnInit, AfterViewChecked {

  @ViewChild('scrollChat') private scrollChatContainer!: ElementRef;

  // Estado que determina si hay una oferta válida iniciada desde el catálogo
  public tieneOfertaActiva: boolean = false;

  public usuarioActual: string = 'UsuarioA';
  public usuarioInterlocutor: string = 'carlos_lector';
  public idIntercambio: string = 'INT-2026-01';

  // Inventario real y propio del usuario logueado
  public inventarioPersonal: Libro[] = [];

  // Inventario disponible del otro usuario para contraofertas
  public inventarioDelOtroUsuario: Libro[] = [];

  // Oferta activa: inicia con 0 libros ofrecidos en el lado del usuario
  public ofertaActiva: OfertaIntercambio = new OfertaIntercambio(
    this.idIntercambio,
    this.usuarioActual,
    this.usuarioInterlocutor,
    [], // Inicia VACÍO — el usuario selecciona sus libros manualmente
    [], // Se llena con el libro seleccionado desde el catálogo
    'Pendiente'
  );

  public mensajeInput: string = '';
  public readonly maxLengthMensaje: number = 250;
  public historialMensajes: MensajeChat[] = [];

  constructor(
    private router: Router,
    private cifradoService: CifradoService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.cargarDatosIntercambio();
  }

  ngAfterViewChecked(): void {
    this.scrollToBottom();
  }

  /*
    REGLA 1: Solo accesible si existe una oferta iniciada desde el Catálogo Global.
    Si no existe ninguna oferta activa, redirige automáticamente al catálogo.
  */
  private cargarDatosIntercambio(): void {
    // 1. Verificar si se inició una oferta desde el Catálogo Global
    const libroSolicitadoRaw = sessionStorage.getItem('libroSolicitado');
    const ofertaActivaRaw = localStorage.getItem('oferta_activa');
    const ofertaActivaId = localStorage.getItem('oferta_activa_id');

    // Si NO hay ninguna señal de intercambio activo → redirigir al catálogo
    if (!libroSolicitadoRaw && !ofertaActivaRaw && !ofertaActivaId) {
      this.tieneOfertaActiva = false;
      // Redirigir automáticamente al catálogo con mensaje informativo
      alert('⚠️ No tienes ningún intercambio activo.\n\nDebes ir al Catálogo Global, seleccionar un libro y presionar "Solicitar Intercambio" para iniciar la negociación.');
      this.router.navigate(['/catalogo']);
      return;
    }

    this.tieneOfertaActiva = true;

    // 2. Determinar el usuario logueado actualmente en la sesión
    const username = this.obtenerUsuarioActual();
    this.usuarioActual = username;

    // 3. Cargar inventario propio del usuario logueado (clave dinámica: inventario_<usuario>)
    const claveInventarioPropio = `inventario_${username}`;
    const inventarioGuardado = localStorage.getItem(claveInventarioPropio);
    if (inventarioGuardado) {
      try {
        const parsed = JSON.parse(inventarioGuardado);
        this.inventarioPersonal = Array.isArray(parsed) ? parsed : [];
      } catch {
        this.inventarioPersonal = [];
      }
    } else {
      this.inventarioPersonal = [];
    }

    // 3. Determinar los datos del libro solicitado desde el catálogo
    let libroDelCatalogo: Libro | null = null;
    let propietarioDestino = 'carlos_lector';

    if (libroSolicitadoRaw) {
      try {
        const parsed = JSON.parse(libroSolicitadoRaw);
        propietarioDestino = parsed.propietario || 'carlos_lector';
        libroDelCatalogo = new Libro(
          parsed.id || 'lib_cat_1',
          parsed.titulo || 'Libro del Catálogo',
          parsed.autor || 'Autor del Catálogo',
          true,
          '',  // Sin portadaUrl — no se usan imágenes para mayor velocidad
          parsed.descripcion || '',
          parsed.isbn || '',
          parsed.categoria || 'General'
        );
      } catch (e) {
        console.warn('Error al parsear libro solicitado:', e);
      }
    }

    this.usuarioInterlocutor = propietarioDestino;

    // 4. Cargar inventario del otro usuario
    const inventarioOtroGuardado = localStorage.getItem(`inventario_${this.usuarioInterlocutor}`);
    if (inventarioOtroGuardado) {
      try {
        this.inventarioDelOtroUsuario = JSON.parse(inventarioOtroGuardado);
      } catch {
        this.inventarioDelOtroUsuario = this.obtenerInventarioOtroPorDefecto();
      }
    } else {
      this.inventarioDelOtroUsuario = this.obtenerInventarioOtroPorDefecto();
      if (libroDelCatalogo) {
        // Añadir el libro del catálogo al inventario del otro usuario si no existe
        if (!this.inventarioDelOtroUsuario.some(l => String(l.id) === String(libroDelCatalogo!.id))) {
          this.inventarioDelOtroUsuario.unshift(libroDelCatalogo);
        }
      }
      localStorage.setItem(`inventario_${this.usuarioInterlocutor}`, JSON.stringify(this.inventarioDelOtroUsuario));
    }

    // 5. Configurar la oferta activa
    // REGLA 2: librosOfrecidos SIEMPRE inicia VACÍO (el usuario los agrega)
    // librosSolicitados inicia con el libro seleccionado desde el catálogo
    if (ofertaActivaRaw) {
      try {
        const parsedOferta = JSON.parse(ofertaActivaRaw);
        this.idIntercambio = parsedOferta.idIntercambio || ofertaActivaId || `INT-${Date.now().toString(36)}`;
        this.ofertaActiva = new OfertaIntercambio(
          this.idIntercambio,
          this.usuarioActual,
          parsedOferta.usuarioReceptor || this.usuarioInterlocutor,
          // REGLA 2: Siempre vacío al cargar — no se restauran libros ofrecidos previos
          [],
          // librosSolicitados: solo el libro del catálogo seleccionado
          libroDelCatalogo ? [libroDelCatalogo] : [],
          'Pendiente'
        );
      } catch {
        this.inicializarNuevaOferta(libroDelCatalogo);
      }
    } else {
      this.inicializarNuevaOferta(libroDelCatalogo);
    }

    // 6. Cargar mensajes del chat
    const chatGuardado = localStorage.getItem(`chat_${this.idIntercambio}`);
    if (chatGuardado) {
      try {
        this.historialMensajes = JSON.parse(chatGuardado);
      } catch {
        this.inicializarChatPorDefecto();
      }
    } else {
      this.inicializarChatPorDefecto();
    }

    this.cdr.detectChanges();
  }

  private inicializarNuevaOferta(libroDelCatalogo: Libro | null): void {
    this.idIntercambio = localStorage.getItem('oferta_activa_id') || `INT-${Date.now().toString(36)}`;
    this.ofertaActiva = new OfertaIntercambio(
      this.idIntercambio,
      this.usuarioActual,
      this.usuarioInterlocutor,
      [], // REGLA 2: Inicia estrictamente VACÍO — sin libros ofrecidos
      libroDelCatalogo ? [libroDelCatalogo] : [],
      'Pendiente'
    );
    this.guardarOferta();
  }

  private inicializarChatPorDefecto(): void {
    this.historialMensajes = [
      {
        remitente: this.usuarioInterlocutor,
        texto: `¡Hola! Veo que te interesa mi libro. ¿Qué libros de tu inventario tienes disponibles para ofrecerme a cambio?`,
        hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ];
    this.guardarChatEnStorage();
  }

  /*
    REGLA 3: DEBES OFRECER LIBROS QUE TENGAS.
    Añade un libro del inventario propio a los libros ofrecidos en la propuesta.
  */
  public agregarLibroPropio(libro: Libro): void {
    if (!this.ofertaActiva.librosOfrecidos) {
      this.ofertaActiva.librosOfrecidos = [];
    }

    const yaOfrecido = this.estaOfrecido(libro.id);
    if (!yaOfrecido) {
      // Reasignación inmutable para activar detección de cambios de Angular
      this.ofertaActiva.librosOfrecidos = [...this.ofertaActiva.librosOfrecidos, libro];
      this.guardarOferta();
      this.cdr.detectChanges();
    }
  }

  /*
    Retira un libro propio de la lista de ofrecidos
  */
  public retirarLibroPropio(idLibro: string): void {
    if (!this.ofertaActiva.librosOfrecidos) return;

    this.ofertaActiva.librosOfrecidos = this.ofertaActiva.librosOfrecidos.filter(
      l => String(l.id) !== String(idLibro)
    );
    this.guardarOferta();
    this.cdr.detectChanges();
  }

  /*
    Comprueba si un libro propio ya está en la oferta activa
  */
  public estaOfrecido(idLibro: string): boolean {
    if (!this.ofertaActiva || !Array.isArray(this.ofertaActiva.librosOfrecidos)) return false;
    return this.ofertaActiva.librosOfrecidos.some(l => String(l.id) === String(idLibro));
  }

  /*
    Comprueba si un libro ajeno ya está en la lista de solicitados
  */
  public estaSolicitado(idLibro: string): boolean {
    if (!this.ofertaActiva || !Array.isArray(this.ofertaActiva.librosSolicitados)) return false;
    return this.ofertaActiva.librosSolicitados.some(l => String(l.id) === String(idLibro));
  }

  /*
    Solicita agregar un libro adicional del inventario del otro usuario
  */
  public solicitarAgregarLibroAjeno(libro: Libro): void {
    if (!this.ofertaActiva.librosSolicitados) {
      this.ofertaActiva.librosSolicitados = [];
    }

    const yaSolicitado = this.estaSolicitado(libro.id);
    if (!yaSolicitado) {
      this.ofertaActiva.librosSolicitados = [...this.ofertaActiva.librosSolicitados, libro];
      this.guardarOferta();

      this.historialMensajes.push({
        remitente: this.usuarioActual,
        texto: `He añadido a la solicitud tu libro "${libro.titulo}".`,
        hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
      this.guardarChatEnStorage();
      this.cdr.detectChanges();
    }
  }

  /*
    Retira un libro de los solicitados al otro usuario
  */
  public solicitarRetirarLibroAjeno(idLibro: string): void {
    if (!this.ofertaActiva.librosSolicitados) return;

    const libroRetirado = this.ofertaActiva.librosSolicitados.find(l => String(l.id) === String(idLibro));
    this.ofertaActiva.librosSolicitados = this.ofertaActiva.librosSolicitados.filter(
      l => String(l.id) !== String(idLibro)
    );
    this.guardarOferta();

    if (libroRetirado) {
      this.historialMensajes.push({
        remitente: this.usuarioActual,
        texto: `He retirado de la solicitud el libro "${libroRetirado.titulo}".`,
        hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
      this.guardarChatEnStorage();
    }
    this.cdr.detectChanges();
  }

  /*
    Guarda los cambios de la oferta cumpliendo las reglas de negocio
  */
  public guardarModificacionOferta(): void {
    // Validación estricta: "debe ofrecer libros para pedirlos"
    if (!this.ofertaActiva.librosOfrecidos || this.ofertaActiva.librosOfrecidos.length === 0) {
      alert('⚠️ Regla de negocio: No puedes enviar una propuesta sin libros ofrecidos.\n\nDebes seleccionar al menos un libro de tu inventario propio en la columna izquierda.');
      return;
    }

    if (!this.ofertaActiva.librosSolicitados || this.ofertaActiva.librosSolicitados.length === 0) {
      alert('⚠️ Debe existir al menos un libro solicitado en el intercambio.');
      return;
    }

    this.ofertaActiva.estado = 'Modificada';
    this.guardarOferta();

    // RNF Cifrado: Se guarda también la versión protegida con ncrypt-js
    this.cifradoService.guardarEnStorageSeguro('oferta_activa', this.ofertaActiva);

    alert('✅ ¡Oferta de intercambio modificada y enviada al lector con éxito!');
  }

  /*
    Cancela y descarta el intercambio activo, limpiando los registros
  */
  public cancelarIntercambio(): void {
    if (confirm('¿Estás seguro de que deseas cancelar este intercambio? Deberás seleccionar un libro nuevamente desde el catálogo.')) {
      localStorage.removeItem('oferta_activa');
      localStorage.removeItem('oferta_activa_id');
      localStorage.removeItem(`oferta_${this.idIntercambio}`);
      sessionStorage.removeItem('libroSolicitado');
      this.cifradoService.eliminarDeStorageSeguro('oferta_activa');
      this.tieneOfertaActiva = false;
      this.router.navigate(['/catalogo']);
    }
  }

  /*
    Envío de mensajes en el chat de negociación
  */
  public enviarMensaje(): void {
    if (!this.mensajeInput || !this.mensajeInput.trim()) return;

    if (this.mensajeInput.length > this.maxLengthMensaje) {
      alert('El mensaje excede el límite de 250 caracteres.');
      return;
    }

    const horaActual = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    this.historialMensajes.push({
      remitente: this.usuarioActual,
      texto: this.mensajeInput.trim(),
      hora: horaActual
    });

    this.guardarChatEnStorage();
    this.mensajeInput = '';
    this.cdr.detectChanges();
  }

  public irAlCatalogo(): void {
    this.router.navigate(['/catalogo']);
  }

  private guardarOferta(): void {
    localStorage.setItem('oferta_activa', JSON.stringify(this.ofertaActiva));
    localStorage.setItem(`oferta_${this.idIntercambio}`, JSON.stringify(this.ofertaActiva));
  }

  private guardarChatEnStorage(): void {
    localStorage.setItem(`chat_${this.idIntercambio}`, JSON.stringify(this.historialMensajes));
  }

  private scrollToBottom(): void {
    try {
      if (this.scrollChatContainer) {
        this.scrollChatContainer.nativeElement.scrollTop = this.scrollChatContainer.nativeElement.scrollHeight;
      }
    } catch {}
  }

  private obtenerInventarioPorDefecto(): Libro[] {
    // Sin libros por defecto: el inventario debe venir del localStorage del usuario logueado
    return [];
  }

  private obtenerInventarioOtroPorDefecto(): Libro[] {
    // Sin libros por defecto: el inventario del otro usuario debe venir de su localStorage
    return [];
  }

  /*
    Obtiene el nombre del usuario logueado desde localStorage.
    Retorna 'usuario_local' como valor por defecto.
  */
  private obtenerUsuarioActual(): string {
    try {
      const sesion = JSON.parse(localStorage.getItem('usuarioLogueado') || 'null');
      return sesion?.usuario || 'usuario_local';
    } catch {
      return 'usuario_local';
    }
  }
}

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
import { IntercambioService } from '../servicios/intercambio.service';

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
    private intercambioService: IntercambioService,
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
    const libroSolicitadoRaw = sessionStorage.getItem('libroSolicitado');
    const ofertaActivaRaw = localStorage.getItem('oferta_activa');
    const ofertaActivaId = localStorage.getItem('oferta_activa_id');

    // Si NO hay ninguna señal de intercambio activo → redirigir al catálogo
    if (!libroSolicitadoRaw && !ofertaActivaRaw && !ofertaActivaId) {
      this.tieneOfertaActiva = false;
      alert('⚠️ No tienes ningún intercambio activo.\n\nDebes ir al Catálogo Global, seleccionar un libro y presionar "Solicitar Intercambio" para iniciar la negociación.');
      this.router.navigate(['/catalogo']);
      return;
    }

    this.tieneOfertaActiva = true;

    // 2. Determinar el usuario logueado actualmente en la sesión
    const username = this.obtenerUsuarioActual();
    this.usuarioActual = username;

    // 3. Cargar inventario propio del usuario logueado
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

    // 4. Determinar los datos del libro solicitado desde el catálogo
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
          '',
          parsed.descripcion || '',
          parsed.isbn || '',
          parsed.categoria || 'General'
        );
      } catch (e) {
        console.warn('Error al parsear libro solicitado:', e);
      }
    }

    this.usuarioInterlocutor = propietarioDestino;

    // 5. Cargar inventario del otro usuario
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
        if (!this.inventarioDelOtroUsuario.some(l => String(l.id) === String(libroDelCatalogo!.id))) {
          this.inventarioDelOtroUsuario.unshift(libroDelCatalogo);
        }
      }
      localStorage.setItem(`inventario_${this.usuarioInterlocutor}`, JSON.stringify(this.inventarioDelOtroUsuario));
    }

    // 6. Configurar la oferta activa
    if (ofertaActivaRaw) {
      try {
        const parsedOferta = JSON.parse(ofertaActivaRaw);
        this.idIntercambio = parsedOferta.idIntercambio || ofertaActivaId || `INT-${Date.now().toString(36)}`;
        this.ofertaActiva = new OfertaIntercambio(
          this.idIntercambio,
          this.usuarioActual,
          parsedOferta.usuarioReceptor || this.usuarioInterlocutor,
          // REGLA 2: Inicia vacío o con lo previamente seleccionado
          Array.isArray(parsedOferta.librosOfrecidos) ? parsedOferta.librosOfrecidos : [],
          Array.isArray(parsedOferta.librosSolicitados) && parsedOferta.librosSolicitados.length > 0
            ? parsedOferta.librosSolicitados
            : (libroDelCatalogo ? [libroDelCatalogo] : []),
          parsedOferta.estado || 'Pendiente'
        );
      } catch {
        this.inicializarNuevaOferta(libroDelCatalogo);
      }
    } else {
      this.inicializarNuevaOferta(libroDelCatalogo);
    }

    // 7. Sincronizar con el Backend (recuperar oferta persistida y mensajes reales)
    if (this.idIntercambio) {
      this.intercambioService.obtenerOferta(this.idIntercambio).subscribe(ofertaBack => {
        if (ofertaBack && ofertaBack.idIntercambio) {
          if (Array.isArray(ofertaBack.mensajes) && ofertaBack.mensajes.length > 0) {
            this.historialMensajes = ofertaBack.mensajes;
          }
          if (Array.isArray(ofertaBack.librosSolicitados) && ofertaBack.librosSolicitados.length > 0) {
            this.ofertaActiva.librosSolicitados = ofertaBack.librosSolicitados;
          }
          if (Array.isArray(ofertaBack.librosOfrecidos)) {
            this.ofertaActiva.librosOfrecidos = ofertaBack.librosOfrecidos;
          }
          this.cdr.detectChanges();
        }
      });
    }

    // 8. Cargar mensajes del chat local como respaldo
    const chatGuardado = localStorage.getItem(`chat_${this.idIntercambio}`);
    if (chatGuardado && this.historialMensajes.length === 0) {
      try {
        this.historialMensajes = JSON.parse(chatGuardado);
      } catch {
        this.inicializarChatPorDefecto();
      }
    } else if (this.historialMensajes.length === 0) {
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
      [], // REGLA 2: Inicia estrictamente VACÍO
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

    // Verificación local: ya está en ESTA oferta
    if (this.estaOfrecido(libro.id)) return;

    // Verificación cruzada: ya lo estás ofreciendo en OTRO intercambio activo
    // Se consulta el backend para confirmarlo antes de añadirlo
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

      // Sin conflicto → se agrega normalmente
      this.ofertaActiva.librosOfrecidos = [...this.ofertaActiva.librosOfrecidos, libro];
      this.guardarOferta();
      this.cdr.detectChanges();
    });
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

      const nuevoMsg: MensajeChat = {
        remitente: this.usuarioActual,
        texto: `He añadido a la solicitud tu libro "${libro.titulo}".`,
        hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      this.historialMensajes.push(nuevoMsg);
      this.guardarChatEnStorage();
      this.intercambioService.enviarMensaje(this.idIntercambio, nuevoMsg.texto).subscribe();
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
      const nuevoMsg: MensajeChat = {
        remitente: this.usuarioActual,
        texto: `He retirado de la solicitud el libro "${libroRetirado.titulo}".`,
        hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      this.historialMensajes.push(nuevoMsg);
      this.guardarChatEnStorage();
      this.intercambioService.enviarMensaje(this.idIntercambio, nuevoMsg.texto).subscribe();
    }
    this.cdr.detectChanges();
  }

  /*
    Guarda los cambios de la oferta cumpliendo las reglas de negocio
    y sincronizando físicamente con el backend Node.js
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
    this.cifradoService.guardarEnStorageSeguroSync('oferta_activa', this.ofertaActiva);

    // Enviar modificación física al Backend
    this.intercambioService.modificarOferta(this.idIntercambio, {
      librosOfrecidos: this.ofertaActiva.librosOfrecidos,
      librosSolicitados: this.ofertaActiva.librosSolicitados
    }).subscribe(res => {
      if (res?.error) {
        alert(`Advertencia al sincronizar con el servidor: ${res.error}`);
      } else {
        alert('✅ ¡Oferta de intercambio modificada y enviada al lector con éxito!');
      }
    });
  }

  /*
    Cancela y descarta el intercambio activo, limpiando los registros y liberando el libro
  */
  public cancelarIntercambio(): void {
    if (confirm('¿Estás seguro de que deseas cancelar este intercambio? Deberás seleccionar un libro nuevamente desde el catálogo.')) {
      this.intercambioService.cancelarOferta(this.idIntercambio).subscribe();
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

    const texto = this.mensajeInput.trim();
    const horaActual = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const nuevoMensaje: MensajeChat = {
      remitente: this.usuarioActual,
      texto,
      hora: horaActual
    };

    this.historialMensajes.push(nuevoMensaje);
    this.guardarChatEnStorage();
    this.mensajeInput = '';
    this.cdr.detectChanges();

    // Enviar al Backend en tiempo real
    this.intercambioService.enviarMensaje(this.idIntercambio, texto).subscribe(res => {
      if (res?.error) {
        console.warn('Error al enviar mensaje al servidor:', res.error);
      }
    });
  }

  public irAlCatalogo(): void {
    this.router.navigate(['/catalogo']);
  }

  private guardarOferta(): void {
    localStorage.setItem('oferta_activa', JSON.stringify(this.ofertaActiva));
    localStorage.setItem(`oferta_${this.idIntercambio}`, JSON.stringify(this.ofertaActiva));

    // Sincronizar en segundo plano con el backend
    this.intercambioService.modificarOferta(this.idIntercambio, {
      librosOfrecidos: this.ofertaActiva.librosOfrecidos,
      librosSolicitados: this.ofertaActiva.librosSolicitados
    }).subscribe();
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
    return [];
  }

  private obtenerInventarioOtroPorDefecto(): Libro[] {
    return [];
  }

  private obtenerUsuarioActual(): string {
    return this.intercambioService.obtenerUsuarioActual();
  }
}

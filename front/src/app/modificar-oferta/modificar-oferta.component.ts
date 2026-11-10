import { Component, ElementRef, ViewChild, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Libro, OfertaIntercambio } from '../modelos/intercambio.model';

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
export class ModificarOfertaComponent implements AfterViewChecked {
  
  @ViewChild('scrollChat') private scrollChatContainer!: ElementRef;

  public usuarioActual: string = "UsuarioA";
  public idIntercambio: string = "INT-2026-01";
  
  // Inventario real del usuario logueado
  public inventarioPersonal: Libro[] = [];
  
  // Inventario real del otro usuario (para solicitar agregar/retirar sus libros)
  public inventarioDelOtroUsuario: Libro[] = [];

  public ofertaActiva: OfertaIntercambio = new OfertaIntercambio(
    this.idIntercambio, 
    this.usuarioActual, 
    "UsuarioB",
    [], 
    [], 
    "Pendiente"
  );

  public mensajeInput: string = "";
  public maxLengthMensaje: number = 250;
  public historialMensajes: MensajeChat[] = [];

  constructor() {
    this.cargarDatosReales();
  }

  ngAfterViewChecked(): void {
    this.scrollToBottom();
  }

  private cargarDatosReales(): void {
    // 1. Cargar inventario personal del usuario
    const inventarioGuardado = localStorage.getItem('inventario_usuario');
    if (inventarioGuardado) {
      this.inventarioPersonal = JSON.parse(inventarioGuardado);
    } else {
      this.inventarioPersonal = [
        new Libro("L1", "Cien años de soledad", "Gabriel García Márquez", true),
        new Libro("L2", "Don Quijote de la Mancha", "Miguel de Cervantes", true)
      ];
      localStorage.setItem('inventario_usuario', JSON.stringify(this.inventarioPersonal));
    }

    // 2. Cargar inventario del otro usuario
    const inventarioOtroGuardado = localStorage.getItem('inventario_UsuarioB');
    if (inventarioOtroGuardado) {
      this.inventarioDelOtroUsuario = JSON.parse(inventarioOtroGuardado);
    } else {
      this.inventarioDelOtroUsuario = [
        new Libro("L3", "El Principito", "Antoine de Saint-Exupéry", true),
        new Libro("L4", "1984", "George Orwell", true),
        new Libro("L5", "Fahrenheit 451", "Ray Bradbury", true)
      ];
      localStorage.setItem('inventario_UsuarioB', JSON.stringify(this.inventarioDelOtroUsuario));
    }

    // 3. Cargar oferta activa
    const ofertaGuardada = localStorage.getItem(`oferta_${this.idIntercambio}`);
    if (ofertaGuardada) {
      this.ofertaActiva = JSON.parse(ofertaGuardada);
    } else {
      this.ofertaActiva.librosOfrecidos = [this.inventarioPersonal[0]];
      this.ofertaActiva.librosSolicitados = [this.inventarioDelOtroUsuario[2]];
      this.guardarOferta();
    }

    // 4. Cargar chat
    const chatGuardado = localStorage.getItem(`chat_${this.idIntercambio}`);
    if (chatGuardado) {
      this.historialMensajes = JSON.parse(chatGuardado);
    } else {
      this.historialMensajes = [
        { remitente: "UsuarioB", texto: "¡Hola! Me interesa realizar este intercambio.", hora: "10:00 a. m." }
      ];
      this.guardarChatEnBaseDeDatos();
    }
  }

  private guardarChatEnBaseDeDatos(): void {
    localStorage.setItem(`chat_${this.idIntercambio}`, JSON.stringify(this.historialMensajes));
  }

  public guardarOferta(): void {
    localStorage.setItem(`oferta_${this.idIntercambio}`, JSON.stringify(this.ofertaActiva));
  }

  // Añadir libro desde el inventario propio
  public agregarLibroPropio(libro: Libro): void {
    const yaExiste = this.ofertaActiva.librosOfrecidos.some(l => l.id === libro.id);
    if (!yaExiste) {
      this.ofertaActiva.librosOfrecidos.push(libro);
      this.guardarOferta();
    }
  }

  // Retirar libro propio de la oferta
  public retirarLibroPropio(idLibro: string): void {
    this.ofertaActiva.librosOfrecidos = this.ofertaActiva.librosOfrecidos.filter(l => l.id !== idLibro);
    this.guardarOferta();
  }

  // Solicitar agregar un libro del inventario del otro usuario
  public solicitarAgregarLibroAjeno(libro: Libro): void {
    const yaSolicitado = this.ofertaActiva.librosSolicitados.some(l => l.id === libro.id);
    if (!yaSolicitado) {
      this.ofertaActiva.librosSolicitados.push(libro);
      this.guardarOferta();
      this.historialMensajes.push({
        remitente: this.usuarioActual,
        texto: `Solicitud de modificación: He pedido agregar a la oferta tu libro "${libro.titulo}".`,
        hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
      this.guardarChatEnBaseDeDatos();
    }
  }

  // Solicitar retirar un libro del inventario del otro usuario
  public solicitarRetirarLibroAjeno(idLibro: string): void {
    const libroRetirado = this.ofertaActiva.librosSolicitados.find(l => l.id === idLibro);
    this.ofertaActiva.librosSolicitados = this.ofertaActiva.librosSolicitados.filter(l => l.id !== idLibro);
    this.guardarOferta();
    
    if (libroRetirado) {
      this.historialMensajes.push({
        remitente: this.usuarioActual,
        texto: `Solicitud de modificación: He pedido retirar de la oferta el libro "${libroRetirado.titulo}".`,
        hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
      this.guardarChatEnBaseDeDatos();
    }
  }

  public enviarMensaje(): void {
    if (!this.mensajeInput || !this.mensajeInput.trim()) return;
    
    if (this.mensajeInput.length > this.maxLengthMensaje) {
      alert("El mensaje excede el límite de caracteres permitidos.");
      return;
    }

    const horaActual = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    this.historialMensajes.push({
      remitente: this.usuarioActual,
      texto: this.mensajeInput.trim(),
      hora: horaActual
    });

    this.guardarChatEnBaseDeDatos();
    this.mensajeInput = "";
  }

  private scrollToBottom(): void {
    try {
      if (this.scrollChatContainer) {
        this.scrollChatContainer.nativeElement.scrollTop = this.scrollChatContainer.nativeElement.scrollHeight;
      }
    } catch (err) {}
  }

  public guardarModificacionOferta(): void {
    if (this.ofertaActiva.librosOfrecidos.length === 0) {
      alert("Debe ofrecer al menos un libro de su inventario.");
      return;
    }
    this.guardarOferta();
    alert("¡Modificación de oferta guardada y notificada con éxito!");
  }
}
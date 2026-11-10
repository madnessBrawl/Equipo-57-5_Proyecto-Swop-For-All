import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

class PropuestaIntercambio {
  constructor(
    public ofertante: string,
    public receptor: string,
    public libroOfrecidoId: string,
    public libroSolicitadoId: string,
    public estado: string = 'Pendiente'
  ) {}

  public validarReglasNegocio(): string | null {
    if (!this.ofertante) return 'Debe iniciar sesión para realizar una oferta.';
    if (!this.libroOfrecidoId) return 'Debe seleccionar un libro de su inventario personal.';
    if (!this.libroSolicitadoId) return 'Debe especificar el libro que desea solicitar.';
    if (this.ofertante === this.receptor) return 'No puede realizar un intercambio consigo mismo.';
    return null;
  }
}

@Component({
  selector: 'app-enviar-oferta',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './enviar-oferta.html', 
  styleUrls: ['./estilos-enviar-oferta.css']
})
export class EnviarOfertaComponent {
    get libroOfrecido(): any {
        return this.misLibrosDisponibles.find(l => l.id === this.libroOfrecidoId);
    }
  public usuarioActual: string = JSON.parse(localStorage.getItem('usuarioLogueado') || 'null')?.usuario ?? 'lector_activo';
  
  public misLibrosDisponibles: any[] = [
    { id: 'lib_propio_1', titulo: 'Cien Años de Soledad', autor: 'Gabriel García Márquez' },
    { id: 'lib_propio_2', titulo: 'Doña Bárbara', autor: 'Rómulo Gallegos' }
  ];

  public libroSolicitado: any = { 
    id: 'lib_global_55', 
    titulo: 'La Vorágine', 
    propietario: 'carlos_lector' 
  };

  public libroOfrecidoId: string = '';
  public ofertaEnviada: boolean = false;
  public mensajeTipo: 'exito' | 'error' | null = null;
  public mensajeTexto: string = '';

  public enviarOferta(): void {
    const propuesta = new PropuestaIntercambio(
      this.usuarioActual,
      this.libroSolicitado.propietario,
      this.libroOfrecidoId,
      this.libroSolicitado.id
    );

    const error = propuesta.validarReglasNegocio();
    if (error) {
      this.mensajeTipo = 'error';
      this.mensajeTexto = error;
      return;
    }

    this.mensajeTipo = 'exito';
    this.mensajeTexto = '¡Oferta enviada con éxito! Se registró el intercambio como Pendiente y se notificó al receptor.';
    this.ofertaEnviada = true;

    console.log('[Objeto Propuesta Registrado]:', propuesta);
  }

  public cancelar(): void {
    window.history.back();
  }

  public irAIntercambios(): void {
    window.location.reload();
  }
}
import { Component } from '@angular/core';
import { Libro, OfertaIntercambio } from '../modelos/intercambio.model';

@Component({
  selector: 'app-modificar-oferta',
  standalone: true,
  imports: [],
  templateUrl: './modificar-oferta.component.html',
  styleUrls: ['./modificar-oferta.component.css']
})
export class ModificarOfertaComponent {
  
  public inventarioPersonal: Libro[] = [
    new Libro("L1", "Cien años de soledad", "Gabriel García Márquez", true),
    new Libro("L2", "Don Quijote de la Mancha", "Miguel de Cervantes", true)
  ];

  public ofertaActiva: OfertaIntercambio = new OfertaIntercambio(
    "INT-2026-01", 
    "UsuarioA", 
    "UsuarioB",
    [this.inventarioPersonal[0]], 
    [], 
    "Pendiente"
  );

  // Función para agregar un libro propio a la oferta
  public agregarLibroPropio(libro: Libro): void {
    if (!libro.disponible) {
      alert("Este libro no está disponible en tu inventario.");
      return;
    }
    const yaExiste = this.ofertaActiva.librosOfrecidos.some(l => l.id === libro.id);
    if (!yaExiste) {
      this.ofertaActiva.librosOfrecidos.push(libro);
    }
  }

  // Función para retirar un libro propio de la oferta
  public retirarLibroPropio(idLibro: string): void {
    this.ofertaActiva.librosOfrecidos = this.ofertaActiva.librosOfrecidos.filter(l => l.id !== idLibro);
  }

  // Función para guardar los cambios de la oferta
  public guardarModificacionOferta(): void {
    if (this.ofertaActiva.librosOfrecidos.length === 0) {
      alert("Debe ofrecer al menos un libro propio.");
      return;
    }
    localStorage.setItem(`oferta_${this.ofertaActiva.idIntercambio}`, JSON.stringify(this.ofertaActiva));
    alert("¡Modificación de oferta guardada con éxito!");
  }
}
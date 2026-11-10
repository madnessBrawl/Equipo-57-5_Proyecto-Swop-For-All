import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-explorar-catalogo',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './explorar-catalogo.html',
  styleUrls: ['./estilos-explorar-catalogo.css']
})
export class ExplorarCatalogoComponent {
  public filtroBusqueda: string = '';

  // Catálogo global simulado con libros disponibles en la comunidad
  public catalogoLibros: any[] = [
    { id: 'lib_global_55', titulo: 'La Vorágine', autor: 'José Eustasio Rivera', propietario: 'carlos_lector' },
    { id: 'lib_global_56', titulo: 'Doña Bárbara', autor: 'Rómulo Gallegos', propietario: 'maria_books' },
    { id: 'lib_global_57', titulo: 'Cien Años de Soledad', autor: 'Gabriel García Márquez', propietario: 'ana_lectora' }
  ];

  constructor(private router: Router) {}

  // Getter seguro que filtra libros por título o autor
  get librosFiltrados(): any[] {
    if (!this.filtroBusqueda || !this.filtroBusqueda.trim()) {
      return this.catalogoLibros;
    }
    const termino = this.filtroBusqueda.toLowerCase();
    return this.catalogoLibros.filter(libro =>
      libro.titulo.toLowerCase().includes(termino) ||
      libro.autor.toLowerCase().includes(termino)
    );
  }

  // Redirige al flujo de enviar oferta guardando los datos del libro elegido
  public solicitarIntercambio(libro: any): void {
    sessionStorage.setItem('libroSolicitado', JSON.stringify(libro));
    this.router.navigate(['/enviar-oferta']);
  }
}
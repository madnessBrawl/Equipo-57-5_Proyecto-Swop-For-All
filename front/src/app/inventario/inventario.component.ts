import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Libro } from '../modelos/intercambio.model';
import { GoogleBooksService, RespuestaAñadirLibro } from '../servicios/google-books.service';

@Component({
  selector: 'app-inventario',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './inventario.component.html',
  styleUrl: './inventario.component.css'
})
export class InventarioComponent implements OnInit {
  usuarioActual: string | null = null;
  libros: Libro[] = [];
  cargando = false;
  guardando = false;
  mostrarFormulario = false;
  mensaje = '';
  error = '';

  titulo = '';
  autor = '';
  descripcion = '';
  isbn = '';
  categoria = '';

  constructor(
    private readonly router: Router,
    private readonly librosService: GoogleBooksService
  ) {}

  ngOnInit(): void {
    try {
      const sesion = JSON.parse(localStorage.getItem('usuarioLogueado') || 'null') as { usuario?: string } | null;
      this.usuarioActual = sesion?.usuario?.trim() || null;
    } catch {
      this.usuarioActual = null;
    }

    if (!this.usuarioActual) {
      this.router.navigate(['/']);
      return;
    }
    this.cargarInventario();
  }

  cargarInventario(): void {
    if (!this.usuarioActual) return;
    this.cargando = true;
    this.error = '';
    this.librosService.obtenerInventarioUsuario(this.usuarioActual).subscribe({
      next: libros => {
        this.libros = libros;
        this.cargando = false;
      },
      error: () => {
        this.error = 'No se pudo cargar el inventario. Verifique que el servidor esté disponible e inténtelo de nuevo.';
        this.cargando = false;
      }
    });
  }

  agregarLibro(): void {
    if (!this.usuarioActual || !this.titulo.trim()) {
      this.error = 'El título del libro es obligatorio.';
      return;
    }

    const libro = new Libro(
      '',
      this.titulo.trim(),
      this.autor.trim(),
      true,
      '',
      this.descripcion.trim(),
      this.isbn.trim(),
      this.categoria.trim() || 'General'
    );

    this.guardando = true;
    this.mensaje = '';
    this.error = '';
    this.librosService.añadirLibroAInventario(libro, this.usuarioActual).subscribe({
      next: respuesta => {
        this.libros = [this.convertirLibro(respuesta), ...this.libros];
        this.limpiarFormulario();
        this.mostrarFormulario = false;
        this.mensaje = 'Libro añadido a tu inventario.';
        this.guardando = false;
      },
      error: () => {
        this.error = 'No se pudo guardar el libro. Verifique los datos y vuelva a intentarlo.';
        this.guardando = false;
      }
    });
  }

  private convertirLibro(respuesta: RespuestaAñadirLibro): Libro {
    const libro = respuesta.libro;
    return new Libro(
      libro.id,
      libro.titulo,
      libro.autores?.join(', ') || 'Autor Desconocido',
      libro.disponible,
      libro.portadaUrl || '',
      libro.descripcion || '',
      libro.isbn || '',
      libro.categorias?.[0] || 'General'
    );
  }

  private limpiarFormulario(): void {
    this.titulo = '';
    this.autor = '';
    this.descripcion = '';
    this.isbn = '';
    this.categoria = '';
  }
}

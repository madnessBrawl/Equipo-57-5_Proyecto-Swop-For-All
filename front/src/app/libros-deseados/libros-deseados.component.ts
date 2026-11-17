import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { LibroDeseado, LibrosDeseadosService } from './libros-deseados.service';

@Component({
  selector: 'app-libros-deseados',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './libros-deseados.component.html',
  styleUrl: './libros-deseados.component.css'
})
export class LibrosDeseadosComponent implements OnInit {
  usuarioActual: string | null = null;
  libros: LibroDeseado[] = [];
  cargando = false;
  guardando = false;
  mostrarFormulario = false;
  titulo = '';
  autor = '';
  anio: number | null = null;
  intentoGuardar = false;
  mensajeError = '';
  mensajeExito = '';
  idEliminando: string | null = null;

  constructor(
    private readonly router: Router,
    private readonly librosDeseadosService: LibrosDeseadosService,
    private readonly changeDetector: ChangeDetectorRef
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
    this.cargarLibros();
  }

  cargarLibros(): void {
    const usuario = this.usuarioActual;
    if (!usuario) return;
    this.cargando = true;
    this.mensajeError = '';
    this.librosDeseadosService.obtener(usuario).pipe(
      finalize(() => {
        this.cargando = false;
        this.changeDetector.markForCheck();
      })
    ).subscribe({
      next: libros => {
        if (!Array.isArray(libros)) {
          this.mensajeError = 'El servidor devolvió una lista de libros no válida.';
          return;
        }
        this.libros = libros;
      },
      error: error => this.mensajeError = this.mensajeErrorDe(error, 'No se pudo cargar tu lista de libros deseados.')
    });
  }

  agregarLibro(): void {
    const usuario = this.usuarioActual;
    const titulo = this.titulo.trim();
    this.intentoGuardar = true;
    this.mensajeError = '';
    this.mensajeExito = '';
    if (!usuario) return;
    if (!titulo) {
      this.mensajeError = 'El título del libro es obligatorio.';
      return;
    }
    if (this.anio !== null && (!Number.isInteger(Number(this.anio)) || Number(this.anio) < 0 || Number(this.anio) > 9999)) {
      this.mensajeError = 'El año debe ser un número entero válido.';
      return;
    }

    this.guardando = true;
    this.librosDeseadosService.agregar(usuario, {
      titulo,
      autor: this.autor.trim(),
      anio: this.anio === null ? null : Number(this.anio)
    }).pipe(
      finalize(() => {
        this.guardando = false;
        this.changeDetector.markForCheck();
      })
    ).subscribe({
      next: libro => {
        this.libros = [libro, ...this.libros.filter(actual => actual.id !== libro.id)];
        this.titulo = '';
        this.autor = '';
        this.anio = null;
        this.intentoGuardar = false;
        this.mostrarFormulario = false;
        this.mensajeExito = 'Libro añadido a tu lista de deseados.';
      },
      error: error => this.mensajeError = this.mensajeErrorDe(error, 'No se pudo guardar el libro deseado.')
    });
  }

  eliminarLibro(libro: LibroDeseado): void {
    const usuario = this.usuarioActual;
    if (!usuario || this.idEliminando) return;
    this.idEliminando = libro.id;
    this.mensajeError = '';
    this.mensajeExito = '';
    this.librosDeseadosService.eliminar(usuario, libro.id).pipe(
      finalize(() => {
        this.idEliminando = null;
        this.changeDetector.markForCheck();
      })
    ).subscribe({
      next: () => {
        this.libros = this.libros.filter(actual => actual.id !== libro.id);
        this.mensajeExito = 'Libro eliminado de tu lista de deseados.';
      },
      error: error => this.mensajeError = this.mensajeErrorDe(error, 'No se pudo eliminar el libro deseado.')
    });
  }

  private mensajeErrorDe(error: unknown, predeterminado: string): string {
    if (error instanceof HttpErrorResponse) {
      if (typeof error.error?.error === 'string') return error.error.error;
      if (error.status === 0) return 'No se pudo comunicar con el servidor. Comprueba que la aplicación siga ejecutándose.';
      return `El servidor respondió con el estado ${error.status}.`;
    }
    return predeterminado;
  }
}

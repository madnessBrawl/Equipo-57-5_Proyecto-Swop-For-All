import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
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
  mostrarConfirmacion = false;
  tituloLibroAnadido = '';
  error = '';
  private versionInventario = 0;

  titulo = '';
  autor = '';
  descripcion = '';
  isbn = '';
  categoria = '';

  constructor(
    private readonly router: Router,
    private readonly librosService: GoogleBooksService,
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
    const inventarioEnCache = this.librosService.obtenerInventarioEnCache(this.usuarioActual);
    if (inventarioEnCache !== null) {
      this.libros = inventarioEnCache;
      this.cargarInventario(true);
    } else {
      this.cargarInventario();
    }
  }

  cargarInventario(silencioso = false): void {
    const usuario = this.usuarioActual;
    if (!usuario) return;
    const versionConsulta = this.versionInventario;
    if (!silencioso) this.cargando = true;
    this.error = '';
    this.librosService.obtenerInventarioUsuario(usuario).subscribe({
      next: libros => {
        if (versionConsulta !== this.versionInventario) return;
        this.libros = libros;
        this.librosService.actualizarInventarioEnCache(usuario, libros);
        this.cargando = false;
        this.changeDetector.markForCheck();
      },
      error: (error: unknown) => {
        if (versionConsulta !== this.versionInventario) return;
        const hayInventarioEnCache = this.librosService.obtenerInventarioEnCache(usuario) !== null;
        this.error = hayInventarioEnCache
          ? 'No fue posible actualizar el inventario; se muestran los últimos datos cargados.'
          : this.mensajeErrorInventario(error);
        this.cargando = false;
        this.changeDetector.markForCheck();
      }
    });
  }

  agregarLibro(): void {
    const usuario = this.usuarioActual;
    if (!usuario || !this.titulo.trim()) {
      this.error = 'El título del libro es obligatorio.';
      return;
    }

    const isbn = this.isbn.trim();
    if (isbn && !/^\d{13}$/.test(isbn)) {
      this.error = 'El ISBN debe tener exactamente 13 dígitos.';
      return;
    }

    const libro = new Libro(
      '',
      this.titulo.trim(),
      this.autor.trim(),
      true,
      '',
      this.descripcion.trim(),
      isbn,
      this.categoria.trim() || 'General'
    );

    this.guardando = true;
    this.error = '';
    this.librosService.añadirLibroAInventario(libro, usuario).pipe(
      finalize(() => {
        this.guardando = false;
        this.changeDetector.markForCheck();
      })
    ).subscribe({
      next: respuesta => {
        const libroAñadido = this.convertirLibro(respuesta);
        this.versionInventario += 1;
        this.libros = [libroAñadido, ...this.libros.filter(actual => actual.id !== libroAñadido.id)];
        this.librosService.actualizarInventarioEnCache(usuario, this.libros);
        this.cargando = false;
        this.tituloLibroAnadido = libroAñadido.titulo;
        this.limpiarFormulario();
        this.mostrarFormulario = false;
        this.error = '';
        this.mostrarConfirmacion = true;
        this.changeDetector.markForCheck();
      },
      error: (error: unknown) => {
        const mensajeServidor = error instanceof HttpErrorResponse && typeof error.error?.error === 'string'
          ? error.error.error
          : null;
        this.error = mensajeServidor ||
          (error instanceof Error && error.name !== 'TimeoutError' ? error.message : '') ||
          'No se recibió confirmación del backend. Revise el inventario antes de volver a intentarlo.';
        this.changeDetector.markForCheck();
      }
    });
  }

  volverAlInventario(): void {
    this.mostrarConfirmacion = false;
  }

  private mensajeErrorInventario(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const mensajeServidor = error.error?.error;
      if (typeof mensajeServidor === 'string') return mensajeServidor;
      if (error.status === 0) {
        return 'No se pudo comunicar con el backend. Compruebe que la aplicación siga ejecutándose.';
      }
      return `El backend respondió con el estado ${error.status} al cargar el inventario.`;
    }
    if (error instanceof Error && error.name === 'TimeoutError') {
      return 'La consulta del inventario tardó demasiado. Inténtelo de nuevo.';
    }
    return 'No se pudo cargar el inventario.';
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

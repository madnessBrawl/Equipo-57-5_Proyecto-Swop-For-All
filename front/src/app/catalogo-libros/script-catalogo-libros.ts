/* ==========================================================================
   ARCHIVO: script-catalogo-libros.ts (FRONTEND: front/src/app/catalogo-libros/)
   Componente: CatalogoLibrosComponent
   Función: Orquesta la vista del Catálogo Global de Libros.
   ========================================================================== */

import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { Libro, OfertaIntercambio } from '../modelos/intercambio.model';
import { GoogleBooksService } from '../servicios/google-books.service';
import { CifradoService } from '../servicios/cifrado.service';
import { IntercambioService } from '../servicios/intercambio.service';

/* ---------- Clase de Dominio: ItemCatalogo (POO) ---------- */
export class ItemCatalogo {
  constructor(
    public libro: Libro,
    public propietario: string,
    public disponible: boolean = true
  ) {}
}

@Component({
  selector: 'app-catalogo-libros',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './catalogo-libros.component.html',
  styleUrls: ['./estilos-catalogo-libros.css']
})
export class CatalogoLibrosComponent implements OnInit {

  // Variables reactivas de estado de la interfaz
  public terminoBusqueda: string = '';
  public errorCatalogo = '';
  public listaLibrosCatalogo: ItemCatalogo[] = [];
  public libroSeleccionadoModal: ItemCatalogo | null = null;
  public categoriaSeleccionada: string = 'Todos';
  private catalogoCompleto: ItemCatalogo[] = [];

  // Categorías literarias oficiales permitidas por la comunidad (Restricción 3.8 del Brief)
  public readonly categoriasDisponibles: string[] = [
    'Todos',
    'Ficción',
    'Clásicos',
    'Novela',
    'Ciencia Ficción',
    'Fantasía',
    'Poesía'
  ];

  constructor(
    private router: Router,
    private googleBooksService: GoogleBooksService,
    private cifradoService: CifradoService,
    private intercambioService: IntercambioService,
    private readonly changeDetector: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.cargarCatalogo();
  }

  /*
    Obtiene el nombre de usuario del logueado actualmente en la sesión.
  */
  private obtenerUsuarioActual(): string {
    try {
      const sesion = JSON.parse(localStorage.getItem('usuarioLogueado') || 'null');
      return sesion?.usuario || '';
    } catch {
      return '';
    }
  }

  /*
    Verifica si el usuario logueado tiene al menos un libro en su inventario personal.
    Bloquea el inicio del intercambio si el inventario está vacío.
  */
  private tieneLibrosEnInventario(): boolean {
    const usuario = this.obtenerUsuarioActual();
    try {
      const inventario = JSON.parse(localStorage.getItem(`inventario_${usuario}`) || '[]');
      return Array.isArray(inventario) && inventario.length > 0;
    } catch {
      return false;
    }
  }

  public puedeSolicitar(item: ItemCatalogo): boolean {
    return Boolean(item.propietario) &&
      item.propietario.toLowerCase() !== this.obtenerUsuarioActual().toLowerCase() &&
      item.libro.disponible;
  }

  public cargarCatalogo(): void {
    this.errorCatalogo = '';
    this.catalogoCompleto = [];
    this.aplicarFiltros();

    this.googleBooksService.obtenerCatalogoGlobal().subscribe({
      next: librosBackend => {
        this.catalogoCompleto = librosBackend.map(item =>
          new ItemCatalogo(item.libro, item.propietario, item.libro.disponible)
        );
        this.aplicarFiltros();
        this.changeDetector.markForCheck();
      },
      error: () => {
        this.errorCatalogo = 'No se pudo cargar el catálogo de libros.';
        this.changeDetector.markForCheck();
      }
    });
  }

  private aplicarFiltros(): void {
    const usuarioActual = this.obtenerUsuarioActual().toLowerCase();
    let filtrados = this.catalogoCompleto.filter(item =>
      item.propietario.toLowerCase() !== usuarioActual
    );
    if (this.categoriaSeleccionada && this.categoriaSeleccionada !== 'Todos') {
      filtrados = filtrados.filter(item =>
        item.libro.categoria.toLowerCase() === this.categoriaSeleccionada.toLowerCase()
      );
    }
    if (this.terminoBusqueda && this.terminoBusqueda.trim()) {
      const termino = this.terminoBusqueda.toLowerCase().trim();
      filtrados = filtrados.filter(item =>
        item.libro.titulo.toLowerCase().includes(termino) ||
        item.libro.autor.toLowerCase().includes(termino) ||
        item.libro.descripcion.toLowerCase().includes(termino) ||
        item.libro.isbn.toLowerCase().includes(termino)
      );
    }
    this.listaLibrosCatalogo = filtrados;
  }

  public ejecutarBusqueda(): void {
    this.aplicarFiltros();
  }

  public seleccionarCategoria(categoria: string): void {
    this.categoriaSeleccionada = categoria;
    this.terminoBusqueda = '';
    this.aplicarFiltros();
  }

  public restablecerCatalogo(): void {
    this.terminoBusqueda = '';
    this.categoriaSeleccionada = 'Todos';
    this.aplicarFiltros();
  }

  /*
    Abre el modal con los detalles completos del libro
  */
  public abrirModalDetalle(item: ItemCatalogo): void {
    this.libroSeleccionadoModal = item;
  }

  /*
    Cierra la ventana emergente de detalles
  */
  public cerrarModalDetalle(): void {
    this.libroSeleccionadoModal = null;
  }

  /*
    Inicia una solicitud de intercambio para el libro seleccionado.
  */
  public iniciarSolicitudIntercambio(item: ItemCatalogo): void {
    // REGLA DE NEGOCIO: No se puede iniciar un intercambio si el inventario propio está vacío
    if (!this.tieneLibrosEnInventario()) {
      alert('⚠️ No puedes solicitar un intercambio porque tu inventario está vacío.\n\nDirígete a "Inventario" en el menú y agrega libros propios antes de intercambiar.');
      return;
    }

    if (!this.puedeSolicitar(item)) {
      alert('Solo puedes solicitar libros disponibles de otro usuario.');
      return;
    }

    // Preparar y registrar en el backend la solicitud para que ambos participantes la vean.
    const idIntercambio = `INT-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const usuarioEmisor = this.obtenerUsuarioActual();
    const oferta = new OfertaIntercambio(
      idIntercambio,
      usuarioEmisor, // Usuario emisor: el logueado actualmente en sesión
      item.propietario,
      [], // Inicia estrictamente VACÍO en la parte del usuario
      [item.libro], // El libro seleccionado del catálogo
      'Pendiente'
    );

    // 2. RNF Seguridad / Confidencialidad: Guardar los datos cifrados con ncrypt-js
    this.cifradoService.guardarEnStorageSeguroSync('oferta_activa', oferta);
    this.cifradoService.guardarEnStorageSeguroSync('libro_solicitado', item.libro);

    // Guardar en almacenamiento para interoperabilidad
    sessionStorage.setItem('libroSolicitado', JSON.stringify({
      id: item.libro.id,
      titulo: item.libro.titulo,
      autor: item.libro.autor,
      portadaUrl: item.libro.portadaUrl,
      propietario: item.propietario
    }));
    localStorage.setItem(`oferta_${idIntercambio}`, JSON.stringify(oferta));
    localStorage.setItem('oferta_activa', JSON.stringify(oferta));
    localStorage.setItem('oferta_activa_id', idIntercambio);

    // 3. Sincronizar físicamente con el backend Node.js
    this.intercambioService.crear(oferta, usuarioEmisor).subscribe({
      next: (ofertaGuardada: any) => {
        const idGenerado = ofertaGuardada?.idIntercambio || ofertaGuardada?.id || idIntercambio;
        oferta.idIntercambio = idGenerado;
        const ofertaParaGuardar = ofertaGuardada || oferta;
        localStorage.setItem(`oferta_${idGenerado}`, JSON.stringify(ofertaParaGuardar));
        localStorage.setItem('oferta_activa', JSON.stringify(ofertaParaGuardar));
        localStorage.setItem('oferta_activa_id', idGenerado);

        this.cerrarModalDetalle();
        this.router.navigate(['/modificar-oferta'], {
          queryParams: { id: idGenerado }
        });
      },
      error: (error: unknown) => {
        const mensaje = error instanceof HttpErrorResponse && typeof error.error?.error === 'string'
          ? error.error.error
          : 'No se pudo registrar la solicitud. Inténtalo nuevamente.';
        alert(mensaje);
      }
    });
  }
}

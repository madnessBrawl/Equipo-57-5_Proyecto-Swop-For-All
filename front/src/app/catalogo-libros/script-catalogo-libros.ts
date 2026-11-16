/* ==========================================================================
   ARCHIVO: script-catalogo-libros.ts (FRONTEND: front/src/app/catalogo-libros/)
   Componente: CatalogoLibrosComponent
   Función: Orquesta la vista del Catálogo Global de Libros, permitiendo explorar
            libros de prueba almacenados en JSON local y buscar en tiempo real
            mediante Google Books API, con persistencia y cifrado ncrypt-js.
   Arquitectura: Basado en componentes y capas del modelo C4 (Diseño 3.pdf).
   ========================================================================== */

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Libro, OfertaIntercambio } from '../modelos/intercambio.model';
import { GoogleBooksService, ResultadoCatalogo } from '../servicios/google-books.service';
import { CifradoService } from '../servicios/cifrado.service';
import { LIBROS_PRUEBA_JSON, LibroJSON, inicializarInventariosDesdeJSON } from '../datos/libros-prueba';

/* ---------- Clase de Dominio: ItemCatalogo (POO) ---------- */
export class ItemCatalogo {
  constructor(
    public libro: Libro,
    public propietario: string,
    public disponible: boolean = true,
    public origen: 'json' | 'google' = 'json'
  ) {}

  // Serialización a objeto DTO
  public toJSON() {
    return {
      libro: this.libro,
      propietario: this.propietario,
      disponible: this.disponible,
      origen: this.origen
    };
  }
}

/* ---------- Clase de Dominio: FiltroBusqueda (POO) ---------- */
export class FiltroBusqueda {
  constructor(
    public termino: string = '',
    public categoria: string = 'Todos',
    public pagina: number = 1,
    public limitePorPagina: number = 12
  ) {}

  public get indiceInicio(): number {
    return (this.pagina - 1) * this.limitePorPagina;
  }
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
  public estaCargando: boolean = false;
  public modoContingenciaActivo: boolean = false;
  public listaLibrosCatalogo: ItemCatalogo[] = [];
  public libroSeleccionadoModal: ItemCatalogo | null = null;

  // Origen de datos activo: 'json' (libros locales de prueba) o 'google' (Google Books API)
  public origenActivo: 'json' | 'google' = 'json';

  // Variables de paginación y filtrado
  public paginaActual: number = 1;
  public readonly limitePorPagina: number = 12;
  public categoriaSeleccionada: string = 'Todos';

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

  // Lista de miembros comunitarios demo
  private readonly miembrosComunidadDemo: string[] = [
    'carlos_lector',
    'maria_books',
    'pedro_libros',
    'ana_lectora',
    'luis_novelas',
    'sofia_literatura'
  ];

  constructor(
    private router: Router,
    private googleBooksService: GoogleBooksService,
    private cifradoService: CifradoService
  ) {}

  /*
    Ciclo de vida inicial del componente: carga inicialmente los libros desde el JSON
  */
  ngOnInit(): void {
    // Inicializar inventarios de todos los usuarios desde el JSON (incluye usuario_local)
    // Garantiza que localStorage tenga los datos correctos antes de cargar el catálogo
    inicializarInventariosDesdeJSON();
    this.cargarCatalogo();
  }

  /*
    Obtiene el nombre de usuario del logueado actualmente en la sesión.
    Retorna 'usuario_local' como valor por defecto si no hay sesión activa.
  */
  private obtenerUsuarioActual(): string {
    try {
      const sesion = JSON.parse(localStorage.getItem('usuarioLogueado') || 'null');
      return sesion?.usuario || 'usuario_local';
    } catch {
      return 'usuario_local';
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

  /*
    Carga el catálogo según el origen activo (JSON local o Google Books API)
  */
  public cargarCatalogo(): void {
    if (this.origenActivo === 'json') {
      this.cargarDesdeJson();
    } else {
      this.cargarDesdeGoogleBooks();
    }
  }

  /*
    Carga los libros de prueba almacenados en el archivo JSON
  */
  public cargarDesdeJson(): void {
    this.estaCargando = false;
    this.modoContingenciaActivo = false;

    let filtrados = [...LIBROS_PRUEBA_JSON];

    // Filtro por categoría literaria
    if (this.categoriaSeleccionada && this.categoriaSeleccionada !== 'Todos') {
      filtrados = filtrados.filter(item =>
        item.categoria.toLowerCase() === this.categoriaSeleccionada.toLowerCase()
      );
    }

    // Filtro por término de búsqueda (título, autor o descripción)
    if (this.terminoBusqueda && this.terminoBusqueda.trim()) {
      const t = this.terminoBusqueda.toLowerCase().trim();
      filtrados = filtrados.filter(item =>
        item.titulo.toLowerCase().includes(t) ||
        item.autor.toLowerCase().includes(t) ||
        item.descripcion.toLowerCase().includes(t) ||
        item.isbn.toLowerCase().includes(t)
      );
    }

    // Mapeo a instancias POO ItemCatalogo
    this.listaLibrosCatalogo = filtrados.map((item: LibroJSON) => {
      const libro = new Libro(
        item.id,
        item.titulo,
        item.autor,
        item.disponible,
        item.portadaUrl,
        item.descripcion,
        item.isbn,
        item.categoria
      );
      return new ItemCatalogo(libro, item.propietario, item.disponible, 'json');
    });

    // Guardar copia cifrada con ncrypt-js
    this.guardarCopiaSeguraEnCache(this.listaLibrosCatalogo);
  }

  /*
    Consulta Google Books API utilizando la categoría y término activos
  */
  public cargarDesdeGoogleBooks(): void {
    this.estaCargando = true;
    this.modoContingenciaActivo = false;

    const filtro = new FiltroBusqueda(
      this.terminoBusqueda,
      this.categoriaSeleccionada,
      this.paginaActual,
      this.limitePorPagina
    );

    const consulta$ = (filtro.categoria !== 'Todos' && !filtro.termino)
      ? this.googleBooksService.buscarPorCategoria(filtro.categoria, filtro.limitePorPagina, filtro.indiceInicio)
      : (filtro.termino
          ? this.googleBooksService.buscarLibrosPaginados(filtro.termino, filtro.limitePorPagina, filtro.indiceInicio)
          : this.googleBooksService.obtenerCatalogoInicial(filtro.limitePorPagina, filtro.indiceInicio));

    consulta$.subscribe({
      next: (resultado: ResultadoCatalogo) => {
        if (resultado.libros.length > 0) {
          this.listaLibrosCatalogo = resultado.libros.map((libro, index) => {
            const propietario = this.miembrosComunidadDemo[index % this.miembrosComunidadDemo.length];
            return new ItemCatalogo(libro, propietario, libro.disponible, 'google');
          });
          this.guardarCopiaSeguraEnCache(this.listaLibrosCatalogo);
        } else {
          if (this.paginaActual > 1) {
            this.paginaActual--;
          } else {
            this.listaLibrosCatalogo = [];
          }
        }
        this.estaCargando = false;
      },
      error: () => {
        this.recuperarCatalogoCifradoContingencia();
        this.estaCargando = false;
      }
    });
  }

  /*
    Cambia entre el catálogo de prueba JSON y la API de Google Books
  */
  public cambiarOrigen(nuevoOrigen: 'json' | 'google'): void {
    this.origenActivo = nuevoOrigen;
    this.paginaActual = 1;
    this.cargarCatalogo();
  }

  /*
    Ejecuta una búsqueda directa al presionar 'Buscar' o dar Enter
  */
  public ejecutarBusqueda(): void {
    this.paginaActual = 1;
    this.cargarCatalogo();
  }

  /*
    Filtra por una de las categorías temáticas literarias del Brief
  */
  public seleccionarCategoria(categoria: string): void {
    this.categoriaSeleccionada = categoria;
    this.terminoBusqueda = '';
    this.paginaActual = 1;
    this.cargarCatalogo();
  }

  /*
    Restablece todos los filtros al estado inicial del catálogo
  */
  public restablecerCatalogo(): void {
    this.terminoBusqueda = '';
    this.categoriaSeleccionada = 'Todos';
    this.paginaActual = 1;
    this.cargarCatalogo();
  }

  /*
    Cambia de página (adelante o atrás)
  */
  public cambiarPagina(nuevaPagina: number): void {
    if (nuevaPagina < 1) return;
    this.paginaActual = nuevaPagina;
    this.cargarCatalogo();
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
    Inicia la solicitud de intercambio del libro seleccionado:
    - Valida que el libro esté disponible
    - Inicia con 0 libros ofrecidos (el usuario los seleccionará en intercambio)
    - Encripta los datos del libro y propuesta con CifradoService (ncrypt-js)
    - Conecta con la pantalla de modificar oferta
  */
  public iniciarSolicitudIntercambio(item: ItemCatalogo): void {
    // REGLA DE NEGOCIO: No se puede iniciar un intercambio si el inventario propio está vacío
    if (!this.tieneLibrosEnInventario()) {
      alert('⚠️ No puedes solicitar un intercambio porque tu inventario está vacío.\n\nDirígete a "Inventario" en el menú y agrega libros propios antes de intercambiar.');
      return;
    }

    if (!item.libro.disponible) {
      alert('Este libro ya se encuentra en un intercambio activo.');
      return;
    }

    // 1. Preparar la oferta orientada a objetos con 0 libros ofrecidos
    const idIntercambio = `INT-${Date.now().toString(36)}`;
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

    // Si estaba el modal abierto, cerrarlo antes de navegar
    this.cerrarModalDetalle();

    // Redirección al flujo de intercambio
    this.router.navigate(['/modificar-oferta']);
  }

  /*
    Guarda en almacenamiento local una copia de respaldo cifrada (ncrypt-js)
  */
  private guardarCopiaSeguraEnCache(items: ItemCatalogo[]): void {
    try {
      const serializado = items.map(i => i.toJSON());
      this.cifradoService.guardarEnStorageSeguroSync('catalogo_offline_cache', serializado);
    } catch (e) {
      console.warn('[CatalogoLibrosComponent] No se pudo guardar la caché cifrada:', e);
    }
  }

  /*
    Recupera el catálogo de respaldo descifrando con ncrypt-js si la API falla
  */
  private recuperarCatalogoCifradoContingencia(): void {
    const datosRecuperados = this.cifradoService.obtenerDeStorageSeguroSync<any[]>('catalogo_offline_cache');

    if (datosRecuperados && Array.isArray(datosRecuperados) && datosRecuperados.length > 0) {
      this.listaLibrosCatalogo = datosRecuperados.map(raw => {
        const l = new Libro(
          raw.libro.id,
          raw.libro.titulo,
          raw.libro.autor,
          raw.libro.disponible,
          raw.libro.portadaUrl,
          raw.libro.descripcion,
          raw.libro.isbn,
          raw.libro.categoria
        );
        return new ItemCatalogo(l, raw.propietario, raw.disponible, raw.origen || 'json');
      });
      this.modoContingenciaActivo = true;
    } else {
      // Fallback a los libros del JSON
      this.origenActivo = 'json';
      this.cargarDesdeJson();
      this.modoContingenciaActivo = true;
    }
  }
}

import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NEVER, Observable, of } from 'rxjs';
import { InventarioComponent } from './inventario.component';
import { Libro } from '../modelos/intercambio.model';
import { GoogleBooksService } from '../servicios/google-books.service';

describe('InventarioComponent', () => {
  let inventarioCache: Libro[] | null;
  let inventarioRespuesta: Observable<Libro[]>;
  let solicitudesDeAlta: number;
  let fixture: ComponentFixture<InventarioComponent>;

  beforeEach(() => {
    const valores = new Map<string, string>();
    const almacenamiento: Storage = {
      get length() { return valores.size; },
      clear: () => valores.clear(),
      getItem: clave => valores.get(clave) ?? null,
      key: indice => [...valores.keys()][indice] ?? null,
      removeItem: clave => valores.delete(clave),
      setItem: (clave, valor) => valores.set(clave, String(valor))
    };
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: almacenamiento });
    localStorage.setItem('usuarioLogueado', JSON.stringify({ usuario: 'ana' }));

    inventarioCache = null;
    inventarioRespuesta = of([]);
    solicitudesDeAlta = 0;
    const servicioMock = {
      obtenerInventarioEnCache: () => inventarioCache ? [...inventarioCache] : null,
      actualizarInventarioEnCache: (_usuario: string, libros: Libro[]) => inventarioCache = [...libros],
      obtenerInventarioUsuario: () => inventarioRespuesta,
      añadirLibroAInventario: () => {
        solicitudesDeAlta += 1;
        return of({
          mensaje: 'libro añadido exitosamente',
          libro: {
            id: 'libro-1',
            titulo: 'Rayuela',
            autores: ['Julio Cortázar'],
            disponible: true
          }
        });
      }
    };

    TestBed.configureTestingModule({
      imports: [InventarioComponent],
      providers: [
        provideRouter([]),
        { provide: GoogleBooksService, useValue: servicioMock }
      ]
    });
  });

  it('muestra el inventario en caché mientras actualiza los datos del backend', () => {
    inventarioCache = [new Libro('libro-cache', 'Libro en caché', 'Autora')];
    inventarioRespuesta = NEVER;
    fixture = TestBed.createComponent(InventarioComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Libro en caché');
    expect(fixture.componentInstance.cargando).toBe(false);
  });

  it('rechaza un ISBN que no tenga exactamente 13 dígitos', () => {
    fixture = TestBed.createComponent(InventarioComponent);
    fixture.detectChanges();
    fixture.componentInstance.titulo = 'Rayuela';
    fixture.componentInstance.isbn = '978123';

    fixture.componentInstance.agregarLibro();

    expect(fixture.componentInstance.error).toContain('exactamente 13 dígitos');
    expect(solicitudesDeAlta).toBe(0);
  });
});

import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NEVER, Observable, of, Subject } from 'rxjs';
import { CatalogoLibrosComponent } from './script-catalogo-libros';
import { Libro } from '../modelos/intercambio.model';
import { GoogleBooksService, LibroCatalogoGlobal } from '../servicios/google-books.service';
import { IntercambioService } from '../servicios/intercambio.service';

describe('CatalogoLibrosComponent', () => {
  let catalogoRespuesta: Observable<LibroCatalogoGlobal[]>;
  let fixture: ComponentFixture<CatalogoLibrosComponent>;

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
    localStorage.setItem('usuarioLogueado', JSON.stringify({ usuario: 'ana_lectora' }));
    catalogoRespuesta = NEVER;

    TestBed.configureTestingModule({
      imports: [CatalogoLibrosComponent],
      providers: [
        provideRouter([]),
        {
          provide: GoogleBooksService,
          useValue: { obtenerCatalogoGlobal: () => catalogoRespuesta }
        },
        { provide: IntercambioService, useValue: { crear: () => of({}) } }
      ]
    });
  });

  it('no muestra libros inventados mientras espera el catálogo del backend', () => {
    fixture = TestBed.createComponent(CatalogoLibrosComponent);
    fixture.detectChanges();

    const contenido = fixture.nativeElement.textContent as string;
    expect(contenido).toContain('No se encontraron libros');
    expect(contenido).not.toContain('1984');
    expect(contenido).not.toContain('Cargando catálogo compartido');
  });

  it('actualiza la lista recibida del backend sin una segunda navegación', async () => {
    const respuesta = new Subject<LibroCatalogoGlobal[]>();
    catalogoRespuesta = respuesta;
    fixture = TestBed.createComponent(CatalogoLibrosComponent);
    fixture.detectChanges();

    respuesta.next([
      {
        libro: new Libro('propio', 'Libro propio', 'Autora'),
        propietario: 'ANA_LECTORA'
      },
      {
        libro: new Libro('ajeno', 'Libro ajeno', 'Autor'),
        propietario: 'maria_books'
      }
    ]);
    await fixture.whenStable();

    const contenido = fixture.nativeElement.textContent as string;
    expect(contenido).toContain('Libro ajeno');
    expect(contenido).not.toContain('Libro propio');
  });
});

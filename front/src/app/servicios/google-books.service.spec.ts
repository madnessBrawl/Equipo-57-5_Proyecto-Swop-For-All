import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Libro } from '../modelos/intercambio.model';
import { GoogleBooksService } from './google-books.service';

describe('GoogleBooksService', () => {
  let servicio: GoogleBooksService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [GoogleBooksService, provideHttpClient(), provideHttpClientTesting()]
    });
    servicio = TestBed.inject(GoogleBooksService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  const respuestaLibro = {
    id: 'libro-1',
    titulo: 'Rayuela',
    autores: ['Julio Cortázar'],
    descripcion: '',
    portadaUrl: '',
    isbn: '',
    categorias: ['General'],
    disponible: true
  };

  it('normaliza la respuesta anidada del backend', () => {
    let idGuardado: string | undefined;
    servicio.añadirLibroAInventario(new Libro('', 'Rayuela', 'Julio Cortázar'), 'ana')
      .subscribe(respuesta => idGuardado = respuesta.libro.id);

    const request = http.expectOne('http://localhost:3000/api/libros');
    expect(request.request.method).toBe('POST');
    request.flush({ mensaje: 'libro añadido exitosamente', libro: respuestaLibro });

    expect(idGuardado).toBe('libro-1');
  });

  it('normaliza una respuesta plana para evitar dejar el formulario en guardado', () => {
    let idGuardado: string | undefined;
    servicio.añadirLibroAInventario(new Libro('', 'Rayuela', 'Julio Cortázar'), 'ana')
      .subscribe(respuesta => idGuardado = respuesta.libro.id);

    const request = http.expectOne('http://localhost:3000/api/libros');
    request.flush({ mensaje: 'libro añadido exitosamente', ...respuestaLibro });

    expect(idGuardado).toBe('libro-1');
  });

  it('rechaza respuestas que no confirman el libro persistido', () => {
    let mensajeError = '';
    servicio.añadirLibroAInventario(new Libro('', 'Rayuela', 'Julio Cortázar'), 'ana')
      .subscribe({ error: error => mensajeError = error.message });

    const request = http.expectOne('http://localhost:3000/api/libros');
    request.flush({ mensaje: 'libro añadido exitosamente' });

    expect(mensajeError).toContain('no confirmó el libro guardado');
  });
});

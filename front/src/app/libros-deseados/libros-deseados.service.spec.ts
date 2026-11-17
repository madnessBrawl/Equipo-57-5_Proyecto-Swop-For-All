import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { LibrosDeseadosService } from './libros-deseados.service';

describe('LibrosDeseadosService', () => {
  let servicio: LibrosDeseadosService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [LibrosDeseadosService, provideHttpClient(), provideHttpClientTesting()]
    });
    servicio = TestBed.inject(LibrosDeseadosService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('carga solo los libros deseados del usuario de sesión', () => {
    let titulo = '';
    servicio.obtener('ana').subscribe(libros => titulo = libros[0].titulo);

    const request = http.expectOne('http://localhost:3000/api/libros-deseados');
    expect(request.request.method).toBe('GET');
    expect(request.request.headers.get('x-usuario')).toBe('ana');
    request.flush([{ id: 'deseado-1', titulo: 'Rayuela', autor: 'Julio Cortázar', anio: 1963 }]);

    expect(titulo).toBe('Rayuela');
  });

  it('crea y elimina un libro deseado usando el identificador de sesión', () => {
    let idCreado = '';
    servicio.agregar('ana', { titulo: 'Rayuela', autor: 'Julio Cortázar', anio: 1963 })
      .subscribe(libro => idCreado = libro.id);
    const alta = http.expectOne('http://localhost:3000/api/libros-deseados');
    expect(alta.request.method).toBe('POST');
    expect(alta.request.headers.get('x-usuario')).toBe('ana');
    alta.flush({ id: 'deseado-1', titulo: 'Rayuela', autor: 'Julio Cortázar', anio: 1963 });
    expect(idCreado).toBe('deseado-1');

    servicio.eliminar('ana', idCreado).subscribe();
    const baja = http.expectOne('http://localhost:3000/api/libros-deseados/deseado-1');
    expect(baja.request.method).toBe('DELETE');
    expect(baja.request.headers.get('x-usuario')).toBe('ana');
    baja.flush({ mensaje: 'eliminado' });
  });
});

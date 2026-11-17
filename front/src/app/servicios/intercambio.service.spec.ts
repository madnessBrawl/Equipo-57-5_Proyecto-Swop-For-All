import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Libro, OfertaIntercambio } from '../modelos/intercambio.model';
import { IntercambioService } from './intercambio.service';

describe('IntercambioService', () => {
  let servicio: IntercambioService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [IntercambioService, provideHttpClient(), provideHttpClientTesting()]
    });
    servicio = TestBed.inject(IntercambioService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('registra una solicitud compartida autenticada con el usuario emisor', () => {
    const oferta = new OfertaIntercambio('INT-1', 'ana', 'maria', [], [
      new Libro('lib-1', 'Libro', 'Autora')
    ], 'Pendiente');
    let idCreado = '';

    servicio.crear(oferta, 'ana').subscribe(guardada => idCreado = guardada.idIntercambio);

    const request = http.expectOne('http://localhost:3000/api/intercambios');
    expect(request.request.method).toBe('POST');
    expect(request.request.headers.get('x-usuario')).toBe('ana');
    request.flush({ oferta });

    expect(idCreado).toBe('INT-1');
  });

  it('consulta las solicitudes del usuario para mostrar las entrantes y salientes', () => {
    let cantidad = 0;
    servicio.obtenerPorParticipante('maria').subscribe(ofertas => cantidad = ofertas.length);

    const request = http.expectOne('http://localhost:3000/api/intercambios');
    expect(request.request.method).toBe('GET');
    expect(request.request.headers.get('x-usuario')).toBe('maria');
    request.flush([{ idIntercambio: 'INT-1' }]);

    expect(cantidad).toBe(1);
  });

  it('quita una solicitud de la lista con la identidad del participante', () => {
    let mensaje = '';
    servicio.eliminarDeLista('INT-cancelada', 'ana').subscribe(respuesta => mensaje = respuesta.mensaje);

    const request = http.expectOne('http://localhost:3000/api/intercambios/INT-cancelada');
    expect(request.request.method).toBe('DELETE');
    expect(request.request.headers.get('x-usuario')).toBe('ana');
    request.flush({ mensaje: 'Intercambio cancelado eliminado.', idIntercambio: 'INT-cancelada', oculto: false });

    expect(mensaje).toBe('Intercambio cancelado eliminado.');
  });
});

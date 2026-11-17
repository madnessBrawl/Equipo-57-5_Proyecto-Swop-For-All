import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ServicioReputacion } from './servicio-reputacion';
import { Calificacion, Comentario } from './modelo-reputacion';

describe('ServicioReputacion', () => {
  let servicio: ServicioReputacion;
  let http: HttpTestingController;

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
    localStorage.clear();
    localStorage.setItem('usuarioLogueado', JSON.stringify({ usuario: 'ana', clave: 'secreta' }));
    TestBed.configureTestingModule({
      providers: [ServicioReputacion, provideHttpClient(), provideHttpClientTesting()]
    });
    servicio = TestBed.inject(ServicioReputacion);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  const crear = (extra: Partial<Calificacion> = {}) =>
    Object.assign(new Calificacion('c1', 'i1', 'lector', 'ana', 'beto', 4, new Comentario('Muy puntual')), extra);

  const plana = (extra: Partial<{
    id: string;
    tipo: 'lector' | 'intercambio';
    evaluador: string;
    evaluado: string;
    puntuacion: number;
    fecha: string;
  }> = {}) => ({
    id: 'c1',
    idIntercambio: 'i1',
    tipo: 'lector' as const,
    evaluador: 'ana',
    evaluado: 'beto',
    puntuacion: 4,
    comentario: { texto: 'Muy puntual', fecha: '2026-01-01T00:00:00.000Z' },
    ...extra
  });

  const ofertaFinalizada = {
    idIntercambio: 'i1',
    usuarioEmisor: 'ana',
    usuarioReceptor: 'beto',
    librosOfrecidos: [{ id: 'libro-a', titulo: 'A' }],
    librosSolicitados: [{ id: 'libro-b', titulo: 'B' }],
    estado: 'Finalizado',
    fechaCreacion: '2026-01-01T00:00:00.000Z',
    fechaModificacion: '2026-01-02T00:00:00.000Z',
    confirmaciones: ['ana', 'beto']
  };

  it('solo expone el nombre de usuario de la sesión', () => {
    expect(servicio.obtenerUsuarioActual()).toBe('ana');
  });

  it('registra la reseña en el backend con la sesión activa', () => {
    let resultado: { exito: boolean; mensaje: string } | undefined;
    servicio.registrarCalificacion(crear()).subscribe(valor => resultado = valor);

    const intercambios = http.expectOne(request =>
      request.url === 'http://localhost:3000/api/intercambios' &&
      request.params.get('incluirOcultas') === 'true'
    );
    expect(intercambios.request.method).toBe('GET');
    expect(intercambios.request.headers.get('x-usuario')).toBe('ana');
    intercambios.flush([ofertaFinalizada]);

    const request = http.expectOne('http://localhost:3000/api/calificaciones');
    expect(request.request.method).toBe('POST');
    expect(request.request.headers.get('x-usuario')).toBe('ana');
    request.flush({ mensaje: 'Calificacion registrada con exito' });

    expect(resultado?.exito).toBe(true);
  });

  it('obtiene desde el backend los intercambios finalizados para calificar', () => {
    let titulo = '';
    servicio.obtenerIntercambiosFinalizados('ana').subscribe(intercambios => {
      titulo = intercambios[0].libroOfrecido;
    });

    const request = http.expectOne(request =>
      request.url === 'http://localhost:3000/api/intercambios' &&
      request.params.get('incluirOcultas') === 'true'
    );
    expect(request.request.headers.get('x-usuario')).toBe('ana');
    request.flush([
      ofertaFinalizada,
      { ...ofertaFinalizada, idIntercambio: 'i2', estado: 'Pendiente' }
    ]);

    expect(titulo).toBe('A');
  });

  it('no envía una calificación si el intercambio no está finalizado', () => {
    let resultado: { exito: boolean; mensaje: string } | undefined;
    servicio.registrarCalificacion(crear()).subscribe(valor => resultado = valor);

    http.expectOne(request =>
      request.url === 'http://localhost:3000/api/intercambios' &&
      request.params.get('incluirOcultas') === 'true'
    ).flush([]);

    expect(resultado?.exito).toBe(false);
    http.expectNone('http://localhost:3000/api/calificaciones');
  });

  it('no muestra al usuario detalles técnicos de un error al guardar', () => {
    let resultado: { exito: boolean; mensaje: string } | undefined;
    servicio.registrarCalificacion(crear()).subscribe(valor => resultado = valor);
    http.expectOne(request =>
      request.url === 'http://localhost:3000/api/intercambios' &&
      request.params.get('incluirOcultas') === 'true'
    ).flush([ofertaFinalizada]);
    http.expectOne('http://localhost:3000/api/calificaciones')
      .flush({ error: 'Configure SWOP_REPUTACION_KEY antes de guardar calificaciones.' }, {
        status: 400,
        statusText: 'Bad Request'
      });

    expect(resultado?.exito).toBe(false);
    expect(resultado?.mensaje).toBe('No se pudo guardar la calificación. Intente nuevamente más tarde.');
    expect(resultado?.mensaje).not.toContain('SWOP_REPUTACION_KEY');
  });

  it('rechaza calificaciones inválidas sin enviarlas al backend', () => {
    let resultado: { exito: boolean; mensaje: string } | undefined;
    servicio.registrarCalificacion(crear({ puntuacion: 0 })).subscribe(valor => resultado = valor);

    expect(resultado?.exito).toBe(false);
    http.expectNone('http://localhost:3000/api/calificaciones');
  });

  it('consulta solo las reseñas del usuario autenticado', () => {
    let resenas: Calificacion[] = [];
    servicio.obtenerResenasEnviadas('ana').subscribe(valor => resenas = valor);

    const request = http.expectOne(url =>
      url.url === 'http://localhost:3000/api/calificaciones' &&
      url.params.get('evaluador') === 'ana'
    );
    expect(request.request.headers.get('x-usuario')).toBe('ana');
    request.flush([plana()]);

    expect(resenas.length).toBe(1);
    expect(resenas[0].comentario.texto).toBe('Muy puntual');
  });

  it('calcula el promedio consultando reseñas de tipo lector', () => {
    let promedio: number | null | undefined;
    servicio.calcularPromedio('ana').subscribe(valor => promedio = valor);

    const request = http.expectOne(url =>
      url.url === 'http://localhost:3000/api/calificaciones' &&
      url.params.get('evaluado') === 'ana' &&
      url.params.get('filtro') === 'lector'
    );
    request.flush([
      plana({ id: 'c1', evaluador: 'beto', evaluado: 'ana', puntuacion: 4 }),
      plana({ id: 'c2', evaluador: 'carla', evaluado: 'ana', puntuacion: 5 })
    ]);

    expect(promedio).toBe(4.5);
  });

  it('rechaza la consulta de reseñas de otra persona', () => {
    let error = '';
    servicio.obtenerResenas('beto').subscribe({ error: err => error = err.message });

    expect(error).toMatch(/Solo puede consultar/);
    http.expectNone('http://localhost:3000/api/calificaciones');
  });
});

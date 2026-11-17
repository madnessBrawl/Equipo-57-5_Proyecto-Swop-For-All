import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject, of } from 'rxjs';
import { ModificarOfertaComponent } from './modificar-oferta.component';
import { Libro, OfertaIntercambio } from '../modelos/intercambio.model';
import { GoogleBooksService } from '../servicios/google-books.service';
import { IntercambioService } from '../servicios/intercambio.service';

describe('ModificarOfertaComponent', () => {
  let ofertasRespuesta: Subject<OfertaIntercambio[]>;
  let fixture: ComponentFixture<ModificarOfertaComponent>;
  let eliminaciones: number;

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
    ofertasRespuesta = new Subject<OfertaIntercambio[]>();
    eliminaciones = 0;

    TestBed.configureTestingModule({
      imports: [ModificarOfertaComponent],
      providers: [
        provideRouter([]),
        {
          provide: GoogleBooksService,
          useValue: { obtenerInventarioUsuario: () => of([]) }
        },
        {
          provide: IntercambioService,
          useValue: {
            obtenerPorParticipante: () => ofertasRespuesta,
            eliminarDeLista: () => {
              eliminaciones += 1;
              return of({ mensaje: 'Intercambio eliminado.' });
            }
          }
        }
      ]
    });
  });

  it('muestra las solicitudes entrantes al llegar la primera respuesta', async () => {
    fixture = TestBed.createComponent(ModificarOfertaComponent);
    fixture.detectChanges();

    ofertasRespuesta.next([
      new OfertaIntercambio(
        'intercambio-1',
        'carlos',
        'ana',
        [],
        [new Libro('libro-1', 'Rayuela', 'Julio Cortázar')],
        'Pendiente'
      )
    ]);
    fixture.componentInstance.ngOnDestroy();
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('Solicitud recibida de');
    expect(fixture.nativeElement.textContent).toContain('carlos');
    fixture.destroy();
  });

  it('muestra la X en rojo y elimina un intercambio cancelado', async () => {
    vi.spyOn(globalThis, 'confirm').mockReturnValue(true);
    fixture = TestBed.createComponent(ModificarOfertaComponent);
    fixture.detectChanges();

    ofertasRespuesta.next([
      new OfertaIntercambio(
        'intercambio-cancelado',
        'carlos',
        'ana',
        [],
        [new Libro('libro-1', 'Rayuela', 'Julio Cortázar')],
        'Cancelada'
      )
    ]);
    fixture.componentInstance.ngOnDestroy();
    await fixture.whenStable();

    const boton = fixture.nativeElement.querySelector('.boton-quitar-oferta-lista') as HTMLButtonElement;
    expect(boton).not.toBeNull();
    expect(boton.textContent.trim()).toBe('×');
    boton.click();
    fixture.detectChanges();

    expect(eliminaciones).toBe(1);
    expect(fixture.nativeElement.querySelector('.boton-quitar-oferta-lista')).toBeNull();
    fixture.destroy();
  });

  it('muestra la X para un intercambio finalizado sin borrarlo del historial persistido', async () => {
    vi.spyOn(globalThis, 'confirm').mockReturnValue(true);
    fixture = TestBed.createComponent(ModificarOfertaComponent);
    fixture.detectChanges();

    ofertasRespuesta.next([
      new OfertaIntercambio(
        'intercambio-finalizado',
        'carlos',
        'ana',
        [new Libro('libro-2', 'Libro de Carlos', 'Autor')],
        [new Libro('libro-1', 'Rayuela', 'Julio Cortázar')],
        'Finalizado'
      )
    ]);
    fixture.componentInstance.ngOnDestroy();
    await fixture.whenStable();

    const boton = fixture.nativeElement.querySelector('.boton-quitar-oferta-lista') as HTMLButtonElement;
    expect(boton).not.toBeNull();
    expect(boton.getAttribute('aria-label')).toContain('Quitar intercambio finalizado');
    boton.click();
    fixture.detectChanges();

    expect(eliminaciones).toBe(1);
    expect(fixture.componentInstance.ofertas).toHaveLength(0);
    fixture.destroy();
  });
});

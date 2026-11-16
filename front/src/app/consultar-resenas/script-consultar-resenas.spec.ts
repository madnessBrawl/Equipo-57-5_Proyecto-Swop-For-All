import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { Subject } from 'rxjs';
import { ConsultarResenasComponent } from './script-consultar-resenas';
import { Calificacion, Comentario } from '../reputacion/modelo-reputacion';
import { ServicioReputacion } from '../reputacion/servicio-reputacion';

describe('ConsultarResenasComponent', () => {
  let fixture: ComponentFixture<ConsultarResenasComponent>;
  let respuestas: Subject<Calificacion[]>;
  let consultas: number;

  beforeEach(() => {
    respuestas = new Subject<Calificacion[]>();
    consultas = 0;
    const servicioMock = {
      obtenerUsuarioActual: () => 'ana',
      obtenerResenas: () => {
        consultas += 1;
        return respuestas.asObservable();
      }
    };

    TestBed.configureTestingModule({
      imports: [ConsultarResenasComponent],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { data: { modo: 'recibidas' } } } },
        { provide: ServicioReputacion, useValue: servicioMock }
      ]
    });
  });

  it('carga las reseñas al entrar y las muestra al recibir la respuesta', async () => {
    fixture = TestBed.createComponent(ConsultarResenasComponent);
    fixture.detectChanges();

    expect(consultas).toBe(1);
    expect(fixture.componentInstance.cargando).toBe(true);

    respuestas.next([
      new Calificacion('c1', 'i1', 'lector', 'beto', 'ana', 5, new Comentario('Excelente'))
    ]);
    respuestas.complete();
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('beto');
    expect(fixture.nativeElement.textContent).toContain('Excelente');
  });

  it('muestra el estado vacío cuando la consulta automática no encuentra reseñas', async () => {
    fixture = TestBed.createComponent(ConsultarResenasComponent);
    fixture.detectChanges();
    respuestas.next([]);
    respuestas.complete();
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('No hay reseñas para mostrar');
    expect(fixture.componentInstance.cargando).toBe(false);
  });
});

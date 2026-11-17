import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { PerfilUsuarioComponent  } from './perfil-usuario';

describe('PerfilUsuario', () => {
  let component: PerfilUsuarioComponent;
  let fixture: ComponentFixture<PerfilUsuarioComponent>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PerfilUsuarioComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()]
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(PerfilUsuarioComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    http.expectOne('http://localhost:3000/api/usuarios').flush([]);
    await fixture.whenStable();
  });

  afterEach(() => {
    http.verify();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('confirma el registro exitoso y vuelve a la pestaña de inicio de sesión', () => {
    const alertSpy = vi.fn();
    vi.stubGlobal('alert', alertSpy);
    vi.stubGlobal('confirm', vi.fn().mockReturnValue(true));
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn()
    });
    component.modoActivo = 'registro';
    component.datosRegistro = {
      usuario: 'ana',
      nombre: 'Ana',
      apellido: 'Lectora',
      clave: 'clave123',
      genero: 'Mujer',
      correo: 'ana@gmail.com'
    };
    component.generosSeleccionados = ['Fantasia'];

    component.procesarRegistroNuevo();
    http.expectOne('http://localhost:3000/api/usuarios/registro').flush({
      mensaje: 'Usuario registrado exitosamente',
      usuario: { usuario: 'ana' }
    });

    expect(alertSpy).toHaveBeenCalledWith('Cuenta registrada con exito. Ahora puedes iniciar sesion.');
    expect(component.modoActivo).toBe('login');
    expect(component.datosRegistro.usuario).toBe('');
  });
});

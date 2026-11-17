import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';

class NuevoLector {
  constructor(
    public usuario: string,
    public nombre: string,
    public apellido: string,
    public clave: string,
    public generosFavoritos: string,
    public genero: string,
    public correo: string,
    public reputacion: number = 5.0
  ) {}
}

@Component({
  selector: 'app-perfil-usuario',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './perfil-usuario.html',
  styleUrls: ['./perfil-usuario.css']
})
export class PerfilUsuarioComponent implements OnInit {
  // Estado para las Pestanas (Tabs)
  modoActivo: 'login' | 'registro' = 'login';

  // Base de datos de usuarios
  usuariosBD: NuevoLector[] = [];

  // Modelos de datos
  datosLogin = { usuario: '', clave: '' };
  datosRegistro = {
    usuario: '',
    nombre: '',
    apellido: '',
    clave: '',
    genero: '',
    correo: ''
  };

  // Lista de generos favoritos seleccionados (maximo 3)
  generosSeleccionados: string[] = [];

  // Opciones disponibles para generos favoritos
  readonly opcionesGeneros: string[] = [
    'Terror', 'Drama', 'Comedia', 'Misterio', 'Horror',
    'Fantasia', 'Ciencia-ficcion', 'Accion', 'Romance',
    'Aventura', 'Suspenso', 'Juvenil', 'Paranormal'
  ];

  // Mensaje de error/validacion visible en la interfaz
  mensajeError: string = '';

  private readonly apiUrlUsuarios = 'http://localhost:3000/api/usuarios';

  constructor(private router: Router, private http: HttpClient) {}

  ngOnInit(): void {
    // 1. Intenta cargar usuarios desde el Backend (back/Persistencia/usuarios.json)
    this.http.get<any[]>(this.apiUrlUsuarios).subscribe({
      next: (usuarios) => {
        if (Array.isArray(usuarios) && usuarios.length > 0) {
          this.usuariosBD = usuarios.map(u => new NuevoLector(
            u.usuario,
            u.nombres || u.nombre || '',
            u.apellidos || u.apellido || '',
            u.clave || '',
            u.generosFavoritos || '',
            u.genero || 'No especificado',
            u.correo || '',
            u.reputacion || 5.0
          ));
        }
      },
      error: () => {
        // Fallback local si el backend no estuviese iniciado
        const usuariosGuardados = localStorage.getItem('swop_usuarios');
        if (usuariosGuardados) {
          this.usuariosBD = JSON.parse(usuariosGuardados);
        }
      }
    });
  }

  cambiarModo(modo: 'login' | 'registro'): void {
    this.modoActivo = modo;
    this.mensajeError = '';
  }

  // Togglea un genero en la lista de seleccionados (maximo 3)
  toggleGenero(genero: string): void {
    const idx = this.generosSeleccionados.indexOf(genero);
    if (idx >= 0) {
      // Ya estaba seleccionado → deseleccionar
      this.generosSeleccionados.splice(idx, 1);
    } else {
      // No estaba → agregar solo si hay menos de 3
      if (this.generosSeleccionados.length < 3) {
        this.generosSeleccionados.push(genero);
      }
      // Si ya tiene 3, simplemente no hace nada (el maximo ya fue alcanzado)
    }
  }

  estaSeleccionado(genero: string): boolean {
    return this.generosSeleccionados.includes(genero);
  }

  iniciarSesion(): void {
    const { usuario, clave } = this.datosLogin;

    if (!usuario || !clave) {
      alert('Campo vacio, por favor llene el campo faltante.');
      return;
    }

    // Peticion al Backend para login
    this.http.post<any>(`${this.apiUrlUsuarios}/login`, { usuario, clave }).subscribe({
      next: (res) => {
        alert(`Bienvenido de nuevo, ${usuario}!`);
        this.datosLogin = { usuario: '', clave: '' };
        localStorage.setItem('usuarioLogueado', JSON.stringify(res.usuario));
        this.router.navigate(['/dashboard']);
      },
      error: () => {
        // Verificacion local ante caida o ausencia de servidor
        const usuarioEncontrado = this.usuariosBD.find(u => u.usuario === usuario);
        if (!usuarioEncontrado) {
          alert('El usuario no existe, por favor registrese.');
          return;
        }
        if (usuarioEncontrado.clave && usuarioEncontrado.clave !== clave) {
          alert('Contrasena incorrecta.');
          return;
        }
        alert(`Bienvenido de nuevo, ${usuario}!`);
        this.datosLogin = { usuario: '', clave: '' };
        localStorage.setItem('usuarioLogueado', JSON.stringify(usuarioEncontrado));
        this.router.navigate(['/dashboard']);
      }
    });
  }

  procesarRegistroNuevo(): void {
    const f = this.datosRegistro;
    this.mensajeError = '';

    // ===== VALIDACIONES EN ORDEN =====

    // 1) NOMBRE DE USUARIO
    if (!f.usuario || !f.usuario.trim()) {
      this.mensajeError = 'Solicitud no aceptada: Campo vacio';
      return;
    }
    const usuarioExiste = this.usuariosBD.some(
      u => u.usuario.toLowerCase() === f.usuario.toLowerCase().trim()
    );
    if (usuarioExiste) {
      this.mensajeError = 'Solicitud no aceptada: Este nombre ya existe';
      return;
    }

    // 2) NOMBRE
    if (!f.nombre || !f.nombre.trim()) {
      this.mensajeError = 'Solicitud no aceptada: Campo vacio';
      return;
    }

    // 3) APELLIDO
    if (!f.apellido || !f.apellido.trim()) {
      this.mensajeError = 'Solicitud no aceptada: Campo vacio';
      return;
    }

    // 4) CORREO ELECTRONICO
    if (!f.correo || !f.correo.trim()) {
      this.mensajeError = 'Solicitud no aceptada: Campo vacio';
      return;
    }
    const correoValido = f.correo.endsWith('@gmail.com') || f.correo.endsWith('@gmail.com.ve');
    if (!correoValido) {
      this.mensajeError = 'Solicitud no aceptada: correo no valido';
      return;
    }

    // 5) CONTRASENA
    if (!f.clave || !f.clave.trim()) {
      this.mensajeError = 'Solicitud no aceptada: Campo vacio';
      return;
    }
    if (f.clave.length < 6) {
      this.mensajeError = 'Contrasena invalida: Numero de caracteres insuficientes, debe tener minimo 6 caracteres';
      return;
    }
    const tieneLetras = /[a-zA-Z]/.test(f.clave);
    const tieneNumeros = /[0-9]/.test(f.clave);
    if (!tieneLetras || !tieneNumeros) {
      this.mensajeError = 'Contrasena invalida: Debe contener minimo un numero y una letra';
      return;
    }

    // 6) GENERO
    if (!f.genero) {
      this.mensajeError = 'Solicitud no aceptada: Genero no seleccionado';
      return;
    }

    // 7) GENEROS FAVORITOS
    if (this.generosSeleccionados.length === 0) {
      this.mensajeError = 'Solicitud no aceptada: Generos literarios no seleccionados';
      return;
    }

    // ===== TODAS LAS VALIDACIONES PASARON =====
    const confirmarRegistro = confirm(`Esta seguro de que deseas registrar el perfil para el usuario: ${f.usuario}?`);

    if (confirmarRegistro) {
      const generosFavoritosStr = this.generosSeleccionados.join(', ');
      const lectorRegistrado = new NuevoLector(
        f.usuario, f.nombre, f.apellido, f.clave,
        generosFavoritosStr, f.genero, f.correo
      );

      const payload = {
        usuario: f.usuario,
        nombres: f.nombre,
        apellidos: f.apellido,
        clave: f.clave,
        generosFavoritos: generosFavoritosStr,
        genero: f.genero,
        correo: f.correo,
        reputacion: 5.0
      };

      // Envia solicitud HTTP al Backend para persistir fisicamente en back/Persistencia/usuarios.json
      this.http.post<any>(`${this.apiUrlUsuarios}/registro`, payload).subscribe({
        next: (res) => {
          this.usuariosBD.push(lectorRegistrado);
          localStorage.setItem('swop_usuarios', JSON.stringify(this.usuariosBD));
          console.log('Usuario persistido en back/Persistencia/usuarios.json:', res);
          alert('Cuenta registrada con exito! Los datos fueron guardados en el archivo usuarios.json.');
          this.limpiarCampos();
        },
        error: (err) => {
          // En caso de que el backend este apagado, mantiene funcionamiento local
          this.usuariosBD.push(lectorRegistrado);
          localStorage.setItem('swop_usuarios', JSON.stringify(this.usuariosBD));
          console.log('Objeto Lector guardado en modo contingencia:', lectorRegistrado);
          alert('Cuenta registrada con exito!');
          this.limpiarCampos();
        }
      });
    }
  }

  private limpiarCampos(): void {
    this.datosRegistro = { usuario: '', nombre: '', apellido: '', clave: '', genero: '', correo: '' };
    this.generosSeleccionados = [];
    this.mensajeError = '';
  }
}

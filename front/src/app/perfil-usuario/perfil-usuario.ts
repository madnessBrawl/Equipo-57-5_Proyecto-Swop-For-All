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
  // Estado para las Pestañas (Tabs)
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
    generosFavoritos: '',
    genero: '',
    correo: ''
  };

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
  }

  iniciarSesion(): void {
    const { usuario, clave } = this.datosLogin;

    if (!usuario || !clave) {
      alert('Campo vacío, por favor llene el campo faltante.');
      return;
    }

    // Petición al Backend para login
    this.http.post<any>(`${this.apiUrlUsuarios}/login`, { usuario, clave }).subscribe({
      next: (res) => {
        alert(`¡Bienvenido de nuevo, ${usuario}!`);
        this.datosLogin = { usuario: '', clave: '' };
        localStorage.setItem('usuarioLogueado', JSON.stringify(res.usuario));
        this.router.navigate(['/dashboard']);
      },
      error: () => {
        // Verificación local ante caída o ausencia de servidor
        const usuarioEncontrado = this.usuariosBD.find(u => u.usuario === usuario);
        if (!usuarioEncontrado) {
          alert('El usuario no existe, por favor regístrese.');
          return;
        }
        if (usuarioEncontrado.clave && usuarioEncontrado.clave !== clave) {
          alert('Contraseña incorrecta.');
          return;
        }
        alert(`¡Bienvenido de nuevo, ${usuario}!`);
        this.datosLogin = { usuario: '', clave: '' };
        localStorage.setItem('usuarioLogueado', JSON.stringify(usuarioEncontrado));
        this.router.navigate(['/dashboard']);
      }
    });
  } 

  procesarRegistroNuevo(): void {
    const f = this.datosRegistro;

    if (!f.usuario || !f.nombre || !f.apellido || !f.clave || !f.genero || !f.correo) {
      alert('Error: Todos los campos del formulario (excepto géneros favoritos opcionales) son obligatorios.');
      return;
    }

    const confirmarRegistro = confirm(`¿Estás seguro de que deseas registrar el perfil para el usuario: ${f.usuario}?`);
    
    if (confirmarRegistro) {
      const lectorRegistrado = new NuevoLector(f.usuario, f.nombre, f.apellido, f.clave, f.generosFavoritos, f.genero, f.correo);

      const payload = {
        usuario: f.usuario,
        nombres: f.nombre,
        apellidos: f.apellido,
        clave: f.clave,
        generosFavoritos: f.generosFavoritos,
        genero: f.genero,
        correo: f.correo,
        reputacion: 5.0
      };

      // Envía solicitud HTTP al Backend para persistir físicamente en back/Persistencia/usuarios.json
      this.http.post<any>(`${this.apiUrlUsuarios}/registro`, payload).subscribe({
        next: (res) => {
          this.usuariosBD.push(lectorRegistrado);
          localStorage.setItem('swop_usuarios', JSON.stringify(this.usuariosBD));
          console.log('Usuario persistido en back/Persistencia/usuarios.json:', res);
          alert('¡Cuenta registrada con éxito! Los datos fueron guardados en el archivo usuarios.json.');
          this.limpiarCampos();
        },
        error: (err) => {
          // En caso de que el backend esté apagado, mantiene funcionamiento local
          this.usuariosBD.push(lectorRegistrado);
          localStorage.setItem('swop_usuarios', JSON.stringify(this.usuariosBD));
          console.log('Objeto Lector guardado en modo contingencia:', lectorRegistrado);
          alert('¡Cuenta registrada con éxito!');
          this.limpiarCampos();
        }
      });
    }
  }

  private limpiarCampos(): void {
    this.datosRegistro = { usuario: '', nombre: '', apellido: '', clave: '', generosFavoritos: '', genero: '', correo: '' };
  }
}

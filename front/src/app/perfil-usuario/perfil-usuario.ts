import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

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

  // Base de datos simulada para validación de Login
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

  constructor(private router: Router) {}

  ngOnInit(): void {
    // Cargar la base de datos simulada si existe
    const usuariosGuardados = localStorage.getItem('swop_usuarios');
    if (usuariosGuardados) {
      this.usuariosBD = JSON.parse(usuariosGuardados);
    }
    
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

    const usuarioEncontrado = this.usuariosBD.find(u => u.usuario === usuario);

    if (!usuarioEncontrado) {
      alert('El usuario no existe, por favor regístrese.');
      return;
    }

    if (usuarioEncontrado.clave !== clave) {
      alert('Contraseña incorrecta.');
      return;
    }

    alert(`¡Bienvenido de nuevo, ${usuario}!`);
    this.datosLogin = { usuario: '', clave: '' };

    this.router.navigate(['/dashboard']);
    localStorage.setItem('usuarioLogueado', JSON.stringify(usuarioEncontrado));
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
      this.usuariosBD.push(lectorRegistrado);
      localStorage.setItem('swop_usuarios', JSON.stringify(this.usuariosBD));
      console.log('Objeto Lector expandido enviado al repositorio:', lectorRegistrado);
      alert('¡Cuenta registrada con éxito! Los datos fueron agreagdos.');
      
      this.limpiarCampos();
    }
  }

  private limpiarCampos(): void {
    this.datosRegistro = { usuario: '', nombre: '', apellido: '', clave: '', generosFavoritos: '', genero: '', correo: '' };
  }
}


import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

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

  
  datosRegistro = {
    usuario: '',
    nombre: '',
    apellido: '',
    clave: '',
    generosFavoritos: '',
    genero: '',
    correo: ''
  };

  ngOnInit(): void {
    
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
      
      console.log('Objeto Lector expandido enviado al repositorio:', lectorRegistrado);
      alert('¡Cuenta registrada con éxito! Los datos fueron agreagdos.');
      
      this.limpiarCampos();
    }
  }

  private limpiarCampos(): void {
    this.datosRegistro = { usuario: '', nombre: '', apellido: '', clave: '', generosFavoritos: '', genero: '', correo: '' };
  }
}


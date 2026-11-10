import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms'; // Necesario para ngModel

@Component({
  selector: 'app-crear-comunidad',
  standalone: true,
  imports: [FormsModule], // Agregar aquí
  templateUrl: './crear-comunidad.html',
  styleUrl: './crear-comunidad.css'
})
export class CrearComunidadComponent {
  comunidad = {
    nombre: '',
    descripcion: '',
    tipo: '',
    genero: ''
  };

  constructor(private router: Router) {}

  confirmarCreacion(): void {
    // Condición 2: Validar campos vacíos[cite: 15]
    if (!this.comunidad.nombre || !this.comunidad.descripcion || !this.comunidad.tipo || !this.comunidad.genero) {
      alert('Por favor rellene todos los campos requeridos');
      return;
    }

    // Obtenemos lista global de comunidades para validar nombres únicos
    const comunidadesGlobales = JSON.parse(localStorage.getItem('comunidadesGlobales') || '[]');
    
    // Condición 1: Validar si el nombre ya existe[cite: 15]
    const nombreExiste = comunidadesGlobales.some(
      (c: any) => c.nombre.toLowerCase() === this.comunidad.nombre.trim().toLowerCase()
    );

    if (nombreExiste) {
      alert('Este nombre ya existe, por favor introduzca otro'); //[cite: 15, 17]
      return;
    }

    // Paso 4: Lógica de guardado en BD general y local
    const usuarioActual = JSON.parse(localStorage.getItem('usuarioLogueado') || '{}');
    const nuevaComunidad = {
      ...this.comunidad,
      admin: usuarioActual.usuario,
      miembros: 1 //[cite: 16] (Empieza con 1 miembro: el creador)
    };

    // Guardar en BD global
    comunidadesGlobales.push(nuevaComunidad);
    localStorage.setItem('comunidadesGlobales', JSON.stringify(comunidadesGlobales));

    // Guardar en BD del propio perfil[cite: 16]
    const misComunidades = JSON.parse(localStorage.getItem(`comunidades_${usuarioActual.usuario}`) || '[]');
    misComunidades.push(nuevaComunidad);
    localStorage.setItem(`comunidades_${usuarioActual.usuario}`, JSON.stringify(misComunidades));

    alert('Comunidad creada con éxito'); //[cite: 17]
    
    // Redirigir al espacio de la nueva comunidad
    this.router.navigate(['/espacio-comunidad']); 
  }
}
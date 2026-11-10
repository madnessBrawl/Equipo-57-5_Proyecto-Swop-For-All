import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './header/header';
import { PerfilUsuarioComponent } from './perfil-usuario/perfil-usuario';
import { Router } from '@angular/router';
@Component({
  selector: 'app-root',
  imports: [RouterOutlet,HeaderComponent,PerfilUsuarioComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('front');

  // 2. Inyectar el router como 'public' para que el HTML pueda leerlo
  constructor(public router: Router) {}
}

export class AppComponent {
  title = 'Swop For All';
}


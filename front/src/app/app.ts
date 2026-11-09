import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthComponent } from './auth/script-auth';
import { HeaderComponent } from './header/header';
import { PerfilUsuarioComponent } from './perfil-usuario/perfil-usuario';
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, AuthComponent,HeaderComponent,PerfilUsuarioComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('front');
}
export class AppComponent {
  title = 'Swop For All';
}
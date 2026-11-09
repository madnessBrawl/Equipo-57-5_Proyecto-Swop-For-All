import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './header/header';
import { PerfilUsuarioComponent } from './perfil-usuario/perfil-usuario';
@Component({
  selector: 'app-root',
  imports: [RouterOutlet,HeaderComponent,PerfilUsuarioComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('front');
}
export class AppComponent {
  title = 'Swop For All';
}
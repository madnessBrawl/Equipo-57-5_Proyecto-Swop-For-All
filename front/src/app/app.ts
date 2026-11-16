import { Component, signal } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { HeaderComponent } from './header/header';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, HeaderComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('front');
  public rutaActual = signal<string>('');

  constructor(public router: Router) {
    this.rutaActual.set(this.router.url);
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.rutaActual.set(event.urlAfterRedirects || event.url);
      }
    });
  }

  // Oculta el header global en las vistas de comunidad que tienen su propio header con botón Volver
  mostrarHeaderGlobal(): boolean {
    const rutasSinHeaderGlobal = [
      '/espacio-comunidad',
      '/ver-comunidades',
      '/mi-comunidad',
      '/mis-comunidades',
      '/crear-comunidad'
    ];
    const url = this.rutaActual();
    return !rutasSinHeaderGlobal.some(r => url.startsWith(r));
  }
}

export class AppComponent {
  title = 'Swop For All';
}



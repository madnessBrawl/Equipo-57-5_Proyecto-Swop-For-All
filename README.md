# Equipo-57-5_Proyecto-Swop-For-All
Descripción de proyecto: Aplicación web de intercambio de libros online
Entregas totales: 5
Materia: Ingeniería de software - NRC: 15657

## Iniciar la aplicación

Para que Inventario y Reputación puedan guardar en los archivos JSON, deben ejecutarse Angular y el backend Node. Desde la raíz del proyecto, ejecute `npm start`; o, desde `front`, ejecute `npm start`. El comando inicia primero el backend en el puerto 3000 y luego Angular en `http://localhost:4200`.

`npx ng serve` por sí solo inicia únicamente Angular y no puede iniciar el backend ni escribir en `back/Persistencia/libros.json`. Si prefiere seguir usando ese comando, inicie también `npm start` desde `back` en otra terminal.

## Persistencia de reputación

Las calificaciones se cifran en `back/Persistencia/calificaciones.json` con AES-256-GCM. Antes de iniciar la aplicación, configure `SWOP_REPUTACION_KEY` con un secreto aleatorio de al menos 32 caracteres y guárdelo fuera del repositorio. La clave debe mantenerse igual entre reinicios; si se pierde o cambia, no será posible descifrar las calificaciones existentes. Los datos anteriores en texto plano se cifran automáticamente al iniciar el backend con la clave configurada.

En PowerShell, genere una clave con:

```powershell
node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('base64'))"
```

Configure el valor obtenido antes de ejecutar `npm start` desde la raíz, desde `front` o al iniciar el backend manualmente desde `back`.

# Equipo-57-5_Proyecto-Swop-For-All
Descripción de proyecto: Aplicación web de intercambio de libros online
Entregas totales: 5
Materia: Ingeniería de software - NRC: 15657

## Persistencia de reputación

Las calificaciones se cifran en `back/persistencia/calificaciones.json` con AES-256-GCM. Antes de iniciar el backend, configure `SWOP_REPUTACION_KEY` con un secreto aleatorio de al menos 32 caracteres y guárdelo fuera del repositorio. La clave debe mantenerse igual entre reinicios; si se pierde o cambia, no será posible descifrar las calificaciones existentes. Los datos anteriores en texto plano se cifran automáticamente al iniciar el backend con la clave configurada.

En PowerShell, genere una clave con:

```powershell
node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('base64'))"
```

Configure el valor obtenido antes de ejecutar `npm start` en `back`.

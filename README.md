# Equipo-57-5_Proyecto-Swop-For-All
Descripción de proyecto: Aplicación web de intercambio de libros online
Entregas totales: 5
Materia: Ingeniería de software - NRC: 15657

## Iniciar la aplicación

Para que Inventario y Reputación puedan guardar en los archivos JSON, deben ejecutarse Angular y el backend Node. Desde la raíz del proyecto, ejecute `npm start`; o, desde `front`, ejecute `npm start`. El comando inicia primero el backend en el puerto 3000 y luego Angular en `http://localhost:4200`.

`npx ng serve` por sí solo inicia únicamente Angular y no puede iniciar el backend ni escribir en `back/Persistencia/libros.json`. Si prefiere seguir usando ese comando, inicie también `npm start` desde `back` en otra terminal.

## Catálogo e intercambios

Los libros añadidos al inventario se guardan en el backend y aparecen en el catálogo global. Las solicitudes del catálogo quedan visibles para ambos participantes en **Intercambiar**. Cada usuario confirma desde esa sección; al confirmar ambos, los libros cambian de propietario y el intercambio queda finalizado. Si se modifica la selección de libros, se eliminan las confirmaciones y ambos deben confirmar otra vez.

## Persistencia de reputación

Las calificaciones se cifran en `back/Persistencia/calificaciones.json` con AES-256-GCM. Para desarrollo local, el backend genera automáticamente una clave y la guarda en `back/Persistencia/.swop-reputacion-key`, excluida de Git. Conserve ese archivo entre reinicios y respaldos; si se pierde, no será posible descifrar las calificaciones existentes.

En producción, se puede proporcionar `SWOP_REPUTACION_KEY` como variable de entorno, con un secreto estable de al menos 32 caracteres. No cambie la clave mientras existan calificaciones cifradas con la anterior. Los datos anteriores en texto plano se cifran automáticamente al iniciar el backend.

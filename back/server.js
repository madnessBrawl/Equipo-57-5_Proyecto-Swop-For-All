/*
  Archivo: server.js (BACKEND: back/)
  Función: Servidor HTTP del Backend Swop-For-All.
           Recibe las solicitudes HTTPS/HTTP desde el Frontend (Angular) y las dirige
           a los Controladores correspondientes, completando el flujo MVC del diagrama.
*/

const http = require('node:http');
const url = require('node:url');

// Controladores y persistencias
const LibroController = require('./controllers/LibroController');
const UsuarioPersistencia = require('./Persistencia/UsuarioPersistencia');
const ComunidadPersistencia = require('./Persistencia/ComunidadPersistencia');
const IntercambioPersistencia = require('./Persistencia/IntercambioPersistencia');
const CalificacionPersistencia = require('./Persistencia/CalificacionPersistencia');

const libroController = new LibroController();
const usuarioPersistencia = new UsuarioPersistencia();
const comunidadPersistencia = new ComunidadPersistencia();
const intercambioPersistencia = new IntercambioPersistencia();
const calificacionPersistencia = new CalificacionPersistencia();

const PUERTO = process.env.PORT || 3000;

// Utilidad para parsear body JSON de una petición HTTP
function parsearBodyJSON(req) {
  return new Promise((resolve, reject) => {
    let cuerpo = '';
    req.on('data', fragmento => { cuerpo += fragmento; });
    req.on('end', () => {
      try {
        resolve(cuerpo ? JSON.parse(cuerpo) : {});
      } catch (err) {
        reject(new Error('Formato JSON inválido en el cuerpo de la petición.'));
      }
    });
    req.on('error', reject);
  });
}

// Utilidad para responder en formato JSON con cabeceras CORS habilitadas
function responderJSON(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-usuario'
  });
  res.end(JSON.stringify(data));
}

const servidor = http.createServer(async (req, res) => {
  // Manejo de pre-flight CORS
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-usuario'
    });
    return res.end();
  }

  const parsedUrl = url.parse(req.url, true);
  const ruta = parsedUrl.pathname;
  const metodo = req.method;
  const usuarioSesion = req.headers['x-usuario'] || null;

  try {
    /* ---------------- 1. RUTAS DE LIBROS (Diagrama de secuencia MVC) ---------------- */
    // GET /api/libros -> Catálogo global de libros
    if (metodo === 'GET' && ruta === '/api/libros') {
      const filtro = parsedUrl.query.filtro || '';
      const catalogo = libroController.obtenerCatalogoGlobal(filtro);
      return responderJSON(res, 200, catalogo);
    }

    // POST /api/libros -> Añadir libro al inventario (Front -> Controllers -> Models -> Service -> Repositorio -> Persistencia)
    if (metodo === 'POST' && ruta === '/api/libros') {
      const body = await parsearBodyJSON(req);
      const usuario = usuarioSesion || body.usuarioSesion || body.propietario;
      const respuesta = libroController.agregarLibroAInventario(body, usuario);
      return responderJSON(res, 201, respuesta);
    }

    // GET /api/libros/google -> Búsqueda externa en Google Books API
    if (metodo === 'GET' && ruta === '/api/libros/google') {
      const query = parsedUrl.query.q || '';
      const resultados = await libroController.buscarEnGoogleBooks(query);
      return responderJSON(res, 200, resultados);
    }

    // GET /api/libros/inventario/:usuario -> Inventario de un lector
    if (metodo === 'GET' && ruta.startsWith('/api/libros/inventario/')) {
      const usuario = decodeURIComponent(ruta.replace('/api/libros/inventario/', ''));
      const libros = libroController.obtenerInventarioUsuario(usuario);
      return responderJSON(res, 200, libros);
    }

    /* ---------------- 2. RUTAS DE USUARIOS / PERFIL ---------------- */
    // GET /api/usuarios -> Listar usuarios registrados
    if (metodo === 'GET' && ruta === '/api/usuarios') {
      const usuarios = usuarioPersistencia.obtenerTodos().map(u => {
        const { clave, ...publico } = u; // No exponer la clave
        return publico;
      });
      return responderJSON(res, 200, usuarios);
    }

    // POST /api/usuarios/registro -> Registrar nuevo perfil
    if (metodo === 'POST' && ruta === '/api/usuarios/registro') {
      const body = await parsearBodyJSON(req);
      if (!body.usuario || !body.clave) {
        return responderJSON(res, 400, { error: 'Usuario y clave requeridos.' });
      }
      const existente = usuarioPersistencia.buscarPorUsuario(body.usuario);
      if (existente) {
        return responderJSON(res, 409, { error: 'El usuario ya se encuentra registrado.' });
      }
      const nuevo = usuarioPersistencia.guardar(body);
      const { clave, ...perfilSeguro } = nuevo;
      return responderJSON(res, 201, { mensaje: 'Usuario registrado exitosamente', usuario: perfilSeguro });
    }

    // POST /api/usuarios/login -> Iniciar sesión
    if (metodo === 'POST' && ruta === '/api/usuarios/login') {
      const body = await parsearBodyJSON(req);
      const encontrado = usuarioPersistencia.buscarPorUsuario(body.usuario);
      if (!encontrado || encontrado.clave !== body.clave) {
        return responderJSON(res, 401, { error: 'Credenciales inválidas.' });
      }
      const { clave, ...sesion } = encontrado;
      return responderJSON(res, 200, { mensaje: 'Inicio de sesión exitoso', usuario: sesion });
    }

    /* ---------------- 3. RUTAS DE COMUNIDADES ---------------- */
    if (metodo === 'GET' && ruta === '/api/comunidades') {
      return responderJSON(res, 200, comunidadPersistencia.obtenerTodos());
    }

    if (metodo === 'POST' && ruta === '/api/comunidades') {
      const body = await parsearBodyJSON(req);
      if (comunidadPersistencia.buscarPorNombre(body.nombre)) {
        return responderJSON(res, 400, { error: 'Este nombre ya existe, por favor intente con otro' });
      }
      const guardada = comunidadPersistencia.guardar(body);
      return responderJSON(res, 201, { mensaje: 'comunidad creada con éxito', comunidad: guardada });
    }

    /* ---------------- 4. RUTAS DE INTERCAMBIOS ---------------- */
    if (metodo === 'GET' && ruta === '/api/intercambios') {
      return responderJSON(res, 200, intercambioPersistencia.obtenerTodos());
    }

    if (metodo === 'POST' && ruta === '/api/intercambios') {
      const body = await parsearBodyJSON(req);
      const guardado = intercambioPersistencia.guardar(body);
      return responderJSON(res, 201, { mensaje: 'Oferta registrada con éxito', oferta: guardado });
    }

    /* ---------------- 5. RUTAS DE CALIFICACIONES / REPUTACIÓN ---------------- */
    if (metodo === 'GET' && ruta === '/api/calificaciones') {
      const evaluado = parsedUrl.query.evaluado;
      if (evaluado) {
        return responderJSON(res, 200, calificacionPersistencia.buscarPorEvaluado(evaluado));
      }
      return responderJSON(res, 200, calificacionPersistencia.obtenerTodos());
    }

    if (metodo === 'POST' && ruta === '/api/calificaciones') {
      const body = await parsearBodyJSON(req);
      const guardada = calificacionPersistencia.guardar(body);
      return responderJSON(res, 201, { mensaje: 'Calificación registrada con éxito', calificacion: guardada });
    }

    // Ruta no encontrada
    return responderJSON(res, 404, { error: `Ruta ${metodo} ${ruta} no encontrada.` });

  } catch (error) {
    console.error(`[Servidor] Error al procesar ${metodo} ${ruta}:`, error.message);
    return responderJSON(res, 400, { error: error.message });
  }
});

// Si se ejecuta directamente desde node:
if (require.main === module) {
  servidor.listen(PUERTO, () => {
    console.log(`🚀 Servidor Swop-For-All escuchando en http://localhost:${PUERTO}`);
  });
}

module.exports = servidor;

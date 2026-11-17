/*
  Archivo: server.js (BACKEND: back/)
  FunciÃ³n: Servidor HTTP del Backend Swop-For-All.
           Recibe las solicitudes HTTPS/HTTP desde el Frontend (Angular) y las dirige
           a los Controladores correspondientes, completando el flujo MVC del diagrama.
*/

const http = require('node:http');

// Controladores y persistencias
const LibroController = require('./controllers/LibroController');
const PerfilController = require('./controllers/PerfilController');
const UsuarioPersistencia = require('./Persistencia/UsuarioPersistencia');
const ComunidadPersistencia = require('./Persistencia/ComunidadPersistencia');
const IntercambioPersistencia = require('./Persistencia/IntercambioPersistencia');
const ControladorIntercambio = require('./controllers/intercambioController');
const CalificacionPersistencia = require('./Persistencia/CalificacionPersistencia');
const ListaDeseadosPersistencia = require('./Persistencia/ListaDeseadosPersistencia');
const CifradoService          = require('./Service/CifradoService');

const { Calificacion } = require('./models/Calificacion');

const libroController = new LibroController();
const perfilController = new PerfilController();
const usuarioPersistencia = new UsuarioPersistencia();
const comunidadPersistencia = new ComunidadPersistencia();
const intercambioPersistencia = new IntercambioPersistencia();
const calificacionPersistencia = new CalificacionPersistencia();
const listaDeseadosPersistencia = new ListaDeseadosPersistencia();
const cifradoService          = new CifradoService();
const controladorIntercambio  = new ControladorIntercambio(
  intercambioPersistencia,
  cifradoService,
  libroController,
  libroController._libroService?._libroRepository
);


const PUERTO = process.env.PORT || 3000;

// Utilidad para parsear body JSON de una peticiÃ³n HTTP
function parsearBodyJSON(req) {
  return new Promise((resolve, reject) => {
    let cuerpo = '';
    req.on('data', fragmento => { cuerpo += fragmento; });
    req.on('end', () => {
      try {
        resolve(cuerpo ? JSON.parse(cuerpo) : {});
      } catch (err) {
        reject(new Error('Formato JSON invÃ¡lido en el cuerpo de la peticiÃ³n.'));
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

  const parsedUrl = new URL(req.url, 'http://localhost');
  const ruta = parsedUrl.pathname;
  const metodo = req.method;
  const usuarioSesion = req.headers['x-usuario'] || null;

  try {
    /* ---------------- 1. RUTAS DE LIBROS (Diagrama de secuencia MVC) ---------------- */
    // GET /api/libros -> CatÃ¡logo global de libros
    if (metodo === 'GET' && ruta === '/api/libros') {
      const filtro = parsedUrl.searchParams.get('filtro') || '';
      const catalogo = libroController.obtenerCatalogoGlobal(filtro);
      return responderJSON(res, 200, catalogo);
    }

    // POST /api/libros -> AÃ±adir libro al inventario (Front -> Controllers -> Models -> Service -> Repositorio -> Persistencia)
    if (metodo === 'POST' && ruta === '/api/libros') {
      const body = await parsearBodyJSON(req);
      const usuario = usuarioSesion || body.usuarioSesion || body.propietario;
      const respuesta = libroController.agregarLibroAInventario(body, usuario);
      return responderJSON(res, 201, respuesta);
    }

    // GET /api/libros/google -> BÃºsqueda externa en Google Books API
    if (metodo === 'GET' && ruta === '/api/libros/google') {
      const query = parsedUrl.searchParams.get('q') || '';
      const resultados = await libroController.buscarEnGoogleBooks(query);
      return responderJSON(res, 200, resultados);
    }

    // GET /api/libros/inventario/:usuario -> Inventario de un lector
    if (metodo === 'GET' && ruta.startsWith('/api/libros/inventario/')) {
      const usuario = decodeURIComponent(ruta.replace('/api/libros/inventario/', ''));
      const libros = libroController.obtenerInventarioUsuario(usuario);
      return responderJSON(res, 200, libros);
    }

    // Rutas de la lista personal de libros deseados
    if (ruta === '/api/libros-deseados') {
      if (!usuarioSesion || !usuarioSesion.trim()) {
        return responderJSON(res, 401, { error: 'Debe iniciar sesión para consultar su lista de libros deseados.' });
      }

      if (metodo === 'GET') {
        return responderJSON(res, 200, listaDeseadosPersistencia.buscarPorUsuario(usuarioSesion));
      }

      if (metodo === 'POST') {
        const body = await parsearBodyJSON(req);
        const libro = listaDeseadosPersistencia.agregar(usuarioSesion, body);
        return responderJSON(res, 201, libro);
      }
    }

    if (metodo === 'DELETE' && ruta.startsWith('/api/libros-deseados/')) {
      if (!usuarioSesion || !usuarioSesion.trim()) {
        return responderJSON(res, 401, { error: 'Debe iniciar sesión para modificar su lista de libros deseados.' });
      }
      const id = decodeURIComponent(ruta.replace('/api/libros-deseados/', ''));
      const eliminado = listaDeseadosPersistencia.eliminarDeUsuario(id, usuarioSesion);
      if (!eliminado) {
        return responderJSON(res, 404, { error: 'El libro deseado no existe en su lista.' });
      }
      return responderJSON(res, 200, { mensaje: 'Libro eliminado de la lista de deseados.' });
    }

    /* ---------------- 2. RUTAS DE USUARIOS / PERFIL ---------------- */
    // GET /api/usuarios -> Listar usuarios registrados
    if (metodo === 'GET' && ruta === '/api/usuarios') {
      const usuarios = usuarioPersistencia.obtenerTodos().map(u => {
        const { clave, correo, ...resto } = u;
        // Descifrar correo con ncrypt-js para retornar valor legible sin exponer la clave
        const correoLegible = correo && correo.includes('.') ? (() => { try { return cifradoService.descifrar(correo); } catch { return correo; } })() : correo;
        const publico = { ...resto, correo: correoLegible };
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
      const { clave: _c, correo: correoCifrado, ...resto } = nuevo;
      // Descifrar correo para la respuesta al cliente (nunca se devuelve la clave)
      const correoRespuesta = correoCifrado && correoCifrado.includes('.') ? (() => { try { return cifradoService.descifrar(correoCifrado); } catch { return correoCifrado; } })() : correoCifrado;
      const perfilSeguro = { ...resto, correo: correoRespuesta };
      return responderJSON(res, 201, { mensaje: 'Usuario registrado exitosamente', usuario: perfilSeguro });
    }

    // POST /api/usuarios/login -> Iniciar sesiÃ³n
    if (metodo === 'POST' && ruta === '/api/usuarios/login') {
      const body = await parsearBodyJSON(req);
      // verificarCredenciales() descifra clave/correo con ncrypt-js (AES-256-CBC)
      const perfilSeguro = usuarioPersistencia.verificarCredenciales(body.usuario, body.clave);
      if (!perfilSeguro) {
        return responderJSON(res, 401, { error: 'Credenciales inválidas.' });
      }
      return responderJSON(res, 200, { mensaje: 'Inicio de sesión exitoso', usuario: perfilSeguro });
    }

    // GET /api/perfil/:usuario -> Consultar perfil del lector
    if (metodo === 'GET' && ruta.startsWith('/api/perfil/')) {
      const usuario = decodeURIComponent(ruta.replace('/api/perfil/', ''));
      const respuesta = perfilController.obtenerPerfil(usuario);
      return responderJSON(res, respuesta.codigo, respuesta.datos || { error: respuesta.error });
    }

    // PUT /api/perfil -> Modificar datos del perfil activo
    if (metodo === 'PUT' && ruta === '/api/perfil') {
      const body = await parsearBodyJSON(req);
      const usuario = usuarioSesion || body.usuarioSesion || body.usuario;
      const respuesta = perfilController.actualizarPerfil(usuario, body);
      return responderJSON(res, respuesta.codigo, respuesta.datos || { error: respuesta.error });
    }

    /* ---------------- 3. RUTAS DE COMUNIDADES ---------------- */
    // GET /api/comunidades -> Listar todas las comunidades disponibles
    if (metodo === 'GET' && ruta === '/api/comunidades') {
      return responderJSON(res, 200, comunidadPersistencia.obtenerTodos());
    }

    // GET /api/comunidades/mis-comunidades/:usuario -> Comunidades creadas por el lector
    if (metodo === 'GET' && ruta.startsWith('/api/comunidades/mis-comunidades/')) {
      const usuario = decodeURIComponent(ruta.replace('/api/comunidades/mis-comunidades/', ''));
      const misComunidades = comunidadPersistencia.buscarPorCreador(usuario);
      return responderJSON(res, 200, misComunidades);
    }

    // GET /api/comunidades/:id -> Obtener detalle de una comunidad
    if (metodo === 'GET' && ruta.startsWith('/api/comunidades/') && !ruta.includes('/unir') && !ruta.includes('/mensajes')) {
      const id = ruta.replace('/api/comunidades/', '');
      const comunidad = comunidadPersistencia.buscarPorId(id);
      if (!comunidad) {
        return responderJSON(res, 404, { error: 'Comunidad no encontrada.' });
      }
      return responderJSON(res, 200, comunidad);
    }

    // POST /api/comunidades -> Crear nueva comunidad
    if (metodo === 'POST' && ruta === '/api/comunidades') {
      const body = await parsearBodyJSON(req);
      if (!body.nombre || !body.descripcion || !body.genero) {
        return responderJSON(res, 400, { error: 'Nombre, descripción y género son requeridos.' });
      }
      if (comunidadPersistencia.buscarPorNombre(body.nombre)) {
        return responderJSON(res, 400, { error: 'Este nombre ya existe, por favor intente con otro' });
      }

      const creador = usuarioSesion || body.creador || body.admin || 'usuario_activo';
      const nueva = {
        id: body.id || `com_${Date.now().toString(36)}`,
        nombre: body.nombre.trim(),
        descripcion: body.descripcion.trim(),
        genero: body.genero,
        tipo: body.tipo || 'publico',
        creador: creador,
        administradores: [creador],
        miembros: [creador],
        maxMiembros: 20,
        fechaCreacion: new Date().toISOString(),
        mensajes: []
      };

      const guardada = comunidadPersistencia.guardar(nueva);
      return responderJSON(res, 201, { mensaje: 'comunidad creada con éxito', comunidad: guardada });
    }

    // POST /api/comunidades/:id/unir -> Unirse a una comunidad
    if (metodo === 'POST' && ruta.startsWith('/api/comunidades/') && ruta.endsWith('/unir')) {
      const partes = ruta.split('/');
      const id = partes[3];
      const body = await parsearBodyJSON(req);
      const usuario = usuarioSesion || body.usuario;

      if (!usuario) {
        return responderJSON(res, 400, { error: 'Debe especificar el usuario que desea unirse.' });
      }

      try {
        const resultado = comunidadPersistencia.unirMiembro(id, usuario);
        return responderJSON(res, 200, {
          mensaje: resultado.yaEsMiembro ? 'Ya eres miembro de esta comunidad' : 'Te has unido exitosamente',
          comunidad: resultado.comunidad
        });
      } catch (err) {
        if (err.message === 'Comunidad llena') {
          return responderJSON(res, 400, { error: 'Comunidad llena' });
        }
        return responderJSON(res, 400, { error: err.message });
      }
    }

    // POST /api/comunidades/:id/mensajes -> Enviar mensaje al chat general de la comunidad
    if (metodo === 'POST' && ruta.startsWith('/api/comunidades/') && ruta.endsWith('/mensajes')) {
      const partes = ruta.split('/');
      const id = partes[3];
      const body = await parsearBodyJSON(req);
      const emisor = usuarioSesion || body.emisor || 'Miembro';
      const texto = body.texto || '';

      if (!texto.trim()) {
        return responderJSON(res, 400, { error: 'El mensaje no puede estar vacío.' });
      }

      const mensajeGuardado = comunidadPersistencia.agregarMensaje(id, emisor, texto);
      return responderJSON(res, 201, { mensaje: 'Mensaje enviado', data: mensajeGuardado });
    }

    /* ---------------- 4. RUTAS DE INTERCAMBIOS ---------------- */
    // GET /api/intercambios/usuario/:usuario -> Intercambios del usuario
    if (metodo === 'GET' && ruta.startsWith('/api/intercambios/usuario/')) {
      const usuario = decodeURIComponent(ruta.replace('/api/intercambios/usuario/', ''));
      const ofertas = controladorIntercambio.obtenerOfertasUsuario(usuario);
      return responderJSON(res, 200, ofertas);
    }

    // GET /api/intercambios/:id/mensajes -> Consultar historial del chat de negociación
    if (metodo === 'GET' && ruta.startsWith('/api/intercambios/') && ruta.endsWith('/mensajes')) {
      const id = ruta.replace('/api/intercambios/', '').replace('/mensajes', '');
      const mensajes = controladorIntercambio.obtenerMensajesChat(id, usuarioSesion);
      return responderJSON(res, 200, mensajes);
    }

    // POST /api/intercambios/:id/mensajes -> Enviar mensaje al chat de negociación
    if (metodo === 'POST' && ruta.startsWith('/api/intercambios/') && ruta.endsWith('/mensajes')) {
      const id = ruta.replace('/api/intercambios/', '').replace('/mensajes', '');
      const body = await parsearBodyJSON(req);
      const emisor = usuarioSesion || body.remitente || body.usuario;
      const resultado = controladorIntercambio.enviarMensajeChat(id, body, emisor);
      return responderJSON(res, 201, resultado);
    }

    // POST /api/intercambios/:id/confirmar -> Confirmar oferta
    if (metodo === 'POST' && ruta.startsWith('/api/intercambios/') && ruta.endsWith('/confirmar')) {
      if (!usuarioSesion) {
        return responderJSON(res, 401, { error: 'Debe iniciar sesión para confirmar el intercambio.' });
      }
      const idIntercambio = decodeURIComponent(ruta.slice('/api/intercambios/'.length, -'/confirmar'.length));
      const oferta = controladorIntercambio.confirmarOferta(idIntercambio, usuarioSesion);
      return responderJSON(res, 200, { oferta });
    }

    // POST /api/intercambios/:id/cancelar -> Cancelar intercambio
    if (metodo === 'POST' && ruta.startsWith('/api/intercambios/') && ruta.endsWith('/cancelar')) {
      if (!usuarioSesion) {
        return responderJSON(res, 401, { error: 'Debe iniciar sesión para cancelar el intercambio.' });
      }
      const idIntercambio = decodeURIComponent(ruta.slice('/api/intercambios/'.length, -'/cancelar'.length));
      const oferta = controladorIntercambio.cancelarOferta(idIntercambio, usuarioSesion);
      return responderJSON(res, 200, { oferta });
    }

    // GET /api/intercambios/:id -> Detalle de una oferta específica
    if (metodo === 'GET' && ruta.startsWith('/api/intercambios/') && ruta !== '/api/intercambios') {
      const id = ruta.replace('/api/intercambios/', '');
      const oferta = controladorIntercambio.obtenerOfertaPorId(id);
      if (!oferta) {
        return responderJSON(res, 404, { error: 'Intercambio no encontrado.' });
      }
      return responderJSON(res, 200, oferta);
    }

    // GET /api/intercambios -> Listar intercambios del participante o todos
    if (metodo === 'GET' && ruta === '/api/intercambios') {
      if (!usuarioSesion) {
        return responderJSON(res, 401, { error: 'Debe iniciar sesión para consultar intercambios.' });
      }
      const incluirOcultas = parsedUrl.searchParams.get('incluirOcultas') === 'true';
      return responderJSON(res, 200, controladorIntercambio.obtenerOfertasPorParticipante(
        usuarioSesion,
        { incluirOcultas }
      ));
    }

    // POST /api/intercambios -> Crear nueva oferta de intercambio desde catálogo
    if (metodo === 'POST' && ruta === '/api/intercambios') {
      if (!usuarioSesion) {
        return responderJSON(res, 401, { error: 'Debe iniciar sesión para crear una solicitud.' });
      }
      const body = await parsearBodyJSON(req);
      const emisor = usuarioSesion || body.usuarioSesion || body.usuarioEmisor || body.ofertante;
      const guardado = controladorIntercambio.crearOferta({
        id: body.id,
        idIntercambio: body.idIntercambio,
        usuarioReceptor: body.usuarioReceptor || body.receptor,
        librosOfrecidos: body.librosOfrecidos || (body.libroOfrecido ? [body.libroOfrecido] : []),
        librosSolicitados: body.librosSolicitados || (body.libroSolicitado ? [body.libroSolicitado] : []),
        mensajeInicial: body.mensajeInicial || ''
      }, emisor);
      return responderJSON(res, 201, { mensaje: 'Oferta registrada con éxito', oferta: guardado });
    }

    // PUT /api/intercambios/:id -> Modificar términos de la oferta
    if (metodo === 'PUT' && ruta.startsWith('/api/intercambios/')) {
      if (!usuarioSesion) {
        return responderJSON(res, 401, { error: 'Debe iniciar sesión para modificar una oferta.' });
      }
      const idIntercambio = decodeURIComponent(ruta.replace('/api/intercambios/', ''));
      if (idIntercambio.endsWith('/confirmar') || idIntercambio.endsWith('/cancelar')) {
        return responderJSON(res, 404, { error: `Ruta ${metodo} ${ruta} no encontrada.` });
      }
      const body = await parsearBodyJSON(req);
      const oferta = controladorIntercambio.modificarOferta(idIntercambio, body, usuarioSesion);
      return responderJSON(res, 200, { mensaje: 'Oferta modificada con éxito', oferta });
    }

    /* ---------------- 5. RUTAS DE CALIFICACIONES / REPUTACIÃ“N ---------------- */
    if (metodo === 'DELETE' && ruta.startsWith('/api/intercambios/')) {
      if (!usuarioSesion) {
        return responderJSON(res, 401, { error: 'Debe iniciar sesión para eliminar un intercambio.' });
      }
      const idIntercambio = decodeURIComponent(ruta.replace('/api/intercambios/', ''));
      const resultado = controladorIntercambio.eliminarOfertaDeLista(idIntercambio, usuarioSesion);
      const mensaje = resultado.oculto
        ? 'Intercambio quitado de tu lista; sigue disponible para calificar.'
        : 'Intercambio cancelado eliminado.';
      return responderJSON(res, 200, { mensaje, ...resultado });
    }

    if (metodo === 'GET' && ruta === '/api/calificaciones') {
      if (!usuarioSesion) {
        return responderJSON(res, 401, { error: 'Debe iniciar sesión para consultar reseñas.' });
      }

      const evaluado = parsedUrl.searchParams.get('evaluado');
      const evaluador = parsedUrl.searchParams.get('evaluador');
      if ((!evaluado && !evaluador) || (evaluado && evaluador)) {
        return responderJSON(res, 400, { error: 'Especifique si desea consultar reseñas recibidas o enviadas.' });
      }
      if ((evaluado && evaluado !== usuarioSesion) || (evaluador && evaluador !== usuarioSesion)) {
        return responderJSON(res, 403, { error: 'Solo puede consultar sus propias reseñas.' });
      }

      const filtro = parsedUrl.searchParams.get('filtro');
      const idIntercambio = parsedUrl.searchParams.get('idIntercambio');
      const tipo = evaluado ? 'evaluado' : 'evaluador';
      const resenas = calificacionPersistencia.buscarPorPredicado(calificacion =>
        calificacion[tipo] === usuarioSesion &&
        (!filtro || filtro === 'todas' || calificacion.tipo === filtro) &&
        (!idIntercambio || calificacion.idIntercambio === idIntercambio)
      );
      return responderJSON(res, 200, resenas);
    }

    if (metodo === 'POST' && ruta === '/api/calificaciones') {
      if (!usuarioSesion) {
        return responderJSON(res, 401, { error: 'Debe iniciar sesión para calificar.' });
      }
      const body = await parsearBodyJSON(req);
      if (body.evaluador && body.evaluador !== usuarioSesion) {
        return responderJSON(res, 403, { error: 'No puede calificar en nombre de otro usuario.' });
      }

      const calificacion = new Calificacion({
        ...body,
        id: body.id || `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
        evaluador: usuarioSesion
      });
      const errorValidacion = calificacion.validar();
      if (errorValidacion) {
        return responderJSON(res, 400, { error: errorValidacion });
      }

      const intercambio = controladorIntercambio.obtenerOfertaPorId(calificacion.idIntercambio);
      if (!intercambio || intercambio.estado !== 'Finalizado') {
        return responderJSON(res, 400, { error: 'Solo se pueden calificar intercambios finalizados.' });
      }
      const participantes = [intercambio.usuarioEmisor, intercambio.usuarioReceptor];
      if (!participantes.some(usuario => String(usuario).toLowerCase() === usuarioSesion.toLowerCase())) {
        return responderJSON(res, 403, { error: 'Usted no participó en este intercambio.' });
      }
      const contraparte = participantes.find(usuario =>
        String(usuario).toLowerCase() !== usuarioSesion.toLowerCase()
      );
      if (!contraparte || contraparte.toLowerCase() !== calificacion.evaluado.toLowerCase()) {
        return responderJSON(res, 400, { error: 'El lector evaluado no corresponde a este intercambio.' });
      }

      const duplicada = calificacionPersistencia.buscarPorPredicado(registro =>
        registro.evaluador === usuarioSesion &&
        registro.idIntercambio === calificacion.idIntercambio &&
        registro.tipo === calificacion.tipo
      ).length > 0;
      if (duplicada) {
        return responderJSON(res, 409, { error: 'Usted ya calificó este intercambio.' });
      }

      const guardada = calificacionPersistencia.guardar(calificacion);
      return responderJSON(res, 201, { mensaje: 'Calificacion registrada con exito', calificacion: guardada });
    }

    // Ruta no encontrada
    return responderJSON(res, 404, { error: `Ruta ${metodo} ${ruta} no encontrada.` });

  } catch (error) {
    console.error(`[Servidor] Error al procesar ${metodo} ${ruta}:`, error.message);
    const mensaje = ruta.startsWith('/api/calificaciones')
      ? 'No se pudo completar la operación de calificación. Intente nuevamente más tarde.'
      : error.message;
    return responderJSON(res, 400, { error: mensaje });
  }
});

// Si se ejecuta directamente desde node:
if (require.main === module) {
  servidor.listen(PUERTO, () => {
    console.log(`ðŸš€ Servidor Swop-For-All escuchando en http://localhost:${PUERTO}`);
  });
}

module.exports = servidor;


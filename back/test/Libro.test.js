/*
  Archivo: Libro.test.js (BACKEND: back/test/)
  Función: Pruebas unitarias automatizadas para la arquitectura orientada a objetos de Libros
           (Modelo, Servicio Google Books, Persistencia, Repositorio y Controlador).
  Ejecutar: node --test back/test/Libro.test.js
*/

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const Libro = require('../models/Libro');
const GoogleBooksService = require('../Service/GoogleBooksService');
const LibroPersistencia = require('../Persistencia/LibroPersistencia');
const LibroRepository = require('../Repositorio/LibroRepository');
const LibroController = require('../controllers/LibroController');
const CifradoService = require('../Service/CifradoService');
const OfertaIntercambio = require('../models/intercambioModel');
const ControladorIntercambio = require('../controllers/intercambioController');

/* ---------------- 1. Pruebas del Modelo Libro ---------------- */
test('Modelo Libro: Crea instancia válida con atributos y métodos', () => {
  const libro = new Libro({
    id: 'test_1',
    titulo: 'Fahrenheit 451',
    autores: ['Ray Bradbury'],
    descripcion: 'Distopía sobre la censura de libros',
    portadaUrl: 'https://example.com/cover.jpg',
    isbn: '9781451673319',
    categorias: ['Ciencia Ficción'],
    disponible: true,
    propietario: 'maria_lectora'
  });

  assert.strictEqual(libro.id, 'test_1');
  assert.strictEqual(libro.titulo, 'Fahrenheit 451');
  assert.strictEqual(libro.obtenerAutoresTexto(), 'Ray Bradbury');
  assert.strictEqual(libro.disponible, true);
  assert.strictEqual(libro.propietario, 'maria_lectora');
  assert.strictEqual(libro.validar(), null);
});

test('Modelo Libro: Falla la validación si el título está vacío', () => {
  const libroInvalido = new Libro({ titulo: '' });
  assert.strictEqual(typeof libroInvalido.validar(), 'string');
});

test('Modelo Libro: Factory desdeGoogleBooks mapea correctamente un volumen', () => {
  const volumenMock = {
    id: 'google_vol_123',
    volumeInfo: {
      title: 'Don Quijote de la Mancha',
      authors: ['Miguel de Cervantes'],
      description: 'Las aventuras del hidalgo don Quijote.',
      imageLinks: { thumbnail: 'http://books.google.com/test.jpg' },
      industryIdentifiers: [{ type: 'ISBN_13', identifier: '9788424115166' }],
      categories: ['Clásico']
    }
  };

  const libro = Libro.desdeGoogleBooks(volumenMock, 'juan_lector');
  assert.strictEqual(libro.id, 'google_vol_123');
  assert.strictEqual(libro.titulo, 'Don Quijote de la Mancha');
  assert.strictEqual(libro.obtenerAutoresTexto(), 'Miguel de Cervantes');
  assert.strictEqual(libro.isbn, '9788424115166');
  // Verifica que se haya transformado http a https
  assert.strictEqual(libro.portadaUrl.startsWith('https://'), true);
  assert.strictEqual(libro.propietario, 'juan_lector');
});

/* ---------------- 2. Pruebas de GoogleBooksService con Mock ---------------- */
test('GoogleBooksService: Consulta y mapea resultados con cliente HTTP simulado', async () => {
  const fetchMock = async (url) => {
    return {
      ok: true,
      status: 200,
      json: async () => ({
        items: [
          {
            id: 'mock_1',
            volumeInfo: {
              title: 'La Metamorfosis',
              authors: ['Franz Kafka'],
              description: 'Gregor Samsa amanece convertido en insecto.'
            }
          }
        ]
      })
    };
  };

  const service = new GoogleBooksService({ fetchClient: fetchMock });
  const resultados = await service.buscarPorTexto('Kafka');

  assert.strictEqual(resultados.length, 1);
  assert.strictEqual(resultados[0] instanceof Libro, true);
  assert.strictEqual(resultados[0].titulo, 'La Metamorfosis');
  assert.strictEqual(resultados[0].obtenerAutoresTexto(), 'Franz Kafka');
});

test('GoogleBooksService: Retorna lista vacía ante búsqueda vacía o sin resultados', async () => {
  const service = new GoogleBooksService();
  const resVacia = await service.buscarPorTexto('');
  assert.deepStrictEqual(resVacia, []);
});

/* ---------------- 3. Pruebas de Persistencia y Repositorio ---------------- */
test('LibroRepository: Obtiene catálogo global y busca por coincidencia', () => {
  const archivo = `libros-test-catalogo-${process.pid}-${Date.now()}.json`;
  const librosIniciales = [
    { id: 'lib_100', titulo: '1984', autores: ['George Orwell'], disponible: true },
    { id: 'lib_101', titulo: 'El Principito', autores: ['Antoine de Saint-Exupéry'], disponible: true }
  ];
  const persistencia = new LibroPersistencia(librosIniciales, undefined, archivo);
  const repo = new LibroRepository({ persistencia });

  try {
    const catalogo = repo.obtenerCatalogoGlobal();
    assert.strictEqual(catalogo.length, 2);
    assert.deepStrictEqual(repo.obtenerLibrosPorUsuario('carlos_lector'), []);

    const busqueda = repo.buscarEnCatalogo('Orwell');
    assert.strictEqual(busqueda.length, 1);
    assert.strictEqual(busqueda[0].titulo, '1984');
  } finally {
    fs.rmSync(path.join(__dirname, '..', 'Persistencia', archivo), { force: true });
  }
});

test('LibroRepository: Permite registrar un libro y actualizar disponibilidad', () => {
  const archivo = `libros-test-${process.pid}-${Date.now()}.json`;
  try {
    const persistencia = new LibroPersistencia([], undefined, archivo);
    const repo = new LibroRepository({ persistencia });

    const nuevo = repo.registrarLibro(new Libro({
      id: 'lib_custom_1',
      titulo: 'Crónica de una muerte anunciada',
      autores: ['Gabriel García Márquez'],
      propietario: 'andres'
    }));

    assert.strictEqual(nuevo.id, 'lib_custom_1');
    assert.strictEqual(repo.obtenerLibrosPorUsuario('andres').length, 1);

    repo.actualizarDisponibilidad('lib_custom_1', false);
    const catalogo = repo.obtenerCatalogoGlobal();
    assert.strictEqual(catalogo.find(l => l.id === 'lib_custom_1'), undefined);
  } finally {
    fs.rmSync(path.join(__dirname, '..', 'Persistencia', archivo), { force: true });
  }
});

/* ---------------- 4. Pruebas de LibroController (Reglas de Negocio) ---------------- */
test('LibroController: Exige inicio de sesión para agregar libro a inventario', () => {
  const archivo = `libros-test-${process.pid}-${Date.now()}.json`;
  try {
    const controller = new LibroController(
      new LibroRepository({ persistencia: new LibroPersistencia([], undefined, archivo) })
    );

    assert.throws(
      () => controller.agregarLibroAInventario({ titulo: 'Rayuela' }, null),
      /Debe iniciar sesión/
    );

    const libroAgregado = controller.agregarLibroAInventario(
      { titulo: 'Rayuela', autores: ['Julio Cortázar'] },
      'lector_logueado'
    );

    assert.strictEqual(libroAgregado.titulo, 'Rayuela');
    assert.strictEqual(libroAgregado.propietario, 'lector_logueado');
  } finally {
    fs.rmSync(path.join(__dirname, '..', 'Persistencia', archivo), { force: true });
  }
});

test('LibroController: Rechaza ISBN inválido y acepta un ISBN de 13 dígitos', () => {
  const archivo = `libros-test-${process.pid}-${Date.now()}.json`;
  try {
    const controller = new LibroController(
      new LibroRepository({ persistencia: new LibroPersistencia([], undefined, archivo) })
    );

    assert.throws(
      () => controller.agregarLibroAInventario(
        { titulo: 'Rayuela', isbn: '978123' },
        'lector_logueado'
      ),
      /ISBN debe tener exactamente 13 dígitos/
    );

    const libroAgregado = controller.agregarLibroAInventario(
      { titulo: 'Rayuela', isbn: '9780306406157' },
      'lector_logueado'
    );
    assert.strictEqual(libroAgregado.isbn, '9780306406157');
  } finally {
    fs.rmSync(path.join(__dirname, '..', 'Persistencia', archivo), { force: true });
  }
});

test('LibroController: Impide que un usuario modifique libros ajenos', () => {
  const archivo = `libros-test-${process.pid}-${Date.now()}.json`;
  try {
    const repo = new LibroRepository({ persistencia: new LibroPersistencia([], undefined, archivo) });
    repo.registrarLibro(new Libro({ id: 'lib_secreto', titulo: 'Libro de Juan', propietario: 'juan' }));
    const controller = new LibroController(repo);

    assert.throws(
      () => controller.actualizarDisponibilidadLibro('lib_secreto', false, 'pedro'),
      /No tiene permisos/
    );
  } finally {
    fs.rmSync(path.join(__dirname, '..', 'Persistencia', archivo), { force: true });
  }
});

/* ---------------- 5. Pruebas de Cifrado con ncrypt-js (RNF Seguridad / Confidencialidad) ---------------- */
test('CifradoService: Encripta y desencripta datos usando ncrypt-js', () => {
  const cifrado = new CifradoService('clave-prueba-123');
  const datosSensibles = { usuario: 'carlos_lector', libros: ['L100', 'L101'] };

  const textoCifrado = cifrado.cifrar(datosSensibles);
  assert.strictEqual(typeof textoCifrado, 'string');
  assert.notStrictEqual(textoCifrado, JSON.stringify(datosSensibles));
  assert.strictEqual(cifrado.esCifradoValido(textoCifrado), true);

  const datosDescifrados = cifrado.descifrar(textoCifrado);
  assert.deepStrictEqual(datosDescifrados, datosSensibles);
});

test('LibroPersistencia: Exporta e importa respaldo cifrado garantizando protección ante fallos', () => {
  const archivoOriginal = `libros-test-respaldo-original-${process.pid}-${Date.now()}.json`;
  const archivoNuevo = `libros-test-respaldo-nuevo-${process.pid}-${Date.now()}.json`;
  try {
    const persistenciaOriginal = new LibroPersistencia([
      { id: 'lib_100', titulo: '1984', autores: ['George Orwell'], disponible: true }
    ], undefined, archivoOriginal);
    const respaldoCifrado = persistenciaOriginal.exportarCifrado();
    assert.strictEqual(typeof respaldoCifrado, 'string');

    const persistenciaNueva = new LibroPersistencia([], undefined, archivoNuevo);
    assert.strictEqual(persistenciaNueva.total(), 0);
    assert.strictEqual(persistenciaNueva.importarCifrado(respaldoCifrado), 1);
    assert.notStrictEqual(persistenciaNueva.buscarPorId('lib_100'), null);
  } finally {
    fs.rmSync(path.join(__dirname, '..', 'Persistencia', archivoOriginal), { force: true });
    fs.rmSync(path.join(__dirname, '..', 'Persistencia', archivoNuevo), { force: true });
  }
});

/* ---------------- 6. Pruebas de ControladorIntercambio (POO) ---------------- */
test('ControladorIntercambio: Crea y modifica oferta orientada a objetos', () => {
  const controlador = new ControladorIntercambio(new Map());
  const oferta = controlador.crearOferta({
    usuarioReceptor: 'maria_books',
    librosOfrecidos: ['lib_propio_1'],
    librosSolicitados: ['lib_100']
  }, 'carlos_lector');

  assert.strictEqual(oferta.usuarioEmisor, 'carlos_lector');
  assert.strictEqual(oferta.usuarioReceptor, 'maria_books');
  assert.strictEqual(oferta.estado, 'Pendiente');

  // Modificar oferta
  const ofertaModificada = controlador.modificarOferta(oferta.idIntercambio, {
    librosOfrecidos: ['lib_propio_1', 'lib_propio_2']
  }, 'carlos_lector');

  assert.strictEqual(ofertaModificada.estado, 'Modificada');
  assert.strictEqual(ofertaModificada.librosOfrecidos.length, 2);
});


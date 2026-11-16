/* ==========================================================================
   ARCHIVO: libros-prueba.ts (FRONTEND: front/src/app/datos/)
   Función: Provee libros preconfigurados en formato JSON para pruebas inmediatas
            de intercambio de libros en el Catálogo Global.
   ========================================================================== */

export interface LibroJSON {
  id: string;
  titulo: string;
  autor: string;
  portadaUrl: string;
  descripcion: string;
  isbn: string;
  categoria: string;
  propietario: string;
  disponible: boolean;
}

export const LIBROS_PRUEBA_JSON: LibroJSON[] = [
  {
    id: "libro_json_01",
    titulo: "El Principito",
    autor: "Antoine de Saint-Exupéry",
    portadaUrl: "https://books.google.com/books/content?id=ylT6DwAAQBAJ&printsec=frontcover&img=1&zoom=1",
    descripcion: "Un aviador perdido en el desierto del Sahara se encuentra con un pequeño príncipe que proviene de otro asteroide. Una obra poética y filosófica sobre el amor, la amistad y el sentido de la vida.",
    isbn: "9780156013987",
    categoria: "Ficción",
    propietario: "carlos_lector",
    disponible: true
  },
  {
    id: "libro_json_02",
    titulo: "1984",
    autor: "George Orwell",
    portadaUrl: "https://books.google.com/books/content?id=cotPYEqe-rkC&printsec=frontcover&img=1&zoom=1",
    descripcion: "La inquietante novela distópica que introdujo el concepto del Gran Hermano y la Policía del Pensamiento en una sociedad totalitaria vigilada y controlada permanentemente.",
    isbn: "9780451524935",
    categoria: "Ciencia Ficción",
    propietario: "maria_books",
    disponible: true
  },
  {
    id: "libro_json_03",
    titulo: "Doña Bárbara",
    autor: "Rómulo Gallegos",
    portadaUrl: "https://books.google.com/books/content?id=t-f4DwAAQBAJ&printsec=frontcover&img=1&zoom=1",
    descripcion: "Obra cumbre de la literatura venezolana ambientada en el llano de Apure. Narra la confrontación simbólica y humana entre la civilización encarnada por Santos Luzardo y la barbarie representada por Doña Bárbara.",
    isbn: "9788437603681",
    categoria: "Clásicos",
    propietario: "ana_lectora",
    disponible: true
  },
  {
    "id": "libro_json_04",
    "titulo": "Cien Años de Soledad",
    "autor": "Gabriel García Márquez",
    "portadaUrl": "https://books.google.com/books/content?id=7hY7DwAAQBAJ&printsec=frontcover&img=1&zoom=1",
    "descripcion": "La épica historia de siete generaciones de la familia Buendía en el pueblo mítico de Macondo. Obra maestra del realismo mágico y premio Nobel de Literatura.",
    "isbn": "9780307474728",
    "categoria": "Novela",
    "propietario": "pedro_libros",
    "disponible": true
  },
  {
    "id": "libro_json_05",
    "titulo": "Fahrenheit 451",
    "autor": "Ray Bradbury",
    "portadaUrl": "https://books.google.com/books/content?id=Vz3aDwAAQBAJ&printsec=frontcover&img=1&zoom=1",
    "descripcion": "Guy Montag es un bombero cuya misión no es sofocar fuegos, sino quemar libros prohibidos por el Estado. Una reflexión contundente sobre la censura y la libertad de pensamiento.",
    "isbn": "9781451673319",
    "categoria": "Ciencia Ficción",
    "propietario": "luis_novelas",
    "disponible": true
  },
  {
    "id": "libro_json_06",
    "titulo": "La Vorágine",
    "autor": "José Eustasio Rivera",
    "portadaUrl": "https://books.google.com/books/content?id=d_U_DwAAQBAJ&printsec=frontcover&img=1&zoom=1",
    "descripcion": "Clásico hispanoamericano sobre la odisea de Arturo Cova y Alicia en los llanos colombianos y la selva amazónica durante la época de la explotación cauchera.",
    "isbn": "9788437600765",
    "categoria": "Clásicos",
    "propietario": "sofia_literatura",
    "disponible": true
  },
  {
    "id": "libro_json_07",
    "titulo": "El Señor de los Anillos: La Comunidad del Anillo",
    "autor": "J.R.R. Tolkien",
    "portadaUrl": "https://books.google.com/books/content?id=aWZzLPhY4o0C&printsec=frontcover&img=1&zoom=1",
    "descripcion": "En la Tierra Media, el joven hobbit Frodo Bolsón emprende una peligrosa travesía para destruir el Anillo Único en el Monte del Destino y salvar al mundo del Señor Oscuro Sauron.",
    "isbn": "9788445071403",
    "categoria": "Fantasía",
    "propietario": "carlos_lector",
    "disponible": true
  },
  {
    "id": "libro_json_08",
    "titulo": "Crónica de una muerte anunciada",
    "autor": "Gabriel García Márquez",
    "portadaUrl": "https://books.google.com/books/content?id=n_Q_DwAAQBAJ&printsec=frontcover&img=1&zoom=1",
    "descripcion": "Reconstrucción meticulosa del asesinato de Santiago Nasar a manos de los hermanos Vicario por un asunto de honor familiar, suceso que todo el pueblo conocía de antemano.",
    "isbn": "9780307387257",
    "categoria": "Novela",
    "propietario": "maria_books",
    "disponible": true
  },
  {
    "id": "libro_json_09",
    "titulo": "Don Quijote de la Mancha",
    "autor": "Miguel de Cervantes",
    "portadaUrl": "https://books.google.com/books/content?id=F-k_DwAAQBAJ&printsec=frontcover&img=1&zoom=1",
    "descripcion": "Las cómicas y profundas aventuras del hidalgo don Quijote y su fiel escudero Sancho Panza en busca de aventuras caballerescas y justicia en la España del siglo XVII.",
    "isbn": "9788424115166",
    "categoria": "Clásicos",
    "propietario": "pedro_libros",
    "disponible": true
  },
  {
    "id": "libro_json_10",
    "titulo": "Rayuela",
    "autor": "Julio Cortázar",
    "portadaUrl": "https://books.google.com/books/content?id=3w0_DwAAQBAJ&printsec=frontcover&img=1&zoom=1",
    "descripcion": "La contra-novela de Horacio Oliveira y La Maga entre París y Buenos Aires, diseñada con múltiples itinerarios de lectura que rompieron los esquemas de la literatura moderna.",
    "isbn": "9788466332217",
    "categoria": "Ficción",
    "propietario": "ana_lectora",
    "disponible": true
  },
  {
    "id": "libro_json_11",
    "titulo": "La Metamorfosis",
    "autor": "Franz Kafka",
    "portadaUrl": "https://books.google.com/books/content?id=cPQ_DwAAQBAJ&printsec=frontcover&img=1&zoom=1",
    "descripcion": "Gregor Samsa despierta una mañana transformado en un monstruoso insecto, desencadenando el rechazo y aislamiento de su propia familia.",
    "isbn": "9788497940252",
    "categoria": "Ficción",
    "propietario": "luis_novelas",
    "disponible": true
  },
  {
    "id": "libro_json_12",
    "titulo": "Veinte poemas de amor y una canción desesperada",
    "autor": "Pablo Neruda",
    "portadaUrl": "https://books.google.com/books/content?id=jPQ_DwAAQBAJ&printsec=frontcover&img=1&zoom=1",
    "descripcion": "El poemario juvenil más leído de la lengua española, donde Neruda canta a la pasión, la nostalgia y la despedida amorosa con lirismo inigualable.",
    "isbn": "9788437604473",
    "categoria": "Poesía",
    "propietario": "sofia_literatura",
    "disponible": true
  }
];

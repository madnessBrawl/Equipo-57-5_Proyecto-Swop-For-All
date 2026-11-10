/*
  Archivo: servicio-reputacion.spec.ts   (FRONTEND: front/src/app/reputacion/)
  Función: Pruebas automáticas (ng test) que verifican Fiabilidad, Confidencialidad y Operabilidad
           del módulo de Reputación, respondiendo a la observación de la profesora sobre los
           requisitos no funcionales "no verificables".
*/
import { ServicioReputacion } from './servicio-reputacion';
import { Calificacion, Comentario } from './modelo-reputacion';

describe('ServicioReputacion', () => {
  let servicio: ServicioReputacion;

  // Antes de cada prueba: almacenamiento limpio, sesión de "ana" y un intercambio finalizado ana-beto
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('usuarioLogueado', JSON.stringify({ usuario: 'ana', clave: 'secreta' }));
    localStorage.setItem('swop_usuarios', JSON.stringify([{ usuario: 'beto', reputacion: 5 }]));
    localStorage.setItem('swop_intercambios', JSON.stringify([
      { id: 'i1', libroOfrecido: 'A', libroSolicitado: 'B', ofertante: 'ana', receptor: 'beto', estado: 'Finalizado', fecha: '2026-01-01' },
      { id: 'i2', libroOfrecido: 'C', libroSolicitado: 'D', ofertante: 'ana', receptor: 'beto', estado: 'Pendiente', fecha: '2026-01-02' }
    ]));
    servicio = new ServicioReputacion();
  });

  // Atajo para crear calificaciones de prueba
  const crear = (extra: Partial<Calificacion> = {}) =>
    Object.assign(new Calificacion('c1', 'i1', 'lector', 'ana', 'beto', 4, new Comentario('Muy puntual')), extra);

  it('Confidencialidad: expone solo el nombre de usuario, nunca la clave', () => {
    expect(servicio.obtenerUsuarioActual()).toBe('ana');
  });

  it('Fiabilidad: guarda la calificación una sola vez y rechaza la repetida', () => {
    expect(servicio.registrarCalificacion(crear()).exito).toBe(true);
    expect(servicio.yaFueCalificado('ana', 'i1', 'lector')).toBe(true);
    const repetida = servicio.registrarCalificacion(crear({ id: 'c2' }));
    expect(repetida.exito).toBe(false);
    expect(servicio.obtenerResenas('beto').length).toBe(1);
  });

  it('Fiabilidad: una calificación inválida no se guarda', () => {
    expect(servicio.registrarCalificacion(crear({ puntuacion: 0 })).exito).toBe(false);
    expect(servicio.registrarCalificacion(crear({ puntuacion: 6 })).exito).toBe(false);
    expect(servicio.obtenerResenas('beto').length).toBe(0);
  });

  it('Reglas de negocio: autocalificación, intercambio no finalizado y no participante', () => {
    expect(servicio.registrarCalificacion(crear({ evaluado: 'ana' })).exito).toBe(false);
    expect(servicio.registrarCalificacion(crear({ idIntercambio: 'i2' })).exito).toBe(false);
    expect(servicio.registrarCalificacion(crear({ evaluador: 'carla' })).exito).toBe(false);
  });

  it('Consultar reseñas: calcula el promedio y actualiza la reputación del perfil', () => {
    expect(servicio.calcularPromedio('beto')).toBeNull(); // Sin calificaciones aún
    servicio.registrarCalificacion(crear({ puntuacion: 3 }));
    expect(servicio.calcularPromedio('beto')).toBe(3);
    const perfil = JSON.parse(localStorage.getItem('swop_usuarios')!)[0];
    expect(perfil.reputacion).toBe(3);
  });

  it('Reseñas enviadas: lista lo que el usuario calificó, separado de lo recibido', () => {
    servicio.registrarCalificacion(crear());
    expect(servicio.obtenerResenasEnviadas('ana').length).toBe(1);   // Ana envió una
    expect(servicio.obtenerResenasEnviadas('beto').length).toBe(0);  // Beto no envió ninguna
    expect(servicio.obtenerResenas('ana').length).toBe(0);           // Ana no recibió ninguna
  });

  it('Operabilidad: todo rechazo devuelve un mensaje claro', () => {
    const resultado = servicio.registrarCalificacion(crear({ puntuacion: 0 }));
    expect(resultado.mensaje.length).toBeGreaterThan(5);
  });

  it('Fiabilidad: datos dañados en el almacenamiento no rompen la consulta', () => {
    localStorage.setItem('swop_calificaciones', '{no es json');
    expect(servicio.obtenerResenas('beto')).toEqual([]);
  });
});

// src/lib/fechas.ts
// Utilidades para manejo de fechas

// Obtener fecha actual en formato YYYYMMDD
export function getFechaHoy(): string {
  const hoy = new Date();
  const año = hoy.getFullYear();
  const mes = String(hoy.getMonth() + 1).padStart(2, '0');
  const dia = String(hoy.getDate()).padStart(2, '0');
  return `${año}${mes}${dia}`;
}

// Formatear fecha de YYYYMMDD a DD/MM/YYYY
export function formatearFecha(fechaStr: string): string {
  if (fechaStr.length !== 8) return fechaStr;
  
  const año = fechaStr.substring(0, 4);
  const mes = fechaStr.substring(4, 6);
  const dia = fechaStr.substring(6, 8);
  
  return `${dia}/${mes}/${año}`;
}

// Convertir fecha DD/MM/YYYY a YYYYMMDD
export function fechaAFormatoBD(fechaFormateada: string): string {
  const partes = fechaFormateada.split('/');
  if (partes.length !== 3) return fechaFormateada;
  
  const [dia, mes, año] = partes;
  return `${año}${mes.padStart(2, '0')}${dia.padStart(2, '0')}`;
}

// Obtener todas las fechas de un mes específico (YYYYMM)
export function getFechasDelMes(añoMes: string): string[] {
  if (añoMes.length !== 6) return [];
  
  const año = parseInt(añoMes.substring(0, 4));
  const mes = parseInt(añoMes.substring(4, 6));
  
  const fechas: string[] = [];
  const diasEnMes = new Date(año, mes, 0).getDate();
  
  for (let dia = 1; dia <= diasEnMes; dia++) {
    const diaStr = String(dia).padStart(2, '0');
    fechas.push(`${año}${añoMes.substring(4, 6)}${diaStr}`);
  }
  
  return fechas;
}

// Obtener todas las fechas de un año específico (YYYY)
export function getFechasDelAño(año: string): string[] {
  if (año.length !== 4) return [];
  
  const fechas: string[] = [];
  
  for (let mes = 1; mes <= 12; mes++) {
    const mesStr = String(mes).padStart(2, '0');
    const fechasDelMes = getFechasDelMes(`${año}${mesStr}`);
    fechas.push(...fechasDelMes);
  }
  
  return fechas;
}

// Validar formato de fecha YYYYMMDD
export function esFechaValida(fecha: string): boolean {
  if (fecha.length !== 8) return false;
  
  const año = parseInt(fecha.substring(0, 4));
  const mes = parseInt(fecha.substring(4, 6));
  const dia = parseInt(fecha.substring(6, 8));
  
  if (año < 1900 || año > 2100) return false;
  if (mes < 1 || mes > 12) return false;
  if (dia < 1 || dia > 31) return false;
  
  // Verificar que la fecha existe realmente
  const fechaObj = new Date(año, mes - 1, dia);
  return fechaObj.getFullYear() === año && 
         fechaObj.getMonth() === mes - 1 && 
         fechaObj.getDate() === dia;
}

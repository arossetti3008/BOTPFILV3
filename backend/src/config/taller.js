// Datos del taller que edita el docente en contenidos/taller.json:
// comisiones, formato del código de grupo y texto del aviso inicial.

const fs = require('node:fs');
const path = require('node:path');

const RUTA_TALLER = path.join(__dirname, '..', '..', 'contenidos', 'taller.json');

function cargarTaller(ruta = RUTA_TALLER) {
  const datos = JSON.parse(fs.readFileSync(ruta, 'utf8'));

  if (!Array.isArray(datos.comisiones) || datos.comisiones.length === 0) {
    throw new Error(`${ruta}: "comisiones" tiene que ser una lista con al menos una comisión.`);
  }
  for (const c of datos.comisiones) {
    if (!c.id || !c.nombre || !/^[A-Z]$/.test(c.letra || '')) {
      throw new Error(`${ruta}: cada comisión necesita id, nombre y una letra mayúscula (ej. "M").`);
    }
  }

  let patronGrupo;
  try {
    patronGrupo = new RegExp(datos.patronGrupo || '^[MT][0-9]{1,2}$');
  } catch {
    throw new Error(`${ruta}: "patronGrupo" no es una expresión regular válida.`);
  }

  return { ...datos, patronGrupo, patronGrupoTexto: patronGrupo.source };
}

module.exports = { cargarTaller };

// Muestra un texto Markdown simple (títulos, listas, negritas, citas y
// párrafos), suficiente para la consigna. Sin dependencias y sin insertar
// HTML: todo se arma como elementos de React.

function enLinea(texto) {
  // **negrita** → <strong>
  return texto.split(/(\*\*[^*]+\*\*)/g).map((parte, i) =>
    parte.startsWith('**') && parte.endsWith('**') ? <strong key={i}>{parte.slice(2, -2)}</strong> : parte
  );
}

export default function Markdown({ texto }) {
  const bloques = [];
  let lista = null;

  const cerrarLista = () => {
    if (lista) bloques.push(lista);
    lista = null;
  };

  texto.split(/\r?\n/).forEach((linea, i) => {
    const titulo = linea.match(/^(#{1,3})\s+(.*)/);
    const item = linea.match(/^\s*(?:[-*]|\d+\.)\s+(.*)/);
    if (titulo) {
      cerrarLista();
      const Etiqueta = `h${Math.min(titulo[1].length + 1, 4)}`;
      bloques.push(<Etiqueta key={i}>{enLinea(titulo[2])}</Etiqueta>);
    } else if (item) {
      if (!lista) lista = { key: i, items: [] };
      lista.items.push(<li key={i}>{enLinea(item[1])}</li>);
    } else if (linea.startsWith('>')) {
      cerrarLista();
      bloques.push(<blockquote key={i}>{enLinea(linea.replace(/^>\s?/, ''))}</blockquote>);
    } else if (linea.trim()) {
      cerrarLista();
      bloques.push(<p key={i}>{enLinea(linea)}</p>);
    } else {
      cerrarLista();
    }
  });
  cerrarLista();

  return (
    <div className="markdown">
      {bloques.map((b) => (b.items ? <ul key={b.key}>{b.items}</ul> : b))}
    </div>
  );
}

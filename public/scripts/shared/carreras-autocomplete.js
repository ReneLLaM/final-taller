(() => {
  let cache = null;

  async function fetchCarreras() {
    if (cache) return cache;
    try {
      const res = await fetch('/api/carreras');
      if (!res.ok) throw new Error('No se pudo obtener carreras');
      const data = await res.json();
      cache = Array.isArray(data) ? data : [];
      return cache;
    } catch (err) {
      console.error('Error al cargar carreras para autocompletado:', err);
      cache = [];
      return cache;
    }
  }

  async function populateDatalist(input, datalist) {
    if (!input || !datalist) return;
    const carreras = await fetchCarreras();
    datalist.innerHTML = '';
    carreras.forEach((carrera) => {
      if (!carrera || !carrera.nombre) return;
      const option = document.createElement('option');
      option.value = carrera.nombre;
      datalist.appendChild(option);
    });
  }

  window.initCarreraAutocomplete = async function (inputId, datalistId) {
    const input =
      typeof inputId === 'string' ? document.getElementById(inputId) : inputId;
    const datalist =
      typeof datalistId === 'string'
        ? document.getElementById(datalistId)
        : datalistId;

    if (!input || !datalist) return;
    await populateDatalist(input, datalist);
  };
})();

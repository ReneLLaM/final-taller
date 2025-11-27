(() => {
  const els = {
    section: document.getElementById('votacionSection'),
    codigoInput: document.getElementById('votacionCodigoInput'),
    inscribirmeBtn: document.getElementById('votacionInscribirmeBtn'),
    message: document.getElementById('votacionMessage'),
    misAuxWrapper: document.getElementById('votacionMisAuxiliaturas'),
    misAuxEmpty: document.getElementById('votacionMisAuxiliaturasEmpty'),
    misAuxBody: document.getElementById('votacionMisAuxiliaturasBody'),
  };

  const confirmEls = {
    modal: document.getElementById('confirmQuitAuxiliaturaModal'),
    text: document.getElementById('confirmQuitAuxText'),
    message: document.getElementById('confirmQuitAuxMessage'),
    confirmBtn: document.getElementById('btnConfirmQuitAux'),
  };

  let codigoPendienteQuitar = null;

  function setMessage(type, text) {
    if (!els.message) return;
    if (!text) {
      els.message.style.display = 'none';
      return;
    }
    els.message.textContent = text;
    els.message.className = `message ${type}`;
    els.message.style.display = 'block';
  }

  function renderMisAuxiliaturas(lista) {
    const body = els.misAuxBody;
    const empty = els.misAuxEmpty;
    if (!body || !empty) return;

    if (!lista || !lista.length) {
      body.innerHTML = '';
      empty.textContent = 'Aún no estás matriculado en ninguna auxiliatura.';
      empty.style.display = 'block';
      return;
    }

    empty.style.display = 'none';

    body.innerHTML = lista.map((item, index) => {
      const nombre = item.materia_nombre || '';
      const sigla = item.sigla || '';
      const grupo = item.grupo || '';
      const auxiliar = item.auxiliar_nombre || '';
      const codigo = item.codigo || '';
      const auxMateriaId = item.auxiliar_materia_id;
      const materiaLabel = [sigla, nombre].filter(Boolean).join(' · ');
      const votacionId = item.votacion_id;
      const votacionActiva = item.votacion_activa === true;
      let votarLabel = 'Votar';
      if (votacionId && !votacionActiva) {
        votarLabel = 'Ver resultados';
      }
      const votarButtonHtml = votacionId
        ? `<button type="button" class="btn btn-primary" data-votacion-ir="${auxMateriaId}">${votarLabel}</button>`
        : '';
      return `
        <tr>
          <td>${index + 1}</td>
          <td>${materiaLabel}</td>
          <td>${grupo || '—'}</td>
          <td>${auxiliar || '—'}</td>
          <td class="actions">
            ${votarButtonHtml}
            <button type="button" class="btn btn-secondary" data-votacion-quitar="${codigo}">Quitarme</button>
          </td>
        </tr>
      `;
    }).join('');
  }

  async function cargarMisAuxiliaturas() {
    if (!els.misAuxWrapper) return;
    try {
      const res = await fetch('/api/matriculacion/mis-auxiliaturas', {
        method: 'GET',
        credentials: 'include',
      });
      if (!res.ok) {
        // No romper la UI si falla el listado, solo mostrar mensaje informativo
        console.error('No se pudo cargar la lista de auxiliaturas matriculadas');
        return;
      }
      const data = await res.json().catch(() => []);
      const lista = Array.isArray(data) ? data : [];
      renderMisAuxiliaturas(lista);
    } catch (err) {
      console.error('Error al cargar mis auxiliaturas matriculadas:', err);
    }
  }

  function syncVisibilityWithSection() {
    const params = new URLSearchParams(window.location.search);
    const section = params.get('section');
    const show = section === 'votacion';
    if (els.section) {
      els.section.hidden = !show;
      els.section.style.display = show ? '' : 'none';
    }
    if (show && typeof window.markActiveHeaderLink === 'function') {
      window.markActiveHeaderLink();
    }
  }

  async function manejarInscripcion() {
    if (!els.codigoInput) return;
    const codigo = els.codigoInput.value.trim();
    setMessage('', '');
    if (!codigo) {
      setMessage('error', 'Ingresa un código de matriculación.');
      els.codigoInput.focus();
      return;
    }
    if (!els.inscribirmeBtn) return;
    els.inscribirmeBtn.disabled = true;
    try {
      setMessage('info', 'Enviando inscripción...');
      const res = await fetch('/api/matriculacion/inscribirse', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigo }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage('error', data.message || 'No se pudo completar la inscripción');
        return;
      }
      const nombre = data.materia?.nombre || '';
      const sigla = data.materia?.sigla || '';
      const grupo = data.materia?.grupo || '';
      const detalle = [sigla, nombre].filter(Boolean).join(' · ');
      const grupoTxt = grupo ? ` (Grupo ${grupo})` : '';
      setMessage('success', `Te inscribiste correctamente en ${detalle}${grupoTxt}.`);

      // Refrescar la lista de auxiliaturas inscritas
      await cargarMisAuxiliaturas();
    } catch (err) {
      console.error('Error al inscribirse por código:', err);
      setMessage('error', 'Error de conexión. Intenta nuevamente.');
    } finally {
      els.inscribirmeBtn.disabled = false;
    }
  }

  async function manejarQuitarAuxiliatura(codigo) {
    if (!codigo) return false;
    try {
      setMessage('info', 'Procesando desmatriculación...');
      const res = await fetch('/api/matriculacion/desinscribirse', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigo }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage('error', data.message || 'No se pudo completar la desmatriculación');
        return false;
      }
      const nombre = data.materia?.nombre || '';
      const sigla = data.materia?.sigla || '';
      const grupo = data.materia?.grupo || '';
      const detalle = [sigla, nombre].filter(Boolean).join(' · ');
      const grupoTxt = grupo ? ` (Grupo ${grupo})` : '';
      setMessage('success', `Te desinscribiste de ${detalle}${grupoTxt}.`);

      await cargarMisAuxiliaturas();
      return true;
    } catch (err) {
      console.error('Error al desinscribirse desde la lista:', err);
      setMessage('error', 'Error de conexión. Intenta nuevamente.');
      return false;
    }
  }

  function init() {
    syncVisibilityWithSection();
    if (els.inscribirmeBtn) {
      els.inscribirmeBtn.addEventListener('click', () => {
        manejarInscripcion();
      });
    }
    if (els.codigoInput) {
      els.codigoInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          manejarInscripcion();
        }
      });
    }

    if (els.misAuxBody) {
      els.misAuxBody.addEventListener('click', (e) => {
        const votarBtn = e.target.closest('[data-votacion-ir]');
        if (votarBtn) {
          const auxMateriaIdRaw = votarBtn.getAttribute('data-votacion-ir');
          const auxMateriaId = auxMateriaIdRaw ? parseInt(auxMateriaIdRaw, 10) : NaN;
          if (!auxMateriaId || Number.isNaN(auxMateriaId)) return;
          // Navegar al panel de votación basado en principal.html
          window.location.href = `principal.html?section=votacion-panel&auxMateriaId=${auxMateriaId}`;
          return;
        }

        const btn = e.target.closest('[data-votacion-quitar]');
        if (!btn) return;
        const codigo = btn.getAttribute('data-votacion-quitar');
        if (!codigo) return;

        codigoPendienteQuitar = codigo;

        // Construir texto descriptivo a partir de la fila
        let materiaLabel = '';
        let grupoLabel = '';
        const row = btn.closest('tr');
        if (row) {
          const cells = row.querySelectorAll('td');
          if (cells[1]) materiaLabel = cells[1].textContent.trim();
          if (cells[2]) grupoLabel = cells[2].textContent.trim();
        }

        if (confirmEls.text) {
          const grupoTxt = grupoLabel && grupoLabel !== '—' ? ` (Grupo ${grupoLabel})` : '';
          const base = materiaLabel || 'esta auxiliatura';
          confirmEls.text.textContent = `¿Quieres quitarte de ${base}${grupoTxt}?`;
        }

        if (confirmEls.message) {
          confirmEls.message.style.display = 'none';
          confirmEls.message.textContent = '';
        }

        if (confirmEls.modal) {
          if (typeof mostrarModal === 'function') {
            mostrarModal(confirmEls.modal);
          } else {
            confirmEls.modal.classList.add('show');
            confirmEls.modal.setAttribute('aria-hidden', 'false');
          }
        }
      });
    }

    if (confirmEls.confirmBtn && confirmEls.modal) {
      confirmEls.confirmBtn.addEventListener('click', async () => {
        if (!codigoPendienteQuitar) return;
        const ok = await manejarQuitarAuxiliatura(codigoPendienteQuitar);
        if (ok) {
          codigoPendienteQuitar = null;
          if (typeof cerrarModal === 'function') {
            cerrarModal(confirmEls.modal);
          } else {
            confirmEls.modal.classList.remove('show');
            confirmEls.modal.setAttribute('aria-hidden', 'true');
          }
        }
      });
    }

    cargarMisAuxiliaturas();
  }

  document.addEventListener('DOMContentLoaded', () => {
    init();
  });

  window.addEventListener('popstate', () => {
    syncVisibilityWithSection();
  });

  const originalNavigate = window.navigateToSection;
  if (typeof originalNavigate === 'function') {
    window.navigateToSection = function (section) {
      originalNavigate(section);
      setTimeout(syncVisibilityWithSection, 80);
    };
  }

  // Exponer recarga para integración con websockets
  window.recargarMisAuxiliaturas = cargarMisAuxiliaturas;
})();

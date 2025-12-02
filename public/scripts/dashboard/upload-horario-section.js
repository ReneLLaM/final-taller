(() => {
  const els = {
    section: document.getElementById('uploadHorarioSection'),
    dropzone: document.getElementById('uploadDropzone'),
    fileInput: document.getElementById('uploadFileInput'),
    selectBtn: document.getElementById('uploadSelectBtn'),
    filesList: document.getElementById('uploadFilesList'),
    message: document.getElementById('uploadMessage'),
    submitBtn: document.getElementById('uploadSubmitBtn'),
  };

  const state = {
    files: [],
  };

  function syncVisibilityWithSection() {
    const params = new URLSearchParams(window.location.search);
    const section = params.get('section');
    const show = section === 'subir-horario';

    if (els.section) els.section.hidden = !show;
    if (show && typeof window.markActiveHeaderLink === 'function') {
      window.markActiveHeaderLink();
    }
  }

  function formatSize(bytes) {
    if (!bytes && bytes !== 0) return '';
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(2)} MB`;
  }

  function renderFiles() {
    if (!els.filesList) return;

    if (!state.files.length) {
      els.filesList.innerHTML = '';
      if (els.submitBtn) els.submitBtn.disabled = true;
      return;
    }

    els.filesList.innerHTML = state.files
      .map((f, idx) => `
        <div class="upload-file-item">
          <div class="upload-file-icon">📄</div>
          <div class="upload-file-info">
            <div class="upload-file-name">${f.name}</div>
            <div class="upload-file-meta">${formatSize(f.size)}</div>
          </div>
          <button type="button" class="upload-file-remove" data-index="${idx}">✕</button>
        </div>
      `)
      .join('');

    if (els.submitBtn) els.submitBtn.disabled = false;
  }

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

  function handleFiles(filesLike) {
    const files = Array.from(filesLike || []);
    if (!files.length) return;

    const jsonFiles = files.filter(f => /\.json$/i.test(f.name));
    if (!jsonFiles.length) {
      setMessage('error', 'Solo se permiten archivos .json');
      return;
    }

    setMessage('info', 'Archivos listos para subir.');
    state.files = jsonFiles;
    renderFiles();
  }

  function wireDropzone() {
    if (!els.dropzone || !els.fileInput) return;

    ['dragenter', 'dragover'].forEach(evt => {
      els.dropzone.addEventListener(evt, e => {
        e.preventDefault();
        e.stopPropagation();
        els.dropzone.classList.add('drag-over');
      });
    });

    ['dragleave', 'drop'].forEach(evt => {
      els.dropzone.addEventListener(evt, e => {
        e.preventDefault();
        e.stopPropagation();
        els.dropzone.classList.remove('drag-over');
      });
    });

    els.dropzone.addEventListener('drop', e => {
      if (e.dataTransfer && e.dataTransfer.files) {
        handleFiles(e.dataTransfer.files);
      }
    });

    els.dropzone.addEventListener('click', () => {
      els.fileInput.click();
    });

    if (els.selectBtn) {
      els.selectBtn.addEventListener('click', () => {
        els.fileInput.click();
      });
    }

    els.fileInput.addEventListener('change', e => {
      if (e.target.files && e.target.files.length > 0) {
        handleFiles(e.target.files);
      }
    });

    if (els.filesList) {
      els.filesList.addEventListener('click', e => {
        const btn = e.target.closest('.upload-file-remove');
        if (!btn) return;
        const index = parseInt(btn.dataset.index, 10);
        if (Number.isNaN(index)) return;
        state.files.splice(index, 1);
        renderFiles();
      });
    }
  }

  async function handleSubmit() {
    if (!state.files.length || !els.submitBtn) return;

    setMessage('info', 'Subiendo horarios, por favor espera...');
    els.submitBtn.disabled = true;
    els.submitBtn.textContent = 'Subiendo...';

    const formData = new FormData();
    state.files.forEach(file => {
      formData.append('files', file);
    });

    try {
      const res = await fetch('/api/horarios/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage('error', data.message || 'Error al procesar los archivos de horario');
        els.submitBtn.disabled = false;
        els.submitBtn.textContent = 'Actualizar Horarios';
      } else {
        const info = data.registros
          ? `Se cargaron ${data.registros} registros de horario desde ${data.archivos || state.files.length} archivo(s).`
          : (data.message || 'Horarios cargados correctamente');
        setMessage('success', info);

        // Limpiar archivos y resetear el input
        state.files = [];
        if (els.fileInput) {
          els.fileInput.value = '';
        }
        renderFiles();

        const titleEl = document.querySelector('.upload-title');
        const subtitleEl = document.querySelector('.upload-subtitle');
        const descEl = document.querySelector('.upload-description');
        if (titleEl) titleEl.style.display = '';
        if (subtitleEl) subtitleEl.style.display = '';
        if (descEl) descEl.style.display = '';
      }
    } catch (err) {
      console.error('Error al subir horarios:', err);
      setMessage('error', 'Error de conexión al subir los horarios');
      els.submitBtn.disabled = false;
      els.submitBtn.textContent = 'Actualizar Horarios';
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    syncVisibilityWithSection();
    wireDropzone();

    if (els.submitBtn) {
      els.submitBtn.addEventListener('click', handleSubmit);
    }
  });

  window.addEventListener('popstate', syncVisibilityWithSection);

  const originalNavigate = window.navigateToSection;
  if (typeof originalNavigate === 'function') {
    window.navigateToSection = function (section) {
      originalNavigate(section);
      setTimeout(syncVisibilityWithSection, 80);
    };
  }
})();

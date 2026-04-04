// ==== scripts.js ====

// ==== MENÚ HAMBURGUESA (todas las páginas) ====
document.addEventListener("DOMContentLoaded", () => {
  // ==== VOLVER A ARTÍCULOS: restaurar página de origen ====
  const volverLink = document.querySelector('.volver-articulos');
  if (volverLink) {
    const returnPage = new URLSearchParams(window.location.search).get("returnPage");
    if (returnPage) volverLink.href = `/articulos.html?page=${returnPage}`;
  }

  const hamburger = document.querySelector('.hamburger');
  const nav = document.querySelector('nav');

  if (hamburger && nav) {
    hamburger.addEventListener('click', () => {
      nav.classList.toggle('active');
    });

    // Cerrar el menú al hacer click fuera
    document.addEventListener('click', (e) => {
      if (!nav.contains(e.target) && !hamburger.contains(e.target)) {
        nav.classList.remove('active');
      }
    });
  }

  // ==== LINK ACTIVO EN NAV ====
  const currentFile = window.location.pathname.split("/").pop().split("?")[0];
  const normalizedCurrent = currentFile === "" || !currentFile.includes(".") ? "index.html" : currentFile;

  document.querySelectorAll("nav a").forEach(link => {
    const linkFile = link.getAttribute("href").split("/").pop().split("?")[0];
    // Marcar Artículos activo también dentro de /articles/
    const inArticles = window.location.pathname.includes("/articles/") && linkFile === "articulos.html";
    link.classList.toggle("active", linkFile === normalizedCurrent || inArticles);
  });
});

// ==== PAGINACIÓN Y BUSCADOR (solo en páginas con #articulos-list) ====
(function () {
  const contenedor = document.getElementById("articulos-list");
  if (!contenedor) return; // salir si no hay grilla de artículos

  const paginationNumbers = document.getElementById("pagination-numbers");
  const prevBlockBtn = document.getElementById("prev-block");
  const nextBlockBtn = document.getElementById("next-block");

  const ARTICULOS_POR_PAGINA = 6;
  let paginaActual = 1;
  let articulosFiltrados = [];

  // ==== INICIO ====
  function iniciar() {
    if (typeof articulos === "undefined") return;
    articulos.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    articulosFiltrados = [...articulos];
    const params = new URLSearchParams(window.location.search);
    const tieneQuery = !!params.get("q");
    const paginaInicial = !tieneQuery ? (parseInt(params.get("page")) || 1) : 1;
    mostrarPagina(paginaInicial, false);
    actualizarPaginacion();
    configurarBuscador(true);
  }

  // ==== PAGINACIÓN ====
  function mostrarPagina(numPagina, animar = true) {
    if (animar) contenedor.classList.add("fade-out");

    setTimeout(() => {
      contenedor.innerHTML = "";
      const inicio = (numPagina - 1) * ARTICULOS_POR_PAGINA;
      const pagina = articulosFiltrados.slice(inicio, inicio + ARTICULOS_POR_PAGINA);

      if (!pagina.length) {
        contenedor.innerHTML = `<p style="text-align:center; margin-top:1.2rem;">🔍 No se encontraron artículos.</p>`;
      } else {
        pagina.forEach(a => {
          contenedor.innerHTML += `
            <a class="articulo-card" href="${escapeHtml(a.url)}?returnPage=${numPagina}">
              <div class="articulo-thumb-wrapper">
                ${a.thumb ? `<img class="articulo-thumb" src="${escapeHtml(a.thumb)}" alt="${escapeHtml(a.titulo)}"${a.thumbBg ? ` style="background:${escapeHtml(a.thumbBg)}"` : ""}>` : ""}
                ${a.tag ? `<div class="articulo-etiqueta">${escapeHtml(a.tag)}</div>` : ""}
              </div>
              <div class="articulo-card-body">
                <h3>${escapeHtml(a.titulo)}</h3>
              </div>
            </a>
          `;
        });
      }

      paginaActual = numPagina;
      const params = new URLSearchParams(window.location.search);
      params.set("page", numPagina);
      history.replaceState(null, "", "?" + params.toString());
      ajustarColumnas(pagina.length);
      actualizarPaginacion();

      if (animar) {
        contenedor.classList.remove("fade-out");
        contenedor.classList.add("fade-in");
        setTimeout(() => contenedor.classList.remove("fade-in"), 400);
      }
    }, animar ? 360 : 0);

    if (prevBlockBtn) prevBlockBtn.style.display = "";
    if (nextBlockBtn) nextBlockBtn.style.display = "";
  }

  function actualizarPaginacion() {
    if (!paginationNumbers) return;
    paginationNumbers.innerHTML = "";

    const totalPaginas = Math.max(1, Math.ceil(articulosFiltrados.length / ARTICULOS_POR_PAGINA));

    for (let i = 1; i <= totalPaginas; i++) {
      const btn = document.createElement("button");
      btn.className = "page-number" + (i === paginaActual ? " active" : "");
      btn.textContent = i;
      btn.addEventListener("click", () => mostrarPagina(i));
      paginationNumbers.appendChild(btn);
    }

    if (prevBlockBtn) prevBlockBtn.disabled = paginaActual === 1;
    if (nextBlockBtn) nextBlockBtn.disabled = paginaActual >= totalPaginas;
  }

  // ==== BUSCADOR ====
  function configurarBuscador(applyQueryFromURL = false) {
    const input = document.querySelector('.search-bar input[name="q"]')
      || document.querySelector('.search-bar input')
      || document.querySelector('input[name="q"]');
    const btn = document.querySelector('.search-bar button');

    function actualizarBoton() {
      if (!btn) return;
      const tieneTexto = (input?.value || "").trim().length > 0;
      btn.innerHTML = tieneTexto
        ? '<i class="fas fa-times" style="color:#666"></i>'
        : '🔍';
    }

    function limpiarBusqueda() {
      if (input) input.value = "";
      actualizarBoton();
      articulosFiltrados = [...articulos];
      mostrarPagina(1);
      if (input) input.focus();
    }

    if (applyQueryFromURL) {
      const q = new URLSearchParams(window.location.search).get("q");
      if (q) {
        if (input) input.value = q;
        ejecutarBusqueda(q.trim().toLowerCase());
      }
      actualizarBoton();
    }

    if (!input) return;

    // Actualizar ícono y limpiar si se vacía el campo
    input.addEventListener("input", () => {
      actualizarBoton();
      if ((input.value || "").trim() === "") limpiarBusqueda();
    });

    // Enter ejecuta la búsqueda
    input.addEventListener("keydown", e => {
      if (e.key === "Enter") {
        e.preventDefault();
        ejecutarBusqueda((input.value || "").trim().toLowerCase());
      }
    });

    // Botón: X limpia, lupa no hace nada (se usa Enter)
    if (btn) btn.addEventListener("click", e => {
      if ((input.value || "").trim().length > 0) {
        e.preventDefault();
        limpiarBusqueda();
      }
    });
  }

  function ejecutarBusqueda(texto) {
    if (!texto) {
      articulosFiltrados = [...articulos];
      paginaActual = 1;
      mostrarPagina(1);
      return;
    }

    articulosFiltrados = articulos.filter(a =>
      (a.titulo || "").toLowerCase().includes(texto) ||
      (a.descripcion || "").toLowerCase().includes(texto) ||
      (a.tag || "").toLowerCase().includes(texto)
    );

    paginaActual = 1;

    if (!articulosFiltrados.length) {
      contenedor.innerHTML = `
        <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;">
          <p style="margin:0;">🔍 No se encontraron artículos para "<strong>${escapeHtml(texto)}</strong>".</p>
        </div>`;
      if (paginationNumbers) paginationNumbers.innerHTML = "";
      if (prevBlockBtn) prevBlockBtn.style.display = "none";
      if (nextBlockBtn) nextBlockBtn.style.display = "none";
      return;
    }

    mostrarPagina(1);
    actualizarPaginacion();
  }

  // ==== UTILIDADES ====
  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function formatearFecha(fechaISO) {
    const meses = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
    const [y, m, d] = fechaISO.split("-").map(Number);
    return `${d} de ${meses[m - 1]} de ${y}`;
  }

  function ajustarColumnas(count) {
    const w = window.innerWidth;
    let maxCols = w <= 660 ? 1 : w <= 950 ? 2 : 3;
    let cols = Math.min(maxCols, Math.max(1, count));
    contenedor.style.gridTemplateColumns = cols === 1 ? (w <= 660 ? "1fr" : "300px") : `repeat(${cols}, 300px)`;
    contenedor.style.justifyContent = "center";
  }

  window.addEventListener("resize", () => ajustarColumnas(contenedor.children.length));

  // Prev/Next page
  if (prevBlockBtn) prevBlockBtn.addEventListener("click", () => {
    if (paginaActual > 1) mostrarPagina(paginaActual - 1);
  });
  if (nextBlockBtn) nextBlockBtn.addEventListener("click", () => {
    const totalPaginas = Math.ceil(articulosFiltrados.length / ARTICULOS_POR_PAGINA);
    if (paginaActual < totalPaginas) mostrarPagina(paginaActual + 1);
  });

  iniciar();
})();

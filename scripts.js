// ==== scripts.js (compacto: paginación + buscador) ====

// --- DOM ---
const contenedor = document.getElementById("articulos-list");
const paginationNumbers = document.getElementById("pagination-numbers");
const prevBlockBtn = document.getElementById("prev-block");
const nextBlockBtn = document.getElementById("next-block");

// --- Config ---
const ARTICULOS_POR_PAGINA = 6;
const PAGINAS_POR_BLOQUE = 5;
let paginaActual = 1;
let bloqueActual = 0;
let articulosFiltrados = [];

// ==== INICIO ====
function iniciar() {
  // ordenar por fecha (nuevo primero)
  articulos.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  articulosFiltrados = [...articulos];

  mostrarPagina(1, false);
  actualizarPaginacion();
  configurarBuscador(true);
}

// ==== PAGINACIÓN ====
function mostrarPagina(numPagina, animar = true) {
  if (!contenedor) return;
  if (animar) contenedor.classList.add("fade-out");

  setTimeout(() => {
    contenedor.innerHTML = "";
    const inicio = (numPagina - 1) * ARTICULOS_POR_PAGINA;
    const fin = inicio + ARTICULOS_POR_PAGINA;
    const pagina = articulosFiltrados.slice(inicio, fin);

    if (!pagina.length) {
      contenedor.innerHTML = `<p style="text-align:center; margin-top:1.2rem;">🔍 No se encontraron artículos.</p>`;
    } else {
      pagina.forEach(a => {
        contenedor.innerHTML += `
          <article class="articulo-card">
            ${a.tag ? `<div class="articulo-etiqueta">${escapeHtml(a.tag)}</div>` : ""}
            <h3>${escapeHtml(a.titulo)}</h3>
            ${a.thumb ? `<img class="articulo-thumb" src="${escapeHtml(a.thumb)}" alt="${escapeHtml(a.titulo)}">` : ""}
            <p>${escapeHtml(a.descripcion)}</p>
            <a href="${escapeHtml(a.url)}" class="leer-mas">Leer más</a>
          </article>
        `;
      });
    }

    paginaActual = numPagina;
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
  const totalBloques = Math.ceil(totalPaginas / PAGINAS_POR_BLOQUE);
  bloqueActual = Math.floor((paginaActual - 1) / PAGINAS_POR_BLOQUE);

  const inicioBloque = bloqueActual * PAGINAS_POR_BLOQUE + 1;
  const finBloque = Math.min(inicioBloque + PAGINAS_POR_BLOQUE - 1, totalPaginas);

  for (let i = inicioBloque; i <= finBloque; i++) {
    const btn = document.createElement("button");
    btn.className = "page-number" + (i === paginaActual ? " active" : "");
    btn.textContent = i;
    btn.addEventListener("click", () => mostrarPagina(i));
    paginationNumbers.appendChild(btn);
  }

  if (prevBlockBtn) prevBlockBtn.disabled = bloqueActual === 0;
  if (nextBlockBtn) nextBlockBtn.disabled = bloqueActual >= totalBloques - 1;
}

// ==== BUSCADOR ====
function configurarBuscador(applyQueryFromURL = false) {
  const input = document.getElementById("search-input")
    || document.querySelector('.search-bar input[name="q"]')
    || document.querySelector('.search-bar input')
    || document.querySelector('input[name="q"]');

  if (!input) {
    if (applyQueryFromURL) {
      const q = new URLSearchParams(window.location.search).get("q");
      if (q) ejecutarBusqueda(q.trim().toLowerCase());
    }
    return;
  }

  if (applyQueryFromURL) {
    const q = new URLSearchParams(window.location.search).get("q");
    if (q) {
      input.value = q;
      ejecutarBusqueda(q.trim().toLowerCase());
    }
  }

  input.addEventListener("keydown", e => {
    if (e.key === "Enter") {
      e.preventDefault();
      ejecutarBusqueda((input.value || "").trim().toLowerCase());
    }
  });

  const form = input.closest("form");
  if (form) form.addEventListener("submit", e => {
    e.preventDefault();
    ejecutarBusqueda((input.value || "").trim().toLowerCase());
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
    paginationNumbers.innerHTML = "";
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

function ajustarColumnas(count) {
  if (!contenedor) return;
  const w = window.innerWidth;
  let maxCols = w <= 660 ? 1 : w <= 950 ? 2 : 3;
  let cols = Math.min(maxCols, Math.max(1, count));
  contenedor.style.gridTemplateColumns = cols === 1 ? (w <= 660 ? "1fr" : "300px") : `repeat(${cols}, 300px)`;
  contenedor.style.justifyContent = "center";
}

window.addEventListener("resize", () => ajustarColumnas(contenedor ? contenedor.children.length : 0));

// Prev/Next blocks
if (prevBlockBtn) prevBlockBtn.addEventListener("click", () => {
  const nueva = bloqueActual * PAGINAS_POR_BLOQUE;
  if (nueva > 0) mostrarPagina(nueva);
});
if (nextBlockBtn) nextBlockBtn.addEventListener("click", () => {
  const nueva = (bloqueActual + 1) * PAGINAS_POR_BLOQUE + 1;
  if (nueva <= Math.ceil(articulosFiltrados.length / ARTICULOS_POR_PAGINA)) mostrarPagina(nueva);
});

// Resaltar sección activa del menú
document.addEventListener("DOMContentLoaded", () => {
  const currentFile = window.location.href.split("/").pop().split("?")[0];
  document.querySelectorAll("nav a").forEach(link => {
    link.classList.toggle("active", link.href.split("/").pop().split("?")[0] === currentFile);
  });
});

// start
iniciar();


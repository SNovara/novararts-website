// ============================================================
//  NovarArts — Sistema de comentarios con Firebase Firestore
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBm98M_ZYVwa1HLDsmQ2DDdcDu11vau8FQ",
  authDomain: "novararts-58f99.firebaseapp.com",
  projectId: "novararts-58f99",
  storageBucket: "novararts-58f99.firebasestorage.app",
  messagingSenderId: "55347963852",
  appId: "1:55347963852:web:65b531c14a2434e18bdf69"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ==== CLAVE DE ADMIN (para borrar comentarios) ====
// Accedé a ?admin=novararts-admin en la URL para activar el modo admin
const ADMIN_KEY = "novararts-admin";
const isAdmin = new URLSearchParams(window.location.search).get("admin") === ADMIN_KEY;

// ==== ID del artículo basado en la URL ====
const articuloId = window.location.pathname.replace(/\//g, "_").replace(/\.html$/, "").replace(/^_/, "");

// ==== Inyectar HTML de la sección ====
function inyectarHTML() {
  const footer = document.querySelector(".articulo-footer");
  const main = document.querySelector("main");
  const ancla = footer || main;
  if (!ancla) return;

  const seccion = document.createElement("div");
  seccion.className = "comentarios-seccion";
  seccion.innerHTML = `
    <h2 class="comentarios-titulo">Comentarios</h2>

    <form class="comentarios-form" id="form-comentario-principal">
      <input type="text" id="comentario-nombre" placeholder="Tu nombre" maxlength="50" required>
      <textarea id="comentario-texto" placeholder="Escribí tu comentario..." maxlength="1000" required></textarea>
      <button type="submit" class="comentario-btn-enviar">Publicar comentario</button>
    </form>
    <p class="comentario-estado" id="estado-principal"></p>

    <div class="comentarios-lista" id="comentarios-lista">
      <p class="comentarios-cargando">Cargando comentarios...</p>
    </div>
  `;

  if (footer) {
    footer.parentNode.insertBefore(seccion, footer);
  } else {
    const contenedor = document.querySelector(".articulo-completo") || main;
    contenedor.appendChild(seccion);
  }
}

// ==== Formatear fecha ====
function formatearFecha(timestamp) {
  if (!timestamp) return "";
  const fecha = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return fecha.toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" });
}

// ==== Renderizar comentarios ====
function renderizarComentarios(comentarios) {
  const lista = document.getElementById("comentarios-lista");
  if (!lista) return;

  if (comentarios.length === 0) {
    lista.innerHTML = `<p class="comentarios-vacio">Aún no hay comentarios. ¡Sé el primero!</p>`;
    return;
  }

  // Separar comentarios principales de respuestas
  const principales = comentarios.filter(c => !c.parentId);
  const respuestas = comentarios.filter(c => c.parentId);

  lista.innerHTML = "";

  principales.forEach(comentario => {
    const hijos = respuestas.filter(r => r.parentId === comentario.id);
    lista.appendChild(crearElementoComentario(comentario, hijos));
  });
}

// ==== Crear elemento de comentario ====
function crearElementoComentario(comentario, respuestas = []) {
  const div = document.createElement("div");
  div.className = "comentario-item";
  div.dataset.id = comentario.id;

  const adminBtn = isAdmin
    ? `<button class="comentario-btn-borrar" data-id="${comentario.id}" title="Borrar comentario">✕</button>`
    : "";

  div.innerHTML = `
    <div class="comentario-cabecera">
      <span class="comentario-autor">${escapeHTML(comentario.nombre)}</span>
      <span class="comentario-fecha">${formatearFecha(comentario.fecha)}</span>
      ${adminBtn}
    </div>
    <p class="comentario-texto">${escapeHTML(comentario.texto)}</p>
    <button class="comentario-btn-responder" data-id="${comentario.id}">Responder</button>
    <div class="comentario-form-respuesta" id="respuesta-form-${comentario.id}" style="display:none;">
      <input type="text" class="respuesta-nombre" placeholder="Tu nombre" maxlength="50">
      <textarea class="respuesta-texto" placeholder="Escribí tu respuesta..." maxlength="1000"></textarea>
      <div class="respuesta-botones">
        <button class="comentario-btn-enviar respuesta-enviar" data-parent="${comentario.id}">Publicar respuesta</button>
        <button class="comentario-btn-cancelar respuesta-cancelar" data-parent="${comentario.id}">Cancelar</button>
      </div>
      <p class="comentario-estado respuesta-estado" id="estado-respuesta-${comentario.id}"></p>
    </div>
    <div class="comentario-respuestas" id="respuestas-${comentario.id}"></div>
  `;

  // Agregar respuestas anidadas
  const contenedorRespuestas = div.querySelector(`#respuestas-${comentario.id}`);
  respuestas.forEach(respuesta => {
    const adminBtnResp = isAdmin
      ? `<button class="comentario-btn-borrar" data-id="${respuesta.id}" title="Borrar comentario">✕</button>`
      : "";

    const respDiv = document.createElement("div");
    respDiv.className = "comentario-item comentario-respuesta";
    respDiv.dataset.id = respuesta.id;
    respDiv.innerHTML = `
      <div class="comentario-cabecera">
        <span class="comentario-autor">${escapeHTML(respuesta.nombre)}</span>
        <span class="comentario-fecha">${formatearFecha(respuesta.fecha)}</span>
        ${adminBtnResp}
      </div>
      <p class="comentario-texto">${escapeHTML(respuesta.texto)}</p>
    `;
    contenedorRespuestas.appendChild(respDiv);
  });

  return div;
}

// ==== Escape de HTML para seguridad ====
function escapeHTML(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// ==== Cargar comentarios desde Firestore ====
async function cargarComentarios() {
  const lista = document.getElementById("comentarios-lista");
  try {
    const q = query(collection(db, "comentarios", articuloId, "items"), orderBy("fecha", "asc"));
    const snapshot = await getDocs(q);
    const comentarios = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderizarComentarios(comentarios);
  } catch (e) {
    if (lista) lista.innerHTML = `<p class="comentarios-vacio">No se pudieron cargar los comentarios.</p>`;
  }
}

// ==== Publicar comentario ====
async function publicarComentario(nombre, texto, parentId = null, estadoEl = null) {
  if (!nombre.trim() || !texto.trim()) return false;
  try {
    await addDoc(collection(db, "comentarios", articuloId, "items"), {
      nombre: nombre.trim(),
      texto: texto.trim(),
      fecha: serverTimestamp(),
      parentId: parentId || null
    });
    return true;
  } catch (e) {
    if (estadoEl) estadoEl.textContent = "Error al publicar. Intentá de nuevo.";
    return false;
  }
}

// ==== Borrar comentario (admin) ====
async function borrarComentario(id) {
  if (!confirm("¿Borrar este comentario?")) return;
  try {
    await deleteDoc(doc(db, "comentarios", articuloId, "items", id));
    await cargarComentarios();
  } catch (e) {
    alert("No se pudo borrar el comentario.");
  }
}

// ==== Event listeners ====
function agregarEventListeners() {
  // Formulario principal
  const formPrincipal = document.getElementById("form-comentario-principal");
  const estadoPrincipal = document.getElementById("estado-principal");

  formPrincipal?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const nombre = document.getElementById("comentario-nombre").value;
    const texto = document.getElementById("comentario-texto").value;
    estadoPrincipal.textContent = "Publicando...";
    const ok = await publicarComentario(nombre, texto, null, estadoPrincipal);
    if (ok) {
      formPrincipal.reset();
      estadoPrincipal.textContent = "";
      await cargarComentarios();
    }
  });

  // Delegación de eventos para respuestas y borrado
  document.getElementById("comentarios-lista")?.addEventListener("click", async (e) => {

    // Mostrar formulario de respuesta
    if (e.target.classList.contains("comentario-btn-responder")) {
      const id = e.target.dataset.id;
      const form = document.getElementById(`respuesta-form-${id}`);
      if (form) form.style.display = form.style.display === "none" ? "block" : "none";
    }

    // Cancelar respuesta
    if (e.target.classList.contains("respuesta-cancelar")) {
      const id = e.target.dataset.parent;
      const form = document.getElementById(`respuesta-form-${id}`);
      if (form) form.style.display = "none";
    }

    // Enviar respuesta
    if (e.target.classList.contains("respuesta-enviar")) {
      const parentId = e.target.dataset.parent;
      const form = document.getElementById(`respuesta-form-${parentId}`);
      const nombre = form?.querySelector(".respuesta-nombre")?.value;
      const texto = form?.querySelector(".respuesta-texto")?.value;
      const estado = document.getElementById(`estado-respuesta-${parentId}`);
      if (estado) estado.textContent = "Publicando...";
      const ok = await publicarComentario(nombre, texto, parentId, estado);
      if (ok) {
        if (form) form.style.display = "none";
        if (estado) estado.textContent = "";
        await cargarComentarios();
      }
    }

    // Borrar comentario (admin)
    if (e.target.classList.contains("comentario-btn-borrar")) {
      await borrarComentario(e.target.dataset.id);
    }
  });
}

// ==== Inicializar ====
document.addEventListener("DOMContentLoaded", () => {
  inyectarHTML();
  cargarComentarios();
  agregarEventListeners();
});

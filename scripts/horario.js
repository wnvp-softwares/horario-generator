/* --------------------------------------------------------
VARIABLES DEL DOM
-------------------------------------------------------- */
const btnView = document.querySelectorAll(".asideBtn");
const horariosVistaRegistrados = document.getElementById('vista-horarios-registrados');
const agregarHorario = document.getElementById('add-horario');
const modalFullscreen = document.getElementById('horario-fullscreen');
const btnCerrarModal = document.getElementById('btn-cerrar-modal');
const btnGuardarHorario = document.getElementById('btn-guardar-horario');

const inputNombreHorario = document.getElementById('nombre_horario');
const selectGrupo = document.getElementById('select-grupo');
const selectImparte = document.getElementById('select-imparte');
const infoDisponibilidad = document.getElementById('info-disponibilidad');
const tbodyMatriz = document.getElementById('tbody-matriz');

const toast = document.getElementById('toast');
const toastCheck = document.getElementById('toast-check');
const toastUncheck = document.getElementById('toast-uncheck');

/* --------------------------------------------------------
ESTADOS Y CACHÉ LOCAL
-------------------------------------------------------- */
let vistaActual;
let modoFormulario = 'crear';

let listaModulos = [];
let listaImparte = [];
let horasOcupadasOtrosHorarios = [];
const DIAS = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes'];

let celdasHorarioMemoria = {};

/* --------------------------------------------------------
FUNCIONES GENERALES Y NAVEGACIÓN
-------------------------------------------------------- */
async function obtenerVista() {
    try {
        vistaActual = await window.api.obtenerVista();
        desactivarActual();
    } catch (error) { console.error(error); }
}

async function guardarVista(nuevaVista) {
    try { await window.api.guardarVista(nuevaVista); } catch (error) { console.error(error); }
}

function desactivarActual() {
    btnView.forEach(btn => {
        if (btn.classList[1] === vistaActual) btn.disabled = true;
    });
}

function abrirToast(titulo, mensaje, requiereConfirmacion = false) {
    toast.classList.remove('hidden');
    document.getElementById('toast-title').textContent = titulo;
    document.getElementById('toast-message').textContent = mensaje;

    if (!requiereConfirmacion) {
        toastCheck.style.display = 'inline-block';
        toastUncheck.style.display = 'none';
    } else {
        toastCheck.style.display = 'inline-block';
        toastUncheck.style.display = 'inline-block';
    }

    return new Promise((resolve) => {
        toastCheck.onclick = () => { toast.classList.add('hidden'); resolve(true); };
        toastUncheck.onclick = () => { toast.classList.add('hidden'); resolve(false); };
    });
}

async function cargarListaHorarios() {
    try {
        const sql = 'SELECT DISTINCT nombre_horario FROM horarios';
        const response = await window.api.ejecutarQuery(sql, []);

        horariosVistaRegistrados.innerHTML = '';
        response.forEach(h => {
            const card = `
                <div class="registered-simple-box">
                    <h2>${h.nombre_horario}</h2>
                    <div class="box-actions">
                        <button class="subAction editar" data-nombre="${h.nombre_horario}"><i class="ri-pencil-line"></i></button>
                        <button class="subAction eliminar" data-nombre="${h.nombre_horario}"><i class="ri-delete-bin-line"></i></button>
                    </div>
                </div>
            `;
            horariosVistaRegistrados.insertAdjacentHTML('beforeend', card);
        });
    } catch (error) { console.error(error); }
}

async function cargarCatalogosModal() {
    try {
        const grupos = await window.api.ejecutarQuery('SELECT id, nombre, semestre FROM grupos', []);
        selectGrupo.innerHTML = grupos.map(g => `<option value="${g.id}">${g.nombre} (${g.semestre}° Sem)</option>`).join('');

        listaModulos = await window.api.ejecutarQuery('SELECT * FROM modulos_horario ORDER BY hora_inicio ASC', []);

        const sqlImparte = `
            SELECT i.id, i.id_docente, i.id_materia, d.nombre AS docente, d.horas_disponibles, m.nombre AS materia, m.horas_semanales 
            FROM imparte i
            JOIN docentes d ON i.id_docente = d.id
            JOIN materia m ON i.id_materia = m.id
        `;
        listaImparte = await window.api.ejecutarQuery(sqlImparte, []);

        selectImparte.innerHTML = '<option value="">-- Selecciona una Relación --</option>' +
            listaImparte.map(i => `<option value="${i.id}">${i.docente} -> ${i.materia}</option>`).join('');
    } catch (error) { console.error(error); }
}

async function cargarOcupacionesGlobales(nombreHorarioActual) {
    try {
        const sql = `
            SELECT h.id_modulo, h.dia_semana, h.id_grupo, i.id_docente, h.nombre_horario, d.nombre as nombre_docente, m.nombre as nombre_materia
            FROM horarios h
            JOIN imparte i ON h.id_imparte = i.id
            JOIN docentes d ON i.id_docente = d.id
            JOIN materia m ON i.id_materia = m.id
            WHERE h.nombre_horario != ?
        `;
        horasOcupadasOtrosHorarios = await window.api.ejecutarQuery(sql, [nombreHorarioActual || '']);
    } catch (error) { console.error(error); }
}

/* --------------------------------------------------------
SISTEMA DE SEMÁFORO INTERACTIVO Y RENDERS
-------------------------------------------------------- */
function renderizarMatrizInteractiva() {
    tbodyMatriz.innerHTML = '';
    const imparteSeleccionado = listaImparte.find(i => i.id == selectImparte.value);

    listaModulos.forEach(modulo => {
        let filaHtml = `<tr>
            <td class="modulo-hora-col"><strong>${modulo.nombre}</strong><br><small>${modulo.hora_inicio.substring(0, 5)} - ${modulo.hora_fin.substring(0, 5)}</small></td>
        `;

        DIAS.forEach(dia => {
            const llaveCell = `${modulo.id}-${dia}`;
            const idImparteAsignado = celdasHorarioMemoria[llaveCell];

            let claseColor = '';
            let textoCelda = '<em>Vacío</em>';

            if (idImparteAsignado) {
                const infoAsignada = listaImparte.find(i => i.id == idImparteAsignado);
                textoCelda = infoAsignada ? `<strong>${infoAsignada.materia}</strong><br><small>${infoAsignada.docente}</small>` : 'Asignado';
                claseColor = 'celda-verde';
            } else if (imparteSeleccionado) {

                const conflictoDocenteOcupado = horasOcupadasOtrosHorarios.find(o =>
                    o.id_modulo === modulo.id &&
                    o.dia_semana === dia &&
                    o.id_docente === imparteSeleccionado.id_docente
                );

                const conflictoGrupoOcupado = horasOcupadasOtrosHorarios.find(o =>
                    o.id_modulo === modulo.id &&
                    o.dia_semana === dia &&
                    o.id_grupo == selectGrupo.value
                );

                if (conflictoDocenteOcupado) {
                    claseColor = 'celda-rojo';
                    textoCelda = `<small style="color:var(--color-texto-rojo); font-weight:bold;">Ocupado en:<br>${conflictoDocenteOcupado.nombre_horario}</small>`;
                } else if (conflictoGrupoOcupado) {
                    claseColor = 'celda-amarillo';
                    textoCelda = `<small style="color:var(--color-texto-amarillo)">Grupo Ocupado:<br>${conflictoGrupoOcupado.nombre_materia}</small>`;
                } else {
                    claseColor = '';
                }
            }

            filaHtml += `
                <td class="celda-clase-interactiva ${claseColor}" data-modulo="${modulo.id}" data-dia="${dia}">
                    <div class="celda-wrapper">${textoCelda}</div>
                </td>
            `;
        });

        filaHtml += '</tr>';
        tbodyMatriz.insertAdjacentHTML('beforeend', filaHtml);
    });

    actualizarContadoresDisponibilidad();
}

function actualizarContadoresDisponibilidad() {
    const imparteSeleccionado = listaImparte.find(i => i.id == selectImparte.value);
    if (!imparteSeleccionado) {
        infoDisponibilidad.innerHTML = '';
        return;
    }

    let horasConsumidasEnOtrosHorarios = horasOcupadasOtrosHorarios.filter(o =>
        o.id_docente === imparteSeleccionado.id_docente
    ).length;

    let materiaConsumidaEnOtrosHorarios = horasOcupadasOtrosHorarios.filter(o =>
        o.nombre_materia === imparteSeleccionado.materia
    ).length;

    let horasColocadasBorradorActual = Object.values(celdasHorarioMemoria).filter(id => id == imparteSeleccionado.id).length;

    let docRestantes = imparteSeleccionado.horas_disponibles - horasConsumidasEnOtrosHorarios - horasColocadasBorradorActual;

    let matRestantes = imparteSeleccionado.horas_semanales - materiaConsumidaEnOtrosHorarios - horasColocadasBorradorActual;

    infoDisponibilidad.innerHTML = `
        <p class="${docRestantes <= 0 ? 'limite-alerta' : ''}"><strong>Disp. Semanal Docente:</strong> ${docRestantes} / ${imparteSeleccionado.horas_disponibles} hrs libres</p>
        <p class="${matRestantes <= 0 ? 'limite-alerta' : ''}"><strong>Horas Restantes Materia:</strong> ${matRestantes} / ${imparteSeleccionado.horas_semanales} hrs</p>
    `;

    imparteSeleccionado.horasLibresCalculadas = docRestantes;
}

/* --------------------------------------------------------
EVENTOS INTERACTIVOS DE ASIGNACIÓN
-------------------------------------------------------- */
selectImparte.addEventListener('change', () => {
    renderizarMatrizInteractiva();
});

selectGrupo.addEventListener('change', () => {
    renderizarMatrizInteractiva();
});

tbodyMatriz.addEventListener('click', (e) => {
    const celda = e.target.closest('.celda-clase-interactiva');
    if (!celda) return;

    if (celda.classList.contains('celda-rojo')) {
        abrirToast('Conflicto de Docente', 'Este docente no puede ser asignado aquí porque ya está impartiendo clases en otro grupo en este mismo módulo horario.');
        return;
    }
    if (celda.classList.contains('celda-amarillo')) {
        abrirToast('Conflicto de Aula', 'Este grupo ya tiene otra materia asignada en este módulo dentro de otro horario de la BD.');
        return;
    }

    const moduloId = celda.dataset.modulo;
    const dia = celda.dataset.dia;
    const llaveCell = `${moduloId}-${dia}`;

    if (celdasHorarioMemoria[llaveCell]) {
        delete celdasHorarioMemoria[llaveCell];
        renderizarMatrizInteractiva();
    } else {
        const idImparte = selectImparte.value;
        if (!idImparte) {
            abrirToast('Atención', 'Por favor, selecciona primero un binomio Docente-Materia en el menú de la izquierda.');
            return;
        }

        const imp = listaImparte.find(i => i.id == idImparte);

        if (imp.horasLibresCalculadas <= 0) {
            abrirToast('Sin Disponibilidad', `El docente ${imp.docente} ya no cuenta con horas semanales disponibles.`);
            return;
        }

        let colocadasBorrador = Object.values(celdasHorarioMemoria).filter(id => id == idImparte).length;
        if (colocadasBorrador >= imp.horas_semanales) {
            abrirToast('Límite de Materia', `Ya asignaste el máximo de horas semanales (${imp.horas_semanales} hrs) para la materia ${imp.materia}.`);
            return;
        }

        celdasHorarioMemoria[llaveCell] = idImparte;
        renderizarMatrizInteractiva();
    }
});

/* --------------------------------------------------------
GUARDADO Y CRUD CON MENSAJES DE ERROR VISUALES
-------------------------------------------------------- */
agregarHorario.addEventListener('click', async () => {
    modoFormulario = 'crear';
    celdasHorarioMemoria = {};
    inputNombreHorario.value = '';
    inputNombreHorario.disabled = false;
    selectGrupo.disabled = false;

    document.getElementById('modal-dinamico-titulo').textContent = "Crear Nuevo Horario General";

    await cargarCatalogosModal();
    await cargarOcupacionesGlobales('');
    renderizarMatrizInteractiva();
    modalFullscreen.classList.remove('hidden');
});

btnGuardarHorario.addEventListener('click', async () => {
    const nombreH = inputNombreHorario.value.trim();
    const grupoId = selectGrupo.value;

    if (!nombreH) {
        abrirToast('Datos Incompletos', 'Debes escribir un nombre identificador único para el bloque de horarios.');
        return;
    }

    if (Object.keys(celdasHorarioMemoria).length === 0) {
        abrirToast('Matriz Vacía', 'Asigna al menos una hora en la tabla interactiva antes de intentar guardar.');
        return;
    }

    try {
        if (modoFormulario === 'editar') {
            await window.api.ejecutarQuery('DELETE FROM horarios WHERE nombre_horario = ?', [nombreH]);
        }

        for (const [llave, idImparte] of Object.entries(celdasHorarioMemoria)) {
            const [idModulo, diaSemana] = llave.split('-');
            const sql = `INSERT INTO horarios (nombre_horario, id_grupo, id_imparte, id_modulo, dia_semana) VALUES (?, ?, ?, ?, ?)`;
            await window.api.ejecutarQuery(sql, [nombreH, grupoId, idImparte, idModulo, diaSemana]);
        }

        modalFullscreen.classList.add('hidden');
        await cargarListaHorarios();
    } catch (error) {
        console.error("Error capturado en el guardado:", error);
        let mensajeErrorVisual = "Ocurrió un traslape o error de restricción único en la base de datos al insertar los datos.";
        if (error.message && error.message.includes("no_traslape_grupo")) {
            mensajeErrorVisual = "Error de Traslape: El grupo ya cuenta con materias asignadas en las mismas horas.";
        } else if (error.message) {
            mensajeErrorVisual = `Detalle del Servidor: ${error.message}`;
        }

        abrirToast('Error al Guardar Horario', mensajeErrorVisual);
    }
});

horariosVistaRegistrados.addEventListener('click', async (e) => {
    const btnEliminar = e.target.closest('.subAction.eliminar');
    if (btnEliminar) {
        const nombreH = btnEliminar.dataset.nombre;
        const confirmacion = await abrirToast('Eliminar Horario', `¿Deseas remover el bloque completo "${nombreH}"?`, true);
        if (confirmacion) {
            try {
                await window.api.ejecutarQuery('DELETE FROM horarios WHERE nombre_horario = ?', [nombreH]);
                await cargarListaHorarios();
            } catch (error) {
                abrirToast('Error al eliminar', error.message);
            }
        }
        return;
    }

    const btnEditar = e.target.closest('.subAction.editar');
    if (btnEditar) {
        modoFormulario = 'editar';
        const nombreH = btnEditar.dataset.nombre;
        inputNombreHorario.value = nombreH;
        inputNombreHorario.disabled = true;

        document.getElementById('modal-dinamico-titulo').textContent = `Modificando: ${nombreH}`;

        await cargarCatalogosModal();
        await cargarOcupacionesGlobales(nombreH);

        try {
            const registros = await window.api.ejecutarQuery('SELECT * FROM horarios WHERE nombre_horario = ?', [nombreH]);
            celdasHorarioMemoria = {};

            if (registros.length > 0) {
                selectGrupo.value = registros[0].id_grupo;
                selectGrupo.disabled = true;
            }

            registros.forEach(reg => {
                const llave = `${reg.id_modulo}-${reg.dia_semana}`;
                celdasHorarioMemoria[llave] = reg.id_imparte;
            });

            renderizarMatrizInteractiva();
            modalFullscreen.classList.remove('hidden');
        } catch (error) {
            abrirToast('Error de Lectura', 'No se pudo cargar los detalles del horario seleccionado.');
        }
    }
});

btnCerrarModal.addEventListener('click', () => { modalFullscreen.classList.add('hidden'); });

btnView.forEach(btn => {
    btn.addEventListener('click', async () => {
        const nuevaVista = btn.classList[1];
        await guardarVista(nuevaVista);
        await window.api.abrirVentana(`./interfaces/${nuevaVista}.html`, {});
    });
});

document.addEventListener('DOMContentLoaded', async () => {
    await obtenerVista();
    await cargarListaHorarios();
});
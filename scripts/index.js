/* --------------------------------------------------------
VARIABLES DEL DOM
-------------------------------------------------------- */
const btnView = document.querySelectorAll(".asideBtn");

const docentesVista = document.getElementById('vista-docentes');

const crearDocenteDiv = document.getElementById('docente-info');
const btnCancelDiv = document.getElementById('cancel-form');
const formDocente = document.getElementById('form-docente-action');
const btnDispararDocenteDiv = document.getElementById('form-docente-disparar');

const toast = document.getElementById('toast');
const toastCheck = document.getElementById('toast-check');
const toastUncheck = document.getElementById('toast-uncheck');

/* --------------------------------------------------------
VARIABLES GENERALES
-------------------------------------------------------- */
let vistaActual;
let modoFormulario = 'crear';
let idDocenteEditar = null;

/* --------------------------------------------------------
FUNCIONES GENERALES
-------------------------------------------------------- */
async function obtenerVista() {
    try {
        vistaActual = await window.api.obtenerVista();
        desactivarActual();
    } catch (error) {
        console.error('Error al obtener la vista actual:', error);
    }
}

async function guardarVista(nuevaVista) {
    try {
        await window.api.guardarVista(nuevaVista);
    } catch (error) {
        console.error('Error al guardar la vista:', error);
    }
}

function desactivarActual() {
    btnView.forEach(btn => {
        if (btn.classList[1] === vistaActual) btn.disabled = true;
    });
}

async function cargarDocentes() {
    try {
        const sql = 'SELECT * FROM docentes';
        const response = await window.api.ejecutarQuery(sql, []);

        docentesVista.innerHTML = `<button class="action agregar" id="agregar-docente"><i class="ri-add-large-fill"></i></button>`;

        response.forEach(docente => {
            const docenteCard = `
                <div class="registrado">
                    <h2 class="registered docente">${docente.nombre} <i class="ri-user-fill"></i></h2>
                    <button class="subAction editar" data-id="${docente.id}" title="Editar el Docente existente">
                        <i class="ri-pencil-line"></i>
                    </button>
                    <button class="subAction eliminar" data-id="${docente.id}" title="Eliminar el Docente existente">
                        <i class="ri-delete-bin-line"></i>
                    </button>
                </div>
            `;
            docentesVista.insertAdjacentHTML('beforeend', docenteCard);
        });
    } catch (error) {
        console.error('Error al renderizar los docentes:', error);
    }
}

async function eliminarDocente(id) {
    try {
        const sql = 'DELETE FROM docentes WHERE id = ?';
        await window.api.ejecutarQuery(sql, [id]);
    } catch (error) {
        console.error('Error al ejecutar DELETE:', error);
    }
}

function abrirToast(titulo, mensaje) {
    toast.classList.remove('hidden');

    const titleToast = document.getElementById('toast-title');
    const messageToast = document.getElementById('toast-message');

    titleToast.textContent = titulo;
    messageToast.textContent = mensaje;

    return new Promise((resolve) => {
        toastCheck.addEventListener('click', () => {
            toast.classList.add('hidden');
            resolve(true);
        }, { once: true });

        toastUncheck.addEventListener('click', () => {
            toast.classList.add('hidden');
            resolve(false);
        }, { once: true });
    });
}

/* --------------------------------------------------------
FUNCIONES DEL DOM
-------------------------------------------------------- */
btnView.forEach(btn => {
    btn.addEventListener('click', async () => {
        try {
            btn.disabled = true;
            const nuevaVista = btn.classList[1];

            await guardarVista(nuevaVista);
            await window.api.abrirVentana(`./interfaces/${nuevaVista}.html`, {});
        } catch (error) {
            console.error('Error al cambiar la vista:', error);
        } finally {
            btn.disabled = false;
        }
    });
});

docentesVista.addEventListener('click', async (e) => {
    const btnAgregar = e.target.closest('#agregar-docente');
    if (btnAgregar) {
        modoFormulario = 'crear';
        idDocenteEditar = null;
        formDocente.reset();

        crearDocenteDiv.classList.remove('hidden');
        btnDispararDocenteDiv.textContent = 'Crear';
        return;
    }

    const btnEliminar = e.target.closest('.subAction.eliminar');
    if (btnEliminar) {
        const id = btnEliminar.dataset.id;
        const confirmacion = await abrirToast('Eliminar Docente', 'Advertencia: Estás a punto de eliminar un docente ¡Esta acción no se puede deshacer! ¿Estás seguro?');

        if (confirmacion) {
            await eliminarDocente(id);
            await cargarDocentes();
        }
        return;
    }

    const btnEditar = e.target.closest('.subAction.editar');
    if (btnEditar) {
        modoFormulario = 'editar';
        idDocenteEditar = btnEditar.dataset.id;

        try {
            const sql = 'SELECT nombre, horas_disponibles FROM docentes WHERE id = ?';
            const row = await window.api.ejecutarQuery(sql, [idDocenteEditar]);

            if (row && row.length > 0) {
                const { nombre, horas_disponibles } = row[0];

                crearDocenteDiv.classList.remove('hidden');
                formDocente.querySelector('[name="nombre"]').value = nombre;
                formDocente.querySelector('[name="horas_disp"]').value = horas_disponibles;
                btnDispararDocenteDiv.textContent = 'Editar';
            }
        } catch (error) {
            console.error('Error al recuperar datos del docente para editar:', error);
        }
    }
});

btnCancelDiv.addEventListener('click', () => {
    crearDocenteDiv.classList.add('hidden');
});

formDocente.addEventListener('submit', async (e) => {
    e.preventDefault();

    const rawData = Object.fromEntries(new FormData(formDocente));
    const horasDisponibles = parseInt(rawData.horas_disp);

    try {
        if (modoFormulario === 'crear') {
            const sql = 'INSERT INTO docentes (nombre, horas_disponibles) VALUES (?, ?)';
            const params = [rawData.nombre, horasDisponibles];
            await window.api.ejecutarQuery(sql, params);
        } else {
            const sql = 'UPDATE docentes SET nombre = ?, horas_disponibles = ? WHERE id = ?';
            const params = [rawData.nombre, horasDisponibles, idDocenteEditar];
            await window.api.ejecutarQuery(sql, params);
        }

        await cargarDocentes();
        formDocente.reset();
        crearDocenteDiv.classList.add('hidden');
    } catch (error) {
        console.error(`Error al ${modoFormulario} el docente:`, error);
    }
});

/* --------------------------------------------------------
CARGA DEL DOM
-------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', async () => {
    await obtenerVista();
    await cargarDocentes();
});
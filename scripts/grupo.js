/* --------------------------------------------------------
VARIABLES DEL DOM
-------------------------------------------------------- */
const btnView = document.querySelectorAll(".asideBtn");

const gruposVistaRegistrados = document.getElementById('vista-grupo-registrados');
const btnCancelDiv = document.getElementById('cancel-form');
const agregarGrupo = document.getElementById('add-grupo');
const grupoInfo = document.getElementById('grupo-info');

const formGrupo = document.getElementById('form-grupo');

const toast = document.getElementById('toast');
const toastCheck = document.getElementById('toast-check');
const toastUncheck = document.getElementById('toast-uncheck');

/* --------------------------------------------------------
VARIABLES GENERALES
-------------------------------------------------------- */
let vistaActual;
let modoFormulario = 'crear';
let idGrupoEditar = null;

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

async function cargarGrupos() {
    try {
        const sql = 'SELECT * FROM grupos';
        const response = await window.api.ejecutarQuery(sql, []);

        gruposVistaRegistrados.innerHTML = '';

        response.forEach(grupo => {
            const grupoCard = `
                <div class="registered">
                    <h1 class="book-icon"><i class="ri-graduation-cap-fill"></i></h1>
                    <div class="content-titles">
                        <h2>Grupo: ${grupo.nombre}</h2>
                        <h2>Semestre: ${grupo.semestre}°</h2>
                    </div>
                    <button class="subAction editar" title="Editar el Grupo existente" data-id="${grupo.id}">
                        <i class="ri-pencil-line"></i>
                    </button>
                    <button class="subAction eliminar" title="Eliminar el Grupo existente" data-id="${grupo.id}">
                        <i class="ri-delete-bin-line"></i>
                    </button>
                </div>
            `;
            gruposVistaRegistrados.insertAdjacentHTML('beforeend', grupoCard);
        });
    } catch (error) {
        console.error('Error al renderizar los grupos:', error);
    }
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

agregarGrupo.addEventListener('click', () => {
    modoFormulario = 'crear';
    idGrupoEditar = null;
    formGrupo.reset();

    formGrupo.querySelector('.form-action').textContent = 'Crear';
    grupoInfo.classList.remove('hidden');
});

gruposVistaRegistrados.addEventListener('click', async (e) => {
    const btnEliminar = e.target.closest('.subAction.eliminar');
    if (btnEliminar) {
        const id = btnEliminar.dataset.id;
        const confirmacion = await abrirToast('Eliminar Grupo', 'Advertencia: Estás a punto de eliminar un grupo. ¡Esta acción no se puede deshacer! ¿Estás seguro?');

        if (confirmacion) {
            try {
                const sql = 'DELETE FROM grupos WHERE id = ?';
                await window.api.ejecutarQuery(sql, [id]);
                await cargarGrupos();
            } catch (error) {
                console.error('Error del servidor al eliminar el grupo:', error);
            }
        }
        return;
    }

    const btnEditar = e.target.closest('.subAction.editar');
    if (btnEditar) {
        modoFormulario = 'editar';
        idGrupoEditar = btnEditar.dataset.id;

        try {
            const sql = 'SELECT nombre, semestre FROM grupos WHERE id = ?';
            const row = await window.api.ejecutarQuery(sql, [idGrupoEditar]);

            if (row && row.length > 0) {
                const { nombre, semestre } = row[0];

                grupoInfo.classList.remove('hidden');
                formGrupo.querySelector('[name="nombre"]').value = nombre;
                formGrupo.querySelector('[name="semestre"]').value = semestre;
                formGrupo.querySelector('.form-action').textContent = 'Editar';
            }
        } catch (error) {
            console.error('Error al editar el grupo seleccionado:', error);
        }
    }
});

formGrupo.addEventListener('submit', async (e) => {
    e.preventDefault();

    const rawData = Object.fromEntries(new FormData(formGrupo));

    try {
        if (modoFormulario === 'crear') {
            const sql = 'INSERT INTO grupos (nombre, semestre) VALUES (?, ?)';
            const params = [rawData.nombre, rawData.semestre];
            await window.api.ejecutarQuery(sql, params);
        } else if (modoFormulario === 'editar') {
            const sql = 'UPDATE grupos SET nombre = ?, semestre = ? WHERE id = ?';
            const params = [rawData.nombre, rawData.semestre, idGrupoEditar];
            await window.api.ejecutarQuery(sql, params);
        }

        await cargarGrupos();
        formGrupo.reset();
        grupoInfo.classList.add('hidden');
    } catch (error) {
        console.error(`Error al ${modoFormulario} el grupo:`, error);
    }
});

btnCancelDiv.addEventListener('click', () => {
    grupoInfo.classList.add('hidden');
});

/* --------------------------------------------------------
CARGA DEL DOM
-------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', async () => {
    await obtenerVista();
    await cargarGrupos();
});
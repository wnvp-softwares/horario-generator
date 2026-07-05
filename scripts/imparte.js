/* --------------------------------------------------------
VARIABLES DEL DOM
-------------------------------------------------------- */
const btnView = document.querySelectorAll(".asideBtn");

const imparteVistaRegistrados = document.getElementById('vista-imparte-registrados');
const btnCancelDiv = document.getElementById('cancel-form');
const agregarImparte = document.getElementById('add-imparte');
const imparteInfo = document.getElementById('imparte-info');

const formImparte = document.getElementById('form-imparte');
const selectDocente = document.getElementById('select-docente');
const selectMateria = document.getElementById('select-materia');

const toast = document.getElementById('toast');
const toastCheck = document.getElementById('toast-check');
const toastUncheck = document.getElementById('toast-uncheck');

/* --------------------------------------------------------
VARIABLES GENERALES
-------------------------------------------------------- */
let vistaActual;
let modoFormulario = 'crear';
let idImparteEditar = null;

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

// Llena los selectores dinámicamente con los docentes y materias registrados
async function cargarSelects() {
    try {
        const docentes = await window.api.ejecutarQuery('SELECT id, nombre FROM docentes', []);
        selectDocente.innerHTML = docentes.map(d => `<option value="${d.id}">${d.nombre}</option>`).join('');

        const materias = await window.api.ejecutarQuery('SELECT id, nombre FROM materia', []);
        selectMateria.innerHTML = materias.map(m => `<option value="${m.id}">${m.nombre}</option>`).join('');
    } catch (error) {
        console.error('Error al cargar datos de selectores:', error);
    }
}

async function cargarImparte() {
    try {
        // Obtenemos los nombres combinando las tablas correspondientes
        const sql = `
            SELECT i.id, d.nombre AS docente, m.nombre AS materia 
            FROM imparte i
            JOIN docentes d ON i.id_docente = d.id
            JOIN materia m ON i.id_materia = m.id
        `;
        const response = await window.api.ejecutarQuery(sql, []);

        imparteVistaRegistrados.innerHTML = '';

        response.forEach(imparte => {
            const imparteCard = `
                <div class="registered">
                    <div class="content-titles">
                        <h2>${imparte.docente}</h2>
                        <h2>${imparte.materia}</h2>
                    </div>
                    <button class="subAction editar" title="Editar la Relacion - Imparte existente" data-id="${imparte.id}">
                        <i class="ri-pencil-line"></i>
                    </button>
                    <button class="subAction eliminar" title="Eliminar la Relacion - Imparte existente" data-id="${imparte.id}">
                        <i class="ri-delete-bin-line"></i>
                    </button>
                </div>
            `;
            imparteVistaRegistrados.insertAdjacentHTML('beforeend', imparteCard);
        });
    } catch (error) {
        console.error('Error al renderizar las relaciones de Imparte:', error);
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

agregarImparte.addEventListener('click', () => {
    modoFormulario = 'crear';
    idImparteEditar = null;
    formImparte.reset();

    formImparte.querySelector('.form-action').textContent = 'Crear';
    imparteInfo.classList.remove('hidden');
});

imparteVistaRegistrados.addEventListener('click', async (e) => {
    const btnEliminar = e.target.closest('.subAction.eliminar');
    if (btnEliminar) {
        const id = btnEliminar.dataset.id;
        const confirmacion = await abrirToast('Eliminar Asignación', '¿Estás seguro de que deseas eliminar esta asignación de materia?');

        if (confirmacion) {
            try {
                const sql = 'DELETE FROM imparte WHERE id = ?';
                await window.api.ejecutarQuery(sql, [id]);
                await cargarImparte();
            } catch (error) {
                console.error('Error del servidor al eliminar relación:', error);
            }
        }
        return;
    }

    const btnEditar = e.target.closest('.subAction.editar');
    if (btnEditar) {
        modoFormulario = 'editar';
        idImparteEditar = btnEditar.dataset.id;

        try {
            const sql = 'SELECT id_docente, id_materia FROM imparte WHERE id = ?';
            const row = await window.api.ejecutarQuery(sql, [idImparteEditar]);

            if (row && row.length > 0) {
                const { id_docente, id_materia } = row[0];

                imparteInfo.classList.remove('hidden');
                formImparte.querySelector('[name="id_docente"]').value = id_docente;
                formImparte.querySelector('[name="id_materia"]').value = id_materia;
                formImparte.querySelector('.form-action').textContent = 'Editar';
            }
        } catch (error) {
            console.error('Error al editar la asignación seleccionada:', error);
        }
    }
});

formImparte.addEventListener('submit', async (e) => {
    e.preventDefault();

    const rawData = Object.fromEntries(new FormData(formImparte));
    const id_docente = parseInt(rawData.id_docente);
    const id_materia = parseInt(rawData.id_materia);

    try {
        if (modoFormulario === 'crear') {
            const sql = 'INSERT INTO imparte (id_docente, id_materia) VALUES (?, ?)';
            const params = [id_docente, id_materia];
            await window.api.ejecutarQuery(sql, params);
        } else if (modoFormulario === 'editar') {
            const sql = 'UPDATE imparte SET id_docente = ?, id_materia = ? WHERE id = ?';
            const params = [id_docente, id_materia, idImparteEditar];
            await window.api.ejecutarQuery(sql, params);
        }

        await cargarImparte();
        formImparte.reset();
        imparteInfo.classList.add('hidden');
    } catch (error) {
        console.error(`Error al ${modoFormulario} la relación imparte:`, error);
    }
});

btnCancelDiv.addEventListener('click', () => {
    imparteInfo.classList.add('hidden');
});

/* --------------------------------------------------------
CARGA DEL DOM
-------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', async () => {
    await obtenerVista();
    await cargarSelects();
    await cargarImparte();
});
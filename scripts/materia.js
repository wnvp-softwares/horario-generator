/* --------------------------------------------------------
VARIABLES DEL DOM
-------------------------------------------------------- */
const btnView = document.querySelectorAll(".asideBtn");

const materiasVista = document.getElementById('vista-materia');
const materiasVistaRegistrados = document.getElementById('vista-materia-registrados');
const btnCancelDiv = document.getElementById('cancel-form');
const agregarMateria = document.getElementById('add-materia');
const materiaInfo = document.getElementById('materia-info');

const formMateria = document.getElementById('form-materia');

const toast = document.getElementById('toast');
const toastCheck = document.getElementById('toast-check');
const toastUncheck = document.getElementById('toast-uncheck');

/* --------------------------------------------------------
VARIABLES GENERALES
-------------------------------------------------------- */
let vistaActual;
let modoFormulario = 'crear';
let idMateriaEditar = null;

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

async function cargarMaterias() {
    try {
        const sql = 'SELECT * FROM materia';
        const response = await window.api.ejecutarQuery(sql, []);

        materiasVistaRegistrados.innerHTML = '';

        response.forEach(materia => {
            const materiaCard = `
                <div class="registered">
                    <h1 class="book-icon"><i class="ri-book-open-fill"></i></h1>
                    <h2 class="materia-name">${materia.nombre}</h2>
                    <h2 class="materia-sem">${materia.semestre}°</h2>
                    <button class="subAction editar" title="Editar la Materia existente" data-id="${materia.id}">
                        <i class="ri-pencil-line"></i>
                    </button>
                    <button class="subAction eliminar" title="Eliminar la Materia existente" data-id="${materia.id}">
                        <i class="ri-delete-bin-line"></i>
                    </button>
                </div>
            `;
            materiasVistaRegistrados.insertAdjacentHTML('beforeend', materiaCard);
        });
    } catch (error) {
        console.error('Error al renderizar las materias:', error);
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

agregarMateria.addEventListener('click', () => {
    modoFormulario = 'crear';
    idMateriaEditar = null;
    formMateria.reset();

    formMateria.querySelector('.form-action').textContent = 'Crear';
    materiaInfo.classList.remove('hidden');
});

materiasVistaRegistrados.addEventListener('click', async (e) => {
    const btnEliminar = e.target.closest('.subAction.eliminar');
    if (btnEliminar) {
        const id = btnEliminar.dataset.id;
        const confirmacion = await abrirToast('Eliminar Materia', 'Advertencia: Estas a punto de eliminar una materia ¡Esta acción no se puede deshacer! ¿Estás seguro?');

        if (confirmacion) {
            try {
                const sql = 'DELETE FROM materia WHERE id = ?';
                await window.api.ejecutarQuery(sql, [id]);
                await cargarMaterias();
            } catch (error) {
                console.error('Error de servidor al eliminar la materia:', error);
            }
        }
        return;
    }

    const btnEditar = e.target.closest('.subAction.editar');
    if (btnEditar) {
        modoFormulario = 'editar';
        idMateriaEditar = btnEditar.dataset.id;

        try {
            const sql = 'SELECT nombre, horas_semanales, semestre FROM materia WHERE id = ?';
            const row = await window.api.ejecutarQuery(sql, [idMateriaEditar]);

            if (row && row.length > 0) {
                const { nombre, horas_semanales, semestre } = row[0];

                materiaInfo.classList.remove('hidden');
                formMateria.querySelector('[name="nombre"]').value = nombre;
                formMateria.querySelector('[name="horas_sem"]').value = horas_semanales;
                formMateria.querySelector('[name="semestre"]').value = semestre;
                formMateria.querySelector('.form-action').textContent = 'Editar';
            }
        } catch (error) {
            console.error('Error al editar la materia seleccionada:', error);
        }
    }
});

formMateria.addEventListener('submit', async (e) => {
    e.preventDefault();

    const rawData = Object.fromEntries(new FormData(formMateria));
    const horas_semanales = parseInt(rawData.horas_sem);

    try {
        if (modoFormulario === 'crear') {
            const sql = 'INSERT INTO materia (nombre, horas_semanales, semestre) VALUES (?, ?, ?)';
            const params = [rawData.nombre, horas_semanales, rawData.semestre];
            await window.api.ejecutarQuery(sql, params);
        } else if (modoFormulario === 'editar') {
            const sql = 'UPDATE materia SET nombre = ?, horas_semanales = ?, semestre = ? WHERE id = ?';
            const params = [rawData.nombre, horas_semanales, rawData.semestre, idMateriaEditar];
            await window.api.ejecutarQuery(sql, params);
        }

        await cargarMaterias();
        formMateria.reset();
        materiaInfo.classList.add('hidden');
    } catch (error) {
        console.error(`Error al ${modoFormulario} la materia:`, error);
    }
});

btnCancelDiv.addEventListener('click', () => {
    materiaInfo.classList.add('hidden');
});

/* --------------------------------------------------------
CARGA DEL DOM
-------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', async () => {
    await obtenerVista();
    await cargarMaterias();
});
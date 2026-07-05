/* --------------------------------------------------------
VARIABLES DEL DOM
-------------------------------------------------------- */
const btnView = document.querySelectorAll(".asideBtn");

const clasesVistaRegistrados = document.getElementById('vista-clase-registrados');
const btnCancelDiv = document.getElementById('cancel-form');
const agregarClase = document.getElementById('add-clase');
const claseInfo = document.getElementById('clase-info');

const formClase = document.getElementById('form-clase');

const toast = document.getElementById('toast');
const toastCheck = document.getElementById('toast-check');
const toastUncheck = document.getElementById('toast-uncheck');

/* --------------------------------------------------------
VARIABLES GENERALES
-------------------------------------------------------- */
let vistaActual;
let modoFormulario = 'crear';
let idClaseEditar = null;

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

// Función auxiliar para quitarle los segundos de formato (HH:MM:SS -> HH:MM)
function formatearHora(horaString) {
    if (!horaString) return '';
    const partes = horaString.split(':');
    return `${partes[0]}:${partes[1]}`;
}

async function cargarClases() {
    try {
        const sql = 'SELECT * FROM modulos_horario';
        const response = await window.api.ejecutarQuery(sql, []);

        clasesVistaRegistrados.innerHTML = '';

        response.forEach(clase => {
            const inicio = formatearHora(clase.hora_inicio);
            const fin = formatearHora(clase.hora_fin);

            const claseCard = `
                <div class="registered-square">
                    <h1 class="clock-icon"><i class="ri-time-fill"></i></h1>
                    <div class="content-info-square">
                        <h2>${clase.nombre}</h2>
                        <p>${inicio} - ${fin}</p>
                    </div>
                    <div class="actions-bottom">
                        <button class="subAction editar" title="Editar Módulo" data-id="${clase.id}">
                            <i class="ri-pencil-line"></i>
                        </button>
                        <button class="subAction eliminar" title="Eliminar Módulo" data-id="${clase.id}">
                            <i class="ri-delete-bin-line"></i>
                        </button>
                    </div>
                </div>
            `;
            clasesVistaRegistrados.insertAdjacentHTML('beforeend', claseCard);
        });
    } catch (error) {
        console.error('Error al renderizar los módulos de clase:', error);
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

agregarClase.addEventListener('click', () => {
    modoFormulario = 'crear';
    idClaseEditar = null;
    formClase.reset();

    formClase.querySelector('.form-action').textContent = 'Crear';
    claseInfo.classList.remove('hidden');
});

clasesVistaRegistrados.addEventListener('click', async (e) => {
    const btnEliminar = e.target.closest('.subAction.eliminar');
    if (btnEliminar) {
        const id = btnEliminar.dataset.id;
        const confirmacion = await abrirToast('Eliminar Horario', '¿Estás seguro de que deseas eliminar este bloque de clase?');

        if (confirmacion) {
            try {
                const sql = 'DELETE FROM modulos_horario WHERE id = ?';
                await window.api.ejecutarQuery(sql, [id]);
                await cargarClases();
            } catch (error) {
                console.error('Error del servidor al eliminar el módulo:', error);
            }
        }
        return;
    }

    const btnEditar = e.target.closest('.subAction.editar');
    if (btnEditar) {
        modoFormulario = 'editar';
        idClaseEditar = btnEditar.dataset.id;

        try {
            const sql = 'SELECT nombre, hora_inicio, hora_fin FROM modulos_horario WHERE id = ?';
            const row = await window.api.ejecutarQuery(sql, [idClaseEditar]);

            if (row && row.length > 0) {
                const { nombre, hora_inicio, hora_fin } = row[0];

                claseInfo.classList.remove('hidden');
                formClase.querySelector('[name="nombre"]').value = nombre;
                formClase.querySelector('[name="hora_inicio"]').value = hora_inicio;
                formClase.querySelector('[name="hora_fin"]').value = hora_fin;
                formClase.querySelector('.form-action').textContent = 'Editar';
            }
        } catch (error) {
            console.error('Error al editar el módulo seleccionado:', error);
        }
    }
});

formClase.addEventListener('submit', async (e) => {
    e.preventDefault();

    const rawData = Object.fromEntries(new FormData(formClase));

    try {
        if (modoFormulario === 'crear') {
            const sql = 'INSERT INTO modulos_horario (nombre, hora_inicio, hora_fin) VALUES (?, ?, ?)';
            const params = [rawData.nombre, rawData.hora_inicio, rawData.hora_fin];
            await window.api.ejecutarQuery(sql, params);
        } else if (modoFormulario === 'editar') {
            const sql = 'UPDATE modulos_horario SET nombre = ?, hora_inicio = ?, hora_fin = ? WHERE id = ?';
            const params = [rawData.nombre, rawData.hora_inicio, rawData.hora_fin, idClaseEditar];
            await window.api.ejecutarQuery(sql, params);
        }

        await cargarClases();
        formClase.reset();
        claseInfo.classList.add('hidden');
    } catch (error) {
        console.error(`Error al ${modoFormulario} el módulo horario:`, error);
    }
});

btnCancelDiv.addEventListener('click', () => {
    claseInfo.classList.add('hidden');
});

/* --------------------------------------------------------
CARGA DEL DOM
-------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', async () => {
    await obtenerVista();
    await cargarClases();
});
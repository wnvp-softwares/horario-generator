require('dotenv').config();
const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');

const db = require('./configs/database.config.js')

let mainWindow;
let vistaActual = 'docente';

// METODO GENERAL PARA LA CREACION DE VENTANAS ==> REUTILIZABLE
function createAppWindow(htmlFile, customOptions = {}) {
    const defaultOptions = {
        width: 1920,
        height: 1080,
        frame: true,
        show: false,
        opacity: 0,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            devTools: process.env.NODE_ENV === 'dev'
        }
    };

    const finalOptions = {
        ...defaultOptions,
        ...customOptions,
        webPreferences: {
            ...defaultOptions.webPreferences,
            ...(customOptions.webPreferences || {})
        }
    };
    
    if (process.env.NODE_ENV !== 'dev') Menu.setApplicationMenu(null);

    const win = new BrowserWindow(finalOptions);
    win.loadFile(htmlFile);
    win.maximize();

    return win;
}

// METODO GENERAL PARA CONSULTAS SQL
ipcMain.handle('db:query', async (event, sql, params) => {
    try {
        const result = await db.query(sql, params);
        return result;
    } catch (error) {
        throw new Error(error.message);
    }
});

app.whenReady().then(() => {
    mainWindow = createAppWindow('./interfaces/docente.html');

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        let opacity = 0;
        const fadeIn = setInterval(() => {
            if (opacity >= 1) {
                clearInterval(fadeIn);
            } else {
                opacity += 0.1;
                mainWindow.setOpacity(opacity);
            }
        }, 16);
    });

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            mainWindow = createAppWindow('./interfaces/docente.html');
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

ipcMain.handle('ventana:nueva', (event, htmlFile, customOptions) => {
    const ventanaExistente = mainWindow;

    const nuevaVentana = createAppWindow(htmlFile, customOptions);

    nuevaVentana.once('ready-to-show', () => {
        nuevaVentana.show();

        let opacity = 0;
        const fadeIn = setInterval(() => {
            if (opacity >= 1) {
                clearInterval(fadeIn);

                if (ventanaExistente && !ventanaExistente.isDestroyed()) {
                    ventanaExistente.close();
                }
            } else {
                opacity += 0.1;
                nuevaVentana.setOpacity(opacity);
            }
        }, 16);
    });

    mainWindow = nuevaVentana;
});

ipcMain.handle('guardar:vista', (event, actual) => {
    vistaActual = actual;
});

ipcMain.handle('obtener:vista', event => {
    return vistaActual;
});
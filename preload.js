const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld('api', {
    abrirVentana: (htmlFile, customOptions) => ipcRenderer.invoke('ventana:nueva', htmlFile, customOptions),
    ejecutarQuery: (sql, params) => ipcRenderer.invoke('db:query', sql, params),
    guardarVista: (actual) => ipcRenderer.invoke('guardar:vista', actual),
    obtenerVista: () => ipcRenderer.invoke('obtener:vista'),
});
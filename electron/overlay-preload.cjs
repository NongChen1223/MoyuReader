const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('moyuOverlay', {
  onState(listener) {
    const wrappedListener = (_event, payload) => {
      listener(payload)
    }

    ipcRenderer.on('overlay:state', wrappedListener)
    return () => {
      ipcRenderer.removeListener('overlay:state', wrappedListener)
    }
  },
  emitAction(action) {
    ipcRenderer.send('overlay:action', action)
  },
  updateReadingLocation(payload) {
    ipcRenderer.send('overlay:reading-location', payload)
  },
  notifyVisible(payload) {
    ipcRenderer.send('overlay:visible', payload)
  },
  async getBounds() {
    return ipcRenderer.invoke('overlay:getBounds')
  },
  async setBounds(bounds) {
    return ipcRenderer.invoke('overlay:setBounds', bounds)
  },
  startDrag(payload) {
    ipcRenderer.send('overlay:startDrag', payload)
  },
  dragMove(payload) {
    ipcRenderer.send('overlay:dragMove', payload)
  },
  endDrag() {
    ipcRenderer.send('overlay:endDrag')
  },
})

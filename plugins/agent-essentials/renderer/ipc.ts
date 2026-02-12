export let ipc: any = null;

export const setIpc = (i: any) => {
    ipc = i;
};

export const getIpc = () => {
    if (!ipc) {
        console.warn('IPC not initialized');
    }
    return ipc;
};

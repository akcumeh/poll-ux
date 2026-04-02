let tTimer: ReturnType<typeof setTimeout> | undefined;

export function showToast(msg: string, col: string = '#84cc16'): void {
    clearTimeout(tTimer);
    (document.getElementById('ttxt') as HTMLElement).textContent = msg;
    (document.getElementById('tpip') as HTMLElement).style.background = col;
    document.getElementById('toast')!.classList.add('show');
    tTimer = setTimeout(() => document.getElementById('toast')!.classList.remove('show'), 2600);
}

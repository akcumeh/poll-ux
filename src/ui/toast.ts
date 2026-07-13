let toastTimer: number | undefined;

export function showToast(title: string, body = ''): void {
    const t = document.getElementById('toast');
    const tt = document.getElementById('toast-title');
    const tb = document.getElementById('toast-body');
    if (!t || !tt || !tb) return;
    tt.textContent = title;
    tb.textContent = body;
    tb.style.display = body ? 'block' : 'none';
    t.classList.add('show');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => t.classList.remove('show'), 3200);
}

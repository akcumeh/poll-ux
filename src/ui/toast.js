let tTimer;
export function showToast(msg, col = '#84cc16') {
    clearTimeout(tTimer);
    document.getElementById('ttxt').textContent = msg;
    document.getElementById('tpip').style.background = col;
    document.getElementById('toast').classList.add('show');
    tTimer = setTimeout(() => document.getElementById('toast').classList.remove('show'), 2600);
}

import './styles/main.scss';
import { RENDERERS } from './ui/nav.js';
import { rHome } from './pages/home.js';
import { rPolls, setF } from './pages/polls.js';
import { rLb, setLb } from './pages/leaderboard.js';
import { rRg } from './pages/regions.js';
// Wire up RENDERERS (avoids circular imports — stubs filled here)
RENDERERS.home = rHome;
RENDERERS.polls = rPolls;
RENDERERS.lb = rLb;
RENDERERS.rg = rRg;
// Expose event handlers to window for inline onclick= attributes in rendered HTML
import { doVote, toggleComments, toggleForm, doComment, aiInfo } from './ui/card.js';
import { go, toggleMnav, closeMnav } from './ui/nav.js';
window.doVote = doVote;
window.toggleComments = toggleComments;
window.toggleForm = toggleForm;
window.doComment = doComment;
window.aiInfo = aiInfo;
window.go = go;
window.setF = setF;
window.setLb = setLb;
window.toggleMnav = toggleMnav;
window.closeMnav = closeMnav;
// Boot sequence
import { getC } from './lib/storage.js';
import { loadFromSupabase } from './api/votes.js';
import { subscribeRealtime } from './api/realtime.js';
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape')
        closeMnav();
});
document.addEventListener('DOMContentLoaded', async () => {
    getC();
    rHome();
    await loadFromSupabase();
    subscribeRealtime();
});

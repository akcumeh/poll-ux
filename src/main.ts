import './styles/main.scss';

import { RENDERERS } from './ui/nav.js';
import { rHome } from './pages/home.js';
import { rPolls, setF, showSkeletons } from './pages/polls.js';
import { rLb } from './pages/leaderboard.js';
import { rRg } from './pages/regions.js';
import { rPulse, setPulse } from './pages/pulse.js';
import { rDetail, openDetail, toggleBriefing, refreshBriefing } from './pages/detail.js';

RENDERERS.home = rHome;
RENDERERS.polls = rPolls;
RENDERERS.lb = rLb;
RENDERERS.rg = rRg;
RENDERERS.pulse = rPulse;
RENDERERS.detail = rDetail;

import { shareCard } from './ui/card.js';
import { go, toggleMnav, closeMnav } from './ui/nav.js';
import {
    doVote, retractVote, submitCommentUI, reportCommentUI,
    openMethod, closeMethod, openAbout, closeAbout, regionSave, regionSkip, regionSaveInline, regionSkipInline,
    openRegionPromptUI,
} from './ui/trust.js';

window.doVote = doVote;
window.retractVote = retractVote;
window.openDetail = openDetail;
window.toggleBriefing = toggleBriefing;
window.refreshBriefing = refreshBriefing;
window.shareCard = shareCard;
window.submitCommentUI = submitCommentUI;
window.reportCommentUI = reportCommentUI;
window.openMethod = openMethod;
window.closeMethod = closeMethod;
window.openAbout = openAbout;
window.closeAbout = closeAbout;
window.regionSave = regionSave;
window.regionSkip = regionSkip;
window.regionSaveInline = regionSaveInline;
window.regionSkipInline = regionSkipInline;
window.openRegionPromptUI = openRegionPromptUI;
window.go = go;
window.setF = setF;
window.setPulse = setPulse;
window.rPolls = rPolls;
window.rLb = rLb;
window.toggleMnav = toggleMnav;
window.closeMnav = closeMnav;

window.openFilterDrawer = function () {
    document.getElementById('filter-drawer')?.classList.add('open');
    document.getElementById('filter-overlay')?.classList.add('open');
};
window.closeFilterDrawer = function () {
    document.getElementById('filter-drawer')?.classList.remove('open');
    document.getElementById('filter-overlay')?.classList.remove('open');
};

import { getC } from './lib/storage.js';
import { loadFromSupabase } from './api/votes.js';
import { subscribeRealtime } from './api/realtime.js';

const urlPol = new URLSearchParams(location.search).get('pol');

document.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
        closeMnav();
        window.closeFilterDrawer();
        closeMethod();
    }
});

document.addEventListener('DOMContentLoaded', async () => {
    document.body.classList.add('ready');
    getC();

    if (urlPol) {
        openDetail(urlPol);
    } else {
        rHome();
        showSkeletons(6);
    }

    await loadFromSupabase();
    subscribeRealtime();
});

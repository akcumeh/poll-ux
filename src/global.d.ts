export {};

declare global {
    interface Window {
        doVote: (...args: any[]) => any;
        retractVote: (...args: any[]) => any;
        openDetail: (...args: any[]) => any;
        toggleBriefing: (...args: any[]) => any;
        refreshBriefing: (...args: any[]) => any;
        shareCard: (...args: any[]) => any;
        submitCommentUI: (...args: any[]) => any;
        reportCommentUI: (...args: any[]) => any;
        openMethod: (...args: any[]) => any;
        closeMethod: (...args: any[]) => any;
        openAbout: (...args: any[]) => any;
        closeAbout: (...args: any[]) => any;
        regionSave: (...args: any[]) => any;
        regionSkip: (...args: any[]) => any;
        regionSaveInline: (...args: any[]) => any;
        regionSkipInline: (...args: any[]) => any;
        openRegionPromptUI: (...args: any[]) => any;
        go: (...args: any[]) => any;
        setF: (...args: any[]) => any;
        setPulse: (...args: any[]) => any;
        rPolls: (...args: any[]) => any;
        rLb: (...args: any[]) => any;
        toggleMnav: (...args: any[]) => any;
        closeMnav: (...args: any[]) => any;
        openFilterDrawer: (...args: any[]) => any;
        closeFilterDrawer: (...args: any[]) => any;
    }
}

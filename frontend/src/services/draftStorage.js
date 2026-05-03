const DRAFT_KEY = 'report_draft';

export const saveDraftToLocal = (draft) => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
};

export const getDraftFromLocal = () => {
    const draft = localStorage.getItem(DRAFT_KEY);
    return draft ? JSON.parse(draft) : null;
};

export const clearDraftFromLocal = () => {
    localStorage.removeItem(DRAFT_KEY);
};

export const hasDraft = () => {
    return localStorage.getItem(DRAFT_KEY) !== null;
};
import { useState, useEffect, useCallback } from 'react';
import API from '../services/api';
import { getDraftFromLocal, saveDraftToLocal, clearDraftFromLocal } from '../services/draftStorage';

const useDraft = (initialData) => {
    const [draftData, setDraftData] = useState(null);
    const [showReminder, setShowReminder] = useState(false);

    useEffect(() => {
        const localDraft = getDraftFromLocal();
        if (localDraft) {
            setShowReminder(true);
            setDraftData(localDraft);
        }
    }, []);

    const saveDraft = useCallback(async (data) => {
        saveDraftToLocal(data);
        setDraftData(data);
        try {
            const token = localStorage.getItem('token');
            await API.post('/drafts', data);
        } catch (error) {
            console.error('Failed to save draft to server:', error);
        }
    }, []);

    const loadDraft = useCallback(() => {
        const localDraft = getDraftFromLocal();
        if (localDraft) {
            setDraftData(localDraft);
            setShowReminder(false);
        }
    }, []);

    const clearDraft = useCallback(() => {
        clearDraftFromLocal();
        setDraftData(null);
        setShowReminder(false);
        // Optionally delete from server
        const token = localStorage.getItem('token');
        API.delete('/drafts')
            .catch(err => console.error('Failed to delete draft from server:', err));
    }, []);

    return { draftData, showReminder, saveDraft, loadDraft, clearDraft, hasDraft: !!draftData };
};

export default useDraft;
const DraftReport = require('../models/DraftReport');

const saveDraft = async (userId, draftData) => {
  const draft = await DraftReport.findOneAndUpdate(
    { user: userId, status: 'draft' },
    { ...draftData, updatedAt: new Date() },
    { upsert: true, new: true }
  );
  return draft;
};

const getDraft = async (userId) => {
  return await DraftReport.findOne({ user: userId, status: 'draft' });
};

const deleteDraft = async (userId) => {
  return await DraftReport.findOneAndDelete({ user: userId, status: 'draft' });
};

module.exports = { saveDraft, getDraft, deleteDraft };
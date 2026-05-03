const { saveDraft, getDraft, deleteDraft } = require('../services/draftService');

const saveDraftReport = async (req, res) => {
  try {
    const draft = await saveDraft(req.user.id, req.body);
    res.json({ success: true, data: draft });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getDraftReport = async (req, res) => {
  try {
    const draft = await getDraft(req.user.id);
    res.json({ success: true, data: draft });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteDraftReport = async (req, res) => {
  try {
    await deleteDraft(req.user.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { saveDraftReport, getDraftReport, deleteDraftReport };
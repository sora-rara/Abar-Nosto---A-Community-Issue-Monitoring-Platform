const Report = require('../models/Report');
const { generateIssueSummary } = require('../services/summaryService');

const getIssueSummary = async (req, res) => {
  try {
    const issue = await Report.findById(req.params.id);
    if (!issue) {
      return res.status(404).json({ success: false, message: 'Issue not found' });
    }
    const summary = generateIssueSummary(issue);
    res.json({ success: true, data: { summary } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getIssueSummary };
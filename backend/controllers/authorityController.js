const AuthorityContact = require('../models/AuthorityContact');

const getAuthorities = async (req, res) => {
  try {
    const { cityCorporation, ward, zone, type } = req.query;
    const filter = { isActive: true };
    if (cityCorporation) filter.cityCorporation = cityCorporation;
    if (ward) filter.ward = ward;
    if (zone) filter.zone = zone;
    if (type) filter.designation = type;

    const authorities = await AuthorityContact.find(filter).sort('ward');
    res.json({ success: true, data: authorities });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createAuthority = async (req, res) => {
  try {
    const authority = new AuthorityContact({ ...req.body, createdBy: req.user.id });
    await authority.save();
    res.status(201).json({ success: true, data: authority });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateAuthority = async (req, res) => {
  try {
    const authority = await AuthorityContact.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedBy: req.user.id, updatedAt: new Date() },
      { new: true }
    );
    res.json({ success: true, data: authority });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteAuthority = async (req, res) => {
  try {
    await AuthorityContact.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getAuthorities, createAuthority, updateAuthority, deleteAuthority };
const Role = require("./Role");

const createRole = async (req, res) => {
  try {
    const role = await Role.create(req.body);
    res.status(201).json(role);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const getAllRoles = async (req, res) => {
  try {
    const roles = await Role.find({ isDeleted: false });
    res.json(roles);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getRoleById = async (req, res) => {
  try {
    const role = await Role.findOne({
      _id: req.params.id,
      isDeleted: false,
    });
    if (!role) return res.status(404).json({ message: "Role not found" });
    res.json(role);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateRole = async (req, res) => {
  try {
    const role = await Role.findOneAndUpdate(
      { _id: req.params.id, isDeleted: false },
      req.body,
      { returnDocument: "after", runValidators: true }
    );
    if (!role) return res.status(404).json({ message: "Role not found" });
    res.json(role);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const deleteRole = async (req, res) => {
  try {
    const role = await Role.findOneAndUpdate(
      { _id: req.params.id, isDeleted: false },
      { isDeleted: true },
      { returnDocument: "after" }
    );
    if (!role) return res.status(404).json({ message: "Role not found" });
    res.json({ message: "Role deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createRole, getAllRoles, getRoleById, updateRole, deleteRole };

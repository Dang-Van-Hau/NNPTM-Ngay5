const User = require("./User");

const createUser = async (req, res) => {
  try {
    const user = await User.create(req.body);
    res.status(201).json(user);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const filter = { isDeleted: false };
    if (req.query.username) {
      filter.username = { $regex: req.query.username, $options: "i" };
    }
    const users = await User.find(filter).populate("role");
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getUserById = async (req, res) => {
  try {
    const user = await User.findOne({
      _id: req.params.id,
      isDeleted: false,
    }).populate("role");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateUser = async (req, res) => {
  try {
    const user = await User.findOneAndUpdate(
      { _id: req.params.id, isDeleted: false },
      req.body,
      { returnDocument: "after", runValidators: true }
    ).populate("role");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const deleteUser = async (req, res) => {
  try {
    const user = await User.findOneAndUpdate(
      { _id: req.params.id, isDeleted: false },
      { isDeleted: true },
      { returnDocument: "after" }
    );
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const enableUser = async (req, res) => {
  try {
    const { email, username } = req.body;
    if (!email || !username) {
      return res.status(400).json({ message: "email and username are required" });
    }
    const user = await User.findOneAndUpdate(
      { email, username, isDeleted: false },
      { status: true },
      { returnDocument: "after" }
    ).populate("role");
    if (!user) {
      return res.status(404).json({ message: "User not found or info incorrect" });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const disableUser = async (req, res) => {
  try {
    const { email, username } = req.body;
    if (!email || !username) {
      return res.status(400).json({ message: "email and username are required" });
    }
    const user = await User.findOneAndUpdate(
      { email, username, isDeleted: false },
      { status: false },
      { returnDocument: "after" }
    ).populate("role");
    if (!user) {
      return res.status(404).json({ message: "User not found or info incorrect" });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getUsersByRole = async (req, res) => {
  try {
    const users = await User.find({
      role: req.params.id,
      isDeleted: false,
    }).populate("role");
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  enableUser,
  disableUser,
  getUsersByRole,
};

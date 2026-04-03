const Report = require("../models/Report");

// Generate shareable report
exports.createShareableReport = async (req, res) => {
  try {
    const { user, stats, period } = req.body;

    const report = await Report.create({
      user,
      stats,
      period,
    });

    res.json({
      id: report._id,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to create report" });
  }
};

// Get report by ID
exports.getSharedReport = async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);

    if (!report) {
      return res.status(404).json({ error: "Report not found" });
    }

    res.json(report);
  } catch (err) {
    res.status(500).json({ error: "Error fetching report" });
  }
};
const rlService = require("../services/rlService");

exports.updateReward = async (req, res) => {
  try {

    const userId = req.user.id;

    const previousScore = Number(req.body.previousScore);
    const newScore = Number(req.body.newScore);
    const { action } = req.body;

    if (!Number.isFinite(previousScore) || !Number.isFinite(newScore) || !action) {
      return res.status(400).json({
        message: "previousScore, newScore and action are required",
      });
    }

    const state = rlService.getState(previousScore);
    const nextState = rlService.getState(newScore);

    const reward = newScore - previousScore;

    await rlService.updateQValue(
      userId,
      state,
      action,
      reward,
      nextState
    );

    res.json({
      message: "RL learning updated",
    });

  } catch (error) {
    res.status(500).json({
      message: "RL update failed",
    });
  }
};

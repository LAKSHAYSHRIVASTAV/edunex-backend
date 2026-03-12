const rlService = require("../services/rlService");

exports.updateReward = async (req, res) => {
  try {

    const userId = req.user.id;

    const { previousScore, newScore, action } = req.body;

    const state = rlService.getState(previousScore);
    const nextState = rlService.getState(newScore);

    const reward = newScore - previousScore;

    await rlService.updateQ(
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
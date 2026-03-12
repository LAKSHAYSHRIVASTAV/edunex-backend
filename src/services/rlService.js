const RLState = require("../models/RLState");

const actions = ["easy_quiz", "medium_quiz", "hard_quiz"];

const alpha = 0.1;
const gamma = 0.9;

function getState(score) {
  if (score < 50) return "weak";
  if (score < 75) return "average";
  return "strong";
}
function getTopicState(topicScore) {

  if (topicScore < 50) return "weak_topic";

  if (topicScore < 75) return "average_topic";

  return "strong_topic";

}

async function chooseAction(userId, state) {

  let rl = await RLState.findOne({ user: userId, state });

  if (!rl) {
    rl = await RLState.create({
      user: userId,
      state,
    });
  }

  const q = rl.qValues;

  const bestAction =
    Object.keys(q).reduce((a, b) => (q[a] > q[b] ? a : b));

  return bestAction;
}

async function updateQ(userId, state, action, reward, nextState) {

  let rl = await RLState.findOne({ user: userId, state });

  if (!rl) {
    rl = await RLState.create({
      user: userId,
      state,
    });
  }

  const q = rl.qValues;

  const maxNext = Math.max(
    q.easy_quiz,
    q.medium_quiz,
    q.hard_quiz
  );

  q[action] =
    q[action] +
    alpha * (reward + gamma * maxNext - q[action]);

  await rl.save();
}

module.exports = {
  getState,
  getTopicState,
  chooseAction,
  updateQ,
};
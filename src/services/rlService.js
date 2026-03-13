const RLState = require("../models/RLState");

const actions = ["easy", "medium", "hard"];

const alpha = 0.1;   // learning rate
const gamma = 0.9;   // future reward
const epsilon = 0.2; // exploration rate


/* ===============================
   STATE DETECTION
================================ */

const getState = (score) => {

  if (score < 40) return "beginner";

  if (score < 70) return "intermediate";

  return "advanced";

};


/* ===============================
   ACTION SELECTION
================================ */

const chooseAction = async (userId, state) => {

  let userState = await RLState.findOne({ user: userId });

  if (!userState) {

    userState = await RLState.create({

      user: userId,

      qTable: {

        beginner: { easy: 0, medium: 0, hard: 0 },

        intermediate: { easy: 0, medium: 0, hard: 0 },

        advanced: { easy: 0, medium: 0, hard: 0 }

      }

    });

  }

  const qValues = userState.qTable[state];

  if (Math.random() < epsilon) {

    return actions[Math.floor(Math.random() * actions.length)];

  }

  return Object.keys(qValues).reduce((a, b) =>
    qValues[a] > qValues[b] ? a : b
  );

};


/* ===============================
   Q LEARNING UPDATE
================================ */

const updateQValue = async (userId, state, action, reward) => {

  const userState = await RLState.findOne({ user: userId });

  if (!userState) return;

  const currentQ = userState.qTable[state][action];

  const maxFuture = Math.max(
    ...Object.values(userState.qTable[state])
  );

  const newQ =
    currentQ +
    alpha * (reward + gamma * maxFuture - currentQ);

  userState.qTable[state][action] = newQ;

  await userState.save();

};


module.exports = {

  getState,

  chooseAction,

  updateQValue

};
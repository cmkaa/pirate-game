var moment = require('moment');

var generateMessage = (from, text) => {
  return {
    from,
    text,
    createdAt: moment().valueOf()
  };
};

var generateReadyButtonMessage = (from) => {
  return {
    from,
    createdAt: moment().valueOf()
  };
};

var generatePlayerStatusMessage = (players, game) => {
  return {
    playing: `${players[activePlayer].name} is playing.`,
    turn: game.turn,
    phase: game.activePhase 
  };
};

var generateActivePlayerStatusMessage = (game) => {
  return {
    playing: "You are playing",
    turn: game.turn,
    phase: game.activePhase 
  };
};

module.exports = { generateMessage, generateReadyButtonMessage };


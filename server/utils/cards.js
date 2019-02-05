const NUMBEROFSTARTCARDS = 5;
const WIND_CARDS = 10;
const SHIP_CARDS = 10;
const TREASSURE_CARDS = 10;
const DIVER_CARDS = 5; // should be 5


function prepareCards(game, cards) {
  return new Promise(resolve => {
    // ADD WIND_CARDS

    for (var i=0; i<WIND_CARDS; i++) {
      var card = {
        suit: "wind",
      }
    cards.push(card);
    }
    // SHIP_CARDS = 10;
    for (var i=0; i<SHIP_CARDS; i++) {
      var card = {
        suit: "ship",
      }
      cards.push(card);
    }

    // TREASSURE_CARDS ;
    var x;
    var y;
    for (var i=0; i<TREASSURE_CARDS; i++) {
      x = Math.floor(Math.random() * game.BOARD_COLS);
      y = Math.floor(Math.random() * game.BOARD_ROWS);

      if (x<1){x=1}
      if (x>game.BOARD_COLS-2){x=game.BOARD_COLS-2}
      if (y<1){y=1}
      if (y>game.BOARD_ROWS-2){y=game.BOARD_ROWS-2}

      // check for habour hexes? TODO2

      var card = {
        suit: "treassure",
        posX: x,
        posY: y
      }
      cards.push(card);
    }
    // DIVER_CARDS = 10;
    for (var i=0; i<DIVER_CARDS; i++) {
      var card = {
        suit: "diver",
      }
      cards.push(card);
    }
    resolve();
  });
}

function shuffleDeck(cards) {
  return new Promise(resolve => {
	for (let i = cards.length - 1; i > 0; i--) {
		let j = Math.floor(Math.random() * (i + 1));
		let temp = cards[i];
		cards[i] = cards[j];
		cards[j] = temp;
  }
  resolve();
});
}

function dealCards(players, cards) {
  return new Promise(resolve => {
  
    for (let j = 0; j < NUMBEROFSTARTCARDS; j++) {  
      for (let i = 0; i < players.length; i++) {
      players[i].cards.push(cards[0]); // øverste kort til spiller 0
      cards.shift();// remove delt card from stack
      }
    }
    resolve();
  });
}

module.exports = { prepareCards, shuffleDeck, dealCards };
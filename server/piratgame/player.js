
class Player {

  constructor(id, name, socketid) {
    this.id = id;
    this.name = name;
    this.gold = 0;
    this.socketid = socketid;
    this.shipscoords = []; // shipcoords = [[x,y], [x,y], [x,y], [x,y]] // sunkship = [-1,-1]
    this.lastMoved = -1;
    this.shipsgold = [0, 0, 0, 0]; 
    this.defensiveFireOptions = [];
    this.cards = [];
    this.haswind = false;
    this.sitoutturns = 0;
  }

  numberOfShips() { 
    // a sunk ship has coords [-1,-1]
    let ships = 0;
    for (let i = 0; i < 4; i++) {
      if (this.shipscoords[i][0] != -1) {
        ships++;
      }
    }
    return ships; 
  }

  numberOfShipCards() {
    let shipCards = 0;
    if (this.cards.length > 0){ // only if player got cards
      for (let i = 0; i < this.cards.length; i++) { // run through cards
        if (this.cards[i].suit === 'ship') {
          shipCards++;
        }
      }
    }
    return shipCards;
  }

}

module.exports = { Player }
  

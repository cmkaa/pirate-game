// the pirate game object



class Game {


  constructor() {
    
    this.turn = 1;
    this.activePlayer = 0;
    this.activePhase = 1; // starting in card phase
    this.dieRoll = 0; // ud af object?
    this.movesLeft = 0; 

    this.cardareaaction = false; // ud af object?
    this.boardareaaction = false; // ud af object?
    this.goldInSea = [];
    this.NUMBEROFTURNS = 10;
    this.tileGrid = 
     [
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 1, 1, 1, 1, 1, 3, 3, 3, 3, 3, 3, 1, 1, 1, 0,
      0, 1, 2, 1, 1, 1, 3, 3, 3, 3, 3, 3, 3, 2, 1, 0,
      0, 1, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 1, 0,
      0, 1, 3, 3, 3, 3, 3, 3, 3, 1, 3, 3, 3, 3, 1, 0,
      0, 1, 3, 3, 3, 3, 3, 1, 1, 1, 3, 3, 3, 3, 1, 0,
      0, 1, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 1, 0,
      0, 1, 3, 3, 3, 1, 1, 3, 3, 3, 3, 3, 3, 3, 1, 0,
      0, 1, 3, 3, 3, 3, 3, 3, 3, 3, 3, 2, 1, 3, 1, 0,
      0, 1, 2, 1, 3, 3, 3, 3, 3, 3, 3, 1, 1, 1, 1, 0,
      0, 1, 1, 1, 1, 1, 3, 3, 1, 1, 1, 1, 1, 1, 1, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    ];

    // [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    //   0, 3, 3, 3, 1, 1, 1, 1, 3, 3, 1, 1, 3, 1, 1, 0,
    //   0, 2, 3, 3, 3, 1, 3, 3, 3, 1, 1, 1, 3, 1, 1, 0,
    //   0, 1, 3, 3, 3, 3, 3, 3, 3, 1, 1, 3, 3, 1, 1, 0,
    //   0, 1, 3, 3, 3, 3, 3, 3, 3, 1, 1, 3, 3, 3, 1, 0,
    //   0, 1, 3, 3, 3, 3, 1, 2, 3, 3, 3, 3, 3, 3, 1, 0,
    //   0, 1, 1, 3, 1, 1, 1, 1, 3, 3, 3, 3, 3, 1, 1, 0,
    //   0, 1, 2, 3, 1, 1, 3, 3, 3, 3, 3, 3, 3, 1, 1, 0,
    //   0, 1, 1, 3, 3, 3, 3, 3, 3, 3, 2, 1, 3, 1, 1, 0,
    //   0, 3, 3, 3, 3, 3, 3, 3, 3, 3, 1, 1, 1, 1, 1, 0,
    //   0, 3, 3, 3, 3, 1, 3, 3, 3, 3, 1, 1, 1, 1, 1, 0,
    //   0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];


    this.BOARD_COLS = 16;
    this.BOARD_ROWS = 12;
    this.CANVAS_SIZE = 550; // 500
    this.TILE_SIZE = 50; // 50
    this.canvasCols = this.CANVAS_SIZE / this.TILE_SIZE;
    this.canvasRows = this.CANVAS_SIZE / this.TILE_SIZE;
    this.PLAYER_HABOUR_POSITIONS = [{x:2, y:2}, {x:11, y:8}, {x:2, y:9}, {x:13, y:2}]; // CHANGE

    this.fireOptions = []; // ud af object?
    this.selectedTarget = [-1, -1]; 
    this.activePlayer = 0; 
    this.selectedShip = -1;
    this.markedShip = -1;
    this.markedDefensiveFireTargets = [];
    this.markedDefensiveFireShips = [0,0,0,0];
    this.numberOfPlayers = 0;

    // CARDS
    this.selectedCardIndex = -1;
    this.selectedCardType;
    //this.markedCard =-1;
    this.playedCard; // needed?
    this.flagLandTreasure = false; // needed?
    this.treasureResolved = false; // needed?
    this.flagReadyToResolve = false; // needed?
    this.flagResolved = false;
    this.treasureX; // needed?
    this.treasureY; // needed?
    this.distanceToTreasure; // needed?
    this.goldOnLand = false;
    this.goldRange = -1;
    this.optionList = [];

  }

  getTurn() {
    return this.turn;
  }

  getPhase() {
    return this.activePhase;
  }

  getActivePlayer() {
    return this.activePlayer;
  }

}

module.exports = { Game } ;
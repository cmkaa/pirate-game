// BOARD SETTINGS
const TILE_SIZE = 50; // Player settings? TO DO: player can choose size and send to server
const TILE_GAP = 2;
const CANVAS_WIDTH = 550; // 700 - Player settings?
const CANVAS_HEIGHT = 550; //700 - Player settings?

var canvasCol; // the col of the canvas
var canvasRow; // the row of the canvas
var canvasCols = CANVAS_WIDTH/TILE_SIZE
var canvasRows = CANVAS_HEIGHT/TILE_SIZE

const BOARD_COLS = 16; // 16 - Server
const BOARD_ROWS = 12; // 12 - Server

var viewPoint = [0,0]; // until we get new coordinate from server - TO DO: do we need to initialize?
var colOffset;
var rowOffset;
var sitout = 0;

var tileGrid = []; // until we get new tilegrid from server -- TO DO: do we need to initialize?
//var goldInSea = []; // Fjern? Del af grid fra server

 // SETUP BOARD CANVAS
var canvas = document.getElementById('canvas');
var canvasContext = canvas.getContext('2d');

//SETUP CARD CANVAS
var cardcanvas = document.getElementById('card_canvas');
var cardcanvasContext = cardcanvas.getContext('2d');

var mouseX;
var mouseY;
var mouseCol;
var mouseRow;
  
// SETUP CARD CANVAS
var mouseCardX;
var mouseCardY;
var mouseCardIndex;
const CARD_WIDTH = 64;
const CARD_HEIGHT = 135;
//var selectedCardIndex = -1;

cardcanvasContext.font = "28px Georgia";
cardcanvasContext.fillStyle = "black";
cardcanvasContext.textAlign = "center";

// PRE LOAD IMAGES:
var boatPic1 = new Image();
boatPic1.src = '/js/libs/images/boat50x50_black.png';
var boatPic2 = new Image();
boatPic2.src = '/js/libs/images/boat50x50_blue.png';
var boatPic3 = new Image();
boatPic3.src = '/js/libs/images/boat50x50_red.png';
var boatPic4 = new Image();
boatPic4.src = '/js/libs/images/boat50x50_yellow.png';
var windCard = new Image();
windCard.src = '/js/libs/images/wind.png';
//windCard.src = '/js/libs/images/ship_storm_100x150.png';
var shipCard = new Image();
shipCard.src = '/js/libs/images/ship.png';
//shipCard.src = '/js/libs/images/ship_100x150.png';
var stormCard = new Image();
stormCard.src = '/js/libs/images/sitout.png';
//stormCard.src = '/js/libs/images/ship_crash_100x150.png';
var diverCard = new Image();
diverCard.src = '/js/libs/images/diver.png';
var treasureCard = new Image();
treasureCard.src = '/js/libs/images/treasuremap_100x150.png';

var mapImage = new Image();
mapImage.src = '/js/libs/images/map700_500.png';

//PRE LOAD SOUNDS:
var cannon = new Audio();
cannon.src = '/js/libs/sound/cannon.mp3';
var cheer = new Audio();
cannon.src = '/js/libs/sound/Cheering.mp3';
var dierollsound = new Audio();
dierollsound.src = '/js/libs/sound/dieroll.mp3';

function preloadImages() { // TO DO: are we sure they all get loaded ? make a promise function ?
  var imageArray = new Array('/js/libs/images/map800_600_50_1.png', '/js/libs/images/ship_storm_100x150.png', '/js/libs/images/ship_100x150.png', '/js/libs/images/ship_crash_100x150.png', '/js/libs/images/treasure_100x150.png', '/js/libs/images/treasuremap_100x150.png', '/js/libs/images/boat50x50_black.png', '/js/libs/images/boat50x50_blue.png', '/js/libs/images/boat50x50_red.png', '/js/libs/images/boat50x50_yellow.png');

  for (var i = 0; i < imageArray.length; i++) {
    var tempImage = new Image();
    tempImage.src = imageArray[i];
  }
}

function preloadSound() {
  var soundArray = new Array('/js/libs/sound/cannon.mp3', '/js/libs/sound/dieroll.mp3', '/js/libs/sound/Cheering.mp3');

  for (var i = 0; i < soundArray.length; i++) {
    var tempSound = new Audio();
    tempSound.src = soundArray[i];
  }
}

function updateMousePos(evt) {
		var rect = canvas.getBoundingClientRect();
		var root = document.documentElement;

		mouseX = evt.clientX - rect.left - root.scrollLeft;
		mouseY = evt.clientY - rect.top - root.scrollTop;
    //console.log('MouseX = ' + mouseX);
    //console.log('MouseY = ' + mouseY);
		drawBoardNew(); 
	}

function updateMousePosCards(evt) {
		var rect = cardcanvas.getBoundingClientRect();
		var root = document.documentElement;

		mouseCardX = evt.clientX - rect.left - root.scrollLeft;
    mouseCardY = evt.clientY - rect.top - root.scrollTop;
    //console.log('mouseCardX = ' + mouseCardX);
    //console.log('mouseCardY = ' + mouseCardY);

    drawCardBoard();
	}

function mouseclicked(evt) {
		canvasCol = Math.floor(mouseX / TILE_SIZE);
		canvasRow = Math.floor(mouseY / TILE_SIZE);

		mouseCol = viewPoint[0] + canvasCol - 1;
		mouseRow = viewPoint[1] + canvasRow - 1;
    
    // evaluete before we call - scroll click or map click?
		if (canvasCol === 0 && viewPoint[0] > 0){ // scroll west
      // Only west?      
      if (canvasRow === 0 && viewPoint[1] > 0) {
        socket.emit('scrollCanvas', playerId, 'NW', viewPoint);
      } else if (canvasRow === canvasRows - 1 && viewPoint[1] < BOARD_ROWS - (canvasRows - 2)) { // are we also going south?
        socket.emit('scrollCanvas', playerId, 'SW', viewPoint);
      } else { // only going west then
        socket.emit('scrollCanvas', playerId, 'W', viewPoint);
      }
    } else if (canvasRow === 0 && viewPoint[1] > 0){ // north      
        // Only north? 
        if (canvasCol === canvasCols - 1 && viewPoint[0] < BOARD_COLS - (canvasCols - 2)) {
          socket.emit('scrollCanvas', playerId, 'NE', viewPoint);
        } else { // only north then
          socket.emit('scrollCanvas', playerId, 'N', viewPoint);
          }
    } else if (canvasCol === canvasCols-1 && viewPoint[0] < BOARD_COLS-(canvasCols-2)){ // east
      // Only east?
      if (canvasRow === 0 && viewPoint[1] > 0) { // north
      } else if (canvasRow === canvasRows - 1 && viewPoint[1] < BOARD_ROWS - (canvasRows - 2)) { // south
        socket.emit('scrollCanvas', playerId, 'SE', viewPoint);
      } else { // only east then
        socket.emit('scrollCanvas', playerId, 'E', viewPoint);
      }     
    } else if (canvasRow === canvasRows-1 && viewPoint[1] < BOARD_ROWS-(canvasRows-2)){ // south
      // Only south?
      if (canvasCol === canvasCols - 1 && viewPoint[0] < BOARD_COLS - (canvasCols - 2)) { // east
      } else if (canvasCol === 0 && canvasTopLeftCoord[0] > 0) { // west
      } else { // only south then
        socket.emit('scrollCanvas', playerId, 'S', viewPoint);
      }
    } else {
      // if we end up here we clicked a hex on the board
      //console.log('we clicked a hex on the board: Col= ' + canvasCol + ' Row= ' + canvasRow);
      //console.log('we clicked a hex on the board: mouseCol= ' + mouseCol + ' mouseRow= ' + mouseRow);
      
      socket.emit('hexClicked', playerId, mouseCol, mouseRow);
    }
   } 

function mouseclickedCards(evt) {
  //console.log('mouseclickedCards called');

  // which area of cardcanvas is click from?

  if (mouseCardY < 50) {
    console.log('we are clicking in ship area');
    // 
    let shipId = Math.floor(mouseCardX / 50);
    console.log('clicked on ship id = ' + shipId);
    socket.emit('shipClicked', playerId, shipId);

  } else if (mouseCardY > 328) {
    console.log('we are clicking it played card area');
    // do nothing

  } else {
    console.log('we are clicking in card area');

    let x_Index = Math.floor(mouseCardX / (CARD_WIDTH + 2));
    let y_Index = Math.floor((mouseCardY - 54) / (CARD_HEIGHT + 2));

    mouseCardIndex = x_Index + (y_Index * 3);
    //console.log('mouseCardIndex = ' + mouseCardIndex);

    // we store last received cards array on client 
    // format playerCards = [{card : card, marking: 0}, {card : card, marking: 0}, {card : card, marking: 0} ]

    if (mouseCardIndex < playerCards.length) { // if the mouseCardIndex is < playerCards.length
      //console.log('socket.emit - CardClicked, playerId = ' + playerId + ' cardIndex = ' + mouseCardIndex);
      socket.emit('cardClicked', playerId, mouseCardIndex);
    } // else disregard click
    // check if card is clicked and emit cardClicked
    // calculate mouseCardIndex and compare to number of cards
  }
  
}

function drawMap() {
  // draws the map starting from viewpoint
  let x = viewPoint[0];
  let y = viewPoint[1];
  canvasContext.drawImage(mapImage, x * TILE_SIZE, y * TILE_SIZE, (canvasCols - 2) * TILE_SIZE, (canvasRows - 2) * TILE_SIZE, TILE_SIZE, TILE_SIZE, (canvasCols - 2) * TILE_SIZE, (canvasRows - 2) * TILE_SIZE);
  // drawImage(image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight);
  // drawImage(image, sx = image x pos, sy = image y pos, sWidth = how many pix of image in x , sHeight  = how many pix of image in y , dx = x pos in canvas, dy = y pos in canvas, dWidth = width in canvas, dHeight = heigth in canvas);

}

function drawHexes() {
  // from left to right
  for (let i = 1; i < CANVAS_WIDTH / TILE_SIZE; i++){
    // draw a vertical line
    drawLine(i * TILE_SIZE, TILE_SIZE, i * TILE_SIZE, CANVAS_HEIGHT-TILE_SIZE, 0.5, "black");
  }

  // from left to right
  for (let j = 1; j < CANVAS_HEIGHT / TILE_SIZE; j++) {
    // draw a vertical line
    drawLine(TILE_SIZE, j * TILE_SIZE, CANVAS_WIDTH - TILE_SIZE, j * TILE_SIZE, 0.5, "black");
  }
  // draw a vertical line
  //drawLine(fromX, fromY, toX, toY, lineWidth, lineColor)
}

function drawTilesInViewNew() {
  console.log('drawing this tileGrid =' + JSON.stringify(tileGrid));
  // takes a server prepared grid to draw in canvas
  // in our canvas we draw hexes from top left to bottom right
  // to leave white scroll area around the hex map - we start at 100, 100

  // change after use of map image

  let i = 0; // index counter for going through grid

  for (let eachRow = 1; eachRow < CANVAS_HEIGHT / TILE_SIZE - 1; eachRow++) {
    // loop from 1 to number of rows - 1
    for (let eachCol = 1; eachCol < CANVAS_WIDTH / TILE_SIZE - 1; eachCol++) {

      //hex = { goldInHex: false, shipInHex: { playerId: null, marking: "none", goldOnShip: 0 } };
      // first draw gold in sea

      if (tileGrid[i].goldInHex){
        // draw gold in hex
        drawGoldInSea(TILE_SIZE * (eachCol), TILE_SIZE * (eachRow), 'gold');
      }

      // do we have a ship in hex?

      if (tileGrid[i].shipInHex.playerId != null) {
        // ship in hex!

        // which color ship?
        switch (tileGrid[i].shipInHex.playerId) {
          case 0: 
            canvasContext.drawImage(boatPic1, (TILE_SIZE * (eachCol)) + TILE_GAP, (TILE_SIZE * (eachRow)) + TILE_GAP, TILE_SIZE - (3 * TILE_GAP), TILE_SIZE - (3 * TILE_GAP));
            break;

          case 1:
            canvasContext.drawImage(boatPic2, (TILE_SIZE * (eachCol)) + TILE_GAP, (TILE_SIZE * (eachRow)) + TILE_GAP, TILE_SIZE - (3 * TILE_GAP), TILE_SIZE - (3 * TILE_GAP));
            break; 

            case 2:
            canvasContext.drawImage(boatPic3, (TILE_SIZE * (eachCol)) + TILE_GAP, (TILE_SIZE * (eachRow)) + TILE_GAP, TILE_SIZE - (3 * TILE_GAP), TILE_SIZE - (3 * TILE_GAP));
            break;   

          case 3:
            canvasContext.drawImage(boatPic4, (TILE_SIZE * (eachCol)) + TILE_GAP, (TILE_SIZE * (eachRow)) + TILE_GAP, TILE_SIZE - (3 * TILE_GAP), TILE_SIZE - (3 * TILE_GAP));
            break;  
        }

        // gold on ship?
        if (tileGrid[i].shipInHex.goldOnShip === 1) { // Gold!
          drawGoldOnShip(TILE_SIZE * (eachCol), TILE_SIZE * (eachRow));
        }

        //  draw shadow
        colorRect(
          ((TILE_SIZE * eachCol) + (TILE_SIZE - (2 * TILE_GAP))),
          ((TILE_SIZE * eachRow) + TILE_GAP),
          TILE_GAP,
          TILE_SIZE - (TILE_GAP * 2), '#555');

        colorRect(
          (TILE_SIZE * eachCol) + TILE_GAP,
          (TILE_SIZE * eachRow) + (TILE_SIZE - (2 * TILE_GAP)),
          TILE_SIZE - (TILE_GAP * 2),
          TILE_GAP, '#555');

        // Check marking
        switch (tileGrid[i].shipInHex.marking) {
          case 'marked': { // marked ship
            outlineRectDotted(TILE_SIZE * (eachCol), TILE_SIZE * (eachRow), TILE_SIZE - TILE_GAP, TILE_SIZE - TILE_GAP, 'green');
            break;
          }

          case 'selected': { // selected ship
            outlineRect(TILE_SIZE * (eachCol), TILE_SIZE * (eachRow), TILE_SIZE - TILE_GAP, TILE_SIZE - TILE_GAP, 5, 'green');
            break;
          }

          case 'attackSelected': { // selected target
            outlineRect(TILE_SIZE * (eachCol), TILE_SIZE * (eachRow), TILE_SIZE - TILE_GAP, TILE_SIZE - TILE_GAP, 5, 'red');
            break;
          }

          case 'attackMarked': { // marked target
            outlineRectDotted(TILE_SIZE * (eachCol), TILE_SIZE * (eachRow), TILE_SIZE - TILE_GAP, TILE_SIZE - TILE_GAP, 'red');
            break;
          }

          default: { // 'none' = no markings
            break;
          }
        }

      }
      
      i++; // increase counter - next hex
    }
  }
}

function drawTileUnderMouse() { 
	let drawCanvasMouseCol = Math.floor(mouseX / TILE_SIZE);
	let drawCanvasMouseRow = Math.floor(mouseY / TILE_SIZE);
  outlineRect(TILE_SIZE * drawCanvasMouseCol - TILE_GAP, TILE_SIZE * drawCanvasMouseRow - TILE_GAP, TILE_SIZE + (2 * TILE_GAP), TILE_SIZE + (2 * TILE_GAP), 1, 'black');
}

function drawCoords() {


  let cordRow, cordCol;
  for (let eachRow = 0; eachRow < canvasRows-2; eachRow++) { 
    for (let eachCol = 0; eachCol < canvasCols - 2; eachCol++) { 
      cordRow = viewPoint[1] + eachRow;
      cordCol = viewPoint[0] + eachCol;

      if ((cordRow === 0 && cordCol === 0) || (cordRow === 0 && cordCol === BOARD_COLS - 1) || (cordCol === 0 && cordRow === BOARD_ROWS - 1) || (cordCol === BOARD_COLS - 1 && cordRow === BOARD_ROWS - 1)){ 
      } // upper left corner - do nothing
      else if (cordRow === 0 || cordRow === BOARD_ROWS - 1) { // first and last board row
        colorText(cordCol, TILE_SIZE * (eachCol + 1 ) + (TILE_SIZE / 2 - 6), TILE_SIZE * (eachRow + 1) + (TILE_SIZE / 2) + 4, 'black'); // draw only row number
      } 
      else if (cordCol === 0 || cordCol === BOARD_COLS - 1) // first and last boarc col
      { colorText(cordRow, TILE_SIZE * (eachCol + 1) + (TILE_SIZE / 2 - 6), TILE_SIZE * (eachRow + 1) + (TILE_SIZE / 2) + 4, 'black'); }
      
      else {
        //colorText(cordCol + "," + cordRow, TILE_SIZE * (eachCol + 1) + (TILE_SIZE / 2 - 8), TILE_SIZE * (eachRow + 1) + (TILE_SIZE / 2), 'white');
        // testing not showing coords in hexes - awaiting final decision
      }

    }
  }
}

function drawBoardNew() { 
  colorRect(0, 0, canvas.width, canvas.height, '#5a2d13'); // clear screen
  drawMap();
  drawTilesInViewNew(); 
  drawTileUnderMouse(); 
  drawHexes();
  drawCoords();
}

function clearBoard() {
  colorRect(0, 0, canvas.width, canvas.height, '#5a2d13'); // clear screen
  drawMap();
  drawTilesInViewNew();
  drawHexes();
  drawCoords();
}

function drawCardBoard() {
  // clear card area
  colorCardRect(0, 0, 200, 550, '#241106');
  drawCards();
  drawTileOverCards();
  drawSitout();
  drawPlayedCards();
  drawShipBox();
  drawTileOverShips();

}

function clearCards() {
  // clear card area
  colorCardRect(0, 0, 200, 550, '#241106')
  drawCards();
  drawSitout();
  drawPlayedCards();
  drawShipBox();
}

function drawSitout() { 
  clearSitoutCard();
  if (sitout > 0) {
    //console.log('drawing sitout = ' + sitout);
    drawSitoutCard();
  }
}

function drawTileOverCards() {
  
  if (mouseCardY > 54 && mouseCardY < 328 ) { // only in card area
  
    let x_Index = Math.floor( mouseCardX / (CARD_WIDTH + 2) );
    let y_Index = Math.floor( (mouseCardY - 54) / (CARD_HEIGHT + 2) );

    let mouseCardIndex = x_Index + (y_Index * 3);

    if (mouseCardIndex < playerCards.length) {
      outlineCardRect(x_Index * (CARD_WIDTH + 4) , (y_Index * (CARD_HEIGHT + 4)) + 54 , CARD_WIDTH, CARD_HEIGHT, 'green');
      //console.log('x_Index = ' + x_Index + ' y_Index = ' + y_Index);
    }
  }
}

function drawTileOverShips() {
  if (mouseCardY < 50 ) { // only in shipBox area

    let shipBoxIndex = Math.floor(mouseCardX / 50);
    outlineCardRect(shipBoxIndex * 50, 0, 50, 50, 'white');
    //console.log('shipBoxIndex = ' + shipBoxIndex);
    }
}

function drawCards() {
  // takes a server prepared array of cards and draws them on cardcanvas
  //console.log('going to draw these cards = ' + JSON.stringify(playerCards) + ' and with this index marked = ' + JSON.stringify(selectedCardIndex));
  
  // check player has cards?
  
  for (let i = 0; i < playerCards.length; i++) { // for each playerCard

    let x_Index = Math.floor(mouseCardX / (CARD_WIDTH + 2));
    let y_Index = Math.floor((mouseCardY - 54) / (CARD_HEIGHT + 2));

    mouseCardIndex = x_Index + (y_Index * 3);

    // we run through each card with a counter i
    // i must be split out in x_Index and y_Index

    if (i < 3) {
      x_Index = i;
      y_Index = 0;
    } else {
      y_Index = 1;
      x_Index = i - 3;
    }

    switch (playerCards[i].suit) { // what kind of card?
      case 'ship': { // draw ship card here
        cardcanvasContext.drawImage(shipCard, (x_Index * (CARD_WIDTH + 4)), (y_Index * (CARD_HEIGHT + 4)) + 54, CARD_WIDTH, CARD_HEIGHT);
        break;
      }
        
      case 'wind': { // draw wind card here
        cardcanvasContext.drawImage(windCard, (x_Index * (CARD_WIDTH + 4)), (y_Index * (CARD_HEIGHT + 4)) + 54, CARD_WIDTH, CARD_HEIGHT);
        break;
      }

      case 'diver': { // draw diver card here
        cardcanvasContext.drawImage(diverCard, (x_Index * (CARD_WIDTH + 4)), (y_Index * (CARD_HEIGHT + 4)) + 54, CARD_WIDTH, CARD_HEIGHT);
        break;
      }

      case 'treasure': { // draw treasure card here
        cardcanvasContext.drawImage(treasureCard, (x_Index * (CARD_WIDTH + 4)), (y_Index * (CARD_HEIGHT + 4)) + 54, CARD_WIDTH, CARD_HEIGHT);
        // draw coordinates of treasure
        cardcanvasContext.fillStyle = "black";
        cardcanvasContext.fillText(playerCards[i].posX + "," + playerCards[i].posY, (x_Index * (CARD_WIDTH + 4)) + 32, (y_Index * (CARD_HEIGHT + 4)) + 54 + 72);
        break;
      }
    }
  }
  // any marked card?
  if (selectedCardIndex != -1) {

    // calculate x_Index and y_Index
    if (selectedCardIndex < 3) {
      x_Index2 = selectedCardIndex;
      y_Index2 = 0;
    } else {
      y_Index2 = 1;
      x_Index2 = selectedCardIndex - 3;
    }

    outlineCardMarkedRect(x_Index2 * (CARD_WIDTH + 4), (y_Index2 * (CARD_HEIGHT + 4)) + 54 , CARD_WIDTH, CARD_HEIGHT, 'green');
  }
}

function drawSitoutCard() {
  cardcanvasContext.drawImage(stormCard, 136, 415, CARD_WIDTH, CARD_HEIGHT); // should be defined by constants
  // draw number of turns
  cardcanvasContext.fillStyle = "black";
  cardcanvasContext.fillText(sitout, 136 + 31, 415 + 79);
  outlineCardMarkedRect(139, 418, CARD_WIDTH-3, CARD_HEIGHT-3, 'red');
}

function clearSitoutCard() {
  // clear stack area
  colorCardRect(136, 415, CARD_WIDTH, CARD_HEIGHT, '#241106'); // should be defined by constants
}

function drawPlayedCards() { 
  // loop throuth playedCards 
  console.log('drawing played cards...');
  let numberOfPlayedCards = playedCards.length;
  if (numberOfPlayedCards > 0) {
    for (let i = 0; i < numberOfPlayedCards; i++) {
      switch (playedCards[i].suit) {
        case 'wind':
          console.log('drawing played cards...wind card');
          cardcanvasContext.drawImage(windCard, 0 + (i * 68), 415, CARD_WIDTH, CARD_HEIGHT); 
          break;
        case 'diver':
          console.log('drawing played cards...diver card');

          cardcanvasContext.drawImage(diverCard, 0 + (i * 68), 415, CARD_WIDTH, CARD_HEIGHT);
          break;
        case 'ship':
          console.log('drawing played cards...ship card');

          cardcanvasContext.drawImage(shipCard, 0 + (i * 68), 415, CARD_WIDTH, CARD_HEIGHT);
          break;
        case 'treasure':
          console.log('drawing played cards...treasure card');

          cardcanvasContext.drawImage(treasureCard, 0 + (i * 68), 415, CARD_WIDTH, CARD_HEIGHT);
          cardcanvasContext.fillStyle = "black";
          cardcanvasContext.fillText(playedCards[i].posX + "," + playedCards[i].posY, 32 + (i * 68), 415+72);
          // add treasure coords?
          break;
      }
    }
  }
}

function drawShipBox() {
  // 
  console.log('entering drawShipBox, with shipBox = ' + JSON.stringify(shipsBox));
  for (let i = 0; i < 4; i++) {
    // draw ship i

    // shipbox = [{ shipid: 0, marked: true, selected: false, hextype: -1, gold: false }, {}, {}, {}]
    console.log('switch is = ' + shipsBox[i].hextype);
    console.log('playerId = ' + playerId);
    switch (shipsBox[i].hextype) {
      case -1: // ship is sunk
        // draw hex = red square
        colorCardRect(i * 50, 0, 50, 50, 'red');
        // draw ship
        switch (playerId) {
          case 0:
            cardcanvasContext.drawImage(boatPic1, (i * 50) + 3, 3, 44, 44);
            break;
        
          case 1:
            cardcanvasContext.drawImage(boatPic2, (i * 50) + 3, 3, 44, 44);
            break;

          case 2:
            cardcanvasContext.drawImage(boatPic3, (i * 50) + 3, 3, 44, 44);
            break;

          case 3:
            cardcanvasContext.drawImage(boatPic4, (i * 50) + 3, 3, 44, 44);
            break;
        }
        break;

      case 1: // land  '#cab796'
        // draw hex
        colorCardRect(i * 50, 0, 50, 50, '#cab796');
        //cardcanvasContext.drawImage(`boatPic${playerId}`, (i * 50) + 3, 3, 44, 44);
        switch (playerId) {
          case 0:
            cardcanvasContext.drawImage(boatPic1, (i * 50) + 3, 3, 44, 44);
            break;

          case 1:
            cardcanvasContext.drawImage(boatPic2, (i * 50) + 3, 3, 44, 44);
            break;

          case 2:
            cardcanvasContext.drawImage(boatPic3, (i * 50) + 3, 3, 44, 44);
            break;

          case 3:
            cardcanvasContext.drawImage(boatPic4, (i * 50) + 3, 3, 44, 44);
            break;
        }
        break;

      case 2: // ship is in habour
        // draw hex = dark grey
        console.log('case 2 - now we colorRect at x = ' + i * 50 + ' and y= ' + 0);
        colorCardRect(i * 50, 0, 50, 50, 'grey');
        //cardcanvasContext.drawImage(`boatPic${playerId}`, (i * 50) + 3, 3, 44, 44);
        switch (playerId) {
          case 0:
            cardcanvasContext.drawImage(boatPic1, (i * 50) + 3, 3, 44, 44);
            break;

          case 1:
            cardcanvasContext.drawImage(boatPic2, (i * 50) + 3, 3, 44, 44);
            break;

          case 2:
            cardcanvasContext.drawImage(boatPic3, (i * 50) + 3, 3, 44, 44);
            break;

          case 3:
            cardcanvasContext.drawImage(boatPic4, (i * 50) + 3, 3, 44, 44);
            break;
        }
        break;

      case 3: // sea '#cbe1e1'
        colorCardRect(i * 50, 0, 50, 50, '#cbe1e1');
        //cardcanvasContext.drawImage(`boatPic${playerId}`, (i * 50) + 3, 3, 44, 44);
        switch (playerId) {
          case 0:
            cardcanvasContext.drawImage(boatPic1, (i * 50) + 3, 3, 44, 44);
            break;

          case 1:
            cardcanvasContext.drawImage(boatPic2, (i * 50) + 3, 3, 44, 44);
            break;

          case 2:
            cardcanvasContext.drawImage(boatPic3, (i * 50) + 3, 3, 44, 44);
            break;

          case 3:
            cardcanvasContext.drawImage(boatPic4, (i * 50) + 3, 3, 44, 44);
            break;
        }
        break;

      case 4: // gold '#cbe1e1'
        // draw gold marking
        colorCardRect(i * 50, 0, 50, 50, 'gold');
        //drawGoldInSea(i * 50, 0, 'gold'); // TODO2 - is it working?
        //cardcanvasContext.drawImage(`boatPic${playerId}`, (i * 50) + 3, 3, 44, 44);
        switch (playerId) {
          case 0:
            cardcanvasContext.drawImage(boatPic1, (i * 50) + 3, 3, 44, 44);
            break;

          case 1:
            cardcanvasContext.drawImage(boatPic2, (i * 50) + 3, 3, 44, 44);
            break;

          case 2:
            cardcanvasContext.drawImage(boatPic3, (i * 50) + 3, 3, 44, 44);
            break;

          case 3:
            cardcanvasContext.drawImage(boatPic4, (i * 50) + 3, 3, 44, 44);
            break;
        }

        break;
    }
    
    if (shipsBox[i].gold === true) {
      drawGoldShipBox(i * 50, 0, 'gold'); // TODO2 - draw in upper left instead
    } 
  }
}

function clearPlayedCards() {
  // clear stack area
  colorCardRect(0, 415, (2*CARD_WIDTH)+4, CARD_HEIGHT, 'white');
}

function colorRect(topLeftX, topLeftY, boxWidth, boxHeight, fillColor) {
	canvasContext.fillStyle = fillColor;
	canvasContext.fillRect(topLeftX, topLeftY, boxWidth, boxHeight);
}

function colorCardRect(topLeftX, topLeftY, boxWidth, boxHeight, fillColor) {
  cardcanvasContext.fillStyle = fillColor;
  cardcanvasContext.fillRect(topLeftX, topLeftY, boxWidth, boxHeight);
}

function colorText(showWords, textX,textY, fillColor) {
  canvasContext.fillStyle = fillColor;
  canvasContext.font = '20px Jim Nightshade';
	canvasContext.fillText(showWords, textX,textY);
}

function outlineRect(topLeftX, topLeftY, boxWidth, boxHeight, lineWidth, lineColor) {
	canvasContext.beginPath();
	canvasContext.strokeStyle = lineColor;
	canvasContext.lineWidth = lineWidth;
  canvasContext.rect(topLeftX, topLeftY, boxWidth, boxHeight);
	canvasContext.stroke();
}
    
function drawLine(fromX, fromY, toX, toY, lineWidth, lineColor) {
  canvasContext.beginPath();
  canvasContext.strokeStyle = lineColor;
  canvasContext.lineWidth = lineWidth;
  canvasContext.moveTo(fromX, fromY);
  canvasContext.lineTo(toX, toY);
  canvasContext.stroke();
}

function outlineRectDotted(topLeftX, topLeftY, boxWidth, boxHeight, lineColor) {
  canvasContext.beginPath();
  canvasContext.strokeStyle = lineColor;
  canvasContext.lineWidth = "5";
  canvasContext.rect(topLeftX, topLeftY, boxWidth, boxHeight);
  canvasContext.setLineDash([10, 10]);
  canvasContext.stroke();
  // reset dash to full line
  canvasContext.setLineDash([]);
  }

function drawGoldOnShip(topLeftX, topLeftY) {
  canvasContext.fillStyle = 'gold';
  canvasContext.strokeStyle = 'gold';
  canvasContext.moveTo(topLeftX, topLeftY);
  canvasContext.beginPath();
  canvasContext.lineTo(topLeftX + TILE_SIZE/3, topLeftY);
  canvasContext.lineTo(topLeftX, topLeftY + TILE_SIZE/3);
  canvasContext.lineTo(topLeftX, topLeftY);
  canvasContext.fill();
  }

function drawGoldInSea(topLeftX, topLeftY) {
  canvasContext.fillStyle = 'gold';
  canvasContext.strokeStyle = 'gold';
  canvasContext.moveTo(topLeftX + TILE_SIZE, topLeftY + (2*TILE_SIZE/3));
  canvasContext.beginPath();
  canvasContext.lineTo(topLeftX + TILE_SIZE, topLeftY + TILE_SIZE);
  canvasContext.lineTo(topLeftX + (2* TILE_SIZE / 3), topLeftY + TILE_SIZE);
  canvasContext.lineTo(topLeftX + TILE_SIZE, topLeftY + (2 * TILE_SIZE / 3));
  canvasContext.fill();
}

function drawGoldShipBox(topLeftX, topLeftY) { 
  cardcanvasContext.fillStyle = 'gold';
  cardcanvasContext.strokeStyle = 'gold';
  cardcanvasContext.moveTo(topLeftX, topLeftY);
  cardcanvasContext.beginPath();
  cardcanvasContext.lineTo(topLeftX + TILE_SIZE / 3, topLeftY);
  cardcanvasContext.lineTo(topLeftX, topLeftY + TILE_SIZE / 3);
  cardcanvasContext.lineTo(topLeftX, topLeftY);
  cardcanvasContext.fill();
}

function outlineCardRect(topLeftX, topLeftY, boxWidth, boxHeight, lineColor) {
  cardcanvasContext.beginPath();
  cardcanvasContext.strokeStyle = lineColor;
  cardcanvasContext.lineWidth = "5";
  cardcanvasContext.rect(topLeftX, topLeftY, boxWidth, boxHeight);
  cardcanvasContext.setLineDash([10, 10]);
  cardcanvasContext.stroke();
    // reset dash to full line
  cardcanvasContext.setLineDash([]);
}

function outlineCardMarkedRect(topLeftX, topLeftY, boxWidth, boxHeight, lineColor) {
  cardcanvasContext.beginPath();
  cardcanvasContext.strokeStyle = lineColor;
  cardcanvasContext.lineWidth = "5";
  cardcanvasContext.rect(topLeftX, topLeftY, boxWidth, boxHeight);
  cardcanvasContext.stroke();
}
// BOARD SETTINGS
const TILE_SIZE = 60; // Player settings? TO DO: player can choose size and send to server
const TILE_GAP = 2;
const CANVAS_WIDTH = 660; // 700 - Player settings?
const CANVAS_HEIGHT = 660; //700 - Player settings?

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
const CARD_WIDTH = 100;
const CARD_HEIGHT = 150;
//var selectedCardIndex = -1;

cardcanvasContext.font = "30px Georgia";
cardcanvasContext.fillStyle = "red";
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
windCard.src = '/js/libs/images/ship_storm_100x150.png';
var shipCard = new Image();
shipCard.src = '/js/libs/images/ship_100x150.png';
var stormCard = new Image();
stormCard.src = '/js/libs/images/ship_crash_100x150.png';
var diverCard = new Image();
diverCard.src = '/js/libs/images/treassure_100x150.png';
var treassureCard = new Image();
treassureCard.src = '/js/libs/images/treassuremap_100x150.png';

//PRE LOAD SOUNDS:
var cannon = new Audio();
cannon.src = '/js/libs/sound/cannon.mp3';
var cheer = new Audio();
cannon.src = '/js/libs/sound/Cheering.mp3';
var dierollsound = new Audio();
dierollsound.src = '/js/libs/sound/dieroll.mp3';

function preloadImages() { // TO DO: are we sure they all get loaded ? make a promise function ?
  var imageArray = new Array('/js/libs/images/ship_storm_100x150.png', '/js/libs/images/ship_100x150.png', '/js/libs/images/ship_crash_100x150.png', '/js/libs/images/treassure_100x150.png', '/js/libs/images/treassuremap_100x150.png', '/js/libs/images/boat50x50_black.png', '/js/libs/images/boat50x50_blue.png', '/js/libs/images/boat50x50_red.png', '/js/libs/images/boat50x50_yellow.png');

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

    // //drawBoard();
    if (mouseCardX < CARD_WIDTH * playerCards.length) { // only update if mouse is over cards
      drawCardBoard()
    }
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
          console.log('emit scrollNE');
          socket.emit('scrollCanvas', playerId, 'NE', viewPoint);
          //   console.log('scrollNW but we have done that so no emit');
        } else { // only north then
          console.log('emit scrollN');
          socket.emit('scrollCanvas', playerId, 'N', viewPoint);
          }
    } else if (canvasCol === canvasCols-1 && viewPoint[0] < BOARD_COLS-(canvasCols-2)){ // east
      // Only east?
      if (canvasRow === 0 && viewPoint[1] > 0) { // north
        console.log('emit scrollNE but we have done that so no emit');
      } else if (canvasRow === canvasRows - 1 && viewPoint[1] < BOARD_ROWS - (canvasRows - 2)) { // south
        console.log('emit scrollSE');
        socket.emit('scrollCanvas', playerId, 'SE', viewPoint);
      } else { // only east then
        console.log('emit scrollE');
        socket.emit('scrollCanvas', playerId, 'E', viewPoint);
      }     
    } else if (canvasRow === canvasRows-1 && viewPoint[1] < BOARD_ROWS-(canvasRows-2)){ // south
      // Only south?
      if (canvasCol === canvasCols - 1 && viewPoint[0] < BOARD_COLS - (canvasCols - 2)) { // east
        console.log('emit scrollSE but we have done that so no emit');
      } else if (canvasCol === 0 && canvasTopLeftCoord[0] > 0) { // west
        console.log('emit scrollSW but we have done that so no emit');
      } else { // only south then
        socket.emit('scrollCanvas', playerId, 'S', viewPoint);
      }
    } else {
      // if we end up here we clicked a hex on the board
      console.log('we clicked a hex on the board: Col= ' + canvasCol + ' Row= ' + canvasRow);
      console.log('we clicked a hex on the board: mouseCol= ' + mouseCol + ' mouseRow= ' + mouseRow);
      
      socket.emit('hexClicked', playerId, mouseCol, mouseRow);
    }
   } 

function mouseclickedCards(evt) {
  console.log('mouseclickedCards called');

		mouseCardIndex = Math.floor(mouseCardX / CARD_WIDTH);
		//console.log(mouseCardIndex);

    // we store last received cards array on client 
    // format playerCards = [{card : card, marking: 0}, {card : card, marking: 0}, {card : card, marking: 0} ]

    if ( mouseCardIndex < playerCards.length ) { // if the mouseCardIndex is < playerCards.length
      console.log('socket.emit - CardClicked, playerId = ' + playerId + ' cardIndex = ' + mouseCardIndex);
      socket.emit('cardClicked', playerId, mouseCardIndex);
    } // else disregard click
  }

function drawTilesInViewNew() { 
  // console.log('drawing this tileGrid =' + JSON.stringify(tileGrid));
  // takes a server prepared grid to draw in canvas
  // in our canvas we draw hexes from top left to bottom right
  // to leave white scroll area around the hex map - we start at 100, 100

  let i = 0; // index counter for going through grid
  for (let eachRow = 1; eachRow < CANVAS_HEIGHT / TILE_SIZE - 1; eachRow++) {
    // loop from 1 to number of rows - 1
    for (let eachCol = 1; eachCol < CANVAS_WIDTH / TILE_SIZE - 1; eachCol++) {
      // loop from 1 to number of cols -1
      //console.log('drawing index = ' + i + ' at x = ' + TILE_SIZE * (eachCol) + 'and y = ' + TILE_SIZE * (eachRow) + 'with value = ' + grid[i] );
      switch (tileGrid[i]) { // was (grid[i])
        case 0: {
          colorRect(TILE_SIZE * (eachCol), TILE_SIZE * (eachRow), TILE_SIZE - TILE_GAP, TILE_SIZE - TILE_GAP, 'black'); // TO DO: optimize the 4 calls to one with a colour argument?
          break;
        }
        case 1: { // land
          colorRect(TILE_SIZE * (eachCol), TILE_SIZE * (eachRow), TILE_SIZE - TILE_GAP, TILE_SIZE - TILE_GAP, '#cab796');
          break;
        }
        case 2: { // habour
          colorRect(TILE_SIZE * (eachCol), TILE_SIZE * (eachRow), TILE_SIZE - TILE_GAP, TILE_SIZE - TILE_GAP, 'grey');
          // and add stroke around
          //outlineRect(TILE_SIZE * (eachCol) - TILE_GAP, TILE_SIZE * (eachRow) - TILE_GAP, TILE_SIZE + (2 * TILE_GAP), TILE_SIZE + (2 * TILE_GAP), 'blue');

          break;
        }
        case 3: { // sea
          colorRect(TILE_SIZE * (eachCol), TILE_SIZE * (eachRow), TILE_SIZE - TILE_GAP, TILE_SIZE - TILE_GAP, '#cbe1e1');
          break;
        }
        case 4: { // gold in sea
          // draw sea hex
          colorRect(TILE_SIZE * (eachCol), TILE_SIZE * (eachRow), TILE_SIZE - TILE_GAP, TILE_SIZE - TILE_GAP, '#cbe1e1');
          //colorRect(TILE_SIZE * (eachCol), TILE_SIZE * (eachRow), TILE_SIZE - TILE_GAP, TILE_SIZE - TILE_GAP, 'yellow');
          // draw gold marking
          drawGoldInSea(TILE_SIZE * (eachCol), TILE_SIZE * (eachRow), 'gold');
          break;
        }

        default: {
          // then it must be a ship
          // first char of code indicates ship
          let code = tileGrid[i];
          var subcode = code.charAt(1); // get second digit

          switch (subcode) {
            case '0': { // player 0 ship     
              //colorRect(TILE_SIZE * (eachCol), TILE_SIZE * (eachRow), TILE_SIZE - TILE_GAP, TILE_SIZE - TILE_GAP, '#cbe1e1');
              canvasContext.drawImage(boatPic1, (TILE_SIZE * (eachCol)) + TILE_GAP , (TILE_SIZE * (eachRow)) + TILE_GAP, TILE_SIZE - (3 * TILE_GAP), TILE_SIZE - (3 * TILE_GAP));

              if (code.charAt(2) === '1') { // Gold!
                // gold marking
                //outlineRect(TILE_SIZE * (eachCol) + 4, TILE_SIZE * (eachRow) + 4, TILE_SIZE - TILE_GAP*5, TILE_SIZE - TILE_GAP*4, 'yellow');
                drawGoldOnShip(TILE_SIZE * (eachCol), TILE_SIZE * (eachRow));
              } 

              // check for marked or selected or selected target
              switch (code.charAt(3)) {
                case '1' : { // marked ship
                  outlineRectDotted(TILE_SIZE * (eachCol), TILE_SIZE * (eachRow), TILE_SIZE - TILE_GAP, TILE_SIZE - TILE_GAP, 'green');
                  break;
                }
                case '2': { // selected ship
                  outlineRect(TILE_SIZE * (eachCol), TILE_SIZE * (eachRow), TILE_SIZE - TILE_GAP, TILE_SIZE - TILE_GAP, 'green');
                  break;
                }
                case '3': { // selected target
                  outlineRect(TILE_SIZE * (eachCol), TILE_SIZE * (eachRow), TILE_SIZE - TILE_GAP, TILE_SIZE - TILE_GAP, 'red');
                  break;
                }
                case '4': { // marked target
                  outlineRectDotted(TILE_SIZE * (eachCol), TILE_SIZE * (eachRow), TILE_SIZE - TILE_GAP, TILE_SIZE - TILE_GAP, 'red');
                  break;
                }
                default: { // no markings
                  break;
                }
              }
              break;
            }  

            case '1': { // player 1 ship
              canvasContext.drawImage(boatPic2, (TILE_SIZE * (eachCol)) + TILE_GAP, (TILE_SIZE * (eachRow)) + TILE_GAP, TILE_SIZE - (3 * TILE_GAP), TILE_SIZE - (3 * TILE_GAP));
              
              if (code.charAt(2) === '1') { // Gold!
                // gold marking
                drawGoldOnShip(TILE_SIZE * (eachCol), TILE_SIZE * (eachRow));
                //outlineRect(TILE_SIZE * (eachCol) + 4, TILE_SIZE * (eachRow) + 4, TILE_SIZE - TILE_GAP * 5, TILE_SIZE - TILE_GAP * 4, 'yellow');              
              } 


              switch (code.charAt(3)) {
                case '1': { // marked ship
                  outlineRectDotted(TILE_SIZE * (eachCol), TILE_SIZE * (eachRow), TILE_SIZE - TILE_GAP, TILE_SIZE - TILE_GAP, 'green');
                  break;
                }
                case '2': { // selected ship
                  outlineRect(TILE_SIZE * (eachCol), TILE_SIZE * (eachRow), TILE_SIZE - TILE_GAP, TILE_SIZE - TILE_GAP, 'green');
                  break;
                }
                case '3': { // selected target
                  outlineRect(TILE_SIZE * (eachCol), TILE_SIZE * (eachRow), TILE_SIZE - TILE_GAP, TILE_SIZE - TILE_GAP, 'red');
                  break;
                }
                case '4': { // marked target
                  outlineRectDotted(TILE_SIZE * (eachCol), TILE_SIZE * (eachRow), TILE_SIZE - TILE_GAP, TILE_SIZE - TILE_GAP, 'red');
                  break;
                }
                default: { // no markings
                  break;
                }
              }
              
              break;
            }

            case '2': { // player 2 ship
              canvasContext.drawImage(boatPic3, (TILE_SIZE * (eachCol)) + TILE_GAP, (TILE_SIZE * (eachRow)) + TILE_GAP, TILE_SIZE - (3 * TILE_GAP), TILE_SIZE - (3 * TILE_GAP));

              if (code.charAt(2) === '1') { // Gold!
                // gold marking
                drawGoldOnShip(TILE_SIZE * (eachCol), TILE_SIZE * (eachRow));
                //outlineRect(TILE_SIZE * (eachCol) + 4, TILE_SIZE * (eachRow) + 4, TILE_SIZE - TILE_GAP * 5, TILE_SIZE - TILE_GAP * 4, 'yellow');              
              } 

              switch (code.charAt(3)) {
                case '1': { // marked ship
                  coutlineRectDotted(TILE_SIZE * (eachCol), TILE_SIZE * (eachRow), TILE_SIZE - TILE_GAP, TILE_SIZE - TILE_GAP, 'green');
                  break;
                }
                case '2': { // selected ship
                  outlineRect(TILE_SIZE * (eachCol), TILE_SIZE * (eachRow), TILE_SIZE - TILE_GAP, TILE_SIZE - TILE_GAP, 'green');
                  break;
                }
                case '3': { // selected target
                  outlineRect(TILE_SIZE * (eachCol), TILE_SIZE * (eachRow), TILE_SIZE - TILE_GAP, TILE_SIZE - TILE_GAP, 'red');
                  break;
                }
                case '4': { // marked target
                  outlineRectDotted(TILE_SIZE * (eachCol), TILE_SIZE * (eachRow), TILE_SIZE - TILE_GAP, TILE_SIZE - TILE_GAP, 'red');
                  break;
                }
                default: { // no markings
                  break;
                }
              }

              break;
            }

            case '3': { // player 3 ship
              canvasContext.drawImage(boatPic4, (TILE_SIZE * (eachCol)) + TILE_GAP, (TILE_SIZE * (eachRow)) + TILE_GAP, TILE_SIZE - (3 * TILE_GAP), TILE_SIZE - (3 * TILE_GAP));
              
              if (code.charAt(2) === '1') { // Gold!
                // gold marking
                drawGoldOnShip(TILE_SIZE * (eachCol), TILE_SIZE * (eachRow));
                //outlineRect(TILE_SIZE * (eachCol) + 4, TILE_SIZE * (eachRow) + 4, TILE_SIZE - TILE_GAP * 5, TILE_SIZE - TILE_GAP * 4, 'yellow');              
              } 

              switch (code.charAt(3)) {
                case '1': { // marked ship
                  outlineRectDotted(TILE_SIZE * (eachCol), TILE_SIZE * (eachRow), TILE_SIZE - TILE_GAP, TILE_SIZE - TILE_GAP, 'green');
                  break;
                }
                case '2': { // selected ship
                  outlineRect(TILE_SIZE * (eachCol), TILE_SIZE * (eachRow), TILE_SIZE - TILE_GAP, TILE_SIZE - TILE_GAP, 'green');
                  break;
                }
                case '3': { // selected target
                  outlineRect(TILE_SIZE * (eachCol), TILE_SIZE * (eachRow), TILE_SIZE - TILE_GAP, TILE_SIZE - TILE_GAP, 'red');
                  break;
                }
                case '4': { // marked target
                  outlineRectDotted(TILE_SIZE * (eachCol), TILE_SIZE * (eachRow), TILE_SIZE - TILE_GAP, TILE_SIZE - TILE_GAP, 'red');
                  break;
                }
                default: { // no markings
                  break;
                }
              }

              break;
            }
          }
        }
      }
      i++; // increase counter - next hex
    }
  }
}

function drawTileUnderMouse() { // lav om til en kant rundt om tile under mus
	let drawCanvasMouseCol = Math.floor(mouseX / TILE_SIZE);
	let drawCanvasMouseRow = Math.floor(mouseY / TILE_SIZE);

	outlineRect(TILE_SIZE*drawCanvasMouseCol,TILE_SIZE*drawCanvasMouseRow, TILE_SIZE-TILE_GAP, TILE_SIZE-TILE_GAP, 'black');
}

	function drawCoords() {

    let cordRow, cordCol;
    for (let eachRow = 0; eachRow < canvasRows-2; eachRow++) { 
      for (let eachCol = 0; eachCol < canvasCols - 2; eachCol++) { 
        cordRow = viewPoint[1] + eachRow;
        cordCol = viewPoint[0] + eachCol;

        if ((cordRow === 0 && cordCol === 0) || (cordRow === 0 && cordCol === BOARD_COLS - 1) || (cordCol === 0 && cordRow === BOARD_ROWS - 1) || (cordCol === BOARD_COLS - 1 && cordRow === BOARD_ROWS - 1))  { } // upper left corner - do nothing
        else if (cordRow === 0 || cordRow === BOARD_ROWS - 1) { // first and last board row
          colorText(cordCol, TILE_SIZE * (eachCol + 1 ) + (TILE_SIZE / 2 - 8), TILE_SIZE * (eachRow + 1) + (TILE_SIZE / 2), 'white'); // draw only row number
        } else if (cordCol === 0 || cordCol === BOARD_COLS - 1) { colorText(cordRow, TILE_SIZE * (eachCol + 1) + (TILE_SIZE / 2 - 8), TILE_SIZE * (eachRow + 1) + (TILE_SIZE / 2), 'white'); }
        else {
          colorText(cordCol + "," + cordRow, TILE_SIZE * (eachCol + 1) + (TILE_SIZE / 2 - 8), TILE_SIZE * (eachRow + 1) + (TILE_SIZE / 2), 'white');
        }

      }
    }
}

function drawBoardNew() { 
  colorRect(0, 0, canvas.width, canvas.height, 'lightblue'); // clear screen

  drawTilesInViewNew(); 

  drawTileUnderMouse(); 

  //drawMarkedPlayerShip();

  //drawTargetPlayerShip();

  //drawSelectedPlayerShip();

  drawCoords();

  //showStats();
}

function clearBoard() {
  colorRect(0, 0, canvas.width, canvas.height, 'lightblue'); // clear screen
  drawTilesInViewNew();
  drawCoords();
}

function drawCardBoard() {
  // clear card area
  colorCardRect(0, 0, 1160, 200, 'white') 
  drawCards();
  drawTileOverCards();
  drawSitout();
}

function clearCards() {
  // clear card area
  colorCardRect(0, 0, 1160, 200, 'white')
  drawCards();
  drawSitout();
}

function drawSitout() {
  if (sitout > 0) {
    console.log('drawing sitout = ' + sitout);
    colorCardRect(25, 50, 350, 60, 'white');
    cardcanvasContext.font = "36px Georgia";
    cardcanvasContext.fillStyle = "red";
    cardcanvasContext.fillText(`You sitout for ${sitout} turns`, 200, 90);
    cardcanvasContext.fillStyle = "white";
  }
}

function drawTileOverCards() {
  let index = Math.floor( mouseCardX / CARD_WIDTH );
  outlineCardRect(index * CARD_WIDTH , 0, CARD_WIDTH, CARD_HEIGHT, 'green');
}

function drawCards() {
  // takes a server prepared array of cards and draws them on cardcanvas
  //console.log('going to draw these cards = ' + JSON.stringify(playerCards) + ' and with this index marked = ' + JSON.stringify(selectedCardIndex));
  for (let i = 0; i < playerCards.length; i++) { // for each playerCard
    // draw this card with index at coord 

    switch (playerCards[i].suit) { // what kind of card?
      case 'ship': { // draw ship card here
        //console.log('drawing ship card in card index = ' + i);
        cardcanvasContext.drawImage(shipCard, (CARD_WIDTH * (i)), 0, CARD_WIDTH, CARD_HEIGHT);
        break;
      }
        
      case 'wind': { // draw wind card here
        //console.log('drawing wind card in card index = ' + i);
        cardcanvasContext.drawImage(windCard, (CARD_WIDTH * (i)), 0, CARD_WIDTH, CARD_HEIGHT);
      break;
      }

      case 'diver': { // draw diver card here
        //console.log('drawing ship card in card index = ' + i);
        cardcanvasContext.drawImage(diverCard, (CARD_WIDTH * (i)), 0, CARD_WIDTH, CARD_HEIGHT);
        break;
      }

      case 'treassure': { // draw treassure card here
        //console.log('drawing ship card in card index = ' + i);
        cardcanvasContext.drawImage(treassureCard, (CARD_WIDTH * (i)), 0, CARD_WIDTH, CARD_HEIGHT);
        // draw coordinates of treassure
        cardcanvasContext.fillText(playerCards[i].posX + "," + playerCards[i].posY, (CARD_WIDTH * i) + 50, 75);
        break;
      }
    }
  }
  // any marked card?
  if (selectedCardIndex != -1) {
    outlineCardMarkedRect(selectedCardIndex * CARD_WIDTH, 0, CARD_WIDTH, CARD_HEIGHT, 'green');
  }
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
	canvasContext.fillText(showWords, textX,textY);
}

function outlineRect(topLeftX, topLeftY, boxWidth, boxHeight, lineColor) {
	canvasContext.beginPath();
	canvasContext.strokeStyle = lineColor;
	canvasContext.lineWidth = "5";
  canvasContext.rect(topLeftX, topLeftY, boxWidth, boxHeight);
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
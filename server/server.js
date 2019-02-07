const path = require('path');
const http = require('http');
const express = require('express');
const socketIO = require('socket.io');

const { generateMessage, generateReadyButtonMessage } = require('./utils/message');
const { serverGameStats } = require('./utils/tools');
const { getGoldInSeaOptions, handleDieForFire, handleDieForMovement, shipInHex, isValidTarget, getFireOptions, handleShipCard, getPhaseName, isShipInHex, isActivePlayerShip, markDefensiveFireShips, markDefensiveFireTargetShips } = require('./utils/gameflow');

const { prepareCards, shuffleDeck, dealCards } = require('./utils/cards');
const { isRealString } = require('./utils/validation');
const { Users } = require('./utils/users');
const { Game } = require('./piratgame/game');
const { Player } = require('./piratgame/player');

const publicPath = path.join(__dirname, '../public');
const port = process.env.PORT || 3000;
var app = express();
var server = http.createServer(app);
var io = socketIO(server);
var users = new Users();
var cards = []; // CARDS: main card stack
var playedCards = [];
var players = [];
var game = new Game();

console.log('is game setup ok? ' + JSON.stringify(game));

app.use(express.static(publicPath));

io.on('connection', (socket) => {
  console.log('New user connected');

  socket.on('join', (params, callback) => {
    if (!isRealString(params.name) || !isRealString(params.game)) {
      return callback('name and game name are required!');
    }

    // check for unique name on server
    // if (!users.nameAvailable(params.name)) { // TEST without call to nameAvailable
    //   return callback('name allready in use!');
    // }

    // control max number of players in each game 
    if (users.getUserList(params.game).length > 1) { // max 2 players now
      return callback('Sorry game is full');
    }

    socket.join(params.game);
    users.removeUser(socket.id);
    users.addUser(socket.id, params.name, params.game);

    // on join show common information to all users in the game
    io.to(params.game).emit('updateUserList', users.getUserList(params.game));

    socket.emit('newMessage', generateMessage('Admin', 'Welcome to Pirates Online'));
    socket.broadcast.to(params.game).emit('newMessage', generateMessage('Admin', `${params.name} has joined the game.`));
    callback();
  });

  socket.on('createMessage', (message, callback) => {
    var user = users.getUser(socket.id);
    //console.log('socket on createMessage');
    if (user && isRealString(message.text)) {
      io.to(user.game).emit('newMessage', generateMessage(user.name, message.text));
    }

    callback();
  });

  socket.on('readyButtonClick', () => {

    var user = users.getUser(socket.id);

    if (user) {
      user.readytogo = !user.readytogo; // toggle user ready
      io.to(user.game).emit('updateUserList', users.getUserList(user.game));
      io.to(user.game).emit('readyButtonMessage', generateReadyButtonMessage(user.name)); // if we want to send a message
    }

    var areweready = 1;    
    users.getUsers().forEach(function (user) { 
      console.log('checkin user: ' + JSON.stringify(user));
      if (user.readytogo) {
        areweready *= 1;
      } else {
        areweready *= 0;
      }
    });

    if (areweready === 1) {     
      io.to(user.game).emit('newMessage', generateMessage('Admin', 'Game has started...good luck!'));
      io.to(user.game).emit('hideReadyButton'); // removes the ready button - was gameStarts

      // ADD PLAYERS
      users.getUsers().forEach(function (user) {
        players.push(new Player(players.length, user.name, user.id));
      });
      game.numberOfPlayers = players.length;

      for (let i = 0; i < game.numberOfPlayers; i++) {
        var cord = game.PLAYER_HABOUR_POSITIONS[i];
        players[i].shipscoords = [[cord.x, cord.y], [cord.x, cord.y], [cord.x, cord.y], [cord.x, cord.y]];
      }
     
      // SETUP CARDS
      prepareCards(game, cards).then(() => { 
        //console.log('cards build: ' + JSON.stringify(cards));
        shuffleDeck(cards).then(() => { // CHANGE TO AWAIT?
          //console.log('cards shuffled: ' + JSON.stringify(cards));
          shuffleDeck(cards).then(() => {
            //console.log('cards shuffled again: ' + JSON.stringify(cards));
            // deal cards to players at start
            dealCards(players, cards).then(() => {

              //STORM_CARDS = 6 add after dealing start cards to players
              for (var i=0; i<6; i++) {
              	let sitoutturns = Math.floor(Math.random() * 3) + 1; // sitout 1 to 3 turns
              	let card = {
              	  suit: "storm",
              	  turns: sitoutturns
              	}
              	cards.push(card);
              }
              shuffleDeck(cards).then(() => { // CHANGE TO AWAIT?
                //console.log('cards shuffled after sitouts: ' + JSON.stringify(cards));
                shuffleDeck(cards).then(() => {
                  //console.log('cards shuffled after sitouts again: ' + JSON.stringify(cards));

                  // Update Cards
                  players.forEach(function (player) {
                    //console.log('giving cards to players at start');
                    //console.log('player cards = ' + JSON.stringify(player.cards));
                    io.to(player.socketid).emit('drawPlayerCards', player.cards, game.selectedCardIndex); 
                  });
                });
              });
            });
          });
        });
      });
      // create scores // TO DO - make function
      let scoreArray = getScoreArray();

      players.forEach(function (player) {
        // Update Top panel - scoreboard
        io.to(player.socketid).emit('showScore', scoreArray); // message to each player about their score
        
        // Update Canvas
        let x = game.PLAYER_HABOUR_POSITIONS[player.id].x;
        let y = game.PLAYER_HABOUR_POSITIONS[player.id].y;
        updateCanvasPlayer(x, y, player.id).then(() => {
          // canvas updated for player
        });

        let startCoord = getCoords(x,y);
        // emit game start
        io.to(player.socketid).emit('gameStarts', player.id, startCoord);

        if (game.activePlayer === player.id) { // is activeplayer
          io.to(player.socketid).emit('updateActivePlayerStatus', players, game); 
        } else {
        io.to(player.socketid).emit('updatePlayerStatus', players, game); 
        }
        
      });   

      serverGameStats(game, players); // show game state in consol - server side

      // emit shipBox
      emitShipBox();
      // start the game
      gameControl();
    }
  });

  socket.on('actionButtonClick', () => {
    console.log('user clicked action button');
    
    var user = users.getUser(socket.id);
    // validate active user clicked
    if (user.id === players[game.activePlayer].socketid) {
      console.log('Active user clicked action button');
      let player = players[game.activePlayer];
      switch (game.activePhase) {
        case 1: { // DEFENSIVE PHASE
          console.log('Entering actionButtonClicked - in defensive phase')
          
          //if game.selectedDefensiveTarget != null
          console.log('game.selectedTarget = ' + game.selectedTarget);

          if (game.selectedTarget[0] != -1) {
            var numberOfFireOptions = player.defensiveFireOptions.length;
            var targetPlayer = game.selectedTarget[0];
            var targetShip = game.selectedTarget[1];
            //console.log('lets handle fire on selectedTarget');
            //console.log('rolling die');
            handleDieForFire().then((dieRoll) => {
            //console.log('Die roll of = ' + dieRoll);

            // setup info text and buttons
            io.to(player.socketid).emit('setupTextFireDieRoll', dieRoll);
            io.to(player.socketid).emit('hideActionButton');
            io.to(player.socketid).emit('hideCancelButton');

            switch (dieRoll) {
              case (1):
              case (2):
                //io.to(player.socketid).emit('setupTextFireNothing'); // emit nothing happend
                io.to(player.socketid).emit('updateInfoText', "warning", "<p>You missed the target</p>");
                console.log('Fire result = nothing happened');
                // TO DO: emit to other players 
                var text = `${player.name} fired on ${players[game.selectedTarget[0]].name} and rolled a ${dieRoll}. The attack failed.`
                emitNonActivePlayer(game.activePhase, text);

                // remove resolved option
                for (let i = numberOfFireOptions - 1; i > -1; i--) { // go through defensivefireoptions
                  if (game.selectedShip === player.defensiveFireOptions[i].attackedShip &&
                      player.defensiveFireOptions[i].attackingPlayer === game.selectedTarget[0] &&
                      player.defensiveFireOptions[i].attackingShip === game.selectedTarget[1]) { // look for the selected option and delete it from fireOptions
                      player.defensiveFireOptions.splice(i, 1);
                      console.log('found and deleted!');
                    }
                }
                break;

              case (3):
              case (4):
                if (players[targetPlayer].shipsgold[targetShip] === 1) { // target has gold
                  player.shipsgold[game.selectedShip] = 1; // give selectdShip gold
                  players[targetPlayer].shipsgold[targetShip] = 0; // and remove from target
                  io.to(player.socketid).emit('setupTextFireGold'); // emit what happend
                  var text = `${player.name} fired on ${players[game.selectedTarget[0]].name} and rolled a ${dieRoll}. Gold was taken!`
                  emitNonActivePlayer(game.activePhase, text);
                } else {
                  //io.to(player.socketid).emit('setupTextFireNothing'); // emit nothing happend
                  io.to(player.socketid).emit('updateInfoText', "warning", "<p>You missed the target</p>");


                  var text = `${player.name} fired on ${players[game.selectedTarget[0]].name} and rolled a ${dieRoll}. The attack failed.`
                  emitNonActivePlayer(game.activePhase, text);
                }

                // remove resolved option
                for (let i = numberOfFireOptions - 1; i > -1; i--) { // go through defensivefireoptions
                  if (game.selectedShip === player.defensiveFireOptions[i].attackedShip &&
                    player.defensiveFireOptions[i].attackingPlayer === game.selectedTarget[0] &&
                    player.defensiveFireOptions[i].attackingShip === game.selectedTarget[1]) { // look for the selected option and delete it from fireOptions
                    player.defensiveFireOptions.splice(i, 1);
                  }
                }
                break;

              case (5):
              case (6):
                targetSunk = true;
                let goldx = players[targetPlayer].shipscoords[targetShip][0];
                let goldy = players[targetPlayer].shipscoords[targetShip][1];
                players[targetPlayer].shipscoords[targetShip] = [-1, -1]; // implemantion of sunk ship
                players[targetPlayer].lastMoved = -1;
                  
                // gold in sea
                if (players[targetPlayer].shipsgold[targetShip] === 1) { // target has gold
                  game.goldInSea.push([goldx, goldy]); // add coord of sunk ship
                  players[targetPlayer].shipsgold[targetShip] = 0;
                  io.to(player.socketid).emit('setupTextFireSunk');
                  //console.log('Fire result = ship sunk and gold in sea');

                  var text = `${player.name} fired on ${players[game.selectedTarget[0]].name} and rolled a ${dieRoll}. Ship sunk and gold in sea!`
                  emitNonActivePlayer(game.activePhase, text);

                } else {
                  io.to(player.socketid).emit('setupTextFireSunk');
                  var text = `${player.name} fired on ${players[game.selectedTarget[0]].name} and rolled a ${dieRoll}. Ship sunk!`
                  emitNonActivePlayer(game.activePhase, text);
                }

                // ship sunk so update score to all players
                let scoreArray = getScoreArray();

                players.forEach(function (player) {
                  // update score
                  io.to(player.socketid).emit('showScore', scoreArray);
                }); 

                // remove resolved option and any option with same attacking player and ship
                // first removing resolved option
                for (let i = numberOfFireOptions - 1; i > -1; i--) { // go through defensivefireoptions
                  if (game.selectedShip === player.defensiveFireOptions[i].attackedShip &&
                    player.defensiveFireOptions[i].attackingPlayer === game.selectedTarget[0] &&
                    player.defensiveFireOptions[i].attackingShip === game.selectedTarget[1]) { // look for the selected option and delete it from fireOptions
                    player.defensiveFireOptions.splice(i, 1);
                  }
                }
                // if more options left -  check if same attacking player and ship is left in defensiveFireOptions
                numberOfFireOptions = player.defensiveFireOptions.length;
                if (numberOfFireOptions > 0) {
                  for (let i = numberOfFireOptions - 1; i > -1; i--) { // go through defensivefireoptions
                    if (player.defensiveFireOptions[i].attackingPlayer === game.selectedTarget[0] &&
                      player.defensiveFireOptions[i].attackingShip === game.selectedTarget[1]) { // look for the selected option and delete it from fireOptions
                      player.defensiveFireOptions.splice(i, 1);
                    }
                  }
                }

                break;
              }

              // update canvas for all 
              let x = player.shipscoords[game.selectedShip][0];
              let y = player.shipscoords[game.selectedShip][1];
              // reset target
              game.selectedTarget = [-1, -1];
              console.log('resetting selectedTarget to = ' + game.selectedTarget);
              // reset selected ship
              game.selectedShip = -1;
              console.log('resetting selectedShip to = ' + game.selectedShip);

              updateCanvasAll(x, y).then(() => {
                // canvas updated for all players
              });

              numberOfFireOptions = player.defensiveFireOptions.length;
              console.log('fireOptions before we check for further = ' + JSON.stringify(player.defensiveFireOptions));
              console.log('number of fireOptions after = ' + numberOfFireOptions);
               // emit to active player only ?
              if (numberOfFireOptions > 0) {
              console.log('still more fireoptions - emitting txt and buttons');
              
              // hide die result
              //io.to(player.socketid).emit('setupTextAttackPhase', numberOfFireOptions);
              io.to(player.socketid).emit('updateInfoText', "info", `<p>You have ${numberOfFireOptions} fire options. Click on marked enemy ship to mark as target or 'skip' to exit fire phase</p>`);
              io.to(player.socketid).emit('showActionButton', "Ok");
              // if options - mark ships that can defensive fire
                
              // mark activePlayer ships with defensiveFireOptions
              markDefensiveFireShips(game, player).then(() => {
                // announce number of defensiveFireOptions
                io.to(player.socketid).emit('updateInfoText', "info",
                `<p>You have ${numberOfFireOptions} defensive fire options.</p>
                <p>Click on a ship to see it's fire options and then on a marked enemy ship.</p>`);

                updateCanvasPlayer(x, y, player.id).then(() => {
                  // canvas updated
                  io.to(player.socketid).emit('showCancelButton', "Skip");
                });
              });
            } else { // no fire options
                // clear game.markedDefensiveFireShips
                game.markDefensiveFireShips = [0,0,0,0];
                game.markedDefensiveFireTargets = [];
                game.selectedShip = -1;
                console.log('no more fireoptions - emitting txt and buttons')
                io.to(player.socketid).emit('updateInfoText', "info", "<p>No ships to shoot at. Click 'Next' to end this phase</p>");
                io.to(player.socketid).emit('hideActionButton');
                io.to(player.socketid).emit('showCancelButton', "Next");
                updateCanvasPlayer(x, y, player.id).then(() => {
                  // canvas updated
                });
              }
             });
          // 

          } else { // click is to end turn or is that from cancelButton? 
            // we go to next phase now
            emitNonActivePlayer('clear', "") // clear fire result for non active players
            game.activePhase++; 
            // clean up defensive fire phase
            game.selectedTarget = -1;
            game.selectedShip = -1;
            player.defensiveFireOptions = [];
            gameControl();
          }
          break;
        }
        case 2: { // CARD PHASE
          console.log('Entering actionButtonClicked - in card phase')
          // a actionButton click is to play a card 
          // we must have a game.selectedCardIndex which we use to identify the played card.

          if (game.selectedCardIndex != -1) {
            //let playedCards = []; // keep track of played cards this turn - can be two cards if treasure card in sea

            console.log('we have a selectedCardIndex of = ' + game.selectedCardIndex);
            switch (player.cards[game.selectedCardIndex].suit) {
              case 'wind': {
                console.log('we played a wind card!');
                
                player.haswind = true;
                // remove card at index markedCard from player.cards
                let playedCard = player.cards.splice(game.selectedCardIndex, 1);

                // place playedCard in the stack bottom and add played card to array of played cards this turn
                cards.push(playedCard);
                playedCards.push(playedCard[0]);
                console.log('playedCard is = ' + JSON.stringify(playedCard));
                console.log('playedCards is now = ' + JSON.stringify(playedCards));

                // emit cards to activePlayer - removing played card from player and resetting selectedCardIndex
                game.selectedCardIndex = -1;
                io.to(player.socketid).emit('drawPlayerCards', player.cards, game.selectedCardIndex); 
                io.to(player.socketid).emit('playedCards', playedCards);
                // set text for ending card phase
                // io.to(player.socketid).emit('setupTextEndCardPhase');
                io.to(player.socketid).emit('updateInfoText', "info", "<p>You played a card. Click 'next phase' to continue.</p>");
                // emit activeplayer played a wind card
                players.forEach(function (player) {
                  // update score
                  if (player.id != players[game.activePlayer].id) { // not to active player
                    io.to(player.socketid).emit('updateInfoText', "warning", `<p>${players[game.activePlayer].name} played a wind card and is moving with double speed!</p>`);
                  }
                }); 

                // hide action button and setup cancelButton "next phase" to move on.
                io.to(player.socketid).emit('hideActionButton');
                io.to(player.socketid).emit('showCancelButton', "Next phase");

                break;
              }

              case 'ship': {
                // to get sunk ship back in habour
                console.log('we played a ship card!');

                handleShipCard(game, players).then((success) => { // go and handle it and then setup to end phase
                  if (success) {
                    // remove card at index markedCard from player.cards
                    let playedCard = player.cards.splice(game.selectedCardIndex, 1);

                    // place playedCard in the stack bottom and add played card to array of played cards this turn
                    cards.push(playedCard);
                    playedCards.push(playedCard[0]);
                    console.log('playedCard is = ' + JSON.stringify(playedCard));
                    console.log('playedCards is now = ' + JSON.stringify(playedCards));

                    // emit cards to activePlayer - removing played card from player and resetting selectedCardIndex
                    game.selectedCardIndex = -1;
                    io.to(player.socketid).emit('drawPlayerCards', player.cards, game.selectedCardIndex); 
                    io.to(player.socketid).emit('playedCards', playedCards);

                    //console.log('ship card was handled well!')
                    // emit new canvas focus on habour
                    x = game.PLAYER_HABOUR_POSITIONS[game.activePlayer].x;
                    y = game.PLAYER_HABOUR_POSITIONS[game.activePlayer].y;
                    
                    updateCanvasPlayer(x, y, game.activePlayer).then(() => {
                      // set text for ending card phase
                      //io.to(player.socketid).emit('setupTextEndCardPhase');
                      io.to(player.socketid).emit('updateInfoText', "info", "<p>You played a card. Click 'next phase' to continue.</p>");

                      // emit activeplayer played a ship card
                      players.forEach(function (player) {
                        // update score
                        if (player.id != players[game.activePlayer].id) { // not to active player
                          io.to(player.socketid).emit('updateInfoText', "warning", `<p>${players[game.activePlayer].name} played a ship card and got a ship back!</p>`);
                        }
                      }); 


                      // hide action button and setup cancelButton "next phase" to move on.
                      io.to(player.socketid).emit('hideActionButton');
                      io.to(player.socketid).emit('showCancelButton', "Next phase")
                    });

                    // ship sunk so update score to all players
                    let scoreArray = getScoreArray();

                    players.forEach(function (player) {
                      // update score
                      io.to(player.socketid).emit('showScore', scoreArray);
                    }); 


                  } else {
                    console.log('ship card could not be played');
                    // emit warning - TO DO
                  }
                });

                break;
              }

              case 'treasure': {
                // to get gold
                console.log('do we have a range to gold on land set ? ? ' + game.goldRange);
                if (game.goldRange > 0) {  // if we have a range to gold on land
                  //console.log('lets roll a die to get golf on land!');

                  // roll die to get gold
                  let dieResult = 1 + Math.floor(Math.random() * 6);

                  if (dieResult >= game.goldRange) {
                    // got the gold
                    //console.log('you got the gold!!!')
                    player.shipsgold[game.selectedShip] = 1;

                    // remove card at index markedCard from player.cards
                    let playedCard = player.cards.splice(game.selectedCardIndex, 1);

                    // place playedCard in the stack bottom and add played card to array of played cards this turn
                    cards.push(playedCard);
                    playedCards.push(playedCard[0]);
                    console.log('playedCard is = ' + JSON.stringify(playedCard));
                    console.log('playedCards is now = ' + JSON.stringify(playedCards));

                  } else {
                    // didnt get gold
                    //console.log('better luck next time!!!')
                    // keeping treasure card
                    gameControl();
                  }
                  x = player.shipscoords[game.selectedShip][0];
                  y = player.shipscoords[game.selectedShip][1];
                  
                  // reset all variables
                  game.goldRange = -1;
                  game.optionList = [];
                  game.selectedCardIndex = -1;
                  game.treasureX = -1; // needed?
                  game.treasureY = -1;  // needed?
                  game.goldOnLand = false;
                  game.selectedShip = -1;

                  // emit new canvas focus on ship that got the gold
                  updateCanvasPlayer(x, y, game.activePlayer).then(() => {
                    // emit cards to activePlayer - removing played card from player and resetting selectedCardIndex
                    game.selectedCardIndex = -1;
                    io.to(player.socketid).emit('drawPlayerCards', players[game.activePlayer].cards, game.selectedCardIndex); 
                    io.to(player.socketid).emit('playedCards', playedCards);

                    // set text for ending card phase
                    //io.to(player.socketid).emit('setupTextEndCardPhase');
                    io.to(player.socketid).emit('updateInfoText', "info", "<p>You played a card. Click 'next phase' to continue.</p>");

                    // emit activeplayer played a treasure card
                    players.forEach(function (player) {
                      // update score
                      if (player.id != players[game.activePlayer].id) { // not to active player
                        io.to(player.socketid).emit('updateInfoText', "warning", `<p>${players[game.activePlayer].name} played a treasure card and got gold on ship!</p>`);
                      }
                    }); 

                    // hide action button and setup cancelButton "next phase" to move on.
                    io.to(player.socketid).emit('hideActionButton');
                    io.to(player.socketid).emit('showCancelButton', "Next phase")
                  });

                } else { // first time actionbutton is clicked in card phase
                  console.log('we played a treasure card!');
                  handleTreasureCard(game, players).then(() => { // go and handle it and then setup to end phase
                    console.log('handleTreasureCard() done');
                  });
                }
                break;
              }

              case 'diver': { // to raise gold from sea hex
                console.log('we played a diver card!');

                if (game.goldInSea.length > 0 && game.selectedShip === -1) { // there is gold in sea but no ship selected yet
                  // get options and mark them
                  getGoldInSeaOptions(game, players).then((goldInSeaOptions) => {
                    console.log('back from getGoldInSeaOption with list = ' + goldInSeaOptions);
                    // mark goldInSeaOption ships as markedShips
                    game.markedDefensiveFireShips = goldInSeaOptions; // use markedDefensiveFireShips to mark ships TO DO: rename variable
                    console.log('these ships should be marked = ' + game.markedDefensiveFireShips);
                    // emit canvas to activePlayer with marked ships
                    // startcoord is based on first ship in markedDefensiveFireShips

                    // find first ship index to get canvas coord
                    let index = 0;
                    for (let i = 0; i < 4; i++) {
                      if (game.markedDefensiveFireShips[i] === 1) {
                        index = i;
                      }
                    }
                    let x = player.shipscoords[game.markedDefensiveFireShips[index]][0];
                    let y = player.shipscoords[game.markedDefensiveFireShips[index]][1];

                    updateCanvasPlayer(x, y, game.activePlayer).then(() => {
                      // canvas updated

                      // Info text = "click ship to use diver card"
                      // no buttons
                      // let hexClicked handle which marked ship is selected
                    });
                  });
                } else if (game.selectedShip != -1) { // we have a selected ship for diver card and clicked "get gold"
                  console.log('we have a ship selected to get gold and have clicked action button');

                  // delete gold from sea
                  for (let i = 0; i < game.goldInSea.length; i++) {
                    if ((game.goldInSea[i][0] === player.shipscoords[game.selectedShip][0]) && (game.goldInSea[i][1] === player.shipscoords[game.selectedShip][1])) {
                        // found it
                        game.goldInSea.splice(i, 1); // remove gold from sea
                        console.log('gold in sea now = ' + JSON.stringify(game.goldInSea) );
                      }
                  }
                  // add gold to ship
                  player.shipsgold[game.selectedShip] = 1; 
                  let playedCard = player.cards.splice(game.selectedCardIndex, 1);
             
                  // place playedCard in the stack bottom
                  cards.push(playedCard);
                  playedCards.push(playedCard[0]);
                  
                  // clean up markings
                  game.markedDefensiveFireShips = [];
                  game.selectedShip = -1;
                  game.selectedCardIndex = -1;
                  // emit cards to player
                  io.to(player.socketid).emit('drawPlayerCards', player.cards, game.selectedCardIndex); 
                  io.to(player.socketid).emit('playedCards', playedCards); // emit both played cards

                  // emit activeplayer played a diver card
                  players.forEach(function (player) {
                    if (player.id != players[game.activePlayer].id) { // not to active player
                      io.to(player.socketid).emit('updateInfoText', "warning", `<p>${players[game.activePlayer].name} played a diver card and got gold on ship!</p>`);
                    }
                  }); 

                  // setup end phase text and cancel button
                  game.activePhase++;
                  gameControl();

                } else { // cant play diver card
                  game.markedDefensiveFireShips = [];
                  game.selectedShip = -1;
                  // reset selectedCardIndex
                  game.selectedCardIndex = -1;
                  // emit cards to player
                  io.to(player.socketid).emit('drawPlayerCards', player.cards, game.selectedCardIndex); 
                  // reset 
                  gameControl();
                }
                 break;
               }
            }
          } else {
            console.log('error - we called actionButton with no selecedtedCardIndex!')
          }

          break;
        }
        case 3: { // MOVEMENT PHASE
          console.log('Entering actionButtonClicked - in movement phase')
          console.log('selectedShip = ' + game.selectedShip);
          console.log('markedShip = ' + game.markedShip);
          // action button click is to select marked ship
          // check if a ship is not selected
          if (game.selectedShip === -1 && game.movesLeft != 0) { // we have a die roll but no selected ship - click is to select ship
            game.selectedShip = game.markedShip;
            player.lastMoved = game.selectedShip;
            game.markedShip = -1;
            
            // update info text 
            // io.to(player.socketid).emit('setupTextForMove', game.movesLeft);
            io.to(player.socketid).emit('updateInfoText', "info", `<p>You can move ${game.movesLeft} hexes.</p><p>Click on a hex next to your ship on the map to move the ship into that hex.</p>`);            
            io.to(player.socketid).emit('hideActionButton');
            io.to(player.socketid).emit('hideCancelButton');

            // update all players canvas - startcoord is based on selectedShip
            let x = player.shipscoords[game.selectedShip][0];
            let y = player.shipscoords[game.selectedShip][1];
            updateCanvasAll(x, y).then(() => {
              // canvas updated
            });
          
          } else if (game.selectedShip === -1 && game.movesLeft === 0) { // no selected and no die yet
            // action button click is to throw die
            console.log('rolling die');
            handleDieForMovement().then((dieRoll) => {

              // emit dieroll
              console.log('Die roll of = ' + dieRoll);

              io.to(player.socketid).emit('updateInfoText', "warning", `<p>You rolled a ${dieRoll}</p>`);

              // emit die roll to non active players
              players.forEach(function (player) {
                if (player.id != players[game.activePlayer].id) { // not to active player
                  io.to(player.socketid).emit('updateInfoText', "warning", `<p>${players[game.activePlayer].name} rolled a ${dieRoll}</p>`);
                }
              }); 

              // handle card
              if (dieRoll === 6) { 	 // die roll of 6 give player a card
                // look at the first card in the stack
                if (cards[0].suit === 'storm') {
                  let card = cards.shift();// remove delt card from top of stack and place in the bottom of the stack

                  // handle sitout card
                  player.sitoutturns = card.turns;

                  // emit storm card drawn 'stormcard'
                  players.forEach(function (player) {
                    if (player.id == game.activePlayer) {
                      io.to(player.socketid).emit('updateInfoText', "warning", `You rolled a '6' and got a storm card and must sit out for ${card.turns} turns!`);
                    } else {
                      io.to(player.socketid).emit('updateInfoText', "warning", `${players[game.activePlayer].name} rolled a '6', got a storm card and must sit out for ${card.turns} turns!`);
                    }
                  }); 

                  io.to(players[game.activePlayer].socketid).emit('sitoutOn', player.sitoutturns ); // not needed in same turn as card is drawn
                
                } else if (player.cards.length <= 5) {
                    let card = cards.shift();
                    player.cards.push(card); // øverste kort til spiller

                    // emit info about card recieved? or just "you received a card"
                  
                  players.forEach(function (player) {
                    // update score
                    if (player.id == game.activePlayer){
                      io.to(player.socketid).emit('updateInfoText', "warning", `You got a ${card.suit} card!`);
                    } else {
                      io.to(player.socketid).emit('updateInfoText', "warning", `${players[game.activePlayer].name} got a card!`);
                    }
                  }); 

                    // emit cards to activePlayer
                  io.to(player.socketid).emit('drawPlayerCards', player.cards, game.selectedCardIndex); 

                } else { // can't have more than 6 cards
                  // emit warning - info text - sorry no cards for you
                  io.to(player.socketid).emit('updateInfoText', "warning", "You can have no more than 6 cards!");
                  }
              }

              // handle no ships left
              console.log('number of ships = ' + player.numberOfShips());
              if (player.numberOfShips() != 0) {
                let moves = dieRoll;
                // calculate moves
                if (player.haswind === true) {
                  moves = moves * 2;
                  player.haswind = false; // reset has wind flag
                }

                game.movesLeft = moves;
                console.log('MovesLeft = ' + game.movesLeft);

                // setup info text and buttons
                io.to(player.socketid).emit('setupTextForMarkShip', game.movesLeft, dieRoll);
                io.to(player.socketid).emit('hideActionButton');
                io.to(player.socketid).emit('hideCancelButton');
              } else {
                // no ships so skip movement phase
                io.to(player.socketid).emit('showDieRoll', dieRoll);
                io.to(player.socketid).emit('hideActionButton');
                io.to(player.socketid).emit('hideCancelButton');
                console.log('skipping out of movement - we have no ships')
                game.activePhase++;
                gameControl();
              }

            });

          } else {
            console.log('this shouldnt happen - we should not be able to click action button with a selected ship');
          }

          break;
        }
        case 4: { // ATTACK PHASE
          console.log('Entering actionButtonClicked - in attack phase')
          // click is to start selecting af target ship
          // or to resolve fire on selectedTarget

          if (game.selectedShip === -1) { // calling from end turn
            // we start defensive fire phase now
            emitNonActivePlayer('clear', "") // clear fire result for non-active players
            game.fireOptions = [];
            game.selectedShip = -1;
            game.selectedTarget = [];

            // clear fire die roll
            io.to(player.socketid).emit('clearTextFireDieRoll');

            nextPlayer();
          
            break;
          } 

          if (game.selectedTarget[0] === -1 && game.fireOptions.length > 0) { // ok click is to select target
            console.log('action button clicked in attack phase. we have fireoptions = ' + JSON.stringify(game.fireOptions));

            // action button is ok - to let player select target

            io.to(player.socketid).emit('hideActionButton');
            io.to(player.socketid).emit('hideCancelButton');
            //io.to(player.socketid).emit('setupTextSelectTarget');
            io.to(player.socketid).emit('updateInfoText', "info", "<p>click on ship to target.</p>");
            io.to(player.socketid).emit('clearTextFireDieRoll'); 

            // now listen in hex clicked for a valid click in fireOptions - hexclicked in phase 4

          } else { // we have a target and clicked Fire! button - resolve
            console.log('we clicked fire! button and will resolve attack');
            console.log('game.selectedTarget = ' + game.selectedTarget);

            console.log('rolling die');
            handleDieForFire().then((dieRoll) => {
              // emit dieroll
              //console.log('Die roll of = ' + dieRoll);

              // setup info text and buttons
              io.to(player.socketid).emit('setupTextFireDieRoll', dieRoll);
              io.to(player.socketid).emit('hideActionButton');
              io.to(player.socketid).emit('hideCancelButton');

              switch (dieRoll) {
                case (1):
                case (2):
                  // set fireOption on selectedTarget
                  players[game.selectedTarget[0]].defensiveFireOptions.push({ attackedShip: game.selectedTarget[1], attackingPlayer: game.activePlayer, attackingShip: game.selectedShip});
                  console.log('setting defensive fire option for target player. defensive options = ' + JSON.stringify(players[game.selectedTarget[0]].defensiveFireOptions));
                  //io.to(player.socketid).emit('setupTextFireNothing'); // emit nothing happend
                  io.to(player.socketid).emit('updateInfoText', "warning", "<p>You missed the target</p>");

                  //console.log('Fire result = nothing happened');

                  // TO DO: emit to other players 
                  var text = `${player.name} fired on ${players[game.selectedTarget[0]].name} and rolled a ${dieRoll}. The attack failed.`
                  emitNonActivePlayer(game.activePhase, text);

                  break;

                case (3): 
                case (4):
                  // set fireOption on selectedTarget
                  players[game.selectedTarget[0]].defensiveFireOptions.push({ attackedShip: game.selectedTarget[1], attackingPlayer: game.activePlayer, attackingShip: game.selectedShip });
                  console.log('setting defensive fire option for target player. defensive options = ' + JSON.stringify(players[game.selectedTarget[0]].defensiveFireOptions));

                  if (players[game.selectedTarget[0]].shipsgold[game.selectedTarget[1]] === 1) { // target has gold
                    player.shipsgold[game.selectedShip] = 1; // give selectdShip gold
                    players[game.selectedTarget[0]].shipsgold[game.selectedTarget[1]] = 0; // and remove from target
                    io.to(player.socketid).emit('setupTextFireGold'); // emit what happend
                    //console.log('Fire result = gold over');

                    var text = `${player.name} fired on ${players[game.selectedTarget[0]].name} and rolled a ${dieRoll}. Gold was taken!`
                    emitNonActivePlayer(game.activePhase, text);

                  } else {
                    //io.to(player.socketid).emit('setupTextFireNothing'); // emit nothing happend
                    io.to(player.socketid).emit('updateInfoText', "warning", "<p>You missed the target</p>");

                    //console.log('Fire result = nothing happened');

                    var text = `${player.name} fired on ${players[game.selectedTarget[0]].name} and rolled a ${dieRoll}. The attack failed.`
                    emitNonActivePlayer(game.activePhase, text);
                  }
                  break;
                
                case (5): 
                case (6): 
                  let goldx = players[game.selectedTarget[0]].shipscoords[game.selectedTarget[1]][0];
                  let goldy = players[game.selectedTarget[0]].shipscoords[game.selectedTarget[1]][1];  
                  players[game.selectedTarget[0]].shipscoords[game.selectedTarget[1]] = [-1,-1]; // implemantion of sunk ship
                  players[game.selectedTarget[0]].lastMoved = -1;
                  // gold in sea
                  if (players[game.selectedTarget[0]].shipsgold[game.selectedTarget[1]] === 1) { // target has gold
                    game.goldInSea.push([goldx,goldy]); // add coord of sunk ship
                    players[game.selectedTarget[0]].shipsgold[game.selectedTarget[1]] = 0;
                    io.to(player.socketid).emit('setupTextFireSunk');
                    //console.log('Fire result = ship sunk and gold in sea');

                    var text = `${player.name} fired on ${players[game.selectedTarget[0]].name} and rolled a ${dieRoll}. Ship sunk and gold in sea!`
                    emitNonActivePlayer(game.activePhase, text);
                  } else {
                    io.to(player.socketid).emit('setupTextFireSunk');
                    //console.log('Fire result = ship sunk');

                    var text = `${player.name} fired on ${players[game.selectedTarget[0]].name} and rolled a ${dieRoll}. Ship sunk!`
                    emitNonActivePlayer(game.activePhase, text);
                  }

                  // ship sunk so update score to all players
                  let scoreArray = getScoreArray();

                  players.forEach(function (player) {
                    // update score
                    io.to(player.socketid).emit('showScore', scoreArray);
                  }); 

                  break;
              }
              
              // remove option from fireOptions
              console.log('fireOptions before = ' + game.fireOptions);

              for (let i = 0; i < game.fireOptions.length; i++) { // go through fireoptions
                if (game.fireOptions[i] === game.selectedTarget) { // look for the selected option and delete it from fireOptions
                  game.fireOptions.splice(i, 1);
                }
              }
              // reset target
              game.selectedTarget = [-1, -1];
              //console.log('resetting selectedTarget to = ' + game.selectedTarget);
              let numberOfFireOptions = game.fireOptions.length;
              //console.log('number of fireOptons = ' + numberOfFireOptions);

              // focus on selectedShip
              let x = player.shipscoords[game.selectedShip][0];
              let y = player.shipscoords[game.selectedShip][1];
              // update canvas for all 
              updateCanvasAll(x, y).then(() => {
                // canvas updated
              });

              // emit to active player only ?
              if (numberOfFireOptions > 0) {
                console.log('still more fireoptions - emitting txt and buttons')
                // hide die result
                //io.to(player.socketid).emit('setupTextAttackPhase', numberOfFireOptions);
                io.to(player.socketid).emit('updateInfoText', "info", `<p>You have ${numberOfFireOptions} fire options. Click on marked enemy ship to mark as target or 'skip' to exit fire phase</p>`);
                io.to(player.socketid).emit('showActionButton', "Ok");

              } else { // no fire options
                //io.to(player.socketid).emit('setupTextAttackNone');
                io.to(player.socketid).emit('updateInfoText', "info", "<p>No ships to shoot at. Click 'Next' to end your turn</p>");
                io.to(player.socketid).emit('showCancelButton', "Next");
              }
            });
          }
          break;
        }
        default: {
          console.log('Entering actionButtonClicked - in unknown phase. Phase = ' + game.activePhase);
          break;
        }

      }
    }
  });

  socket.on('cancelButtonClick', () => {
    console.log('player clicked cancel button')

    var user = users.getUser(socket.id);
    // validate active user clicked
    if (user.id === players[game.activePlayer].socketid) {
      console.log('Active user clicked cancel button')
      // what is cancel button used for in this phase?

      switch (game.activePhase) {
        case 1: { // DEFENSIVE PHASE
          console.log('Entering cancelButtonClicked - in defensive phase')
          let player = players[game.activePlayer];

          //console.log('do we have a selcedTarget ? ' + JSON.stringify(game.selectedTarget));
          if(game.selectedShip != -1 && game.selectedTarget[0] != -1) { // if we have a selectedTarget and a selectedShip) - then reset selectedTarget
            game.selectedTarget = [-1, -1];

            // mark defensiveFireTargtes of selectedShip
            let numberOfFireOptions = player.defensiveFireOptions.length;
            //console.log('number of def fire opts = ' + numberOfFireOptions);
            //console.log('the options = ' + JSON.stringify(player.defensiveFireOptions));
            for (let i = 0; i < numberOfFireOptions; i++) {
              if (player.defensiveFireOptions[i].attackedShip === game.selectedShip) {
                markDefensiveFireTargetShips(game, players, game.selectedShip).then(() => { // setting game.markedDefensiveFireTargets
                  updateCanvasPlayer(x, y, game.activePlayer).then(() => {
                    io.to(player.socketid).emit('hideActionButton');
                    io.to(player.socketid).emit('showCancelButton', "deselect");
                    io.to(player.socketid).emit('updateInfoText', "info", "<p>Click on marked fire option to select as target. Click 'Cancel' to deselect your ship</p>");
                  });
                  // wait for action- or cancel-button click
                });
              }
            } 
            
          } else if (game.selectedShip != -1 && game.selectedTarget[0] === -1) { // we have a selected ship but no selected Target - de select ship
            let x = player.shipscoords[game.selectedShip][0];
            let y = player.shipscoords[game.selectedShip][1];
            game.selectedShip = -1;
            game.markedDefensiveFireTargets = [];
            console.log('cancel clicked with selected ship no target - reset game.selectedShip. Should still se marked options');
            console.log('game.selectedShip = ' + game.selectedShip);
            console.log('game.markedDefensiveFireShips = ' + game.markedDefensiveFireShips);
            console.log('game.markedDefensiveFireTargets = ' + game.markedDefensiveFireTargets);
            
            // go get marked defensivefireships
            markDefensiveFireShips(game, player).then(() => {
              updateCanvasPlayer(x, y, game.activePlayer).then(() => {
                io.to(player.socketid).emit('showCancelButton', "Skip");
                let numberOfFireOptions = player.defensiveFireOptions.length;
                //io.to(player.socketid).emit('setupTextDefensivePhase', numberOfFireOptions);
                io.to(player.socketid).emit('updateInfoText', "info",
                  `<p>You have ${numberOfFireOptions} defensive fire options.</p>
                <p>Click on a ship to see it's fire options and then on a marked enemy ship.</p>`);
              });
            });


          } else { // exit defensive fire phase
            // means no more options and click should end phase - cleanup variables
            players[game.activePlayer].defensiveFireOptions = [];
            game.selectedShip = -1;
            game.selectedTarget = [-1,-1];
            game.markedDefensiveFireShips = [0, 0, 0, 0];
            game.markedDefensiveFireTargets = [];

            // we need to set x,y to habour 
            let x = game.PLAYER_HABOUR_POSITIONS[player.id].x;
            let y = game.PLAYER_HABOUR_POSITIONS[player.id].y;
            updateCanvasPlayer(x, y, game.activePlayer).then(() => {
              // canvas updated
            });

            // clear warning text
            io.to(player.socketid).emit('clearTextFireDieRoll'); 


            game.activePhase++;
            gameControl();
          }

          break;
        }
        case 2: { // CARD PHASE
          console.log('Entering cancelButtonClicked - in card phase')
          // click is to end phase
          game.activePhase++;
          io.to(players[game.activePlayer].socketid).emit('hideCancelButton');
          gameControl();

          break;
        }
        case 3: { // MOVEMENT PHASE
          console.log('Entering cancelButtonClicked - in movement phase')
          console.log('selectedShip = ' + game.selectedShip);
          console.log('markedShip = ' + game.markedShip);

          // cancel button click is to de-select current ship
          // check if a ship is selected
          if (game.selectedShip != -1) {
            // deselect selected ship
            game.selectedShip = -1;
            // update info text - mark and select
            //io.to(players[game.activePlayer].socketid).emit('setupTextMovementPhase');
            io.to(players[game.activePlayer].socketid).emit('updateInfoText', "info", "<p>Click 'roll die' to roll a die for movement</p>");

            // hide cancelButton
            io.to(players[game.activePlayer].socketid).emit('hideCancelButton');
            
          } else {
            console.log('this shouldnt happen - we should not be able to click cancel with no selected ship');
          }
          console.log('Leaving actionButtonClicked - in movement phase')
          console.log('selectedShip = ' + game.selectedShip);
          console.log('markedShip = ' + game.markedShip);
          // emit grids ??
          break;
        }
        case 4: { // ATTACK PHASE
          console.log('Entering cancelButtonClicked - in attack phase')
          // means no more options and click should end phase
          // reset fireOptions
          game.fireOptions = [];

          if (game.selectedShip != -1) {
          // reset selectedShip
          let ship = game.selectedShip;
          
          game.selectedShip = -1;
          game.selectedTarget = [-1, -1];
          let x = players[game.activePlayer].shipscoords[ship][0];
          let y = players[game.activePlayer].shipscoords[ship][1];

          } else {
            // set to habour hex
            x = game.PLAYER_HABOUR_POSITIONS[game.activePlayer].x;
            y = game.PLAYER_HABOUR_POSITIONS[game.activePlayer].y;
          }
          
          updateCanvasPlayer(x, y, game.activePlayer).then(() => {
            // canvas updated
            // emit text
            io.to(players[game.activePlayer].socketid).emit('clearTextFireDieRoll');
            io.to(players[game.activePlayer].socketid).emit('setupTextEndTurn');
            // emit buttons
            io.to(players[game.activePlayer].socketid).emit('hideCancelButton');
            io.to(players[game.activePlayer].socketid).emit('showActionButton', "End turn");
          });
          break;
        }
        default: {
          console.log('Entering cancelButtonClicked - in unknown phase. Phase = ' + game.activePhase);
          break;
        }
      }
    }
  }); 
 
  socket.on('scrollCanvas', function(id, direction, coord) { // call to scroll player canvas 
    console.log('I got a request to scroll from playerID = ' + id);
    console.log('with corner col = ' + coord[0] + 'and corner row = ' + coord[1]);
    console.log('wanting to scroll = '+ direction);

    var newCoord;
    switch (direction) {
      case "N": { 
        newCoord = [coord[0], coord[1] - 1] // vi går opad
        break;
       }
      case "S": {
        newCoord = [coord[0], coord[1] + 1] // vi går opad
        break;
      }
      case "W": {
        newCoord = [coord[0] - 1, coord[1]] // we are moving right = west
        break;
      }
      case "E": {
        newCoord = [coord[0] + 1, coord[1]] // we are moving right = east
        break;
      }
      case "NE": {
        newCoord = [coord[0] + 1, coord[1] - 1] // vi går opad
        break;
      }
      case "NW": {
        newCoord = [coord[0] -1 , coord[1] - 1] // vi går opad
        break;
      }
      case "SE": {
        newCoord = [coord[0] + 1, coord[1] + 1] // we are moving right = west
        break;
      }
      case "SW": {
        newCoord = [coord[0] -  1, coord[1] + 1] // we are moving right = east
        break;
      }
    }
    // vi har nu nyt topleftcoord
    console.log('new top left coord = ' + newCoord);

    // build grid for player
    getGrid(newCoord).then((grid) => {
      getPlayer(id).then((player) => {
        console.log('got player: ' + JSON.stringify(player));
        io.to(player.socketid).emit('drawPlayerCanvas', grid, newCoord)
      });
    });
  });
 
  socket.on('hexClicked', function (id, x, y) { // call from user id with click on hex (x,y)
    //console.log('omg I got an playerID from chat = ' + id);
    //console.log('Clicked on hex: col = ' + x + 'and row = ' + y);

    // is the the active player - if not don't care about click 
    if (game.activePlayer === id) { // only if active player
      getPlayer(id).then((player) => { // get player from id
        //console.log('In hexClicked. got player: ' + JSON.stringify(player));
        //console.log('hey the active player clicked a hex x = ' + x + 'y= ' +  y);
        // which phase are we in?
        switch (game.activePhase) {
          case 1: {
            // DEFENSIVE FIRE PHASE
            console.log('we are in defensive fire phase');
            console.log('player.defensiveFireOptions = ' + JSON.stringify(player.defensiveFireOptions));
            console.log('player.defensiveFireOptions length = ' + JSON.stringify(player.defensiveFireOptions.length));

            // if clicked activePlayer ship? Is this ship marked as having def. fire options -> then add them in markedDefensiveFireShips
            
            isShipInHex(x, y, game, players).then((shipInHex) => {
              console.log('got back from isShipInHex with reply = ' + JSON.stringify(shipInHex));
              if (shipInHex != false) { 
                console.log('is shipInHex.player === game.activePlayer? ' + (shipInHex.player === game.activePlayer));
                if (shipInHex.player === game.activePlayer ) {
                isActivePlayerShip(game, players, x, y).then((id) => {
                  // is it marked as having options?
                  console.log('we got activeplayer ship id back from isActivePlayerShip = ' + id);
                  let numberOfFireOptions = players[game.activePlayer].defensiveFireOptions.length;
                  console.log('numberoffireoption = ' + numberOfFireOptions);
                  if (id > -1) { // activePlayerShip with id
                    game.selectedShip = id; // set the activePlayer ship to selected -> drawn in green
                    console.log('game.selectedShip set to = ' + game.selectedShip);
                    game.markedDefensiveFireShips = [0, 0, 0, 0]; // reset the marked ships of activePlayer with fireOpts
                    for (let i = 0; i < numberOfFireOptions; i++) {
                      console.log('players[game.activePlayer].defensiveFireOptions[i].ship === id = ' + (players[game.activePlayer].defensiveFireOptions[i].attackedShip === id));
                      if (players[game.activePlayer].defensiveFireOptions[i].attackedShip === id) {
                        console.log('calling markDefensiveFireTargetShips with id = ' + id);
                        markDefensiveFireTargetShips(game, players, id).then(() => { // setting game.markedDefensiveFireTargets
                          // update canvas of active player
                          console.log('returned from markDefensiveFireTargetShips')
                          console.log('game.markedDefensiveFireTargets = ' + JSON.stringify(game.markedDefensiveFireShips));
                          updateCanvasPlayer(x,y,game.activePlayer).then(() => {
                            // canvas updated
                            io.to(player.socketid).emit('showCancelButton', "deselect");

                          });
                          // wait for action- or cancel-button click
                        });
                      }
                    } 
                  }
                });  
                } else { // if the ship is an enemy ship. A click to select a ship as target for defFire
                  console.log('not activeplayer ship - ignore if not marked')
                  // is clicked ship marked as being a possible defFire target?
                  for (let i = 0; i < game.markedDefensiveFireTargets.length; i++) {
                    if (game.markedDefensiveFireTargets[i].player === shipInHex.player && game.markedDefensiveFireTargets[i].ship === shipInHex.ship) {
                      game.selectedTarget = [shipInHex.player, shipInHex.ship];
                      game.markedDefensiveFireTargets = []; // reset array of ships to be marked

                      // update canvas for activePlayer
                      updateCanvasPlayer(x, y, game.activePlayer).then(() => {
                        // canvas updated

                        // set buttons "Fire" and "Cancel" for activePlayer
                        // emit buttons and text for resolving fire on target ship
                        //io.to(players[game.activePlayer].socketid).emit('setupTextFire');
                        io.to(players[game.activePlayer].socketid).emit('updateInfoText', "info", "<p>Click 'Fire!' to shoot at targeted ship or 'cancel' to exit fire phase.</p>");
                        // show actionButton
                        io.to(players[game.activePlayer].socketid).emit('showActionButton', "Fire!");
                        // show cancelButton
                        io.to(players[game.activePlayer].socketid).emit('showCancelButton', "cancel");
                      });
                    // listen for action- or cancel-button clicks
                    } // if not marked - ignore
                  }
                }
              } // if no ship in hex - ignore
            });

            break;
          }

          case 2: {
            // CARD PHASE
            console.log('we are in hexClicked and play card phase - we want to select a ship');
            if (id === players[game.activePlayer].id) { // must be from active player 
              
              if (game.goldRange > 0) { // we want to select ship to pick up gold on land
                isShipInHex(x, y, game, players).then((foundShip) => { // returns [playerid, shipid]
                  let shipId = foundShip.ship;
                  let playerId = foundShip.player;
                  if (playerId === id) { // a activePlayer ship has been clicked
                    // check if ship with shipId is in game.optionList
                    for (let i = 0; i < game.optionList.length; i++) {
                      if (game.optionList[i][0] === player.shipscoords[shipId][0] && game.optionList[i][0] === player.shipscoords[shipId][0]){
                        // ship is close enough to treasure
                        game.selectedShip = shipId;
  
                        // update canvas for active Player
                        updateCanvasPlayer(x, y, game.activePlayer).then(() => {
                          // canvas updated

                          // setup button to hit die for getting treasure - you must roll at least a 
                          io.to(players[game.activePlayer].socketid).emit('showActionButton', "Roll die");
                          io.to(players[game.activePlayer].socketid).emit('hideCancelButton');
                          //io.to(players[game.activePlayer].socketid).emit('setupTextGetGoldDieRoll', game.goldRange);
                          io.to(players[game.activePlayer].socketid).emit('updateInfoText', "info", `<b>You must roll a ${game.goldRange} to get gold on land.</b>`);
                          // wait for action button click with game.goldonland set
                        });
                      }
                    }
                  } else {
                    // disregard - must click on your own ship
                  }
                });
              } else { // we are clicking to select a ship to raise gold in sea
              // check ship in hex
              isShipInHex(x, y, game, players).then((foundShip) => { // returns [playerid, shipid]
                console.log('foundship = ' + JSON.stringify(foundShip));
                let shipId = foundShip.ship;
                let playerId = foundShip.player;
                console.log('we found a ship in clicked hex - player = ' + playerId + 'ship ID = ' + shipId);
                console.log('marked ships = ' + game.markedDefensiveFireShips);
                console.log('marked ships at player id should be 1 (marked)= ' + game.markedDefensiveFireShips[shipId]);
                console.log('can we select? ' + (playerId === players[game.activePlayer].id && game.markedDefensiveFireShips[shipId] === 1) );

                if (playerId === players[game.activePlayer].id && game.markedDefensiveFireShips[shipId] === 1) {
                  // mark the ship clicked as selected - if on a gold
                  game.selectedShip = shipId;
                  
                  // emit canvas to active Player
                  updateCanvasPlayer(x, y, game.activePlayer).then(() => {
                    // canvas updated
                    // setup "get gold" button and text
                    io.to(players[game.activePlayer].socketid).emit('showActionButton', "Get gold!");
                    io.to(players[game.activePlayer].socketid).emit('hideCancelButton');
                    //io.to(players[game.activePlayer].socketid).emit('setupTextGetGold');
                    io.to(players[game.activePlayer].socketid).emit('updateInfoText', "info", "<p>Now click 'get gold'</p>");
                  });
                } else { // else disregard
                 console.log('error: you clicked on a ship not marked as having gold under it'); 
                }
              });
              }
            } else {
              console.log('not activeplayer trying to click in card phase');
            }

            break;
          }

          case 3: {
            // MOVEMENT PHASE
            console.log('we are in movement phase and a click from active player recieved');
            // here we want to react to clicks to select/toggle a ship for movement
            // and for clicking the next hex the ship should move to

            if (game.selectedShip != -1) {
              // we have a selected ship and a click should now only click in a sea hex next to selected ship

              isValidMove(x, y).then((moveOk) => { // validmove - function to check x, y in relation to selected ship
                console.log('answer from isValidMove = ' + moveOk);                
                if (moveOk) {
                // update ship position and movesLeft
                  player.shipscoords[game.selectedShip] = [x, y];

                  let scoreArray = getScoreArray();
                  
                  // emit update player canvas 
                  players.forEach(function (player) {
                    // coord is based on hex clicked - adjusted in getCoords
                    var coord = getCoords(x, y); 
                    // calculate each grid to send to all players
                    getGrid(coord).then((grid) => {
                      // emit drawPlayerCanvas with grid and adjusted viewport
                      io.to(player.socketid).emit('drawPlayerCanvas', grid, coord);
                      // update score
                      io.to(player.socketid).emit('showScore', scoreArray);
                    });
                  }); 

                  // update moves left only to active player
                  //io.to(player.socketid).emit('updateMovesLeft', game.movesLeft);
                  io.to(player.socketid).emit('updateInfoText', "warning", `<b>You have ${game.movesLeft} moves left</b>`);
                  
                  if (game.movesLeft === 0) { // no more moves - go to next phase
                    // TO DO: update buttons and info text for active player
                    //game.selectedShip = -1;
                    // emit canvas to all without selected ship
                    io.to(player.socketid).emit('updateInfoText', "warning", "");

                    updateCanvasAll(x, y).then(() => {
                      // canvas updated for all players
                    });

                    console.log('no more moves left. Going to next phase');

                    game.activePhase++;
                    console.log('calling gameControl() to setup next phase');
                    gameControl(); // setup next phase
                  }
                  // emit player moves left 
                } else {
                  console.log('not clicking a valid hex');
                }
            });
              break;
            } else if (game.movesLeft > 0) { // only if we have rolled a die.  we shouldnt mark ship before die roll!!!!
              // or movement is finished and we havnt passed to next phase!!!!
              
              console.log('movement hasnt started yet - mark and select ship before moving');
              //console.log('what is player before call to shipInHex? = ' + JSON.stringify(player));
              shipInHex(player, x, y).then((shipId) => {
                if (shipId != -1) { // an activeplayer ship has been clicked
                  game.markedShip = shipId; // mark that ship
                  console.log('ship marked, id = ' + shipId);
                  // show action button
                  io.to(player.socketid).emit('showActionButton', "Select");

                  // UPDATE BOARD CANVAS
                  updateCanvasPlayer(x, y, player.id).then(() => {
                    // canvas updated
                  });
                  
                } else { // we have allready selected a ship for movement
                  console.log('You must click on one of your ships');
                }
              });
              break; // we have either marked a ship or we disregard click
            }
          }  
          
          case 4: {
            // ATTACK PHASE
            console.log('we are in attack phase');
            // here we want to react to clicks to select the target of the attack - there can be more than one
           
            if (game.selectedShip != -1) { // only if we have a selected ship means we have fireOptions
              console.log('we have clicked hex in attack phase and have selectedShip =' + game.selectedShip);
              console.log('checking isValidTarget to see if click is on a ship in fireOptions')
             
              isValidTarget(game, players, x, y).then((targetOk) => {
                if (targetOk) {
                  console.log('isValidTarget says that target is ok. And has marked that shis as selectedTarget = ' + game.selectedTarget );
                  // emit canvas with marked ship 
                  console.log('emitting canvas with selectedtarget marked' + game.selectedTarget);

                  updateCanvasAll(x, y).then(() => {
                    // canvas updated for all
                  });
                
                  // emit buttons and text for resolving fire on target ship
                  //io.to(players[game.activePlayer].socketid).emit('setupTextFire');
                  io.to(players[game.activePlayer].socketid).emit('updateInfoText', "info", "<p>Click 'Fire!' to shoot at targeted ship or 'cancel' to exit fire phase.</p>");

                  // show actionButton
                  io.to(players[game.activePlayer].socketid).emit('showActionButton', "Fire!");
                  // show cancelButton
                  io.to(players[game.activePlayer].socketid).emit('showCancelButton', "cancel");
                } 
              });
            }
            break;
          } 
        }
      });
    }
  });
  
  socket.on('cardClicked', function (playerId, cardIndex) {
    // only handle click if from activePlayer and in card phase
    if ((playerId === players[game.activePlayer].id) && (game.activePhase === 2)) {

      // select it
      game.selectedCardIndex = cardIndex;

      // emit cards with selected
      io.to(players[game.activePlayer].socketid).emit('drawPlayerCards', players[game.activePlayer].cards, game.selectedCardIndex);

      // load actionButton and InfoText
      console.log('you can now click on the action button to play card, or skip to movement phase');
      io.to(players[game.activePlayer].socketid).emit('showActionButton', "Play card!");
      io.to(players[game.activePlayer].socketid).emit('showCancelButton', "skip");
    }
  });

  socket.on('shipClicked', function (playerId, shipId) {
    console.log('server recieved shipClicked. playerId = ' + playerId + ' and shipID = ' + shipId);
    if (game.activePlayer === playerId) {
      let player = players[game.activePlayer];
      // center on the selected ship and emit new canvas
      let x = player.shipscoords[shipId][0];
      let y = player.shipscoords[shipId][1];
      console.log('setting active player zoom to ship at, x= ' + x + ' y= ' + y);

      var coord = getCoords(x, y);
      getGrid(coord).then((grid) => {
        // emit drawPlayerCanvas with grid and adjusted viewport
        io.to(player.socketid).emit('drawPlayerCanvas', grid, coord);
      });

      // if move phase = select the ship for movement  - TODO2
      // if defensive fire = select the option as selectedship - TODO2

    } // else ignore shipClicked
  });


  socket.on('disconnect', () => {
    var user = users.removeUser(socket.id);

    if (user) {
      io.to(user.game).emit('updateUserList', users.getUserList(user.game));
      io.to(user.game).emit('newMessage', generateMessage('Admin', `${user.name} has left.`));
    }
  });

});

function getScoreArray() {
  var numberOfPlayers = players.length;
  let scoreArray = [];
  let playerSet = {};
  for (let i = 0; i < numberOfPlayers; i++) {
    //console.log('number of ships = ' + JSON.stringify(players[i].numberOfShips()))
    playerSet = { name: players[i].name, gold: players[i].gold, ships: players[i].numberOfShips(), sitout: players[i].sitoutturns }
    //console.log('playerSet = ' + JSON.stringify(playerSet));
    scoreArray.push(playerSet);
    //console.log('scoreArray = ' + JSON.stringify(scoreArray));
  }
  return scoreArray;
}

function getPlayer(id) {
  return new Promise(resolve => {
    players.forEach(function (player) {
      if (player.id === id) {
        console.log('return player: ' + JSON.stringify(player));
        resolve(player);
      }
    });
  });
}

function coordToArrayIndex(col, row) {
  return col + game.BOARD_COLS * row;
}

function udpatePlayerStatus() {
  return new Promise(resolve => {
    var text;
    players.forEach(function (player) {
      if (game.activePlayer === player.id) { // is activeplayer
        text = "Your turn!"
        io.to(player.socketid).emit('updatePlayerStatus', text, getPhaseName(game.activePhase), game.turn);
      } else {
        text = `${players[game.activePlayer].name} is playing`
        io.to(player.socketid).emit('updatePlayerStatus', text, getPhaseName(game.activePhase), game.turn);
      }
    });
    resolve();
  });
}

function updateCanvasAll(x, y) { // update canvas for all players
  return new Promise(resolve => {
    let coord = getCoords(x, y);
    players.forEach(function (player) {
      getGrid(coord).then((grid) => {
        io.to(player.socketid).emit('drawPlayerCanvas', grid, coord);
      });
    });
    resolve();
  });
}

function updateCanvasPlayer(x, y, playerId) { // update canvas for active player
  return new Promise(resolve => {
    let coord = getCoords(x, y);
    getGrid(coord).then((grid) => {
      io.to(players[playerId].socketid).emit('drawPlayerCanvas', grid, coord);
    });
    resolve();
  });
}

function emitNonActivePlayer(context, text) {
  players.forEach(function (player) {
    if (game.activePlayer != player.id) { // is not activeplayer
      console.log('inside emitNonActivePlayer and non active player. context = ' + context);

      switch (context) {
        case 1:
          io.to(player.socketid).emit('updateCombatInfo', text);

          break;
        case 4:
          io.to(player.socketid).emit('updateCombatInfo', text);

          break;
        case 'clear':
          console.log('emitNonActivePlayer = clear, text is = ' + text);
          io.to(player.socketid).emit('updateCombatInfo', text);

          break;
        case 'gold':
          console.log('emitNonActivePlayer = clear, text is = ' + text);
          io.to(player.socketid).emit('updateCombatInfo', text);

          break;
        default:
          break;

      }
    }
  });
}

function isValidMove(x, y) {
  return new Promise(resolve => {
    // one hex away from ship = selectedShip position ?
    var x1 = players[game.activePlayer].shipscoords[game.selectedShip][0]
    var y1 = players[game.activePlayer].shipscoords[game.selectedShip][1]
    var dX = Math.abs(x - x1);
    var dY = Math.abs(y - y1);

    // prevent cancel move by clicking habour in first click
    if (dX === 0 && dY === 0) {
      // clicking same hex - disregard click
      resolve(false);
    } else if (dX <= 1 && dY <= 1) { // a click on selected ship should not get here- so no check for that?
      // is water hex?
      // get gridId of hex x,y

      // get value of gridId 
      gridvalue = game.tileGrid[x + game.BOARD_COLS * y];

      if (gridvalue === 3) { // water hex
        // no other ship there?
        shipInHex2(x, y).then((shipInHexFlag) => {
          console.log('shipInHex2 is returning = ' + shipInHexFlag);
          if (shipInHexFlag) {
            resolve(false);
          } else {
            // water and no ships
            game.movesLeft--;
            resolve(true);
          }
        });

      } else if (gridvalue === 2 && x === game.PLAYER_HABOUR_POSITIONS[game.activePlayer].x && y === game.PLAYER_HABOUR_POSITIONS[game.activePlayer].y) { // own habour
        game.movesLeft = 0;

        // check for gold on ship
        if (players[game.activePlayer].shipsgold[game.selectedShip] === 1) {
          // move gold to habour
          players[game.activePlayer].gold++;
          // audio cheers


          // emit gold add to player to all players
          emitNonActivePlayer("gold", `${players[game.activePlayer].name} unloaded gold in habour!`)

          // remove gold from ship
          players[game.activePlayer].shipsgold[game.selectedShip] = 0;
        }
        resolve(true);

      } else {
        // not a water hex
        resolve(false); // should we reject and handle that?
      }

    } else {
      // not a click next to selected ship
      resolve(false); // should we reject and handle that?
    }
  });
}

function shipInHex2(x, y) {
  console.log('we are in shipInHex2');
  return new Promise(resolve => {
    for (let i = 0; i < game.numberOfPlayers; i++) {
      for (let j = 0; j < 4; j++) { // TO DO - check handling of sunk ships
        if (x === players[i].shipscoords[j][0] && y === players[i].shipscoords[j][1]) {
          // we click a ship
          resolve(true); // return id of ship (first ship if more in habour hex)
        }
      }
    }
    // not resolved yet - then no ship in hex
    resolve(false);
  });
}

function getCoords(x, y) {
  let coordinates = [x - ((game.canvasCols - 3) / 2), y - ((game.canvasRows - 3) / 2)];
  console.log('x = ' + x + ' and y = ' + y + 'game.canvasCols' + game.canvasCols + 'game.canvasRows' + game.canvasRows);
  console.log('calculated x and y: x = ' + coordinates[0] + ' y = ' + coordinates[1]);
  // protect against crossing edges!!!
  // test cols and rows if all of grid for canvas is within board
  // left and top are ok - x>0 and y>0 allways
  if (coordinates[0] < 0) { coordinates[0] = 0 }
  if (coordinates[1] < 0) { coordinates[1] = 0 }
  if (coordinates[0] > game.BOARD_COLS - game.canvasCols + 2) { coordinates[0] = game.BOARD_COLS - game.canvasCols + 2 }
  if (coordinates[1] > game.BOARD_ROWS - game.canvasRows + 2) { coordinates[1] = game.BOARD_ROWS - game.canvasRows + 2 }
  console.log('calling getGrid with corrected coord: x =  ' + coordinates[0] + ' y = ' + coordinates[1]);
  return coordinates; // resolved as promis if called with .then!?
}

function gameControl() {

  // setup game
  console.log('setup game - game turn = ' + game.turn);
  emitShipBox();
  switch (game.activePhase) {
    case 1: { // defensive phase setup
      // update player status

      // check for end game by turns

      if (game.turn > game.NUMBEROFTURNS) {
        // end game
        // who won?
        let scores = [];
        var playerId;
        for ( playerId = 0; playerId < game.numberOfPlayers; playerId++) {
          scores.push( {"player" : players[playerId].name , "score" : (players[playerId].gold) * 2 + players[playerId].numberOfShips()});
        }

        // emit game over - scores for each player
        console.log('emitting game over - with scores = ' + JSON.stringify(scores));
        for (let i = 0; i < game.numberOfPlayers; i++) {
          io.to(players[i].socketid).emit('gameOver', scores);
        }
      } else {

        udpatePlayerStatus().then(() => {
          console.log('player statuses updated');
        });

        if (players[game.activePlayer].sitoutturns > 0) {
          // emit sitout to player
          io.to(players[game.activePlayer].socketid).emit('sitoutOn', players[game.activePlayer].sitoutturns);
        } else {
          io.to(players[game.activePlayer].socketid).emit('sitoutOff');
        }

        setupDefensivePhase(game, players).then(() => {
          console.log('Defensive Phase setup has finished');
        });
      }
      break;
    }
    case 2: { // card phase setup
      // update player status
      // remove warning from defensive fire phase
      io.to(players[game.activePlayer].socketid).emit('updateInfoText', "warning", "");

      udpatePlayerStatus().then(() => {
        console.log('player statuses updated');
      });
      console.log('sitout = ' + players[game.activePlayer].sitoutturns);
      // handle sitout
      if (players[game.activePlayer].sitoutturns > 0) {
        // setup text
        console.log('You are sitting out this turn. Sitout = ' + players[game.activePlayer].sitoutturns);
        console.log('click next to end your turn');
        // setup cancelButton
        players[game.activePlayer].sitoutturns--;
        if (players[game.activePlayer].sitoutturns > 0) {
          io.to(players[game.activePlayer].socketid).emit('sitoutOn', players[game.activePlayer].sitoutturns);
        } else {
          io.to(players[game.activePlayer].socketid).emit('sitoutOff');
        }
        console.log('sit out now = ' + players[game.activePlayer].sitoutturns);

        nextPlayer();

      } else { // no sitout - normal procedure

        setupCardPhase().then(() => {
          console.log('Card Phase setup has finished');
        });
      }
      break;
    }
    case 3: { // movement phase setup
      io.to(players[game.activePlayer].socketid).emit('clearMovesLeft'); // emit clear the die roll from def fire
      emitNonActivePlayer('clear', "")
      // update player status
      udpatePlayerStatus(game, players).then(() => {
        console.log('player statuses updated');
      })
      // setup should wait for player click ok to go to next phase?
      setupMovementPhase(game, players).then(() => {
        console.log('MovementPhase setup has finished');
      });
      break;
    }
    case 4: { // attack phase seup
      // update player status
      udpatePlayerStatus().then(() => {
        console.log('player statuses updated');
      })
      setupAttackPhase(game, players).then(() => {
        // update canvas - coord is based on last moved
        // handle no ships
        if (players[game.activePlayer].numberOfShips() != 0) {
        let boat = players[game.activePlayer].lastMoved
        x = players[game.activePlayer].shipscoords[boat][0];
        y = players[game.activePlayer].shipscoords[boat][1];
        } else {
          // set x and y to active player harbour
          x = game.PLAYER_HABOUR_POSITIONS[game.activePlayer].x;
          y = game.PLAYER_HABOUR_POSITIONS[game.activePlayer].y;
        }
        updateCanvasAll(x, y).then(() => {
          // camvas updated
          console.log('AttackPhase setup has finished');
        });
      });
      break;
    }
  }
  console.log('game turn = ' + game.turn);
  console.log('game phase = ' + game.activePhase);
  console.log('active player = ' + game.activePlayer);
}

function nextPlayer() {
  // which player goes next and if a new turn starts
  let player = players[game.activePlayer];
  game.activePhase = 1;

  // but for next player or next turn and first player?
  if (game.activePlayer === game.numberOfPlayers - 1) { // last player
    // clean up activeplayer text and buttons before changing player
    io.to(player.socketid).emit('hideActionButton');
    io.to(player.socketid).emit('hideCancelButton');
    io.to(player.socketid).emit('setupTextEndPlayer');

    game.turn++;

   // check for game over by turns - here or in gameControl?
    // if (game.turn > game.NUMBEROFTURNS){

    // }


    game.activePlayer = 0;
    // emit?

  } else { // next players turn
    // clean up activeplayer text and buttons before changing player
    io.to(player.socketid).emit('hideActionButton');
    io.to(player.socketid).emit('hideCancelButton');
    io.to(player.socketid).emit('setupTextEndPlayer');

    game.activePlayer++;
    // emit?
  }
  gameControl();
}

function setupMovementPhase() {

  return new Promise(resolve => {
    let player = players[game.activePlayer];

    console.log('HANDLE MOVEMENT PHASE');
    console.log('Active player is player id = ' + JSON.stringify(player));
    console.log('Phase is: ' + game.activePhase);

    // start on last moved ship - if it is not sunk - then start on habour
    console.log('lastMoved = ' + JSON.stringify(player.lastMoved));

    if (player.lastMoved != -1) { // was && player.shipscoords[player.lastMoved] != [-1,-1]
      // ok we have a last moved ship and it is still alive
      // then set x, y to last moved ship position
      x = player.shipscoords[player.lastMoved][0];
      y = player.shipscoords[player.lastMoved][1];
      console.log('setting active player to last moved ship, x= ' + x + ' y= ' + y);
    } else { // set to habour hex
      x = game.PLAYER_HABOUR_POSITIONS[game.activePlayer].x;
      y = game.PLAYER_HABOUR_POSITIONS[game.activePlayer].y;
      console.log('setting active player habour to, x= ' + x + ' y= ' + y);
    }

    updateCanvasPlayer(x, y, player.id).then(() => {
      // camvas updated
      // setup info text and buttons for die roll
      //io.to(player.socketid).emit('setupTextMovementPhase');
      io.to(player.socketid).emit('updateInfoText', "info", "<p>Click 'roll die' to roll a die for movement</p>");
      io.to(player.socketid).emit('showActionButton', "roll die");
      io.to(player.socketid).emit('hideCancelButton');
    });
    resolve();
  });
}

function setupAttackPhase() {

  return new Promise(resolve => {
    let player = players[game.activePlayer];
    //game.selectedShip = -1;
    console.log('HANDLE ATTACK PHASE');
    console.log('Active player is player id = ' + JSON.stringify(player));
    console.log('Phase is: ' + game.activePhase);

    // check if selectedShip is in habour
    var habourFlag = false;
    if (game.selectedShip != -1) { // handling no ships left
      var x = players[game.activePlayer].shipscoords[game.selectedShip][0];
      var y = players[game.activePlayer].shipscoords[game.selectedShip][1];
      
      if (game.PLAYER_HABOUR_POSITIONS[game.activePlayer].x === x && game.PLAYER_HABOUR_POSITIONS[game.activePlayer].y === y) { // x, y is a habour
        habourFlag = true;
      }
    
      if (!habourFlag) {
        getFireOptions(game, players).then((list) => {
          console.log('got fire option list = ' + JSON.stringify(list));
          game.fireOptions = list;
          // emit clear moves
          io.to(player.socketid).emit('clearMovesLeft');
          // emit resetPlayedCards
          io.to(player.socketid).emit('resetPlayedCards');
          // reset playedCards
          playedCards = [];

          // we get fire options list 
          let numberOfFireOptions = game.fireOptions.length;
          // emit to active player
          if (numberOfFireOptions > 0) {
            //io.to(player.socketid).emit('setupTextAttackPhase', numberOfFireOptions);
            io.to(player.socketid).emit('updateInfoText', "info", `<p>You have ${numberOfFireOptions} fire options. Click on marked enemy ship to mark as target or 'skip' to exit fire phase</p>`);

            io.to(player.socketid).emit('showCancelButton', "Skip");
            //io.to(player.socketid).emit('showActionButton', "Ok");

          } else { // no fire options
            //io.to(player.socketid).emit('setupTextAttackNone');
            io.to(player.socketid).emit('updateInfoText', "info", "<p>No ships to shoot at. Click 'Next' to end your turn</p>");
            io.to(player.socketid).emit('showCancelButton', "Next");
          }
        });
      } else {
        game.fireOptions = [];
        //io.to(player.socketid).emit('setupTextAttackNone');
        io.to(player.socketid).emit('updateInfoText', "info", "<p>No ships to shoot at. Click 'Next' to end your turn</p>");
        io.to(player.socketid).emit('showCancelButton', "Next");
      }
    } else {
      io.to(player.socketid).emit('updateInfoText', "info", "<p>No ships to shoot at. Click 'Next' to end your turn</p>");
      io.to(player.socketid).emit('showCancelButton', "Next");
    }
    resolve();
  });

}

function setupDefensivePhase() {
  console.log('HANDLE DEFENSIVE PHASE');

  return new Promise(resolve => {
    let player = players[game.activePlayer];

    // emit clear moves TO DO - for all players?
    io.to(player.socketid).emit('clearMovesLeft'); // TO DO - can we remove this?

    console.log('Active player is player id = ' + JSON.stringify(player));
    console.log('Phase is: ' + game.activePhase);

    var numberOfFireOptions = player.defensiveFireOptions.length;
    var x, y;
    if (numberOfFireOptions > 0) {
      // center on first ship with option
      let zoomOnShip = player.defensiveFireOptions[0].attackedShip;
      x = player.shipscoords[zoomOnShip][0];
      y = player.shipscoords[zoomOnShip][1];
      console.log('setting active player zoom to ship at, x= ' + x + ' y= ' + y);

      // mark activePlayer ships with defensiveFireOptions
      markDefensiveFireShips(game, player).then(() => {
       
        // announce number of defensiveFireOptions
        //io.to(player.socketid).emit('setupTextDefensivePhase', numberOfFireOptions);

        io.to(player.socketid).emit('updateInfoText', "info",
        `<p>You have ${numberOfFireOptions} defensive fire options.</p>
        <p>Click on a ship to see it's fire options and then on a marked enemy ship.</p>`);

        updateCanvasPlayer(x, y, player.id).then(() => {
          // canvas updated
          io.to(player.socketid).emit('showCancelButton', "Skip");

        });
      });
    } else { // set zoom to habour
      x = game.PLAYER_HABOUR_POSITIONS[game.activePlayer].x;
      y = game.PLAYER_HABOUR_POSITIONS[game.activePlayer].y;
      console.log('setting active player zoom to habour, x= ' + x + ' y= ' + y);

      updateCanvasPlayer(x, y, player.id).then(() => {
        // canvas updated

        // inform about no options and setup to end phase
        io.to(player.socketid).emit('updateInfoText', "info", "<p>No ships to shoot at. Click 'Next' to end this phase</p>");
        io.to(player.socketid).emit('hideActionButton');
        io.to(player.socketid).emit('showCancelButton', "Next");
      });
    }
    resolve();
  });
}

function handleTreasureCard() {
  return new Promise(resolve => {
    console.log('we handled treasure card played now :-) ');
    let player = players[game.activePlayer];
    // check if land or sea tressure
    console.log('selectedCardIndex = ' + game.selectedCardIndex);
    let treasureX = player.cards[game.selectedCardIndex].posX;
    let treasureY = player.cards[game.selectedCardIndex].posY;
    console.log('looking for treasure at x = ' + treasureX + ' and Y = ' + treasureY);

    if (game.tileGrid[treasureX + game.BOARD_COLS * treasureY] === 3) { // treasure in sea
      console.log('treasure is in the sea - you need a diver! and you must have a ship without gold in the hex')
      // check for diver card
      let diverFlag = false;
      for (let i = 0; i < player.cards.length; i++) {
        if (player.cards[i].suit === 'diver') {
          diverFlag = true;
        }
      }
      if (diverFlag) {
        shipInHex(player, treasureX, treasureY).then((id) => {
          if (id != -1) { // must be a ship here
            // is there a ship over treasure position?
            if (treasureX === player.shipscoords[id][0] && treasureY === player.shipscoords[id][1]) {
              // no gold onboard
              if (player.shipsgold[id] === 0) {
                // now we get gold

                player.shipsgold[id] = 1;
                // set text for ending card phase
                //io.to(player.socketid).emit('setupTextEndCardPhase');
                io.to(player.socketid).emit('updateInfoText', "info", "<p>You played a card. Click 'next phase' to continue.</p>");

                // hide action button and setup cancelButton "next phase" to move on.
                io.to(player.socketid).emit('hideActionButton');
                io.to(player.socketid).emit('showCancelButton', "Next phase")

                // remove card at index markedCard from player.cards
                let playedCard = player.cards.splice(game.selectedCardIndex, 1);

                // place playedCard in the stack bottom and add treasure card to played cards
                cards.push(playedCard);
                playedCards.push(playedCard[0]);
                console.log('playedCard is = ' + JSON.stringify(playedCard));
                console.log('playedCards is now = ' + JSON.stringify(playedCards));

                // remove the diver card as well
                let index = -1;
                for (let i = 0; i < player.cards.length; i++) {
                  if (player.cards[i].suit === 'diver') {
                    index = i; // find diver index
                  }
                }
                playedCard = player.cards.splice(index, 1); // remove diver card
                cards.push(playedCard); // place diver in the stack bottom
                playedCards.push(playedCard[0]); // add diver to playedCards
                console.log('playedCard is = ' + JSON.stringify(playedCard));
                console.log('playedCards is now = ' + JSON.stringify(playedCards));
                // update canvas
                updateCanvasPlayer(treasureX, treasureY, player.id).then(() => {
                  // canvas updated
                });

                // emit cards to activePlayer - removing played card from player and resetting selectedCardIndex
                game.selectedCardIndex = -1;
                io.to(player.socketid).emit('drawPlayerCards', player.cards, game.selectedCardIndex); 
                io.to(player.socketid).emit('playedCards', playedCards); // emit both played cards

              } else {
                // emit error
                console.log('you allready have gold on that ship');
                // reset card phase
                setupCardPhase().then(() => {
                });
              }
            } else {
              // emit error
              console.log('you have no ship there!')
              // reset card phase
              setupCardPhase().then(() => {
              });
            }
          }
        });
      } else {
        console.log('you have no diver card');
        // reset card phase
        setupCardPhase().then(() => {
        });
      }
    } else { // treasure on land

      game.goldOnLand = true;
      console.log('treasure is on land - you need to get a ship as close as possible!');
      // mark ships close enough to land treasure
      // if no close enouth - emit error and reset card phase
      // emit "select ship to pick up gold on land or click next to skip card phase" 

      getGoldOptions(treasureX, treasureY).then(() => {
        // now game.range and game.optionList is now set
      });

      //io.to(player.socketid).emit('setupTextGetGoldOnLand');
      io.to(players[game.activePlayer].socketid).emit('updateInfoText', "info", "<p>Gold is on land. Select ship to pick up gold on land. Or click 'skip' to end card phase.</p>");
      io.to(player.socketid).emit('hideActionButton');
      io.to(player.socketid).emit('showCancelButton', "Next");

    }
    resolve();
  });
}

function getGoldOptions(treasureX, treasureY) {
  return new Promise(resolve => {

    // start first loop at distance 1
    var range = 0;
    var closest = 0;
    // we collect a list of sea hexes 'range' hexes away from treasureX, treasureY
    let optionList = [];
    console.log('at start range = ' + range);
    console.log('at start closest = ' + closest)
    console.log('while condition at start is = ' + (closest != 0 && range < 6))

    do {
      range++;
      console.log('range now = ' + range);
      minX = treasureX - range;
      minY = treasureY - range;
      maxX = treasureX + range;
      maxY = treasureY + range;
      console.log('non corrected for borders:');
      console.log('minX = ' + minX);
      console.log('minY = ' + minY);
      console.log('maxX = ' + maxX);
      console.log('maxY = ' + maxY);


      if (minX < 1) { minX = 1 }
      if (minY < 1) { minY = 1 }
      if (maxX > game.BOARD_COLS - 2) { maxX = game.BOARD_COLS - 2 }
      if (maxY > game.BOARD_ROWS - 2) { maxX = game.BOARD_ROWS - 2 }
      console.log('corrected for borders:');
      console.log('minX = ' + minX);
      console.log('minY = ' + minY);
      console.log('maxX = ' + maxX);
      console.log('maxY = ' + maxY);

      console.log('for loop from i = minX = ' + minX + ' to i < maxX +1 = ' + (maxX + 1));
      console.log('for loop from j = minY = ' + minY + ' to i < maxY +1 = ' + (maxY + 1));

      for (let i = minX; i < maxX + 1; i++) {
        for (let j = minY; j < maxY + 1; j++) {
          console.log('looking at hex x = ' + i + ' and y = ' + j);
          if (game.tileGrid[i + game.BOARD_COLS * j] === 3) { // sea hex 
            console.log('we found a sea hex at range = ' + range);
            // put on closest list
            optionList.push([i, j]);
            console.log('optionList is now = ' + JSON.stringify(optionList));
            closest = range;
          }
        }
      }
      console.log('about to ask while (closest === 0 && range < 6). closes = ' + closest + ' range = ' + range);
      console.log('about to ask while condition (closest === 0 && range < 6) true? = ' + (closest === 0 && range < 6));

    }
    while (closest === 0 && range < 6);
    console.log('we stop searching - closest range is = ' + closest);
    console.log('final optionList is = ' + JSON.stringify(optionList));
    game.goldRange = range;
    game.optionList = optionList;
    resolve();
  });
}

function setupCardPhase() {
  console.log('HANDLE CARD PHASE - in setupCardPhase()');
  return new Promise(resolve => {
    let player = players[game.activePlayer];

    console.log('Active player is player id = ' + JSON.stringify(player.id));
    console.log('Phase is: ' + game.activePhase);

    io.to(player.socketid).emit('updateInfoText', "info", "<p>Click on a card and then on 'play card' or click 'next phase' to skip this phase.</p>");
    io.to(player.socketid).emit('hideActionButton');
    io.to(player.socketid).emit('showCancelButton', "next phase");

  });
}

function getGrid(coords) {
  return new Promise(resolve => {

    let grid = [];
    let i = 0;
    // evaluate on coords - can we have canvas inside board?
    // test cols and rows if all of grid for canvas is within board
    // left and top are ok - x>0 and y>0 allways
    if (coords[0] > game.BOARD_COLS - game.canvasCols + 2) { coords[0] = game.BOARD_COLS - game.canvasCols + 2 }
    if (coords[1] > game.BOARD_ROWS - game.canvasRows + 2) { coords[1] = game.BOARD_ROWS - game.canvasRows + 2 }

    // Main loop
    for (let y = coords[1]; y < coords[1] + game.canvasRows - 2; y++) { // from y = topleftcoord - row
      for (let x = coords[0]; x < coords[0] + game.canvasCols - 2; x++) { // from x = topleftcoord - col
        grid[i] = game.tileGrid[coordToArrayIndex(x, y)] // tjek map value at that index and assign to grid

        // gold in hex? Run through goldInSea array and change grid id if gold there
        for (let hex = 0; hex < game.goldInSea.length; hex++) {
          if (x === game.goldInSea[hex][0] && y === game.goldInSea[hex][1]) {
            grid[i] = 4; // gold code
          }
        }

        // do we have a ship here?
        for (let p = 0; p < players.length; p++) { // for each player
          for (let ship = 3; ship >= 0; ship--) { // for each ship 

            if ((players[p].shipscoords[ship][0] === x) && (players[p].shipscoords[ship][1] === y)) { // player's ship in this hex
              //console.log('ship found!: player = ' + p + 'ship = ' + ship);

              // building code for ship
              code = '1'; // first digit indicating a ship
              code += players[p].id; // second digit
              code += players[p].shipsgold[ship]; // third digit - Gold

              // TO DO play with if structure - can it be done smarter?

              // fireOption marking
              if (game.activePhase === 4) {
                for (let k = 0; k < game.fireOptions.length; k++) { // for each fireoption
                  if (p === game.fireOptions[k][0] && ship === game.fireOptions[k][1]) {
                    // this ship is in fireOptions array
                    //console.log('we marked a ship with code 4. p = '+ p + ' ship = ' + ship);
                    code += '4';
                  }
                }
              }

              if (game.activePhase === 1) {
                console.log('game.markedDefensiveFireShips = ' + JSON.stringify(game.markedDefensiveFireShips));

                // is it a ship to mark in game.markedDefensiveFireShips
                for (let i = 0; i < 4; i++) { // all ships for activePlayer
                  if ((game.markedDefensiveFireShips[i] === 1) && (x === players[game.activePlayer].shipscoords[i][0] && y === players[game.activePlayer].shipscoords[i][1])) {
                    //console.log('we marked a defensive fire ship with 1')  
                    code += '1';
                  }
                }

                // is it a ship to mark in game.markedDefensiveFireTargets
                console.log('game.markedDefensiveFireTargets = ' + JSON.stringify(game.markedDefensiveFireTargets));

                for (let i = 0; i < game.markedDefensiveFireTargets.length; i++) {
                  if (
                    x === players[game.markedDefensiveFireTargets[i].player].shipscoords[game.markedDefensiveFireTargets[i].ship][0]
                    &&
                    y === players[game.markedDefensiveFireTargets[i].player].shipscoords[game.markedDefensiveFireTargets[i].ship][1]
                  ) {
                    // we must mark this ship
                    code += '4';

                  }
                }

              }

              if (game.activePhase === 2) {
                console.log('game.markedDefensiveFireShips (used for diver card)= ' + JSON.stringify(game.markedDefensiveFireShips));

                // is it a ship to mark for use of diver card
                for (let i = 0; i < 4; i++) { // all ships for activePlayer
                  if ((game.markedDefensiveFireShips[i] === 1) && (x === players[game.activePlayer].shipscoords[i][0] && y === players[game.activePlayer].shipscoords[i][1])) {
                    //console.log('we marked a ship that can use diver with 1')  
                    code += '1'; // mark as marked
                  } else if (ship === game.selectedShip && p === game.activePlayer) {
                    code += '2'; // mark as selected
                  }
                }
              }

              if (p === game.activePlayer && game.activePhase != 2) { //  && !=2 to avoid problem in card phase 
                if (game.markedShip != -1 && ship === game.markedShip) { // match 
                  code += '1'; // show as marked
                } else if (game.selectedShip != -1 && ship === game.selectedShip) {
                  code += '2'; // show as selected
                } else {
                  code += '0';
                }
              } else if ((p === game.selectedTarget[0] && game.selectedTarget[1] === ship)) { // if ship belongs to player and ship in selected target

                // this is for offensive fire phase
                if (game.activePhase === 4) {
                  code = setCharAt(code, 3, '3'); // selected target allready marked as fireoption in 4 digit
                } else if (game.activePhase === 1) {
                  // this is for defensive fire phase
                  code += '3'; // show as selected
                }
              } else {
                code += '0'; // no markings on ship TO DO this adds extra 0 on all non activeplayer ships!!!
              }

              grid[i] = code;  // tjek map value at that index and assign to grid 
            }
          }
        }
        i++;
      }
    }
    resolve(grid);
  });
}

function setCharAt(str, index, chr) {
  if (index > str.length - 1) return str; // error index outside 
  return str.substr(0, index) + chr + str.substr(index + 1);
}

function emitShipBox() {
  let shipBox = [];
  let shipData = {};
  var gold, sunk, hextype, player, x, y;
  let marked = false;
  let selected = false;

  for (let i = 0; i < game.numberOfPlayers; i++) {
    player = players[i];
    if (player.id === game.activePlayer) {
      // check marked and selected
    }

    for (let ship = 0; ship < 4; ship++) {
      // for each ship
            
      if (player.shipsgold[ship] === 1) {
        gold = true;
      } else {
        gold = false;
      }

      // ship coord x,y
      x = player.shipscoords[ship][0];
      y = player.shipscoords[ship][1];
          
      if (x != -1) {
        hextype = game.tileGrid[coordToArrayIndex(x, y)]
        sunk = false;
      } else {
        hextype = -1;
        sunk = true;
      }

      for (let hex = 0; hex < game.goldInSea.length; hex++) {
        if (x === game.goldInSea[hex][0] && y === game.goldInSea[hex][1]) {
          hextype = 4; // gold code
        }
      }

      shipData = {"shipid" : ship, "sunk" : sunk, "selected" : selected, "marked" : marked, "gold" : gold, "hextype" : hextype}
      shipBox.push(shipData);
      }
    // emit 'updateShipBox' to player
    console.log('emitting shipBox = ' + JSON.stringify(shipBox));
    io.to(player.socketid).emit('updateShipBox', shipBox);

    shipBox = []; // reset after each player
  }
}


server.listen(port, () => {
  console.log(`Server is up on ${port}`);
});
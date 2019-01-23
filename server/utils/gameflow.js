function handleDieForMovement() { // removed haswind as parameter
  
  return new Promise(resolve => {
    
    dieRoll = throwDie();

    if (dieRoll === 6) { 	 // die roll of 6 give player a card
      console.log('You get a card!');
      // getCard(); TO DO draw card from stack and emit to player
    }
    resolve(dieRoll);

  });
}

function handleShipCard(game, players) {
  return new Promise(resolve => {

    // ship card can only be played if player has less than 4 ships
    if (players[game.activePlayer].numberOfShips() < 4) {
      // look for missing ship
      let missingshipIndex = -1;
      for (let i = 0; i < 4; i++) {
        if (players[game.activePlayer].shipscoords[i][0] === -1) { // we found a sunk ship with index i
          missingshipIndex = i;
        }
      }
      // get coords of activePlayer habour
      let playerId = players[game.activePlayer].id;
      let habourCoords = [game.PLAYER_HABOUR_POSITIONS[playerId].x, game.PLAYER_HABOUR_POSITIONS[playerId].y]
      // reset ship
      players[game.activePlayer].shipscoords[missingshipIndex] = habourCoords;
      console.log('set ship coordinates to player habour = ' + habourCoords);
      resolve(true);
      
    } else {
      resolve(false);
    }
  });
}

function handleDieForFire() { 
  return new Promise(resolve => { // needed?
    var dieResult = 1 + Math.floor(Math.random() * 6);
    //var audio = new Audio('dieroll.mp3');
    //audio.play();
    console.log("From handle die for fire. You hit a " + dieResult);
    resolve(dieResult);
  });
}

function throwDie() {
  var dieResult = 1 + Math.floor(Math.random() * 6);
  //var audio = new Audio('dieroll.mp3');
  //audio.play();
  console.log("You hit a " + dieResult);
  return dieResult;
}

function shipInHex(player, x, y) {
  console.log('we are in shipInHex');
  //console.log('do we have a player? = ' + JSON.stringify(player));
  return new Promise(resolve => {
    for (let i = 0; i < 4; i++) { // TO DO - check handling of sunk ships
      if (x === player.shipscoords[i][0] && y === player.shipscoords[i][1]) {
        // we click a ship
        resolve(i); // return id of ship (first ship if more in habour hex)
      }
    }
    resolve(-1); // if we didnt hit ship return -1
  });
}

function shipInSeaHex(game, player, x, y) {
  return new Promise(resolve => {
    var habourFlag;
    for (let i = 0; i < 4; i++) { // TO DO - check handling of sunk ships
      if (x === player.shipscoords[i][0] && y === player.shipscoords[i][1]) { // we click a ship
        // check ship not in habour
        habourFlag = false;
        for (j = 0; j < 4; j++) { // check the 4 habour coordinates, TO DO - not fixed number of habours
          if (game.PLAYER_HABOUR_POSITIONS[j].x === x && game.PLAYER_HABOUR_POSITIONS[j].y === y) { // x, y is a habour
            habourFlag = true;
          }
        }
        if (!habourFlag) {
          resolve(i); // return id of ship (first ship if more in habour hex)
        }
      }
    }
    console.log('we resolve shipinhex with ship id = ' + -1);

    resolve(-1); // if we didnt hit ship return -1
  });
}

function getFireOptions(game, players) {
  return new Promise(resolve => {
    var list = [];
    var habourFlag;
    x = players[game.activePlayer].shipscoords[game.selectedShip][0]
    y = players[game.activePlayer].shipscoords[game.selectedShip][1]
    for (y1 = y - 1; y1 < y + 2; y1++) {
      console.log('y1 = ' + y1);
      for (x1 = x - 1; x1 < x + 2; x1++) {  
        console.log('x1 = ' + x1);
        for (let i = 0; i < game.numberOfPlayers; i++) { // all players
          console.log('player = ' + i);
          if (i != game.activePlayer) { // dont add activePlayer ships to fire options list
            shipInSeaHex(game, players[i], x1, y1).then((shipId) => {
              if (shipId != -1) {
                  // add option to list
                  list.push([i,shipId]); // fire option element is [playerId, shipId]
                  console.log('fire option list is now = ' + JSON.stringify(list));
                }
            });
          }
        }
      }
    }
    resolve(list);
  });
}

function isValidTarget(game, players, x, y) {
  return new Promise(resolve => {
    console.log('inside isvalidtarget');
    // one hex away from ship = selectedShip position ?
    dX = Math.abs(x - players[game.activePlayer].shipscoords[game.selectedShip][0]);
    dY = Math.abs(y - players[game.activePlayer].shipscoords[game.selectedShip][1]);
    if (dX <= 1 && dY <= 1) { // a click on selected ship should not get here- so no check for that?
      console.log('within one hex');

      // Loop through fireOptions
      console.log('game.fireOptions = ' + game.fireOptions);

      console.log('going into for loop. i < game.fireOptions.length = ' + game.fireOptions.length);
      for (let i = 0; i < game.fireOptions.length; i++) {
        console.log('go through eact fireoption');
      
        let p = game.fireOptions[i][0] // targetPlayer
        let s = game.fireOptions[i][1] // targetShip  
        if (x === players[p].shipscoords[s][0] && y === players[p].shipscoords[s][1]) {
          console.log('ship from fireoptions found. targetPlayer = ' + p + ' target ship = ' + s );
          // clicked hex contains ship from fireOptions
          // mark selectedTarget
          game.selectedTarget = game.fireOptions[i];
          console.log('game.selectedTarget set to = ' + game.fireOptions[i]);
          resolve(true);
        }
      }
      resolve(false); // not a valid target
    }
  });
}

function markDefensiveFireShips(game, player) { // set game.markedDefensiveShips for the activePlayer
  return new Promise(resolve => {
    // tjek defensiveFireOptions for active player and look for ships with options
    for (i = 0; i < player.defensiveFireOptions.length; i++) {
      game.markedDefensiveFireShips[player.defensiveFireOptions[i].attackedShip] = 1; // can't be higher than 1 even if same ship has more targets.
    }
    resolve();
  });
}

function markDefensiveFireTargetShips(game, players, ship) { // set game.markedDefensiveFireTargetShips for a selected activePlayer ship
  return new Promise(resolve => {
    // tjek defensiveFireOptions for active player and look for the ship
    for (i = 0; i < players[game.activePlayer].defensiveFireOptions.length; i++) {
      if (players[game.activePlayer].defensiveFireOptions[i].attackedShip === ship) {
        // mark attacking ship
        let option = { player: players[game.activePlayer].defensiveFireOptions[i].attackingPlayer, ship: players[game.activePlayer].defensiveFireOptions[i].attackingShip }
        game.markedDefensiveFireTargets.push(option);
      }
    }
    resolve();
  });
}

function getGoldInSeaOptions(game, players) { // return array [0,1,0,1] to indicate which activePlayers ships should be marked for gold in sea options
  return new Promise(resolve => {
    let shipList = [0,0,0,0];
    console.log('looking for gold in sea and comparing with activeplayer ships - number of gold in sea = ' + game.goldInSea.length )
      for (let i = 0; i < game.goldInSea.length; i++) { // for each gold in sea hex
        for (let j = 0; j < 4; j++) { // for each game.activePlayer ship  
          console.log('comparing shipscoords = ' + players[game.activePlayer].shipscoords[j] + 'with goldinsea coords = ' + game.goldInSea[i])
          console.log('gold on ship allready ? = ' + players[game.activePlayer].shipsgold[j])
          console.log('the same? = ' + (players[game.activePlayer].shipscoords[j][0] == game.goldInSea[i][0]) && (players[game.activePlayer].shipscoords[j][1] == game.goldInSea[i][1]))

          if ((players[game.activePlayer].shipscoords[j][0] == game.goldInSea[i][0]) && (players[game.activePlayer].shipscoords[j][1] == game.goldInSea[i][1]) && players[game.activePlayer].shipsgold[j] === 0) { // ship is over gold and no gold on ship
            console.log('ship over gold found. Ship id = ' + j);
            shipList[j] = 1;
          }
          
        }
      }
      console.log('returning gold in sea option list = ' + shipList);
    resolve(shipList);
  });
}

function isActivePlayerShip(game, players, x, y) {
  return new Promise(resolve => {
    //console.log('we are inside isActivePlayerShip');
      let flag = false;
      for (let j = 0; j < 4; j++) {
        if (players[game.activePlayer].shipscoords[j][0] === x && players[game.activePlayer].shipscoords[j][1] === y) {
          resolve(j);
          flag = true;
        }
      }
      if (!flag) {
        resolve(-1);
      } 
  });
}

function isShipInHex(x, y, game, players) { // returns false if no ship or object {player, ship} if ship in hex
  return new Promise(resolve => {
    console.log('inside isShipInHex!');
    //let coord = [x, y];
    var flag = null;
    console.log('players[0].ship')
    for (let i = 0; i < players.length; i++) {
      for (let j=0; j < 4; j++) {
        if (players[i].shipscoords[j][0] === x && players[i].shipscoords[j][1] === y) {
          flag = { player: i, ship: j };
          console.log('setting flag to { player: i, ship: j }' + JSON.stringify(flag));
        }
      }
    }
      // if (players[i].shipscoords.indexOf(coord) > 0) {
      //   flag = { player: i, ship: players[i].shipscoords.indexOf(coord)};
      //   consol.log('setting flag to { player: i, ship: players[i].shipCoords.indexOf(coord)}');
      // }
    
    if (flag != null) {
      console.log('resolving flag')
      resolve(flag);
    } else {
      console.log('resolving false')
      resolve(false);
    }
  });
}

function getPhaseName(phase) {
  var phaseText;
  switch (phase) {
    case 1: phaseText = "Defensive Fire Phase"
      break;
    case 2: phaseText = "Card Phase"
      break;
    case 3: phaseText = "Movement Phase"
      break;
    case 4: phaseText = "Attack Phase"
      break;
  }
  return phaseText;
}

module.exports = { getGoldInSeaOptions, handleShipCard, getPhaseName, isShipInHex, isActivePlayerShip, markDefensiveFireShips, markDefensiveFireTargetShips, handleDieForFire, handleDieForMovement, shipInHex, isValidTarget, getFireOptions };
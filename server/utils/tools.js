

function serverGameStats(game, players) {
  // log out all info of game til console
  console.log('SERVER GAME STATS:');
  console.log('PLAYERS:');
  players.forEach(player => {
    console.log('Player id: ' + player.id);
    console.log('player name: ' + player.name);
    console.log('Number of ships: ' + player.numberOfShips());
    for (let i = 0; i < player.numberOfShips(); i++) {
      console.log('Ship no.: ' + i + ' position: (' + player.shipscoords[i] + '). Has gold: ' + player.shipsgold[i]);
    }
  });
  console.log('GAME:');
  console.log('Turn: ' + game.turn);
  console.log('Phase: ' + game.activePhase);
  console.log('Active player: ' + game.activePlayer);
}

function showStats(game, players) { // implement game argument below
  document.getElementById("status").innerHTML = "Pirate: " + players[activePlayer].name + "<br>";

  if (players[activePlayer].sitout > 0) {
    document.getElementById("status").innerHTML = "<div id='sitoutimage'><img src='ship_crash_100x150.png' height='75' width='50'></div> <span>" + players[activePlayer].sitout + "</span>";
  }
  if (players[activePlayer].haswind) {
    document.getElementById("status").innerHTML += "<div id='windimage'><img src='ship_storm_100x150.png' height='75' width='50'></div>";
  }

  document.getElementById("status").innerHTML += "Gold: " + players[activePlayer].gold + "<br>";

  document.getElementById("status").innerHTML += "<div id='shipicon'>";
  //for (var i=0; i<4; i++){
  var i, j;
  if (numberOfShips(activePlayer) != 0) {
    for (j = 0; j < numberOfShips(activePlayer); j++) {
      document.getElementById("status").innerHTML += "<img src='boat50x50_" + activePlayer + ".png' height='48' width='48' onclick='centerOnShip(" + activePlayer + "," + j + ")'>";
    } // end drawn all not sunk

  }
  // draw the sunk if any
  if (numberOfShips(activePlayer) != 4) {
    // at least one sunk
    for (i = 0; i < 4 - numberOfShips(activePlayer); i++) {
      document.getElementById("status").innerHTML += "<img src='boat50x50_sunk_" + activePlayer + ".png' height='48' width='48'>";
    } // end drawn a sunk
  } // end of the sunk
  //} // end 4 ships
  document.getElementById("status").innerHTML += "</div>";

  document.getElementById("status").innerHTML += "<br>";

  for (var i = 0; i < numberOfShips(activePlayer); i++) {
    // handle gold on board
    if (players[activePlayer].shipsgold[i] == 1) {
      document.getElementById("status").innerHTML += "<img src='gold_50x25.png' height='24' width='48'>";
    } else {
      document.getElementById("status").innerHTML += "<img src='nogold_50x25.png' height='24' width='48'>";
    }
  }
  document.getElementById("status").innerHTML += "</div>";

  document.getElementById("status").innerHTML += "movesLeft: " + movesLeft + " <br>";


  //document.getElementById("status").innerHTML += "Current phase: " + activePhase + " <br>";
  //document.getElementById("status").innerHTML += "SelectedShip: " + selectedShip + " <br>";
  //document.getElementById("status").innerHTML += "MarkedShip: " + markedShip + " <br>";
  //document.getElementById("status").innerHTML += "mouseCol: " + mouseCol + " <br>";
  //document.getElementById("status").innerHTML += "mouseRow: " + mouseRow + " <br>";
  //document.getElementById("status").innerHTML += "# of fireOptions: " + fireOptions.length + " <br>";
  //document.getElementById("status").innerHTML += "# of defensiveFireOptions: " + players[activePlayer].defensiveFireOptions.length + " <br>";
}

module.exports = { serverGameStats };
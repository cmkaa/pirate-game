var socket = io();
var players;
var playerId;
var playerCards = [];
var playedCards = [];
var shipsBox = [];
var selectedCardIndex = -1;

//PRE LOAD SOUNDS:
var cannon = new Audio();
cannon.src = '/js/libs/sound/cannon.mp3';
var cheer = new Audio();
cheer.src = '/js/libs/sound/Cheering.mp3';
var dierollsound = new Audio();
dierollsound.src = '/js/libs/sound/dieroll.mp3';

socket.on('connect', function () {
  var params = jQuery.deparam(window.location.search);
  
  socket.emit('join', params, function (err) {
    if (err) {
      alert(err);
      window.location.href = '/';
    } else {
      console.log('no error');
    }
  });
});

socket.on('disconnect', function () {
  console.log('Disconnected from server');
});

socket.on('updateUserList', function (users) {

  var ol = jQuery('<ol></ol>');
  users.forEach(function (user) {
    if (user.readytogo) {
      ol.append(jQuery('<li style = "background-color:green;"></li>').text(user.name));

    } else {
      ol.append(jQuery('<li></li>').text(user.name));
    }

  });
  jQuery('#users').html(ol);
});

socket.on('showScore', function (scoreArray) {
  document.getElementById("score").innerHTML = "<h3>Score</h3>";
  document.getElementById("score").innerHTML += "<span class='a'><b>Player</b></span><span class='b'><b>Gold</b></span><span class='b'><b>Ships</b></span><br>";
  for (let i = 0; i < scoreArray.length; i++){
    if (scoreArray[i].sitout != 0) { // player is sitting out
      document.getElementById("score").innerHTML += `<span style="color:red"><span class="a">${scoreArray[i].name}(${scoreArray[i].sitout})</span><span class="b">${scoreArray[i].gold}</span><span class="b">${scoreArray[i].ships}</span></span><br>`;
    } else {
    document.getElementById("score").innerHTML += `<span class="a">${scoreArray[i].name}</span><span class="b">${scoreArray[i].gold}</span><span class="b">${scoreArray[i].ships}</span><br>`;
    }
  }
});

socket.on('sitoutOn', function (turns) {
  sitout = turns;
  drawCardBoard();
});

socket.on('sitoutOff', function () {
  sitout = 0;
  drawCardBoard();
});

socket.on('updateInfoText', function (target, text) {
  document.getElementById(target).innerHTML = text;
});

socket.on('playedCards', function(cards) {
  playedCards = cards;
  console.log('we got these played cards = ' + JSON.stringify(cards))
  console.log('playedCards set to = ' + JSON.stringify(playedCards))
  drawCardBoard();
});

socket.on('resetPlayedCards', function() {
  playedCards = [];
  clearPlayedCards();
  drawCardBoard();
});

socket.on('setupTextForMarkShip', function (moves, dieroll) {
  document.getElementById("die_field").innerHTML = `<img class='die' src='/js/libs/images/die_${dieroll}.png'>`;
  document.getElementById("info").innerHTML = `<p><em>You hit a ${dieroll}!</em></p>`;
  document.getElementById("info").innerHTML += `<p>You can move ${moves} hexes.</p>`;
  document.getElementById("info").innerHTML += "<p>Click on a ship and then 'select' to select the ship for movement.</p>";
  dierollsound.play();
});

socket.on('showDieRoll', function (dieroll) {
  document.getElementById("die_field").innerHTML = `<img class='die' src='/js/libs/images/die_${dieroll}.png'>`;
  dierollsound.play();
});

socket.on('clearMovesLeft', function () {
  document.getElementById("die_field").innerHTML = "";
  document.getElementById("warning").innerHTML = "";
});

socket.on('setupTextFireDieRoll', function (dieRoll) {
  document.getElementById("die_field").innerHTML = `<img class='die' src='/js/libs/images/die_${dieRoll}.png'>`;
  dierollsound.play();
});

socket.on('clearTextFireDieRoll', function () {
  document.getElementById("die_field").innerHTML = "";
  document.getElementById("warning").innerHTML = "";

});

socket.on('setupTextFireGold', function () {
  document.getElementById("warning").innerHTML += "<p>You took the gold from target ship.</p>";
  cheer.play();
});

socket.on('setupTextFireSunk', function () {
  document.getElementById("warning").innerHTML += "<p>You sunk the target ship!</p>";
cannon.play();
});

// END TURN

socket.on('setupTextEndTurn', function () {
  document.getElementById("info").innerHTML = "<p>Your turn is over. Click 'End turn' to end your turn</p>";
});

socket.on('setupTextEndPlayer', function () {
  document.getElementById("info").innerHTML = "<p>Waiting for your turn</p>";
});

socket.on('setupTextEndPhase', function () {
  document.getElementById("info").innerHTML = "<b>Click 'Next' to continue</b>";
});

socket.on('showActionButton', function (text) {
  document.getElementById("action-button").style.display = "inline";
  document.getElementById("action-button").innerHTML = text;
});

socket.on('showCancelButton', function (text) {
  document.getElementById("cancel-button").style.display = "inline";
  document.getElementById("cancel-button").innerHTML = text;
});

socket.on('hideActionButton', function () {
  document.getElementById("action-button").style.display = "none";
});

socket.on('hideCancelButton', function () {
  document.getElementById("cancel-button").style.display = "none";
});

socket.on('newMessage', function (message) {
  var formattedTime = moment(message.createdAt).format('h:mm a');
  var template = jQuery('#message-template').html();
  var html = Mustache.render(template, {
    text: message.text,
    from: message.from,
    createdAt: formattedTime
  });

  jQuery('#messages').prepend(html);
});

 // init player

socket.on('gameStarts', function(id, coord) { // preload images, set PlayerId, activate eventlisteners, set initial viewPoint
  playerId = id;
  viewPoint = coord;
  //playerCards = [{ card: { suit: "treasure", posX: 2, posY: 4 }, marking: 1 }, { card: { suit: "ship" }, marking: 0 }, { card: { suit: "wind" }, marking: 0 }, { card: { suit: "ship" }, marking: 0 }, { card: { suit: "diver" }, marking: 0 } ]; // test
  // BOARD_COLS - TO DO:
  // BOARD_ROWS - TO DO:
  // TILE_SIZE - TO DO:

  // hide div id="users"
  document.getElementById("users").style.display = "none";

  // pre-load images
  preloadImages();
  preloadSound();
  // setup event listeners - board and card canvas
  canvas.addEventListener('mousemove', updateMousePos);
  canvas.addEventListener("mousedown", mouseclicked); 
  canvas.addEventListener("mouseout", clearBoard, false);

  cardcanvas.addEventListener('mousemove', updateMousePosCards);
  cardcanvas.addEventListener("mousedown", mouseclickedCards);
  cardcanvas.addEventListener("mouseout", clearCards, false);
});

socket.on('showSitoutCard', function(turns) {
  drawSitoutCard(turns);
});

socket.on('hideSitoutCard', function () {
  clearSitoutCard();
});

socket.on('showPlayedCard', function (cards) {
  drawPlayedCard(cards);
});

socket.on('hidePlayedCard', function () {
  clearPlayedCard();
});

socket.on('updateShipBox', function(shipbox) {
// getting info to build ship box = [{shipid:0, hextype:2, sunk: false, gold: false}, {}, {}, {}]
  console.log('received updateShipBox = ' + JSON.stringify(shipbox));
 shipsBox = shipbox;
 drawShipBox();
});

socket.on('hideReadyButton', function () {
  // remove ready and user buttons when game starts
  document.getElementById("send-turn").style.display = "none";
  document.getElementById("action-button").style.display = "none";
  document.getElementById("cancel-button").style.display = "none";
});

socket.on('drawPlayerCanvas', function (tiles, topLeft) {
  viewPoint = topLeft; // store new value this player
  tileGrid = tiles; // store new value for this player
  drawBoardNew(); // update board canvas
});

socket.on('drawPlayerCards', function(cards, markedIndex) {
playerCards = cards;
selectedCardIndex = markedIndex;
drawCardBoard(); // draw player cards
});

socket.on('readyButtonMessage', function (message) {
  var formattedTime = moment(message.createdAt).format('h:mm a');
  var template = jQuery('#ready-buton-message-template').html(); // html() henter HTML koden inde fra #location-message-template id'et
  var html = Mustache.render(template, {
    from: message.from,
    createdAt: formattedTime
  });

  jQuery('#messages').prepend(html);
});

socket.on('updatePlayerStatus', function (text, phase, turn) {
  var template = jQuery('#player-status-template').html(); // html() henter HTML koden inde fra #location-message-template id'et
  var html = Mustache.render(template, {
    playing: text,
    phase: phase,
    turn: turn,
  });

  jQuery('#status').html(html); 
}); 

socket.on('gameOver', function(scores){
  console.log('game over recieved with score = ' + JSON.stringify(scores));

  colorRect(0, 0, canvas.width, canvas.height, 'lightblue'); // clear screen
  colorCardRect(0, 0, 200, 550, '#241106');

  // remove canvas eventlisteners
  canvas.removeEventListener('mousemove', updateMousePos);
  canvas.removeEventListener("mousedown", mouseclicked);
  canvas.removeEventListener("mouseout", clearBoard, false);

  cardcanvas.removeEventListener('mousemove', updateMousePosCards);
  cardcanvas.removeEventListener("mousedown", mouseclickedCards);
  cardcanvas.removeEventListener("mouseout", clearCards, false);

  


  // build text for window.confirm
  let gameOverText = "";
  document.getElementById("warning").innerHTML = "<h1>GAME OVER!</h1><h2>Final scores:</h2>";

   for (let rank = 0; rank < scores.length; rank++){
     gameOverText += `${scores[rank].player} got ${scores[rank].score} points<br>`;
   }
  // write scores
  document.getElementById("warning").innerHTML += gameOverText;
  
  // modal
  //document.getElementById("myModal").innerHTML = `<div class='modal-content'><span class='close'>&times;</span><h1>Game Over!</h1>${gameOverText}</div>`;
}); 



socket.on('updateCombatInfo', function (text) {
  
  if (text != "") {
  console.log('updateCombatInfo with text = ' + text)
  var template = jQuery('#player-info-template').html(); // html() henter HTML koden inde fra #location-message-template id'et
  var html = Mustache.render(template, {
    text: text
  });

  jQuery('#warning').html(html);
} else {
    document.getElementById("warning").innerHTML = "";
}
});

jQuery('#message-form').on('submit', function (e) {
  e.preventDefault();

  var messageTextbox = jQuery('[name=message]');

  socket.emit('createMessage', {
    text: messageTextbox.val()
  }, function () {
    messageTextbox.val('')
  });
});

var turnButton = jQuery('#send-turn');
turnButton.on('click', function () {
  socket.emit('readyButtonClick');
});

var actionButton = jQuery('#action-button');
actionButton.on('click', function () {
  console.log('user clicked action button')
  socket.emit('actionButtonClick');
});

var cancelButton = jQuery('#cancel-button');
cancelButton.on('click', function () {
  console.log('user clicked cancel button')
  socket.emit('cancelButtonClick');
});
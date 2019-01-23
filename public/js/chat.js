var socket = io();
var players;
var playerId;
var playerCards = [];
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
  console.log('score looks like = ' + JSON.stringify(scoreArray));
  console.log('score is = ' + scoreArray);

  var score = jQuery('<div id="score"></div>');
  for (let i = 0; i < scoreArray.length; i++){
    console.log('Spiller = ' + scoreArray[i].name);
    console.log('Gold = ' + scoreArray[i].gold);
    console.log('Skibe = ' + scoreArray[i].ships);

    score.append(jQuery('<p></p>').text('Spiller: ' + scoreArray[i].name + ', Guld: ' + scoreArray[i].gold + ', Skibe: ' + scoreArray[i].ships));
    jQuery('#score-banner').html(score);
  }
});

socket.on('sitoutOn', function (turns) {
  sitout = turns;
  console.log('setting sitout to = ' + turns);
  drawCardBoard()
});

socket.on('sitoutOff', function () {
  sitout = 0;
  drawCardBoard()
});

// DEFENSIVE PHASE

socket.on('setupTextDefensivePhase', function (fireOptions) {
  //document.getElementById("info").innerHTML = "<b>Defensive phase</b>";
  document.getElementById("info").innerHTML = `<p>You have ${fireOptions} defensive fire options.</p>`; 
  document.getElementById("info").innerHTML += "<p>Click on a ship to see it's fire options and then on a marked enemy ship.</p>";
});

socket.on('setupTextDefensiveSelect', function () {
  //document.getElementById("info").innerHTML = "<b>Defensive phase</b>";
  document.getElementById("info").innerHTML = "<p>Click on marked fire option to select as target. Click 'Cancel' to deselect your ship</p>";
});

socket.on('setupTextDefensiveNone', function () {
  //document.getElementById("info").innerHTML = "<b>Defensive phase</b>";
  document.getElementById("info").innerHTML = "<p>No ships to shoot at. Click 'Next' to end this phase</p>";
});


// CARD PHASE

socket.on('setupTextCardPhase', function () {
  //document.getElementById("info").innerHTML = "<b>Card phase</b>";
  document.getElementById("info").innerHTML = "<p>Click on a card and then on 'play card' or click 'next phase' to skip this phase.</p>";
});

socket.on('setupTextEndCardPhase', function () { 
  //document.getElementById("info").innerHTML = "<b>Card phase</b>";
  document.getElementById("info").innerHTML = "<p>You played a card. Click 'next phase' to continue.</p>";
});

socket.on('setupTextGetGold', function () {
  //document.getElementById("info").innerHTML = "<b>Card phase</b>";
  document.getElementById("info").innerHTML = "<p>Now click 'get gold'</p>";
});

socket.on('setupTextGetGoldOnLand', function () {
  //document.getElementById("info").innerHTML = "<b>Card phase</b>";
  document.getElementById("info").innerHTML = "<p>Gold is on land. Select ship to pick up gold on land. Or click 'skip' to end card phase.</p>";
});

socket.on('setupTextGetGoldDieRoll', function (range) {
  //document.getElementById("info").innerHTML = "<b>Card phase</b>";
  document.getElementById("info").innerHTML = `<b>You must roll a ${range} to get gold on land.</b>`;
});

// MOVEMENT PHASE
socket.on('setupTextMovementPhase', function () { 
  //document.getElementById("info").innerHTML = "<b>Movement phase</b>";
  document.getElementById("info").innerHTML = "<p>Click 'roll die' to roll a die for movement</p>";
});

socket.on('setupTextForMarkShip', function (moves, dieroll) {
  //document.getElementById("info").innerHTML = "<b>Movement phase</b>";
  document.getElementById("die").innerHTML = `<p><em>You hit a ${dieroll}!</em></p>`;
  document.getElementById("info").innerHTML = `<p>You can move ${moves} hexes.</p>`;
  document.getElementById("info").innerHTML += "<p>Click on a ship and then 'select' to select the ship for movement.</p>";
  console.log()
  dierollsound.play();
});

socket.on('updateMovesLeft', function (moves) {
  document.getElementById("die").innerHTML = `<b>You have ${moves} moves left</b>`;
});

socket.on('clearMovesLeft', function () {
  document.getElementById("die").innerHTML = "";
});

socket.on('setupTextForMove', function (moves) {
  //document.getElementById("info").innerHTML = "<b>Movement phase</b>";
  document.getElementById("info").innerHTML = `<p>You can move ${moves} hexes.</p>`;
  document.getElementById("info").innerHTML += "<p>Click on a hex next to your ship on the map to move the ship into that hex.</p>";
  //document.getElementById("die").innerHTML = "";

});

// ATTACK PHASE

socket.on('setupTextAttackPhase', function (fireOptions) {
  //document.getElementById("info").innerHTML = "<b>Attack phase</b>";
  document.getElementById("info").innerHTML = `<p>You have ${fireOptions} fire options. Click on marked enemy ship to mark as target or 'skip' to exit fire phase</p>`; 
  //document.getElementById("info").innerHTML += "<p>Click 'ok' to continue</p>";
});

socket.on('setupTextAttackNone', function () {
  //document.getElementById("info").innerHTML = "<b>Attack phase</b>";
  document.getElementById("info").innerHTML = "<p>No ships to shoot at. Click 'Next' to end your turn</p>";
});

socket.on('setupTextFire', function () {
  //document.getElementById("info").innerHTML = "<b>Attack phase</b>";
  document.getElementById("info").innerHTML = "<p>Click 'Fire!' to shoot at targeted ship or 'cancel' to exit fire phase.</p>";
});

socket.on('setupTextFireDieRoll', function (dieRoll) {
  document.getElementById("die").innerHTML = `<p><em>You rolled a ${dieRoll}</em></p>`;
  dierollsound.play();
});

socket.on('clearTextFireDieRoll', function () {
  document.getElementById("die").innerHTML = "";
});

socket.on('setupTextSelectTarget', function () {
  //document.getElementById("info").innerHTML = "<b>Attack phase</b>";
  document.getElementById("info").innerHTML = "<p>click on ship to target.</p>";
});

socket.on('setupTextFireNothing', function () {
  //document.getElementById("info").innerHTML = "<b>Attack phase</b>";
  document.getElementById("die").innerHTML += "<p>You missed the target</p>";
});

socket.on('setupTextFireGold', function () {
  //document.getElementById("info").innerHTML = "<b>Attack phase</b>";
  document.getElementById("die").innerHTML += "<p>You took the gold from target ship.</p>";
  cheer.play();
});

socket.on('setupTextFireSunk', function () {
  //document.getElementById("info").innerHTML = "<b>Attack phase</b>";
  document.getElementById("die").innerHTML += "<p>You sunk the target ship!</p>";
  cannon.play();
});


// END TURN

socket.on('setupTextEndTurn', function () {
  //document.getElementById("info").innerHTML = "<b>End turn</b>";
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
  //scrollToBottom();
});

 // init player

socket.on('gameStarts', function(id, coord) { // preload images, set PlayerId, activate eventlisteners, set initial viewPoint
  playerId = id;
  viewPoint = coord;
  //playerCards = [{ card: { suit: "treassure", posX: 2, posY: 4 }, marking: 1 }, { card: { suit: "ship" }, marking: 0 }, { card: { suit: "wind" }, marking: 0 }, { card: { suit: "ship" }, marking: 0 }, { card: { suit: "diver" }, marking: 0 } ]; // test
  // BOARD_COLS - TO DO:
  // BOARD_ROWS - TO DO:
  // TILE_SIZE - TO DO:
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

socket.on('updateCombatInfo', function (text) {
  console.log('updateCombatInfo with text = ' + text)
  var template = jQuery('#player-info-template').html(); // html() henter HTML koden inde fra #location-message-template id'et
  var html = Mustache.render(template, {
    text: text
  });

  jQuery('#warning').html(html);
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
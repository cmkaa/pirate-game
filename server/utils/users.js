class Users {

  constructor() {
    this.users = [];
  }

  addUser(id, name, game) {
    //var playernumber = this.users.length; // virker ikke ordentligt
    var readytogo = false;
    var user = { id, name, game, readytogo };
    this.users.push(user);
    return user;
  }

  removeUser(id) {
    var user = this.getUser(id);

    if (user) {
      this.users = this.users.filter((user) => user.id !== id); // filter så vi ikke får user med id med i ny liste
    }

    return user;
  }

  getUser(id) {
    return this.users.filter((user) => user.id === id)[0]
  }

  getUsers() {
    return this.users
  }


  getUserList(game) {
    var users = this.users.filter((user) => user.game === game);
    //var namesArray = users.map((user) => user.name);
    var namesArray = users;

    return namesArray;
  }

  nameAvailable(name) {
    const keys = Object.values(this.users)
    for (const key of keys) {
      if (key.name == name) {
        return false;
      }
    }
    return true;
  }

}

module.exports = { Users };
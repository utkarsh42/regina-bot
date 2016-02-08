'use strict';

var util = require('util');
var path = require('path');
var fs = require('fs');
var SQLite = require('sqlite3').verbose();
var Bot = require('slackbots');
var poster = require('./poster.js');
var starwars = require('starwars');

/**
 * Constructor function. It accepts a settings object which should contain the following keys:
 *      token : the API token of the bot (mandatory)
 *      name : the name of the bot (will default to "norrisbot")
 *      dbPath : the path to access the database (will default to "data/norrisbot.db")
 *
 * @param {object} settings
 * @constructor
 *
 * @author Luciano Mammino <lucianomammino@gmail.com>
 */
var NorrisBot = function Constructor(settings) {
    this.settings = settings;
    this.settings.name = this.settings.name || 'regina';
    this.dbPath = settings.dbPath || path.resolve(__dirname, '..', 'data', 'norrisbot.db');

    this.user = null;
    this.db = null;
};

// inherits methods and properties from the Bot constructor
util.inherits(NorrisBot, Bot);

/**
 * Run the bot
 * @public
 */
NorrisBot.prototype.run = function () {

  console.log("norris is running");
    NorrisBot.super_.call(this, this.settings);

    this.on('start', this._onStart);
    this.on('message', this._onMessage);
};

/**
 * On Start callback, called when the bot connects to the Slack server and access the channel
 * @private
 */
NorrisBot.prototype._onStart = function () {
    this._loadBotUser();
    this._connectDb();
    this._firstRunCheck();
};

/**
 * On message callback, called when a message (of any type) is detected with the real time messaging API
 * @param {object} message
 * @private
 */
NorrisBot.prototype._onMessage = function (message) {

console.log("got a message "+ JSON.stringify(message));

    if (this._isChatMessage(message) &&
        this._isChannelConversation(message) &&
        !this._isFromNorrisBot(message) )
      {
        if (this._isMentioningChuckNorris(message))
        {
            this._replyWithRandomJoke(message);
        }
        else if(this._isWebLink(message))
        {
          console.log("this is web link ");

          this._replyWithCoolSt(message);
        }
        else if(this._isAtMention(message))
        {
          this._helloMessage(message);
        }
      }
};

/**
 * Replyes to a message with a random Joke
 * @param {object} originalMessage
 * @private
 */
NorrisBot.prototype._replyWithRandomJoke = function (originalMessage) {
    var self = this;
    self.db.get('SELECT id, joke FROM jokes ORDER BY used ASC, RANDOM() LIMIT 1', function (err, record) {
        if (err) {
            return console.error('DATABASE ERROR:', err);
        }

        var channel = self._getChannelById(originalMessage.channel);
        self.postMessageToChannel(channel.name, record.joke, {as_user: true});
        self.db.run('UPDATE jokes SET used = used + 1 WHERE id = ?', record.id);
    });
};
/**
 * Replyes to a web linnk with cool statement
 * @param {object} originalMessage
 * @private
 */
NorrisBot.prototype._replyWithCoolSt = function (originalMessage) {
    var self = this;
    var webLink = originalMessage.text;

    var user = self._getUserById(originalMessage.user);
    var channel = self._getChannelById(originalMessage.channel);

    console.log(originalMessage.user);
    var response = "@"+user.name+" copied that one."+starwars();
    self.postMessageToChannel(channel.name, response, {as_user: true});
        //self.db.run('UPDATE jokes SET used = used + 1 WHERE id = ?', record.id);

    poster(webLink, channel.name, user.name);
};
/**
 * Loads the user object representing the bot
 * @private
 */
NorrisBot.prototype._loadBotUser = function () {
    var self = this;
    this.user = this.users.filter(function (user) {
        console.log("i am "+user.name);
        return user.name === self.name;
    })[0];
};

/**
 * Open connection to the db
 * @private
 */
NorrisBot.prototype._connectDb = function () {
    if (!fs.existsSync(this.dbPath)) {
        console.error('Database path ' + '"' + this.dbPath + '" does not exists or it\'s not readable.');
        process.exit(1);
    }

    this.db = new SQLite.Database(this.dbPath);
};

/**
 * Check if the first time the bot is run. It's used to send a welcome message into the channel
 * @private
 */
NorrisBot.prototype._firstRunCheck = function () {
    var self = this;
    self.db.get('SELECT val FROM info WHERE name = "lastrun" LIMIT 1', function (err, record) {
        if (err) {
            return console.error('DATABASE ERROR:', err);
        }

        var currentTime = (new Date()).toJSON();

        // this is a first run
        if (!record) {
            self._welcomeMessage();
            return self.db.run('INSERT INTO info(name, val) VALUES("lastrun", ?)', currentTime);
        }

        // self._welcomeMessage();
        // updates with new last running time
        self.db.run('UPDATE info SET val = ? WHERE name = "lastrun"', currentTime);
    });
};

/**
 * Sends a welcome message in the channel
 * @private
 */
NorrisBot.prototype._welcomeMessage = function () {
  console.log("about to post "+this.channels[0].name);
    this.postMessageToChannel(this.channels[0].name, 'Hi guys, my name is regina' +
        '\n I can tell jokes. Just say `rajni time` or `' + this.name + '` to invoke me! To know what else I do, say `aap kaun hain ji`',
        {as_user: true});
};

/**
 * responds to @mention message in the channel
 * @private
 */
NorrisBot.prototype._helloMessage = function (originalMessage) {
  console.log("about to hello "+this.channels[0].name);

  var user = this._getUserById(originalMessage.user);

   var response = "@"+user.name+" Hello. Hows it going? "+starwars();
    this.postMessageToChannel(this.channels[0].name, response,
        {as_user: true});
};


/**
 * Util function to check if a given real time message object represents a chat message
 * @param {object} message
 * @returns {boolean}
 * @private
 */
NorrisBot.prototype._isChatMessage = function (message) {
    return message.type === 'message' && Boolean(message.text);
};

/**
 * Util function to check if a given real time message object is directed to a channel
 * @param {object} message
 * @returns {boolean}
 * @private
 */
NorrisBot.prototype._isChannelConversation = function (message) {
    return typeof message.channel === 'string' &&
        message.channel[0] === 'C'
        ;
};

/**
 * Util function to check if a given real time message is mentioning Chuck Norris or the norrisbot
 * @param {object} message
 * @returns {boolean}
 * @private
 */
NorrisBot.prototype._isMentioningChuckNorris = function (message) {
    return message.text.toLowerCase().indexOf('rajni time') > -1 ||
        message.text.toLowerCase().indexOf(this.name) > -1;
};

/**
 * Util function to check if a given real time message is a link
 * @param {object} message
 * @returns {boolean}
 * @private
 */
NorrisBot.prototype._isWebLink = function (message) {
    return message.text.toLowerCase().indexOf('http') > -1 ||
        message.text.toLowerCase().indexOf(this.name) > -1;
};

/**
 * Util function to check if a given real time message is an @ message
 * @param {object} message
 * @returns {boolean}
 * @private
 */
NorrisBot.prototype._isAtMention = function (message) {
  console.log(message.text.toLowerCase().charAt(1));
  console.log(message.text.slice(1).toLowerCase().indexOf(this.name));
    return message.text.toLowerCase().charAt(1) === "@" &&
        message.text.slice(1).indexOf("U0JSZEG1X") > -1;
};



/**
 * Util function to check if a given real time message has ben sent by the norrisbot
 * @param {object} message
 * @returns {boolean}
 * @private
 */
NorrisBot.prototype._isFromNorrisBot = function (message) {
    return message.user === this.user.id;
};

/**
 * Util function to get the name of a channel given its id
 * @param {string} channelId
 * @returns {Object}
 * @private
 */
NorrisBot.prototype._getChannelById = function (channelId) {
    return this.channels.filter(function (item) {
        return item.id === channelId;
    })[0];
};

/**
 * Util function to get the name of a user given its id
 * @param {string} userId
 * @returns {Object}
 * @private
 */
NorrisBot.prototype._getUserById = function (userId) {
    return this.users.filter(function (item) {
        return item.id === userId;
    })[0];
};

module.exports = NorrisBot;

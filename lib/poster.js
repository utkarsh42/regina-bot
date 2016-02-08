//Load the request module
var request = require('request');

var poster = function(url, channel, user)
{

console.log("sending post request with message "+url);

var finalUrl = url.replace("<", "").replace(">","");
console.log("final usrl "+ finalUrl)
  //Lets configure and request
request({
    url: 'https://regina.stamplayapp.com/api/cobject/v1/knowledgeobject', //URL to hit
    qs: {sender: 'blog example', title: 'blogger stuff'}, //Query string data
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',

    },
    json: {
        url: finalUrl,
        sender: user,
        channel: channel
    }
}, function(error, response, body){
    if(error) {
        console.log(error);
    } else {
        console.log(response.statusCode, body);
    }
});


}


module.exports = poster;

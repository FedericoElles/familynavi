var express = require('express');
var rp = require('request-promise');
var Q = require('q');

var app = module.exports = express();

var CONFIG = {
  ENDPOINT: 'https://federicoelles.github.io/familynavi/briefkasten/', //+ <cityid> + filename
  API: 'https://api.github.com/repos/federicoelles/familynavi/contents/briefkasten/' //+ <cityid>
};


//fetch directory listing in github

function getBriefeForCity(city){
  var deferred = Q.defer();
  
  var options = {
     uri: CONFIG.API + city,
     headers: {
        'User-Agent': 'Request-Promise'
    }
  };
  rp(options)
    .then(function (htmlString) {
        var json = JSON.parse(htmlString);
        
        var briefe = {};
        json.forEach(function(rec){
          
          var info = rec.name.split('.');
          if (info.length === 2){ //must have two parts
            var id = parseInt(info[0], 10);
            //id must be number
            if (isNaN(id)){
              return false;
            }
            // console.log('creating ',typeof(id));
            var type = info[1];
            if (typeof briefe[id] === 'undefined'){
              briefe[id] = {
                paths: {}
              };
             
            }
            briefe[id].paths[type] = rec.path;
          }
        });
        
        deferred.resolve(briefe);
    })
    .catch(function (err) {
        // Crawling failed... 
        deferred.reject(err);
    });
  
  return deferred.promise;
}




//ROUTING
app.get("/", function (req, res) {
  res.send('briefkasten');
});

app.get("/:city/", function (req, res) {
  //res.send('briefkasten>' + req.params.city);
  getBriefeForCity(req.params.city).then(function(data){
    res.send(data);
  }).catch(function(err){
    res.send(err)
  })
  
});




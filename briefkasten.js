var express = require('express');
var rp = require('request-promise');
var Q = require('q');

var app = module.exports = express();

var CONFIG = {
  ENDPOINT: 'https://federicoelles.github.io/familynavi/', //+ <cityid> + filename
  API: 'https://api.github.com/repos/federicoelles/familynavi/contents/briefkasten/' //+ <cityid>
};


//fetch file from github
function getFileFromGithub(path, id, type){
  var deferred = Q.defer();
  
  var r = {
    id: id,
    type: type
  };
  
  rp(CONFIG.ENDPOINT + path).then(function (htmlString) {
        if (r.type === 'json'){
          r.data = JSON.parse(htmlString);
        } else {
          r.data = htmlString;
        }
        deferred.resolve(r);
    })
    .catch(function (err) {
         deferred.reject(err);
    });
  return deferred.promise;  
}



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
        var promises = [];
        
        //extract paths to fetch data
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
            
            promises.push(getFileFromGithub(rec.path, id, type));
          }
        });
        
        //fetch all contents
        Q.allSettled(promises)
        .then(function (results) {
            results.forEach(function (result) {
                if (result.state === "fulfilled") {
                    var value = result.value;
                    //console.log('result', value);
                    briefe[value.id][value.type] = value.data;
                } else {
                    var reason = result.reason;
                }
            });
            
            //quality check && clear paths
             for (var x in briefe){
               var brief = briefe[x];
              
               if (brief.json && brief.md){
                 delete brief.paths;
               } else {
                 briefe[x] = undefined;
               }
             }
            
            deferred.resolve(briefe);
        });
        
        
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




var username = "sam2b@protonmail.com";
var password = ".Sammyb11";
var riderID = "712834";
var startingLevel = 8; // The level at zero degrees grade.  If too easy, increase value.
var maxLevel; // The quantity of rows in the array in Speedmeter.js  The highest resistance level of your machine.

// -------------- Do not edit below this line --------------

var ZwiftAccount = require("zwift-mobile-api");
var account = new ZwiftAccount(username, password);
var world = account.getWorld(1);
var timeOut = 2; // Do not change this value, else grade will be terribly inaccurate!
var tempGrade;
var tempLevel;
var xOld;
var yOld;
var altitudeOld;
var level; // The requested level to move to.
var slope;
var easyMode = false;
var multiplier = slopeMultipier();

//Constructor
var Zwifter = function() {
    // empty.
};

Zwifter.prototype.start = function() {
    refreshData();
}

// run this function every x second(s)
function refreshData() {
    var floatSlope;
    var slopeAlt;
    //console.log("REFRESHING DATA");
    
    //console.log(world);
    //console.log(world.riderStatus(riderID));
    
    world.riderStatus(riderID).then(status => {
        //console.log("---------- Good riderStatus ----------");
        var xNow = status.riderStatus.x;
        var yNow = status.riderStatus.y;
        var altitudeNow = status.riderStatus.altitude;
        xOld = xOld || xNow;
        yOld = yOld || yNow;
        altitudeOld = altitudeOld || altitudeNow;
        var rise = altitudeNow - altitudeOld;
        var run = Math.sqrt(Math.pow((xNow - xOld), 2) + Math.pow((yNow - yOld), 2));
        if (run != 0) {
            floatSlope = (rise / run) * multiplier; // Half slope.  Watopia.
            //slopeAlt = (rise / run) * 100; // Full slope. London
            //slopeAlt = Math.round(slopeAlt);
            slope = Math.round(floatSlope);
        } else {
            floatSlope = 0;
            slope = 0;
        }
        
        // Debugging ///////////////////////////////
        //console.log("grade: " + slope + "%,  Alt: " + slopeAlt + "%");
        //console.log(floatSlope + "%");
        //console.log(" ");
        ////////////////////////////////////////////
        
        tempLevel = startingLevel + slope; // tempLevel is relative to the startingLevel at slop value zero.
        if (slope == 0) {
            level = startingLevel;
        } else if (slope > 0) {
            if(tempLevel > maxLevel) {
                level = maxLevel;
            } else {
                level = tempLevel;
            }
        } else { //slope < 0
            if (tempLevel < 1) {
                level = 1;
            } else {
                level = tempLevel;
            }
        }
        // Lastly, the current values become the old values for the next loop itteration.
        xOld = xNow;
        yOld = yNow;
        altitudeOld = altitudeNow;
    });
    setTimeout(refreshData, timeOut*1000); //infinite loop.
}

function slopeMultipier() {
    var request = require('request');
    var parser = require('xml2json');
    var today = new Date().toISOString().split("T")[0].toString(); //today
    console.log("Today is " + today);
    var previousDate = today;
    var previousMap = "";
    var theMap;
    var zDate;

    request.get('http://cdn.zwift.com/gameassets/MapSchedule.xml', function (error, response, body) {
        if (!error && response.statusCode == 200) {
            theMap = doWorky(body);
            //LONDON, RICHMOND, WATOPIA
        }
    } );

    function doWorky(myData) {
       var json = parser.toJson(myData);
       var obj = JSON.parse(json);
       var array = obj.MapSchedule.appointments.appointment;
       var thing = array[0]; //all appointments.
       var returnedString;
       Object.keys(array).forEach(function(key) {
          var stuff = array[key]; // two elements of each appointment, map and start.
          var values = Object.keys(stuff).map(function(e) {
             return stuff[e];
          });
          var mapDate = values[1].split("T")[0].toString();
          //console.log(mapDate); //this element's start date.
          //console.log("today=" + today + ", previousDate=" + previousDate + ", mapDate=" + mapDate);
          //test(today, mapDate);
          //console.log("I am " + (today>=previous));
          if (today>=previousDate && today<mapDate) { //string comparisons.
             //theMap = previousMap; //the name of the map.
             //console.log(theMap);
             returnedString = previousMap;
          }
          previousDate = mapDate;
          previousMap = values[0];
       });
       return returnedString;
    }        

    //Hackaround to wait until the asynchronous assignment to theMap is complete.
    setTimeout(function() {
        multiplier = (theMap == "WATOPIA") ? 50 : 100;
        console.log("Map is " + theMap + ", Multiplier = " + multiplier);
    }, 1000);
}

Zwifter.prototype.getLevelRequested = function() {
    return level;
}

Zwifter.prototype.getGrade = function() {
    return slope;
}

Zwifter.prototype.getLevelAtZeroPercentGrade = function() {
    return startingLevel;
}

Zwifter.prototype.setLevelAtZeroPercentGrade = function(value) {
    startingLevel = value;
}

Zwifter.prototype.setEasyMode = function(value) {
    easyMode = value;
}

Zwifter.prototype.setMaxLevel = function(value) {
    maxLevel = value;
}

module.exports.Zwifter = Zwifter;

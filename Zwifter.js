var username = "";
var password = "";
var riderID = "";
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
            floatSlope = (rise / run) * 50; // Half slope.  Watopia.
            slopeAlt = (rise / run) * 100; // Full slope. London
            slopeAlt = Math.round(slopeAlt);
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
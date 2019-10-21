var level = 1;
var sleep = require('system-sleep');
var gpio = require('rpi-gpio');
var onoff = require('onoff').Gpio; //include onoff to interact with the GPIO
var relay;
var maxLevel;
var autoMode = true;
var offset = 0;
var oldPower = 0;
var oldRPM = 0;

var SpeedMeter = function(SensorPin, levelUpPin, levelDownPin, resistUpPin, resistDownPin, weighting, pulsesPerRev, timeOut, bounceTime) {
  var rpm = 0;
  var timeAct = 0;
  var timeOld = 0;
  var timeDiff = 0;
  var timeLevel = 0;
  var watchdog = null;
  var power = [
    //[6,12,20,29,40,53,69,79,92,106,121],
    //[8,16,26,38,53,68,88,103,120,138,152],
    //[9,20,32,47,66,84,107,125,148,172,186],
    [11,23,39,56,79,101,126,150,173,206,219],    // Level 1
    [13,27,45,65,92,117,145,175,202,238,254],
    [15,31,52,75,105,135,166,202,231,275,289],
    [16,35,58,85,118,152,185,226,260,305,332],
    [18,39,65,96,131,169,208,249,289,333,375],
    [19,42,71,104,144,184,227,272,318,361,408],
    [21,46,77,113,157,199,245,295,345,386,442],
    [23,50,84,123,170,216,262,318,372,413,480],
    [24,53,89,131,183,230,279,342,398,441,512],  // Level 9 (0% grade)
    [26,56,94,139,196,245,296,365,424,468,548],
    [28,60,101,148,209,261,318,389,449,494,585],
    [30,64,108,158,222,277,337,415,476,518,620],
    [32,68,115,168,235,296,355,439,503,548,658],
    [33,72,122,177,248,312,373,463,530,576,694],
    [35,76,129,187,261,328,390,484,556,606,727],
    [37,79,134,195,274,342,407,507,572,632,763],
    [39,83,140,204,287,354,424,528,598,659,790],
    [40,87,146,213,300,368,442,551,616,689,812],
    [42,91,153,223,313,385,461,574,645,720,840],
    [44,95,160,234,326,401,479,598,673,752,872], // Level 20
    //[47,101,171,246,340,418,501,625,706,788,908]
    ];

    maxLevel = power.length; // subtract the starting level so it is relative to zero.
    weighting = weighting || 0;
    pulsesPerRev = pulsesPerRev || 1; // The quantity of magnets on the wheel.
    timeOut = timeOut || 10000
    /* Between 200-350 will help reduce multiple level changes during a single physical button press.
       The goal is to have as large of a value as possible and still have as quick of a change in physical level as possible.
       So you might have to tune and tweak the bounceTime value and the relay delay value together.
    */
    bounceTime = bounceTime || 175;
    
    gpio.on('change', function(channel, value) {
        //console.log("gpio " + channel + " changed");
        switch(channel) {
            case SensorPin: // Every 1 RPM.
                var timeAct = new Date();
                if ((timeAct - timeOld) > bounceTime) {
                    if (watchdog) {
                        clearTimeout(watchdog); // Cancel the function.
                        // But, if the RPM signal stops (aka: you stop pedaling), then the watchdog function will eventually set your RPM to 0.
                    }
                    if (timeOld) {
                        timeDiff *= weighting;
                        timeDiff += (1 - weighting) * (timeAct - timeOld);
                        rpm = 60000 / (timeDiff * pulsesPerRev);
                    }
                    timeOld = timeAct;
                    watchdog = setTimeout(function() { // When you stop pedaling.
                        console.log("------------------------------------------");
                        console.log("-- -- -- WATCHDOG SET RPM TO ZERO -- -- --"); // debugging.
                        console.log("------------------------------------------");
                        timeOld = 0;
                        rpm = 0;
                        },  timeOut);
                }
                break;
            case levelUpPin:
                var timeLevelUp = new Date();
                if (!autoMode && (timeLevelUp - timeLevel) > bounceTime) {
                    if (level < maxLevel) {
                      ++level;
                      console.log("    MANUAL  LEVEL " + level);
                    }
                    timeLevel = timeLevelUp;
                }
                break;
            case levelDownPin:
                var timeLevelDown = new Date();
                if (!autoMode && (timeLevelDown - timeLevel) > bounceTime) {
                    if (level > 1) {
                      --level;
                      console.log("    MANUAL  LEVEL " + level);
                    }
                    timeLevel = timeLevelDown;
                }
                break;
            default:
                console.log("ERROR, unknown channel number " + channel);
        }
    });

    gpio.setup(SensorPin, gpio.DIR_IN, gpio.EDGE_RISING);
    gpio.setup(levelUpPin, gpio.DIR_IN, gpio.EDGE_RISING);
    gpio.setup(levelDownPin, gpio.DIR_IN, gpio.EDGE_RISING);
    gpio.setup(resistUpPin, gpio.DIR_OUT);
    gpio.setup(resistDownPin, gpio.DIR_OUT);
  
    this.getSpeed = function() {
      if (rpm >= 150) {
         rpm /= 100;
      }
      return rpm;
    };

    this.getLevel = function() {
      return level;
    };

    this.setLevel = function(theLevel) {
      level = theLevel;
    };

    this.decLevel = function() {
      level--;
    };

    this.incLevel = function() {
      level++;
    };

    this.getPower = function() {
        var lowerVal = 0;
        var upperVal = 0;
        var idxLower = Math.floor(rpm / 10);
        var idxUpper = Math.ceil(rpm / 10);
        var result;
 
        if (idxLower > 1 && idxLower <= 12) {
            lowerVal = power[level - 1][idxLower - 2];
        } else {
            idxLower = 0;
        }

        if (idxUpper > 1 && idxUpper <= 12) {
            upperVal = power[level - 1][idxUpper - 2];

        } else if (idxUpper > 20) { // Possibly happens if using a strong magnet which induces current to the wires which causes a false positive.
            // Happens when RPM > 200.
            console.log("RPM(", rpm, ") out of range.  Fake rpm is set to " + rpm/4.5);
            rpm /= 4.5; //rpm = oldRPM; // approximate down to 53RPM, not zero.
        } else if (idxUpper <= 1) {
             idxUpper = 0;
        }

        if (idxUpper == 0 && idxLower == 0 && rpm > 0) {
          //console.log("----------- idxUpper == 0 && idxLower == 0 ------------");
          return 0;
        }
                
        result = (upperVal - lowerVal) / (idxUpper * 10 - idxLower * 10) * (rpm - idxLower * 10) + lowerVal;

        // Debugging
        /*if (idxUpper == idxLower) {
          console.log(">>>>>>>>>>> idxUpper == idxLower <<<<<<<<<<");
        }
        if (upperVal == lowerVal) {
          console.log("[[[[[[[[[[[ upperVal == lowerVal ]]]]]]]]]]");
        } */

        // Fix for power drop out.
        if(rpm > 0 && (result==0 || isNaN(result))) {
          console.log("                                WORKAROUND, using oldPower = " + oldPower);
          console.log("========RESULT IS " + result + " ==============");
          console.log("upperVal = " + upperVal);
          console.log("lowerVal = " + lowerVal);
          console.log("idxUpper = " + idxUpper);
          console.log("idxLower = " + idxLower);
          console.log("rpm = " + rpm);
          console.log("====================================");
        } else {
            /* Store the last known good value.
               This solves issue of the appearance of a power dropout,
               and should keep you moving in Zwift.
               It is not an ANT+ issue.
               Necessary for the occasional result equaling zero or NaN 
               whenever upperVal==lowerVal or idxUpper==idxLower.
            */
            oldPower = result; 
        }
        return result || oldPower; // Only return a positive number.
      };
      
    this.getMaxLevel = function() {
        return maxLevel;
    }
    
    this.setAutoMode = function(value) {
        autoMode = value;
    }
    
};

// If using a reed switch, 0 is on, and 1 is off, and relay = new onoff(theGPIOpin, 'in');
// If using a hall sensor, 1 is on, and 0 is off, and relay = new onoff(theGPIOpin, 'out');
SpeedMeter.prototype.toggleRelay = function(theGPIOpin, delay) {
    relay = new onoff(theGPIOpin, 'out'); //use GPIO pin #, and specify that it is output.
    relay.writeSync(1); // activate relay
    sleep(delay);
    relay.writeSync(0); // deactivate relay
    sleep(delay);
}

module.exports.SpeedMeter = SpeedMeter;

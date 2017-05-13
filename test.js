var SpeedMeter = require('./SpeedMeter');
var speedmeter = new SpeedMeter.SpeedMeter(7, 38, 40);
var power_meter = require('./power-meter');
var pm = new power_meter.PowerMeter();

function a() {
  var power_instant = Math.round(speedmeter.getPower());
  var cadence = Math.round(speedmeter.getSpeed());
  pm.broadcast(power_instant, cadence);
  setTimeout(a, 249);
}

a();

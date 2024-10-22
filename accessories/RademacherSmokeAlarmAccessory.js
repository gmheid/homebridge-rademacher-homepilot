var tools = require("./tools.js");
var RademacherAccessory = require("./RademacherAccessory.js");

function RademacherSmokeAlarmAccessory(log, debug, accessory, sensor, session) {
    RademacherAccessory.call(this, log, debug, accessory, sensor, session);
    this.sensor = sensor;
    this.services = [];
    // smoke
    this.smokeDetected=this.sensor.readings.smoke_detected;
    var smokesensorService = this.accessory.getService(global.Service.SmokeSensor);
    smokesensorService.getCharacteristic(global.Characteristic.SmokeDetected)
        .setValue(this.smokeDetected)
        .on('get', this.getSmokeDetected.bind(this));
    this.services.push(smokesensorService);
    // battery
    this.currentBatteryLevel=this.sensor.batteryStatus;
    var batteryService = this.accessory.getService(global.Service.Battery);
    batteryService.getCharacteristic(global.Characteristic.BatteryLevel)
        .setValue(this.currentBatteryLevel)
        .on('get', this.getCurrentBatteryLevel.bind(this));
    this.services.push(batteryService);
    // TODO configure interval
    setInterval(this.update.bind(this), 10000);    
}

RademacherSmokeAlarmAccessory.prototype = Object.create(RademacherAccessory.prototype);

RademacherSmokeAlarmAccessory.prototype.getSmokeDetected = function (callback) {
    if (this.debug) this.log("%s [%s] - getSmokeDetected()", this.accessory.displayName, this.sensor.did);
    callback(null,this.smokeDetected);
    var self = this;
    this.session.get("/v4/devices?devtype=Sensor", 30000, function(err, body) {
        if(err) 
        {
            self.log("%s [%s] - getSmokeDetected(): error=%s", self.accessory.displayName, self.sensor.did,err);
            return;
        }
        body.meters.forEach(function(data) {
            if(data.did == self.sensor.did)
            {
                self.smokeDetected=data.readings.smoke_detected
                if (self.debug) self.log("%s [%s] - getSmokeDetected(): smoke detected=%s", self.accessory.displayName, self.sensor.did, self.smokeDetected);
                var smokesensorService = self.accessory.getService(global.Service.SmokeSensor);
                smokesensorService.getCharacteristic(global.Characteristic.SmokeDetected).updateValue(self.smokeDetected);
            }
        });
    });
};

RademacherSmokeAlarmAccessory.prototype.getCurrentBatteryLevel = function (callback) {
    if (this.debug) this.log("%s [%s] - getCurrentBatteryLevel()", this.accessory.displayName, this.sensor.did);
    callback(null,this.currentBatteryLevel);
    var self = this;
    this.session.get("/v4/devices?devtype=Sensor", 30000, function(err, body) {
        if(err) 
        {
            self.log("%s [%s] - getCurrentBatteryLevel(): error=%s", self.accessory.displayName, self.sensor.did,err);
            return;
        }
        body.meters.forEach(function(data) {
            if(data.did == self.sensor.did)
            {
                self.currentBatteryLevel=data.batteryStatus;
                if (self.debug) self.log("%s [%s] - getCurrentBatteryLevel(): battery status = %s", self.accessory.displayName, self.sensor.did, self.currentBatteryLevel);
                var batteryService = self.accessory.getService(global.Service.Battery);
                batteryService.getCharacteristic(global.Characteristic.BatteryLevel).updateValue(self.currentBatteryLevel);
            }
        });
    });
};

RademacherSmokeAlarmAccessory.prototype.getServices = function () {
    return this.service;
};

RademacherSmokeAlarmAccessory.prototype.update = function() {
    if (this.debug) this.log(`%s [%s] - update()`, this.accessory.displayName, this.sensor.did);
    var self = this;
    // smoke
    this.getSmokeDetected(function(err, state) {
        if (err)
        {
            self.log(`%s [%s] - update().getSmokeDetected(): error=%s`, self.accessory.displayName, self.sensor.did, err);
        }
        else if (state===null)
        {
            self.log(`%s [%s] - update().getSmokeDetected(): got null state`, self.accessory.displayName, self.sensor.did);
        }
        else
        {
            if (self.debug) self.log(`%s [%s] - update().getSmokeDetected(): smoke detected = %s`, self.accessory.displayName, self.sensor.did, state);
        }
    }.bind(this));

    // battery level
    this.getCurrentBatteryLevel(function(err, level) {
        if (err)
        {
            self.log(`%s [%s] - update().getCurrentBatteryLevel(): error=%s`, self.accessory.displayName, self.sensor.did, err);
        }
        else if (level===null)
        {
            self.log(`%s [%s] - update().getCurrentBatteryLevel(): got null battery level`, self.accessory.displayName, self.sensor.did);
        }
        else
        {
            if (self.debug) self.log(`%s [%s] - update().getCurrentBatteryLevel(): level=%s`, self.accessory.displayName, self.sensor.did, level);
        }
    }.bind(this));

};

module.exports = RademacherSmokeAlarmAccessory;
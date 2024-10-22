var tools = require("./tools.js");
var RademacherAccessory = require("./RademacherAccessory.js");

function RademacherDoorSensorAccessory(log, debug, accessory, sensor, session) {
    RademacherAccessory.call(this, log, debug, accessory, sensor, session);
    this.sensor = sensor;
    this.services = [];
    // contactsensor
    this.currentState=this.sensor.readings.contact_state=="closed"?false:true
    var contactsensorService = this.accessory.getService(global.Service.ContactSensor);
    contactsensorService.getCharacteristic(global.Characteristic.ContactSensorState)
        .setValue(this.currentState)
        .on('get', this.getCurrentDoorState.bind(this));
    this.services.push(contactsensorService);
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

RademacherDoorSensorAccessory.prototype = Object.create(RademacherAccessory.prototype);

RademacherDoorSensorAccessory.prototype.getCurrentDoorState = function (callback) {
    if (this.debug) this.log("%s [%s] - getCurrentDoorState()", this.accessory.displayName, this.sensor.did);
    callback(null,this.currentState);
    var self = this;
    this.session.get("/v4/devices?devtype=Sensor", 30000, function(err, body) {
        if(err) 
        {
            self.log("%s [%s] - getCurrentDoorState(): error=%s", self.accessory.displayName, self.sensor.did,err);
            return;
        }
        body.meters.forEach(function(data) {
            if(data.did == self.sensor.did)
            {
                if (self.debug) self.log("%s [%s] - getCurrentDoorState(): readings=%s", self.accessory.displayName, self.sensor.did,data.readings);
                var contact_state=data.readings.contact_state;
                var closed=contact_state=="closed";
                this.currentState=!closed;
                if (self.debug) self.log("%s [%s] - getCurrentDoorState(): open=%s", self.accessory.displayName, self.sensor.did, this.currentState);
                var contactsensorService = self.accessory.getService(global.Service.ContactSensor);
                contactsensorService.getCharacteristic(Characteristic.ContactSensorState).updateValue(this.currentState);    
            }
        });
    });
};

RademacherDoorSensorAccessory.prototype.getCurrentBatteryLevel = function (callback) {
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
                if (self.debug) self.log("%s [%s] - getCurrentBatteryLevel(): battery status=%s", self.accessory.displayName, self.sensor.did, self.currentBatteryLevel);
                var batteryService = self.accessory.getService(global.Service.Battery);
                batteryService.getCharacteristic(Characteristic.BatteryLevel).updateValue(self.currentBatteryLevel);
                }            
        });
    });
};


RademacherDoorSensorAccessory.prototype.getServices = function () {
    return this.services;
};

RademacherDoorSensorAccessory.prototype.update = function() {
    if (this.debug) this.log(`%s [%s] - update()`, this.accessory.displayName, this.sensor.did);
    var self = this;

    // Switch state
    this.getCurrentDoorState(function(err, state) {
        if (err)
        {
            self.log(`%s [%s] - update().getCurrentDoorState(): error=%s`, self.accessory.displayName, self.sensor.did, err);
        }
        else if (state===null)
        {
            self.log(`%s [%s] - update().getCurrentDoorState(): got null state`, self.accessory.displayName, self.sensor.did);
        }
        else
        {
            if (self.debug) self.log(`%s [%s] - update().getCurrentDoorState(): open=%s`, self.accessory.displayName, self.sensor.did, state);
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

module.exports = RademacherDoorSensorAccessory;

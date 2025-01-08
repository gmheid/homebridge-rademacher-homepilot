var request = require("request");
var tools = require("./tools.js");
var RademacherAccessory = require("./RademacherAccessory.js");

function RademacherLightbulbAccessory(log, debug, accessory, lb, session) {
    RademacherAccessory.call(this, log, debug, accessory, lb, session);
    var self = this;
    this.lb = lb;
    var position=0;
    if (this.lb.hasOwnProperty("statusesMap") && this.lb.statusesMap.hasOwnProperty("Position"))
    {
        position=this.lb.statusesMap.Position;
    }
    else
    {
        this.log("RademacherLightbulbAccessory(): no position in lightbulb object %o", lb)
    }
    if (this.debug) this.log("%s [%s] - RademacherLightbulbAccessory(): initial position=%s", accessory.displayName, lb.did,position);
    this.lastBrightness = position;
    this.currentBrightness = this.lastBrightness;
    this.currentStatus = position>0?true:false;
    this.lastStatus = this.currentStatus;


    this.service = this.accessory.getService(global.Service.Lightbulb);
    this.service.getCharacteristic(global.Characteristic.On)
        .on('get', this.getStatus.bind(this))
        .on('set', this.setStatus.bind(this));
    this.service.getCharacteristic(global.Characteristic.Brightness)
        .on('get', this.getBrightness.bind(this))
        .on('set', this.setBrightness.bind(this));
    // TODO configure interval
    setInterval(this.update.bind(this), 30000);
}

RademacherLightbulbAccessory.prototype = Object.create(RademacherAccessory.prototype);

RademacherLightbulbAccessory.prototype.getStatus = function(callback) {
    if (this.debug) this.log("%s [%s] - getStatus()", this.accessory.displayName, this.lb.did);
    callback(null,this.currentStatus);
    var self = this;
    this.getDevice(function(err, data) {
        if(err)
        {
            self.log(`%s [%s] - error in getStatus(): %s`, self.accessory.displayName, self.lb.did, err);
            return;
        } 
        var pos = data.statusesMap.Position;
        if (self.debug) self.log(`%s [%s] - getStatus(): brightness=%s`, self.accessory.displayName, self.lb.did, pos);
        self.currentStatus=(pos>0?true:false);
        self.lastStatus=self.currentStatus;
        self.service.getCharacteristic(Characteristic.On).updateValue(self.currentStatus);
    });
};

RademacherLightbulbAccessory.prototype.setStatus = function(status, callback, context) {
    if (this.debug) this.log("%s [%s] - setStatus(%s)", this.accessory.displayName, this.lb.did, status);
    callback(null);
    var self = this;
    var changed = (status != this.lastStatus);
    if (this.debug) this.log("%s [%s] - setStatus(): lightbulb changed=%s", this.accessory.displayName,self.lb.did,changed);
    if (changed)
    {            
        this.log("%s [%s] - setStatus(): changed from %s to %s", this.accessory.displayName,self.lb.did,this.lastStatus,status);
        var params = {name: this.lastStatus?"TURN_OFF_CMD":"TURN_ON_CMD"};
        this.session.put("/devices/"+this.lb.did, params, 30000, function(err) {
            if(err)
            {
                self.log(`%s [%s] - setStatus(): error=%s`, self.accessory.displayName, self.lb.did, err);
                return;
            } 
            self.currentStatus = status;
            self.lastStatus = self.currentStatus;
            self.service.getCharacteristic(Characteristic.On).updateValue(self.currentStatus);
        });
    }
};

RademacherLightbulbAccessory.prototype.getBrightness = function(callback) {
    if (this.debug) this.log("%s [%s] - getBrightness()", this.accessory.displayName, this.lb.did);
    callback(null,this.currentBrightness);
    var self = this;
    this.getDevice(function(err, data) {
        if(err)
        {
            self.log(`%s [%s] - getBrightness(): error=%s`, self.accessory.displayName, self.lb.did, err);
            return;
        } 
        var pos = data.statusesMap.Position;
        if (self.debug) self.log(`%s [%s] - getBrightness(): brightness=%s`, self.accessory.displayName, self.lb.did, pos);        
        self.currentBrightness=pos;
        self.lastBrightness=self.currentBrightness;
        self.service.getCharacteristic(Characteristic.Brightness).updateValue(self.currentBrightness);
    });
};

RademacherLightbulbAccessory.prototype.setBrightness = function(brightness, callback, context) {
    if (this.debug) this.log("%s [%s] - setBrightness(%s)", this.accessory.displayName, this.lb.did, brightness);
    callback(null);
    var self = this;
    var changed = (brightness != this.lastBrightness);
    if (changed)
    {
        this.log("%s  [%s] - setBrightness(): brightness changed from %s to %s", this.accessory.displayName,self.lb.did,this.lastBrightness,brightness);
        var params = {name: "GOTO_POS_CMD", value: brightness};
        this.session.put("/devices/"+this.lb.did, params, 30000, function(e) {
            if(e) return callback(new Error("Request failed: "+e), null);
            self.currentBrightness = brightness;
            self.lastBrightness = self.currentBrightness;
            self.service.getCharacteristic(Characteristic.Brightness).updateValue(self.currentBrightness);
        });
    }
};

RademacherLightbulbAccessory.prototype.update = function() {
    if (this.debug) this.log(`%s [%s] - update()`, this.accessory.displayName, this.lb.did);
    var self = this;

    // Status
    this.getStatus(function(err, status) {
        if (err)
        {
            self.log(`%s [%s] update().getStatus(): error=%s`, this.accessory.displayName, this.lb.did,err);
        }
        else if (status===null)
        {
            self.log(`%s [%s] update().getStatus(): got null`, this.accessory.displayName, this.lb.did);
        }
        else
        {
            if (self.debug) self.log(`%s [%s] - update().getStatus(): new status=%s`, self.accessory.displayName, self.lb.did, status);
        }
    }.bind(this)); 

    // Brightness
    this.getBrightness(function(err, brightness) {
        if (err)
        {
            self.log(`%s [%s] update().getBrightness(): error=%s`, this.accessory.displayName, this.lb.did,err);
        }
        else if (brightness===null)
        {
            self.log(`%s [%s] update().getBrightness(): got null`, this.accessory.displayName, this.lb.did);
        }
        else
        {
            if (self.debug) self.log(`%s [%s] - update().getBrightness(): new brightness=%s`, self.accessory.displayName, self.lb.did, brightness);
        }
    }.bind(this));
};

RademacherLightbulbAccessory.prototype.getServices = function() {
    return [this.service];
};

module.exports = RademacherLightbulbAccessory;

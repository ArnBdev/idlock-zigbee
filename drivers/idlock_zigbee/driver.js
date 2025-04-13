'use strict';
const Homey = require('homey');

// Dette er hoved-driver klassen. 
class IdLockZigbeeMainDriver extends Homey.Driver {
  async onInit() {
    this.log('Minimal MAIN DRIVER Initialized'); 
  }
  // onPair() trengs vanligvis ikke for Zigbee
}
module.exports = IdLockZigbeeMainDriver;
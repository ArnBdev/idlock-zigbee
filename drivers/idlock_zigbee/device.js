'use strict';

// === DEBUG LOGGING PÅ ===
const { debug } = require('zigbee-clusters');
debug(true); // Enable zigbee-cluster logging
// === SLUTT PÅ DEBUG ===

// Importerer ZigbeeDevice og CLUSTER
const { ZigbeeDevice, CLUSTER } = require('homey-zigbeedriver');

// Hjelpefunksjon for å oversette Zigbee status til Homey status
function zigbeeLockStateToHomeyLockedState(lockState) {
  const isLocked = (lockState === 1); // Antar 1 = Låst
  return isLocked;
}

// Enhetsklassen
class IdLockZigbeeDeviceInstance extends ZigbeeDevice {

  // Legg til konstruktør for å se om klassen instansieres
  constructor(...args) {
    super(...args); // Kall alltid super-konstruktøren FØRST!
    this.log('CONSTRUCTOR CALLED - Device instance is being created'); 
  }

  // Forenklet onNodeInit (uten aktiv comms for å teste om den kalles)
  async onNodeInit({ zclNode }) {
    this.log('STEP 1: Starting onNodeInit (SIMPLIFIED - No reporting config/read)...');
    
    try {
      this.log(`STEP 2: Logging device info... Manufacturer: ${this.getManufacturerName()}, Model: ${this.getModelId()}, NWK: ${this.getNetworkAddress()}, IEEE: ${this.getIeeeAddress()}`);
    } catch (error) {
      this.error('STEP 2 FAILED: Error logging device info:', error);
    }

    // --- Registrer 'locked' capability ---
    this.log("STEP 3: Checking 'locked' capability...");
    if (this.hasCapability('locked')) {
      try {
        this.log(`STEP 4: Registering 'locked' capability listener to cluster ${CLUSTER.CLOSURES_DOOR_LOCK.NAME}...`);
        this.registerCapability('locked', CLUSTER.CLOSURES_DOOR_LOCK, {
          report: 'lockState', 
          reportParser: value => { 
            this.log(`REPORT PARSER (locked): Received lockState report with raw value: ${value}`);
            const parsedValue = zigbeeLockStateToHomeyLockedState(value);
            this.log(`REPORT PARSER (locked): Parsed lockState to Homey locked: ${parsedValue}`);
            return parsedValue;
          } 
        });
        this.log("STEP 5: Finished registering 'locked'.");
      } catch (error) {
        this.error(`STEP 4-5 FAILED: Error during 'locked' capability registration: ${error.message}`, error.stack);
      }
    } else {
      this.log("STEP 4 SKIPPED: Capability 'locked' is missing in app manifest.");
    }

    // --- Registrer batteri-capabilities ---
    this.log("STEP 7: Checking 'measure_battery' capability...");
    if (this.hasCapability('measure_battery')) {
       try {
        this.log(`STEP 8: Registering 'measure_battery' capability listener to cluster ${CLUSTER.POWER_CONFIGURATION.NAME}...`);
         this.registerCapability('measure_battery', CLUSTER.POWER_CONFIGURATION, {
           report: 'batteryPercentageRemaining',
           reportParser: value => { 
             this.log(`REPORT PARSER (battery): Received batteryPercentageRemaining report with raw value: ${value}`);
             if (value === null || typeof value !== 'number' || value < 0 || value > 200) { this.log('REPORT PARSER (battery): Invalid value'); return null; }
             const percentage = Math.round(value / 2); 
             this.log(`REPORT PARSER (battery): Calculated percentage: ${percentage}%`);
             return Math.min(100, Math.max(0, percentage)); 
            }
         });
        this.log("STEP 9: Finished registering 'measure_battery'.");
      } catch (error) {
        this.error(`STEP 8-9 FAILED: Error during 'measure_battery' capability registration: ${error.message}`, error.stack);
      }
    } else {
       this.log("STEP 8 SKIPPED: Capability 'measure_battery' is missing in app manifest.");
    }

    // --- Registrer listener for batterialarm ---
    this.log("STEP 11: Checking 'alarm_battery' capability...");
    if (this.hasCapability('alarm_battery')) {
      try {
        this.log("STEP 12: Registering listener for 'alarm_battery' on 'measure_battery' changes...");
        this.registerCapabilityListener('measure_battery', async (value) => { 
          this.log(`LISTENER: 'measure_battery' capability changed to: ${value}`);
          if (typeof value === 'number') { 
            const lowBatteryThreshold = this.getSetting('low_battery_threshold') || 20; 
            const isLow = value <= lowBatteryThreshold;
            const currentAlarmState = this.getCapabilityValue('alarm_battery'); 
            this.log(`LISTENER: Battery level ${value}%. Threshold ${lowBatteryThreshold}%. Current alarm state: ${currentAlarmState}. Setting alarm_battery to: ${isLow}`);
            if (currentAlarmState !== isLow) {
              await this.setCapabilityValue('alarm_battery', isLow).catch(this.error);
              this.log(`LISTENER: Set alarm_battery capability to ${isLow}`);
            } else { this.log(`LISTENER: alarm_battery already is ${isLow}.`); }
          }
        });
        this.log("STEP 13: Finished registering listener for 'alarm_battery'.");
      } catch (error) {
         this.error(`STEP 12-13 FAILED: Error registering listener for 'alarm_battery': ${error.message}`, error.stack);
      }
    } else {
       this.log("STEP 12 SKIPPED: Capability 'alarm_battery' is missing in app manifest.");
    }

    this.log('STEP 14: Simplified onNodeInit completed.'); 
  } // Slutt på onNodeInit


  async onDeleted() {
    this.log('DEVICE DELETED');
    await super.onDeleted(); 
  }

} // Slutt på klassen IdLockZigbeeDeviceInstance

module.exports = IdLockZigbeeDeviceInstance;
const { Servient } = require("@node-wot/core");
const HttpServer = require("@node-wot/binding-http").HttpServer;
const CoapServer = require("@node-wot/binding-coap").CoapServer;

const servient = new Servient();
servient.addServer(new HttpServer({ port: 8080 }));
servient.addServer(new CoapServer());

async function simulateBrewing() {
  console.log("Simulating brewing process");
}

servient.start().then(async (WoT) => {
  const thing = await WoT.produce({
    title: "BrewMachine",
    id: "urn:dev:ops:brewmachine-001",
    description: "A smart coffee brewing machine",
    properties: {
      state: {
        type: "string",
        enum: ["idle", "brewing", "grinding", "error", "off"],
        observable: true,
        readOnly: true,
      },
      water: { 
        type: "number", 
        observable: true, 
        readOnly: true, 
      },
      beans: { 
        type: "number", 
        observable: true, 
        readOnly: true, 
      },
      bin: { 
        type: "number", 
        observable: true, 
        readOnly: true, 
      }
    },
    actions: {
      brew: {
        description: "Brew coffee with specific type and size",
        input: {
          type: "object",
          properties: {
            type: { type: "string" },
            size: { type: "string" }
          }
        }
      },
      stop: {
        description: "Stop the brewing process"
      },
      powerOff: {
        description: "Power off the machine"
      }
    },
    events: {
      lowWater: { type: "string" },
      lowBeans: { type: "string" },
      binFull: { type: "string" },
      error: { type: "string" }
    }
  });

  // Internal state
  let currentState = "off";
  let waterLevel = 100;
  let beansLevel = 100;
  let binLevel = 0;
  let brewingTimer;

  // Property handlers
  thing.setPropertyReadHandler("state", () => currentState);
  thing.setPropertyReadHandler("water", () => waterLevel);
  thing.setPropertyReadHandler("beans", () => beansLevel);
  thing.setPropertyReadHandler("bin", () => binLevel);

  // Action handlers
  thing.setActionHandler("brew", async (input) => {
    if (currentState === "off") throw new Error("Machine is off");
    if (currentState === "brewing") throw new Error("Already brewing");
    
    // Check resources
    if (waterLevel < 10) {
      thing.emitEvent("lowWater", "Not enough water");
      throw new Error("Not enough water");
    }
    if (beansLevel < 10) {
      thing.emitEvent("lowBeans", "Not enough coffee beans");
      throw new Error("Not enough beans");
    }
    if (binLevel > 90) {
      thing.emitEvent("binFull", "Please empty the bin");
      throw new Error("Bin full");
    }

    currentState = "brewing";
    thing.emitPropertyChange("state");
    
    await simulateBrewing();

    brewingTimer = setTimeout(() => {
      currentState = "idle";
      waterLevel -= 10;
      beansLevel -= 10;
      binLevel += 10;
      
      thing.emitPropertyChange("state");
      thing.emitPropertyChange("water");
      thing.emitPropertyChange("beans");
      thing.emitPropertyChange("bin");
    }, 5000);

    return `Brewing ${input.type} coffee, size ${input.size}`;
  });

  thing.setActionHandler("stop", async () => {
    if (brewingTimer) {
      clearTimeout(brewingTimer);
      brewingTimer = null;
      currentState = "idle";
      thing.emitPropertyChange("state");
      return "Brewing stopped";
    }
    return "No brewing in progress";
  });

  thing.setActionHandler("powerOff", async () => {
    if (brewingTimer) {
      clearTimeout(brewingTimer);
      brewingTimer = null;
    }
    currentState = "off";
    thing.emitPropertyChange("state");
    return "Machine powered off";
  });

  await thing.expose();
  console.log(`${thing.getThingDescription().title} ready`);
});
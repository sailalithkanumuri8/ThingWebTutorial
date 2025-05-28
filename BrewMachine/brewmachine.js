const Servient = require("@node-wot/core").Servient;
const HttpServer = require("@node-wot/binding-http").HttpServer;
const CoapServer = require("@node-wot/binding-coap").CoapServer;

async function main() {
  const servient = new Servient();
  servient.addServer(new HttpServer({ port: 8080 }));
  servient.addServer(new CoapServer());

  const WoT = await servient.start();

  const thing = await WoT.produce({
    title: "BrewMachine",
    id: "urn:dev:ops:brewmachine-001",
    properties: {
      state: {
        type: "string",
        enum: ["idle", "brewing", "grinding", "error", "off"],
        observable: true,
        readOnly: true,
        initial: "off",
      },
      water: { type: "number", observable: true, readOnly: true, initial: 100 },
      beans: { type: "number", observable: true, readOnly: true, initial: 100 },
      bin: { type: "number", observable: true, readOnly: true, initial: 0 }
    },
    actions: {
      brew: {
        input: {
          type: "object",
          properties: {
            type: { type: "string" },
            size: { type: "string" }
          }
        }
      },
      stop: {},
      powerOff: {}
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
  thing.setPropertyReadHandler("state", async () => currentState);
  thing.setPropertyReadHandler("water", async () => waterLevel);
  thing.setPropertyReadHandler("beans", async () => beansLevel);
  thing.setPropertyReadHandler("bin", async () => binLevel);

  // Action handlers
  thing.setActionHandler("brew", async (input) => {
    if (currentState === "off") throw new Error("Machine is off");
    if (currentState === "brewing") throw new Error("Already brewing");
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

    // Simulate brewing time
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
}

main().catch((err) => console.error(err));
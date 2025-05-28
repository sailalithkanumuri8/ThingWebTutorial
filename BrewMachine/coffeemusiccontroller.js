const { Servient } = require("@node-wot/core");
const HttpServer = require("@node-wot/binding-http").HttpServer;
const fetch = require("node-fetch");

const servient = new Servient();
servient.addServer(new HttpServer({ port: 8890 }));

async function playEnergeticMusic() {
  console.log("Playing energetic morning music");
}

async function playCalmMusic() {
  console.log("Playing calm morning music");
}

servient.start().then(async (WoT) => {
  const thing = await WoT.produce({
    title: "CoffeeMusicController",
    description: "Plays music during coffee brewing",
    actions: {
      startBrewing: {
        description: "Start brewing coffee and play music",
      },
    },
    properties: {
      brewing: {
        type: "boolean",
        readOnly: true,
      },
    },
  });

  let isBrewing = false;

  thing.setPropertyReadHandler("brewing", () => isBrewing);

  thing.setActionHandler("startBrewing", async () => {
    if (isBrewing) {
      console.log("Already brewing");
      return;
    }

    isBrewing = true;
    thing.emitPropertyChange("brewing");

    console.log("Brewing started");
    await playEnergeticMusic();

    setTimeout(async () => {
      isBrewing = false;
      thing.emitPropertyChange("brewing");
      console.log("Brewing complete");
      await playCalmMusic();
    }, 10000);
  });

  thing.expose().then(() => {

  });
});

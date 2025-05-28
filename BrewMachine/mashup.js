const { Servient } = require("@node-wot/core");
const HttpClientFactory = require("@node-wot/binding-http").HttpClientFactory;
const { fetch } = require("undici");

const servient = new Servient();
servient.addClientFactory(new HttpClientFactory());

async function fetchTD(url) {
  const res = await fetch(url);
  const text = await res.text();
  return JSON.parse(text);
}

const COFFEE_TYPES = ["espresso", "americano", "latte", "cappuccino"];

function getRandomCoffee() {
  return COFFEE_TYPES[Math.floor(Math.random() * COFFEE_TYPES.length)];
}

servient.start().then(async (WoT) => {
  const coffeeTD = await fetchTD("http://localhost:8888/coffeebrewingmachine");
  const musicTD = await fetchTD("http://localhost:8890/coffeemusicontroller");

  const coffeeMachine = await WoT.consume(coffeeTD);
  const musicController = await WoT.consume(musicTD);

  let lastBrewingState = false;

  setInterval(async () => {
    try {
      const brewingProp = await coffeeMachine.readProperty("brewing");
      const brewing = await brewingProp.value();

      if (!brewing && !lastBrewingState) {
        const coffeeType = getRandomCoffee();
        console.log(`No brewing in progress. Starting coffee: ${coffeeType}`);
        await coffeeMachine.invokeAction("brewCoffee", coffeeType);
      }

      if (brewing && !lastBrewingState) {
        console.log("Brewing just started. Activating music");
        await musicController.invokeAction("startBrewing");
      }

      lastBrewingState = brewing;
    } catch (error) {
      console.error("Mashup error:", error);
    }
  }, 1000);
});

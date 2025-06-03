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

  let isMusicPlaying = false;

  setInterval(async () => {
    try {
      const brewingProp = await coffeeMachine.readProperty("brewing");
      const isBrewingCoffee = await brewingProp.value();

      if (!isBrewingCoffee) {
        const coffeeType = getRandomCoffee();
        console.log(`Starting new coffee: ${coffeeType}`);
        await coffeeMachine.invokeAction("brewCoffee", coffeeType);
      }

      if (isBrewingCoffee && !isMusicPlaying) {
        console.log("Brewing detected. Playing music");
        await musicController.invokeAction("playMusic");
        isMusicPlaying = true;
      }
      
      if (!isBrewingCoffee) {
        isMusicPlaying = false;
      }
    } catch (error) {
      console.error("Mashup error:", error);
    }
  }, 5000);
});

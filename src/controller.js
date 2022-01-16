import { config } from "dotenv";
config();

import puppeteer from "puppeteer";
import { Patterns, receive } from "./comms.js";
import HAP from "hap-nodejs";

const { Accessory, Categories, Characteristic, Service, uuid } = HAP;

const HEADLESS_PORT = 6767;
const HEADLESS_URL = `http://localhost:${HEADLESS_PORT}/whistlee-headless/`;

const DEBUG = process.env.WHISTLEE_DEBUG === "true";

if (DEBUG) {
  console.info(
    `
Whistle Switch Env
==================

${Object.entries(process.env)
  .filter(([key]) => key.startsWith("WHISTLEE_"))
  .map(([key, value]) => `${key}: ${value}`)
  .join("\n")}
`
  );
}

const whistleeUuid = uuid.generate(process.env.WHISTLEE_SWITCH_ID);
const whistleeAccessory = new Accessory("Whistlee v0", whistleeUuid);

const callbacks = Object.entries(Patterns).reduce(
  (acc, [key, { name, pattern }], index) => {
    const switchService = new Service.StatelessProgrammableSwitch(
      `Whistlee ${name}`,
      key
    );

    switchService.getCharacteristic(Characteristic.Name).setValue(key);

    switchService
      .getCharacteristic(Characteristic.ServiceLabelIndex)
      .setValue(index + 1);

    whistleeAccessory.addService(switchService);

    acc[key] = () => {
      log("match:", { name, pattern });
      switchService
        .getCharacteristic(Characteristic.ProgrammableSwitchEvent)
        .sendEventNotification(
          Characteristic.ProgrammableSwitchEvent.SINGLE_PRESS
        );
    };
    return acc;
  },
  {}
);

// once everything is set up, we publish the accessory. Publish should always be the last step!
if (!DEBUG) {
  whistleeAccessory.publish({
    username: process.env.WHISTLEE_SWITCH_USERNAME,
    pincode: process.env.WHISTLEE_SWITCH_PIN,
    port: process.env.WHISTLEE_SWITCH_PORT,
    category: Categories.PROGRAMMABLE_SWITCH, // value here defines the symbol shown in the pairing screen
  });
}

const log = (...args) => console.log(new Date().toString(), "|", ...args);

(async () => {
  const browser = await puppeteer.launch({
    devtools: DEBUG,
    headless: !DEBUG,
    executablePath: process.env.CHROME_EXECUTABLE_PATH || undefined,
    args: ["--use-fake-ui-for-media-stream"],
    ignoreDefaultArgs: ["--mute-audio"],
  });
  const context = browser.defaultBrowserContext();
  await context.overridePermissions(HEADLESS_URL, ["microphone"]);

  const [page] = await browser.pages();

  page.on("console", (msg) => {
    const payload = msg.text();
    const message = receive(payload);

    if (message) {
      const [key] = message;
      callbacks[key]();
      return;
    }

    log(payload);
  });
  await page.goto(HEADLESS_URL);
  await page.mouse.move(0, 0);
  await page.mouse.move(100, 100);
  await page.click("#start");
})();

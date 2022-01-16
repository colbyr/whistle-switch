import { config } from "dotenv";
config();

import puppeteer from "puppeteer";
import { Patterns, receive } from "./comms.js";
import HAP from "hap-nodejs";

const { Accessory, Categories, Characteristic, Service, uuid } = HAP;

const envDefaults = {
  WHISTLE_SWITCH_CHROME_EXECUTABLE_PATH: undefined,
  WHISTLE_SWITCH_DEBUG: "false",
  WHISTLE_SWITCH_ID: "colbyr.whistle-switch.v1",
  WHISTLE_SWITCH_LISTENER_PORT: 6767,
  WHISTLE_SWITCH_USERNAME: "27:52:11:F5:BC:05",
  WHISTLE_SWITCH_PIN: "123-45-678",
  WHISTLE_SWITCH_PORT: 47130,
};

const Env = Object.entries(envDefaults).reduce((env, [key, defaultValue]) => {
  env[key] = process.env[key] ?? defaultValue;
  return env;
}, {});

const DEBUG = Env.WHISTLE_SWITCH_DEBUG === "true";

if (DEBUG) {
  console.info(
    `
Whistle Switch Env
==================

${Object.entries(Env)
  .map(([key, value]) => `${key}: ${value}`)
  .join("\n")}
`
  );
}

const {
  WHISTLE_SWITCH_CHROME_EXECUTABLE_PATH,
  WHISTLE_SWITCH_ID,
  WHISTLE_SWITCH_LISTENER_PORT,
  WHISTLE_SWITCH_PIN,
  WHISTLE_SWITCH_PORT,
  WHISTLE_SWITCH_USERNAME,
} = Env;

const WHISTLE_SWITCH_LISTENER_URL = `http://localhost:${WHISTLE_SWITCH_LISTENER_PORT}/whistle-switch-listener/`;

const whistleSwitchUuid = uuid.generate(WHISTLE_SWITCH_ID);
const whistleSwitchAccessory = new Accessory(
  "Whistle Switch v1",
  whistleSwitchUuid
);

const callbacks = Object.entries(Patterns).reduce(
  (acc, [key, { name, pattern }], index) => {
    const switchService = new Service.StatelessProgrammableSwitch(
      `Whistle Switch ${name}`,
      key
    );

    switchService.getCharacteristic(Characteristic.Name).setValue(key);

    switchService
      .getCharacteristic(Characteristic.ServiceLabelIndex)
      .setValue(index + 1);

    whistleSwitchAccessory.addService(switchService);

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
  whistleSwitchAccessory.publish({
    username: WHISTLE_SWITCH_USERNAME,
    pincode: WHISTLE_SWITCH_PIN,
    port: WHISTLE_SWITCH_PORT,
    category: Categories.PROGRAMMABLE_SWITCH, // value here defines the symbol shown in the pairing screen
  });
}

const log = (...args) => console.log(new Date().toString(), "|", ...args);

(async () => {
  const browser = await puppeteer.launch({
    devtools: DEBUG,
    headless: !DEBUG,
    executablePath: WHISTLE_SWITCH_CHROME_EXECUTABLE_PATH,
    args: ["--use-fake-ui-for-media-stream"],
    ignoreDefaultArgs: ["--mute-audio"],
  });
  const context = browser.defaultBrowserContext();
  await context.overridePermissions(WHISTLE_SWITCH_LISTENER_URL, [
    "microphone",
  ]);

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
  await page.goto(WHISTLE_SWITCH_LISTENER_URL);
  await page.mouse.move(0, 0);
  await page.mouse.move(100, 100);
  await page.click("#start");
})();

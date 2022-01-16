# The Whistle Switch

Control Homekit by whistling 🎶

I built this during my batch at [the Recurse Center](https://www.recurse.com/) in 2021.
I whistle a lot, and I wanted to put it to some constructive use!

## Setup

```sh
yarn global add whistle-switch
```

## Configuration

You'll find some default configs in `.env`.
The switch should work just fine with those configs.

```
WHISTLEE_DEBUG=false
WHISTLEE_SWITCH_ID=colbyr.whistle-switch.v1
WHISTLEE_SWITCH_USERNAME=27:52:11:F5:BC:05
WHISTLEE_SWITCH_PIN=123-45-678
WHISTLEE_SWITCH_PORT=47130
```

## Resetting the switch

If your whistle-switch gets into a bad state with your homekit setup, you can reset your install.

First off, change `WHISTLE_SWITCH_USERNAME` in your `.env` file to a new value.

Then remove the `persist` directory if it exists.

```sh
rm -rf persist
```

Start the switch again, and you should be able to connect to Homekit as a completely new accessory.

# Launch EmuDevz with Debug Port

In Steam, right-click **EmuDevz** → **Properties** → **Launch Options** and add:

```
--remote-debugging-port=9222
```

Then launch the game normally. This enables VS Code to communicate with the game.

> 💡 You only need to do this once — Steam remembers the setting.

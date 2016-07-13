# rnd7 ui
Minimalistic JavaScript user interface development library. Designed to be easy to use, flexible and efficient.
I wrote this lib as quick replacement for dat.GUI. I primarily use it to modify variable values of my Simulation, Visualization and GFX Prototypes.
It was inspired by the way you manage user interaction with the Meteor framework and the way you bind key combinations and sequences with Mousetrap.
At this point the rnd7 ui repo contains two independent libs. The keyboard and the gui library. You can use them independently, if you like to.
In earlier versions of the gui lib Mousetrap was required to register keyboard event callbacks. By now the rnd7 keyboard lib is preferred.
Compatibility and smooth intergration with the Electron Framework was a major prerequisite. Since I use it frequently to create Desktop Apps.

## rnd7 keyboard
The keyboard lib lets you register callbacks for keyboard event combinations or sequences, without worrying about browser specific characteristics or down and press states.

* [rnd7 keyboard](https://github.com/rnd7/ui/lib/keyboard.js)

## rnd7 gui
Use the gui lib to bind your html5 form to your data model. You might combine it with rnd7 keyboard to provide keyboard shortcuts.

* [rnd7 gui](https://github.com/rnd7/ui/lib/gui.js)

## download
You can download the latest release minified and ready to use.

* [rnd7 keyboard](https://github.com/rnd7/ui/bin/keyboard.min.js)
* [rnd7 gui](https://github.com/rnd7/ui/bin/gui.min.js)
* [rnd7 gui & keyboard](https://github.com/rnd7/ui/bin/ui.min.js)

## build
You can build this libraries automatically using Grunt.

## License
This project is licensed under the MIT License - see the [LICENSE](LICENSE.md) file for details.

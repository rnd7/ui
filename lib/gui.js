/**
 * @module gui
 * @author rnd7
 */
(function(document, window, bindKeyboard, unbindKeyboard) {

  var UPDATE_EVENT = "update";

  /**
   * Bind HTML Elements
   * @function module:gui.bind
   * @example
   * gui.bind({
   *  '#someId': {
   *    command: {
   *      "SHIFT+c": gui.THRU,
   *    },
   *    init: function() {
   *      console.log("init", this);
   *      this.title = "SHIFT+C";
   *    },
   *    process: function(ev) {
   *      console.log("process", this, ev);
   *      return true // invokes update method
   *    },
   *    update: function() {
   *      console.log("update", this);
   *    }
   *  }
   *});
   *
   * @param {object} bindings - object keys used as element selectors
   */
  function bind(bindings) {
    for (var selector in bindings) {
      var binding = bindings[selector];
      var elems = Array.prototype.slice.call(
        document.querySelectorAll(selector)
      );
      elems.forEach(function(elem){
        var process = binding.process;
        var update = binding.update;
        var init = binding.init;
        if (process instanceof Function) {
          function _update(ev){
            // invoke process followed by update if process return true
            if(process.call(elem, ev)) update.call(elem);
          }
          if (/^button$|^a$|^div$/.test( elem.tagName.toLowerCase())) {
            elem.addEventListener('click', _update)
          }else{
            elem.addEventListener('change', _update)
          }
        }
        if (update instanceof Function) {
          // forced update
          elem.addEventListener(UPDATE_EVENT, function(ev){
            update.call(elem, ev)
          })
        }
        if (bindKeyboard && binding.hasOwnProperty("command")) {
          for(var command in binding.command) {
            (function(){
              var callback = binding.command[command];
              bindKeyboard(command, function(ev) {
                if(callback instanceof Function) callback.call(elem, ev);
                if(process instanceof Function) process.call(elem, ev);
                if(update instanceof Function) update.call(elem);
                return false;
              });
            }())
          }
        }
        if (binding.init instanceof Function) binding.init.call(elem);
        if (binding.update instanceof Function) binding.update.call(elem);
      })
    }
  }

  /**
   * Unbind HTML Elements
   * @function module:gui.unbind
   * @param {object} bindings - jQuery style selectors
   */
  function unbind(bindings) {
    for (var selector in bindings) {
      binding = bindings[selector];
      var elems = Array.prototype.slice.call(
        document.querySelectorAll(selector)
      );
      elems.forEach(function(elem){
        elem.removeEventListener('change');
        elem.removeEventListener('click');
        elem.removeEventListener(UPDATE_EVENT);
        if (unbindKeyboard && binding.hasOwnProperty("command")) {
          for(var command in binding.command) {
            unbindKeyboard(command);
          }
        }
      });
    }
  }

  /**
   * Force Update. Will trigger the update method of all matched elements.
   * @function module:gui.update
   * @param {string} selector - jQuery style selectors
   */
  function update(selector) {
    var elems = Array.prototype.slice.call(
      document.querySelectorAll(selector)
    );
    elems.forEach(function(elem){
      elem.dispatchEvent(new Event("update"));
    });
  }

  var gui = {
    bind: bind,
    unbind: unbind,
    update: update,
    THRU: function(ev) { return true },
    TERMINATE: function(ev) { ev.preventDefault(); return false; }
  }

  if ( typeof module !== "undefined" && module.exports ) {
    module.exports = gui; // NPM/Node
  } else if ( typeof define === 'function' && define.amd ) {
    /** @exports gui */
    define(function(){return gui;}); // AMD/requirejs
  } else {
    window.gui = gui; // Browser
  }
})(
  document,
  window,
  keyboard.bind || Mousetrap.bind || keyboardJS.bind || keymage || key,
  keyboard.unbind || Mousetrap.unbind || keyboardJS.unbind
)

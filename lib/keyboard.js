/**
* Module to register and handle Keyboard Event combinations and sequences
* @module keyboard
* @author rnd7
* @license MIT
**/
(function( document, window ) {

  /**
   * Variable used to change parser behavior
   * @var {boolean} module:keyboard.caseSensitive
   * @default false
   **/
  var caseSensitive = false;

  /**
   * Time to wait before sequence reset in milliseconds
   * @var {number} module:keyboard.sequenceTimeout
   * @default 400
   **/
  var sequenceTimeout = 400;

  var map = {};
  var pointer = map;
  var timeoutId;
  var modifier = {
    SHIFT: false,
    CTRL: false,
    ALT: false,
    META: false
  };

  /**
   * Tokens used by the Grammar
   * @private
   **/
  var TOKEN = {
    START: "START",
    CHAIN: "CHAIN",
    SEQUENCE: "SEQUENCE",
    ALIAS: "ALIAS",
    MODIFIER: "MODIFIER",
    SPECIAL: "SPECIAL",
    KEY: "KEY",
    TERMINAL: "TERMINAL"
  }

  /**
   * Available Capture states used by the consume function.
   * @private
   **/
  var CAPTURE = {
    DOWN: "DOWN",
    PRESS: "PRESS",
  }

  /**
   * All supported lexemes including the parser patterns and capture states.
   * Lexemes are grouped using the defined tokens.
   * @private
   **/
  var LEXEME = {
    // operator
    CHAIN: {
      token:TOKEN.CHAIN,
      pattern:["+"]
    },
    SEQUENCE: {
      token:TOKEN.SEQUENCE,
      pattern:[","]
    },
    ALIAS: {
      token:TOKEN.ALIAS,
      pattern:[" "]
    },
    // mofifier
    META: {
      token: TOKEN.MODIFIER,
      pattern: ["META", "CMD", "COMMAND", "APPLE", "WINDOWS"],
      charCode: [91, 93, 224],
      capture: CAPTURE.DOWN
    },
    ALT: {
      token: TOKEN.MODIFIER,
      pattern: ["ALT", "OPT", "OPTION", "ALTGR", "ALTERNATIVE"],
      charCode: [18],
      capture: CAPTURE.DOWN
    },
    CTRL: {
      token: TOKEN.MODIFIER,
      pattern: ["CTRL", "CONTROL"],
      charCode: [17],
      capture: CAPTURE.DOWN
    },
    SHIFT: {
      token: TOKEN.MODIFIER,
      pattern: ["SHIFT", "UPPERCASE"],
      charCode: [16],
      capture: CAPTURE.DOWN
    },
    // special
    LEFT: {
      token: TOKEN.SPECIAL,
      pattern: ["LEFT"],
      charCode: [37],
      capture: CAPTURE.DOWN
    },
    RIGHT: {
      token: TOKEN.SPECIAL,
      pattern: ["RIGHT"],
      charCode: [39],
      capture: CAPTURE.DOWN
    },
    UP: {
      token: TOKEN.SPECIAL,
      pattern: ["UP"],
      charCode: [38],
      capture: CAPTURE.DOWN
    },
    DOWN: {
      token: TOKEN.SPECIAL,
      pattern: ["DOWN"],
      charCode: [40],
      capture: CAPTURE.DOWN
    },
    BACKSPACE: {
      token: TOKEN.SPECIAL,
      pattern: ["BACKSPACE", "BACK"],
      charCode: [8],
      capture: CAPTURE.DOWN
    },
    TAB: {
      token: TOKEN.SPECIAL,
      pattern: ["TAB", "TABULATOR"],
      charCode: [9],
      capture: CAPTURE.DOWN
    },
    ENTER: {
      token: TOKEN.SPECIAL,
      pattern: ["ENTER", "RETURN", "RET", "ENT"],
      charCode: [13],
      key: "ENTER",
      capture: CAPTURE.DOWN
    },
    CAPSLOCK: {
      token: TOKEN.SPECIAL,
      pattern: ["CAPS", "CAPSLOCK"],
      charCode: [20],
      capture: CAPTURE.DOWN
    },
    ESCAPE: {
      token: TOKEN.SPECIAL,
      pattern: ["ESC", "ESCAPE"],
      charCode: [27],
      capture: CAPTURE.DOWN
    },
    PAGEUP: {
      token: TOKEN.SPECIAL,
      pattern: ["PGUP", "PAGEUP"],
      charCode: [33],
      capture: CAPTURE.DOWN
    },
    PAGEDOWN: {
      token: TOKEN.SPECIAL,
      pattern: ["PGDOWN", "PAGEDOWN"],
      charCode: [34],
      capture: CAPTURE.DOWN
    },
    END: {
      token: TOKEN.SPECIAL,
      pattern: ["END"],
      charCode: [35],
      capture: CAPTURE.DOWN
    },
    HOME: {
      token: TOKEN.SPECIAL,
      pattern: ["HOME"],
      charCode: [36],
      capture: CAPTURE.DOWN
    },
    INSERT: {
      token: TOKEN.SPECIAL,
      pattern: ["INSERT", "INS"],
      charCode: [45],
      capture: CAPTURE.DOWN
    },
    DELETE: {
      token: TOKEN.SPECIAL,
      pattern: ["DEL", "DELETE"],
      charCode: [46],
      capture: CAPTURE.DOWN
    },
    // reserverd replacement
    PLUS:{
      token: TOKEN.SPECIAL,
      pattern: ["PLUS", "ADD"],
      charCode: [43],
      capture: CAPTURE.PRESS
    },
    COMMA: {
      token: TOKEN.SPECIAL,
      pattern: ["COMMA"],
      charCode: [188],
      capture: CAPTURE.PRESS
    },
    SPACE: {
      token: TOKEN.SPECIAL,
      pattern: ["SPACE"],
      charCode: [32],
      capture: CAPTURE.DOWN
    },
    // Generic
    KEY: {
      token: TOKEN.KEY,
      pattern: [/.{1,1}/],
      capture: CAPTURE.PRESS
    },
  }

  for(var k in LEXEME) LEXEME[k].name = k; // add names for convenience

  // Lookup Tables
  var TOKEN_LOOKUP = {}; // tokens mapped to lexemes
  var MODIFIER_LOOKUP = {};
  var SPECIAL_LOOKUP = {};
  var DOWN_LOOKUP = {}; // charCodes captured at down states

  // populate lookup tables
  for(var k in LEXEME){
    var lexeme = LEXEME[k];
    if(!TOKEN_LOOKUP[lexeme.token]) TOKEN_LOOKUP[lexeme.token] = [];
    TOKEN_LOOKUP[lexeme.token].push(lexeme.name);
    for(var i in lexeme.charCode){
      var charCode = lexeme.charCode[i];
      if(lexeme.token === TOKEN.MODIFIER)
        MODIFIER_LOOKUP[charCode] = lexeme.name;
      else if(lexeme.token === TOKEN.SPECIAL)
        SPECIAL_LOOKUP[charCode] = lexeme.name;
      if(lexeme.capture === CAPTURE.DOWN)
        DOWN_LOOKUP[charCode] = lexeme.name;
    }
  }

  /**
   * Grammar. Defines which token may follow it's predecessor
   * @private
   **/
  var GRAMMAR = {};
  GRAMMAR[TOKEN.START] = [TOKEN.MODIFIER, TOKEN.SPECIAL, TOKEN.KEY];
  GRAMMAR[TOKEN.MODIFIER] = [
    TOKEN.CHAIN, TOKEN.SEQUENCE, TOKEN.ALIAS, TOKEN.TERMINAL
  ];
  GRAMMAR[TOKEN.KEY] = [TOKEN.SEQUENCE, TOKEN.ALIAS, TOKEN.TERMINAL];
  GRAMMAR[TOKEN.SPECIAL] = [TOKEN.SEQUENCE, TOKEN.ALIAS, TOKEN.TERMINAL];
  GRAMMAR[TOKEN.CHAIN] = [TOKEN.MODIFIER, TOKEN.SPECIAL, TOKEN.KEY];
  GRAMMAR[TOKEN.SEQUENCE] = [TOKEN.MODIFIER, TOKEN.SPECIAL, TOKEN.KEY];
  GRAMMAR[TOKEN.ALIAS] = [TOKEN.MODIFIER, TOKEN.SPECIAL, TOKEN.KEY];
  GRAMMAR[TOKEN.TERMINAL] = []

  /**
   * Parses a keyboard command combination string
   * @private
   * @function parse
   * @param {string} str - Any String that matches the Grammar. (ie. "ctrl+a")
   * @throws {Error} Throws errors during parsing.
   * @returns {Array} An array containing all parsed tokens
   */
  function parse(str) {
    var expect = GRAMMAR[TOKEN.START]; // Start Point
    var index = 0; // Current position
    var strLen = str.length;
    var ts = []; // resulting token stream
    /** invoked by next function each time a expression is parsed corretly */
    function push(lexeme, length) {
      expect = GRAMMAR[lexeme.token]; // tokens that might follow the expression
      ts.push({
        lexeme: lexeme.name,
        token: lexeme.token,
        index: index,
        length: length,
        value: str.substr(index, length)
      })
      index += length;
      next(); // recursion
    }
    /** increments through string to parse expression according to grammar */
    function next(){
      var eIndex = 0, tIndex = 0, lIndex = 0, expectLen = expect.length;
      if(!expectLen) return; // no expectations, cancel parsing
      for (eIndex in expect) {
        var token = expect[eIndex];
        for (tIndex in TOKEN_LOOKUP[token]) {
          var lexeme = LEXEME[TOKEN_LOOKUP[token][tIndex]];
          for (lIndex in lexeme.pattern) {
            var pattern = lexeme.pattern[lIndex];
            if (typeof pattern === "string") {
              // pattern is of type string. Length is fixed.
              var patternLen = pattern.length;
              var subStr = str.substr(index, patternLen);
              // if not in caseSensitive mode make all strings uppercase
              if (!caseSensitive) subStr = subStr.toUpperCase();
              if (subStr === pattern) return push(lexeme, patternLen);
            } else if (pattern instanceof RegExp) {
              // pattern is an instance of RegExp. Length is variable.
              var readAhead = 0;
              while (readAhead<strLen-index) {
                // read until pattern found or end of string reached
                readAhead++;
                var subStr = str.substr(index, readAhead);
                if (pattern.test(subStr)) return push(lexeme, readAhead);
              }
            }
          }
        }
      }
      // error reporting
      if (index<strLen) {
        var eStr = str.substr(0, index)+
          "["+ str.substr(index,1)+"]"+
          str.substr(index+1);
        throw new Error(
          "Error parsing \""+str+"\". \n"+
          "Illegal Expression after char \""+str.substr(index-1,1)+
          "\" ("+index+"/"+strLen+"). \n"+
          "Expected one of ["+ expect.join(", ") +"]. \n"+
          "Error at \""+eStr+"\"."
        );
      } else if (expect.indexOf(TOKEN.TERMINAL)<0) {
        throw new Error(
          "Can not parse  \""+str+"\". \n"+
          "Statement not complete. Missing Expression. \n"+
          "Expected one of ["+ expect.join(", ") +"]."
        );
      }

    }
    next(); // begin parsing
    if (expect.indexOf(TOKEN.TERMINAL)!=-1) ts.push({token: TOKEN.TERMINAL});
    return ts;
  }

  /**
   * Creates a fixed order modifier string followed by the key given
   * @private
   * @function makeHash
   * @param {object} mod - An object that might contain modifiers keys with
   * boolean values.
   * @param {string} key - An unicode String representing a char
   * @returns {string} A hash to use in lookup tables
   */
  function makeHash(mod, key) {
    var hash = []
    if (mod.SHIFT) hash.push(LEXEME.SHIFT.name);
    if (mod.CTRL) hash.push(LEXEME.CTRL.name);
    if (mod.ALT) hash.push(LEXEME.ALT.name);
    if (mod.META) hash.push(LEXEME.META.name);
    if (key) hash.push(key);
    return hash.join("+")
  }

  /**
   * Binds a key combination to a callback function.
   * Supports unicode characters as well as modifier key combinations.
   * @function module:keyboard.bind
   * @param {string} str - A valid modifier character combination
   * @param {Function} callback - The callback method that shall be invoked if
   * the key combination is recognized
   * @example
   * keyboard.bind(
   *   "SHIFT+ALT+a",
   *   function(ev) {
   *     console.log(ev)
   *   }
   * );
   */
  function bind(str, callback) {
    var ts = parse(str);
    var pointer = map;
    var mod = {}
    var key = "";
    for (var i in ts) {
      var token = ts[i];
      if (token.token === TOKEN.KEY) {
        key = token.value;
      } else if (token.token === TOKEN.SPECIAL) {
        key = token.lexeme;
      } else if (token.token === TOKEN.MODIFIER) {
        mod[token.lexeme] = true;
      }
      if (token.token === TOKEN.SEQUENCE) {
        var hash = makeHash(mod, key)
        pointer[hash] = pointer[hash] || {};
        pointer = pointer[hash]
        mod  = {};
        key = "";
      } else if (token.token === TOKEN.ALIAS){
        pointer[makeHash(mod, key)] = callback;
        pointer = map;
        mod  = {};
        key = "";
      } else if (token.token === TOKEN.TERMINAL) {
        pointer[makeHash(mod, key)] = callback;
      }
    }
  }

  /**
   * Unbind a key combination
   * @function module:keyboard.unbind
   * @param {string} str - The String used to bind a combination
   * @example
   * unbind("SHIFT+ALT+x");
   */
  function unbind(str) {
    var ts = parse(str);
    var pointer = map;
    var mod = {}
    var key = "";
    for (var i in ts) {
      var token = ts[i];
      if (token.token === TOKEN.KEY) {
        key = token.value;
      } else if (token.token === TOKEN.SPECIAL) {
        key = token.lexeme;
      } else if (token.token === TOKEN.MODIFIER) {
        mod[token.lexeme] = true;
      }
      if (token.token === TOKEN.SEQUENCE) {
        var hash = makeHash(mod, key)
        pointer = pointer[hash]
        mod  = {};
        key = "";
      } else if (token.token === TOKEN.ALIAS){
        delete pointer[makeHash(mod, key)];
        pointer = map;
        mod  = {};
        key = "";
      } else if (token.token === TOKEN.TERMINAL) {
        delete pointer[makeHash(mod, key)];
      }
    }
  }

  /**
   * Returns the charCode by interpreting the event given
   * @private
   * @function getCharCode
   * @param {KeyboardEvent} ev - Any keyboard event
   * @return {number} The corresponding charCode
   */
  function getCharCode(ev) {
    return (typeof ev.which !== 'number') ? ev.keyCode : ev.which;
  }

  /**
   * Resets the global modifier object
   * @private
   * @function reset
   */
  function reset(){
    modifier.SHIFT = false;
    modifier.CTRL = false;
    modifier.ALT = false;
    modifier.META = false;
  }

  var ignore = [
    "color", "date", "datetime", "datetime-local", "email", "file", "month",
    "number", "password", "search", "tel", "text", "time", "url", "week"
  ]
  /**
   * Handles all kind of KeyboardEvents and manages browser specific behavior
   * @private
   * @function consume
   * @param {KeyboardEvent} ev - Any KeyboardEvent
   * @returns {Boolean} Returns false to supress further event execution when
   * default is prevented
   */
  function consume(ev){
    var n = ev.target.nodeName.toLowerCase();
    var t = (ev.target.type)?ev.target.type.toLowerCase():null;
    // leaves if type is text input or textarea
    if((n === "input" && ignore.indexOf(t) != -1) || n === "textarea") return;
    // continue on valid event target
    var charCode = getCharCode(ev);
    var shiftRestore = false;
    // manage modifiers
    if(MODIFIER_LOOKUP.hasOwnProperty(charCode)){
      if(ev.type === "keydown"){
        modifier[MODIFIER_LOOKUP[charCode]] = true;
      }else if(ev.type === "keyup"){
        modifier[MODIFIER_LOOKUP[charCode]] = false;
      }
      ev.preventDefault();
    }
    modifier.SHIFT = modifier.SHIFT || ev.shiftKey;
    modifier.ALT = modifier.ALT || ev.altKey;
    modifier.CTRL = modifier.CTRL || ev.ctrlKey;
    modifier.META = modifier.META || ev.metaKey;
    // get key
    var key = "";
    if (ev.type === "keydown") {
      if (DOWN_LOOKUP.hasOwnProperty(charCode)) {
        if (SPECIAL_LOOKUP.hasOwnProperty(charCode)) {
          key = SPECIAL_LOOKUP[charCode];
        }
      } else if (modifier.SHIFT) {
        // When modifier SHIFT is pressed try to resolve lowercase charCode
        key = String.fromCharCode(charCode).toLowerCase();
      }
    } else if (ev.type === "keypress") {
      // keys not processed during down phase are converted to unicode strings
      key = String.fromCharCode(charCode);
      // dropping shift modifier
      shiftRestore = modifier.SHIFT;
      modifier.SHIFT = false;
    }
    // resolve
    if (timeoutId) timeoutId = clearTimeout(timeoutId);
    var hash = makeHash(modifier, key);
    if (hash) {
      if (ev.type === "keypress" &&  !pointer.hasOwnProperty(hash))
        pointer = map;
      if (pointer.hasOwnProperty(hash)) {
        pointer = pointer[hash]
        if (typeof pointer === "function") {
          pointer(ev);
          pointer = map;
        } else {
          timeoutId = setTimeout(
            function() {
              pointer = map;
            },
            sequenceTimeout
          )
        }
        ev.preventDefault();
      }
    }
    modifier.SHIFT = shiftRestore || modifier.SHIFT; // restoring shift modifier
    if (ev.defaultPrevented) return false;
  }

  /**
   * Initializes the EventListeners
   * @private
   * @function init
   */
  function init() {
    document.addEventListener("keydown", consume);
    document.addEventListener("keypress", consume);
    document.addEventListener("keyup", consume);
    window.addEventListener("blur", reset);
    window.addEventListener("focus", reset);
  }

  init(); // kick it

  /**
   * Exported functions
   * @mixin
   */
  var keyboard = {
    bind: bind,
    unbind: unbind
  }

  if ( typeof module !== "undefined" && module.exports ) {
    module.exports = keyboard; // NPM/Node
  } else if ( typeof define === 'function' && define.amd ) {
    /** @exports keyboard */
    define(function(){return keyboard;}); // AMD/requirejs
  } else {
    window.keyboard = keyboard; // Browser
  }
})( document, window )

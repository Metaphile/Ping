var ENGINE = (function (my) {
	'use strict';
	
	var Keyboard = function (domNode) {
		var that = this;
		
		// when a key autorepeats, the keydown event fires repeatedly with no corresponding keyup event
		// while that makes a certain kind of sense, it's mostly just a pain in the ass
		var pressed = {};
		
		that.keyDown = my.streamify(function (event) {
			if (!pressed[event.which]) {
				pressed[event.which] = true;
				return event.which;
			}
		});
		
		that.keyUp   = my.streamify(function (event) {
			pressed[event.which] = false;
			return event.which;
		});
		
		domNode.addEventListener('keydown', that.keyDown);
		domNode.addEventListener('keyup',   that.keyUp);
	};
	
	Keyboard.keys = {
		shift: 16, control: 17, option: 18, leftCommand: 91, rightCommand: 93,
		enter: 13, esc: 27
	};
	
	Keyboard.modifiers = [
		Keyboard.keys.shift,
		Keyboard.keys.control,
		Keyboard.keys.option,
		Keyboard.keys.leftCommand,
		Keyboard.keys.rightCommand
	];
	
	my.Keyboard = Keyboard;
	return my;
}(ENGINE || {}));

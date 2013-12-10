var ENGINE = (function (my) {
	'use strict';
	
	function Gamepad(index) {
		var that = this;
		var DEADZONE_RADIUS = 0.2;
		
		var previousState = {
			buttons: [0, 0, 0, 0, 0, 0, 0, 0],
			axes:    [0, 0, 0, 0]
		};
		
		function saveState(state) {
			for (var i = 0, n = state.buttons.length; i < n; i++) {
				previousState.buttons[i] = state.buttons[i];
			}
			
			for (var i = 0, n = state.axes.length; i < n; i++) {
				previousState.axes[i] = state.axes[i];
			}
		}
		
		function announceChanges(previousState, currentState) {
			// buttons
			for (var i = 0, n = currentState.buttons.length; i < n; i++) {
				if (currentState.buttons[i] !== previousState.buttons[i]) {
					if (currentState.buttons[i] === 1) {
						that.buttonDown(i);
					} else {
						that.buttonUp(i);
					}
				}
			}
			
			var sticks = Gamepad.thumbsticks;
			
			that.leftStick({
				x: Math.abs(currentState.axes[sticks.left.x]) > DEADZONE_RADIUS ? currentState.axes[sticks.left.x] : 0,
				y: Math.abs(currentState.axes[sticks.left.y]) > DEADZONE_RADIUS ? currentState.axes[sticks.left.y] : 0
			});
			
			that.rightStick({
				x: Math.abs(currentState.axes[sticks.right.x]) > DEADZONE_RADIUS ? currentState.axes[sticks.right.x] : 0,
				y: Math.abs(currentState.axes[sticks.right.y]) > DEADZONE_RADIUS ? currentState.axes[sticks.right.y] : 0
			});
		}
		
		that.buttonDown  = my.streamify();
		that.buttonUp    = my.streamify();
		that.leftStick   = my.streamify();
		that.rightStick  = my.streamify();
		
		// initialize streams
		that.leftStick({ x: 0, y: 0 });
		that.rightStick({ x: 0, y: 0 });
		
		// don't choke in browsers that don't implement webkitGetGamepads
		navigator.webkitGetGamepads = navigator.webkitGetGamepads || function () { return { buttons: [], axes: [] }; };
		
		that.poll = function () {
			var state = navigator.webkitGetGamepads()[index];
			
			if (state) {
				announceChanges(previousState, state);
				saveState(state);
			}
		};
	}
	
	Gamepad.buttons = {
		a: 0, b: 1, x: 2, y: 3,
		leftBumper: 4, rightBumper: 5,
		back: 8, start: 9,
		leftStick: 10, rightStick: 11,
		guide: 16
	};
	
	Gamepad.triggers = {
		left: 6, right: 7
	};
	
	Gamepad.thumbsticks = {
		left: {
			x: 0, y: 1
		},
		right: {
			x: 2, y: 3
		}
	};
	
	my.Gamepad = Gamepad;
	return my;
}(ENGINE || {}));

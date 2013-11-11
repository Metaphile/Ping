var ENGINE = (function () {
	'use strict';
	
	var exports = {};
	
	// true prototypal inheritance
	// http://javascript.crockford.com/prototypal.html
	Object.create = function (o) {
		function F() {}
		F.prototype = o;
		return new F();
	};
	
	// clear a possibly transformed canvas
	// http://stackoverflow.com/a/9722502/40356
	CanvasRenderingContext2D.prototype.clear = function () {
		this.save();
		this.setTransform(1, 0, 0, 1, 0, 0);
		this.clearRect(0, 0, this.canvas.width, this.canvas.height);
		this.restore();
	};
	
	Math.randRange = function (min, max) {
		return min + (Math.random() * (max - min));
	};
	
	Audio.prototype.replay = function () {
		// sooo temp
		// don't play sounds if mute is checked
		if (document.getElementById('mute').checked) return;
		
		this.pause();
		this.currentTime = 0;
		this.play();
	};
	
	// http://stackoverflow.com/q/2901102/40356
	// does not work reliably with floats!
	Number.prototype.withCommas = function numberWithCommas(x) {
		return this.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
	};
	
	exports.noop = function () {};
	
	exports.streamify = (function () {
		function identity(x) { return x; }
		
		function streamify(f) {
			// looks like a stream; don't rewrap
			if (f && 'merge' in f && 'then' in f) return f;
			
			f = f || identity;
			var children = [];
			
			function stream(/* ... */) {
				var value = f.apply(f, arguments);
				
				if (typeof value !== 'undefined') {
					for (var i = 0, n = children.length; i < n; i++) children[i](value);
					
					// save for later
					stream.value = value;
					
					return value;
				}
			}
			
			stream.then = function (g) {
				g = streamify(g);
				children.push(g);
				return g;
			};
			
			stream.merge = function (g, operator) {
				g = streamify(g);
				operator = operator || identity;
				var merged = streamify();
				
				stream.then(function (value) { return operator(value, g.value); }).then(merged);
				g.then(function (value) { return operator(value, stream.value); }).then(merged);
				
				return merged;
			};
			
			return stream;
		}
		
		return streamify;
	}());
	
	exports.Keyboard = (function () {
		var Keyboard = function (domNode) {
			var that = this;
			
			// when a key autorepeats, the keydown event fires repeatedly with no corresponding keyup event
			// while that makes a certain kind of sense, it's mostly just a pain in the ass
			var pressed = {};
			
			that.keyDown = exports.streamify(function (event) {
				if (!pressed[event.which]) {
					pressed[event.which] = true;
					return event.which;
				}
			});
			
			that.keyUp   = exports.streamify(function (event) {
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
		
		return Keyboard;
	}());
	
	exports.Mouse = function (domNode) {
		var that = this;
		
		that.move = exports.streamify(function (event) { return { x: event.offsetX, y: event.offsetY }; });
		
		domNode.addEventListener('mousemove', that.move);
	};
	
	exports.Gamepad = (function () {
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
			
			that.buttonDown  = exports.streamify();
			that.buttonUp    = exports.streamify();
			that.leftStick   = exports.streamify();
			that.rightStick  = exports.streamify();
			
			// initialize streams
			that.leftStick({ x: 0, y: 0 });
			that.rightStick({ x: 0, y: 0 });
			
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
		
		return Gamepad;
	}());
	
	exports.Vector2 = function (x, y) {
		var that = this;
		
		that.x = x || 0;
		that.y = y || 0;
		
		that.inverse = function () {
			return new exports.Vector2(-that.x, -that.y);
		};
		
		that.add = function (vector) {
			that.x += vector.x;
			that.y += vector.y;
		};
		
		that.sum = function (vector) {
			return new exports.Vector2(that.x + vector.x, that.y + vector.y);
		};
		
		that.length = function () {
			return Math.sqrt(that.x*that.x + that.y*that.y);
		};
		
		that.angle = function () {
			return Math.atan2(that.y, that.x);
		};
		
		that.difference = function (vector) {
			return new exports.Vector2(that.x-vector.x, that.y-vector.y);
		};
		
		that.dot = function (vector) {
			return that.x*vector.x + that.y*vector.y;
		};
		
		that.normalized = function () {
			var length = that.length();
			if (length === 0) return new exports.Vector2(0, 0);
			else return new exports.Vector2(that.x / length, that.y / length);
		};
		
		that.scaled = function (scalar) {
			return new exports.Vector2(that.x*scalar, that.y*scalar);
		};
		
		that.reflected = function (normal) {
			return that.difference(normal.scaled(2 * that.dot(normal)));
		};
		
		// useful for debugging
		that.draw = function (ctx, fromX, fromY) {
			fromX = fromX || 0;
			fromY = fromY || 0;
			var toX = fromX + that.x;
			var toY = fromY + that.y;
			
			if (that.length() == 0) return;
			
			ctx.beginPath();
			
			// arrow body
			ctx.moveTo(fromX, fromY);
			ctx.lineTo(toX, toY);
			
			// arrow head
			var HEAD_SIZE = 16;
			var HEAD_POINTINESS = Math.PI/6;
			var vectorAngle = that.angle();
			ctx.moveTo(toX, toY);
			ctx.lineTo(toX - HEAD_SIZE*Math.cos(vectorAngle - HEAD_POINTINESS), toY - HEAD_SIZE*Math.sin(vectorAngle - HEAD_POINTINESS));
			ctx.moveTo(toX, toY);
			ctx.lineTo(toX - HEAD_SIZE*Math.cos(vectorAngle + HEAD_POINTINESS), toY - HEAD_SIZE*Math.sin(vectorAngle + HEAD_POINTINESS));
			
			ctx.lineWidth = 4;
			ctx.strokeStyle = 'darkorange';
			ctx.stroke();
		};
	};
	
	// axis-aligned bounding box
	exports.AABB = function () {
		var that = this;
		
		that.left   = 0;
		that.right  = 1;
		that.top    = 0;
		that.bottom = 1;
		
		// if line segments A and B are overlapping, return the 1-dimensional vector that will most efficiently clear A from B
		// otherwise return false
		function escapeVector(a1, a2, b1, b2) {
			// get the center points
			var ac = (a1 + a2) / 2;
			var bc = (b1 + b2) / 2;
			
			// get the "radii"
			var ar = (a2 - a1) / 2;
			var br = (b2 - b1) / 2;
			
			// get the difference between the center points
			var d = bc - ac;
			
			// if the distance between the center points is greater than the sum of the radii, the line segments are not touching
			var dm = Math.abs(d);
			if (dm > ar + br) return false;
			
			// get the normalized difference between the center points
			// if the difference is 0, default to 1
			var dn = (dm != 0 ? d / dm : 1);
			
			// return the difference scaled to the amount of overlap
			return dn * (dm - (ar + br));
		}
		
		that.test = function (other) {
			var xev = escapeVector(that.left, that.right,  other.left, other.right);
			var yev = escapeVector(that.top,  that.bottom, other.top,  other.bottom);
			// no collision
			if (xev === false || yev === false) return false;
			
			if (Math.abs(xev) < Math.abs(yev)) yev = 0;
			else xev = 0;
			
			// ADD this vector to That's position to clear it from Other
			return new exports.Vector2(xev, yev);
		};
		
		that.draw = function (ctx) {
			ctx.beginPath();
			
			ctx.rect(that.left, that.top, that.right-that.left, that.bottom-that.top);
			
			ctx.lineWidth = 2;
			ctx.strokeStyle = 'red';
			ctx.stroke();
		};
	};
	
	return exports;
}());

var ENGINE = (function () {
	'use strict';
	
	var exports = {};
	
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
			if (f && 'or' in f && 'then' in f) return f;
			
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
			
			stream.or = function (g, operator) {
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
		
		that.move = exports.streamify(function (event) {
			if ('offsetX' in event) return { x: event.offsetX, y: event.offsetY };
			// Firefox
			else return { x: event.layerX, y: event.layerY };
		});
		
		that.down = exports.streamify();
		
		domNode.addEventListener('mousemove', that.move);
		domNode.addEventListener('mousedown', that.down);
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
		
		return Gamepad;
	}());
	
	exports.Vector2 = (function () {
		function Vector2(x, y) {
			this.x = x || 0;
			this.y = y || 0;
		}
		
		Vector2.prototype.inverted = function () {
			return new Vector2(-this.x, -this.y);
		};
		
		Vector2.prototype.add = function (vector) {
			this.x += vector.x;
			this.y += vector.y;
		};
		
		Vector2.prototype.length = function () {
			return Math.sqrt(this.x*this.x + this.y*this.y);
		};
		
		Vector2.prototype.angle = function () {
			return Math.atan2(this.y, this.x);
		};
		
		Vector2.prototype.difference = function (vector) {
			return new Vector2(this.x - vector.x, this.y - vector.y);
		};
		
		Vector2.prototype.dot = function (vector) {
			return this.x*vector.x + this.y*vector.y;
		};
		
		Vector2.prototype.normalized = function () {
			var length = this.length();
			if (length === 0) return new Vector2(0, 0);
			else return new Vector2(this.x / length, this.y / length);
		};
		
		Vector2.prototype.multipliedBy = function (scalar) {
			return new Vector2(this.x * scalar, this.y * scalar);
		};
		
		Vector2.prototype.reflectedAbout = function (normal) {
			return this.difference(normal.multipliedBy(2 * this.dot(normal)));
		};
		
		// useful for debugging
		Vector2.prototype.draw = function (ctx, fromX, fromY) {
			fromX = fromX || 0;
			fromY = fromY || 0;
			var toX = fromX + this.x;
			var toY = fromY + this.y;
			
			if (this.length() == 0) return;
			
			ctx.beginPath();
			
			// arrow body
			ctx.moveTo(fromX, fromY);
			ctx.lineTo(toX, toY);
			
			// arrow head
			var HEAD_SIZE = 16;
			var HEAD_POINTINESS = Math.PI/6;
			var vectorAngle = this.angle();
			ctx.moveTo(toX, toY);
			ctx.lineTo(toX - HEAD_SIZE*Math.cos(vectorAngle - HEAD_POINTINESS), toY - HEAD_SIZE*Math.sin(vectorAngle - HEAD_POINTINESS));
			ctx.moveTo(toX, toY);
			ctx.lineTo(toX - HEAD_SIZE*Math.cos(vectorAngle + HEAD_POINTINESS), toY - HEAD_SIZE*Math.sin(vectorAngle + HEAD_POINTINESS));
			
			ctx.lineWidth = 1;
			ctx.strokeStyle = 'darkorange';
			ctx.stroke();
		};
		
		return Vector2;
	}());
	
	// axis-aligned bounding box
	exports.AABB = function (left, top, width, height) {
		var that = this;
		
		that.left   = left;
		that.top    = top;
		that.width  = width;
		that.height = height;
		
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
			var xev = escapeVector(that.left, that.left + that.width,  other.left, other.left + other.width);
			var yev = escapeVector(that.top,  that.top  + that.height, other.top,  other.top  + other.height);
			// no collision
			if (xev === false || yev === false) return false;
			
			if (Math.abs(xev) < Math.abs(yev)) yev = 0;
			else xev = 0;
			
			// ADD this vector to That's position to clear it from Other
			return new exports.Vector2(xev, yev);
		};
		
		that.draw = function (ctx) {
			ctx.beginPath();
			
			ctx.rect(that.left, that.top, that.width, that.height);
			
			ctx.lineWidth = 1;
			ctx.strokeStyle = 'red';
			ctx.stroke();
		};
		
		that.centerAt = function (position) {
			that.left = position.x - that.width/2;
			that.top  = position.y - that.height/2;
		};
	};
	
	exports.tweens = {};
	
	// http://easings.net/
	exports.tweens.easeOutElastic = function (x, t, b, c, d) {
		var s=1.70158;var p=0;var a=c;
		if (t==0) return b;  if ((t/=d)==1) return b+c;  if (!p) p=d*.3;
		if (a < Math.abs(c)) { a=c; var s=p/4; }
		else var s = p/(2*Math.PI) * Math.asin (c/a);
		return a*Math.pow(2,-10*t) * Math.sin( (t*d-s)*(2*Math.PI)/p ) + c + b;
	};
	
	return exports;
}());

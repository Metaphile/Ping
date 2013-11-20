var ENTITIES = (function () {
	'use strict';
	
	var exports = {};
	
	exports.loadImagesThen = function (onLoaded) {
		var paths = {
			cherries: 'images/cherries.png',
			bananas: 'images/bananas.png'
		};
		
		var images = {};
		
		// every time an image loads, check whether *all* images are loaded
		function checkIfDone() {
			for (var name in images) {
				// skip inherited properties
				if (!images.hasOwnProperty(name)) continue;
				// at least one image isn't loaded; keep waiting
				if (!images[name].complete) return;
			}
			
			// if we made it this far, we're done
			exports.images = images;
			onLoaded();
		}
		
		// first, create an empty image object for each path
		for (var name in paths) {
			if (!paths.hasOwnProperty(name)) continue;
			images[name] = new Image();
		}
		
		// then, register a load event handler and start loading
		for (var name in images) {
			if (!images.hasOwnProperty(name)) continue;
			images[name].onload = checkIfDone;
			images[name].src = paths[name];
		}
		
		// I've read that if the images are cached, the load event won't fire
		checkIfDone();
	};
	
	exports.Wall = function (ctx, left, top, width, height) {
		var that = this;
		
		that.boundary = new ENGINE.AABB(left, top, width, height);
		
		that.update = ENGINE.noop;
		
		that.draw = function () {
			ctx.lineWidth = GAME.SPRITE_SCALE_FACTOR;
			ctx.strokeStyle = 'white';
			
			ctx.beginPath();
			ctx.rect(
				that.boundary.left + ctx.lineWidth/2,
				that.boundary.top + ctx.lineWidth/2,
				that.boundary.right - that.boundary.left - ctx.lineWidth,
				that.boundary.bottom - that.boundary.top - ctx.lineWidth
			);
			
			ctx.stroke();
		};
	};
	
	exports.Paddle = function (ctx) {
		var that = this;
		
		that.position = new ENGINE.Vector2();
		that.velocity = new ENGINE.Vector2();
		
		that.width = 8;
		that.height = 80;
		
		that.boundary = new ENGINE.AABB(
			that.position.x - that.width/2,
			that.position.y - that.height/2,
			that.width,
			that.height
		);
		
		that.update = function (deltaTime) {
			that.position.add(that.velocity.multipliedBy(deltaTime));
			that.boundary.moveTo(that.position);
		};
		
		that.draw = function () {
			ctx.fillStyle = 'white';
			ctx.fillRect(that.position.x - that.width/2, that.position.y - that.height/2, that.width, that.height);
		};
		
		that.moveTo = function (y) {
			that.position.y = y;
			that.boundary.moveTo(that.position);
		};
		
		that.onCollision = function (collidable, escapeVector) {
			if (collidable instanceof exports.Wall) {
				that.position.add(escapeVector);
				that.boundary.moveTo(that.position);
			}
		};
	};
	
	exports.Ball = function (ctx) {
		var that = this;
		
		// disabled ball can still collide with tokens :-(
		that.enabled = true;
		
		that.position = new ENGINE.Vector2();
		that.velocity = new ENGINE.Vector2();
		that.radius = 12;
		
		that.boundary = new ENGINE.AABB(
			that.position.x - that.radius,
			that.position.y - that.radius,
			that.radius*2,
			that.radius*2
		);
		
		var beep = new Audio('sounds/boop.ogg');
		beep.volume = 0.1;
		var boop = new Audio('sounds/boop.ogg');
		boop.playbackRate = 0.5;
		boop.volume = 0.1;
		
		that.update = function (deltaTime) {
			if (!that.enabled) return;
			
			that.position.add(that.velocity.multipliedBy(deltaTime));
			that.boundary.moveTo(that.position);
		};
		
		that.draw = function () {
			if (!that.enabled) return;
			
			ctx.beginPath();
			ctx.arc(that.position.x, that.position.y, that.radius, 0, Math.PI * 2);
			ctx.fillStyle = 'white';
			ctx.fill();
		};
		
		that.onCollision = function (collidable, escapeVector) {
			if (collidable instanceof exports.Wall) {
				beep.replay();
				
				that.position.add(escapeVector);
				that.boundary.moveTo(that.position);
				
				// this is a bit cheating, but since we know that the collidable's boundary is an AABB, then the normalized escape vector is also the surface normal
				var surfaceNormal = escapeVector.normalized();
				that.velocity = that.velocity.reflectedAbout(surfaceNormal);
			}
			
			if (collidable instanceof exports.Paddle) {
				boop.replay();
				
				that.position.add(escapeVector);
				that.boundary.moveTo(that.position);
				
				var surfaceNormal = escapeVector.normalized();
				
				if (Math.abs(surfaceNormal.x) > Math.abs(surfaceNormal.y)) {
					// if the surface normal is horizontal, it means the ball hit one of the vertical faces of the paddle (although possibly the back face...)
					
					var t = that.position.y - collidable.position.y;
					// -1 ... 1
					t /= (collidable.height + that.radius*2) / 2;
					var accuracy = 1 - Math.abs(t);
					// add a bit of randomness
					t += Math.randRange(-0.1, 0.1);
					
					var bounceAngle = t * 70;
					
					var ballSpeed = that.velocity.length();
					that.velocity.x = Math.cos(bounceAngle * Math.PI/180) * ballSpeed * surfaceNormal.x;
					that.velocity.y = Math.sin(bounceAngle * Math.PI/180) * ballSpeed;
				} else {
					// bounce normally
					boop.replay();
					that.velocity = that.velocity.reflectedAbout(surfaceNormal);
				}
			}
		};
	};
	
	exports.Points = function (ctx) {
		var that = this;
		
		that.position = new ENGINE.Vector2();
		that.velocity = new ENGINE.Vector2();
		
		that.value = 0;
		
		var FADE_DURATION = 1.6, fadeDurationElapsed;
		
		that.initialize = function () {
			fadeDurationElapsed = 0;
		};
		
		that.update = function (deltaTime) {
			if (fadeDurationElapsed < FADE_DURATION) {
				fadeDurationElapsed += deltaTime;
				
				// float up
				that.position.y -= 20 * deltaTime;
			}
		};
		
		that.draw = function () {
			ctx.textAlign = 'center';
			ctx.font = 'bold 16px monospace';
			
			var text = '$' + that.value.withCommas();
			var opacity = 1 - fadeDurationElapsed/FADE_DURATION;
			ctx.fillStyle = 'rgba(255, 255, 255, ' + opacity + ')';
			ctx.fillText(text, that.position.x, that.position.y);
		};
		
		that.initialize();
	};
	
	exports.Token = function (ctx, sprite, pointValue, pointses, game) {
		var that = this;
		var states = {}, currentState;
		
		function changeState(newState) {
			currentState = newState;
			currentState.onEnter();
		}
		
		states.base = {
			onEnter: function () { changeState(states.main); }
		};
		
		// creates public properties that delegate to the current state
		function delegateProperties(/* ... */) {
			var names = Array.prototype.slice.call(arguments);
			
			names.forEach(function (name) {
				Object.defineProperty(that, name, {
					get: function () { return currentState[name] },
					set: function (value) { currentState[name] = value; }
				});
			});
		}
		
		// creates public methods that delegate to the current state
		function delegateMethods(/* ... */) {
			var names = Array.prototype.slice.call(arguments);
			
			names.forEach(function (name) {
				// default implementation
				states.base[name] = ENGINE.noop;
				that[name] = function () { currentState[name].apply(currentState, arguments); };
			});
		}
		
		delegateProperties('position', 'width', 'height', 'boundary');
		delegateMethods('update', 'draw', 'onCollision');
		
		states.main = (function () {
			function Main() {
				var that = this;
				
				that.onEnter = ENGINE.noop;
				
				that.position = new ENGINE.Vector2();
				
				var aspectRatio = sprite.width/sprite.height;
				that.width = sprite.width * GAME.SPRITE_SCALE_FACTOR;
				that.height = that.width/aspectRatio;
				
				that.boundary = new ENGINE.AABB(
					that.position.x - that.width/2,
					that.position.y - that.height/2,
					that.width,
					that.height
				);
				
				states.spawning = (function () {
					function Spawning() {
						var that = this;
						
						that.onEnter = ENGINE.noop;
						
						// ...
					}
					
					Spawning.prototype = that; // states.main
					return new Spawning();
				}());
				
				that.update = function (deltaTime) {
					that.boundary.moveTo(that.position);
				};
				
				that.draw = function () {
					ctx.drawImage(sprite, that.position.x - that.width/2, that.position.y - that.height/2, that.width, that.height);
				};
				
				states.dying = (function () {
					function Dying() {
						var that = this;
						
						that.onEnter = ENGINE.noop;
						
						// ...
					}
					
					Dying.prototype = that; // states.main
					return new Dying();
				}());
			}
			
			Main.prototype = states.base;
			return new Main();
		}());
		
		changeState(states.base);
		
		/* that.position = new ENGINE.Vector2();
		
		var aspectRatio = sprite.width/sprite.height;
		that.width = sprite.width * GAME.SPRITE_SCALE_FACTOR;
		that.height = that.width/aspectRatio;
		
		that.boundary = new ENGINE.AABB(
			that.position.x - that.width/2,
			that.position.y - that.height/2,
			that.width,
			that.height
		);
		
		var chaChing = new Audio('sounds/cha-ching.ogg');
		chaChing.volume = 0.1;
		
		var t = Math.randRange(0, Math.PI*2);
		
		that.update = function (deltaTime) {
			// bob slightly
			t += 5 * deltaTime;
			while (t > Math.PI*2) t -= Math.PI*2;
			that.position.y += Math.sin(t) * 0.2;
			that.boundary.moveTo(that.position);
		};
		
		that.draw = function () {
			ctx.drawImage(sprite, that.position.x - that.width/2, that.position.y - that.height/2, that.width, that.height);
		};
		
		that.onCollision = function (collidable) {
			if (collidable instanceof exports.Ball) {
				chaChing.replay();
				
				var points = pointses.getNext();
				points.initialize();
				points.value = pointValue * game.multiplier;
				points.alignment = 'center';
				points.position.x = that.position.x;
				points.position.y = that.position.y;
				
				game.score += pointValue * game.multiplier;
				
				// temp!! move to random location
				that.position.x = Math.randRange(100, ctx.canvas.width-100);
				that.position.y = Math.randRange(100, ctx.canvas.height-100);
			}
		}; */
	};
	
	exports.EntityPool = function (createEntity, count) {
		var that = this;
		
		var entities = [];
		var active = [];
		var lastChecked = count - 1;
		
		while (count--) {
			entities.push(createEntity());
			active.push(false);
		}
		
		that.forEach = function (visit) {
			for (var i = 0, n = entities.length; i < n; i++) {
				if (active[i]) visit(entities[i]);
			}
		};
		
		that.getNext = function () {
			for (var i = 0, n = entities.length; i < n; i++) {
				lastChecked++;
				// wrap
				if (lastChecked >= n) lastChecked = 0;
				
				if (!active[lastChecked]) {
					active[lastChecked] = true;
					return entities[lastChecked];
				}
			}
			
			// uht-oh! all out of entities; recycle the oldest entity
			lastChecked++;
			if (lastChecked >= entities.length) lastChecked = 0;
			return entities[lastChecked];
		};
		
		that.putBack = function (entity) {
			var i = entities.indexOf(entity);
			if (i > -1) active[i] = false;
		};
		
		that.update = function (deltaTime) {
			that.forEach(function (entity) { entity.update(deltaTime); });
		};
		
		that.draw = function () {
			that.forEach(function (entity) { entity.draw(); });
		};
	};
	
	return exports;
}());

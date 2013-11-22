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
				that.boundary.left   + ctx.lineWidth/2,
				that.boundary.top    + ctx.lineWidth/2,
				that.boundary.width  - ctx.lineWidth,
				that.boundary.height - ctx.lineWidth
			);
			
			ctx.stroke();
		};
	};
	
	exports.Paddle = function (ctx) {
		var that = this;
		
		that.position = new ENGINE.Vector2();
		that.velocity = new ENGINE.Vector2();
		
		that.width = 8;
		
		that.boundary = new ENGINE.AABB(
			that.position.x - that.width/2,
			that.position.y - CONFIG.paddleHeight/2,
			that.width,
			CONFIG.paddleHeight
		);
		
		that.update = function (deltaTime) {
			that.position.add(that.velocity.multipliedBy(deltaTime));
			that.boundary.centerAt(that.position);
		};
		
		that.draw = function () {
			ctx.fillStyle = 'white';
			ctx.fillRect(that.position.x - that.width/2, that.position.y - CONFIG.paddleHeight/2, that.width, CONFIG.paddleHeight);
		};
		
		that.moveTo = function (y) {
			that.position.y = y;
			that.boundary.centerAt(that.position);
		};
		
		that.onCollision = function (collidable, escapeVector) {
			if (collidable instanceof exports.Wall) {
				that.position.add(escapeVector);
				that.boundary.centerAt(that.position);
			}
		};
	};
	
	exports.Ball = function (ctx) {
		var that = this;
		
		// to-do: disabled ball can still collide with tokens :-(
		that.enabled = true;
		
		that.position = new ENGINE.Vector2();
		that.velocity = new ENGINE.Vector2();
		
		that.boundary = new ENGINE.AABB(
			that.position.x - CONFIG.ballRadius,
			that.position.y - CONFIG.ballRadius,
			CONFIG.ballRadius*2,
			CONFIG.ballRadius*2
		);
		
		var beep = new Audio('sounds/boop.ogg');
		beep.volume = 0.1;
		var boop = new Audio('sounds/boop.ogg');
		boop.playbackRate = 0.5;
		boop.volume = 0.1;
		
		that.update = function (deltaTime) {
			if (!that.enabled) return;
			
			that.position.add(that.velocity.multipliedBy(deltaTime));
			that.boundary.centerAt(that.position);
		};
		
		that.draw = function () {
			if (!that.enabled) return;
			
			ctx.beginPath();
			ctx.arc(that.position.x, that.position.y, CONFIG.ballRadius, 0, Math.PI * 2);
			ctx.fillStyle = 'white';
			ctx.fill();
		};
		
		that.onCollision = function (collidable, escapeVector) {
			if (collidable instanceof exports.Wall) {
				beep.replay();
				
				that.position.add(escapeVector);
				that.boundary.centerAt(that.position);
				
				// this is a bit cheating, but since we know that the collidable's boundary is an AABB, then the normalized escape vector is also the surface normal
				var surfaceNormal = escapeVector.normalized();
				that.velocity = that.velocity.reflectedAbout(surfaceNormal);
			}
			
			if (collidable instanceof exports.Paddle) {
				boop.replay();
				
				that.position.add(escapeVector);
				that.boundary.centerAt(that.position);
				
				var surfaceNormal = escapeVector.normalized();
				
				if (Math.abs(surfaceNormal.x) > Math.abs(surfaceNormal.y)) {
					// if the surface normal is horizontal, it means the ball hit one of the vertical faces of the paddle (although possibly the back face...)
					
					var t = that.position.y - collidable.position.y;
					// -1 ... 1
					t /= (CONFIG.paddleHeight + CONFIG.ballRadius*2) / 2;
					var accuracy = 1 - Math.abs(t);
					
					var bounceAngle = t * 70;
					
					that.velocity.x = Math.cos(bounceAngle * Math.PI/180) * CONFIG.ballSpeed * surfaceNormal.x;
					that.velocity.y = Math.sin(bounceAngle * Math.PI/180) * CONFIG.ballSpeed;
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
		
		var FADE_DURATION = 1.7, fadeDurationElapsed;
		// for pop up animation
		var verticalOffset;
		
		that.initialize = function () {
			fadeDurationElapsed = 0;
			verticalOffset = 0;
		};
		
		that.update = function (deltaTime) {
			if (fadeDurationElapsed < FADE_DURATION) {
				fadeDurationElapsed += deltaTime;
				
				// pop up
				verticalOffset = ENGINE.tweens.easeOutElastic(null, fadeDurationElapsed, 0, -20, 1);
			}
		};
		
		that.draw = function () {
			ctx.textAlign = 'center';
			ctx.font = 'bold 18px monospace';
			
			var text = '$' + that.value.withCommas();
			var opacity = 1 - Math.pow(fadeDurationElapsed/FADE_DURATION, 2);
			
			// black outline
			ctx.strokeStyle = 'rgba(0, 0, 0, ' + opacity + ')';
			ctx.lineWidth = 4;
			ctx.strokeText(text, that.position.x, that.position.y + verticalOffset);
			
			// yellow glow
			ctx.strokeStyle = 'rgba(255, 255, 127, ' + opacity + ')';
			ctx.lineWidth = 2;
			ctx.strokeText(text, that.position.x, that.position.y + verticalOffset);
			
			ctx.fillStyle = 'rgba(255, 255, 255, ' + opacity + ')';
			ctx.fillText(text, that.position.x, that.position.y + verticalOffset);
		};
		
		that.initialize();
	};
	
	exports.Token = function (ctx, sprite, value, game) {
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
				that.value = value;
				
				that.onEnter = function () {
					changeState(states.spawning);
				};
				
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
						var SPAWN_DURATION = 0.8, spawnDurationElapsed;
						
						that.onEnter = function () {
							spawnDurationElapsed = 0;
							
							// temp!! move to random location
							that.position.x = Math.randRange(100, ctx.canvas.width-100);
							that.position.y = Math.randRange(100, ctx.canvas.height-100);
						};
						
						that.update = function (deltaTime) {
							that.__proto__.update(deltaTime);
							
							spawnDurationElapsed += deltaTime;
							if (spawnDurationElapsed >= SPAWN_DURATION) changeState(states.normal);
						};
						
						that.draw = function () {
							var ratio = spawnDurationElapsed/SPAWN_DURATION;
							
							var width = ENGINE.tweens.easeOutElastic(null, spawnDurationElapsed, 0, that.width, SPAWN_DURATION * 4.4);
							var height = ENGINE.tweens.easeOutElastic(null, spawnDurationElapsed, 0, that.height, SPAWN_DURATION * 4.4);
							
							ctx.save();
							ctx.globalAlpha = ratio * 0.4;
							ctx.drawImage(sprite, that.position.x - width/2, that.position.y - height/2, width, height);
							ctx.restore();
						};
					}
					
					Spawning.prototype = that; // states.main
					return new Spawning();
				}());
				
				states.normal = (function () {
					function Normal() {
						var that = this;
						
						that.onEnter = ENGINE.noop;
						
						var chaChing = new Audio('sounds/cha-ching.ogg');
						chaChing.volume = 0.1;
						
						that.draw = function () {
							ctx.drawImage(sprite, that.position.x - that.width/2, that.position.y - that.height/2, that.width, that.height);
						};
						
						that.onCollision = function (collidable, escapeVector) {
							if (collidable instanceof exports.Ball) {
								chaChing.replay();
								game.onTokenCollected(that);
								changeState(states.dying);
							}
						};
					}
					
					Normal.prototype = that; // states.main
					return new Normal();
				}());
				
				states.dying = (function () {
					function Dying() {
						var that = this;
						var DEATH_DURATION = 1/3, deathDurationElapsed;
						
						that.onEnter = function () {
							deathDurationElapsed = 0;
						};
						
						that.update = function (deltaTime) {
							that.__proto__.update(deltaTime);
							
							deathDurationElapsed += deltaTime;
							if (deathDurationElapsed >= DEATH_DURATION) changeState(states.spawning);
						};
						
						function f(x) {
							return x*x;
						}
						
						that.draw = function () {
							var ratio = 1 - deathDurationElapsed/DEATH_DURATION;
							
							var width = that.width + (1 - f(ratio) || Number.MIN_VALUE) * 1000;
							var height = that.height * f(ratio);
							
							ctx.save();
							ctx.globalAlpha = f(ratio) * 0.4;
							ctx.drawImage(sprite, that.position.x - width/2, that.position.y - height/2, width, height);
							ctx.restore();
						};
					}
					
					Dying.prototype = that; // states.main
					return new Dying();
				}());
				
				var t = Math.randRange(0, Math.PI*2);
				
				that.update = function (deltaTime) {
					// bob slightly
					t += 3 * deltaTime;
					while (t > Math.PI*2) t -= Math.PI*2;
					that.position.y += Math.sin(t) * 0.2;
					that.boundary.centerAt(that.position);
				};
			}
			
			Main.prototype = states.base;
			return new Main();
		}());
		
		changeState(states.base);
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

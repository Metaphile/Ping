var ENTITIES = (function (my) {
	my.Token = function (ctx, sprite, value, game) {
		var that = this;
		var fsm = ENGINE.createStateMachine(['initialize', 'position', 'width', 'height', 'boundary', 'update', 'draw', 'onCollision'], that);
		
		fsm.states.main = (function () {
			function Main() {
				var that = this;
				that.value = value;
				
				that.initialize = function () { fsm.changeState(fsm.states.main); };
				
				that.onEnter = function () {
					fsm.changeState(fsm.states.spawning);
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
				
				fsm.states.spawning = (function () {
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
							if (spawnDurationElapsed >= SPAWN_DURATION) fsm.changeState(fsm.states.normal);
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
					
					Spawning.prototype = that; // fsm.states.main
					return new Spawning();
				}());
				
				fsm.states.normal = (function () {
					function Normal() {
						var that = this;
						
						that.onEnter = ENGINE.noop;
						
						var chaChing = new Audio('sounds/cha-ching.ogg');
						chaChing.volume = 0.1;
						
						that.draw = function () {
							ctx.drawImage(sprite, that.position.x - that.width/2, that.position.y - that.height/2, that.width, that.height);
						};
						
						that.onCollision = function (collidable, escapeVector) {
							if (collidable instanceof my.Ball) {
								chaChing.replay();
								game.onTokenCollected(that);
								fsm.changeState(fsm.states.dying);
							}
						};
					}
					
					Normal.prototype = that; // fsm.states.main
					return new Normal();
				}());
				
				fsm.states.dying = (function () {
					function Dying() {
						var that = this;
						var DEATH_DURATION = 1/3, deathDurationElapsed;
						
						that.onEnter = function () {
							deathDurationElapsed = 0;
						};
						
						that.update = function (deltaTime) {
							that.__proto__.update(deltaTime);
							
							deathDurationElapsed += deltaTime;
							if (deathDurationElapsed >= DEATH_DURATION) fsm.changeState(fsm.states.spawning);
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
					
					Dying.prototype = that; // fsm.states.main
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
			
			Main.prototype = fsm.states.base;
			return new Main();
		}());
		
		fsm.changeState(fsm.states.main);
	};
	
	return my;
}(ENTITIES || {}));

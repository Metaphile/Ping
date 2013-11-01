var GAME = (function () {
	'use strict';
	
	var exports = {};
	
	exports.Game = function (input, ctx) {
		var that = this;
		var states = {}, currentState;
		
		states.base = new function () {
			var that = this;
			
			that.onEnter = function () {
				currentState = states.title;
				currentState.onEnter();
			};
			
			states.title = (function () {
				function Title() {
					var that = this;
					
					var BLINK_INTERVAL = 0.6, elapsed, dimPrompt;
					
					that.onEnter = function () {
						elapsed = 0;
					};
					
					that.onKeyDown = function (key) {
						if (key === ENGINE.Keyboard.keys.enter) {
							currentState = states.main;
							currentState.onEnter();
						}
					};
					
					that.update = function (interval) {
						elapsed += interval;
						if (elapsed > BLINK_INTERVAL) {
							dimPrompt = !dimPrompt;
							elapsed -= BLINK_INTERVAL;
						}
					};
					
					that.draw = function () {
						ctx.textAlign = 'center';
						ctx.fillStyle = 'white';
						ctx.font = 'bold 128px monospace';
						ctx.fillText('Ping', ctx.canvas.width/2, ctx.canvas.height/2);
						
						// start prompt
						ctx.fillStyle = dimPrompt ? 'gray' : 'white';
						ctx.font = 'normal 20px monospace';
						ctx.fillText('Press Start', ctx.canvas.width/2, ctx.canvas.height/2 + 60);
					};
				}
				
				Title.prototype = that; // states.base
				
				return new Title();
			}());
			
			states.main = (function () {
				function Main() {
					var that = this;
					var score, spareBalls;
					var TOTAL_BALLS = 3;
					var WALL_THICKNESS = 50;
					
					var entities = [];
					var walls = [];
					var paddles = [];
					
					(function () {
						var upperWall = new ENTITIES.Wall(ctx);
						upperWall.boundary.left   = -9999;
						upperWall.boundary.right  = ctx.canvas.width + 9999;
						upperWall.boundary.top    = -9999;
						upperWall.boundary.bottom = WALL_THICKNESS;
						entities.push(upperWall);
						walls.push(upperWall);
						
						var lowerWall = new ENTITIES.Wall(ctx);
						lowerWall.boundary.left   = -9999;
						lowerWall.boundary.right  = ctx.canvas.width + 9999;
						lowerWall.boundary.top    = ctx.canvas.height - WALL_THICKNESS;
						lowerWall.boundary.bottom = ctx.canvas.height + 9999;
						entities.push(lowerWall);
						walls.push(lowerWall);
					}());
					
					(function () {
						var leftPaddle = new ENTITIES.Paddle(ctx);
						leftPaddle.position.x = leftPaddle.width/2 + 30;
						entities.push(leftPaddle);
						paddles.push(leftPaddle);
						
						var rightPaddle = new ENTITIES.Paddle(ctx);
						rightPaddle.position.x = ctx.canvas.width - rightPaddle.width/2 - 30;
						entities.push(rightPaddle);
						paddles.push(rightPaddle);
					}());
					
					var ball = new ENTITIES.Ball(ctx);
					entities.push(ball);
					
					that.onEnter = function () {
						score = 0;
						spareBalls = TOTAL_BALLS;
						// vertically center paddles
						paddles.forEach(function (paddle) { paddle.position.y = ctx.canvas.height/2; });
						
						currentState = states.serving;
						currentState.onEnter();
					};
					
					that.onMouseMove = function (position) {
						paddles.forEach(function (paddle) { paddle.position.y = position.y; });
					};
					
					that.update = function (interval) {
						entities.forEach(function (entity) { entity.update(interval); });
						
						// paddle-wall collisions
						for (var i = paddles.length - 1; i >= 0; i--) {
							for (var j = walls.length - 1; j >= 0; j--) {
								var escapeVector = paddles[i].boundary.test(walls[j].boundary);
								if (escapeVector) {
									paddles[i].onCollision(walls[j], escapeVector);
								}
							}
						}
						
						// ball-wall collisions
						walls.forEach(function (wall) {
							var escapeVector = ball.boundary.test(wall.boundary);
							if (escapeVector) ball.onCollision(wall, escapeVector);
						});
						
						// ball-paddle collisions
						paddles.forEach(function (paddle) {
							var escapeVector = ball.boundary.test(paddle.boundary);
							if (escapeVector) ball.onCollision(paddle, escapeVector);
						});
						
						// ball-void collisions
						if (ball.position.x + ball.width/2 < 0 || ball.position.x - ball.width/2 > ctx.canvas.width) {
							currentState = states.serving;
							currentState.onEnter();
						}
					};
					
					that.draw = function () {
						// score
						
						ctx.textAlign = 'center';
						ctx.fillStyle = 'white';
						ctx.font = 'bold 30px monospace';
						ctx.fillText(score, ctx.canvas.width/2, 34);
						
						// spare balls (heh)
						
						var SYMBOL_RADIUS = 7;
						var SPACING = 6;
						var LEFT = ctx.canvas.width - (TOTAL_BALLS * (SYMBOL_RADIUS*2 + SPACING)) + SYMBOL_RADIUS - 100;
						
						for (var i = 0; i < TOTAL_BALLS; i++) {
							ctx.beginPath();
							ctx.arc(LEFT + i * (SYMBOL_RADIUS*2 + SPACING), WALL_THICKNESS/2, SYMBOL_RADIUS, 0, Math.PI * 2);
							ctx.fillStyle = (i < spareBalls ? 'white' : 'gray');
							ctx.fill();
						}
						
						entities.forEach(function (entity) { entity.draw(); });
					};
					
					states.serving = (function () {
						function Serving() {
							var that = this;
							
							var DURATION = 3, remaining;
							var BALL_SPEED = 400;
							
							that.onEnter = function () {
								remaining = DURATION;
								
								spareBalls--;
								
								ball.position.x = ctx.canvas.width/2;
								ball.position.y = ctx.canvas.height/2;
								ball.velocity.x = 0;
								ball.velocity.y = 0;
							};
							
							that.update = function (interval) {
								that.__proto__.update(interval);
								
								remaining -= interval;
								if (remaining <= 0) {
									var angle = Math.randRange(-45, 45);
									// randomly serve to the left or right
									if (Math.random() > 0.5) { angle += 180; }
									ball.velocity.x = Math.cos(angle * Math.PI/180) * BALL_SPEED;
									ball.velocity.y = Math.sin(angle * Math.PI/180) * BALL_SPEED;
									
									currentState = states.playing;
									states.playing.onEnter();
								}
							};
							
							that.draw = function () {
								that.__proto__.draw();
								
								ctx.fillStyle = 'white';
								ctx.font = 'normal 30px monospace';
								ctx.textAlign = 'center';
								ctx.fillText(Math.ceil(remaining), ctx.canvas.width/2, ctx.canvas.height/2 - 25);
							};
						}
						
						Serving.prototype = that; // states.main
						
						return new Serving();
					}());
					
					states.playing = (function () {
						function Playing() {
							var that = this;
							
							that.onEnter = ENGINE.noop;
						}
						
						Playing.prototype = that; // states.main
						
						return new Playing();
					}());
				}
				
				Main.prototype = that; // states.base
				
				return new Main();
			}());
		};
		
		// creates a public method that delegates to the current state
		function delegate(method) {
			// default implementation
			states.base[method] = ENGINE.noop;
			that[method] = function () { currentState[method].apply(currentState, arguments); };
		}
		
		delegate('onKeyDown');
		delegate('onMouseMove');
		delegate('update');
		delegate('draw');
		
		that.initialize = function () {
			currentState = states.base;
			currentState.onEnter();
		};
		
		// subscribe to input events
		input.keyboard.keyDown.then(that.onKeyDown);
		input.mouse.move.then(that.onMouseMove);
		
		that.initialize();
	};
	
	return exports;
}());

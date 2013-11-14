var GAME = (function () {
	'use strict';
	
	var exports = {};
	
	exports.Game = function (input, ctx) {
		var that = this;
		var states = {}, currentState;
		
		function changeState(newState) {
			currentState = newState;
			currentState.onEnter();
		}
		
		states.base = new function () {
			var that = this;
			
			that.onEnter = function () {
				changeState(states.title);
			};
			
			states.title = (function () {
				function Title() {
					var that = this;
					
					var BLINK_INTERVAL = 0.6, elapsed, dimPrompt;
					
					that.onEnter = function () {
						elapsed = 0;
					};
					
					that.onKeyDown = ENGINE.streamify();
					that.onButtonDown = ENGINE.streamify();
					
					// returns a function that returns `item` if `item` is in the list of items supplied to ifOneOf
					function ifOneOf(/* item1, item2 ... */) {
						var items = Array.prototype.slice.call(arguments);
						return function (item) {
							if (items.indexOf(item) > -1) return item;
						};
					}
					
					that.onKeyDown.then(ifOneOf(ENGINE.Keyboard.keys.enter))
						.merge(that.onButtonDown.then(ifOneOf(ENGINE.Gamepad.buttons.start, ENGINE.Gamepad.buttons.a)))
						.then(function () { changeState(states.main); });
					
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
					that.score = 0;
					var spareBalls;
					var TOTAL_BALLS = 3;
					var WALL_THICKNESS = 50;
					
					var entities = [];
					var walls = [];
					var paddles = [];
					var tokens = [];
					
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
					
					var points = new ENTITIES.Points(ctx);
					entities.push(points);
					
					var ball = new ENTITIES.Ball(ctx);
					entities.push(ball);
					
					// todo: put tokens behind points
					(function () {
						for (var i = 0; i < 3; i++) {
							var token = new ENTITIES.Token(ctx, points, that);
							token.position.x = Math.randRange(100, ctx.canvas.width-100);
							token.position.y = Math.randRange(100, ctx.canvas.height-100);
							tokens.push(token);
							entities.push(token);
						}
					}());
					
					that.onEnter = function () {
						that.score = 0;
						spareBalls = TOTAL_BALLS;
						// vertically center paddles
						for (var i = 0, n = paddles.length; i < n; i++) paddles[i].position.y = ctx.canvas.height/2;
						ball.enabled = true;
						
						changeState(states.serving);
					};
					
					that.onMouseMove = function (position) {
						for (var i = 0, n = paddles.length; i < n; i++) paddles[i].position.y = position.y;
					};
					
					that.onLeftStick = ENGINE.streamify();
					that.onRightStick = ENGINE.streamify();
					// initialize streams
					that.onLeftStick({ x: 0, y: 0 });
					that.onRightStick({ x: 0, y: 0 });
					
					that.onLeftStick
						.merge(that.onRightStick, function (vector1, vector2) {
							var y = vector1.y + vector2.y;
							if (y > 1) return 1;
							else if (y < -1) return -1;
							else return y;
						})
						.then(function (y) {
							for (var i = 0, n = paddles.length; i < n; i++) {
								paddles[i].velocity.y = y * 700;
							}
						});
					
					function checkCollisions() {
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
							if (escapeVector) {
								ball.onCollision(paddle, escapeVector);
							}
						});
						
						// ball-void collisions
						if (ball.position.x + ball.width/2 < 0 || ball.position.x - ball.width/2 > ctx.canvas.width) changeState(states.serving);
						
						// ball-token collisions
						for (var i = 0, n = tokens.length; i < n; i++) {
							var escapeVector = tokens[i].boundary.test(ball.boundary);
							if (escapeVector) {
								tokens[i].onCollision(ball, escapeVector);
								ball.onCollision(tokens[i], escapeVector.inverse());
							}
						}
					}
					
					that.update = function (interval) {
						for (var i = 0, n = entities.length; i < n; i++) entities[i].update(interval);
						checkCollisions();
					};
					
					that.draw = function () {
						// score
						
						ctx.textAlign = 'center';
						ctx.fillStyle = 'white';
						ctx.font = 'bold 30px monospace';
						ctx.fillText(that.score.withCommas(), ctx.canvas.width/2, 34);
						
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
						
						for (var i = 0, n = entities.length; i < n; i++) entities[i].draw();
					};
					
					function Paused(notPausedState) {
						var that = this;
						
						var BLINK_INTERVAL = 0.6, elapsed, dimPrompt;
						
						that.onEnter = function () {
							elapsed = 0;
							dimPrompt = false;
						};
						
						that.update = function (interval) {
							elapsed += interval;
							if (elapsed > BLINK_INTERVAL) {
								dimPrompt = !dimPrompt;
								elapsed -= BLINK_INTERVAL;
							}
						};
						
						that.draw = function () {
							that.__proto__.draw();
							
							ctx.fillStyle = 'rgba(0, 0, 0, 0.33)';
							ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
							
							ctx.fillStyle = dimPrompt ? 'gray' : 'white';
							ctx.font = 'normal 20px monospace';
							ctx.textAlign = 'center';
							ctx.fillText('Paused', ctx.canvas.width/2, ctx.canvas.height/2 + 35);
						};
						
						that.onKeyDown = ENGINE.streamify();
						that.onButtonDown = ENGINE.streamify();
						
						that.onKeyDown.then(function (key) { if (key === ENGINE.Keyboard.keys.esc) return key; })
							.merge(that.onButtonDown.then(function (button) { if (button === ENGINE.Gamepad.buttons.start) return button; }))
							.then(function () { changeState(notPausedState); });
						
						that.onMouseMove = ENGINE.noop;
					}
					
					states.serving = (function () {
						function Serving() {
							var that = this;
							
							var DURATION = 3, remaining;
							var BALL_SPEED = 400;
							
							that.onEnter = function () {
								if (spareBalls <= 0) return changeState(states.gameOver);
								
								remaining = DURATION;
								
								spareBalls--;
								
								ball.position.x = ctx.canvas.width/2;
								ball.position.y = ctx.canvas.height/2;
								ball.velocity.x = 0;
								ball.velocity.y = 0;
								
								changeState(states.servingNotPaused);
							};
							
							that.draw = function () {
								that.__proto__.draw();
								
								ctx.fillStyle = 'white';
								ctx.font = 'normal 30px monospace';
								ctx.textAlign = 'center';
								ctx.fillText(Math.ceil(remaining), ctx.canvas.width/2, ctx.canvas.height/2 - 25);
							};
							
							states.servingNotPaused = (function () {
								function ServingNotPaused() {
									var that = this;
									
									that.onEnter = ENGINE.noop;
									
									that.update = function (interval) {
										that.__proto__.update(interval);
										
										remaining -= interval;
										if (remaining <= 0) {
											var angle = Math.randRange(-45, 45);
											// randomly serve to the left or right
											if (Math.random() > 0.5) { angle += 180; }
											ball.velocity.x = Math.cos(angle * Math.PI/180) * BALL_SPEED;
											ball.velocity.y = Math.sin(angle * Math.PI/180) * BALL_SPEED;
											
											changeState(states.playing);
										}
									};
									
									that.onKeyDown = ENGINE.streamify();
									that.onButtonDown = ENGINE.streamify();
									
									that.onKeyDown.then(function (key) { if (key === ENGINE.Keyboard.keys.esc) return key; })
										.merge(that.onButtonDown.then(function (button) { if (button === ENGINE.Gamepad.buttons.start) return button; }))
										.then(function () { changeState(states.servingPaused); });
									
									that.onKeyDown.then(function (key) { if (key === ENGINE.Keyboard.keys.enter) return key; })
										.merge(that.onButtonDown.then(function (button) { if (button === ENGINE.Gamepad.buttons.a) return button; }))
										.then(function () { remaining = Math.ceil(remaining - 1); });
								}
								
								ServingNotPaused.prototype = that; // states.serving
								
								return new ServingNotPaused();
							}());
							
							Paused.prototype = that; // states.serving
							states.servingPaused = new Paused(states.servingNotPaused);
						}
						
						Serving.prototype = that; // states.main
						
						return new Serving();
					}());
					
					states.playing = (function () {
						function Playing() {
							var that = this;
							
							that.onEnter = function () {
								changeState(states.playingNotPaused);
							};
							
							states.playingNotPaused = (function () {
								function PlayingNotPaused() {
									var that = this;
									
									that.onEnter = ENGINE.noop;
									
									that.onKeyDown = ENGINE.streamify();
									that.onButtonDown = ENGINE.streamify();
									
									that.onKeyDown.then(function (key) { if (key === ENGINE.Keyboard.keys.esc) return key; })
										.merge(that.onButtonDown.then(function (button) { if (button === ENGINE.Gamepad.buttons.start) return button; }))
										.then(function () { changeState(states.playingPaused); });
								}
								
								PlayingNotPaused.prototype = that; // states.playing
								
								return new PlayingNotPaused();
							}());
							
							Paused.prototype = that; // states.playing
							states.playingPaused = new Paused(states.playingNotPaused);
						}
						
						Playing.prototype = that; // states.main
						
						return new Playing();
					}());
					
					states.gameOver = (function () {
						function GameOver() {
							var that = this;
							
							that.onEnter = function () {
								ball.enabled = false;
								ball.position.x = ctx.canvas.width/2;
								ball.position.y = ctx.canvas.height/2;
							};
							
							that.draw = function () {
								that.__proto__.draw();
								
								ctx.textAlign = 'center';
								ctx.fillStyle = 'white';
								ctx.font = 'normal 20px monospace';
								ctx.fillText('Game Over', ctx.canvas.width/2, ctx.canvas.height/2);
							};
							
							that.onKeyDown = ENGINE.streamify();
							that.onButtonDown = ENGINE.streamify();
							
							// press *almost* any key to continue
							that.onKeyDown.then(function (key) { if (ENGINE.Keyboard.modifiers.indexOf(key) === -1) return key; })
								// needs work -- includes triggers, D-pad, etc.
								.merge(that.onButtonDown)
								.then(function () { changeState(states.title); });
						}
						
						GameOver.prototype = that; // states.main
						
						return new GameOver();
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
		delegate('onButtonDown');
		delegate('onLeftStick');
		delegate('onRightStick');
		delegate('update');
		delegate('draw');
		
		// subscribe to input events
		input.keyboard.keyDown.then(that.onKeyDown);
		input.mouse.move.then(that.onMouseMove);
		input.gamepad.buttonDown.then(that.onButtonDown);
		input.gamepad.leftStick.then(that.onLeftStick);
		input.gamepad.rightStick.then(that.onRightStick);
		
		changeState(states.base);
	};
	
	return exports;
}());

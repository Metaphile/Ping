var GAME = (function () {
	'use strict';
	
	var exports = {};
	
	exports.SPRITE_SCALE_FACTOR = 3;
	
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
					that.onMouseDown = ENGINE.streamify();
					
					// experimental
					// returns a function that returns `item` if `item` is in the given list
					function allow(/* item1, item2 ... */) {
						var items = Array.prototype.slice.call(arguments);
						return function (item) {
							if (items.indexOf(item) > -1) return item;
						};
					}
					
					that.onKeyDown.then(allow(ENGINE.Keyboard.keys.enter))
						.or(that.onButtonDown.then(allow(ENGINE.Gamepad.buttons.start, ENGINE.Gamepad.buttons.a)))
						.then(function () { changeState(states.main); });
					
					// doesn't work when merged above??
					that.onMouseDown.then(function (event) { if (event.button === 0) return event; }).then(function () { changeState(states.main); });
					
					that.update = function (deltaTime) {
						elapsed += deltaTime;
						if (elapsed > BLINK_INTERVAL) {
							dimPrompt = !dimPrompt;
							while (elapsed > BLINK_INTERVAL) elapsed -= BLINK_INTERVAL;
						}
					};
					
					function drawTokens() {
						var HORIZONTAL_OFFSET = 260;
						var VERTICAL_OFFSET = -35;
						
						var aspectRatio = ENTITIES.images.cherries.width/ENTITIES.images.cherries.height;
						var scaledWidth = ENTITIES.images.cherries.width * 6;
						var scaledHeight = scaledWidth/aspectRatio;
						ctx.drawImage(ENTITIES.images.cherries, HORIZONTAL_OFFSET - scaledWidth/2, ctx.canvas.height/2 - scaledHeight/2 + VERTICAL_OFFSET, scaledWidth, scaledHeight);
						
						var aspectRatio = ENTITIES.images.bananas.width/ENTITIES.images.bananas.height;
						var scaledWidth = ENTITIES.images.bananas.width * 6;
						var scaledHeight = scaledWidth/aspectRatio;
						ctx.drawImage(ENTITIES.images.bananas, ctx.canvas.width - HORIZONTAL_OFFSET - scaledWidth/2, ctx.canvas.height/2 - scaledHeight/2 + VERTICAL_OFFSET, scaledWidth, scaledHeight);
					}
					
					that.draw = function () {
						ctx.textAlign = 'center';
						ctx.fillStyle = 'white';
						ctx.font = 'bold 128px monospace';
						ctx.fillText('Ping', ctx.canvas.width/2, ctx.canvas.height/2);
						
						drawTokens();
						
						// start prompt
						ctx.fillStyle = dimPrompt ? 'gray' : 'white';
						ctx.font = 'normal 20px monospace';
						ctx.fillText('Press Enter', ctx.canvas.width/2, ctx.canvas.height/2 + 60);
					};
				}
				
				Title.prototype = that; // states.base
				return new Title();
			}());
			
			states.main = (function () {
				function Main() {
					var that = this;
					var score = 0;
					var multiplier = 1;
					var multiplierTimeoutRemaining = 0;
					var spareBalls;
					var TOTAL_BALLS = 3;
					var WALL_THICKNESS = 50;
					
					var entities = [];
					var walls = [];
					var paddles = [];
					
					(function () {
						var upperWall = new ENTITIES.Wall(ctx, -9999, -9999, 9999 + ctx.canvas.width + 9999, 9999 + WALL_THICKNESS);
						entities.push(upperWall);
						walls.push(upperWall);
						
						var lowerWall = new ENTITIES.Wall(ctx, -9999, ctx.canvas.height - WALL_THICKNESS, 9999 + ctx.canvas.width + 9999, ctx.canvas.height - WALL_THICKNESS + 9999);
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
					
					var pointses = new ENTITIES.EntityPool(function () {
						return new ENTITIES.Points(ctx);
					}, 10);
					
					var cherryTokens = new ENTITIES.EntityPool(function () {
						return new ENTITIES.Token(ctx, ENTITIES.images.cherries, 100, that);
					}, 20);
					entities.push(cherryTokens);
					
					var bananaTokens = new ENTITIES.EntityPool(function () {
						return new ENTITIES.Token(ctx, ENTITIES.images.bananas, 500, that);
					}, 20);
					entities.push(bananaTokens);
					
					var initialTokenSpawner = new function () {
						var that = this;
						
						var NUM_CHERRY_TOKENS = 9, numCherryTokensRemaining;
						var NUM_BANANA_TOKENS = 3, numBananaTokensRemaining;
						var SPAWN_INTERVAL = 1/8, spawnIntervalRemaining;
						
						that.initialize = function () {
							numCherryTokensRemaining = NUM_CHERRY_TOKENS;
							numBananaTokensRemaining = NUM_BANANA_TOKENS;
							spawnIntervalRemaining = SPAWN_INTERVAL;
						};
						
						that.update = function (deltaTime) {
							if (numCherryTokensRemaining + numBananaTokensRemaining <= 0) return;
							
							spawnIntervalRemaining -= deltaTime;
							if (spawnIntervalRemaining <= 0) {
								while (spawnIntervalRemaining <= 0) spawnIntervalRemaining += SPAWN_INTERVAL;
								
								var token;
								while (true) {
									if (Math.random() >= 0.5 && numCherryTokensRemaining > 0) {
										token = cherryTokens.getNext();
										numCherryTokensRemaining--;
										break;
									} else if (numBananaTokensRemaining > 0) {
										token = bananaTokens.getNext();
										numBananaTokensRemaining--;
										break;
									}
								}
								
								token.position.x = Math.randRange(100, ctx.canvas.width-100);
								token.position.y = Math.randRange(100, ctx.canvas.height-100);
							}
						};
						
						that.draw = ENGINE.noop;
						
						that.initialize();
					};
					entities.push(initialTokenSpawner);
					
					var ball = new ENTITIES.Ball(ctx);
					entities.push(ball);
					
					entities.push(pointses);
					
					that.onEnter = function () {
						score = 0;
						multiplier = 1;
						multiplierTimeoutRemaining = 0;
						spareBalls = TOTAL_BALLS;
						// vertically center paddles
						for (var i = 0, n = paddles.length; i < n; i++) paddles[i].position.y = ctx.canvas.height/2;
						ball.enabled = true;
						
						// put away any tokens that are currently out
						cherryTokens.forEach(function (token) { cherryTokens.putBack(token); });
						bananaTokens.forEach(function (token) { bananaTokens.putBack(token); });
						
						initialTokenSpawner.initialize();
						
						changeState(states.serving);
					};
					
					that.onMouseMove = function (event) {
						for (var i = 0, n = paddles.length; i < n; i++) paddles[i].position.y += event.movementY;
					};
					
					that.onLeftStick = ENGINE.streamify();
					that.onRightStick = ENGINE.streamify();
					// initialize streams
					that.onLeftStick({ x: 0, y: 0 });
					that.onRightStick({ x: 0, y: 0 });
					
					that.onLeftStick
						.or(that.onRightStick, function (vector1, vector2) {
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
						if (ball.position.x + CONFIG.ballRadius < 0 || ball.position.x - CONFIG.ballRadius > ctx.canvas.width) {
							multiplierTimeoutRemaining = 0;
							multiplier = 1;
							changeState(states.serving);
						}
						
						// ball-token collisions
						cherryTokens.forEach(function (token) {
							var escapeVector = token.boundary.test(ball.boundary);
							if (escapeVector) {
								token.onCollision(ball, escapeVector);
								ball.onCollision(token, escapeVector.inverted());
							}
						});
						bananaTokens.forEach(function (token) {
							var escapeVector = token.boundary.test(ball.boundary);
							if (escapeVector) {
								token.onCollision(ball, escapeVector);
								ball.onCollision(token, escapeVector.inverted());
							}
						});
					}
					
					that.update = function (deltaTime) {
						for (var i = 0, n = entities.length; i < n; i++) entities[i].update(deltaTime);
						
						checkCollisions();
						
						multiplierTimeoutRemaining = Math.max(multiplierTimeoutRemaining - deltaTime, 0);
						if (multiplierTimeoutRemaining === 0) multiplier = 1;
					};
					
					function drawMultiplier() {
						var LEFT = 100;
						var WIDTH = 200;
						var HEIGHT = 22;
						
						ctx.fillStyle = 'gray';
						ctx.fillRect(LEFT, Math.round(WALL_THICKNESS/2 - HEIGHT/2 - exports.SPRITE_SCALE_FACTOR/2), WIDTH, HEIGHT);
						ctx.fillStyle = 'white';
						ctx.fillRect(LEFT, Math.round(WALL_THICKNESS/2 - HEIGHT/2 - exports.SPRITE_SCALE_FACTOR/2), Math.pow(multiplierTimeoutRemaining/CONFIG.multiplierTimeout, 3) * WIDTH, HEIGHT);
						
						ctx.textAlign = 'center';
						ctx.font = 'bold 18px monospace';
						ctx.fillStyle = 'black';
						ctx.fillText('×' + multiplier, LEFT + WIDTH/2, 31 - exports.SPRITE_SCALE_FACTOR/2);
					}
					
					function drawScore() {
						var scoreText = '$' + score.withCommas();
						ctx.textAlign = 'center';
						ctx.font = 'bold 30px monospace';
						
						ctx.strokeStyle = 'rgba(255, 255, 127, 0.5)';
						ctx.lineWidth = 2;
						ctx.strokeText(scoreText, ctx.canvas.width/2, 34 - exports.SPRITE_SCALE_FACTOR/2);
						
						ctx.fillStyle = 'white';
						ctx.fillText(scoreText, ctx.canvas.width/2, 34 - exports.SPRITE_SCALE_FACTOR/2);
					}
					
					function drawSpareBalls() {
						var SYMBOL_RADIUS = 7;
						var SPACING = 6;
						var LEFT = ctx.canvas.width - (TOTAL_BALLS * (SYMBOL_RADIUS*2 + SPACING)) + SYMBOL_RADIUS - 100;
						
						for (var i = 0; i < TOTAL_BALLS; i++) {
							ctx.beginPath();
							ctx.arc(LEFT + i * (SYMBOL_RADIUS*2 + SPACING), WALL_THICKNESS/2 - exports.SPRITE_SCALE_FACTOR/2, SYMBOL_RADIUS, 0, Math.PI * 2);
							ctx.fillStyle = (i < spareBalls ? 'white' : 'gray');
							ctx.fill();
						}
					}
					
					that.draw = function () {
						for (var i = 0, n = entities.length; i < n; i++) entities[i].draw();
						
						drawMultiplier();
						drawScore();
						drawSpareBalls();
					};
					
					function Paused(notPausedState) {
						var that = this;
						
						var BLINK_INTERVAL = 0.6, elapsed, dimPrompt;
						
						that.onEnter = function () {
							elapsed = 0;
							dimPrompt = false;
						};
						
						that.update = function (deltaTime) {
							elapsed += deltaTime;
							if (elapsed > BLINK_INTERVAL) {
								dimPrompt = !dimPrompt;
								while (elapsed > BLINK_INTERVAL) elapsed -= BLINK_INTERVAL;
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
							.or(that.onButtonDown.then(function (button) { if (button === ENGINE.Gamepad.buttons.start) return button; }))
							.then(function () { changeState(notPausedState); });
						
						that.onMouseMove = ENGINE.noop;
					}
					
					states.serving = (function () {
						function Serving() {
							var that = this;
							
							var DURATION = 3, remaining;
							
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
									
									that.update = function (deltaTime) {
										that.__proto__.update(deltaTime);
										
										remaining -= deltaTime;
										if (remaining <= 0) {
											var angle = Math.randRange(-45, 45);
											// randomly serve to the left or right
											if (Math.random() > 0.5) { angle += 180; }
											ball.velocity.x = Math.cos(angle * Math.PI/180) * CONFIG.ballSpeed;
											ball.velocity.y = Math.sin(angle * Math.PI/180) * CONFIG.ballSpeed;
											
											changeState(states.playing);
										}
									};
									
									that.onKeyDown = ENGINE.streamify();
									that.onButtonDown = ENGINE.streamify();
									
									that.onKeyDown.then(function (key) { if (key === ENGINE.Keyboard.keys.esc) return key; })
										.or(that.onButtonDown.then(function (button) { if (button === ENGINE.Gamepad.buttons.start) return button; }))
										.then(function () { changeState(states.servingPaused); });
									
									that.onKeyDown.then(function (key) { if (key === ENGINE.Keyboard.keys.enter) return key; })
										.or(that.onButtonDown.then(function (button) { if (button === ENGINE.Gamepad.buttons.a) return button; }))
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
										.or(that.onButtonDown.then(function (button) { if (button === ENGINE.Gamepad.buttons.start) return button; }))
										.then(function () { changeState(states.playingPaused); });
								}
								
								PlayingNotPaused.prototype = that; // states.playing
								return new PlayingNotPaused();
							}());
							
							Paused.prototype = that; // states.playing
							states.playingPaused = new Paused(states.playingNotPaused);
						}
						
						that.onTokenCollected = function (token) {
							var pointsAwarded = token.value * multiplier;
							
							score += pointsAwarded;
							multiplier++;
							multiplierTimeoutRemaining = CONFIG.multiplierTimeout;
							
							var points = pointses.getNext();
							points.initialize();
							points.value = pointsAwarded;
							points.position.x = token.position.x;
							points.position.y = token.position.y;
						};
						
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
							that.onMouseDown = ENGINE.streamify();
							
							// press *almost* any key to continue
							that.onKeyDown.then(function (key) { if (ENGINE.Keyboard.modifiers.indexOf(key) === -1) return key; })
								// needs work -- includes triggers, D-pad, etc.
								.or(that.onButtonDown)
								.then(function () { changeState(states.title); });
							
							// doesn't work when merged above??
							that.onMouseDown.then(function (event) { if (event.button === 0) return event; }).then(function () { changeState(states.title); });
						}
						
						GameOver.prototype = that; // states.main
						return new GameOver();
					}());
				}
				
				Main.prototype = that; // states.base
				return new Main();
			}());
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
		
		// todo: delegate properties
		delegateMethods('onKeyDown', 'onMouseMove', 'onMouseDown', 'onButtonDown', 'onLeftStick', 'onRightStick', 'update', 'draw', 'onTokenCollected');
		
		// subscribe to input events
		input.keyboard.keyDown.then(that.onKeyDown);
		input.mouse.move.then(that.onMouseMove);
		input.mouse.down.then(that.onMouseDown);
		input.gamepad.buttonDown.then(that.onButtonDown);
		input.gamepad.leftStick.then(that.onLeftStick);
		input.gamepad.rightStick.then(that.onRightStick);
		
		changeState(states.base);
	};
	
	return exports;
}());

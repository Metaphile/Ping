var ENTITIES = (function () {
	'use strict';
	
	var exports = {};
	
	exports.Entity = function () {};
	exports.Entity.prototype.update = function (interval) {
		var that = this;
		
		that.position.x += that.velocity.x * interval;
		that.position.y += that.velocity.y * interval;
		
		that.boundary.left   = that.position.x - that.width/2;
		that.boundary.right  = that.position.x + that.width/2;
		that.boundary.top    = that.position.y - that.height/2;
		that.boundary.bottom = that.position.y + that.height/2;
	};
	exports.Entity.prototype.onCollision = ENGINE.noop;
	
	exports.Wall = function (ctx) {
		var that = this;
		that.boundary = new ENGINE.AABB();
		
		that.update = ENGINE.noop;
		
		that.draw = function () {
			ctx.beginPath();
			ctx.rect(
				that.boundary.left,
				that.boundary.top,
				that.boundary.right - that.boundary.left,
				that.boundary.bottom - that.boundary.top);
			
			ctx.lineWidth = 2;
			ctx.strokeStyle = 'white';
			ctx.stroke();
		};
	};
	
	exports.Paddle = function (ctx) {
		var that = this;
		
		that.position = new ENGINE.Vector2();
		that.velocity = new ENGINE.Vector2();
		that.boundary = new ENGINE.AABB();
		that.width = 8, that.height = 80;
		
		that.draw = function () {
			ctx.beginPath();
			ctx.fillStyle = 'white';
			ctx.fillRect(that.position.x - that.width/2, that.position.y - that.height/2, that.width, that.height);
		};
		
		that.moveTo = function (y) {
			that.position.y = y;
		};
		
		that.onCollision = function (collidable, escapeVector) {
			if (collidable instanceof exports.Wall) {
				that.position.add(escapeVector);
			}
		};
	};
	exports.Paddle.prototype = new exports.Entity();
	
	exports.Ball = function (ctx) {
		var that = this;
		
		that.enabled = true;
		
		that.position = new ENGINE.Vector2();
		that.velocity = new ENGINE.Vector2();
		that.boundary = new ENGINE.AABB();
		that.width = that.height = 20;
		
		var beep = new Audio('sounds/boop.mp3');
		beep.volume = 0.1;
		var boop = new Audio('sounds/boop.mp3');
		boop.playbackRate = 0.5;
		boop.volume = 0.1;
		
		that.update = function (interval) {
			if (!that.enabled) return;
			
			that.constructor.prototype.update.call(that, interval);
			
			// quick and dirty gravity
			// that.velocity.y += 400*interval;
		};
		
		that.draw = function () {
			if (!that.enabled) return;
			
			ctx.beginPath();
			ctx.arc(that.position.x, that.position.y, that.width/2, 0, Math.PI * 2);
			ctx.fillStyle = 'white';
			ctx.fill();
		};
		
		that.onCollision = function (collidable, escapeVector) {
			if (collidable instanceof exports.Wall) {
				beep.replay();
				that.position.add(escapeVector);
				that.velocity = that.velocity.reflected(escapeVector.normalized());
			}
			
			if (collidable instanceof exports.Paddle) {
				that.position.add(escapeVector);
				
				boop.replay();
				
				// this is a bit cheating, but since we know that the paddle's boundary is an AABB, then the normalized escape vector is also the surface normal
				var surfaceNormal = escapeVector.normalized();
				
				if (Math.abs(surfaceNormal.x) > Math.abs(surfaceNormal.y)) {
					// if the surface normal is horizontal, it means the ball hit one of the vertical faces of the paddle (although possibly the back face...)
					
					var t = that.position.y - collidable.position.y;
					// -1 ... 1
					t /= (collidable.height + that.height) / 2;
					var accuracy = 1 - Math.abs(t);
					// add a bit of randomness
					t += Math.randRange(-0.1, 0.1);
					
					var bounceAngle = t * 60;
					
					var ballSpeed = that.velocity.length();
					that.velocity.x = Math.cos(bounceAngle * Math.PI/180) * ballSpeed * surfaceNormal.x;
					that.velocity.y = Math.sin(bounceAngle * Math.PI/180) * ballSpeed;
				} else {
					// bounce normally
					boop.replay();
					that.velocity = that.velocity.reflected(surfaceNormal);
				}
			}
		};
	};
	exports.Ball.prototype = new exports.Entity();
	
	exports.Points = function (ctx) {
		var that = this;
		
		that.position = new ENGINE.Vector2();
		that.velocity = new ENGINE.Vector2();
		that.boundary = new ENGINE.AABB();
		
		// irrelevant
		that.width = 1;
		that.height = 1;
		
		that.baseValue = 0;
		that.multiplier = 0;
		that.alignment = 'left';
		
		var FADE_DURATION = 1.5, fadeDurationElapsed;
		
		that.initialize = function () {
			fadeDurationElapsed = 0;
		};
		
		that.update = function (interval) {
			if (fadeDurationElapsed < FADE_DURATION) {
				fadeDurationElapsed += interval;
				
				// float up
				that.position.y -= 20 * interval;
			}
		};
		
		that.draw = function () {
			ctx.textAlign = that.alignment;
			ctx.fillStyle = 'rgba(255, 255, 255, ' + (1 - fadeDurationElapsed/FADE_DURATION) + ')';
			ctx.font = 'bold 18px monospace';
			ctx.fillText(that.baseValue.withCommas() + '×' + that.multiplier.withCommas(), that.position.x, that.position.y);
		};
		
		that.initialize();
	};
	exports.Ball.prototype = new exports.Entity();
	
	exports.Token = function (ctx, points, game) {
		var that = this;
		
		that.position = new ENGINE.Vector2();
		that.velocity = new ENGINE.Vector2();
		that.boundary = new ENGINE.AABB();
		that.width  = 50;
		that.height = 50;
		
		var sprite = new Image();
		sprite.src = 'images/cherries.png';
		var aspectRatio = sprite.width/sprite.height;
		sprite.width *= 4;
		sprite.height = sprite.width/aspectRatio;
		
		var chaChing = new Audio('sounds/cha-ching.mp3');
		chaChing.volume = 0.1;
		
		that.draw = function () {
			ctx.drawImage(sprite, that.position.x - sprite.width/2, that.position.y - sprite.height/2, sprite.width, sprite.height);
		};
		
		that.onCollision = function (collidable) {
			if (collidable instanceof exports.Ball) {
				chaChing.replay();
				
				points.initialize();
				points.baseValue = 100;
				points.multiplier = 1;
				points.alignment = 'center';
				points.position.x = that.position.x;
				points.position.y = that.position.y;
				
				game.score += points.baseValue * points.multiplier;
				
				// temp!! move to random location
				that.position.x = Math.randRange(100, ctx.canvas.width-100);
				that.position.y = Math.randRange(100, ctx.canvas.height-100);
			}
		};
	};
	exports.Token.prototype = new exports.Entity();
	
	return exports;
}());

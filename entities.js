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
		
		that.position = new ENGINE.Vector2();
		that.velocity = new ENGINE.Vector2();
		that.boundary = new ENGINE.AABB();
		that.width = that.height = 20;
		
		that.update = function (interval) {
			that.constructor.prototype.update.call(that, interval);
			
			// quick and dirty gravity
			that.velocity.y += 400*interval;
		};
		
		that.draw = function () {
			ctx.beginPath();
			ctx.arc(that.position.x, that.position.y, that.width/2, 0, Math.PI * 2);
			ctx.fillStyle = 'white';
			ctx.fill();
		};
		
		that.onCollision = function (collidable, escapeVector) {
			if (collidable instanceof exports.Wall) {
				that.position.add(escapeVector);
				that.velocity = that.velocity.reflected(escapeVector.normalized());
			}
			
			if (collidable instanceof exports.Paddle) {
				that.position.add(escapeVector);
				that.velocity = that.velocity.reflected(escapeVector.normalized());
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
		
		var FADE_DURATION = 1.1, fadeDurationElapsed;
		
		that.initialize = function () {
			fadeDurationElapsed = 0;
		};
		
		that.update = function (interval) {
			if (fadeDurationElapsed < FADE_DURATION) {
				fadeDurationElapsed += interval;
				
				// float up
				that.position.y -= 25 * interval;
			}
		};
		
		that.draw = function () {
			ctx.textAlign = 'center';
			ctx.fillStyle = 'rgba(255, 255, 255, ' + (1 - fadeDurationElapsed/FADE_DURATION) + ')';
			ctx.font = 'bold 18px monospace';
			ctx.fillText(that.baseValue + '×' + that.multiplier, that.position.x, that.position.y);
		};
		
		that.initialize();
	};
	exports.Ball.prototype = new exports.Entity();
	
	return exports;
}());

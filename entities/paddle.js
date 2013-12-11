var ENTITIES = (function (my) {
	my.Paddle = function (ctx) {
		var that = this;
		
		var bounceOffset = new my.Tween(ENGINE.tweens.easeOutElastic, 0, 0, 3);
		
		that.position = new ENGINE.Vector2();
		that.velocity = new ENGINE.Vector2();
		
		that.width = 8;
		
		that.boundary = new ENGINE.AABB(
			that.position.x - that.width/2,
			that.position.y - CONFIG.paddleHeight/2,
			that.width,
			CONFIG.paddleHeight
		);
		
		that.initialize = function () {
			bounceOffset.initialize();
			bounceOffset.end();
		};
		
		that.update = function (deltaTime) {
			bounceOffset.update(deltaTime);
			
			that.position.add(that.velocity.multipliedBy(deltaTime));
			that.boundary.centerAt(that.position);
		};
		
		that.draw = function () {
			ctx.fillStyle = 'white';
			ctx.fillRect(that.position.x - that.width/2 + bounceOffset.currentValue, that.position.y - CONFIG.paddleHeight/2, that.width, CONFIG.paddleHeight);
		};
		
		that.moveTo = function (y) {
			that.position.y = y;
			that.boundary.centerAt(that.position);
		};
		
		that.onCollision = function (collidable, escapeVector) {
			if (collidable instanceof my.Wall) {
				that.position.add(escapeVector);
				that.boundary.centerAt(that.position);
			}
			
			if (collidable instanceof my.Ball) {
				bounceOffset.startValue = escapeVector.normalized().x * -3;
				bounceOffset.initialize();
			}
		};
	};
	
	return my;
}(ENTITIES || {}));

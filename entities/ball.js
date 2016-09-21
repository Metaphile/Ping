var ENTITIES = (function (my) {
	my.Ball = function (ctx) {
		var that = this;
		
		that.position = new ENGINE.Vector2();
		that.velocity = new ENGINE.Vector2();
		
		that.boundary = new ENGINE.AABB(
			that.position.x - CONFIG.ballRadius,
			that.position.y - CONFIG.ballRadius,
			CONFIG.ballRadius*2,
			CONFIG.ballRadius*2
		);
		
		// var beep = new Audio('sounds/boop.ogg');
		// beep.volume = 0.1;
		// var boop = new Audio('sounds/boop.ogg');
		// boop.playbackRate = 0.5;
		// boop.volume = 0.1;
		
		that.initialize = ENGINE.noop;
		
		that.update = function (deltaTime) {
			that.position.add(that.velocity.multipliedBy(deltaTime));
			that.boundary.centerAt(that.position);
		};
		
		that.draw = function () {
			ctx.beginPath();
			ctx.arc(that.position.x, that.position.y, CONFIG.ballRadius, 0, Math.PI * 2);
			
			ctx.strokeStyle = 'gray';
			ctx.lineWidth = 2;
			ctx.stroke();
			
			ctx.fillStyle = 'white';
			ctx.fill();
		};
		
		that.onCollision = function (collidable, escapeVector) {
			if (collidable instanceof my.Wall) {
				// beep.replay();
				
				that.position.add(escapeVector);
				that.boundary.centerAt(that.position);
				
				// this is a bit cheating, but since we know that the collidable's boundary is an AABB, then the normalized escape vector is also the surface normal
				var surfaceNormal = escapeVector.normalized();
				that.velocity = that.velocity.reflectedAbout(surfaceNormal);
			}
			
			if (collidable instanceof my.Paddle) {
				// boop.replay();
				
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
					// boop.replay();
					that.velocity = that.velocity.reflectedAbout(surfaceNormal);
				}
			}
		};
	};
	
	return my;
}(ENTITIES || {}));

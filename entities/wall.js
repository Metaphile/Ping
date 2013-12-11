var ENTITIES = (function (my) {
	my.Wall = function (ctx, left, top, width, height) {
		var that = this;
		
		that.boundary = new ENGINE.AABB(left, top, width, height);
		
		that.initialize = ENGINE.noop;
		
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
	
	return my;
}(ENTITIES || {}));

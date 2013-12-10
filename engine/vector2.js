var ENGINE = (function (my) {
	function Vector2(x, y) {
		this.x = x || 0;
		this.y = y || 0;
	}
	
	Vector2.prototype.inverted = function () {
		return new Vector2(-this.x, -this.y);
	};
	
	Vector2.prototype.add = function (vector) {
		this.x += vector.x;
		this.y += vector.y;
	};
	
	Vector2.prototype.length = function () {
		return Math.sqrt(this.x*this.x + this.y*this.y);
	};
	
	Vector2.prototype.angle = function () {
		return Math.atan2(this.y, this.x);
	};
	
	Vector2.prototype.difference = function (vector) {
		return new Vector2(this.x - vector.x, this.y - vector.y);
	};
	
	Vector2.prototype.dot = function (vector) {
		return this.x*vector.x + this.y*vector.y;
	};
	
	Vector2.prototype.normalized = function () {
		var length = this.length();
		if (length === 0) return new Vector2(0, 0);
		else return new Vector2(this.x / length, this.y / length);
	};
	
	Vector2.prototype.multipliedBy = function (scalar) {
		return new Vector2(this.x * scalar, this.y * scalar);
	};
	
	Vector2.prototype.reflectedAbout = function (normal) {
		return this.difference(normal.multipliedBy(2 * this.dot(normal)));
	};
	
	// useful for debugging
	Vector2.prototype.draw = function (ctx, fromX, fromY) {
		fromX = fromX || 0;
		fromY = fromY || 0;
		var toX = fromX + this.x;
		var toY = fromY + this.y;
		
		if (this.length() == 0) return;
		
		ctx.beginPath();
		
		// arrow body
		ctx.moveTo(fromX, fromY);
		ctx.lineTo(toX, toY);
		
		// arrow head
		var HEAD_SIZE = 16;
		var HEAD_POINTINESS = Math.PI/6;
		var vectorAngle = this.angle();
		ctx.moveTo(toX, toY);
		ctx.lineTo(toX - HEAD_SIZE*Math.cos(vectorAngle - HEAD_POINTINESS), toY - HEAD_SIZE*Math.sin(vectorAngle - HEAD_POINTINESS));
		ctx.moveTo(toX, toY);
		ctx.lineTo(toX - HEAD_SIZE*Math.cos(vectorAngle + HEAD_POINTINESS), toY - HEAD_SIZE*Math.sin(vectorAngle + HEAD_POINTINESS));
		
		ctx.lineWidth = 1;
		ctx.strokeStyle = 'darkorange';
		ctx.stroke();
	};
	
	my.Vector2 = Vector2;
	
	return my;
}(ENGINE || {}));

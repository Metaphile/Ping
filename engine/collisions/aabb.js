var ENGINE = (function (my) {
	'use strict';
	
	// axis-aligned bounding box
	function AABB(left, top, width, height) {
		var that = this;
		
		that.left   = left;
		that.top    = top;
		that.width  = width;
		that.height = height;
		
		// if line segments A and B are overlapping, return the 1-dimensional vector that will most efficiently clear A from B
		// otherwise return false
		function escapeVector(a1, a2, b1, b2) {
			// get the center points
			var ac = (a1 + a2) / 2;
			var bc = (b1 + b2) / 2;
			
			// get the "radii"
			var ar = (a2 - a1) / 2;
			var br = (b2 - b1) / 2;
			
			// get the difference between the center points
			var d = bc - ac;
			
			// if the distance between the center points is greater than the sum of the radii, the line segments are not touching
			var dm = Math.abs(d);
			if (dm > ar + br) return false;
			
			// get the normalized difference between the center points
			// if the difference is 0, default to 1
			var dn = (dm != 0 ? d / dm : 1);
			
			// return the difference scaled to the amount of overlap
			return dn * (dm - (ar + br));
		}
		
		that.test = function (other) {
			var xev = escapeVector(that.left, that.left + that.width,  other.left, other.left + other.width);
			var yev = escapeVector(that.top,  that.top  + that.height, other.top,  other.top  + other.height);
			// no collision
			if (xev === false || yev === false) return false;
			
			if (Math.abs(xev) < Math.abs(yev)) yev = 0;
			else xev = 0;
			
			// ADD this vector to That's position to clear it from Other
			return new my.Vector2(xev, yev);
		};
		
		that.draw = function (ctx) {
			ctx.beginPath();
			
			ctx.rect(that.left, that.top, that.width, that.height);
			
			ctx.lineWidth = 1;
			ctx.strokeStyle = 'red';
			ctx.stroke();
		};
		
		that.centerAt = function (position) {
			that.left = position.x - that.width/2;
			that.top  = position.y - that.height/2;
		};
	};
	
	my.AABB = AABB;
	return my;
}(ENGINE || {}));

var ENTITIES = (function (my) {
	my.Points = function (ctx) {
		var that = this;
		
		that.position = new ENGINE.Vector2();
		that.velocity = new ENGINE.Vector2();
		
		that.value = 0;
		
		var FADE_DURATION = 1.7, fadeDurationElapsed;
		// for pop up animation
		var verticalOffset;
		
		that.initialize = function () {
			fadeDurationElapsed = 0;
			verticalOffset = 0;
		};
		
		that.update = function (deltaTime) {
			if (fadeDurationElapsed < FADE_DURATION) {
				fadeDurationElapsed += deltaTime;
				
				// pop up
				verticalOffset = ENGINE.tweens.easeOutElastic(null, fadeDurationElapsed, 0, -20, 1);
			}
		};
		
		that.draw = function () {
			ctx.textAlign = 'center';
			ctx.font = 'bold 18px monospace';
			
			var text = '$' + that.value.withCommas();
			var opacity = 1 - Math.pow(fadeDurationElapsed/FADE_DURATION, 2);
			
			// black outline
			ctx.strokeStyle = 'rgba(0, 0, 0, ' + opacity + ')';
			ctx.lineWidth = 4;
			ctx.strokeText(text, that.position.x, that.position.y + verticalOffset);
			
			// yellow glow
			ctx.strokeStyle = 'rgba(255, 255, 127, ' + opacity + ')';
			ctx.lineWidth = 2;
			ctx.strokeText(text, that.position.x, that.position.y + verticalOffset);
			
			ctx.fillStyle = 'rgba(255, 255, 255, ' + opacity + ')';
			ctx.fillText(text, that.position.x, that.position.y + verticalOffset);
		};
		
		that.initialize();
	};
	
	return my;
}(ENTITIES || {}));

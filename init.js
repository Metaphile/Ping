window.onload = function () {
	'use strict';
	
	ENTITIES.loadImagesThen(function () {
		// continue initializing the game
		
		var ctx = document.getElementById('canvas1').getContext('2d');
		// retro!
		ctx.imageSmoothingEnabled = false;
		
		var input = {};
		input.keyboard = new ENGINE.Keyboard(document);
		input.mouse = new ENGINE.Mouse(document);
		input.gamepad = new ENGINE.Gamepad(0);
		
		var game = new GAME.Game(input, ctx);
		
		// start main loop
		var then = performance.now();
		function step(now) {
			// seconds
			var deltaTime = (now - then) / 1000;
			then = now;
			
			requestAnimationFrame(step);
			
			input.gamepad.poll();
			game.update(deltaTime * CONFIG.timeScale);
			
			ctx.clear();
			game.draw();
		}
		
		requestAnimationFrame(step);
	});
};

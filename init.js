window.onload = function () {
	'use strict';
	
	ASSETS.loadImages({
		cherries: 'images/cherries.png',
		bananas: 'images/bananas.png'
	}, function (images) {
		// when *all* images are loaded, store them in the assets module for convenience
		ASSETS.images = images;
		
		// continue initializing the game
		
		var ctx = document.getElementById('canvas1').getContext('2d');
		// retro!
		ctx.imageSmoothingEnabled = false;
		
		var input = {};
		input.keyboard = new ENGINE.Keyboard(document);
		input.mouse = new ENGINE.Mouse(ctx.canvas);
		input.gamepad = new ENGINE.Gamepad(0);
		
		var game = new GAME.Game(input, ctx);
		
		// start main loop
		var then = performance.now();
		function step(now) {
			// seconds
			var interval = (now - then) / 1000;
			then = now;
			
			requestAnimationFrame(step);
			
			input.gamepad.poll();
			game.update(interval);
			
			ctx.clear();
			game.draw();
		}
		
		requestAnimationFrame(step);
	});
};

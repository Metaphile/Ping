window.onload = function () {
	'use strict';
	
	var ctx = document.getElementById('canvas1').getContext('2d');
	
	var input = {};
	input.keyboard = new ENGINE.Keyboard(document);
	input.mouse = new ENGINE.Mouse(ctx.canvas);
	
	var game = new GAME.Game(input, ctx);
	
	// start main loop
	var then = performance.now();
	function step(now) {
		// seconds
		var interval = (now - then) / 1000;
		then = now;
		
		requestAnimationFrame(step);
		
		game.update(interval);
		
		ctx.clear();
		game.draw();
	}
	
	requestAnimationFrame(step);
};

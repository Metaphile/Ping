CONFIG = (function () {
	'use strict';
	
	return {
		timeScale: 1,
		paddleHeight: 80,
		ballRadius: 12,
		ballSpeed: 400,
		multiplierTimeout: 3.5,
		numCherryTokens: 9,
		numBananaTokens: 3,
		// should return a number between -1 and 1
		thumbstickCurve: function (x) { return x * Math.abs(x); }
	};
}());

var ENGINE = (function (my) {
	'use strict';
	
	// clear a possibly transformed canvas
	// http://stackoverflow.com/a/9722502/40356
	CanvasRenderingContext2D.prototype.clear = function () {
		this.save();
		this.setTransform(1, 0, 0, 1, 0, 0);
		this.clearRect(0, 0, this.canvas.width, this.canvas.height);
		this.restore();
	};
	
	Math.randRange = function (min, max) {
		return min + (Math.random() * (max - min));
	};
	
	Audio.prototype.replay = function () {
		// sooo temp
		// don't play sounds if mute is checked
		// if (document.getElementById('mute').checked) return;
		
		this.pause();
		this.currentTime = 0;
		this.play();
	};
	
	// http://stackoverflow.com/q/2901102/40356
	// does not work reliably with floats!
	Number.prototype.withCommas = function numberWithCommas(x) {
		return this.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
	};
	
	my.noop = function () {};
	
	my.tweens = {};
	
	// http://easings.net/
	my.tweens.easeOutElastic = function (x, t, b, c, d) {
		var s=1.70158;var p=0;var a=c;
		if (t==0) return b;  if ((t/=d)==1) return b+c;  if (!p) p=d*.3;
		if (a < Math.abs(c)) { a=c; var s=p/4; }
		else var s = p/(2*Math.PI) * Math.asin (c/a);
		return a*Math.pow(2,-10*t) * Math.sin( (t*d-s)*(2*Math.PI)/p ) + c + b;
	};
	
	my.Dictionary = function () {
		var that = this;
		var keys   = [];
		var values = [];
		
		that.set = function (key, value) {
			var keyIndex = keys.indexOf(key);
			// if key is new, append to keys array
			// push returns new length, so push() - 1 = new index
			if (keyIndex === -1) keyIndex = keys.push(key) - 1;
			values[keyIndex] = value;
		};
		
		that.get = function (key) {
			return values[keys.indexOf(key)];
		};
		
		var forEachCallback;
		
		function callForEachCallback(key, keyIndex) {
			forEachCallback(values[keyIndex], key);
		}
		
		that.forEach = function (callback) {
			forEachCallback = callback;
			keys.forEach(callForEachCallback);
		};
	};
	
	return my;
}(ENGINE || {}));

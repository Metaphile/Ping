var ENTITIES = (function (my) {
	'use strict';
	
	var exports = {};
	
	my.loadImagesThen = function (onLoaded) {
		var paths = {
			cherries: 'images/cherries.png',
			bananas: 'images/bananas.png'
		};
		
		var images = {};
		
		// every time an image loads, check whether *all* images are loaded
		function checkIfDone() {
			for (var name in images) {
				// skip inherited properties
				if (!images.hasOwnProperty(name)) continue;
				// at least one image isn't loaded; keep waiting
				if (!images[name].complete) return;
			}
			
			// if we made it this far, we're done
			my.images = images;
			onLoaded();
		}
		
		// first, create an empty image object for each path
		for (var name in paths) {
			if (!paths.hasOwnProperty(name)) continue;
			images[name] = new Image();
		}
		
		// then, register a load event handler and start loading
		for (var name in images) {
			if (!images.hasOwnProperty(name)) continue;
			images[name].onload = checkIfDone;
			images[name].src = paths[name];
		}
		
		// I've read that if the images are cached, the load event won't fire
		checkIfDone();
	};
	
	my.Tween = function (tweeningFunction, startValue, endValue, duration) {
		var that = this;
		var elapsed;
		
		that.startValue   = startValue;
		that.endValue     = endValue;
		
		that.initialize = function () {
			elapsed = 0;
			that.currentValue = that.startValue;
		};
		
		that.update = function (deltaTime) {
			elapsed = Math.min(elapsed + deltaTime, duration);
			that.currentValue = that.startValue + (tweeningFunction(null, elapsed, 0, 1, duration) * (that.endValue - that.startValue))
		};
		
		that.end = function () {
			that.update(duration);
		};
		
		that.initialize();
	};
	
	return my;
}(ENTITIES || {}));

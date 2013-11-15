var ASSETS = (function () {
	var exports = {};
	
	// paths = { name: 'path' ... }
	exports.loadImages = function (paths, onLoadAll) {
		var images = {};
		
		// every time an image loads, check whether *all* images are loaded
		function onLoadAny() {
			for (var name in images) {
				if (!images.hasOwnProperty(name)) continue;
				// at least one image isn't loaded; keep waiting
				if (!images[name].complete) return;
			}
			
			onLoadAll(images);
		}
		
		// first, create an empty image object for each path
		for (var name in paths) {
			if (!paths.hasOwnProperty(name)) continue;
			images[name] = new Image();
		}
		
		// then, register a load event handler and start loading
		for (var name in images) {
			if (!images.hasOwnProperty(name)) continue;
			images[name].onload = onLoadAny;
			images[name].src = paths[name];
		}
		
		// I've read that if the images are cached, the load event won't fire
		onLoadAny();
	};
	
	return exports;
}());

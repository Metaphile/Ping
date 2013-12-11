var ENGINE = (function (my) {
	'use strict';
	
	function identity(x) { return x; }
	
	function streamify(f) {
		// looks like a stream; don't rewrap
		if (f && 'or' in f && 'then' in f) return f;
		
		f = f || identity;
		var children = [];
		
		function stream(/* ... */) {
			var value = f.apply(f, arguments);
			
			if (typeof value !== 'undefined') {
				for (var i = 0, n = children.length; i < n; i++) children[i](value);
				
				// save for later
				stream.value = value;
				
				return value;
			}
		}
		
		stream.then = function (g) {
			g = streamify(g);
			children.push(g);
			return g;
		};
		
		stream.or = function (g, operator) {
			g = streamify(g);
			operator = operator || identity;
			var merged = streamify();
			
			stream.then(function (value) { return operator(value, g.value); }).then(merged);
			g.then(function (value) { return operator(value, stream.value); }).then(merged);
			
			return merged;
		};
		
		return stream;
	}
	
	my.streamify = streamify;
	return my;
}(ENGINE || {}));

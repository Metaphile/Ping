var ENGINE = (function (my) {
	'use strict';
	
	function Mouse(domNode) {
		var that = this;
		
		that.move = my.streamify(function (event) {
			event.offsetX = event.offsetX || event.layerX;
			event.offsetY = event.offsetY || event.layerY;
			
			event.movementX = event.movementX || event.webkitMovementX || event.mozMovementX || 0;
			event.movementY = event.movementY || event.webkitMovementY || event.mozMovementY || 0;
			
			return event;
		});
		
		that.down = my.streamify();
		
		domNode.addEventListener('mousemove', that.move);
		domNode.addEventListener('mousedown', that.down);
	};
	
	my.Mouse = Mouse;
	return my;
}(ENGINE || {}));

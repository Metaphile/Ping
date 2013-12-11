var ENTITIES = (function (my) {
	my.EntityPool = function (createEntity, count) {
		var that = this;
		
		var entities = [];
		var active = [];
		var lastChecked = count - 1;
		
		while (count--) {
			entities.push(createEntity());
			active.push(false);
		}
		
		that.initialize = function () {
			that.forEach(that.putAway);
		};
		
		that.forEach = function (visit) {
			for (var i = 0, n = entities.length; i < n; i++) {
				if (active[i]) visit(entities[i]);
			}
		};
		
		that.getNext = function () {
			for (var i = 0, n = entities.length; i < n; i++) {
				lastChecked++;
				// wrap
				if (lastChecked >= n) lastChecked = 0;
				
				if (!active[lastChecked]) {
					active[lastChecked] = true;
					entities[lastChecked].initialize();
					return entities[lastChecked];
				}
			}
			
			// uht-oh! all out of entities; recycle the oldest entity
			lastChecked++;
			if (lastChecked >= entities.length) lastChecked = 0;
			active[lastChecked] = true;
			entities[lastChecked].initialize();
			return entities[lastChecked];
		};
		
		that.putAway = function (entity) {
			var i = entities.indexOf(entity);
			if (i > -1) active[i] = false;
		};
		
		that.update = function (deltaTime) {
			that.forEach(function (entity) { entity.update(deltaTime); });
		};
		
		that.draw = function () {
			that.forEach(function (entity) { entity.draw(); });
		};
		
		that.initialize();
	};
	
	return my;
}(ENTITIES || {}));

var ENGINE = (function (my) {
	'use strict';
	
	function State() {
		this.onEnter = my.noop;
		this.onExit  = my.noop;
	};
	
	function StateMachine() {
		var that = this;
		
		that.states = { base: new State() };
		that.currentState = that.states.base;
		
		that.changeState = function (newState) {
			that.currentState.onExit();
			that.currentState = newState;
			that.currentState.onEnter();
		};
	};
	
	my.createStateMachine = function (properties, proxy) {
		var stateMachine = new StateMachine();
		
		properties.forEach(function (property) {
			stateMachine.states.base[property] = my.noop;
			
			Object.defineProperty(proxy, property, {
				get: function () { return stateMachine.currentState[property] },
				set: function (value) { stateMachine.currentState[property] = value; }
			});
		});
		
		return stateMachine;
	};
	
	return my;
}(ENGINE || {}));

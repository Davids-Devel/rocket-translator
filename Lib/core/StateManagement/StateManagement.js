/**
 * State Management Base Class
 * 
 * Class that manage HTML String and get all data from these
 */
class StateManagement {
	constructor(){
		//Initialize Data arrays
		this.states = new Array();
		this.computed = new Array();
		this.methods = new Array();
		this.components = new Array();
		this.watchers = new Array();
		this.props = new Array();
		this.inputs = false;
		this.cond = new Array();
		this.loops = new Array();

		this._expState = /^\w*\s\-\sstate$/g; //RegExp to get State With Declaration
		this._expStateValue = /^\w*\s\-\sstate\s\-\s.*$/g; //RegExp to get State With Value
		this._expComputed = /^\w*\s\-\scomputed/g; //RegExp to get Computed Methods
		this._expProps = /^\w*\s\-\sprop/g; //RegExp to get Props

	}

	//--------------- Public Methods -----------------

	/**
	 * Get States, Computed, Methods and Components
	 * 
	 * @public
	 * @param {string} html
	 */
	getHTMLString(html){
		//Reset Data Arrays
		this.states = [];
		this.computed = []; 
		this.methods = []; 
		this.components = [];
		this.watchers = [];
		this.props = [];
		this.cond = [];
		this.loops = [];
		this._setDataFromHTML(html); //Call Method to Get Data from HTML String
		this._setMethods(html); //Call Method to Get Data from HTML String
	}
	/**
	 * Get Js Data
	 * 
	 * Get Js Methods from the Js File and Set to Methods Contents
	 * 
	 * @public
	 * @param {Array} JSParsed JS Content Array From JS Parser
	 * @param {String} type This Can Be 'v' or 'r'
	 */
	getJsData(JSParsed, type) {
		if (JSParsed.length > 0) {
			this._filterJS(JSParsed, type).forEach(e=>{
				this.methods.forEach((ev, i)=>{	
					if (e.funcName === ev.name) {
						this.methods[i].content = e.content;
					}
				})
				this.computed.forEach((ev, i)=>{
					if (e.name === ev.name) {
						this.computed[i].content = e.content;
					}
				})
			});
		}
	}
	/**
	 * Set States
	 * 
	 * Get States from JS Parsed and set to Component States
	 * 
	 * @public
	 * @param {Array} statesArray Array with all states from JS Parser
	 */
	setStates(statesArray){
		if (statesArray) {
			//Map State Array
			statesArray.forEach(e=>{
				if (typeof e === "object"){
					//If is not an Array or an Object
					if (!e.value.startsWith("{") && !e.value.startsWith("[")) {
						e.value = e.value.replace(/"/g, "'").replace(/'/g, ""); //Delete quotes to get Type
					}
					e.value = this._defineTypeFromString(e.value); //Get Type
				}
				this.states.push(e); //Push To Component States
			})
		}
	}
	/**
	 * Set State Watcher
	 * 
	 * Get State Watchers from JS Parsed and set to Component Watchers
	 * 
	 * @public
	 * @param {Array} watchersArray 
	 */
	setStateWatchers(watchersArray){
		if (watchersArray) {
			this.watchers = watchersArray;
		}
	}
	/**
	 * Set Vars
	 * 
	 * Get Vars from JS Parsed and set the value in the corresponding state
	 * 
	 * @public
	 * @param {Array} VarsArray 
	 */
	setVars(VarsArray){
		//Map Vars Array
		VarsArray.forEach(e=>{
			//Map States, Get index, and replace whit the new value
			this.states.forEach((ev, i)=>{
				if (typeof ev === "object") {
					//If match replace the corresponding state
					if (ev.value === e.name) {
						this.states[i].value = this._defineTypeFromString(e.value);
					}
				} else {
					//If match replace the corresponding state
					if (ev === e.name) {
						this.states[i] = {
							key:ev,
							value: this._defineTypeFromString(e.value)
						}
					}
				}
			})
		})
	}

//------------------------------------------------------------------------------
	/*Internal Methods*/
	
	/**
	 * Convert an Object to String and add new lines and indents to code beauty
	 * 
	 * @protected
	 * @param {Object} json
	 * @return {String}
	 */
	_JSONPrettify(json){
		let jsonToString = JSON.stringify(json); //Convert to String
		let quoteMatch = jsonToString.match(/\"\w*\"(?=\:)/g); //Get Object keys
		quoteMatch.forEach(e=>{
			//Add indents and delete quotes in state keys
			jsonToString = jsonToString.replace(e, `\t\t\t${e.slice(1, e.length-1)}`);
		})
		//Return JSON Prettify
		return jsonToString.replace(/\{/g, "{\n")
			.replace(/\,(?=(\t)*\w*:)/g, ",\n")
			.replace(/}/g, "\n\t\t\t}")
			.replace(/}$/g, "\n\t\t}")
			.replace(/:(?=\"|\d|true|false|\{|\[)/g, ": ");
	}
	/**
	 * Get All Data From HTML
	 * 
	 * @private
	 * @param {string} html
	 */
	_setDataFromHTML(html){

		this._setComponents(html); //Get Components

		this._setInputs(html); //Get Inputs, Textarea and Options

		this._setConditionals(html); //Get conditionals Data

		this._setLoops(html); //Get Loops Data

		/*
			Get all data that was be declared with "{Name - Type}" format.
		*/
		let _getBarsMatches = html.split("{").map(e=>{
			let match = e.match(/.*(?=\})/g); //Get All that continue with "}" 

			if(match) return match[0];
		}).filter(a=>{
			//Filter the undefined values
			if (a) return a
		})

		if (_getBarsMatches) {
			this._setStates(_getBarsMatches); //Get States
			this._setComputed(_getBarsMatches); //Get Computed Methods 
			this._setProps(_getBarsMatches); //Get Props
		}	
	}
	/**
	 * Get Component Name And Data
	 * 
	 * @private
	 * @param {string} html 
	 */
	_setComponents(html){
		let _matchComponents = html.match(/\<([A-Z]\w*).*\/\>/g); //Match Components
		if (_matchComponents) {
			_matchComponents.forEach(e=>{
				let name = e.match(/[A-Z]\w*/g)[0]; //Get Component Name
				let bindData = e.match(/\:\w*\=(\'|\")\w*(\'|\")/g); //Get Bind Prop Data
				let bindDataValue = e.match(/\:\w*\=(\'|\")\w*\s\-\s('|")\w*('|")(\'|\")/g); //Get Bind Prop Data and Value
				if (bindData) {
					this.states.push(bindData[0].replace(/'|"/g, "").slice(1).split("=")[1]); //Push Bind Data to States
				}
				if(bindDataValue){
					let dataArray = bindDataValue[0].split('='); //Get Data Array
					let keyValue = dataArray[1].split(' - '); //Split Key And Value
					let key = keyValue[0].slice(1); //Set Key Name
					let value = this._defineTypeFromString(keyValue[1].slice(0, keyValue[1].length - 1)); //Get Type of Value and Set it
					this.states.push({key, value}); //Push Bind Data With Value to States
				}
				this.components.push(name); //Push Component Name
			})
		}
	}
	/**
	 * Get Computed Methods from the data Array
	 * 
	 * @private
	 * @param {array} dataArray Array With All Data
	 */
	_setComputed(dataArray){
		let _getComputed=[]; //Declare Empty Array
		//Map Array to get computed methods
		dataArray.forEach(e=>{
			//If Match push to empty array
			if (e.match(this._expComputed)) {
				//This must match something like: {Name - computed}
				_getComputed.push(e.match(this._expComputed)[0]);
			}
		})
		//If have matched computed push to Component Computed
		if (_getComputed.length > 0) {
			_getComputed.forEach(e=>{
				this.computed.push({
					name:e.match(/^\w*/g)[0],
					content:"{\n\t\t\treturn 'Hello World'\n\t\t}"
				});
			});
		}
	}
	/**
	 * Get State From Data Array
	 * 
	 * @private
	 * @param {array} dataArray 
	 */
	_setStates(dataArray){
		/* 
			Capture State Without Value and push to Empty Array
		*/
		let _getState = []; //Declare Empty Array to State With Declaration: {name - state}
		dataArray.forEach(e=>{
			if(e.match(this._expState)){
				_getState.push(e.match(this._expState)[0]);
			}
		});
		/* 
			Capture State With Value and Instance and push to Empty Array
		*/		
		let _getStateWithValue = []; //Declare Empty Array to State With Value: {name - state - someValue}
		dataArray.forEach(e=>{
			if (e.match(this._expStateValue)) {
				_getStateWithValue.push(e.match(this._expStateValue)[0]);
			}
		});

		//If State With Declaration, Map and Push to Component States
		if (_getState.length > 0){
			_getState.forEach(e=>{
				let _keyMatch = e.match(/^\w*/g); //Get State Name
				this.states.push(_keyMatch[0]);
			});
		}

		//If State With Value, Map and Push to Component States
		if (_getStateWithValue) {
			_getStateWithValue.forEach(e=>{
				let _getKey = e.match(/^\w*\s/);
				let value = this._defineTypeFromString(e.match(/(\w*|\{.*\}|\[.*\]|(\'|\")\w*(\'|\"))$/)[0]); //Set Value
				let key = _getKey[0].slice(0, _getKey[0].length-1); //Set Key
				this.states.push({key, value });
			});
		}
	}
	/**
	 * Get Methods from HTML String
	 * 
	 * Map and get all HTML events attr like onclick, onsubmit, etc.
	 * 
	 * @private
	 * @param {string} html HTML String
	 */
	_setMethods(html){
		let events = html.match(/on\w*=(\"|\')\w*\(\)(\"|\')/g); //Match RegExp
		if (events) {
			events.forEach(e=>{
				let split = e.split("=");
				this.methods.push({
					name:split[1].slice(1, split[1].length - 1),/*Get Method Name*/
					content:"{\n\t\treturn\n\t}" /*Default Value If methods is not declared*/
				});
			});
		}
	}
	/**
	 * Get Props From Data Array
	 * 
	 * @private
	 * @param {Array} dataArray 
	 */
	_setProps(dataArray){
		//Map Array
		dataArray.forEach(e=>{
			//If Match Add Prop Name to Props
			if (e.match(this._expProps)) {
				this.props.push(e.replace(/\s-\s\w*/g, ""));
			}
		})
	}
	/**
	 * Get Input, Textarea and Option Tags from HTML String
	 * 
	 * @private
	 * @param {string} html 
	 */
	_setInputs(html) {
		//Match Tags
		let inputs = html.match(/<(input|select|textarea).*(\/\>|\>)/g);
		if (inputs) {
			//Map Matches Tags
			inputs.forEach(e=>{
				//If the tag have the attr "name" set an input handler
				let name = e.match(/name=('|")\w*('|")/g)[0];
				if (name) {
					let stateKey = name.match(/('|")\w*(?="|')/)[0].slice(1); //Get the name value to declare a state
					this.inputs = true;
					this.states.push(stateKey); //push to states
				}
			})
		}
	}
	_setConditionals(html){
		let condArray = html.split("<if ")
		.map((e, i)=>{
			if (i > 0) {
				let cond = e.match(/cond=('|").*('|")(?=.*>)/g);
				let contentIf;
				let contentElse;
				if (e) {
					cond = cond[0].replace(/cond=('|")/, "").replace(/('|")$/, "");
					contentIf = e.replace(/cond=.*>(\r|\n|\r\n)*/, "").split(/(\r|\n|\r\n)\t*<\/if>/)[0];
					contentElse = e.split(/<else>(\n|\r|\r\n)*/)[2];
					if (contentElse) {
						contentElse = contentElse.split(/(\r|\n)*<\/else>/)[0];
					}
				}
				return {
					cond,
					if:contentIf,
					else:contentElse
				}
			} else {
				return null;
			}
		})
		.filter(e=>{
			if (e) return e;
		});
		this.cond = condArray;
	}
	_setLoops(html){
		let loopsArray = html.split(/<for /)
			.map((e, i)=>{
				let data;
				if (i > 0) {
					let valueAndState = e.match(/val=('|").*(?=('|")>)/)[0];
					let valueToSetInTemplate = valueAndState.replace(/^val=('|")/, "").match(/.*(?=\sin)/)[0];
					let stateToMap = valueAndState.replace(/^.*in /, "");
					let loopContent = e.replace(/val=.*>(\n|\r|\r\n)/, "").split(/<\/for>/)[0];
					data = {
						value:valueToSetInTemplate,
						state:stateToMap,
						content:loopContent
					};
				} else {
					data = null;
				}
				return data;
			})
			.filter(e=>{
				if (e) return e;
			});
		this.loops = loopsArray;
	}
	/**
	 * Get an Object's Array with JS Data and return with Vue or React Syntax
	 * @param {Array} JsArray 
	 * @param {String} type 
	 */
	_filterJS(JsArray, type){
		//Watch if have Content
		if (JsArray.length > 0) {
			let replace; //Empty var to set state declaration
			let tab; //Empty var to set indent to code beauty
			switch (type) {
				case "r":
					replace = "this.state.";
					tab = "\t";
					break;
				case "v":
					replace = "this.";
					tab = "\t\t";
					break;
				default:
					throw new Error("The type param must be \"v\" or \"r\"");
			}
			//Map JS Content
			let JsonArray = JsArray.map(e=>{
				var data = e.content; //Asign content to var data
				/*
					Map exist state to asign the state declaration to data

					Example: If var 'name' is a state 
					On React was be: 'this.state.name' 
					and on Vue was be: 'this.name'
				*/
				this.states.forEach(state=>{
					/*If state is an Object this was be like {key:'foo', value:'var'}
						key is the state name and value is the value.

						If state is not an Object this was be like 'foo' 
						this is the state name without value
					*/
					let stateName = typeof state === "object" ? state.key : state;

					data = data
						.replace(new RegExp(`\\t(${replace+stateName}|${stateName})(?!\\(|\\s*\\(|\\.)`, "g"), "\t"+replace+stateName)
						.replace(new RegExp(`(\\(|\\(\\s*)(${replace+stateName}|${stateName})`, "g"), "("+replace+stateName)
						.replace(new RegExp(`(\\[|\\[\\s*)(${replace+stateName}|${stateName})`, "g"), "["+replace+stateName)
						.replace(new RegExp(`(\\$\\{|\\$\\{\\s*)(${replace+stateName}|${stateName})`, "g"), "${"+replace+stateName)
						.replace(new RegExp(`(=|=\\s*)(${replace+stateName}|${stateName})`, "g"), "= "+replace+stateName)
						.replace(new RegExp(`(>|>\\s*)(${replace+stateName}|${stateName})`, "g"), "> "+replace+stateName)
						.replace(new RegExp(`(<|<\\s*)(${replace+stateName}|${stateName})`, "g"), "< "+replace+stateName)
						.replace(new RegExp(`(~|~\\s*)(${replace+stateName}|${stateName})`, "g"), "~"+replace+stateName)
						.replace(new RegExp(`(\\!|\\!\\s*)(${replace+stateName}|${stateName})`, "g"), "\\! "+replace+stateName)
						.replace(new RegExp(`(:|:\\s*)(${replace+stateName}|${stateName})`, "g"), ": "+replace+stateName)
						.replace(new RegExp(`(\\?|\\?\\s*)(${replace+stateName}|${stateName})(!=.*(\\\`|\\"|\\'))`, "g"), "? "+replace+stateName)
						.replace(new RegExp(`(\\+|\\+\\s*)(${replace+stateName}|${stateName})(!=.*(\\\`|\\"|\\'))`, "g"), "+ "+replace+stateName)
						.replace(new RegExp(`(\\-|\\-\\s*)(${replace+stateName}|${stateName})(!=.*(\\\`|\\"|\\'))`, "g"), "- "+replace+stateName)
						.replace(new RegExp(`(\\*|\\*\\s*)(${replace+stateName}|${stateName})(!=.*(\\\`|\\"|\\'))`, "g"), "* "+replace+stateName)
						.replace(new RegExp(`(\\/|\\/\\s*)(${replace+stateName}|${stateName})(!=.*(\\\`|\\"|\\'))`, "g"), "/ "+replace+stateName)
						.replace(new RegExp(`(\\%|\\%\\s*)(${replace+stateName}|${stateName})(!=.*(\\\`|\\"|\\'))`, "g"), "% "+replace+stateName)
						.replace(new RegExp(`(return|return\\s*)(${replace+stateName}|${stateName})(!=.*(\\\`|\\"|\\'))`, "g"), "return "+replace+stateName)
						.replace(new RegExp(`(typeof|typeof\\s*)(${replace+stateName}|${stateName})(!=.*(\\\`|\\"|\\'))`, "g"), "typeof "+replace+stateName)
						.replace(new RegExp(`(\\&|\\&\\s*)(${replace+stateName}|${stateName})(!=.*(\\\`|\\"|\\'))`, "g"), "& "+replace+stateName)
						.replace(new RegExp(`(\\||\\|\\s*)(${replace+stateName}|${stateName})(!=.*(\\\`|\\"|\\'))`, "g"), "| "+replace+stateName)
						.replace(new RegExp(`(in|in\\s*)(${replace+stateName}|${stateName})(!=.*(\\\`|\\"|\\'))`, "g"), "in "+replace+stateName)
						.replace(new RegExp(`(case|case\\s*)(${replace+stateName}|${stateName})(!=.*(\\\`|\\"|\\'))`, "g"), "case "+replace+stateName);

				})
				return {
					funcName:e.funcName,
					name:e.name,
					params:e.params,
					content:data
						.split("\n")
						.map((es, i)=>{
							if (es && i > 0 && es != /^}(\s|\t)*$/) return tab+es+"\n"
							else if (es == /^}(\s|\t)*$/) return tab+"}"
							else return es +"\n";
						})
						.join("")
						.replace(/(\n|\r)$/g, "")
				}
			})
			return JsonArray;
		}
	}
	/**
	 * Get String Value and Parse that
	 * @param {string} string String Value
	 * @returns {any}
	 */
	_defineTypeFromString(string){
		var value; //Empty Value
		let _isString = string.match(/^(\"|\')\w*(\'|\")$/); //String Match
		let _isDigit = string.match(/^\d*$/); //Digit Match
		let _isBoolean = string.match(/(true|false)$/g); //Boolean Match
		let _isArray = string.match(/^\[.*\]$/); //Array Match
		let _isObject = string.match(/^\{(\r|\n)*((\t*).*(\r|\n*))*\}/g);
		if (_isDigit) {
			value = parseInt(_isDigit[0]); //Convert To Number
		} else if (_isBoolean){
			value = this._BooleanParser(_isBoolean[0]); //Convert To Boolean
		} else if(_isArray){
			value = this._ArrayAndObjectParser(_isArray[0]); //Map Array 
		} else if (_isObject){
			value = this._ArrayAndObjectParser(_isObject[0]); //Map Object 
		}
		else if(_isString){
			value = string.replace(/(\"|\')/g, ""); //String Value
		} else {
			//is Var
			value = string;
		}
		return value
	}
	/**
	 * Parse Boolean String
	 * 
	 * @param {string} string String Value
	 * @returns {Boolean}
	 */
	_BooleanParser(string){
		let retorno;
		switch (string){
			case "true":
				retorno = true;
				break;
			case "false":
				retorno = false;
				break;
			default:
				break;
		}
		return retorno
	}
	/**
	 * Parse Array, Object and Define Type
	 * 
	 * @param {string} string String Value
	 * @returns {Array}
	 */
	_ArrayAndObjectParser(string){
		let filtered = string;
		//If is Object, parse the content
		if(string.startsWith("{")){
			filtered = filtered
				.replace(/:/g, "\":")
				.replace(/\t(?=.*:)/g, "\t\"")
				.replace(/\t\"(?=\t\")/g, "\t")
				.replace(/,(?=\n(\t)*})/g, "");
		}
		return JSON.parse(filtered);
	}
}
module.exports = StateManagement;
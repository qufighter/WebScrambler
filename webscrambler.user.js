// This file is part of the "webscrambler" extension

var chkForNodesTimeout=0;
var observer=null;
var attrObserver=null;
var textNodeBackupProp = 'alt'; // text nodes don't have many (if any!) assignable dom-persisted properties... even alt has many exclusions it seems (within code or pre, does not work)

var scrambleText = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
// while( scrambleText.length < 65535 ){
// 	scrambleText += scrambleText;
// }
var scrambleTextLC = scrambleText.toLowerCase()
var mutationList = [];

var active=true;

var imageCssPropsWeModify={'opacity':'o', 'filter':'f' }; // still doesnt' work if opacity is dynaically set along the way (say, once image loads)... we may need to observe attribute modifications to the DOM too!


function getCssPropsWeModify(node, propsList){
	var robj={};
	var prop, propShortKey;
	for( prop in propsList ){
		robj[propsList[prop]] = node.style[prop];
	}
	return robj;
}

function resetPropertiesFromSource(validNode, sourceAttribute, propsList){
	var origProps=JSON.parse(validNode.getAttribute(sourceAttribute)) || false;
	var prop, propShortKey;
	for( prop in propsList ){
		propShortKey = propsList[prop];
		if( typeof origProps[propShortKey] != 'undefined' ) validNode.style[prop] = origProps[propShortKey];
	}
}

function resetOrigionalProperties(validNode, propsList){
	resetPropertiesFromSource(validNode, "webscramblerorigprops", propsList);
	validNode.removeAttribute("webscramblerorigprops");
}


chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
	//var m, i, l;
	if (request.restoreAllNodes){
		restoreAllNodes();
	}else if(request.restoreViewportNodes){
		restoreVpNodes();
	}else if(request.disableScan){
		if( active==false ){
			active=true;
			checkForNodes()
		}else{
			restoreAllNodes();
			active=false;
		}
	}else{
		console.log('webscrambler::unhandled message', request);
	}
});

function restoreAllNodes(){
	var nodes=document.body.querySelectorAll('*');
	for( var i=0,l=nodes.length; i<l; i++ ){
		nodes[i].removeAttribute('web-scrambler-skip');
		nodes[i].removeAttribute('web-scrambler-hover');
		unscrambleNode(nodes[i], null);
	}
}
function restoreVpNodes(){
	var nodes=document.body.querySelectorAll('*');
	for( var i=0,l=nodes.length; i<l; i++ ){
		var rect=nodes[i].getBoundingClientRect();
		// filter for viewport nodes...
		if( !(rect.x /*+ rect.width*/ < 0 || rect.y /*+ rect.height*/ < 0 || rect.x > window.innerWidth || rect.y > window.innerHeight) ){
			unscrambleNode(nodes[i], null);
			nodes[i].setAttribute('web-scrambler-skip', 'on') // TODO: fix so that this does not impact TOP LEVEL NODES (eg nodes that contain the entire viewport area), temp fix was to remove +rect.width etc above... could use "predominantly in vp" calc... or maybe require vp height is > than element height
		}
	}
}

function checkForNodes(){
	if(!active) return;

	var testurl=window.location.href;
	
	if(testurl.indexOf('javascript:') == 0 ){
		return;
	}

	var nodes = [];
	if( mutationList.length ){

		mutationList.forEach(function(v){
			if( v.type == 'childList'){
				if( !nodeOrAnyParentDoNotRecurseInto(v.target) ){
					if( v.addedNodes.length ){
						
						// nodes.concat(v.addedNodes);
						v.addedNodes.forEachf(function(an){
							nodes.push(an);
							//nodes.concat(an.querySelectorAll('*')); // really not sure if this is needed or not... maybe!
						});
					}else{
						nodes.push(v.target);
						//nodes.concat(v.target.querySelectorAll('*')); // really not sure if this is needed or not... maybe!
						//console.log('webscrambler::mutationList:: empty v.addedNodes for childList!', v);
					}
				}
			}else{
				console.log('webscrambler::mutationList:: unhandled v.type!', v);
				nodes.push(v.target);
			}
		})

		mutationList = [];
	}else{
		//console.log('SHOULD "NEVER" REACH HERE!!');
		nodes=document.body.querySelectorAll('*');
	}
	processNodes(nodes, null);
}

function nodeOrAnyParentDoNotRecurseInto(node){
	var result = false; // if we reach the top (null) we will keep the result ( do recurse into/we are within an OK node )
	while(node && !doNoRecurseIntoNode(node) ){
		node = node.parentNode;
	}
	if( node != null ){
		result = true; // we didn't reach the top;
		//console.log('top not reached!!', node)
	}
	return result;
}

function doNoRecurseIntoNode(node){
	// keep this safe for document where some functions (eg node.getAttribute) will not be available....
	var nn = node.nodeName.toUpperCase();
	return nn == 'PRE' || nn == 'CODE' || nn == 'TEXTAREA' || nn == 'SVG' || nn == 'SELECT' || nn == 'OPTION' || (node.getAttribute && (node.getAttribute('contenteditable') || node.getAttribute('web-scrambler-skip')));
}

function canCheckForChildText(node){
	return node.childNodes.length > 0 && node.nodeName != 'SCRIPT' && node.nodeName != 'STYLE';
}

var imageLikeNodesSelector = 'img,image,video';
function isImageLikeNode(node){
	var nn = node.nodeName.toUpperCase();
	return node.nodeType == 1 && (nn == 'IMG' || nn == 'IMAGE' || nn == 'VIDEO' )
}

function processNodes(nodes, modeIsUnscramble, isHover){


	var scramblerOrUnscrambler = modeIsUnscramble ? unscrambleNode : scrambleNode;

	for( var i=0,l=nodes.length; i<l; i++ ){

		var badParent = null;
		// must avoid certain nodes being scrambled (textare, etc) which make it impossible to interact with the web... or read the code, etc
		// -> this patern may only work for querySelectAll results... and not for mutation lists... which are actually enforced above by nodeOrAnyParentDoNotRecurseInto
		while( i<l && doNoRecurseIntoNode(nodes[i]) ) {
			badParent = nodes[i];
			i++;
			while( i<l && nodes[i].parentNode == badParent ){
				badParent = nodes[i];
				i++;
			}
		}
		if(! (i<l))break;

		scramblerOrUnscrambler(nodes[i], isHover);
		//bodyMouseOut({target:nodes[i]}) 
	}
}

function reverseChars(str){
	return str.split('').reverse().join('');
}

function sortChars(str){
	return str.split('').sort(sortAlgos[opts.sortAlgo] || undefined).join('');
}

function sortCharsForced(str){
	var ostring = str;
	var result = sortChars(str);
	if( result == ostring ){
		//result = scrambleText.substr(0, ostring.length);
		result = scrambleTextLC.split('').sort(sortAlgos.random).join('').substr(0, ostring.length);
	}
	// while( result.length > 1 && result == ostring ){
	// 	if( result.length < 3 ){
	// 		result = reverseChars(ostring)+'ZZZ'; // will not work, what about anagrams?
	// 	}else{
	// 		break;
	// 		//result = ostring.split('').sort(sortAlgos.random).join(''); // foor short word lengths, this is teribad... and also broken for anagrams
	// 	}
	// }
	return result;
}

var sortAlgos = {
	default: undefined,
	standard: function(a,b){
		return a.localeCompare(b);
	},
	standardReversed: function(a,b){
		return -sortAlgos.standard(a,b);
	},
	caseInsensitive: function(a,b){
		return a.toLocaleLowerCase().localeCompare(b.toLocaleLowerCase());
	},
	caseInsensitiveReversed: function(a,b){
		return -sortAlgos.caseInsensitive(a,b);
	},
	random: function(a,b){
		return Math.random() < 0.5 ? 1 : -1;
	}
}

function scrambleTextNode(t){
	// many possible obfucscation strategies and preferences may be added here later... scrambleText is not availble currently though!  plus using random text messes up font printing, using existing text is better...
	//var tl = t.nodeValue.length;
	//if( tl > 3 ){ // short words filter...
		//t.nodeValue = scrambleText.substr(0, tl);

		//t.nodeValue = t.nodeValue.replace(/\w/ig, scrambleText)

		if( t.nodeValue.substr(0,1) == '$' ) return; // TODO: new cateogry of exclusions for currency values where obfuscation is downright awesomely annoying... configure regex for additional exclusions...?

		var minLenOpt = opts.minLength - 0;
		var sortHandler = opts.forceObfuscation ? sortCharsForced : sortChars;

		if( !t[textNodeBackupProp] ){
			t[textNodeBackupProp] = 'webscramble::'+t.nodeValue;
		}else{
			// ALREADY SCRAMBLED!! WATCH OUT!!!
			// console.log("NOISY NOISY NOISE!@!!!")
			if( t[textNodeBackupProp].substr(0,11) == 'webscramble' ){
				// already scrambled???? (maybe only 90% sure...)
				if( t[textNodeBackupProp] != 'webscramble::'+t.nodeValue ){
					return; // ruins unscramble featuere... for sites that will change our value? (maybe they reset the text but leave alt intact...)
				}
			}
		}

		if( opts.obfuscateMode == 'sort-cased-chars' ){
			// marked with *, nominally slower...
			t.nodeValue = t.nodeValue.replace(/[A-Z]+/g, function(v){return v.length > minLenOpt ? sortHandler(v) : v;})
			t.nodeValue = t.nodeValue.replace(/[a-z]+/g, function(v){return v.length > minLenOpt ? sortHandler(v) : v;})

		}else if( opts.obfuscateMode == 'sort-words' ){
			t.nodeValue = t.nodeValue.replace(/\w+/g, function(v){return v.length > minLenOpt ? sortHandler(v) : v;})

		}else if( opts.obfuscateMode == 'reverse-cases' ){
			t.nodeValue = t.nodeValue.replace(/[A-Z]+/g, function(v){return v.length > minLenOpt ? reverseChars(v) : v;})
			t.nodeValue = t.nodeValue.replace(/[a-z]+/g, function(v){return v.length > minLenOpt ? reverseChars(v) : v;})

		}else /*if( opts.obfuscateMode == 'reverse-words' )*/{
			t.nodeValue = t.nodeValue.replace(/\w+/g, function(v){return v.length > minLenOpt ? reverseChars(v) : v;})
		}

		// if( opts.forceObfuscation ){
		// 	//todo: detect obfuscation failures here (for words that exceeded the minLenOpt)...
		// 	// actually not trival, we would want to detect this above somehow... would work here easily IF the element/paragraph only contained one non obfuscated word...
		// }


		// t.nodeValue = t.nodeValue.replace(/[A-Z]+/g, function(v){return scrambleText.substr(0, v.length);})
		// t.nodeValue = t.nodeValue.replace(/[a-z]+/g, function(v){return scrambleTextLC.substr(0, v.length);})

	//}
}
function unscrambleTextNode(t){
	if( t[textNodeBackupProp] && t[textNodeBackupProp].length > 0 && t[textNodeBackupProp].substr(0,11) == 'webscramble' ){
		t.nodeValue = t[textNodeBackupProp].substr(13);
		t[textNodeBackupProp] = '';
	}
}

function scrambleIfTextNode(t){
	if( t.nodeType == 3 ){
		scrambleTextNode(t);
	}
}
function unscrambleIfTextNode(t){
	if( t.nodeType == 3 ){
		unscrambleTextNode(t);
	}
}

function scrambleImage(i){
	if(i.getAttribute('web-scrambler-hover')){
		//console.log('webscrambler:: canceled scramble operation due to hover detected...');
		return;
	}
	if( !i.getAttribute('webscramblerorigprops') ){
		i.setAttribute("webscramblerorigprops",JSON.stringify(getCssPropsWeModify(i, imageCssPropsWeModify)));
	}
	i.style.opacity=0.1;
	i.style.filter='brightness(0.4)';
}

function unscrambleImage(i){
	// odd bug, if we are hovered and mutate again.... the image is scrambled again... annoying virtual doms!
	i.style.opacity='1'; // dislike this, but it seems little other way... '' works on most sites...
	i.style.filter='';
	resetOrigionalProperties(i, imageCssPropsWeModify);
}

function applyForChildNodes(parent, fnApply){
	for( var ii=0,ll=parent.childNodes.length; ii<ll; ii++ ){
		fnApply(parent.childNodes[ii]);
	}
}

function unscrambleNode(n, isHover, processChildNodes){
	if( isImageLikeNode(n) ){ // possibly, we need to recurse child nodes here?? or we need to attach events to each node... hmm
		unscrambleImage(n);
		if( isHover ){
			n.setAttribute('web-scrambler-hover', 'on'); // event mode only.... 
		}
	}else if( n.nodeType == 3){
		unscrambleTextNode(n); // never happens...
	}else if( canCheckForChildText(n) ){
		applyForChildNodes(n, unscrambleIfTextNode);
	}
}

function scrambleNode(n, isUnHover, processChildNodes){
	if( nodeOrAnyParentDoNotRecurseInto(n) ) return;

	if( isImageLikeNode(n) ){
		n.removeAttribute('web-scrambler-hover');
		scrambleImage(n);
	}else if( n.nodeType == 3){
		scrambleTextNode(n); // never happens...
	}else if( canCheckForChildText(n) ){
		applyForChildNodes(n, scrambleIfTextNode);
	}
}

function bodyMouseOver(e){
	if(!active) return; // todo: remove listeners instead?
	unscrambleNode(e.target, 'isHover');

	//console.log('webscramber::mmouseovervent', e)

	 if( e.target.querySelectorAll && e.target.nodeName == 'A' ){ // HOVER EVENTS HERE DO NOT PROPAGAT TO CHILD (IMAGES)... ETC??
		processNodes(e.target.querySelectorAll(imageLikeNodesSelector), 'modeIsUnscramble', 'isHover'); // event mode only.... 
	 }
}
function bodyMouseOut(e){
	if(!active) return; // todo: remove listeners instead?
	scrambleNode(e.target, 'isUnHover');

	//console.log('webscramber::mmouseoutevent', e)

	if( e.target.querySelectorAll && e.target.nodeName == 'A' ){ // HOVER EVENTS HERE DO NOT PROPAGAT TO CHILD (IMAGES)... ETC??
		processNodes(e.target.querySelectorAll(imageLikeNodesSelector), null); // event mode only.... 
	}
}

// deprecated, use above
function hoverImage(e){
	unscrambleImage(e.target);
}
// deprecated, use above
function unhoverImage(e){
	scrambleImage(e.target);
}

// function atterAdjusted(e){
// 	if(!active) return;
// 	console.log('webscrambler::attrsadjusted', e)
// }

function nodeInserted(e){
	if(!active) return;
	//console.log('inserted event', e);
	// really odd, tryingt not use a global here SEEMS to break everything???? (maybe just dumb)
	//checkForNodes([].concat(e)); // rate limit built in?
	//checkForNodes(Array.prototype.slice.call(e)); // rate limit built in?
	mutationList.concat(e);
	checkForNodes();
}

function checkDocBody(){
	if( document.body ){
		docBodyReady()
	}else{
		setTimeout(checkDocBody, 50);
	}
}

function docBodyReady(){
	setTimeout(function(){
		observer.observe(document.body, { attributes: false, childList: true, subtree: true });
		// attrObserver.observe(document.body, { attributes: true });
		processNodes(document.body.querySelectorAll('*'));
	}, 0);
	document.body.addEventListener('mouseover', bodyMouseOver, true);
	document.body.addEventListener('mousemove', bodyMouseOver, true);
	document.body.addEventListener('mouseout', bodyMouseOut, true);
}

observer = new MutationObserver(nodeInserted)
//attrObserver = new MutationObserver(atterAdjusted) // seems to fire, but alos miss some modifiations, so it doesn't work!
//checkDocBody()

var opts = {};
loadPrefsFromStorage(opts, function(){
	//console.log('webscrambler::prefs', opts)
	checkDocBody()
});

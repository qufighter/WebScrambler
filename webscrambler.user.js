// This file is part of the "webscrambler" extension

var chkForNodesTimeout=0;
var observer=null;
var textNodeBackupProp = 'alt'; // text nodes don't have many (if any!) assignable dom-persisted properties... even alt has many exclusions it seems (within code or pre, does not work)

var scrambleText = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
while( scrambleText.length < 65535 ){
	scrambleText += scrambleText;
}
var scrambleTextLC = scrambleText.toLowerCase()
var mutationList = [];

var active=true;

function canCheckForChildText(node){
	return node.childNodes.length > 0 && node.nodeName != 'SCRIPT' && node.nodeName != 'STYLE';
}

var imageLikeNodesSelector = 'img,image,video';
function isImageLikeNode(node){
	return node.nodeType == 1 && (node.nodeName == 'IMG' || node.nodeName == 'image' || node.nodeName == 'VIDEO' )
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
		console.log('unhandled message', request);
	}
});

function restoreAllNodes(){
	var nodes=document.body.querySelectorAll('*');
	for( var i=0,l=nodes.length; i<l; i++ ){
		nodes[i].removeAttribute('web-scrambler-skip');
		nodes[i].removeAttribute('web-scrambler-hover');
		bodyMouseOver({target:nodes[i]}) // todo: fix function to no longer need faux event wrapper; TODO: in case of trigger from here (non event) we don't want to add those "strange" state attributes (eg web-scrambler-hover)
	}
}
function restoreVpNodes(){
	var nodes=document.body.querySelectorAll('*');
	//var vpNodes = []''
	for( var i=0,l=nodes.length; i<l; i++ ){
		var rect=nodes[i].getBoundingClientRect();
		if( !(rect.x /*+ rect.width*/ < 0 || rect.y /*+ rect.height*/ < 0 || rect.x > window.innerWidth || rect.y > window.innerHeight) ){
			//vpNodes.push(nodes[i];)
			bodyMouseOver({target:nodes[i]}); // todo: fix function to no longer need faux event wrapper; TODO: in case of trigger from here (non event) we don't want to add those "strange" state attributes (eg web-scrambler-hover)
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
				if( !nodeOrAnyParentDoNotRecurseInto(v.target) ){ // todo: also ANY parent of this might be a bad parent.. unfortunately we have to check!!
					nodes.concat(v.addedNodes);
				}
				if( v.addedNodes.length < 1 ){
					console.log('111111DEBUGGY!', v);
				}
			}else{
				console.log('2222DEBUGGY!', v);
				nodes.push(v.target);
			}
		})

		mutationList = [];
	}else{
		//console.log('SHOULD "NEVER" REACH HERE!!');
		nodes=document.body.querySelectorAll('*');
	}
	processNodes(nodes);
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
	return node.nodeName == 'PRE' || node.nodeName == 'CODE' || (node.getAttribute && (node.getAttribute('contenteditable') || node.getAttribute('web-scrambler-skip'))) || node.nodeName == 'TEXTAREA';
}

function processNodes(nodes){

	for( var i=0,l=nodes.length; i<l; i++ ){

		var badParent = null;

		// we'd have to find a way to skip children of the above too... interesting?? tricky??? 
		// any child of contenteditable="true"
		// any textarea's children
		//etc!!!
		// -> in practice, the ordering is already recursive, such that if the parent node matches on the next subsequent node we can keep moving until we find a new parentNode
		// -> this patern may only work for querySelectAll results... and not for mutation lists... 
		while( i<l && doNoRecurseIntoNode(nodes[i]) ) { //continue; // SKIPITY DO DA
			badParent = nodes[i];
			i++;
			while( i<l && nodes[i].parentNode == badParent ){
				badParent = nodes[i];
				i++;
			}
		}
		if(! (i<l))break;

		bodyMouseOut({target:nodes[i]}) // todo: fix function to no longer need faux event wrapper

		// if( nodes[i].nodeType == 3 ){
		// 	scrambleTextNode(nodes[i]); // the query will NEVER return text nodes here (at top level)
		// }else if( isImageLikeNode(nodes[i]) ){
		// 	scrambleImage(nodes[i]);

		// }else{
		// 	if( canCheckForChildText(nodes[i]) ){ // check 1 deep for text nodes!
		// 		applyForChildNodes(nodes[i], scrambleIfTextNode);
		// 	}
		// }
	}


}

function reverseChars(str){
	return str.split('').reverse().join('');
}

function sortChars(str){
	return str.split('').sort().join('');
}

function scrambleTextNode(t){
	//var tl = t.nodeValue.length;
	//if( tl > 3 ){ // short words filter...
		//t.nodeValue = scrambleText.substr(0, tl);

		//t.nodeValue = t.nodeValue.replace(/\w/ig, scrambleText)

		if( !t[textNodeBackupProp] ){
			t[textNodeBackupProp] = t.nodeValue;
		}else{
			// ALREADY SCRAMBLED!! WATCH OUT!!!
			// console.log("NOISY NOISY NOISE!@!!!")
			//return; // ruins unscramble featuer...
		}

		// t.nodeValue = t.nodeValue.replace(/[A-Z]+/g, function(v){return reverseChars(v);})
		// t.nodeValue = t.nodeValue.replace(/[a-z]+/g, function(v){return reverseChars(v);})
		t.nodeValue = t.nodeValue.replace(/\w+/g, function(v){return v.length > 3 ? reverseChars(v) : v;})


		// t.nodeValue = t.nodeValue.replace(/[A-Z]+/g, function(v){return sortChars(v);})
		// t.nodeValue = t.nodeValue.replace(/[a-z]+/g, function(v){return sortChars(v);})


		// t.nodeValue = t.nodeValue.replace(/[A-Z]+/g, function(v){return scrambleText.substr(0, v.length);})
		// t.nodeValue = t.nodeValue.replace(/[a-z]+/g, function(v){return scrambleTextLC.substr(0, v.length);})

	//}
}
function unscrambleTextNode(t){
	if( t[textNodeBackupProp] && t[textNodeBackupProp].length > 0 ){
		t.nodeValue = t[textNodeBackupProp];
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
		console.log('web scrambler cancled scramble operation due to hover detected...');
		return;
	}
	i.style.opacity=0.1;
	i.style.filter='brightness(0.4)';
}


function unscrambleImage(i){
	// odd bug, if we are hovered and mutate again.... the image is scrambled again... annoying virtual doms!
	i.style.opacity='';
	i.style.filter='';
}

// deprecated
function hoverImage(e){
	unscrambleImage(e.target);
}
// deprecated
function unhoverImage(e){
	scrambleImage(e.target);
}

function applyForChildNodes(parent, fnApply){
	for( var ii=0,ll=parent.childNodes.length; ii<ll; ii++ ){
		fnApply(parent.childNodes[ii]);
	}
}

function bodyMouseOver(e){
		if(!active) return; // todo: remove listeners instead?


	if( isImageLikeNode(e.target) ){ // possibly, we need to recurse child nodes here?? or we need to attach events to each node... hmm
		unscrambleImage(e.target);
		e.target.setAttribute('web-scrambler-hover', 'on'); // event mode only.... (like below) ?
	}else if( e.target.nodeType == 3){
		unscrambleTextNode(e.target); // never happens...
	}else if( canCheckForChildText(e.target) ){
		applyForChildNodes(e.target, unscrambleIfTextNode);
	}


	// thijs first part only in event listener (future split of funciton to remove e.target)
	//if( e.target.nodeName == 'A' ){ // HOVER EVENTS HERE DO NOT PROPAGAT TO CHILD (IMAGES)... ETC??
		processNodes(e.target.querySelectorAll(imageLikeNodesSelector));
	//}
}
function bodyMouseOut(e){
		if(!active) return; // todo: remove listeners instead?

	if( nodeOrAnyParentDoNotRecurseInto(e.target) ) return;

	if( isImageLikeNode(e.target) ){
		e.target.removeAttribute('web-scrambler-hover');
		scrambleImage(e.target);
	}else if( e.target.nodeType == 3){
		scrambleTextNode(e.target); // never happens...
	}else if( canCheckForChildText(e.target) ){
		applyForChildNodes(e.target, scrambleIfTextNode);
	}
}


function nodeInserted(e){
	if(!active) return;
	//console.log('inserted event', e);

	mutationList.concat(e);

	// clearTimeout(chkForNodesTimeout);
	// chkForNodesTimeout=setTimeout(checkForNodes,250);
	checkForNodes(); // rate limit built in?
}
observer = new MutationObserver(nodeInserted)

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
		processNodes(document.body.querySelectorAll('*'));
	}, 0);

	document.body.addEventListener('mouseover', bodyMouseOver);
	document.body.addEventListener('mouseout', bodyMouseOut);
}

checkDocBody()



var tabid=0,winid=0,topz=100;
var scaleFactor = 0.2;
var isFirefox = window.navigator.userAgent.indexOf('Firefox') > -1;
var fixedSizePopup = isFirefox;
var constrainToWindow = true; // todo - make option (keep video within window during move/resize)

function _ge(g){
	return document.getElementById(g);
}
function getEventTarget(ev){
	ev = ev || event;
	var targ=(typeof(ev.target)!='undefined') ? ev.target : ev.srcElement;
	if(targ !=null){
	    if(targ.nodeType==3)
	        targ=targ.parentNode;
	}
	return targ;
}
function getEventTargetA(ev){
	var targ=getEventTarget(ev);
	if(targ.nodeName != 'A')return targ.parentNode;
	return targ;
}
function preventEventDefault(ev){
	ev = ev || event;
	if(ev.preventDefault)ev.preventDefault();
	ev.returnValue=false;
	return false;
}
function stopEventPropagation(ev){
	ev = ev || event;
	if(ev.stopPropagation)ev.stopPropagation();
	ev.cancelBubble=true;
}

//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//
function restoreAll(){
	chrome.tabs.sendMessage(tabid,{restoreAllNodes: true},function(r){ });
}
function restoreAllInViewport(){
	chrome.tabs.sendMessage(tabid,{restoreViewportNodes: true},function(r){ });
}
function disable(){
	chrome.tabs.sendMessage(tabid,{disableScan: true},function(r){ });
}

function iin(){
	Cr.elm('div',{'id':'', childNodes: [
		Cr.elm('a', {'class': 'rowa', events:['click', restoreAll], childNodes:[Cr.txt('Restore All Nodes')]}),
		Cr.elm('a', {'class': 'rowa', events:['click', restoreAllInViewport], childNodes:[Cr.txt('Restore Viewport Nodes')]}),
		Cr.elm('a', {'class': 'rowa', events:['click', disable], childNodes:[Cr.txt('Disable(toggle)')]})
	]},_ge('ve'));
}


document.addEventListener('DOMContentLoaded', function () {

	chrome.tabs.query({currentWindow:true, active: true}, function(tabs){
		var tab = tabs[0];
		tabid=tab.id;
		//chrome.tabs.sendMessage(tabid,{justOpened:true,vidDropShadow:localStorage['vidDropShadow']=='true'},function(r){});
		//getCurrentLayout();
	})


	iin();
});

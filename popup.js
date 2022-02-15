var tabid=0,winid=0,topz=100;
var scaleFactor = 0.2;
var isFirefox = window.navigator.userAgent.indexOf('Firefox') > -1;
var fixedSizePopup = isFirefox;
var constrainToWindow = true; // todo - make option (keep video within window during move/resize)
var tabhostname = '';

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
function toggleDisableSite(e){

	var excludedSite = siteExclusionMatched(tabhostname,opts.exclusions);

	var tossave={};
	tossave.exclusions = opts.exclusions.replace(tabhostname, '');
	if( ! excludedSite ){
		tossave.exclusions += '|'+tabhostname;
	}
	excludedSite = !excludedSite
	e.target.innerText = exlusionText(excludedSite)

	tossave.exclusions = tossave.exclusions.replace(/^(\|)+/, '').replace(/(\|)+/g, '|');

	console.log(tossave);

	storage.set(tossave, function() {
		if(chrome.runtime.lastError && chrome.runtime.lastError.message.indexOf('MAX_WRITE_OPERATIONS_PER_HOUR') > 0){
			//console.log(chrome.runtime.lastError);
		}else{
			console.log(chrome.runtime.lastError);
		}
		chrome.tabs.sendMessage(tabid,{disableScan: true, onlyDisable: excludedSite},function(r){ });
		opts.exclusions = tossave.exclusions;
	});

}

function exlusionText(excludedSite){
	return (excludedSite ? 'Enable' : 'Disable')+' for Site (always)'
}

function iin(){
	var excludedSite = siteExclusionMatched(tabhostname,opts.exclusions);

	Cr.elm('div',{'id':'', childNodes: [
		Cr.elm('a', {'class': 'rowa', events:['click', restoreAll], childNodes:[Cr.txt('Reveal All Nodes 1x')]}),
		Cr.elm('a', {'class': 'rowa', events:['click', restoreAllInViewport], childNodes:[Cr.txt('Restore Viewport Nodes')]}),
		Cr.elm('a', {'class': 'rowa', events:['click', disable], childNodes:[Cr.txt('Disable(toggle,transient)')]}),
		(tabhostname ? Cr.elm('a', {'class': 'rowa', events:['click', toggleDisableSite], childNodes:[Cr.txt(exlusionText(excludedSite))]}) : 0)
	]},_ge('ve'));
}

var opts = {};

document.addEventListener('DOMContentLoaded', function () {

	chrome.tabs.query({currentWindow:true, active: true}, function(tabs){
		var tab = tabs[0];
		tabid=tab.id;
		try{
			tabhostname = (new URL(tab.url)).hostname;
		}catch(e){
			console.error('webscrambler::problem creating URL object form url, exception: ', e);
		}
		//chrome.tabs.sendMessage(tabid,{justOpened:true,vidDropShadow:localStorage['vidDropShadow']=='true'},function(r){});
		//getCurrentLayout();

		
		loadPrefsFromStorage(opts, function(){
			//console.log('webscrambler::prefs', opts)
			iin();
		});

	});



});

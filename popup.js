var tabid=0;
var isFirefox = window.navigator.userAgent.indexOf('Firefox') > -1;
var fixedSizePopup = isFirefox;
var tabhostname = '';
var opts = {};

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

    var exclusionStatus = exclusionInfo();
    
	var excludedSite = exclusionStatus.excludedSite;
    excludedSite = !excludedSite;

	var tossave={};
    if ( opts.enableByDefault ){
        tossave.exclusions = opts.exclusions.replace(tabhostname, '');
        if( excludedSite ){
            tossave.exclusions += '|'+tabhostname;
        }
    }else{
        tossave.inclusions = opts.inclusions.replace(tabhostname, '');
        if( !excludedSite ){
            tossave.inclusions += '|'+tabhostname;
        }
    }
	
	e.target.innerText = exclusionText(excludedSite);
    
    if ( opts.enableByDefault ){
        tossave.exclusions = tossave.exclusions.replace(/^(\|)+/, '').replace(/(\|)+/g, '|');
    }else{
        tossave.inclusions = tossave.inclusions.replace(/^(\|)+/, '').replace(/(\|)+/g, '|');
    }
    
	console.log(tossave);

	storage.set(tossave, function() {
		if(chrome.runtime.lastError && chrome.runtime.lastError.message.indexOf('MAX_WRITE_OPERATIONS_PER_HOUR') > 0){
			//console.log(chrome.runtime.lastError);
		}else{
			console.log(chrome.runtime.lastError);
		}
		chrome.tabs.sendMessage(tabid,{disableScan: true, onlyDisable: excludedSite},function(r){ });
        if ( opts.enableByDefault ){
            opts.exclusions = tossave.exclusions;
        }else{
            opts.inclusions = tossave.inclusions;
        }
        
	});

}

function exclusionText(exclusionBool){
    return (exclusionBool ? 'Enable' : 'Disable')+' for Site (always)';
}

function exclusionInfo(){
    var exclusionBool = false;
    if( !opts.enableByDefault ){
        exclusionBool = !siteMatched(tabhostname,opts.inclusions);
    }else{
        exclusionBool = siteMatched(tabhostname,opts.exclusions);
    }
    return {
        label: exclusionText(exclusionBool),
        excludedSite: exclusionBool
    }
}

function iin(){
    
    Cr.elm('div',{'id':'', childNodes: [
		Cr.elm('a', {'class': 'rowa', events:['click', restoreAll], childNodes:[Cr.txt('Reveal All Nodes 1x')]}),
		Cr.elm('a', {'class': 'rowa', events:['click', restoreAllInViewport], childNodes:[Cr.txt('Restore Viewport Nodes')]}),
		Cr.elm('a', {'class': 'rowa', events:['click', disable], childNodes:[Cr.txt((!opts.enableByDefault ? 'Enable' : 'Disable')+'(toggle,transient)')]}),
		(tabhostname ? Cr.elm('a', {'class': 'rowa', events:['click', toggleDisableSite], childNodes:[Cr.txt(exclusionInfo().label)]}) : 0)
	]},_ge('ve'));
}


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

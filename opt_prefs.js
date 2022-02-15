/* webscrambler options/preferences shared featues */
var storage = chrome.storage.sync || chrome.storage.local;

var isFirefox = window.navigator.userAgent.indexOf('Firefox') > -1;
var isChrome = window.navigator.userAgent.indexOf('Chrome/') > -1;
var pOptions=[];
var pAdvOptions=[];
var pSyncItems = [];

pOptions["obfuscateMode"]={def:'reverse-words',ind:0,name:'Text Obfuscation Mode',select:{'reverse-words':'Reverse Words','reverse-cases':'Reverse Cases*','sort-words':'Sort Words (pick algo)','sort-cased-chars':'Sort Cases* (leave uppers)'}};
pOptions["sortAlgo"]={def:'default',ind:1,name:'Letter Sort Algo',select:{'default':'Default','standard':'Standard (Alpha Sort)','standardReversed':'Standard Reversed','caseInsensitive':'Case Insnsitive (Alpha Sort)','caseInsensitiveReversed':'Case Insnsitive Reversed','random':"Random"}};
pOptions["forceObfuscation"]={def:false,ind:1,name:'When sort obfuscation fails; *randomize'};
pOptions["minLength"]={def:'3',ind:0,name:'Minimum Word Length',select:{'1':'1 Character','2':'2 Characters','3':'3 Characters','4':'4 Characters','5':"5 Characters"}};
pOptions["exclusions"]={def:'',ind:0,name:'Exclusions Regex',help:'about!'};


function iloadPref(results, i, obj, pOptions){
	if(typeof(pOptions[i].def)=='boolean'){
		results[i] = ((obj[i]=='true')?true:((obj[i]=='false')?false:pOptions[i].def));
	}else if(typeof(pOptions[i].def)=='number'){
		results[i] = (!obj[i] || isNaN(obj[i] - 0)) ? pOptions[i].def : obj[i] - 0;
	}else{
		results[i] = ((obj[i])?obj[i]:((obj[i]==='' && !pOptions[i].ifEmptyReset)?obj[i]:pOptions[i].def));
	}
}

function loadPrefsFromStorage(results, cbf){
	storage.get(null, function(obj) {
		if(chrome.runtime.lastError)console.log(chrome.runtime.lastError.message);
		loadPrefsFromLocalStorage(results, cbf, obj || {})
	});
}

function loadPrefsFromLocalStorage(results, cbf, override){
	var i;
	for(i in pOptions){iloadPref(results, i, override || {}, pOptions);}
	for(i in pAdvOptions){iloadPref(results, i, override || {}, pAdvOptions);}
	for(i in pSyncItems){iloadPref(results, i, override || {}, pSyncItems);}
	if(typeof(cbf)=='function')cbf();
}

function siteExclusionMatched(hostname,optsExclusions){
	return hostname.match(new RegExp('^('+optsExclusions+')$','i'));
}

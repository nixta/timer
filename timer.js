var __defaults = 
	{
		"time" : 10,
		"warningTime" : 3,
		"dangerTime": 1,
		"startText": "Start",
		"pauseText": "Pause",
		"resumeText": "Resume",
		"resetText": "Reset"
	};

var __debugMode = false;

var __startButtonCtrl = null;
var __resetButtonCtrl = null;
var __timeCtrl = null;
var __yellowTimeCtrl = null;
var __redTimeCtrl = null;
var __timerDisplayCtrl = null;

var __timeLeft = 0;
var __totalTime = 0;
var __warningTime = 0;
var __dangerTime = 0;
var __targetTime = 0;

var __totalTimeUI = 0;
var __warningTimeUI = 0;
var __dangerTimeUI = 0;

// States can "unstarted", "started", "paused", "complete"
var __state = "unstarted";
// Urgencies can be "none", "warning", "danger"
var __urgency = "none";
var __intervalTimer = null;

var __completeTimer = null;
var __completeState = 0;
var __completeFlashRate = 1000;

var __fontSizeOverride = 0;

var urlParams = {};

function ReadParams() {
    var e,
        a = /\+/g,  // Regex for replacing addition symbol with a space
        r = /([^&=]+)=?([^&]*)/g,
        d = function (s) { return decodeURIComponent(s.replace(a, " ")); },
        q = window.location.search.substring(1);

    while (e = r.exec(q))
       urlParams[d(e[1])] = d(e[2]);
}

function LoadControls(startButtonSel, resetButtonSel, timeSel, yellowSel, redSel, timerDisplayCtrl)
{
	__startButtonCtrl = $(startButtonSel);
	__resetButtonCtrl = $(resetButtonSel);
	__timeCtrl = $(timeSel);
	__yellowTimeCtrl = $(yellowSel);
	__redTimeCtrl = $(redSel);
	__timerDisplayCtrl = $(timerDisplayCtrl);
	
	return (__startButtonCtrl.length &&
		    __resetButtonCtrl.length &&
			__timeCtrl.length &&
			__yellowTimeCtrl.length &&
			__redTimeCtrl.length &&
			__timerDisplayCtrl.length);
}

function SetupPage(startButtonSel, resetButtonSel, timeSel, yellowSel, redSel, timerDisplayCtrl)
{
	if (!LoadControls(startButtonSel, resetButtonSel, timeSel, yellowSel, redSel, timerDisplayCtrl))
	{
		alert("Page configured incorrectly - could not load all required page controls!");
		return;
	}
	
	if (InitTimer())
	{
		ReadParams();
		__debugMode = ("debugMode" in urlParams);
		var fontSizeOverride = parseInt(urlParams["fontSize"]);
		if (!isNaN(fontSizeOverride))
		{
			__timerDisplayCtrl.css("font-size", fontSizeOverride);
		}
		
		// Laod any saved time values into the fields
		__timeCtrl.val(__totalTimeUI);
		__yellowTimeCtrl.val(__warningTimeUI);
		__redTimeCtrl.val(__dangerTimeUI);
	
		// Set up the input fields with up/down buttons
		// Set the main timer display
		// Disable the main timer display
		__timerDisplayCtrl.attr("disabled", "disabled");
		
		__startButtonCtrl.click(StartStopTimer);
		__resetButtonCtrl.click(ResetTimer);
		
		SetUIState();
		__timeLeft = __totalTime;
		ShowTimeLeft();
	}
}

function InitTimer()
{
	__totalTimeUI = parseInt(__timeCtrl.val());
	if (isNaN(__totalTimeUI))
	{
		__totalTimeUI = parseInt(__defaults["time"]);
	}
	
	__warningTimeUI = parseInt(__yellowTimeCtrl.val());
	if (isNaN(__warningTimeUI))
	{
		__warningTimeUI = parseInt(__defaults["warningTime"]);
	}
	
	__dangerTimeUI = parseInt(__redTimeCtrl.val())
	if (isNaN(__dangerTimeUI))
	{
		__dangerTimeUI = parseInt(__defaults["dangerTime"]);
	}
	
	// Sanity Checks
	if (isNaN(__totalTimeUI) || isNaN(__warningTimeUI) || isNaN(__dangerTimeUI))
	{
		alert("Could not parse the timer configuration properly! " + __totalTimeUI + "," + __warningTimeUI + "," + __dangerTimeUI);
		return false;
	}
	
	if (__totalTimeUI < 0 || __dangerTimeUI < 0 || __warningTimeUI < 0)
	{
		alert("All timer values must be greater than 0! " + __totalTimeUI + "," + __warningTimeUI + "," + __dangerTimeUI);
	}
	
	// Make sure we end up with *at least* 1 min, 2 min, 3 min for danger, warning and total.
	var forcedUpdate = false;
	if (__dangerTimeUI < 1) { __dangerTimeUI = 1; forcedUpdate = true; }
	if (__warningTimeUI < __dangerTimeUI + 1) { __warningTimeUI = __dangerTimeUI + 1; forcedUpdate = true; }	
	if (__totalTimeUI < __warningTimeUI + 1) { __totalTimeUI = __warningTimeUI + 1; forcedUpdate = true; }
	
	if (forcedUpdate)
	{
		UpdateTimeControls();
	}
	
	__totalTime = __totalTimeUI * 60 * 1000;
	__warningTime = __warningTimeUI * 60 * 1000;
	__dangerTime = __dangerTimeUI * 60 * 1000;
	
	return true;
}

function UpdateTimeControls()
{
	__timeCtrl.val(__totalTimeUI);
	__yellowTimeCtrl.val(__warningTimeUI);
	__redTimeCtrl.val(__dangerTimeUI);
}

var __showHideDuration = 300;

function SetUIState()
{
	var startButtonText = __defaults["startText"];
	if (__state == "started")
	{
		startButtonText = __defaults["pauseText"];
	}
	else if (__state == "paused")
	{
		startButtonText = __defaults["resumeText"];
	}
	
	__startButtonCtrl.text(startButtonText);
	if (__state == "complete")
	{	
		__startButtonCtrl.attr("disabled", "disabled").hide(__showHideDuration);
	}
		else
	{
		__startButtonCtrl.removeAttr("disabled").show(__showHideDuration);
	}
	
	if (__state == "started")
	{
		__resetButtonCtrl.attr("disabled", "disabled").hide(__showHideDuration);
		__timeCtrl.hide(__showHideDuration);
		__yellowTimeCtrl.hide(__showHideDuration);
		__redTimeCtrl.hide(__showHideDuration);
	}
	else
	{
		__resetButtonCtrl.removeAttr("disabled").show(__showHideDuration);
		__timeCtrl.show(__showHideDuration);
		__yellowTimeCtrl.show(__showHideDuration);
		__redTimeCtrl.show(__showHideDuration);
	}
	
}

function StartStopTimer()
{
	if (__state == "started")
	{
		PauseTimer();
	}
	else if (__state == "paused")
	{
		ResumeTimer();
	}
	else
	{
		StartTimer();
	}
	
	SetUIState();
}

function StartTimer()
{
	// Cleanup, just in case.
	if (__intervalTimer != null)
	{
		window.clearInterval(__intervalTimer);
	}

	__intervalTimer = null;
	
	// Get the time left
	__timeLeft = __totalTime + 999;
	ShowTimeLeft();
	
	// And this is what we're aiming for.
	var d = new Date();
	__targetTime = d.getTime() + __timeLeft;
	
	__intervalTimer = window.setInterval(PingTimer, 50);
	__state = "started";
	__urgency = "none";
	$("body").removeClass("warning danger complete").addClass("started");
}

function PauseTimer()
{
	if (__intervalTimer != null)
	{
		window.clearInterval(__intervalTimer);
	}
	__intervalTimer = null;
	__state = "paused";
}

function ResumeTimer()
{
	var d = new Date();
	__targetTime = d.getTime() + __timeLeft;
	__intervalTimer = window.setInterval(PingTimer, 50);
	__state = "started";
}

function WarningTimer()
{
	__urgency = "warning";
	$("body").removeClass("started").addClass("warning");
}

function DangerTimer()
{
	__urgency = "danger";
	$("body").removeClass("warning").addClass("danger");
}

function FinishTimer()
{
	__timeLeft = 0; // Just in case we overshot - it's quite possible by a few milliseconds.
	__state = "complete";
	$("body").removeClass("danger").addClass("complete");
	SetUIState();
	__completeTimer = window.setInterval(UpdateCompleteCSS, 50);
}

var __lastCompleteFlashOver = 0;

function UpdateCompleteCSS()
{
	var d = new Date();
	if ((d.getTime() - __lastCompleteFlashOver) < __completeFlashRate) return;
	
	__lastCompleteFlashOver = d.getTime();
	
	var removeState = __completeState;
	if (__completeState == 0)
	{
		__completeState = 1;
	}
	else
	{
		__completeState = 0;
	}
	
	var t = $("body.complete");
	t.removeClass("s" + removeState).addClass("s" + __completeState);
}

function ResetTimer()
{
	__state = "unstarted";
	__urgency = "none";
	$("body").removeClass("warning danger complete started s0 s1");
	if (__intervalTimer != null)
	{
		window.clearInterval(__intervalTimer);
	}
	__intervalTimer = null;
	
	if (__completeTimer != null)
	{
		window.clearInterval(__completeTimer);
	}
	__completeTimer = null;

	InitTimer();
	__timeLeft = __totalTime;
	SetUIState();
	ShowTimeLeft();
}

function PingTimer()
{
	var d = new Date();
	__timeLeft = __targetTime - d.getTime();
	
	if (__debugMode)
	{
		var d2 = new Date();
		d2.setTime(__timeLeft);
		if (d2.getSeconds() == 57)
		{
			__targetTime = __targetTime - 57000;
			__timeLeft = __targetTime - d.getTime();
		}
	}
	
	if (__timeLeft < 0)
	{
		FinishTimer();
	}
	else if ((__timeLeft < __dangerTime) && (__state != "danger"))
	{
		DangerTimer();
	}
	else if ((__timeLeft < __warningTime) && (__state != "warning"))
	{
		WarningTimer();
	}
	
	ShowTimeLeft();
}

function ShowTimeLeft()
{
	__timerDisplayCtrl.text(GetDisplayTime(__timeLeft));
}

function GetDisplayTime(timeLeftInMilliseconds)
{
	// We don't care about anything more than minutes and seconds.
	var d = new Date();
	d.setTime(timeLeftInMilliseconds);
	var r = "";
	if (timeLeftInMilliseconds > 3600000)
	{
		r = d.getHours() + ":" + GetPaddedDigits(d.getMinutes()) + ":" + GetPaddedDigits(d.getSeconds());
	}
	else
	{
		r = d.getMinutes() + ":" + GetPaddedDigits(d.getSeconds());
	}
	return r;
}

function GetPaddedDigits(n)
{
	if (n < 10)
	{
		return "0" + n;
	}
	else
	{
		return n;
	}
}
export default function postprocess({ code }) {
	return (
		code
			// All of these replacements can be avoided by instead copy-pasting
			// the _Platform_initialize function to the end of the IIFE and
			// modifying it. It's just more convenient to do string replacements
			// in this demo.
			.replace(
				`var stepper = stepperBuilder(sendToApp, model);`,
				`
	// We'll temporarily overwrite these variables or functions.
	var F2_backup = F2;
	var _Browser_window_backup = _Browser_window;
	var _VirtualDom_virtualize_backup = _VirtualDom_virtualize;
	var _VirtualDom_applyPatches_backup = _VirtualDom_applyPatches;
	var _VirtualDom_equalEvents_backup = _VirtualDom_equalEvents;

	// stepperBuilder calls impl.setup() (if it exists, which it does only for
	// Browser.application) as the first thing it does. impl.setup() returns the
	// divertHrefToApp function, which is used to create the event listener for
	// all <a> elements. That divertHrefToApp function is constructed using F2.
	// Here we override F2 to store the listener on the DOM node so we can
	// remove it later. _VirtualDom_virtualize is called a couple of lines
	// later, so we use that to restore the original F2 function, so it can do
	// the right thing when the view function is called.
	F2 = function(f) {
		return function(domNode) {
			var listener = function(event) {
				return f(domNode, event);
			};
			domNode.elmAf = listener;
			return listener;
		};
	};

	// To be able to remove the popstate and hashchange listeners.
	var historyListenerCleanups = [];
	_Browser_window = {
		navigator: _Browser_window_backup.navigator,
		addEventListener: function(eventName, listener) {
			_Browser_window_backup.addEventListener(eventName, listener);
			historyListenerCleanups.push(function() {
				_Browser_window_backup.removeEventListener(eventName, listener);
			});
		},
	};

	// When passing in the last rendered VNode from a previous app:
	if (args && args.lastVNode) {
		// It's a bit weird to mutate the args object that has been passed in,
		// but the VNode from the previous app can have references to the old
		// app functions through Html.lazy, preventing the old app from being
		// garbage collected, so we don't want to keep a reference to it.
		var lastVNode = args.lastVNode;
		delete args.lastVNode;

		// Instead of virtualizing the existing DOM into a VNode, just use the
		// one from the previous app. Html.map messes up Elm's
		// _VirtualDom_virtualize, causing the entire thing inside the Html.map
		// to be re-created even though it is already the correct DOM.
		_VirtualDom_virtualize = function() {
			F2 = F2_backup; // Restore F2 as mentioned above.
			return lastVNode;
		};

		_VirtualDom_applyPatches = function(rootDomNode, oldVirtualNode, patches, eventNode) {
			if (patches.length !== 0) {
				_VirtualDom_addDomNodes(rootDomNode, oldVirtualNode, patches, eventNode);
			}
			_VirtualDom_lastDomNode = _VirtualDom_applyPatchesHelp(rootDomNode, patches);
			// Restore the event listeners on the <a> elements:
			var aElements = _VirtualDom_lastDomNode.getElementsByTagName('a');
			for (var i = 0; i < aElements.length; i++) {
				var domNode = aElements[i];
				domNode.addEventListener('click', _VirtualDom_divertHrefToApp(domNode));
			}
			return _VirtualDom_lastDomNode;
		}

		// Force all event listeners to be re-applied:
		_VirtualDom_equalEvents = function() {
			return false;
		}
	} else {
		_VirtualDom_virtualize = function(node) {
			F2 = F2_backup; // Restore F2 as mentioned above.
			return _VirtualDom_virtualize_backup(node);
		};
	}

	var stepper = stepperBuilder(sendToApp, model);

	// Restore the original functions and variables.
	F2 = F2_backup; // Should already be restored by now, but just in case.
	_Browser_window = _Browser_window_backup;
	_VirtualDom_virtualize = _VirtualDom_virtualize_backup;
	_VirtualDom_applyPatches = _VirtualDom_applyPatches_backup;
	_VirtualDom_equalEvents = _VirtualDom_equalEvents_backup;
		`
			)
			.replaceAll(
				`__elmWatchProgramType: { value: programType },`,
				`__elmWatchProgramType: { value: programType },
			dieIncomplete: {
				value: function() {
					console.log('App dying incompletely')
					var toReturn = { model: model };
					managers = null;
					model = null;
					stepper = null;
					ports = null;
					_Platform_effectsQueue = [];
					return toReturn;
				}
			},
			die: {
				value: function() {
					console.log('App dying completely')
					var toReturn = { model: model, lastVNode: _VirtualDom_lastVNode };

					// Needed to stop the Time.every subscription.
					// This must be done before clearing the stuff below.
					_Platform_enqueueEffects(managers, _Platform_batch(_List_Nil), _Platform_batch(_List_Nil));

					// Needed to stop the Process.sleep cmd. This is done after the subscriptions for clarity, because
					// they also have kill functions registered here, but they are ny _Platform_enqueueEffects
					// as we tell it to get rid of all subscriptions (which also updates _Scheduler_kill_list).
					for (var i = 0; i < _Scheduler_kill_list.length; i++) {
						_Scheduler_kill_list[i]();
					}

					// Clear things out like in the incomplete version.
					managers = null;
					model = null;
					stepper = null;
					ports = null;
					// This one is commented out, because in the only place where code pushes to it, it is cleared synchronously.
					// There's also _Scheduler_queue and it works the same way.
					// _Platform_effectsQueue = [];

					// Remove Elm's event listeners. Both the ones added
					// automatically on every <a> element, as well as the ones
					// added by using Html.Events.
					var elements = _VirtualDom_lastDomNode.getElementsByTagName('*');
					for (var i = 0; i < elements.length; i++) {
						var element = elements[i];
						if (element.elmAf) {
							element.removeEventListener('click', element.elmAf);
							delete element.elmAf;
						}
						if (element.elmFs) {
							for (var key in element.elmFs) {
								element.removeEventListener(key, element.elmFs[key]);
							}
							delete element.elmFs;
						}
					}

					// Remove the popstate and hashchange listeners.
					for (var i = 0; i < historyListenerCleanups.length; i++) {
						historyListenerCleanups[i]();
					}

					// Clear these new things we've added.
					_VirtualDom_lastVNode = null;
					_VirtualDom_lastDomNode = null;
					historyListenerCleanups = [];

					return toReturn;
				}
			},
		`
			)
			.replace(
				`}(this));`,
				`
// Keep track of the last VNode rendered so we can pass it to the next app later.
var _VirtualDom_lastVNode = null;
function _VirtualDom_diff(x, y)
{
	_VirtualDom_lastVNode = y;
	var patches = [];
	_VirtualDom_diffHelp(x, y, patches, 0);
	return patches;
}

// Keep track of the reference to the latest root DOM node so we can perform cleanups in it later.
var _VirtualDom_lastDomNode = null;
function _VirtualDom_applyPatches(rootDomNode, oldVirtualNode, patches, eventNode)
{
	if (patches.length === 0)
	{
		return (_VirtualDom_lastDomNode = rootDomNode);
	}

	_VirtualDom_addDomNodes(rootDomNode, oldVirtualNode, patches, eventNode);
	return (_VirtualDom_lastDomNode = _VirtualDom_applyPatchesHelp(rootDomNode, patches));
}

// Keep track of Cmds that can be killed, such as Process.sleep or HTTP requests.
// Note: This function has longer property names in Elm's source code.
var _Scheduler_kill_list = [];
function _Scheduler_step(proc)
{
	while (proc.f)
	{
		var rootTag = proc.f.$;
		if (rootTag === 0 || rootTag === 1)
		{
			while (proc.g && proc.g.$ !== rootTag)
			{
				proc.g = proc.g.i;
			}
			if (!proc.g)
			{
				return;
			}
			proc.f = proc.g.b(proc.f.a);
			proc.g = proc.g.i;
		}
		else if (rootTag === 2)
		{
			// Here are the only changes in the whole function:
			// We push and splice _Scheduler_kill_list.
			proc.f.c = proc.f.b(function(newRoot) {
				if (proc.f.c) {
					var index = _Scheduler_kill_list.indexOf(proc.f.c);
					if (index >= 0) {
						_Scheduler_kill_list.splice(index, 1);
					}
				}
				proc.f = newRoot;
				_Scheduler_enqueue(proc);
			});
			if (proc.f.c) {
				_Scheduler_kill_list.push(proc.f.c);
			}
			return;
		}
		else if (rootTag === 5)
		{
			if (proc.h.length === 0)
			{
				return;
			}
			proc.f = proc.f.b(proc.h.shift());
		}
		else // if (rootTag === 3 || rootTag === 4)
		{
			proc.g = {
				$: rootTag === 3 ? 0 : 1,
				b: proc.f.b,
				i: proc.g
			};
			proc.f = proc.f.d;
		}
	}
}

function _Scheduler_kill(proc)
{
	return _Scheduler_binding(function(callback) {
		var task = proc.f;
		if (task.$ === 2 && task.c)
		{
			// This is the only change in the whole function:
			// We splice _Scheduler_kill_list.
			var index = _Scheduler_kill_list.indexOf(task.c);
			if (index >= 0) {
				_Scheduler_kill_list.splice(index, 1);
			}
			task.c();
		}

		proc.f = null;

		callback(_Scheduler_succeed(_Utils_Tuple0));
	});
}

// No need to override this when not using elm-watch.
// This undoes a change that elm-watch has done, that messes with the above _Scheduler_step tweak.
function _Scheduler_binding(callback)
{
	return {
		$: 2,
		b: callback,
		c: null
	};
}
}(this));
		`
			)
	);
}

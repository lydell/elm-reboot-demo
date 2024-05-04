export default function postprocess({ code }) {
  return (
    code
      // This is the only string replacement that needs to be done on the compiled JS.
      // Patch the line adding the click listeners on `<a>` elements to store the listener so we can remove the listener later.
      // I haven't found a way to do this with clever hacks instead.
      .replace(
        `domNode.addEventListener('click', _VirtualDom_divertHrefToApp(domNode));`,
        `var listener = _VirtualDom_divertHrefToApp(domNode);
        domNode.addEventListener('click', listener);
        domNode.elmAf = listener;`
      )
      // The rest of the replacements can be done by copy-pasting the _Platform_initialize function to the end of the IIFE and modifying it.
      // It's just more convenient to do string replacements in this demo.
      .replace(
        `var stepper = stepperBuilder(sendToApp, model);`,
        `
    // We'll temporarily overwrite these variables or functions.
    var _Browser_window_backup = _Browser_window;
    var _VirtualDom_virtualize_backup = _VirtualDom_virtualize;
    var _VirtualDom_applyPatches_backup = _VirtualDom_applyPatches;
    var _VirtualDom_equalEvents_backup = _VirtualDom_equalEvents;

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
        // Instead of virtualizing the existing DOM into a VNode, just use the one from the previous app.
        // Html.map messes up Elm's _VirtualDom_virtualize, causing the entire thing inside the Html.map to be re-created even though it is already the correct DOM.
        _VirtualDom_virtualize = function() {
            return args.lastVNode;
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
                var listener = _VirtualDom_divertHrefToApp(domNode);
                domNode.addEventListener('click', listener);
                domNode.elmAf = listener;
            }
            return _VirtualDom_lastDomNode;
        }

        // Force all event listeners to be re-applied:
        _VirtualDom_equalEvents = function(x, y) {
            return false;
        }
    }

    var stepper = stepperBuilder(sendToApp, model);

    // Restore the original functions and variables.
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

                    // Clear things out like in the incomplete version.
                    managers = null;
                    model = null;
                    stepper = null;
                    ports = null;
                    _Platform_effectsQueue = [];

                    // Remove Elm's event listeners. Both the ones added automatically on every <a> element, as well as the ones added by using Html.Events.
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
}(this));
        `
      )
  );
}

export default function postprocess({ code }) {
  return (
    code
      // Patch the line adding the click listeners on `<a>` elements to store the listener so we can remove the listener later.
      // TODO: Can this be avoided by clever _VirtualDom_divertHrefToApp hacks?
      .replace(
        `domNode.addEventListener('click', _VirtualDom_divertHrefToApp(domNode));`,
        `var listener = _VirtualDom_divertHrefToApp(domNode); domNode.addEventListener('click', listener); domNode.elmAf = listener;`
      )
      // Actually part of the _Platform_initialize replacement function.
      .replace(
        `var stepper = stepperBuilder(sendToApp, model);`,
        `
            var cleanups = [];
            var win = _Browser_window;
            _Browser_window = {
                navigator: win.navigator,
                addEventListener: function(eventName, listener) {
                    win.addEventListener(eventName, listener);
                    cleanups.push(function() {
                        win.removeEventListener(eventName, listener);
                    });
                },
            };
            var virtualize = _VirtualDom_virtualize;
            var applyPatches = _VirtualDom_applyPatches;
            var equalEvents = _VirtualDom_equalEvents;
            if (args && args.lastVNode) {
                _VirtualDom_virtualize = function() {
                    return args.lastVNode;
                };
                _VirtualDom_applyPatches = function(rootDomNode, oldVirtualNode, patches, eventNode) {
                    if (patches.length !== 0) {
                        _VirtualDom_addDomNodes(rootDomNode, oldVirtualNode, patches, eventNode);
                    }
                    _VirtualDom_lastDomNode = _VirtualDom_applyPatchesHelp(rootDomNode, patches);
                    // Restore the event listeners on the <a> elements:
                    for (const domNode of _VirtualDom_lastDomNode.getElementsByTagName('a')) {
                        var listener = _VirtualDom_divertHrefToApp(domNode); domNode.addEventListener('click', listener); domNode.elmAf = listener;
                    }
                    return _VirtualDom_lastDomNode;
                }
                // Force all event listeners to be re-applied:
                _VirtualDom_equalEvents = function(x, y) {
                    return false;
                }
            }
            var stepper = stepperBuilder(sendToApp, model);
            _Browser_window = win;
            _VirtualDom_virtualize = virtualize;
            _VirtualDom_applyPatches = applyPatches;
            _VirtualDom_equalEvents = equalEvents;
        `
      )
      // Actually part of the _Platform_initialize replacement function.
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
                    for (const element of _VirtualDom_lastDomNode.getElementsByTagName('*')) {
                        if (element.elmAf) {
                            element.removeEventListener('click', element.elmAf);
                            delete element.elmAf;
                        }
                        if (element.elmFs) {
                            for (const key in element.elmFs) {
                                element.removeEventListener(key, element.elmFs[key]);
                            }
                            delete element.elmFs;
                        }
                    }

                    // Remove the popstate listener.
                    for (const cleanup of cleanups) {
                        cleanup();
                    }

                    // Clear these new things we've added.
                    _VirtualDom_lastVNode = null;
                    _VirtualDom_lastDomNode = null;

                    return toReturn;
                }
            },
        `
      )
      .replace(
        `}(this));`,
        `
var _VirtualDom_lastVNode = null;
function _VirtualDom_diff(x, y)
{
    _VirtualDom_lastVNode = y;
	var patches = [];
	_VirtualDom_diffHelp(x, y, patches, 0);
	return patches;
}

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

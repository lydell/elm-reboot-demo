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
            if (args && args.lastVNode) {
                _VirtualDom_virtualize = function() {
                    return args.lastVNode;
                };
                _VirtualDom_extra = function() {
                    for (const domNode of _VirtualDom_lastDomNode.getElementsByTagName('a')) {
                        var listener = _VirtualDom_divertHrefToApp(domNode); domNode.addEventListener('click', listener); domNode.elmAf = listener;
                    }
                };
            }
            var stepper = stepperBuilder(sendToApp, model);
            _Browser_window = win;
            if (args && args.lastVNode) {
                _VirtualDom_virtualize = virtualize;
                _VirtualDom_extra = null;
            }
        `
      )
      // Actually part of the _Platform_initialize replacement function.
      .replaceAll(
        `__elmWatchProgramType: { value: programType },`,
        `__elmWatchProgramType: { value: programType },
			dieIncomplete: {
                value: function() {
                    console.log('App dying incompletely')
                    var modelToReturn = model;
                    managers = null;
                    model = null;
                    stepper = null;
                    ports = null;
                    _Platform_effectsQueue = [];
                    return {model: modelToReturn};
                }
            },
			die: {
                value: function() {
                    console.log('App dying completely')
                    var modelToReturn = model;

                    // Needed to stop the Time.every subscription.
                    // This must be done before clearing the stuff below.
                    _Platform_enqueueEffects(managers, _Platform_batch(_List_Nil), _Platform_batch(_List_Nil));

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

                    return {model: modelToReturn, lastVNode: _VirtualDom_lastVNode};

                    // Then:
                    // .getModel()
                    // Another button for mounting a new Elm app
                    // add another die button with the incomplete implementation
                    // have a scrollbar to see that the state isn’t lost
                    // add instructions on how to test
                    // - increase counter (change model)
                    // - go to about, go home (add popstate)
                    // - scroll down in box
                    // - die app
                    // - button shouldn’t do anything
                    // - subscription shouldn’t throw
                    // - click link shouldn’t throw (add temp event listener to avoid navigation)
                    // - popstate shouldn’t throw
                    // then mount new app (scroll shouldn’t be lost)
                    // event listeners should work afterwards (probably need to make sure that is correct in diffing, maybe modify the vdom tree to remove all event listeners, and add the <a> ones separately)
                    // to restore last vdom node, temporarily overwrite _VirtualDom_virtualize.
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

var _VirtualDom_extra = null;
var _VirtualDom_lastDomNode = null;
function _VirtualDom_applyPatches(rootDomNode, oldVirtualNode, patches, eventNode)
{
	if (patches.length === 0)
	{
        _VirtualDom_lastDomNode = rootDomNode;
        if (_VirtualDom_extra) _VirtualDom_extra();
		return rootDomNode;
	}

	_VirtualDom_addDomNodes(rootDomNode, oldVirtualNode, patches, eventNode);
    var newRootDomNode = _VirtualDom_applyPatchesHelp(rootDomNode, patches);
    _VirtualDom_lastDomNode = newRootDomNode;
    if (_VirtualDom_extra) _VirtualDom_extra();
	return newRootDomNode;
}
}(this));
        `
      )
  );
}

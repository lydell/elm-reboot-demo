export default function postprocess({ code }) {
    return code
    .replace(
        `_Browser_window.addEventListener('popstate', key);`,
        `_Browser_window.addEventListener('popstate', function (e) { console.log('popstate', e); return key(e); });`
    )
    .replace(
        `domNode.addEventListener('click', _VirtualDom_divertHrefToApp(domNode));`,
        `var listener = _VirtualDom_divertHrefToApp(domNode); domNode.addEventListener('click', listener); domNode.elmAf = listener;`
    ).replaceAll(
        `__elmWatchProgramType: { value: programType },`,
        `__elmWatchProgramType: { value: programType },
        die: { value: function() {
            console.log('App dying')
            _Platform_enqueueEffects(managers, _Platform_batch(_List_Nil), _Platform_batch(_List_Nil));
            managers = null
            model = null
            stepper = null
            ports = null

            // TODO: Replace "document" with reference to the root dom node (a bit difficult to get)
			for (const element of document.getElementsByTagName('*')) {
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

            // TODO: Also remove popstate and hashchange

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
          } },
        `
    )
    + "; console.log('hi')";
}
